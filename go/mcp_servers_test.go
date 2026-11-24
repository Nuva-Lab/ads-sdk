package nuvaadmin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

const mcpServerJSON = `{"name":"acme_video","url":"https://tools.acme.example/mcp","description":"Acme's models.","auth":{"type":"bearer","set":true,"updated_at":"2026-11-24T00:00:00Z"},"tools":[{"name":"render_clip"}],"enabled":true,"created_at":"2026-11-24T00:00:00Z","updated_at":"2026-11-24T00:00:00Z"}`

func TestMCPServers(t *testing.T) {
	var seen []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = append(seen, r.Method+" "+r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		switch r.Method + " " + r.URL.Path {
		case "PUT /v1/admin/mcp-servers/acme_video":
			var body map[string]any
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Error(err)
			}
			auth := body["auth"].(map[string]any)
			if body["url"] != "https://tools.acme.example/mcp" || auth["type"] != "bearer" || auth["secret"] != "sk-1" || len(body["tools"].([]any)) != 1 {
				t.Errorf("bad body: %v", body)
			}
			if _, ok := body["enabled"]; ok {
				t.Errorf("enabled is left out unless set: %v", body)
			}
			fmt.Fprint(w, mcpServerJSON)
		case "GET /v1/admin/mcp-servers/acme_video":
			fmt.Fprint(w, mcpServerJSON)
		case "GET /v1/admin/mcp-servers":
			fmt.Fprint(w, `{"items":[`+mcpServerJSON+`]}`)
		case "DELETE /v1/admin/mcp-servers/acme_video":
			w.WriteHeader(204)
		case "GET /v1/admin/mcp-servers/other":
			// A response for a different server than asked for.
			fmt.Fprint(w, mcpServerJSON)
		default:
			t.Errorf("unexpected %s %s", r.Method, r.URL.Path)
		}
	}))
	defer server.Close()
	admin, err := NewAdminClient(server.URL, "admin-key")
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	put, err := admin.PutMCPServer(ctx, "acme_video", MCPServerInput{
		URL:   "https://tools.acme.example/mcp",
		Auth:  MCPAuth{Type: MCPAuthBearer, Secret: "sk-1"},
		Tools: []MCPTool{{Name: "render_clip"}},
	})
	if err != nil || !put.Auth.Set || put.Auth.UpdatedAt == nil || put.Tools[0].Name != "render_clip" {
		t.Fatalf("put: %+v %v", put, err)
	}
	if got, err := admin.GetMCPServer(ctx, "acme_video"); err != nil || got.Description != "Acme's models." {
		t.Fatalf("get: %+v %v", got, err)
	}
	if list, err := admin.ListMCPServers(ctx); err != nil || len(list) != 1 {
		t.Fatalf("list: %+v %v", list, err)
	}
	if err := admin.DeleteMCPServer(ctx, "acme_video"); err != nil {
		t.Fatal(err)
	}
	if _, err := admin.GetMCPServer(ctx, "other"); err == nil || err.(*APIError).Code != "SERVICE_ERROR" {
		t.Fatalf("a response for another server is malformed: %v", err)
	}
	// Refused before any request.
	for _, check := range []error{
		func() error {
			_, err := admin.PutMCPServer(ctx, "Bad-Name", MCPServerInput{URL: "https://x.example", Auth: MCPAuth{Type: MCPAuthNone}})
			return err
		}(),
		func() error {
			_, err := admin.PutMCPServer(ctx, "ok", MCPServerInput{URL: "http://x.example", Auth: MCPAuth{Type: MCPAuthNone}})
			return err
		}(),
		func() error {
			_, err := admin.PutMCPServer(ctx, "ok", MCPServerInput{URL: "https://x.example", Auth: MCPAuth{Type: "basic"}})
			return err
		}(),
		func() error {
			_, err := admin.PutMCPServer(ctx, "ok", MCPServerInput{URL: "https://x.example", Auth: MCPAuth{Type: MCPAuthHeader}})
			return err
		}(),
		func() error {
			_, err := admin.PutMCPServer(ctx, "ok", MCPServerInput{URL: "https://x.example", Auth: MCPAuth{Type: MCPAuthNone, Secret: "x"}})
			return err
		}(),
		admin.DeleteMCPServer(ctx, "../x"),
	} {
		if check == nil || check.(*APIError).Code != "INVALID_INPUT" {
			t.Errorf("expected INVALID_INPUT, got %v", check)
		}
	}
	if len(seen) != 5 {
		t.Errorf("requests: %v", seen)
	}
}

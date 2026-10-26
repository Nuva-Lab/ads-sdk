package learning

import (
	"context"
	"encoding/json"
	"errors"
	nuva "github.com/Nuva-Lab/ads-sdk/go"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPrivateCandidatePublishedOnlyThroughAdminPolicy(t *testing.T) {
	calls := []string{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer server-admin-key" {
			t.Error("Admin key missing")
		}
		calls = append(calls, r.URL.Path)
		skill := map[string]any{"id": "11111111-1111-4111-8111-111111111111", "name": "product-writer", "platform": false, "main_version": 2, "created_at": "2026-10-24T00:00:00Z"}
		if strings.HasSuffix(r.URL.Path, "/main") {
			json.NewEncoder(w).Encode(skill)
			return
		}
		var input nuva.SkillRegistration
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatal(err)
		}
		if input.Files["SKILL.md"] != "# Existing rules\nPreserve product facts.\n\n## Learned guidance\nUse clearer openings." {
			t.Error("existing Skill or candidate text lost")
		}
		json.NewEncoder(w).Encode(map[string]any{"skill": skill, "version": map[string]any{"id": "22222222-2222-4222-8222-222222222222", "skill_id": skill["id"], "version": 2, "description": nil, "note": nil, "source": nil, "attributes": map[string]any{}, "files": []any{}, "download_url_expires_at": "2026-10-24T01:00:00Z", "created_at": "2026-10-24T00:00:00Z"}})
	}))
	defer server.Close()
	admin, err := nuva.NewAdminClient(server.URL, "server-admin-key")
	if err != nil {
		t.Fatal(err)
	}
	publisher := Publisher{Admin: admin, CustomerID: "customer", Read: func(context.Context, string) (Candidate, error) {
		return Candidate{ID: "candidate1", CustomerID: "customer", Text: "Use clearer openings.", SourceEventIDs: []string{"event1"}}, nil
	}, Prepare: func(_ context.Context, c Candidate) (Publication, error) {
		return Publication{SkillName: "product-writer", Definition: nuva.SkillRegistration{Files: map[string]string{"SKILL.md": "# Existing rules\nPreserve product facts.\n\n## Learned guidance\n" + c.Text}}, Activate: true}, nil
	}}
	result, err := publisher.Publish(context.Background(), "candidate1")
	if err != nil || !result.Activated {
		t.Fatalf("publication failed: %v", err)
	}
	if len(calls) != 2 {
		t.Fatalf("expected register and activate: %v", calls)
	}
	publisher.Prepare = func(context.Context, Candidate) (Publication, error) {
		return Publication{}, errors.New("customer policy denied")
	}
	if _, err := publisher.Publish(context.Background(), "candidate1"); err == nil {
		t.Fatal("policy bypassed")
	}
	if len(calls) != 2 {
		t.Fatal("denied candidate sent HTTP")
	}
	publisher.Read = func(context.Context, string) (Candidate, error) {
		return Candidate{ID: "candidate1", CustomerID: "other", SourceEventIDs: []string{"event1"}}, nil
	}
	if _, err := publisher.Publish(context.Background(), "candidate1"); err == nil {
		t.Fatal("tenant mismatch accepted")
	}
}

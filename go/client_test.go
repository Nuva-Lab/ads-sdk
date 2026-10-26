package nuvaadmin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

const skillID = "00000000-0000-4000-8000-000000000001"
const versionID = "00000000-0000-4000-8000-000000000002"
const skillJSON = `{"id":"` + skillID + `","name":"writer","platform":false,"main_version":1,"created_at":"2026-10-24T00:00:00Z"}`
const versionJSON = `{"id":"` + versionID + `","skill_id":"` + skillID + `","version":1,"description":null,"note":null,"source":{"repo":"github.com/Nuva-Lab/WhatIf","commit":"20c6fd9"},"attributes":{"preload":true},"files":[{"path":"SKILL.md","bytes":4,"sha256":"` + "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" + `","download_url":"https://media.example.com/skill"}],"download_url_expires_at":"2026-10-25T00:00:00Z","created_at":"2026-10-24T00:00:00Z"}`

func TestAdminAndUserContracts(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		w.Header().Set("Content-Type", "application/json")
		if strings.HasPrefix(r.URL.Path, "/v1/admin/") {
			if r.Header.Get("Authorization") != "Bearer admin-key" {
				t.Errorf("admin credential mismatch")
			}
		} else if r.Header.Get("Authorization") != "Bearer user-token" {
			t.Errorf("data route received wrong authority")
		}
		var body map[string]any
		if r.Body != nil && r.Method != "GET" {
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Error(err)
			}
		}
		switch r.URL.Path {
		case "/v1/admin/tokens":
			if r.Method != "POST" || body["external_user_id"] != "customer-user" {
				t.Errorf("bad token request: %v", body)
			}
			fmt.Fprint(w, `{"access_token":"user-token","token_type":"Bearer","expires_at":"2026-10-25T00:00:00Z","user":{"id":"`+skillID+`","external_user_id":"customer-user"}}`)
		case "/v1/admin/skills/writer":
			if r.Method != "PUT" || body["files"].(map[string]any)["SKILL.md"] != "text" {
				t.Error("bad registration")
			}
			w.WriteHeader(201)
			fmt.Fprint(w, `{"skill":`+skillJSON+`,"version":`+versionJSON+`}`)
		case "/v1/admin/skills/writer/main":
			if r.Method != "PUT" || body["version"] != float64(1) {
				t.Error("bad main selection")
			}
			fmt.Fprint(w, skillJSON)
		case "/v1/skills":
			if r.URL.Query().Get("limit") != "5" {
				t.Error("missing limit")
			}
			fmt.Fprint(w, `{"items":[`+skillJSON+`],"next_cursor":null}`)
		case "/v1/skills/" + skillID:
			fmt.Fprint(w, strings.TrimSuffix(skillJSON, "}")+`,"main":`+versionJSON+`}`)
		case "/v1/skills/" + skillID + "/versions/1":
			fmt.Fprint(w, versionJSON)
		default:
			t.Errorf("unexpected path %s", r.URL.Path)
			w.WriteHeader(404)
		}
	}))
	defer server.Close()
	admin, err := NewAdminClient(server.URL, "admin-key")
	if err != nil {
		t.Fatal(err)
	}
	token, err := admin.IssueUserToken(context.Background(), "customer-user")
	if err != nil || token.AccessToken != "user-token" || token.User.ID != skillID || token.ExpiresAt.IsZero() {
		t.Fatalf("token fields lost: %v", err)
	}
	result, err := admin.RegisterSkill(context.Background(), "writer", SkillRegistration{Files: map[string]string{"SKILL.md": "text"}, Attributes: map[string]any{"preload": true}})
	if err != nil || result.Version.ID != versionID || result.Version.Source.Commit != "20c6fd9" || result.Version.Description != nil {
		t.Fatalf("registration fields lost: %v", err)
	}
	if _, err = admin.SetSkillMain(context.Background(), "writer", 1); err != nil {
		t.Fatal(err)
	}
	reader, err := NewUserClient(server.URL, token.AccessToken)
	if err != nil {
		t.Fatal(err)
	}
	page, err := reader.ListSkills(context.Background(), ListOptions{Limit: 5})
	if err != nil || len(page.Items) != 1 || page.NextCursor != nil {
		t.Fatalf("page fields lost: %v", err)
	}
	detail, err := reader.GetSkill(context.Background(), skillID)
	if err != nil || detail.Main == nil || detail.Main.ID != versionID {
		t.Fatalf("detail fields lost: %v", err)
	}
	version, err := reader.GetSkillVersion(context.Background(), skillID, 1)
	if err != nil || version.Files[0].SHA256 == "" || version.Attributes["preload"] != true {
		t.Fatalf("version fields lost: %v", err)
	}
	if requests != 6 {
		t.Fatalf("unexpected retries: %d", requests)
	}
}
func TestSafeErrorsContextAndNoRetries(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.WriteHeader(503)
		fmt.Fprint(w, `{"error":{"code":"UNAVAILABLE","message":"failure admin-secret","retryable":true},"request_id":"req-admin-secret"}`)
	}))
	defer server.Close()
	c, _ := NewAdminClient(server.URL, "admin-secret")
	_, err := c.IssueUserToken(context.Background(), "u")
	var api *APIError
	if !errors.As(err, &api) || api.Acceptance != "unknown" || api.Code != "UNAVAILABLE" || strings.Contains(fmt.Sprint(err), "admin-secret") {
		t.Fatalf("unsafe or incomplete error: %v", err)
	}
	if calls != 1 {
		t.Fatal("write retried")
	}
	if strings.Contains(fmt.Sprintf("%#v", c), "admin-secret") {
		t.Fatal("client formats credential")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err = c.IssueUserToken(ctx, "u")
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("context lost: %v", err)
	}
	if calls != 1 {
		t.Fatal("cancelled request dispatched")
	}
}
func TestRedirectAndMalformedResponse(t *testing.T) {
	leaked := false
	destination := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { leaked = true }))
	defer destination.Close()
	mode := "redirect"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if mode == "redirect" {
			http.Redirect(w, r, destination.URL, 307)
			return
		}
		fmt.Fprint(w, `{"access_token":"do-not-log"}`)
	}))
	defer server.Close()
	c, _ := NewAdminClient(server.URL, "secret", WithHTTPClient(&http.Client{Timeout: time.Second}))
	_, err := c.IssueUserToken(context.Background(), "u")
	if err == nil || leaked {
		t.Fatal("credential redirect followed")
	}
	mode = "malformed"
	_, err = c.IssueUserToken(context.Background(), "u")
	if err == nil || strings.Contains(err.Error(), "do-not-log") {
		t.Fatal("malformed response leaked")
	}
}
func TestInputValidation(t *testing.T) {
	c, _ := NewAdminClient("https://backend.invalid", "secret")
	for _, request := range []SkillRegistration{{Files: map[string]string{}}, {Files: map[string]string{"SKILL.md": "ok", "../escape": "bad"}}, {Files: map[string]string{"SKILL.md": strings.Repeat("x", 262145)}}} {
		if _, err := c.RegisterSkill(context.Background(), "writer", request); err == nil {
			t.Fatal("invalid registration accepted")
		}
	}
	if _, err := c.IssueUserToken(context.Background(), "bad\nidentity"); err == nil {
		t.Fatal("invalid external identity accepted")
	}
	if _, err := NewAdminClient("https://secret@backend.invalid", "key"); err == nil {
		t.Fatal("URL credential accepted")
	}
}

func TestClientFormattingRedactsPointersValuesAndCopies(t *testing.T) {
	adminSecret := "fixture-admin-credential"
	userSecret := "fixture-user-credential"
	admin, err := NewAdminClient("https://backend.invalid", adminSecret)
	if err != nil {
		t.Fatal(err)
	}
	user, err := NewUserClient("https://backend.invalid", userSecret)
	if err != nil {
		t.Fatal(err)
	}
	adminCopy, userCopy := *admin, *user
	clients := map[string]any{
		"admin pointer": admin, "admin value": *admin, "admin copy": adminCopy, "admin copy pointer": &adminCopy,
		"user pointer": user, "user value": *user, "user copy": userCopy, "user copy pointer": &userCopy,
	}
	for name, client := range clients {
		for _, format := range []string{"%v", "%+v", "%#v"} {
			t.Run(name+" "+format, func(t *testing.T) {
				text := fmt.Sprintf(format, client)
				if strings.Contains(text, adminSecret) || strings.Contains(text, userSecret) {
					t.Fatal("client formatting disclosed its credential")
				}
				if !strings.Contains(text, "credential redacted") {
					t.Fatal("client formatting bypassed the safe representation")
				}
			})
		}
	}
}

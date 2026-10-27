package learning

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	nuva "github.com/Nuva-Lab/ads-sdk/go"
)

func TestPrivateCandidatePublishedOnlyThroughAdminPolicy(t *testing.T) {
	calls := []string{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer server-admin-key" {
			t.Error("Admin key missing")
		}
		calls = append(calls, r.URL.Path)
		skill := map[string]any{"id": "11111111-1111-4111-8111-111111111111", "name": "product-writer", "platform": false, "main_version": 1, "created_at": "2026-10-24T00:00:00Z"}
		if strings.HasSuffix(r.URL.Path, "/main") {
			skill["main_version"] = 2
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
	if len(calls) != 2 {
		t.Fatal("tenant mismatch sent HTTP")
	}
}

func TestPublicationReportsReturnedMainStatus(t *testing.T) {
	for _, tc := range []struct {
		name             string
		version          int
		registeredMain   int
		activate         bool
		activationStatus int
		wantActivated    bool
	}{
		{name: "first registration is main without explicit activation", version: 1, registeredMain: 1, wantActivated: true},
		{name: "existing Skill keeps its main", version: 2, registeredMain: 1},
		{name: "explicit activation updates main", version: 2, registeredMain: 1, activate: true, wantActivated: true},
		{name: "rejected activation preserves registration", version: 2, registeredMain: 1, activate: true, activationStatus: http.StatusForbidden},
		{name: "uncertain activation preserves last confirmed status", version: 2, registeredMain: 1, activate: true, activationStatus: http.StatusServiceUnavailable},
		{name: "failed explicit activation retains already main status", version: 1, registeredMain: 1, activate: true, activationStatus: http.StatusForbidden, wantActivated: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			calls := []string{}
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls = append(calls, r.URL.Path)
				if r.Method != http.MethodPut || r.Header.Get("Authorization") != "Bearer server-admin-key" {
					t.Error("expected authenticated Admin PUT")
				}
				skill := map[string]any{"id": "11111111-1111-4111-8111-111111111111", "name": "product-writer", "platform": false, "main_version": tc.registeredMain, "created_at": "2026-10-24T00:00:00Z"}
				if r.URL.Path == "/v1/admin/skills/product-writer/main" {
					var input struct {
						Version int `json:"version"`
					}
					if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Version != tc.version {
						t.Errorf("wrong activation version: %+v, %v", input, err)
					}
					if tc.activationStatus != 0 {
						w.WriteHeader(tc.activationStatus)
						json.NewEncoder(w).Encode(map[string]any{"error": map[string]any{"code": "ACTIVATION_FAILED", "message": "Activation failed", "retryable": false}})
						return
					}
					skill["main_version"] = tc.version
					json.NewEncoder(w).Encode(skill)
					return
				}
				json.NewEncoder(w).Encode(map[string]any{"skill": skill, "version": map[string]any{"id": "22222222-2222-4222-8222-222222222222", "skill_id": skill["id"], "version": tc.version, "description": nil, "note": nil, "source": nil, "attributes": map[string]any{}, "files": []any{}, "download_url_expires_at": "2026-10-24T01:00:00Z", "created_at": "2026-10-24T00:00:00Z"}})
			}))
			defer server.Close()
			admin, err := nuva.NewAdminClient(server.URL, "server-admin-key")
			if err != nil {
				t.Fatal(err)
			}
			publisher := Publisher{Admin: admin, CustomerID: "customer", Read: func(context.Context, string) (Candidate, error) {
				return Candidate{ID: "candidate1", CustomerID: "customer", SourceEventIDs: []string{"event1"}}, nil
			}, Prepare: func(context.Context, Candidate) (Publication, error) {
				return Publication{SkillName: "product-writer", Definition: nuva.SkillRegistration{Files: map[string]string{"SKILL.md": "# Product writer"}}, Activate: tc.activate}, nil
			}}
			result, err := publisher.Publish(context.Background(), "candidate1")
			if tc.activationStatus != 0 {
				var api *nuva.APIError
				if !errors.As(err, &api) || api.StatusCode != tc.activationStatus {
					t.Fatalf("expected activation error, got %v", err)
				}
				if tc.activationStatus == http.StatusServiceUnavailable && api.Acceptance != "unknown" {
					t.Fatalf("expected uncertain write, got %q", api.Acceptance)
				}
			} else if err != nil {
				t.Fatal(err)
			}
			if result.Registered.Skill.ID != "11111111-1111-4111-8111-111111111111" || result.Registered.Version.ID != "22222222-2222-4222-8222-222222222222" || result.Registered.Version.Version != tc.version {
				t.Fatalf("registration receipt lost: %+v", result.Registered)
			}
			wantMain := tc.registeredMain
			if tc.activate && tc.activationStatus == 0 {
				wantMain = tc.version
			}
			if result.Activated != tc.wantActivated || result.Registered.Skill.MainVersion == nil || *result.Registered.Skill.MainVersion != wantMain {
				t.Fatalf("wrong last confirmed main status: %+v", result)
			}
			wantCalls := 1
			if tc.activate {
				wantCalls++
			}
			if len(calls) != wantCalls || calls[0] != "/v1/admin/skills/product-writer" || tc.activate && calls[1] != "/v1/admin/skills/product-writer/main" {
				t.Fatalf("unexpected registration/activation order: %v", calls)
			}
		})
	}
}

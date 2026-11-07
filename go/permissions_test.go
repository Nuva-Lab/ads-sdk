package nuvaadmin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

const scopeID = "00000000-0000-4000-8000-000000000011"
const userID = "00000000-0000-4000-8000-000000000012"
const productID = "00000000-0000-4000-8000-000000000013"

func TestScopesMembershipsAndShares(t *testing.T) {
	var seen []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = append(seen, r.Method+" "+r.URL.Path)
		if r.Header.Get("Authorization") != "Bearer admin-key" {
			t.Errorf("credential mismatch")
		}
		var body map[string]any
		if r.Method == "PUT" {
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Error(err)
			}
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.Method + " " + r.URL.Path {
		case "PUT /v1/admin/scopes/team a1":
			if body["kind"] != "group" || body["parent"] != "agency-a" {
				t.Errorf("bad scope body: %v", body)
			}
			fmt.Fprint(w, `{"id":"`+scopeID+`","external_id":"team a1","kind":"group","parent":"agency-a","name":null,"created_at":"2026-11-07T00:00:00Z"}`)
		case "GET /v1/admin/scopes":
			fmt.Fprint(w, `{"items":[{"id":"`+scopeID+`","external_id":"agency-a","kind":"org","parent":"customer","name":"Agency A","created_at":"2026-11-07T00:00:00Z"}],"next_cursor":null}`)
		case "DELETE /v1/admin/scopes/agency-a":
			w.WriteHeader(409)
			fmt.Fprint(w, `{"error":{"code":"SCOPE_HAS_CHILDREN","message":"Archive the org's groups first.","retryable":false},"request_id":"r1"}`)
		case "DELETE /v1/admin/scopes/team a1":
			w.WriteHeader(204)
		case "PUT /v1/admin/users/mei/memberships":
			items := body["memberships"].([]any)
			if len(items) != 1 || items[0].(map[string]any)["role"] != "viewer" {
				t.Errorf("bad memberships: %v", body)
			}
			fmt.Fprint(w, `{"user_id":"`+userID+`","external_user_id":"mei","memberships":[{"scope":"agency-a","role":"viewer"}]}`)
		case "GET /v1/admin/users/mei/memberships":
			fmt.Fprint(w, `{"user_id":"`+userID+`","external_user_id":"mei","memberships":[]}`)
		case "PUT /v1/shares/product/" + productID + "/customer":
			if body["access"] != "read" {
				t.Errorf("bad share: %v", body)
			}
			fmt.Fprint(w, `{"kind":"product","id":"`+productID+`","scope":"customer","access":"read","created_at":"2026-11-07T00:00:00Z"}`)
		case "GET /v1/shares/product/" + productID:
			fmt.Fprint(w, `{"items":[{"kind":"product","id":"`+productID+`","scope":"customer","access":"read","created_at":"2026-11-07T00:00:00Z"}]}`)
		case "DELETE /v1/shares/product/" + productID + "/customer":
			w.WriteHeader(204)
		default:
			t.Errorf("unexpected %s %s", r.Method, r.URL.Path)
			w.WriteHeader(404)
		}
	}))
	defer server.Close()
	admin, err := NewAdminClient(server.URL, "admin-key")
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	parent := "agency-a"
	scope, err := admin.PutScope(ctx, "team a1", ScopeInput{Kind: ScopeGroup, Parent: &parent})
	if err != nil || scope.Parent != "agency-a" || scope.Name != nil {
		t.Fatalf("PutScope: %v %+v", err, scope)
	}
	page, err := admin.ListScopes(ctx, ListOptions{})
	if err != nil || len(page.Items) != 1 || *page.Items[0].Name != "Agency A" {
		t.Fatalf("ListScopes: %v %+v", err, page)
	}
	var apiErr *APIError
	if err := admin.ArchiveScope(ctx, "agency-a"); !errors.As(err, &apiErr) || apiErr.Code != "SCOPE_HAS_CHILDREN" {
		t.Fatalf("ArchiveScope with groups: %v", err)
	}
	if err := admin.ArchiveScope(ctx, "team a1"); err != nil {
		t.Fatalf("ArchiveScope: %v", err)
	}
	members, err := admin.SetMemberships(ctx, "mei", []Membership{{Scope: "agency-a", Role: RoleViewer}})
	if err != nil || members.Memberships[0].Role != RoleViewer {
		t.Fatalf("SetMemberships: %v %+v", err, members)
	}
	if read, err := admin.GetMemberships(ctx, "mei"); err != nil || len(read.Memberships) != 0 {
		t.Fatalf("GetMemberships: %v %+v", err, read)
	}
	item := ItemRef{Kind: "product", ID: productID}
	if share, err := admin.SetShare(ctx, item, CustomerScope, AccessRead); err != nil || share.Access != AccessRead {
		t.Fatalf("SetShare: %v %+v", err, share)
	}
	if shares, err := admin.ListShares(ctx, item); err != nil || len(shares) != 1 {
		t.Fatalf("ListShares: %v %+v", err, shares)
	}
	if err := admin.RemoveShare(ctx, item, CustomerScope); err != nil {
		t.Fatalf("RemoveShare: %v", err)
	}
	if len(seen) != 9 {
		t.Fatalf("requests: %v", seen)
	}
}

func TestPermissionInputsAreCheckedBeforeSending(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Errorf("sent %s %s", r.Method, r.URL.Path)
	}))
	defer server.Close()
	admin, _ := NewAdminClient(server.URL, "admin-key")
	ctx := context.Background()
	checks := []error{
		func() error { _, err := admin.PutScope(ctx, "customer", ScopeInput{Kind: ScopeOrg}); return err }(),
		func() error { _, err := admin.PutScope(ctx, "a/b", ScopeInput{Kind: ScopeOrg}); return err }(),
		func() error { _, err := admin.PutScope(ctx, "a1", ScopeInput{Kind: "team"}); return err }(),
		admin.ArchiveScope(ctx, "customer"),
		func() error {
			_, err := admin.SetMemberships(ctx, "mei", []Membership{{Scope: "a1", Role: "owner"}})
			return err
		}(),
		func() error {
			_, err := admin.SetShare(ctx, ItemRef{Kind: "batch", ID: productID}, "a1", AccessRead)
			return err
		}(),
		func() error {
			_, err := admin.SetShare(ctx, ItemRef{Kind: "product", ID: "p1"}, "a1", AccessRead)
			return err
		}(),
		func() error {
			_, err := admin.SetShare(ctx, ItemRef{Kind: "product", ID: productID}, "a1", "delete")
			return err
		}(),
	}
	for i, err := range checks {
		var apiErr *APIError
		if !errors.As(err, &apiErr) || apiErr.Code != "INVALID_INPUT" {
			t.Errorf("check %d: %v", i, err)
		}
	}
}

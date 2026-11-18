package nuvaadmin

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestArchiveAndUnarchiveSkill(t *testing.T) {
	var seen []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = append(seen, r.Method+" "+r.URL.RequestURI())
		archived := `null`
		if strings.HasSuffix(r.URL.Path, "/archive") {
			archived = `"2026-11-13T03:00:00Z"`
		}
		if r.URL.Path == "/v1/skills" {
			fmt.Fprint(w, `{"items":[`+skillJSON+`],"next_cursor":null}`)
			return
		}
		fmt.Fprint(w, strings.TrimSuffix(skillJSON, "}")+`,"archived_at":`+archived+`}`)
	}))
	defer server.Close()
	admin, err := NewAdminClient(server.URL, "admin-secret")
	if err != nil {
		t.Fatal(err)
	}
	archived, err := admin.ArchiveSkill(context.Background(), "writer")
	if err != nil || archived.ArchivedAt == nil || archived.ArchivedAt.UTC().Hour() != 3 {
		t.Fatalf("archive: %+v %v", archived, err)
	}
	restored, err := admin.UnarchiveSkill(context.Background(), "writer")
	if err != nil || restored.ArchivedAt != nil {
		t.Fatalf("unarchive: %+v %v", restored, err)
	}
	if _, err := admin.ArchiveSkill(context.Background(), "../writer"); err == nil {
		t.Fatal("an invalid name must be refused before dispatch")
	}
	reader, err := NewUserClient(server.URL, "user-token")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := reader.ListArchivedSkills(context.Background(), ListOptions{Limit: 5}); err != nil {
		t.Fatal(err)
	}
	if _, err := reader.ListSkills(context.Background(), ListOptions{}); err != nil {
		t.Fatal(err)
	}
	want := []string{
		"POST /v1/admin/skills/writer/archive",
		"POST /v1/admin/skills/writer/unarchive",
		"GET /v1/skills?archived=true&limit=5",
		"GET /v1/skills",
	}
	if fmt.Sprint(seen) != fmt.Sprint(want) {
		t.Fatalf("requests: %v", seen)
	}
}

func TestArchiveSkillRefusesAMismatchedState(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, skillJSON) // no archived_at: not archived
	}))
	defer server.Close()
	admin, _ := NewAdminClient(server.URL, "admin-secret")
	if _, err := admin.ArchiveSkill(context.Background(), "writer"); err == nil {
		t.Fatal("a response that does not say the Skill is archived is malformed")
	}
}

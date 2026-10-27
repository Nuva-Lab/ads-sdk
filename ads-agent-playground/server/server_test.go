package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	admin "github.com/Nuva-Lab/ads-sdk/go"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func testApp(t *testing.T, cfg configuration, broker *tokenBroker) (*httptest.Server, *app) {
	t.Helper()
	dir := t.TempDir()
	html, err := os.ReadFile("../index.html")
	if err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(filepath.Join(dir, "index.html"), html, 0600); err != nil {
		t.Fatal(err)
	}
	app := newApp("", cfg, broker, dir)
	server := httptest.NewServer(app)
	app.origin = server.URL
	t.Cleanup(func() { app.closeBridges(); server.Close() })
	return server, app
}
func fetchJSON(t *testing.T, client *http.Client, method, url, body string) (int, map[string]any) {
	t.Helper()
	request, err := http.NewRequest(method, url, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := client.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	var data map[string]any
	if response.StatusCode != 204 {
		if err = json.NewDecoder(response.Body).Decode(&data); err != nil {
			t.Fatal(err)
		}
	}
	return response.StatusCode, data
}
func TestGoHostUsesAdminSDKAndNeverExposesKey(t *testing.T) {
	const (
		apiKey   = "private-admin-fixture"
		external = "alice"
		user     = "11111111-1111-4111-8111-111111111111"
	)
	var issues atomic.Int64
	issuer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/admin/tokens" || r.Method != "POST" {
			t.Errorf("unexpected issuer request")
			w.WriteHeader(404)
			return
		}
		if r.Header.Get("Authorization") != "Bearer "+apiKey {
			t.Error("Admin key missing on issuer request")
		}
		var input map[string]string
		_ = json.NewDecoder(r.Body).Decode(&input)
		if input["external_user_id"] != external {
			t.Error("unconfigured external user selected")
		}
		count := issues.Add(1)
		writeJSON(w, 200, map[string]any{"access_token": fmt.Sprintf("user-token-%d", count), "expires_at": time.Now().Add(time.Hour), "token_type": "Bearer", "user": map[string]string{"id": user, "external_user_id": external}})
	}))
	defer issuer.Close()
	adminClient, err := admin.NewAdminClient(issuer.URL, apiKey)
	if err != nil {
		t.Fatal(err)
	}
	cfg := configuration{Endpoints: endpoints{Agent: issuer.URL + "/api", API: issuer.URL}, APIKey: apiKey, ExternalUserID: external}
	server, _ := testApp(t, cfg, newTokenBroker(adminClient.IssueUserToken, external))
	status, config := fetchJSON(t, server.Client(), "GET", server.URL+"/playground/config", "")
	if status != 200 {
		t.Fatal(status)
	}
	encoded, _ := json.Marshal(config)
	if strings.Contains(string(encoded), apiKey) || strings.Contains(string(encoded), external) {
		t.Fatal("private configuration exposed")
	}
	status, token := fetchJSON(t, server.Client(), "GET", server.URL+"/playground/token?external_user_id=mallory", "")
	if status != 200 || token["token"] != "user-token-1" || token["expiresAt"] == nil {
		t.Fatal(status, token)
	}
	if strings.Contains(fmt.Sprint(token), apiKey) {
		t.Fatal("Admin key exposed to browser")
	}
	_, token = fetchJSON(t, server.Client(), "GET", server.URL+"/playground/token", "")
	if issues.Load() != 1 {
		t.Fatal("fresh token was not cached")
	}
	_, token = fetchJSON(t, server.Client(), "GET", server.URL+"/playground/token?force=1", "")
	if token["token"] != "user-token-2" {
		t.Fatal("forced refresh failed")
	}
	for _, path := range []string{"/playground/token", "/playground/config"} {
		request, _ := http.NewRequest("GET", server.URL+path, nil)
		request.Header.Set("Origin", "https://untrusted.example")
		response, err := server.Client().Do(request)
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		if response.StatusCode != 403 {
			t.Fatal("cross-origin token access allowed")
		}
	}
	body, _ := json.Marshal(cfg.Endpoints)
	_, first := fetchJSON(t, server.Client(), "POST", server.URL+"/playground/connect", string(body))
	_, _ = fetchJSON(t, server.Client(), "GET", server.URL+"/playground/token?force=1", "")
	_, second := fetchJSON(t, server.Client(), "POST", server.URL+"/playground/connect", string(body))
	if first["scope"] == "" || first["scope"] != second["scope"] {
		t.Fatal("token renewal changed browser data scope")
	}
	response, err := server.Client().Get(server.URL + "/")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	html, _ := io.ReadAll(response.Body)
	if strings.Contains(string(html), "user-token") || strings.Contains(string(html), "Paste your user token") {
		t.Fatal("token field remains in page")
	}
}
func TestPublicProxyDoesNotRedirectAdminCredentials(t *testing.T) {
	var issues atomic.Int64
	broker := newTokenBroker(func(ctx context.Context, id string) (admin.TokenResponse, error) {
		issues.Add(1)
		return grant("user-token", "user-1", time.Now().Add(time.Hour)), nil
	}, "alice")
	headers := make(chan http.Header, 1)
	destination := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		headers <- r.Header.Clone()
		writeJSON(w, 200, map[string]any{"items": []string{}})
	}))
	defer destination.Close()
	cfg := configuration{APIKey: "never-send-this-admin-key", Endpoints: defaultEndpoints}
	server, _ := testApp(t, cfg, broker)
	body, _ := json.Marshal(endpoints{Agent: destination.URL + "/api", API: destination.URL})
	status, connection := fetchJSON(t, server.Client(), "POST", server.URL+"/playground/connect", string(body))
	if status != 200 {
		t.Fatal(status)
	}
	request, _ := http.NewRequest("GET", connection["api"].(string)+"/v1/products", nil)
	request.Header.Set("Authorization", "Bearer user-token")
	request.Header.Set("Cookie", "private=value")
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	received := <-headers
	if received.Get("Authorization") != "Bearer user-token" || received.Get("Cookie") != "" {
		t.Fatal("proxy changed credential authority or forwarded cookies")
	}
	if issues.Load() != 1 {
		t.Fatal("unexpected token issuance")
	}
	for _, path := range []string{"/status", "/_dev/config", "/.env", "/connections/" + connection["id"].(string) + "/store/v1/admin/tokens", "/connections/" + connection["id"].(string) + "/store/v1/batches/id/creation-trace"} {
		status, _ = fetchJSON(t, server.Client(), "GET", server.URL+path, "")
		if status != 404 {
			t.Fatal("private path exposed", path)
		}
	}
	status, _ = fetchJSON(t, server.Client(), "DELETE", server.URL+"/playground/connections/"+connection["id"].(string), "")
	if status != 204 {
		t.Fatal(status)
	}
	if response, err := server.Client().Get(connection["api"].(string) + "/v1/products"); err == nil {
		response.Body.Close()
		t.Fatal("removed connection still reachable")
	}
}
func TestWebSocketUpgradeIsProxied(t *testing.T) {
	origin := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/agent" {
			w.WriteHeader(404)
			return
		}
		origin <- r.Header.Get("Origin")
		conn, buffer, err := w.(http.Hijacker).Hijack()
		if err != nil {
			return
		}
		defer conn.Close()
		_, _ = buffer.WriteString("HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n")
		_ = buffer.Flush()
		_, _ = io.Copy(conn, conn)
	}))
	defer upstream.Close()
	broker := newTokenBroker(func(context.Context, string) (admin.TokenResponse, error) {
		return grant("user-token", "user-1", time.Now().Add(time.Hour)), nil
	}, "alice")
	cfg := configuration{Endpoints: endpoints{Agent: upstream.URL + "/api", API: upstream.URL}}
	server, _ := testApp(t, cfg, broker)
	body, _ := json.Marshal(cfg.Endpoints)
	_, connection := fetchJSON(t, server.Client(), "POST", server.URL+"/playground/connect", string(body))
	bridgeURL, _ := url.Parse(connection["agent"].(string))
	conn, err := net.Dial("tcp", bridgeURL.Host)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(3 * time.Second))
	path := "/api/agent"
	_, _ = fmt.Fprintf(conn, "GET %s HTTP/1.1\r\nHost: %s\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nOrigin: %s\r\n\r\n", path, bridgeURL.Host, server.URL)
	reader := bufio.NewReader(conn)
	response, err := http.ReadResponse(reader, nil)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != 101 {
		t.Fatal(response.StatusCode)
	}
	if <-origin != "" {
		t.Fatal("browser origin must be checked locally, not forwarded as server authority")
	}
	_, _ = conn.Write([]byte("test-frame"))
	echo := make([]byte, len("test-frame"))
	if _, err = io.ReadFull(reader, echo); err != nil {
		t.Fatal(err)
	}
	if string(echo) != "test-frame" {
		t.Fatal("upgrade did not carry data")
	}
}

func TestBridgeCORSAndSessionREST(t *testing.T) {
	var calls atomic.Int64
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if r.URL.Path != "/v1/sessions" {
			t.Error("wrong Session REST path")
		}
		w.Header().Set("Access-Control-Allow-Origin", "*")
		writeJSON(w, 200, map[string]any{"items": []string{}, "nextCursor": nil})
	}))
	defer upstream.Close()
	broker := newTokenBroker(func(context.Context, string) (admin.TokenResponse, error) {
		return grant("token", "user", time.Now().Add(time.Hour)), nil
	}, "alice")
	cfg := configuration{Endpoints: endpoints{Agent: upstream.URL + "/api", API: upstream.URL}}
	ui, _ := testApp(t, cfg, broker)
	body, _ := json.Marshal(cfg.Endpoints)
	_, connection := fetchJSON(t, ui.Client(), "POST", ui.URL+"/playground/connect", string(body))
	base, _ := url.Parse(connection["agent"].(string))
	target := base.Scheme + "://" + base.Host + "/v1/sessions"
	for _, method := range []string{"OPTIONS", "GET"} {
		req, _ := http.NewRequest(method, target, nil)
		req.Header.Set("Origin", ui.URL)
		req.Header.Set("Access-Control-Request-Method", "GET")
		req.Header.Set("Access-Control-Request-Headers", "authorization")
		response, err := ui.Client().Do(req)
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		if response.Header.Get("Access-Control-Allow-Origin") != ui.URL || len(response.Header.Values("Access-Control-Allow-Origin")) != 1 {
			t.Fatal("wrong CORS boundary")
		}
		if response.Header.Get("Access-Control-Allow-Credentials") != "" {
			t.Fatal("cookie credentials enabled")
		}
	}
	if calls.Load() != 1 {
		t.Fatal("preflight reached upstream")
	}
	req, _ := http.NewRequest("GET", target, nil)
	req.Header.Set("Origin", "https://other.example")
	response, err := ui.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode != 403 || calls.Load() != 1 {
		t.Fatal("foreign browser origin reached proxy")
	}
}

func TestExternalNavigationOnlyOpensStaticDocument(t *testing.T) {
	var issued atomic.Int64
	broker := newTokenBroker(func(context.Context, string) (admin.TokenResponse, error) {
		issued.Add(1)
		return grant("private-user-token", "user", time.Now().Add(time.Hour)), nil
	}, "alice")
	server, _ := testApp(t, configuration{Endpoints: defaultEndpoints}, broker)
	for _, tc := range []struct {
		name, method, path, mode, dest, origin, host string
		want                                         int
	}{
		{name: "external link", method: "GET", path: "/", mode: "navigate", dest: "document", want: 200},
		{name: "fetch", method: "GET", path: "/", mode: "cors", dest: "empty", want: 403},
		{name: "iframe", method: "GET", path: "/", mode: "navigate", dest: "iframe", want: 403},
		{name: "foreign origin", method: "GET", path: "/", mode: "navigate", dest: "document", origin: "https://other.example", want: 403},
		{name: "foreign host", method: "GET", path: "/", mode: "navigate", dest: "document", host: "other.example", want: 403},
		{name: "token navigation", method: "GET", path: "/playground/token", mode: "navigate", dest: "document", want: 403},
		{name: "config navigation", method: "GET", path: "/playground/config", mode: "navigate", dest: "document", want: 403},
		{name: "connect navigation", method: "POST", path: "/playground/connect", mode: "navigate", dest: "document", want: 403},
		{name: "script navigation", method: "GET", path: "/client.js", mode: "navigate", dest: "document", want: 403},
	} {
		t.Run(tc.name, func(t *testing.T) {
			request, _ := http.NewRequest(tc.method, server.URL+tc.path, nil)
			request.Header.Set("Sec-Fetch-Site", "cross-site")
			request.Header.Set("Sec-Fetch-Mode", tc.mode)
			request.Header.Set("Sec-Fetch-Dest", tc.dest)
			if tc.origin != "" {
				request.Header.Set("Origin", tc.origin)
			}
			if tc.host != "" {
				request.Host = tc.host
			}
			response, err := server.Client().Do(request)
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			body, _ := io.ReadAll(response.Body)
			if response.StatusCode != tc.want {
				t.Fatalf("got %d, want %d", response.StatusCode, tc.want)
			}
			if strings.Contains(string(body), "private-user-token") {
				t.Fatal("navigation exposed a token")
			}
			if tc.want == 200 && !strings.Contains(response.Header.Get("Content-Security-Policy"), "frame-ancestors 'none'") {
				t.Fatal("document framing protection missing")
			}
		})
	}
	if issued.Load() != 0 {
		t.Fatal("external navigation issued a user token")
	}
}

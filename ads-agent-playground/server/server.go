package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type app struct {
	origin      string
	cfg         configuration
	tokens      *tokenBroker
	publicDir   string
	mu          sync.RWMutex
	connections map[string]*apiBridge
}

func newApp(origin string, cfg configuration, tokens *tokenBroker, publicDir string) *app {
	cfg.APIKey = "" // Only the Admin SDK credential holder needs the key after startup.
	return &app{origin: origin, cfg: cfg, tokens: tokens, publicDir: publicDir, connections: make(map[string]*apiBridge)}
}
func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
func failure(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
func (a *app) local(r *http.Request) bool {
	origin, _ := url.Parse(a.origin)
	if r.Host != origin.Host {
		return false
	}
	if value := r.Header.Get("Origin"); value != "" && value != a.origin {
		return false
	}
	site := r.Header.Get("Sec-Fetch-Site")
	return site != "cross-site" && site != "same-site"
}
func publicPath(service, path, method string) bool {
	if strings.ContainsAny(path, "%\\") || strings.Contains(path, "..") {
		return false
	}
	if service == "agent" {
		return path == "rpc" && method == "POST" || path == "agent" && method == "GET"
	}
	if service == "generation" {
		return method == "POST" && (path == "v1/generate/script" || path == "v1/generate/prompt")
	}
	if service != "store" || !(method == "GET" || method == "POST" || method == "PUT" || method == "PATCH" || method == "DELETE" || method == "HEAD") {
		return false
	}
	for _, piece := range strings.Split(path, "/") {
		if piece == "admin" || piece == "internal" || piece == "_dev" || piece == "log" || piece == "creation-trace" {
			return false
		}
	}
	if path == "v1/generate/video" {
		return method == "POST"
	}
	for _, kind := range []string{"products", "brands", "characters", "assets", "artifacts", "jobs", "ads", "batches", "skills"} {
		prefix := "v1/" + kind
		if path == prefix || strings.HasPrefix(path, prefix+"/") {
			return true
		}
	}
	return false
}
func (a *app) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !a.local(r) {
		failure(w, 403, "Open the playground from its local address.")
		return
	}
	switch {
	case r.Method == "GET" && r.URL.Path == "/playground/config":
		writeJSON(w, 200, a.cfg.Endpoints)
		return
	case r.Method == "GET" && r.URL.Path == "/playground/token":
		token, err := a.tokens.get(r.Context(), r.URL.Query().Get("force") == "1")
		if err != nil {
			failure(w, 503, "Could not refresh the user token. Check the backend credentials and try again.")
			return
		}
		writeJSON(w, 200, struct {
			Token     string    `json:"token"`
			ExpiresAt time.Time `json:"expiresAt"`
		}{token.AccessToken, token.ExpiresAt})
		return
	case r.Method == "POST" && r.URL.Path == "/playground/connect":
		var input endpoints
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16384))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			failure(w, 400, "Check your service URLs and try again.")
			return
		}
		var extra any
		if decoder.Decode(&extra) != io.EOF {
			failure(w, 400, "Invalid connection settings.")
			return
		}
		for _, value := range []*string{&input.Agent, &input.API} {
			normalized, err := endpoint(*value)
			if err != nil {
				failure(w, 400, err.Error())
				return
			}
			*value = normalized
		}
		// The browser may edit public destinations; Admin credentials are never sent to these.
		// Token issuance always uses cfg.Endpoints.API selected in the server environment.
		token, err := a.tokens.get(r.Context(), false)
		if err != nil {
			failure(w, 503, "Could not obtain a user token.")
			return
		}
		random := make([]byte, 16)
		if _, err = rand.Read(random); err != nil {
			failure(w, 500, "Could not create a connection.")
			return
		}
		id := hex.EncodeToString(random)
		a.mu.Lock()
		if len(a.connections) >= 64 {
			a.mu.Unlock()
			failure(w, 429, "Close unused connections before adding another.")
			return
		}
		bridge, err := openBridge(a.origin, input)
		if err != nil {
			a.mu.Unlock()
			failure(w, 503, "Could not open the local API connection.")
			return
		}
		a.connections[id] = bridge
		a.mu.Unlock()
		settings, _ := json.Marshal(input)
		digest := sha256.Sum256([]byte(a.cfg.Endpoints.API + "\x00" + token.User.ID + "\x00" + string(settings)))
		writeJSON(w, 200, map[string]string{"id": id, "scope": hex.EncodeToString(digest[:]), "agent": bridge.origin + "/api", "api": bridge.origin + "/data"})
		return
	case r.Method == "DELETE" && strings.HasPrefix(r.URL.Path, "/playground/connections/"):
		a.mu.Lock()
		id := strings.TrimPrefix(r.URL.Path, "/playground/connections/")
		bridge := a.connections[id]
		delete(a.connections, id)
		a.mu.Unlock()
		if bridge != nil {
			bridge.close()
		}
		w.WriteHeader(204)
		return
	}
	assets := map[string]struct{ Name, MIME string }{"/": {"index.html", "text/html; charset=utf-8"}, "/client.js": {"client.js", "text/javascript"}, "/style.css": {"style.css", "text/css"}}
	asset, found := assets[r.URL.Path]
	if r.Method != "GET" || !found {
		failure(w, 404, "Not found.")
		return
	}
	content, err := os.ReadFile(filepath.Join(a.publicDir, asset.Name))
	if err != nil {
		failure(w, 503, "Build the playground before starting it.")
		return
	}
	w.Header().Set("Content-Type", asset.MIME)
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: http: blob: data:; media-src 'self' https: http: blob:; connect-src 'self' https: http: ws: wss:; frame-ancestors 'none'; base-uri 'none'")
	_, _ = w.Write(content)
}
func (a *app) String() string { return fmt.Sprintf("Ads playground (%s)", a.origin) }

func (a *app) closeBridges() {
	a.mu.Lock()
	defer a.mu.Unlock()
	for id, b := range a.connections {
		b.close()
		delete(a.connections, id)
	}
}

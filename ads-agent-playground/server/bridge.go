package main

import (
	"io"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"
	"time"
)

// Each browser connection gets a loopback API origin. The SDK addresses Session
// REST endpoints at the Agent origin root, so path-only proxy prefixes cannot
// separate connections pointed at different Agents.
type apiBridge struct {
	origin    string
	uiOrigin  string
	endpoints endpoints
	server    *http.Server
	mu        sync.Mutex
	sockets   map[net.Conn]struct{}
}

func openBridge(uiOrigin string, settings endpoints) (*apiBridge, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	b := &apiBridge{origin: "http://" + listener.Addr().String(), uiOrigin: uiOrigin, endpoints: settings, sockets: make(map[net.Conn]struct{})}
	b.server = &http.Server{Handler: b, ReadHeaderTimeout: 10 * time.Second, IdleTimeout: 90 * time.Second, ConnState: func(c net.Conn, state http.ConnState) {
		b.mu.Lock()
		defer b.mu.Unlock()
		if state == http.StateClosed {
			delete(b.sockets, c)
		} else {
			b.sockets[c] = struct{}{}
		}
	}}
	go func() { _ = b.server.Serve(listener) }()
	return b, nil
}
func (b *apiBridge) close() {
	b.mu.Lock()
	for c := range b.sockets {
		_ = c.Close()
	}
	b.mu.Unlock()
	_ = b.server.Close()
}
func (b *apiBridge) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	local, _ := url.Parse(b.origin)
	source := r.Header.Get("Origin")
	if r.Host != local.Host || source != "" && source != b.uiOrigin {
		failure(w, 403, "Connection origin is not allowed.")
		return
	}
	if source != "" {
		w.Header().Set("Access-Control-Allow-Origin", b.uiOrigin)
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID")
	}
	method := r.Method
	if method == "OPTIONS" {
		method = r.Header.Get("Access-Control-Request-Method")
	}
	var target string
	path := r.URL.Path
	if (path == "/v1/sessions" || strings.HasPrefix(path, "/v1/sessions/")) && (method == "GET" || method == "POST") {
		if strings.ContainsAny(path, "%\\") || strings.Contains(path, "..") {
			failure(w, 404, "Not found.")
			return
		}
		agent, _ := url.Parse(b.endpoints.Agent)
		target = agent.Scheme + "://" + agent.Host + path
	} else {
		service, suffix, ok := strings.Cut(strings.TrimPrefix(path, "/"), "/")
		if !ok {
			failure(w, 404, "Not found.")
			return
		}
		base := ""
		switch service {
		case "api":
			if publicPath("agent", suffix, method) {
				base = b.endpoints.Agent
			}
		case "store":
			if publicPath(service, suffix, method) {
				base = b.endpoints.Store
			}
		case "generation":
			if publicPath(service, suffix, method) {
				base = b.endpoints.Generation
			}
		}
		if base == "" {
			failure(w, 404, "Not found.")
			return
		}
		target = base + "/" + suffix
	}
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, HEAD")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID, Idempotency-Key")
		w.WriteHeader(204)
		return
	}
	upstream, err := url.Parse(target)
	if err != nil {
		failure(w, 400, "Invalid service URL.")
		return
	}
	upstream.RawQuery = r.URL.RawQuery
	proxy := &httputil.ReverseProxy{
		Rewrite: func(p *httputil.ProxyRequest) {
			*p.Out.URL = *upstream
			p.Out.Host = upstream.Host
			for _, h := range []string{"Cookie", "Proxy-Authorization", "Referer", "Origin"} {
				p.Out.Header.Del(h)
			}
		},
		ModifyResponse: func(response *http.Response) error {
			for _, h := range []string{"Set-Cookie", "Access-Control-Allow-Origin", "Access-Control-Allow-Credentials", "Access-Control-Expose-Headers"} {
				response.Header.Del(h)
			}
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			failure(w, 502, "The service could not be reached.")
		},
		ErrorLog: log.New(io.Discard, "", 0),
	}
	proxy.ServeHTTP(w, r)
}

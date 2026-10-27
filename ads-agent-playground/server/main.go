package main

import (
	"context"
	"flag"
	"fmt"
	admin "github.com/Nuva-Lab/ads-sdk/go"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func run() error {
	port := flag.Int("port", 8995, "local playground port")
	publicDir := flag.String("public-dir", "../dist", "built frontend directory")
	flag.Parse()
	cfg, err := readConfig(os.Getenv)
	if err != nil {
		return err
	}
	client, err := admin.NewAdminClient(cfg.Endpoints.API, cfg.APIKey)
	if err != nil {
		return fmt.Errorf("invalid playground configuration: %w", err)
	}
	tokens := newTokenBroker(client.IssueUserToken, cfg.ExternalUserID)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	_, err = tokens.get(ctx, false)
	cancel()
	if err != nil {
		return fmt.Errorf("could not issue a user token: %w", err)
	}
	listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", *port))
	if err != nil {
		return err
	}
	origin := "http://" + listener.Addr().String()
	handler := newApp(origin, cfg, tokens, *publicDir)
	defer handler.closeBridges()
	server := &http.Server{Handler: handler, ReadHeaderTimeout: 10 * time.Second, IdleTimeout: 90 * time.Second}
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(done)
	go func() {
		<-done
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(ctx)
	}()
	fmt.Println("Ads Agent Playground:", origin)
	if err = server.Serve(listener); err != http.ErrServerClosed {
		return err
	}
	return nil
}
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "Ads Agent Playground:", err)
		os.Exit(1)
	}
}

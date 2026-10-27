package main

import (
	"context"
	"errors"
	admin "github.com/Nuva-Lab/ads-sdk/go"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func grant(token, id string, expiry time.Time) admin.TokenResponse {
	return admin.TokenResponse{AccessToken: token, ExpiresAt: expiry, User: admin.TokenUser{ID: id, ExternalUserID: "alice"}}
}
func TestTokensCacheRefreshAndCoalesce(t *testing.T) {
	now := time.Now()
	var calls atomic.Int64
	broker := newTokenBroker(func(ctx context.Context, id string) (admin.TokenResponse, error) {
		if id != "alice" {
			t.Errorf("wrong external id")
		}
		n := calls.Add(1)
		time.Sleep(10 * time.Millisecond)
		return grant(string(rune('a'+n)), "user-1", now.Add(time.Hour)), nil
	}, "alice")
	broker.now = func() time.Time { return now }
	var wg sync.WaitGroup
	for i := 0; i < 30; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := broker.get(context.Background(), false)
			if err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	if calls.Load() != 1 {
		t.Fatalf("wanted one issuance, got %d", calls.Load())
	}
	now = now.Add(59*time.Minute + 30*time.Second)
	_, err := broker.get(context.Background(), false)
	if err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 2 {
		t.Fatal("near-expiry token was not refreshed")
	}
	_, err = broker.get(context.Background(), true)
	if err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 3 {
		t.Fatal("explicit refresh was not honored")
	}
}
func TestTokensRejectExpiredOrChangedIdentity(t *testing.T) {
	now := time.Now()
	id := "user-1"
	broker := newTokenBroker(func(context.Context, string) (admin.TokenResponse, error) {
		return grant("user-token", id, now.Add(time.Hour)), nil
	}, "alice")
	if _, err := broker.get(context.Background(), false); err != nil {
		t.Fatal(err)
	}
	id = "user-2"
	if _, err := broker.get(context.Background(), true); err == nil {
		t.Fatal("identity change accepted")
	}
	if _, err := broker.get(context.Background(), false); err == nil {
		t.Fatal("identity failure was bypassed with cache")
	}
	expired := newTokenBroker(func(context.Context, string) (admin.TokenResponse, error) {
		return grant("old", "user-1", now.Add(-time.Minute)), nil
	}, "alice")
	if _, err := expired.get(context.Background(), false); err == nil {
		t.Fatal("expired token accepted")
	}
}
func TestFailedRefreshDoesNotReturnOldToken(t *testing.T) {
	count := 0
	broker := newTokenBroker(func(context.Context, string) (admin.TokenResponse, error) {
		count++
		if count > 1 {
			return admin.TokenResponse{}, errors.New("issuer unavailable")
		}
		return grant("old", "user-1", time.Now().Add(time.Hour)), nil
	}, "alice")
	if _, err := broker.get(context.Background(), false); err != nil {
		t.Fatal(err)
	}
	value, err := broker.get(context.Background(), true)
	if err == nil || value.AccessToken != "" {
		t.Fatal("refresh failure substituted old credentials")
	}
}
func TestConfigurationRequiresKeyAndExplicitUser(t *testing.T) {
	_, err := readConfig(func(string) string { return "" })
	if err == nil {
		t.Fatal("missing environment accepted")
	}
	env := map[string]string{"NUVA_CUSTOMER_API_KEY": "fixture-admin", "NUVA_EXTERNAL_USER_ID": " alice "}
	cfg, err := readConfig(func(k string) string { return env[k] })
	if err != nil {
		t.Fatal(err)
	}
	if cfg.ExternalUserID != " alice " {
		t.Fatal("external user identity was normalized")
	}
	if cfg.Endpoints != defaultEndpoints {
		t.Fatal("defaults mismatch")
	}
	env["NUVA_API_URL"] = "http://unsafe.example"
	if _, err = readConfig(func(k string) string { return env[k] }); err == nil {
		t.Fatal("non-local plaintext Admin transport allowed")
	}
	env["NUVA_API_URL"] = "http://127.0.0.1:1234"
	if _, err = readConfig(func(k string) string { return env[k] }); err != nil {
		t.Fatal(err)
	}
}

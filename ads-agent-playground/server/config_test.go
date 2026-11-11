package main

import (
	"strings"
	"testing"
)

func TestEnvironmentPairsEndpoints(t *testing.T) {
	for _, tc := range []struct {
		name, value, wantEnvironment string
		wantEndpoints                endpoints
	}{
		{"default", "", "sandbox", endpoints{Agent: "https://agent-staging.nuvalab.ai/api", API: "https://api-staging.nuvalab.ai"}},
		{"sandbox", "sandbox", "sandbox", endpoints{Agent: "https://agent-staging.nuvalab.ai/api", API: "https://api-staging.nuvalab.ai"}},
		{"production", "production", "production", endpoints{Agent: "https://agent.nuvalab.ai/api", API: "https://api.nuvalab.ai"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			env := map[string]string{"NUVA_ENVIRONMENT": tc.value, "NUVA_CUSTOMER_API_KEY": "dummy-admin", "NUVA_EXTERNAL_USER_ID": "exact-user"}
			cfg, err := readConfig(func(key string) string { return env[key] })
			if err != nil {
				t.Fatal(err)
			}
			if cfg.Environment != tc.wantEnvironment || cfg.Endpoints != tc.wantEndpoints {
				t.Fatalf("wrong environment selection: %s %+v", cfg.Environment, cfg.Endpoints)
			}
			if cfg.APIKey != "dummy-admin" || cfg.ExternalUserID != "exact-user" {
				t.Fatal("environment selection changed credentials or identity")
			}
		})
	}
}

func TestEnvironmentRejectsUnknownValue(t *testing.T) {
	for _, value := range []string{"staging", "Production", "test"} {
		env := map[string]string{"NUVA_ENVIRONMENT": value, "NUVA_CUSTOMER_API_KEY": "dummy-admin", "NUVA_EXTERNAL_USER_ID": "user"}
		_, err := readConfig(func(key string) string { return env[key] })
		if err == nil || !strings.Contains(err.Error(), "NUVA_ENVIRONMENT must be sandbox or production") {
			t.Fatalf("unknown environment %q was not rejected: %v", value, err)
		}
	}
}

func TestEnvironmentAllowsExplicitDevelopmentEndpoints(t *testing.T) {
	env := map[string]string{
		"NUVA_ENVIRONMENT": "production", "NUVA_CUSTOMER_API_KEY": "dummy-admin", "NUVA_EXTERNAL_USER_ID": "user",
		"NUVA_AGENT_URL": "http://127.0.0.1:8980/api/", "NUVA_API_URL": "http://127.0.0.1:8981/",
	}
	cfg, err := readConfig(func(key string) string { return env[key] })
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Endpoints != (endpoints{Agent: "http://127.0.0.1:8980/api", API: "http://127.0.0.1:8981"}) {
		t.Fatalf("development overrides were ignored: %+v", cfg.Endpoints)
	}
}

func TestBridgePortIsOptionalAndChecked(t *testing.T) {
	base := map[string]string{"NUVA_CUSTOMER_API_KEY": "dummy-admin", "NUVA_EXTERNAL_USER_ID": "user"}
	read := func(value string) (configuration, error) {
		env := map[string]string{"NUVA_PLAYGROUND_BRIDGE_PORT": value}
		for k, v := range base {
			env[k] = v
		}
		return readConfig(func(key string) string { return env[key] })
	}
	if cfg, err := read(""); err != nil || cfg.BridgePort != 0 {
		t.Fatalf("an unset bridge port must pick free ports: %d %v", cfg.BridgePort, err)
	}
	if cfg, err := read(" 8996 "); err != nil || cfg.BridgePort != 8996 {
		t.Fatalf("bridge port not read: %d %v", cfg.BridgePort, err)
	}
	for _, value := range []string{"0", "65536", "-1", "port", "8996.5"} {
		if _, err := read(value); err == nil || !strings.Contains(err.Error(), "NUVA_PLAYGROUND_BRIDGE_PORT must be a port number") {
			t.Fatalf("bridge port %q was not rejected: %v", value, err)
		}
	}
}

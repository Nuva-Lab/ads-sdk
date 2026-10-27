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

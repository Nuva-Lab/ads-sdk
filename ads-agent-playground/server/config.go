package main

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
)

type endpoints struct {
	Agent string `json:"agent"`
	API   string `json:"api"`
}

// Customer preview services. The private Ads Agent dev launcher supplies local overrides.
var defaultEndpoints = endpoints{
	Agent: "https://agent-staging.nuvalab.ai/api",
	API:   "https://api-staging.nuvalab.ai",
}

func environmentEndpoints(environment string) (endpoints, error) {
	switch environment {
	case "sandbox":
		return defaultEndpoints, nil
	case "production":
		return endpoints{Agent: "https://agent.nuvalab.ai/api", API: "https://api.nuvalab.ai"}, nil
	default:
		return endpoints{}, errors.New("NUVA_ENVIRONMENT must be sandbox or production")
	}
}

type configuration struct {
	Environment    string
	Endpoints      endpoints
	APIKey         string
	ExternalUserID string
}

func endpoint(value string) (string, error) {
	parsed, err := url.Parse(value)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return "", errors.New("enter an HTTP or HTTPS service URL without credentials or query parameters")
	}
	return strings.TrimRight(parsed.String(), "/"), nil
}
func readConfig(getenv func(string) string) (configuration, error) {
	var cfg configuration
	cfg.Environment = strings.TrimSpace(getenv("NUVA_ENVIRONMENT"))
	if cfg.Environment == "" {
		cfg.Environment = "sandbox"
	}
	var err error
	cfg.Endpoints, err = environmentEndpoints(cfg.Environment)
	if err != nil {
		return cfg, err
	}
	cfg.APIKey = strings.TrimSpace(getenv("NUVA_CUSTOMER_API_KEY"))
	cfg.ExternalUserID = getenv("NUVA_EXTERNAL_USER_ID")
	var missing []string
	if cfg.APIKey == "" {
		missing = append(missing, "NUVA_CUSTOMER_API_KEY")
	}
	if strings.TrimSpace(cfg.ExternalUserID) == "" {
		missing = append(missing, "NUVA_EXTERNAL_USER_ID")
	}
	if len(missing) > 0 {
		return cfg, fmt.Errorf("missing required settings: %s; set them in the environment or .env", strings.Join(missing, ", "))
	}
	for _, setting := range []struct {
		Name   string
		Target *string
	}{{"NUVA_AGENT_URL", &cfg.Endpoints.Agent}, {"NUVA_API_URL", &cfg.Endpoints.API}} {
		if v := strings.TrimSpace(getenv(setting.Name)); v != "" {
			*setting.Target = v
		}
		normalized, err := endpoint(*setting.Target)
		if err != nil {
			return cfg, fmt.Errorf("invalid %s: %w", setting.Name, err)
		}
		*setting.Target = normalized
	}
	issuer, _ := url.Parse(cfg.Endpoints.API)
	if issuer.Scheme != "https" && issuer.Hostname() != "localhost" && issuer.Hostname() != "127.0.0.1" && issuer.Hostname() != "::1" {
		return cfg, errors.New("NUVA_API_URL must use HTTPS unless it is a local development server")
	}
	return cfg, nil
}

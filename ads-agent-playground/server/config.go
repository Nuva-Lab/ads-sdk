package main

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
)

type endpoints struct {
	Agent      string `json:"agent"`
	Store      string `json:"store"`
	Generation string `json:"generation"`
}

// Replace the two loopback defaults with the customer-facing staging hosts when available.
// These are the only default service addresses used by the playground.
var defaultEndpoints = endpoints{
	Agent:      "http://127.0.0.1:8980/api",
	Store:      "https://api-staging.nuvalab.ai",
	Generation: "http://127.0.0.1:8980",
}

type configuration struct {
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
	cfg.Endpoints = defaultEndpoints
	for _, setting := range []struct {
		Name   string
		Target *string
	}{{"NUVA_AGENT_URL", &cfg.Endpoints.Agent}, {"NUVA_STORE_URL", &cfg.Endpoints.Store}, {"NUVA_GENERATION_URL", &cfg.Endpoints.Generation}} {
		if v := strings.TrimSpace(getenv(setting.Name)); v != "" {
			*setting.Target = v
		}
		normalized, err := endpoint(*setting.Target)
		if err != nil {
			return cfg, fmt.Errorf("invalid %s: %w", setting.Name, err)
		}
		*setting.Target = normalized
	}
	issuer, _ := url.Parse(cfg.Endpoints.Store)
	if issuer.Scheme != "https" && issuer.Hostname() != "localhost" && issuer.Hostname() != "127.0.0.1" && issuer.Hostname() != "::1" {
		return cfg, errors.New("NUVA_STORE_URL must use HTTPS unless it is a local development server")
	}
	return cfg, nil
}

package nuvaadmin

import (
	"context"
	"regexp"
	"strings"
	"time"
)

// How the Agent authenticates to your MCP server.
const (
	// MCPAuthBearer sends "Authorization: Bearer <secret>".
	MCPAuthBearer = "bearer"
	// MCPAuthHeader sends "<Header>: <secret>".
	MCPAuthHeader = "header"
	// MCPAuthNone sends no credential.
	MCPAuthNone = "none"
)

var mcpServerName = regexp.MustCompile(`^[a-z][a-z0-9_]{0,30}$`)
var mcpHeaderName = regexp.MustCompile(`^[A-Za-z0-9-]{1,64}$`)

// MCPAuth is how the Agent authenticates to an MCP server. Secret is write-only: the service stores
// it sealed and never returns it; leave it empty to keep the one already set (with the same Type).
type MCPAuth struct {
	Type   string `json:"type"`
	Header string `json:"header,omitempty"`
	Secret string `json:"secret,omitempty"`
}

// MCPTool names a tool the Agent may use; Description, if set, replaces the server's description.
type MCPTool struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

// MCPServerInput registers or replaces an MCP server. Tools nil means every tool the server lists
// (up to 16). Enabled nil means enabled.
type MCPServerInput struct {
	URL         string    `json:"url"`
	Description string    `json:"description,omitempty"`
	Auth        MCPAuth   `json:"auth"`
	Tools       []MCPTool `json:"tools,omitempty"`
	Enabled     *bool     `json:"enabled,omitempty"`
}

// MCPServerAuth is how the Agent authenticates, as the service returns it: whether a secret is set,
// never the secret.
type MCPServerAuth struct {
	Type      string     `json:"type"`
	Header    string     `json:"header,omitempty"`
	Set       bool       `json:"set"`
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
}

// MCPServer is one of your MCP servers, whose tools the Agent can use in new Sessions.
type MCPServer struct {
	Name        string        `json:"name"`
	URL         string        `json:"url"`
	Description string        `json:"description,omitempty"`
	Auth        MCPServerAuth `json:"auth"`
	Tools       []MCPTool     `json:"tools,omitempty"`
	Enabled     bool          `json:"enabled"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

// ListMCPServers lists your MCP servers.
func (c *AdminClient) ListMCPServers(ctx context.Context) ([]MCPServer, error) {
	var out struct {
		Items []MCPServer `json:"items"`
	}
	err := c.connection.request(ctx, "GET", "/v1/admin/mcp-servers", nil, nil, &out, "items")
	if err == nil {
		for _, server := range out.Items {
			if !validMCPServer(server, server.Name) {
				return nil, malformed()
			}
		}
	}
	return out.Items, err
}

// GetMCPServer reads one of your MCP servers.
func (c *AdminClient) GetMCPServer(ctx context.Context, name string) (MCPServer, error) {
	var out MCPServer
	if !mcpServerName.MatchString(name) {
		return out, invalid("A server name is 1–31 lowercase letters, digits or _, starting with a letter.")
	}
	err := c.connection.request(ctx, "GET", "/v1/admin/mcp-servers/"+name, nil, nil, &out, "name", "url", "auth")
	if err == nil && !validMCPServer(out, name) {
		err = malformed()
	}
	return out, err
}

// PutMCPServer registers or replaces an MCP server. The Agent can use its tools in Sessions that
// start afterwards; a running Session keeps the tools it started with. The URL must be public https
// on port 443, by host name. The name becomes the prefix of the tools' names.
func (c *AdminClient) PutMCPServer(ctx context.Context, name string, server MCPServerInput) (MCPServer, error) {
	var out MCPServer
	if !mcpServerName.MatchString(name) {
		return out, invalid("A server name is 1–31 lowercase letters, digits or _, starting with a letter.")
	}
	if !strings.HasPrefix(server.URL, "https://") || !validText(server.URL, 2048) {
		return out, invalid("An https URL is required.")
	}
	switch server.Auth.Type {
	case MCPAuthBearer, MCPAuthNone:
		if server.Auth.Header != "" {
			return out, invalid("Auth.Header goes with MCPAuthHeader only.")
		}
	case MCPAuthHeader:
		if !mcpHeaderName.MatchString(server.Auth.Header) {
			return out, invalid("MCPAuthHeader needs a header name.")
		}
	default:
		return out, invalid("Auth.Type is MCPAuthBearer, MCPAuthHeader or MCPAuthNone.")
	}
	if server.Auth.Type == MCPAuthNone && server.Auth.Secret != "" {
		return out, invalid("MCPAuthNone takes no secret.")
	}
	err := c.connection.request(ctx, "PUT", "/v1/admin/mcp-servers/"+name, nil, server, &out, "name", "url", "auth")
	if err == nil && (!validMCPServer(out, name) || out.URL != server.URL || out.Auth.Type != server.Auth.Type) {
		err = malformed()
	}
	return out, err
}

// DeleteMCPServer removes an MCP server: new Sessions don't offer its tools, and a running Session's
// calls to them are refused.
func (c *AdminClient) DeleteMCPServer(ctx context.Context, name string) error {
	if !mcpServerName.MatchString(name) {
		return invalid("A server name is 1–31 lowercase letters, digits or _, starting with a letter.")
	}
	return c.connection.request(ctx, "DELETE", "/v1/admin/mcp-servers/"+name, nil, nil, nil)
}

func validMCPServer(s MCPServer, name string) bool {
	if s.Name != name || s.URL == "" {
		return false
	}
	switch s.Auth.Type {
	case MCPAuthBearer, MCPAuthHeader, MCPAuthNone:
		return true
	}
	return false
}

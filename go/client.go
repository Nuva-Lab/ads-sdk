package nuvaadmin

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

const Version = "v0.1.0-preview.3"
const maxResponseBytes = 2 * 1024 * 1024

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
var namePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,63}$`)
var filePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,99}(/[A-Za-z0-9][A-Za-z0-9._-]{0,99}){0,7}$`)
var hashPattern = regexp.MustCompile(`^[0-9a-f]{64}$`)
var commitPattern = regexp.MustCompile(`^[0-9a-f]{7,64}$`)

type APIError struct {
	StatusCode int
	Code       string
	Message    string
	Retryable  bool
	RequestID  string
	Details    []ErrorDetail
	Acceptance string
	cause      error
}

func (e *APIError) Error() string {
	return fmt.Sprintf("Nuva %s (HTTP %d, request %s): %s", e.Code, e.StatusCode, e.RequestID, e.Message)
}
func (e *APIError) Unwrap() error { return e.cause }
func invalid(message string) error {
	return &APIError{Code: "INVALID_INPUT", Message: message, Acceptance: "not_accepted"}
}

type Option func(*http.Client)

// WithHTTPClient copies the client. Redirects remain disabled to prevent credential forwarding.
func WithHTTPClient(client *http.Client) Option {
	return func(target *http.Client) {
		if client != nil {
			*target = *client
		}
	}
}

type connection struct {
	base   *url.URL
	secret string
	http   *http.Client
}
type AdminClient struct{ connection connection }
type UserClient struct{ connection connection }

func (AdminClient) String() string     { return "Nuva AdminClient (credential redacted)" }
func (c AdminClient) GoString() string { return c.String() }
func (UserClient) String() string      { return "Nuva UserClient (credential redacted)" }
func (c UserClient) GoString() string  { return c.String() }
func newConnection(baseURL, secret string, options []Option) (connection, error) {
	base, err := url.Parse(baseURL)
	if err != nil || base == nil || (base.Scheme != "http" && base.Scheme != "https") || base.Host == "" || base.User != nil || base.RawQuery != "" || base.Fragment != "" {
		return connection{}, invalid("Configure an HTTP(S) backend URL without credentials, query or fragment.")
	}
	if secret == "" || strings.ContainsAny(secret, "\r\n") {
		return connection{}, invalid("A nonempty bearer credential is required.")
	}
	client := &http.Client{Timeout: 30 * time.Second}
	for _, option := range options {
		option(client)
	}
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	base.Path = strings.TrimSuffix(base.Path, "/")
	return connection{base: base, secret: secret, http: client}, nil
}
func NewAdminClient(baseURL, apiKey string, options ...Option) (*AdminClient, error) {
	c, err := newConnection(baseURL, apiKey, options)
	if err != nil {
		return nil, err
	}
	return &AdminClient{connection: c}, nil
}

// NewUserClient never receives or inherits an Admin API key. Supply an issued user token.
func NewUserClient(baseURL, userToken string, options ...Option) (*UserClient, error) {
	c, err := newConnection(baseURL, userToken, options)
	if err != nil {
		return nil, err
	}
	return &UserClient{connection: c}, nil
}
func (c *connection) scrub(value string) string {
	return strings.ReplaceAll(value, c.secret, "[redacted]")
}
func (c *connection) request(ctx context.Context, method, path string, query url.Values, input any, output any, required ...string) error {
	write := method != "GET"
	acceptance := ""
	if write {
		acceptance = "not_accepted"
	}
	if err := ctx.Err(); err != nil {
		return &APIError{Code: "CANCELLED", Message: "Request context ended before dispatch.", Acceptance: acceptance, cause: err}
	}
	var body []byte
	var err error
	if input != nil {
		body, err = json.Marshal(input)
		if err != nil {
			return invalid("Request contains invalid JSON values.")
		}
	}
	target := *c.base
	target.Path = c.base.Path + path
	target.RawQuery = query.Encode()
	req, err := http.NewRequestWithContext(ctx, method, target.String(), bytes.NewReader(body))
	if err != nil {
		return invalid("Cannot construct request.")
	}
	req.Header.Set("Authorization", "Bearer "+c.secret)
	req.Header.Set("Accept", "application/json")
	if input != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if write {
		acceptance = "unknown"
	}
	response, err := c.http.Do(req)
	if err != nil {
		code := "CONNECTION_ERROR"
		cause := ctx.Err()
		if cause != nil {
			code = "CANCELLED"
		}
		return &APIError{Code: code, Message: "Backend request did not complete; inspect state before retrying writes.", Retryable: true, Acceptance: acceptance, cause: cause}
	}
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes+1))
	if err != nil || len(raw) > maxResponseBytes {
		return &APIError{Code: "SERVICE_ERROR", Message: "Backend response was unreadable or too large.", StatusCode: response.StatusCode, Acceptance: acceptance}
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var wire struct {
			Error struct {
				Code      string        `json:"code"`
				Message   string        `json:"message"`
				Retryable *bool         `json:"retryable"`
				Details   []ErrorDetail `json:"details"`
			} `json:"error"`
			RequestID string `json:"request_id"`
		}
		if json.Unmarshal(raw, &wire) != nil || wire.Error.Code == "" || wire.Error.Message == "" || wire.Error.Retryable == nil || wire.RequestID == "" {
			return &APIError{Code: "SERVICE_ERROR", Message: "Malformed backend error response.", StatusCode: response.StatusCode, Acceptance: acceptance}
		}
		if response.StatusCode < 500 && response.StatusCode != 408 {
			acceptance = ""
		}
		details := wire.Error.Details
		for i := range details {
			details[i].Path = c.scrub(details[i].Path)
			details[i].Message = c.scrub(details[i].Message)
		}
		return &APIError{Code: c.scrub(wire.Error.Code), Message: c.scrub(wire.Error.Message), Retryable: *wire.Error.Retryable, RequestID: c.scrub(wire.RequestID), Details: details, StatusCode: response.StatusCode, Acceptance: acceptance}
	}
	var fields map[string]json.RawMessage
	if json.Unmarshal(raw, &fields) != nil {
		return malformed(acceptance)
	}
	for _, key := range required {
		value, ok := fields[key]
		nullable := key == "main" || key == "main_version" || key == "description" || key == "note" || key == "source" || key == "next_cursor"
		if !ok || bytes.Equal(bytes.TrimSpace(value), []byte("null")) && !nullable {
			return malformed(acceptance)
		}
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	if decoder.Decode(output) != nil {
		return malformed(acceptance)
	}
	return nil
}
func malformed(acceptance string) error {
	return &APIError{Code: "SERVICE_ERROR", Message: "Backend returned a malformed or mismatched resource.", Acceptance: acceptance}
}
func validText(s string, max int) bool {
	return utf8.ValidString(s) && utf8.RuneCountInString(s) <= max
}
func (c *AdminClient) IssueUserToken(ctx context.Context, externalUserID string) (TokenResponse, error) {
	var out TokenResponse
	if externalUserID == "" || !validText(externalUserID, 255) || strings.IndexFunc(externalUserID, func(r rune) bool { return r < 32 || r == 127 }) >= 0 {
		return out, invalid("external_user_id must contain 1–255 characters without control characters.")
	}
	err := c.connection.request(ctx, "POST", "/v1/admin/tokens", nil, struct {
		ID string `json:"external_user_id"`
	}{externalUserID}, &out, "access_token", "expires_at", "user")
	if err == nil && (out.AccessToken == "" || out.ExpiresAt.IsZero() || !uuidPattern.MatchString(out.User.ID) || out.User.ExternalUserID != externalUserID) {
		err = malformed("unknown")
	}
	return out, err
}
func validateRegistration(input SkillRegistration) error {
	if _, ok := input.Files["SKILL.md"]; !ok || len(input.Files) > 64 {
		return invalid("Skill files require SKILL.md and at most 64 entries.")
	}
	total := 0
	for path, text := range input.Files {
		if !filePattern.MatchString(path) || !utf8.ValidString(text) || len(text) > 262144 {
			return invalid("Invalid Skill path or file content size.")
		}
		total += len(text)
	}
	if total > 786432 {
		return invalid("Skill files exceed 786432 bytes.")
	}
	attrs, err := json.Marshal(input.Attributes)
	if err != nil || len(attrs) > 65536 {
		return invalid("Skill attributes must be JSON within 65536 bytes.")
	}
	if input.Description != nil && !validText(*input.Description, 1000) || input.Note != nil && !validText(*input.Note, 2000) {
		return invalid("Skill description or note is too long.")
	}
	if source := input.Source; source != nil {
		if source.Repo == "" || !validText(source.Repo, 300) || !commitPattern.MatchString(source.Commit) || source.Path != nil && !validText(*source.Path, 300) {
			return invalid("Invalid Skill source provenance.")
		}
	}
	return nil
}
func validateSkill(s Skill) bool {
	return uuidPattern.MatchString(s.ID) && namePattern.MatchString(s.Name) && !s.CreatedAt.IsZero() && (s.MainVersion == nil || *s.MainVersion > 0)
}
func validateVersion(v SkillVersion) bool {
	if !uuidPattern.MatchString(v.ID) || !uuidPattern.MatchString(v.SkillID) || v.Version < 1 || v.CreatedAt.IsZero() || v.DownloadURLExpiresAt.IsZero() || v.Files == nil || v.Attributes == nil {
		return false
	}
	for _, f := range v.Files {
		if !filePattern.MatchString(f.Path) || f.Bytes < 0 || !hashPattern.MatchString(f.SHA256) || f.DownloadURL == "" {
			return false
		}
	}
	return true
}
func (c *AdminClient) RegisterSkill(ctx context.Context, name string, input SkillRegistration) (RegisteredSkill, error) {
	var out RegisteredSkill
	if !namePattern.MatchString(name) {
		return out, invalid("Invalid Skill name.")
	}
	if err := validateRegistration(input); err != nil {
		return out, err
	}
	err := c.connection.request(ctx, "PUT", "/v1/admin/skills/"+name, nil, input, &out, "skill", "version")
	if err == nil && (!validateSkill(out.Skill) || !validateVersion(out.Version) || out.Skill.Name != name || out.Version.SkillID != out.Skill.ID) {
		err = malformed("unknown")
	}
	return out, err
}
func (c *AdminClient) SetSkillMain(ctx context.Context, name string, version int) (Skill, error) {
	var out Skill
	if !namePattern.MatchString(name) || version < 1 {
		return out, invalid("Skill name and positive version required.")
	}
	err := c.connection.request(ctx, "PUT", "/v1/admin/skills/"+name+"/main", nil, struct {
		Version int `json:"version"`
	}{version}, &out, "id", "name", "platform", "main_version", "created_at")
	if err == nil && (!validateSkill(out) || out.Name != name || out.MainVersion == nil || *out.MainVersion != version) {
		err = malformed("unknown")
	}
	return out, err
}
func (c *UserClient) GetSkill(ctx context.Context, id string) (SkillDetail, error) {
	var out SkillDetail
	if !uuidPattern.MatchString(id) {
		return out, invalid("Skill UUID required.")
	}
	err := c.connection.request(ctx, "GET", "/v1/skills/"+id, nil, nil, &out, "id", "name", "platform", "main_version", "created_at", "main")
	if err == nil && (!validateSkill(out.Skill) || out.ID != id || ((out.Main == nil) != (out.MainVersion == nil)) || out.Main != nil && (!validateVersion(*out.Main) || out.Main.SkillID != id || out.MainVersion == nil || out.Main.Version != *out.MainVersion)) {
		err = malformed("")
	}
	return out, err
}
func (c *UserClient) GetSkillVersion(ctx context.Context, id string, version int) (SkillVersion, error) {
	var out SkillVersion
	if !uuidPattern.MatchString(id) || version < 1 {
		return out, invalid("Skill UUID and positive version required.")
	}
	err := c.connection.request(ctx, "GET", "/v1/skills/"+id+"/versions/"+strconv.Itoa(version), nil, nil, &out, "id", "skill_id", "version", "description", "note", "source", "attributes", "files", "download_url_expires_at", "created_at")
	if err == nil && (!validateVersion(out) || out.SkillID != id || out.Version != version) {
		err = malformed("")
	}
	return out, err
}
func (c *UserClient) ListSkills(ctx context.Context, options ListOptions) (SkillPage, error) {
	var out SkillPage
	query := url.Values{}
	if options.Limit != 0 {
		if options.Limit < 1 || options.Limit > 100 {
			return out, invalid("Limit must be 1–100.")
		}
		query.Set("limit", strconv.Itoa(options.Limit))
	}
	if options.Cursor != nil {
		query.Set("cursor", *options.Cursor)
	}
	err := c.connection.request(ctx, "GET", "/v1/skills", query, nil, &out, "items", "next_cursor")
	if err == nil {
		if out.Items == nil {
			err = malformed("")
		} else {
			for _, item := range out.Items {
				if !validateSkill(item) {
					err = malformed("")
					break
				}
			}
		}
	}
	return out, err
}

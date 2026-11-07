package nuvaadmin

import (
	"context"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Scope kinds: an org hangs from the customer, a group from an org.
const (
	ScopeOrg   = "org"
	ScopeGroup = "group"
)

// Membership roles. Every user is also a member of the customer without a row.
const (
	// RoleMember reads what is shared with the scope.
	RoleMember = "member"
	// RoleAdmin reads, writes, deletes and shares what users below the scope own.
	RoleAdmin = "admin"
	// RoleViewer reads what users below the scope own, and changes nothing of theirs.
	RoleViewer = "viewer"
)

// Share access: read (see and use) or write (also edit).
const (
	AccessRead  = "read"
	AccessWrite = "write"
)

// CustomerScope names the customer's root scope in memberships and shares.
const CustomerScope = "customer"

// ScopeInput creates or updates a scope. A group names its org as Parent.
type ScopeInput struct {
	Kind   string  `json:"kind"`
	Parent *string `json:"parent,omitempty"`
	Name   *string `json:"name,omitempty"`
}

type Scope struct {
	ID         string `json:"id"`
	ExternalID string `json:"external_id"`
	Kind       string `json:"kind"`
	// Parent is the parent's external ID, or "customer" for an org.
	Parent    string    `json:"parent"`
	Name      *string   `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}
type ScopePage struct {
	Items      []Scope `json:"items"`
	NextCursor *string `json:"next_cursor"`
}
type Membership struct {
	// Scope is "customer" or a scope's external ID.
	Scope string `json:"scope"`
	Role  string `json:"role"`
}
type UserMemberships struct {
	UserID         string       `json:"user_id"`
	ExternalUserID string       `json:"external_user_id"`
	Memberships    []Membership `json:"memberships"`
}

// ItemRef names a shareable item: a brand, product, character, asset, script, storyboard,
// directing_plan or prompt, by its ID.
type ItemRef struct {
	Kind string
	ID   string
}
type Share struct {
	Kind      string    `json:"kind"`
	ID        string    `json:"id"`
	Scope     string    `json:"scope"`
	Access    string    `json:"access"`
	CreatedAt time.Time `json:"created_at"`
}

var shareableKinds = map[string]bool{"brand": true, "product": true, "character": true, "asset": true, "script": true, "storyboard": true, "directing_plan": true, "prompt": true}

// A scope or user external ID: 1–255 characters without control characters or "/".
func validExternalID(id string) bool {
	return id != "" && validText(id, 255) && strings.IndexFunc(id, func(r rune) bool { return r < 32 || r == 127 || r == '/' }) < 0
}
func validScope(s Scope) bool {
	return uuidPattern.MatchString(s.ID) && validExternalID(s.ExternalID) && (s.Kind == ScopeOrg || s.Kind == ScopeGroup) && s.Parent != "" && !s.CreatedAt.IsZero()
}
func validRole(role string) bool {
	return role == RoleMember || role == RoleAdmin || role == RoleViewer
}
func validShare(s Share, item ItemRef) bool {
	return s.Kind == item.Kind && s.ID == item.ID && s.Scope != "" && (s.Access == AccessRead || s.Access == AccessWrite) && !s.CreatedAt.IsZero()
}
func itemPath(item ItemRef) (string, error) {
	if !shareableKinds[item.Kind] || !uuidPattern.MatchString(item.ID) {
		return "", invalid("A shareable item kind and UUID are required.")
	}
	return "/v1/shares/" + item.Kind + "/" + item.ID, nil
}

// PutScope creates the scope, or updates its name or parent. It is idempotent.
func (c *AdminClient) PutScope(ctx context.Context, externalID string, input ScopeInput) (Scope, error) {
	var out Scope
	if !validExternalID(externalID) || externalID == CustomerScope {
		return out, invalid("A scope external ID must have 1–255 characters, no control characters or '/', and not be \"customer\".")
	}
	if input.Kind != ScopeOrg && input.Kind != ScopeGroup || input.Parent != nil && !validExternalID(*input.Parent) || input.Name != nil && !validText(*input.Name, 200) {
		return out, invalid("Scope kind must be org or group, with a valid parent and a name of at most 200 characters.")
	}
	err := c.connection.request(ctx, "PUT", "/v1/admin/scopes/"+externalID, nil, input, &out, "id", "external_id", "kind", "parent", "created_at")
	if err == nil && (!validScope(out) || out.ExternalID != externalID || out.Kind != input.Kind) {
		err = malformed("unknown")
	}
	return out, err
}

// ListScopes pages through the customer's scopes.
func (c *AdminClient) ListScopes(ctx context.Context, options ListOptions) (ScopePage, error) {
	var out ScopePage
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
	err := c.connection.request(ctx, "GET", "/v1/admin/scopes", query, nil, &out, "items", "next_cursor")
	if err == nil {
		if out.Items == nil {
			err = malformed("")
		}
		for _, item := range out.Items {
			if err == nil && !validScope(item) {
				err = malformed("")
			}
		}
	}
	return out, err
}

// ArchiveScope archives the scope: its memberships and shares stop counting. An org with groups
// is refused (409 SCOPE_HAS_CHILDREN); archive its groups first.
func (c *AdminClient) ArchiveScope(ctx context.Context, externalID string) error {
	if !validExternalID(externalID) || externalID == CustomerScope {
		return invalid("A scope external ID other than \"customer\" is required.")
	}
	return c.connection.request(ctx, "DELETE", "/v1/admin/scopes/"+externalID, nil, nil, nil)
}

// SetMemberships replaces the user's memberships; it takes effect at once. Membership{Scope:
// "customer", Role: RoleAdmin} makes a customer admin. The first call for an ID creates the user,
// as a first token does.
func (c *AdminClient) SetMemberships(ctx context.Context, externalUserID string, memberships []Membership) (UserMemberships, error) {
	var out UserMemberships
	if !validExternalID(externalUserID) {
		return out, invalid("external_user_id must contain 1–255 characters without control characters or '/'.")
	}
	if memberships == nil {
		memberships = []Membership{}
	}
	if len(memberships) > 100 {
		return out, invalid("At most 100 memberships.")
	}
	for _, m := range memberships {
		if !validExternalID(m.Scope) || !validRole(m.Role) {
			return out, invalid("Each membership needs a scope and the role member, admin or viewer.")
		}
	}
	err := c.connection.request(ctx, "PUT", "/v1/admin/users/"+externalUserID+"/memberships", nil, struct {
		Memberships []Membership `json:"memberships"`
	}{memberships}, &out, "user_id", "external_user_id", "memberships")
	if err == nil && !validMemberships(out, externalUserID) {
		err = malformed("unknown")
	}
	return out, err
}

// GetMemberships reads the user's memberships; NOT_FOUND for an ID with no user yet.
func (c *AdminClient) GetMemberships(ctx context.Context, externalUserID string) (UserMemberships, error) {
	var out UserMemberships
	if !validExternalID(externalUserID) {
		return out, invalid("external_user_id must contain 1–255 characters without control characters or '/'.")
	}
	err := c.connection.request(ctx, "GET", "/v1/admin/users/"+externalUserID+"/memberships", nil, nil, &out, "user_id", "external_user_id", "memberships")
	if err == nil && !validMemberships(out, externalUserID) {
		err = malformed("")
	}
	return out, err
}
func validMemberships(m UserMemberships, externalUserID string) bool {
	if !uuidPattern.MatchString(m.UserID) || m.ExternalUserID != externalUserID || m.Memberships == nil {
		return false
	}
	for _, item := range m.Memberships {
		if item.Scope == "" || !validRole(item.Role) {
			return false
		}
	}
	return true
}

// ListShares lists the item's shares. The customer's API key reads any of its items' shares.
func (c *AdminClient) ListShares(ctx context.Context, item ItemRef) ([]Share, error) {
	path, err := itemPath(item)
	if err != nil {
		return nil, err
	}
	var out struct {
		Items []Share `json:"items"`
	}
	err = c.connection.request(ctx, "GET", path, nil, nil, &out, "items")
	if err == nil {
		if out.Items == nil {
			err = malformed("")
		}
		for _, share := range out.Items {
			if err == nil && !validShare(share, item) {
				err = malformed("")
			}
		}
	}
	return out.Items, err
}

// SetShare shares the item with everyone at or below the scope ("customer" or a scope's
// external ID). It is idempotent; a repeat changes the access.
func (c *AdminClient) SetShare(ctx context.Context, item ItemRef, scope string, access string) (Share, error) {
	var out Share
	path, err := itemPath(item)
	if err != nil {
		return out, err
	}
	if !validExternalID(scope) || access != AccessRead && access != AccessWrite {
		return out, invalid("A scope and the access read or write are required.")
	}
	err = c.connection.request(ctx, "PUT", path+"/"+scope, nil, struct {
		Access string `json:"access"`
	}{access}, &out, "kind", "id", "scope", "access", "created_at")
	if err == nil && (!validShare(out, item) || out.Scope != scope || out.Access != access) {
		err = malformed("unknown")
	}
	return out, err
}

// RemoveShare removes the item's share with the scope; it succeeds when there was none.
func (c *AdminClient) RemoveShare(ctx context.Context, item ItemRef, scope string) error {
	path, err := itemPath(item)
	if err != nil {
		return err
	}
	if !validExternalID(scope) {
		return invalid("A scope is required.")
	}
	return c.connection.request(ctx, "DELETE", path+"/"+scope, nil, nil, nil)
}

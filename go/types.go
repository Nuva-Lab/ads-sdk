// Package nuvaadmin provides server-side Admin APIs and a separate user-token
// Skill reader. Backend schema source: 20c6fd9bf15f2f7dd335e0e192b58fd3ccc46d5d.
package nuvaadmin

import "time"

type TokenUser struct {
	ID             string `json:"id"`
	ExternalUserID string `json:"external_user_id"`
}
type TokenResponse struct {
	AccessToken string    `json:"access_token"`
	TokenType   string    `json:"token_type"`
	ExpiresAt   time.Time `json:"expires_at"`
	User        TokenUser `json:"user"`
}
type SkillSource struct {
	Repo   string  `json:"repo"`
	Commit string  `json:"commit"`
	Path   *string `json:"path,omitempty"`
}
type SkillRegistration struct {
	Files       map[string]string `json:"files"`
	Attributes  map[string]any    `json:"attributes,omitempty"`
	Description *string           `json:"description,omitempty"`
	Note        *string           `json:"note,omitempty"`
	Source      *SkillSource      `json:"source,omitempty"`
}
type Skill struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Platform    bool      `json:"platform"`
	MainVersion *int      `json:"main_version"`
	CreatedAt   time.Time `json:"created_at"`
}
type SkillFile struct {
	Path        string `json:"path"`
	Bytes       int64  `json:"bytes"`
	SHA256      string `json:"sha256"`
	DownloadURL string `json:"download_url"`
}
type SkillVersion struct {
	ID                   string         `json:"id"`
	SkillID              string         `json:"skill_id"`
	Version              int            `json:"version"`
	Description          *string        `json:"description"`
	Note                 *string        `json:"note"`
	Source               *SkillSource   `json:"source"`
	Attributes           map[string]any `json:"attributes"`
	Files                []SkillFile    `json:"files"`
	DownloadURLExpiresAt time.Time      `json:"download_url_expires_at"`
	CreatedAt            time.Time      `json:"created_at"`
}
type RegisteredSkill struct {
	Skill   Skill        `json:"skill"`
	Version SkillVersion `json:"version"`
}
type SkillDetail struct {
	Skill
	Main *SkillVersion `json:"main"`
}
type SkillPage struct {
	Items      []Skill `json:"items"`
	NextCursor *string `json:"next_cursor"`
}
type ListOptions struct {
	Limit  int
	Cursor *string
}
type ErrorDetail struct {
	Path    string `json:"path"`
	Message string `json:"message"`
}

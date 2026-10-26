// Package sdkexample demonstrates the real Nuva Go Admin client.
package sdkexample

import (
	"context"
	nuva "github.com/Nuva-Lab/ads-sdk/go"
	"time"
)

type BrowserCredential struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

// IssueForLoggedInUser is called only after the customer verifies its login.
func IssueForLoggedInUser(ctx context.Context, admin *nuva.AdminClient, authenticatedExternalUserID string) (BrowserCredential, error) {
	grant, err := admin.IssueUserToken(ctx, authenticatedExternalUserID)
	if err != nil {
		return BrowserCredential{}, err
	}
	return BrowserCredential{Token: grant.AccessToken, ExpiresAt: grant.ExpiresAt}, nil
}

// RegisterUIBehavior declares a text Skill plus a response-free host action.
// This stores a definition; customer frontend code implements the UI action.
func RegisterUIBehavior(ctx context.Context, admin *nuva.AdminClient, skillText string) (nuva.RegisteredSkill, error) {
	return admin.RegisterSkill(ctx, "editor-guidance", nuva.SkillRegistration{
		Files: map[string]string{"SKILL.md": skillText},
		Attributes: map[string]any{"hostCalls": []any{
			map[string]any{
				"name": "open_editor", "publicName": "workspace.openEditor",
				"description": "Open the editor for an authorized Asset.",
				"inputSchema": map[string]any{"type": "object", "properties": map[string]any{"assetId": map[string]any{"type": "string"}}, "required": []string{"assetId"}, "additionalProperties": false},
			},
		}},
	})
}

func ActivateWithBackendAuthority(ctx context.Context, admin *nuva.AdminClient, name string, version int) (nuva.Skill, error) {
	return admin.SetSkillMain(ctx, name, version)
}

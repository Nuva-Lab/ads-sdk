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

func ActivateWithBackendAuthority(ctx context.Context, admin *nuva.AdminClient, name string, version int) (nuva.Skill, error) {
	return admin.SetSkillMain(ctx, name, version)
}

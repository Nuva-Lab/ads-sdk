package sdkexample

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"

	nuva "github.com/Nuva-Lab/ads-sdk/go"
)

// #region admin-client
func NewAdsAdmin() (*nuva.AdminClient, error) {
	return nuva.NewAdminClient(
		"https://api-staging.nuvalab.ai",
		os.Getenv("NUVA_CUSTOMER_API_KEY"),
	)
}

// #endregion admin-client

// #region token-handler
func AdsTokenHandler(
	admin *nuva.AdminClient,
	userID func(*http.Request) (string, bool),
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		id, authenticated := userID(r)
		if !authenticated {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		grant, err := admin.IssueUserToken(r.Context(), id)
		if err != nil {
			http.Error(w, "Unable to issue token", http.StatusBadGateway)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		json.NewEncoder(w).Encode(struct {
			Token     string    `json:"token"`
			ExpiresAt time.Time `json:"expiresAt"`
		}{grant.AccessToken, grant.ExpiresAt})
	}
}

// #endregion token-handler

// #region register-skill
func RegisterProductSkill(
	ctx context.Context, admin *nuva.AdminClient,
) (nuva.RegisteredSkill, error) {
	return admin.RegisterSkill(ctx, "product-writer", nuva.SkillRegistration{
		Files: map[string]string{
			"SKILL.md":            "# Product writer\nUse the saved product facts.",
			"references/style.md": "Keep product claims specific and verifiable.",
		},
		Attributes: map[string]any{
			"preload": []string{"references/style.md"},
		},
	})
}

// #endregion register-skill

// #region activate-skill
func ActivateProductSkill(
	ctx context.Context, admin *nuva.AdminClient, version int,
) (nuva.Skill, error) {
	return admin.SetSkillMain(ctx, "product-writer", version)
}

// #endregion activate-skill

// #region read-skill
func ReadSkillVersion(
	ctx context.Context,
	backendURL, userToken, skillID string,
	version int,
) (nuva.SkillVersion, error) {
	reader, err := nuva.NewUserClient(backendURL, userToken)
	if err != nil {
		return nuva.SkillVersion{}, err
	}
	return reader.GetSkillVersion(ctx, skillID, version)
}

// #endregion read-skill

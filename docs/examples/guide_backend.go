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
func NewAdsAdmin(apiURL string) (*nuva.AdminClient, error) {
	return nuva.NewAdminClient(
		apiURL,
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

// #region permissions
// SetUpAgency puts a lead and a maker into one agency, and shares a Product with the maker's team.
func SetUpAgency(ctx context.Context, admin *nuva.AdminClient, productID string) error {
	if _, err := admin.PutScope(ctx, "agency-a", nuva.ScopeInput{Kind: nuva.ScopeOrg}); err != nil {
		return err
	}
	org := "agency-a"
	if _, err := admin.PutScope(ctx, "team-1", nuva.ScopeInput{Kind: nuva.ScopeGroup, Parent: &org}); err != nil {
		return err
	}
	// Replaces each user's memberships. The lead administers everyone in agency-a.
	if _, err := admin.SetMemberships(ctx, "lead@example.com", []nuva.Membership{{Scope: "agency-a", Role: nuva.RoleAdmin}}); err != nil {
		return err
	}
	if _, err := admin.SetMemberships(ctx, "maker@example.com", []nuva.Membership{{Scope: "team-1", Role: nuva.RoleMember}}); err != nil {
		return err
	}
	// Everyone in team-1 may now read the Product and use it in their own content.
	_, err := admin.SetShare(ctx, nuva.ItemRef{Kind: "product", ID: productID}, "team-1", nuva.AccessRead)
	return err
}

// #endregion permissions

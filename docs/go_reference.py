"""Customer reference for the standalone Go Admin SDK preview."""


def go_sections(code, table):
    initialize = '''admin, err := nuva.NewAdminClient(
    backendURL,
    os.Getenv("NUVA_CUSTOMER_API_KEY"),
)
if err != nil { return err }'''
    token = '''// authenticatedUser.ID comes from your verified login session.
grant, err := admin.IssueUserToken(ctx, authenticatedUser.ID)
if err != nil { return err }

// Return this only to the same authenticated user's browser.
response := struct {
    Token string `json:"token"`
    ExpiresAt time.Time `json:"expiresAt"`
}{grant.AccessToken, grant.ExpiresAt}'''
    register = '''skill, err := admin.RegisterSkill(ctx, "product-writer", nuva.SkillRegistration{
    Files: map[string]string{
        "SKILL.md": "# Product writer\\nPreserve supplied product facts.",
        "references/style.md": "Use concise, factual product descriptions.",
    },
    Attributes: map[string]any{"preload": []string{"references/style.md"}},
})
if err != nil { return err }
// Skill.ID is the continuing definition; Version.ID is this exact version.'''
    activate = '''// Your backend's policy authorizes activation; this is not a chat tool.
main, err := admin.SetSkillMain(ctx, "product-writer", skill.Version.Version)
if err != nil { return err }
_ = main'''
    read = '''reader, err := nuva.NewUserClient(backendURL, grant.AccessToken)
if err != nil { return err }
version, err := reader.GetSkillVersion(ctx, skill.Skill.ID, skill.Version.Version)
if err != nil { return err }
_ = version'''
    return [
        ('overview', 'Backend integration', '<p>Use the Go Admin SDK on your backend to issue user tokens and manage Skills. It requires Go 1.22+ and uses the Go standard library.</p>'
         '<ol><li>Your backend verifies the application login.</li><li>It exchanges its customer Admin API key for that user’s Nuva token.</li><li>It returns token/expiry to the browser SDK and separately manages Skill registration and activation.</li></ol>'
         '<p>Keep the Admin API key on your backend. Return an issued user token only to the matching authenticated user.</p>'),
        ('client', 'Initialize the Admin client', code('GOPRIVATE=github.com/Nuva-Lab/ads-sdk go get github.com/Nuva-Lab/ads-sdk/go@v0.1.0-preview.1', 'sh') + code(initialize, 'go') + table(['Argument', 'Purpose'], [
            ('<code>backendURL</code>', 'The service URL for your environment.'), ('<code>apiKey</code>', 'Customer-backend Admin API key.')])
         + '<p>Use context cancellation and deadlines. The client does not automatically follow redirects or replay uncertain writes. Import the module with the <code>nuva</code> alias shown in the downloadable example.</p>'),
        ('tokens', 'Issue a user token', code(token, 'go')
         + '<p><code>POST /v1/admin/tokens {external_user_id}</code> returns access_token, expires_at and the real Nuva user identity. User tokens expire after one hour; use the returned expiry. Only verified application identity may choose the external user ID; arbitrary browser permission claims are not accepted.</p>'
         + '<p>The TypeScript SDK renews <code>{token,expiresAt,principal?}</code> results using your callback. Go JSON encodes time.Time as an accepted ISO datetime. This Go reader does not automatically renew; create a reader with a newly issued token for the same user as needed.</p>'),
        ('skills', 'Register and activate a Skill', code(register, 'go')
         + '<p>Files are UTF-8 text and must include SKILL.md. Paths, counts and byte limits are validated. The selected writer always loads SKILL.md and preloads each file in <code>attributes.preload</code>; that attribute is a list of paths, not a boolean. Other verified files remain available on demand. Missing declared files fail before inference.</p>'
         + code(activate, 'go') + '<p>The first version becomes main; subsequent registration does not switch it. Artifact data.skill uses the exact Version.ID. Registration is text/data storage, not execution of customer workflow code. Background learning may propose changes, but publication and activation remain your authorized backend’s responsibility.</p>'),
        ('reads', 'Read within user scope', code(read, 'go') + '<p>ListSkills, GetSkill and GetSkillVersion use a user token. Admin keys are not forwarded to ordinary resource routes. Returned manifests include hashes, expiring file URLs, nullable metadata and the exact selected version.</p>'),
        ('errors', 'Handle errors', '<p>Use errors.As to inspect APIError: StatusCode, Code, Message, RequestID, Details and Acceptance. Unknown acceptance after a write timeout requires recovery or inspection; it does not authorize blind replay.</p>'
         '<div class="downloads"><a href="examples/backend_client.go">Go integration example</a></div>'),
    ]

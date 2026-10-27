# Customer-backend learning publisher

This example connects private creation-watcher candidates to the real Go Admin API client. It runs in a customer backend or its scheduled worker, never in the browser or conversational Agent.

`Publisher.Read` is an authenticated private-source adapter. `Prepare` is customer-owned policy: it checks the target Skill and provenance, loads the current source files and constructs the complete next version. The example never treats a watcher suggestion as permission to overwrite all existing Skill files.

`Publication.Activate` controls whether to call `SetSkillMain` after registration. Setting it to `false` skips that call, but the first version of a new Skill still becomes `main` during registration. If your policy requires an inactive publication, `Prepare` must reject creation of a new Skill and allow only a new version of an existing Skill.

```text
Private watcher candidate
  → trusted customer policy + complete Skill source
  → AdminClient.RegisterSkill
  → optional AdminClient.SetSkillMain
```

`Result.Activated` reports whether the registered version is `main` in the last successful API response. It can be `true` without an explicit activation call. After a successful `SetSkillMain`, `Result.Registered.Skill` reflects that response while `Result.Registered.Version` retains the saved version.

If activation fails, the result preserves the registration receipt and its last confirmed main status. Inspect state before retrying an activation whose write acceptance is unknown; the failed request may have changed `main`. The host must persist its work/receipt as appropriate; this small integration example is not a scheduler or a durable customer job queue. Serialize activation for a given Skill when multiple publishers may update it. Supply your own source adapter and publication policy.

The HTTP fixture tests cover source text preservation, Admin-only authentication, registration before activation, first-registration main selection, an existing non-main version, activation failure, tenant mismatch and policy rejection before network dispatch. Run `GOTOOLCHAIN=local go test -race ./examples/learning` from the repository's `go/` directory. This can run automatically under the customer's policy; no Agent tool gets the Admin key or main-switch permission.

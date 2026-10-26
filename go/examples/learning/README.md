# Customer-backend learning publisher

This example connects private creation-watcher candidates to the real Go Admin API client. It runs in a customer backend or its scheduled worker, never in the browser or conversational Agent.

`Publisher.Read` is an authenticated private-source adapter. `Prepare` is customer-owned policy: it checks the target Skill and provenance, loads the current source files and constructs the complete next version. It explicitly chooses whether this publication may move `main`. The example never treats a watcher suggestion as permission to overwrite all existing Skill files.

```text
Private watcher candidate
  → trusted customer policy + complete Skill source
  → AdminClient.RegisterSkill
  → optional AdminClient.SetSkillMain
```

The HTTP fixture test verifies source text preservation, Admin-only authentication, registration before activation, tenant mismatch and policy rejection before network dispatch. This can run automatically under the customer's policy; no Agent tool gets the Admin key or main-switch permission.

If activation fails, `Result.Registered` preserves the saved version so the host can retry activation directly. The host must persist its work/receipt as appropriate; this small integration example is not a scheduler or a durable customer job queue. The observed backend has no compare-and-swap main-version precondition, so concurrent activation policy still needs coordination. No external candidate endpoint or production publication is configured by this example.

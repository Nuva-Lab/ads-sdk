# SDK documentation guide

Authoring guidance for the customer reference built from this directory (`sdk/docs`). `build_customer.py` and the `*_reference.py` modules generate the pages; code samples come from `examples/`. This file is not part of the customer bundle: `build_customer.py` publishes only its explicit file list.

API meaning comes from the SDK source and its exported declarations. When this guide and the code disagree, the code wins.

## Audience and language

- Write customer pages in Chinese, with an English version of every page, for developers who have not read our design discussion.
- Explain purpose, methods, inputs, results, useful errors and concrete examples. Keep review replies, internal ownership debates and abandoned proposals out of customer copy.
- Use short, plain sentences. Put a constraint beside the method it affects instead of repeating it across the page.
- Use **Client SDK** for the single TypeScript package and **Go Admin SDK** for the separate backend module. Client Agent and Client Store are documentation sections, not separate npm packages.
- Use this preview notice: **本预览版本供接口评估与集成规划使用。API 和数据结构可能在正式发布前调整。**

## Examples and contracts

- Check TypeScript examples against the actual SDK and protocol (`pnpm typecheck`). Do not maintain a second declaration file just for documentation.
- Use focused React examples for Agent interactions and plain TypeScript for Store operations. Show relevant state/effects or handlers without building a complete page around each method.
- Authentication is an application-provided token function. Do not invent a customer login endpoint.
- Normal customer TypeScript setup is `createNuva({getAccessToken})`, using the SDK's environment defaults. Show URL overrides only for local development and testing. Never invent a host.
- Keep runtime setup, SDK installation and documentation builds separate. Compilation checks types; it does not prove service behavior or package publication.
- Show actual client-visible fields and errors. Keep captions, fixture metadata and private telemetry out of sample public DTOs.
- The Ads Agent declares no client tools or host calls. Document `respond`, `fail`, `onClientTool`, `onHostCall`, `listPendingCalls` and `getHostCall` in the API reference, and say they do not fire. Do not show approval interactions or Skill `attributes.hostCalls` examples; `hostCalls` is currently ignored.
- Show the implemented Go module interfaces. Label unresolved schemas and unsupported methods explicitly. A preview label does not permit silently changing saved data meaning.

## Layout and verification

- Lead with integration and Agent interaction; put detailed references later. Use parallel sidebar entries for Client Agent, Client Store and Go Admin.
- Preserve current page styling and useful examples/downloads. Let long types wrap without splitting identifiers across characters.
- Keep examples beside the behavior they demonstrate. Do not introduce a table with a paragraph that repeats it.
- Rebuild generated pages from their sources (`pnpm build`, then `pnpm check`); generated HTML and ZIPs stay git-ignored. Do not hand-edit `customer/`. Check affected links, examples and the file allowlist.
- Keep customer publication separate from internal design and dev tools. Publication is a separate action; building does not deploy.
- Do not restore retired review pages, diagram builders or tutorial-specific sections merely to preserve old presentation instructions.

Customer workflow instructions belong in Skills or customer-owned integration code. Do not publish a separate workflow registration, catalogue or run API. Explain direct Script generation as a standalone Script Writer with the default Skill, and in-Session Script writing as Session-Agent authorship using the loaded Skill and the full conversation. Only Script schema/validation and authorized persistence are common; do not change Prompt/Video by analogy.

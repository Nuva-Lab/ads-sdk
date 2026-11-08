// Generated from ads_backend/openapi.json at pending. Do not edit.
export interface paths {
    "/v1/admin/tokens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Issue a user token
         * @description For your backend, with your API key: a token that acts as the user with `external_user_id`, valid for an hour. The first token for an id creates the user.
         */
        post: operations["issue_user_token_v1_admin_tokens_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/assets/uploads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Start an upload
         * @description Returns a URL to PUT the file to and a token to register it with POST /v1/assets once the PUT succeeds. Both expire after an hour.
         */
        post: operations["start_upload_v1_assets_uploads_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/assets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Register an asset from an upload or a URL
         * @description Returns 201 with a new asset, or 200 with your existing asset when you registered the same file, with the same MIME type, before. A different label or description for a file you already have is 409 ASSET_EXISTS: change them with PATCH /v1/assets/{asset_id}.
         */
        post: operations["create_asset_v1_assets_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/assets/{asset_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an asset you uploaded or generated, or one a shared Product or Character uses
         * @description Returns 404 for other users' assets that no Brand, Product or Character refers to, as for missing ones.
         */
        get: operations["get_asset_v1_assets__asset_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Edit an asset's label and description
         * @description Changes the fields the body sends and keeps the rest; null removes a value. The file itself never changes. Only the user who uploaded it, or an admin above them, edits it.
         */
        patch: operations["update_asset_v1_assets__asset_id__patch"];
        trace?: never;
    };
    "/v1/brands": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List brands
         * @description Current versions, newest first.
         */
        get: operations["list_brands_v1_brands_get"];
        put?: never;
        /**
         * Create a brand
         * @description Saves a new brand as version 1.
         */
        post: operations["create_brand_v1_brands_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/brands/{brand_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a brand
         * @description The current version, or the given one.
         */
        get: operations["get_brand_v1_brands__brand_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Edit a brand
         * @description Changes the fields `data` sends and keeps the rest, saving the next version. `version` must be the current one; otherwise 409 REVISION_CONFLICT. An edit that changes nothing returns the current version without adding one. A repeated Idempotency-Key with the same input returns the version it saved, even after later edits (but 404 once it is deleted).
         */
        patch: operations["update_brand_v1_brands__brand_id__patch"];
        trace?: never;
    };
    "/v1/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List products
         * @description Current versions, newest first; `brand_id` keeps those that belong to it.
         */
        get: operations["list_products_v1_products_get"];
        put?: never;
        /**
         * Create a product
         * @description Saves a new product as version 1.
         */
        post: operations["create_product_v1_products_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/products/{product_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a product
         * @description The current version, or the given one.
         */
        get: operations["get_product_v1_products__product_id__get"];
        put?: never;
        post?: never;
        /**
         * Delete a product
         * @description Deletes the product for every user of the customer: it is no longer listed, no version of it can be read, edited or used in new content, and its assets are no longer shared through it. What was already made from it is kept but can't be revised; saved Prompts still start Jobs. Deleting it again also returns 204.
         */
        delete: operations["delete_product_v1_products__product_id__delete"];
        options?: never;
        head?: never;
        /**
         * Edit a product
         * @description Changes the fields `data` sends and keeps the rest, saving the next version. `version` must be the current one; otherwise 409 REVISION_CONFLICT. An edit that changes nothing returns the current version without adding one. A repeated Idempotency-Key with the same input returns the version it saved, even after later edits (but 404 once it is deleted).
         */
        patch: operations["update_product_v1_products__product_id__patch"];
        trace?: never;
    };
    "/v1/characters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List characters
         * @description Current versions, newest first.
         */
        get: operations["list_characters_v1_characters_get"];
        put?: never;
        /**
         * Create a character
         * @description Saves a new character as version 1.
         */
        post: operations["create_character_v1_characters_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/characters/{character_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a character
         * @description The current version, or the given one.
         */
        get: operations["get_character_v1_characters__character_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Edit a character
         * @description Changes the fields `data` sends and keeps the rest, saving the next version. `version` must be the current one; otherwise 409 REVISION_CONFLICT. An edit that changes nothing returns the current version without adding one. A repeated Idempotency-Key with the same input returns the version it saved, even after later edits (but 404 once it is deleted).
         */
        patch: operations["update_character_v1_characters__character_id__patch"];
        trace?: never;
    };
    "/v1/batches": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List batches
         * @description Newest first.
         */
        get: operations["list_batches_v1_batches_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/batches/{batch_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a batch, its Ads and Job counts
         * @description The Batch, its Ads oldest first, and how many of its Jobs are in each status.
         */
        get: operations["get_batch_v1_batches__batch_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/artifacts/script/{artifact_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a script
         * @description This version, by its id. A version never changes.
         */
        get: operations["get_script_v1_artifacts_script__artifact_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/artifacts/storyboard/{artifact_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a storyboard
         * @description This version, by its id. A version never changes.
         */
        get: operations["get_storyboard_v1_artifacts_storyboard__artifact_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/artifacts/directing_plan/{artifact_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a directing_plan
         * @description This version, by its id. A version never changes.
         */
        get: operations["get_directing_plan_v1_artifacts_directing_plan__artifact_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/artifacts/prompt/{artifact_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a prompt
         * @description This version, by its id. A version never changes.
         */
        get: operations["get_prompt_v1_artifacts_prompt__artifact_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/artifacts/prompt/{artifact_id}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Save a new version of a prompt
         * @description Based on the given version, which need not be the latest: versions form a tree. Omitted `batch_id` and `relationships` inherit the base; explicit [] clears relationships. Script, Storyboard and directing plan versions are the Agent's (a user token gets 403); a user may version a Prompt.
         */
        post: operations["create_prompt_version_v1_artifacts_prompt__artifact_id__versions_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/skills/{name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Register a Skill version
         * @description Creates the Skill on first use. Returns 201 with a new version, or 200 with the latest version when its content is the same. The first version becomes main; later ones do not move it.
         */
        put: operations["register_skill_v1_admin_skills__name__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/skills/{name}/main": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Choose the version new work uses
         * @description Running work keeps the version it started with.
         */
        put: operations["set_main_v1_admin_skills__name__main_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/skills": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Skills
         * @description The customer's Skills and Nuva's platform Skills, newest first.
         */
        get: operations["list_skills_v1_skills_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/skills/{skill_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a Skill
         * @description A Skill of the customer's or one of Nuva's platform Skills, at its latest version or the `version` asked for, with its files. `main_version` is the one new work uses.
         */
        get: operations["get_skill_v1_skills__skill_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/generate/video": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Generate a clip from a saved Prompt or raw Prompt input
         * @description Starts a job for a prompt artifact of yours; read it with GET /v1/jobs/{id}, or receive its final status at `callback_url`. Alternatively supply `input` to save a Prompt and enqueue its Job in one transaction; Job.prompt is the saved Prompt ID.
         */
        post: operations["generate_video_v1_generate_video_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/jobs/{job_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a job
         * @description Its status and, once it has completed, the generated clip as `asset`.
         */
        get: operations["get_job_v1_jobs__job_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/jobs/{job_id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cancel a job
         * @description A queued or running job is cancelled at once (a running one stops within a heartbeat); cancelling it again changes nothing. Completed and failed jobs return 409.
         */
        post: operations["cancel_job_v1_jobs__job_id__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/ads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List ads
         * @description Newest first; `batch_id` keeps those of one batch.
         */
        get: operations["list_ads_v1_ads_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/ads/{ad_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an ad
         * @description The Ad with its final video and the clips and audio its composition uses.
         */
        get: operations["get_ad_v1_ads__ad_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/scopes/{external_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Create or change an org or group
         * @description Idempotent. An org hangs from the customer; a group from one of its orgs, and changing `parent` moves the group. A scope's kind never changes. Putting an archived scope restores it.
         */
        put: operations["put_scope_v1_admin_scopes__external_id__put"];
        post?: never;
        /**
         * Archive an org or group
         * @description Its memberships and the shares with it stop counting. An org with groups left is refused (409). Archiving it again also returns 204.
         */
        delete: operations["archive_scope_v1_admin_scopes__external_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/scopes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the customer's orgs and groups
         * @description Those that aren't archived, newest first.
         */
        get: operations["list_scopes_v1_admin_scopes_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/users/{external_user_id}/memberships": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a user's memberships
         * @description The user's scopes and roles; 404 when no user has this external id.
         */
        get: operations["get_memberships_v1_admin_users__external_user_id__memberships_get"];
        /**
         * Set a user's memberships
         * @description Replaces the user's scopes and roles; `customer` with `admin` makes a customer admin, with `viewer` a reader of the whole customer. Every user is a member of the customer without a row. Takes effect at once. The first call for an id creates the user, like a first token.
         */
        put: operations["put_memberships_v1_admin_users__external_user_id__memberships_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/shares/{kind}/{item_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List an item's shares
         * @description The scopes the item is shared with, and how. Those who see the item but may not share it get 403.
         */
        get: operations["list_shares_v1_shares__kind___item_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/shares/{kind}/{item_id}/{scope}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Share an item with a scope
         * @description Everyone below the scope can read the item (`read`) or also edit it (`write`). Allowed for an admin of the scope or one above it who administers the item's owner (or owns it), and for the customer's API key. Idempotent; a repeat changes `access`.
         */
        put: operations["put_share_v1_shares__kind___item_id___scope__put"];
        post?: never;
        /**
         * Stop sharing an item with a scope
         * @description Those who saw the item only through this share no longer find it (404). Removing a share that does not exist also returns 204.
         */
        delete: operations["delete_share_v1_shares__kind___item_id___scope__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AdOut */
        AdOut: {
            /**
             * Id
             * Format: uuid
             * @description The Ad's id.
             */
            id: string;
            /**
             * Batch Id
             * @description The Batch it belongs to; null when none.
             */
            batch_id: string | null;
            /**
             * Schema Version
             * @description The version of `composition`'s format.
             */
            schema_version: number;
            /** @description How the final video was put together: its clips in order and the audio under them; null when not known. */
            composition: components["schemas"]["CompositionReadV1"] | null;
            /** @description The final video. */
            asset: components["schemas"]["AssetOut"];
            /**
             * Assets
             * @description The clips and audio the composition uses, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
            /**
             * Created At
             * Format: date-time
             * @description When the Ad was created.
             */
            created_at: string;
        };
        /** AdPage */
        AdPage: {
            /**
             * Items
             * @description The Ads on this page, newest first.
             */
            items: components["schemas"]["AdOut"][];
            /**
             * Next Cursor
             * @description Pass as `cursor` for the next page.
             */
            next_cursor: string | null;
        };
        /** AssetCreate */
        AssetCreate: {
            /**
             * Upload Token
             * @description From POST /v1/assets/uploads.
             */
            upload_token?: string | null;
            /**
             * Url
             * @description An http(s) URL to fetch.
             */
            url?: string | null;
            /**
             * Kind
             * @description Required with `url`.
             */
            kind?: ("image" | "video" | "audio") | null;
            /**
             * Label
             * @description A short name for what the file shows, e.g. which part of a product package.
             */
            label?: string | null;
            /**
             * Description
             * @description A longer description of what the file shows.
             */
            description?: string | null;
        };
        /** AssetEdit */
        AssetEdit: {
            /**
             * Label
             * @description A short name for what the file shows; null removes it.
             */
            label?: string | null;
            /**
             * Description
             * @description A longer description of what the file shows; null removes it.
             */
            description?: string | null;
        };
        /** AssetOut */
        AssetOut: {
            /**
             * Id
             * Format: uuid
             * @description The asset's id.
             */
            id: string;
            /**
             * Kind
             * @description `image`, `video` or `audio`.
             * @enum {string}
             */
            kind: "image" | "video" | "audio";
            /**
             * Mime
             * @description The file's MIME type, as detected from its content.
             */
            mime: string;
            /** @description `uploaded` (an upload or a URL you registered) or `generated` (a Job's clip). */
            source: components["schemas"]["AssetSource"];
            /**
             * Size Bytes
             * @description The file's size in bytes.
             */
            size_bytes: number;
            /**
             * Metadata
             * @description width and height for images; duration_ms otherwise.
             */
            metadata: {
                [key: string]: unknown;
            };
            /**
             * Label
             * @description A short name for what the file shows, given at upload or edited since.
             */
            label?: string | null;
            /**
             * Description
             * @description A longer description of what the file shows, given at upload or edited since.
             */
            description?: string | null;
            /**
             * Created At
             * Format: date-time
             * @description When the asset was registered.
             */
            created_at: string;
            /**
             * Download Url
             * @description A temporary URL to download the file, until `download_url_expires_at`.
             */
            download_url: string;
            /**
             * Download Url Expires At
             * Format: date-time
             * @description When `download_url` stops working: an hour after this response.
             */
            download_url_expires_at: string;
        };
        /**
         * AssetSource
         * @enum {string}
         */
        AssetSource: "uploaded" | "generated";
        /** BatchAd */
        BatchAd: {
            /**
             * Id
             * Format: uuid
             * @description The Ad's id.
             */
            id: string;
            /**
             * Asset Id
             * Format: uuid
             * @description The final video.
             */
            asset_id: string;
            /**
             * Created At
             * Format: date-time
             * @description When the Ad was created.
             */
            created_at: string;
        };
        /**
         * BatchListed
         * @description A Batch in a list: as GET /v1/batches/{id} reads it. SDKs before the version header read
         *     it without its Ads and Job counts (BatchSummary).
         */
        BatchListed: {
            /**
             * Id
             * Format: uuid
             * @description The Batch's id.
             */
            id: string;
            /**
             * Intent
             * @description Its title and purpose: what it tries.
             */
            intent: string;
            /**
             * Created At
             * Format: date-time
             * @description When the Batch was created.
             */
            created_at: string;
            /**
             * Ads
             * @description Oldest first; read each with GET /v1/ads/{id}.
             */
            ads: components["schemas"]["BatchAd"][] | null;
            /**
             * Jobs
             * @description How many of the batch's jobs are in each status.
             */
            jobs: {
                [key: string]: number;
            } | null;
        };
        /** BatchOut */
        BatchOut: {
            /**
             * Id
             * Format: uuid
             * @description The Batch's id.
             */
            id: string;
            /**
             * Intent
             * @description Its title and purpose: what it tries.
             */
            intent: string;
            /**
             * Created At
             * Format: date-time
             * @description When the Batch was created.
             */
            created_at: string;
            /**
             * Ads
             * @description Oldest first; read each with GET /v1/ads/{id}.
             */
            ads: components["schemas"]["BatchAd"][];
            /**
             * Jobs
             * @description How many of the batch's jobs are in each status.
             */
            jobs: {
                [key: string]: number;
            };
        };
        /** BatchPage */
        BatchPage: {
            /**
             * Items
             * @description The Batches on this page, newest first.
             */
            items: components["schemas"]["BatchListed"][];
            /**
             * Next Cursor
             * @description Pass as `cursor` for the next page.
             */
            next_cursor: string | null;
        };
        /** Brand */
        Brand: {
            /**
             * Id
             * Format: uuid
             * @description Its id: the same for every version. A reference to it is `{id, version?}`; without `version` it means the latest.
             */
            id: string;
            /**
             * Version
             * @description 1 for the first version, then one more per edit.
             */
            version: number;
            /**
             * Schema Version
             * @description The version of `data`'s format.
             */
            schema_version: number;
            /** @description The brand's details. */
            data: components["schemas"]["BrandDataV1"];
            /**
             * Created At
             * Format: date-time
             * @description When this version was saved.
             */
            created_at: string;
            /**
             * Assets
             * @description The assets `data` refers to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
        };
        /** BrandCreate */
        BrandCreate: {
            /** @description The brand's details. */
            data: components["schemas"]["BrandDataV1"];
        };
        /** BrandDataV1 */
        BrandDataV1: {
            /**
             * Name
             * @description The brand's name.
             */
            name: string;
            /**
             * Description
             * @description What the brand is and stands for, given to the Script writer as context.
             */
            description?: string | null;
            /**
             * Attributes
             * @description More about the brand as JSON, given to the Script writer as context. IDs here are not references: they grant no access to what they name.
             */
            attributes?: {
                [key: string]: components["schemas"]["JsonValue"];
            };
        };
        /** BrandEdit */
        BrandEdit: {
            /**
             * Version
             * @description The version you read. If someone saved a newer one since, the edit is refused with 409 REVISION_CONFLICT: read the brand again.
             */
            version: number;
            /** @description Only the fields to change; the rest keep their values. A list is replaced as a whole: `[]` empties it, and `null` clears an optional value. */
            data?: components["schemas"]["BrandEditData"];
        };
        /** BrandEditData */
        BrandEditData: {
            /**
             * Name
             * @description The brand's name.
             */
            name?: string;
            /**
             * Description
             * @description What the brand is and stands for, given to the Script writer as context.
             */
            description?: string | null;
            /**
             * Attributes
             * @description More about the brand as JSON, given to the Script writer as context. IDs here are not references: they grant no access to what they name.
             */
            attributes?: {
                [key: string]: components["schemas"]["JsonValue"];
            };
        };
        /** BrandPage */
        BrandPage: {
            /**
             * Items
             * @description The brands on this page, each at its current version, newest first.
             */
            items: components["schemas"]["Brand"][];
            /**
             * Next Cursor
             * @description Pass as `cursor` for the next page.
             */
            next_cursor: string | null;
        };
        /** CallbackOut */
        CallbackOut: {
            /**
             * Url
             * @description The `callback_url` the Job was started with.
             */
            url: string;
            /** @description Null until the Job ends; then `pending` while the final status is being sent (failures are retried), `sent` once your URL answered 2xx, or `failed` after the last attempt. */
            status: components["schemas"]["CallbackStatus"] | null;
        };
        /**
         * CallbackStatus
         * @enum {string}
         */
        CallbackStatus: "pending" | "sent" | "failed";
        /** Character */
        Character: {
            /**
             * Id
             * Format: uuid
             * @description Its id: the same for every version. A reference to it is `{id, version?}`; without `version` it means the latest.
             */
            id: string;
            /**
             * Version
             * @description 1 for the first version, then one more per edit.
             */
            version: number;
            /**
             * Schema Version
             * @description The version of `data`'s format.
             */
            schema_version: number;
            /** @description The character's details. */
            data: components["schemas"]["CharacterDataV1"];
            /**
             * Created At
             * Format: date-time
             * @description When this version was saved.
             */
            created_at: string;
            /**
             * Assets
             * @description The assets `data` refers to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
        };
        /** CharacterCreate */
        CharacterCreate: {
            /** @description The character's details. */
            data: components["schemas"]["CharacterDataV1"];
        };
        /** CharacterDataV1 */
        CharacterDataV1: {
            /**
             * Name
             * @description The character's name.
             */
            name: string;
            /**
             * Description
             * @description Looks, persona, speaking style and language.
             */
            description?: string | null;
            /**
             * Image Asset Ids
             * @description Image asset ids; the first is the default.
             */
            image_asset_ids: string[];
            /**
             * Voice Asset Id
             * @description An audio asset id.
             */
            voice_asset_id?: string | null;
        };
        /** CharacterEdit */
        CharacterEdit: {
            /**
             * Version
             * @description The version you read. If someone saved a newer one since, the edit is refused with 409 REVISION_CONFLICT: read the character again.
             */
            version: number;
            /** @description Only the fields to change; the rest keep their values. A list is replaced as a whole: `[]` empties it, and `null` clears an optional value. */
            data?: components["schemas"]["CharacterEditData"];
        };
        /** CharacterEditData */
        CharacterEditData: {
            /**
             * Name
             * @description The character's name.
             */
            name?: string;
            /**
             * Description
             * @description Looks, persona, speaking style and language.
             */
            description?: string | null;
            /**
             * Image Asset Ids
             * @description Image asset ids; the first is the default.
             */
            image_asset_ids?: string[];
            /**
             * Voice Asset Id
             * @description An audio asset id.
             */
            voice_asset_id?: string | null;
        };
        /** CharacterPage */
        CharacterPage: {
            /**
             * Items
             * @description The characters on this page, each at its current version, newest first.
             */
            items: components["schemas"]["Character"][];
            /**
             * Next Cursor
             * @description Pass as `cursor` for the next page.
             */
            next_cursor: string | null;
        };
        /** Clip */
        Clip: {
            /**
             * Asset Id
             * Format: uuid
             * @description A video asset: a generated clip or an upload.
             */
            asset_id: string;
            /**
             * Start Ms
             * @description Trim: where the clip starts.
             */
            start_ms?: number | null;
            /**
             * End Ms
             * @description Trim: where the clip ends.
             */
            end_ms?: number | null;
        };
        /**
         * CompositionReadV1
         * @description A composition as it is read; the editor's project data is the Agent's.
         */
        CompositionReadV1: {
            /**
             * Clips
             * @description In playing order.
             */
            clips: components["schemas"]["Clip"][];
            /**
             * Audio Asset Ids
             * @description Music, voice-over...
             * @default []
             */
            audio_asset_ids?: string[];
        };
        /** DirectingPlan */
        DirectingPlan: {
            /**
             * Kind
             * @description Always `directing_plan`.
             * @constant
             */
            kind: "directing_plan";
            /**
             * Id
             * Format: uuid
             * @description This version's id.
             */
            id: string;
            /**
             * Lineage Id
             * Format: uuid
             * @description The first version's id.
             */
            lineage_id: string;
            /**
             * Base Id
             * @description The version this one was edited from.
             */
            base_id: string | null;
            /**
             * Schema Version
             * @description The version of `data`'s format.
             */
            schema_version: number;
            /** @description The directing plan's content. */
            data: components["schemas"]["DirectingPlanDataV1"];
            /**
             * Batch Id
             * @description The Batch it was made in; null when none.
             */
            batch_id: string | null;
            /**
             * Created At
             * Format: date-time
             * @description When this version was saved.
             */
            created_at: string;
            /**
             * Assets
             * @description The assets `data` or `relationships` refer to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
        };
        /** DirectingPlanDataV1 */
        DirectingPlanDataV1: {
            /**
             * Text
             * @description The plan, in markdown: how the ad is shot and cut. It need not be one section per clip.
             */
            text: string;
        };
        /** Error */
        Error: {
            /**
             * Code
             * @description A stable, machine-readable code, e.g. `NOT_FOUND` or `REVISION_CONFLICT`.
             */
            code: string;
            /**
             * Message
             * @description An explanation for people to read; branch on `code`.
             */
            message: string;
            /**
             * Retryable
             * @description Whether the same request may succeed if sent again later.
             */
            retryable: boolean;
            /**
             * Details
             * @description The problems with the request's fields, when the error is about them; left out otherwise.
             */
            details?: components["schemas"]["ErrorDetail"][] | null;
        };
        /** ErrorDetail */
        ErrorDetail: {
            /**
             * Path
             * @description The request field the problem is in, as a dotted path, e.g. `data.prompt`.
             */
            path: string;
            /**
             * Message
             * @description What is wrong with it.
             */
            message: string;
        };
        /** ErrorResponse */
        ErrorResponse: {
            /** @description What went wrong. */
            error: components["schemas"]["Error"];
            /**
             * Request Id
             * @description This request's id, also sent as the `X-Request-ID` header; quote it when reporting a problem.
             */
            request_id: string;
        };
        /** GenerateVideo */
        GenerateVideo: {
            /**
             * Prompt
             * @description An existing saved Prompt ID.
             */
            prompt?: string | null;
            /**
             * Seed
             * @description The render's randomness. Omitted: a random seed, returned as `seed`; pass it again with the same Prompt to repeat the draw.
             */
            seed?: number | null;
            /**
             * Resolution
             * @description Omitted: 768P.
             */
            resolution?: ("480P" | "768P") | null;
            /** @description A Prompt of your own, saved with this Job: the prompt text and the files it names. Characters and Products reach a clip only through a Storyboard; here, attach their pictures yourself. */
            input?: components["schemas"]["RawPromptInput"] | null;
            /**
             * Callback Url
             * @description A public HTTPS URL for the final status.
             */
            callback_url?: string | null;
            /**
             * Batch Id
             * @description One of the caller's batches; when omitted, a saved Prompt's Job joins the Prompt's Batch.
             */
            batch_id?: string | null;
        } & ({
            prompt: string;
            input?: null;
        } | {
            input: Record<string, never>;
            prompt?: null;
        });
        /** JobOut */
        JobOut: {
            /**
             * Id
             * Format: uuid
             * @description The Job's id.
             */
            id: string;
            /** @description `queued` (waiting, also after a failed attempt that is retried), `running`, then `completed`, `failed` or `cancelled`, which are final. */
            status: components["schemas"]["JobStatus"];
            /**
             * Prompt
             * Format: uuid
             * @description The Prompt it renders; with raw `input`, the Prompt saved for it.
             */
            prompt: string;
            /**
             * Seed
             * @description The seed it renders with; pass it again with the same Prompt to repeat the draw.
             */
            seed: number;
            /**
             * Resolution
             * @description `480P` or `768P`; null when not chosen: 768P.
             */
            resolution: string | null;
            /**
             * Batch Id
             * @description The Batch it belongs to; null when none.
             */
            batch_id: string | null;
            /** @description The generated clip, once completed. */
            asset: components["schemas"]["AssetOut"] | null;
            /**
             * Error
             * @description Why the Job failed, once it has; null otherwise. Read `error_code`.
             */
            error: string | null;
            /**
             * Error Code
             * @description `GENERATION_FAILED` when the Job failed; null otherwise.
             */
            error_code: string | null;
            /** @description Delivery of the final status to `callback_url`; null when none was given. */
            callback: components["schemas"]["CallbackOut"] | null;
            /**
             * Created At
             * Format: date-time
             * @description When the Job was started.
             */
            created_at: string;
        };
        /**
         * JobStatus
         * @enum {string}
         */
        JobStatus: "queued" | "running" | "completed" | "failed" | "cancelled";
        JsonValue: unknown;
        /** MadeFromArtifact */
        MadeFromArtifact: {
            /**
             * Id
             * Format: uuid
             * @description The version's id.
             */
            id: string;
        };
        /** MadeFromEntity */
        MadeFromEntity: {
            /**
             * Id
             * Format: uuid
             * @description The entity's id.
             */
            id: string;
            /**
             * Version
             * @description The version it was made from.
             */
            version: number;
        };
        /** MadeWithSkill */
        MadeWithSkill: {
            /**
             * Id
             * Format: uuid
             * @description The Skill's id.
             */
            id: string;
            /**
             * Name
             * @description Its name.
             */
            name: string;
            /**
             * Version
             * @description The version that wrote it.
             */
            version: number;
        };
        /** MainRequest */
        MainRequest: {
            /**
             * Version
             * @description The version to make main.
             */
            version: number;
        };
        /** MembershipIn */
        MembershipIn: {
            /**
             * Scope
             * @description `customer` or an external id.
             */
            scope: string;
            /** @description `member`; `admin` (reads, writes, deletes and shares what users below the scope own); or `viewer` (reads what they own, and changes nothing of theirs). */
            role: components["schemas"]["MembershipRole"];
        };
        /** MembershipOut */
        MembershipOut: {
            /**
             * Scope
             * @description `customer` or the scope's external id.
             */
            scope: string;
            /** @description `member`, `admin` or `viewer`. */
            role: components["schemas"]["MembershipRole"];
        };
        /**
         * MembershipRole
         * @enum {string}
         */
        MembershipRole: "member" | "admin" | "viewer";
        /** MembershipsOut */
        MembershipsOut: {
            /**
             * User Id
             * Format: uuid
             * @description Nuva's id for the user, as in its user tokens.
             */
            user_id: string;
            /**
             * External User Id
             * @description The user's id in your system.
             */
            external_user_id: string;
            /**
             * Memberships
             * @description The user's roles in scopes that aren't archived, oldest scope first.
             */
            memberships: components["schemas"]["MembershipOut"][];
        };
        /** MembershipsRequest */
        MembershipsRequest: {
            /**
             * Memberships
             * @description The user's whole set of scopes and roles, each scope once; it replaces the current set, and `[]` removes them all.
             */
            memberships: components["schemas"]["MembershipIn"][];
        };
        /** Product */
        Product: {
            /**
             * Id
             * Format: uuid
             * @description Its id: the same for every version. A reference to it is `{id, version?}`; without `version` it means the latest.
             */
            id: string;
            /**
             * Version
             * @description 1 for the first version, then one more per edit.
             */
            version: number;
            /**
             * Schema Version
             * @description The version of `data`'s format.
             */
            schema_version: number;
            /** @description The product's details. */
            data: components["schemas"]["ProductDataV2"];
            /**
             * Brand Id
             * Format: uuid
             * @description The Brand it belongs to (the Brand's id).
             */
            brand_id: string;
            /**
             * Created At
             * Format: date-time
             * @description When this version was saved.
             */
            created_at: string;
            /**
             * Assets
             * @description The assets `data` refers to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
        };
        /** ProductCreate */
        ProductCreate: {
            /** @description The product's details. */
            data: components["schemas"]["ProductDataV2"];
            /**
             * Brand Id
             * Format: uuid
             * @description The Brand it belongs to (the Brand's id).
             */
            brand_id: string;
        };
        /**
         * ProductDataV2
         * @description A Product as writers read it. Its media fields are named like every other list of files
         *     (`image_asset_ids`, `video_asset_ids`); version 1 called them `images` and `videos`.
         */
        ProductDataV2: {
            /**
             * Name
             * @description The product's name.
             */
            name: string;
            /**
             * Description
             * @description What the product is, given to the Script writer as context.
             */
            description?: string | null;
            /**
             * Attributes
             * @description More about the product as JSON, given to the Script writer as context. IDs here are not references: they grant no access to what they name.
             */
            attributes?: {
                [key: string]: components["schemas"]["JsonValue"];
            };
            /**
             * Image Asset Ids
             * @description Pictures of the product. The first is the default a Storyboard shows for `{{product}}`; `{{product:<asset id>}}` picks another.
             * @default []
             */
            image_asset_ids?: string[];
            /**
             * Video Asset Ids
             * @description Videos of the product, which a Storyboard shot can name as `{{product:<asset id>}}`.
             * @default []
             */
            video_asset_ids?: string[];
            /**
             * Selling Points
             * @description What to say about the product; Scripts cite them as facts.
             * @default []
             */
            selling_points?: string[];
            /**
             * Target Audience
             * @description Who the ads are for.
             */
            target_audience?: string | null;
            /**
             * Facts
             * @description Other facts the Script writer may use.
             * @default []
             */
            facts?: string[];
            /**
             * Constraints
             * @description What ads may not say or show, as the brand requires.
             * @default []
             */
            constraints?: string[];
        };
        /** ProductEdit */
        ProductEdit: {
            /**
             * Version
             * @description The version you read. If someone saved a newer one since, the edit is refused with 409 REVISION_CONFLICT: read the product again.
             */
            version: number;
            /** @description Only the fields to change; the rest keep their values. A list is replaced as a whole: `[]` empties it, and `null` clears an optional value. */
            data?: components["schemas"]["ProductEditData"];
            /**
             * Brand Id
             * @description The Brand it belongs to (the Brand's id).
             */
            brand_id?: string | null;
        };
        /** ProductEditData */
        ProductEditData: {
            /**
             * Name
             * @description The product's name.
             */
            name?: string;
            /**
             * Description
             * @description What the product is, given to the Script writer as context.
             */
            description?: string | null;
            /**
             * Attributes
             * @description More about the product as JSON, given to the Script writer as context. IDs here are not references: they grant no access to what they name.
             */
            attributes?: {
                [key: string]: components["schemas"]["JsonValue"];
            };
            /**
             * Image Asset Ids
             * @description Pictures of the product. The first is the default a Storyboard shows for `{{product}}`; `{{product:<asset id>}}` picks another.
             */
            image_asset_ids?: string[];
            /**
             * Video Asset Ids
             * @description Videos of the product, which a Storyboard shot can name as `{{product:<asset id>}}`.
             */
            video_asset_ids?: string[];
            /**
             * Selling Points
             * @description What to say about the product; Scripts cite them as facts.
             */
            selling_points?: string[];
            /**
             * Target Audience
             * @description Who the ads are for.
             */
            target_audience?: string | null;
            /**
             * Facts
             * @description Other facts the Script writer may use.
             */
            facts?: string[];
            /**
             * Constraints
             * @description What ads may not say or show, as the brand requires.
             */
            constraints?: string[];
        };
        /** ProductPage */
        ProductPage: {
            /**
             * Items
             * @description The products on this page, each at its current version, newest first.
             */
            items: components["schemas"]["Product"][];
            /**
             * Next Cursor
             * @description Pass as `cursor` for the next page.
             */
            next_cursor: string | null;
        };
        /** Prompt */
        Prompt: {
            /**
             * Kind
             * @description Always `prompt`.
             * @constant
             */
            kind: "prompt";
            /**
             * Id
             * Format: uuid
             * @description This version's id.
             */
            id: string;
            /**
             * Lineage Id
             * Format: uuid
             * @description The first version's id.
             */
            lineage_id: string;
            /**
             * Base Id
             * @description The version this one was edited from.
             */
            base_id: string | null;
            /**
             * Schema Version
             * @description The version of `data`'s format.
             */
            schema_version: number;
            /** @description The prompt's content. */
            data: components["schemas"]["PromptReadV1"];
            /**
             * Batch Id
             * @description The Batch it was made in; null when none.
             */
            batch_id: string | null;
            /**
             * Created At
             * Format: date-time
             * @description When this version was saved.
             */
            created_at: string;
            /**
             * Assets
             * @description The assets `data` or `relationships` refer to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
            /** @description The Storyboard it was compiled from (its clip is `data.clip_id`); null for raw input. */
            storyboard: components["schemas"]["MadeFromArtifact"] | null;
            /** @description The Skill version that wrote it; null when none. */
            skill: components["schemas"]["MadeWithSkill"] | null;
        };
        /**
         * PromptDataV1
         * @description A saved Prompt: what the clip is rendered from, and which Characters and Storyboard clip
         *     it came from, which the Agent records. Seed, resolution and callback belong to the Job. The
         *     total number of references the model takes (12) is checked when the prompt is used.
         */
        PromptDataV1: {
            /**
             * Prompt
             * @description What the clip shows and says. It names each attached file by its position in its list: <Picture 1> is the first of `image_asset_ids`, likewise <Video N> and <Audio N>. A new prompt must name every attached file and no other.
             */
            prompt: string;
            /**
             * Image Asset Ids
             * @description Images the clip uses, as <Picture 1>, <Picture 2>, … in this order. A person or product looks like their picture only when it is attached here and named.
             * @default []
             */
            image_asset_ids?: string[];
            /**
             * Video Asset Ids
             * @description Videos the clip uses, as <Video 1>, … in order.
             * @default []
             */
            video_asset_ids?: string[];
            /**
             * Audio Asset Ids
             * @description Audio the clip uses (a voice, music, sound), as <Audio 1>, … in order.
             * @default []
             */
            audio_asset_ids?: string[];
            /**
             * Seconds
             * @description The clip's length. Omitted: 5 seconds.
             */
            seconds?: number | null;
            /**
             * Ratio
             * @description The frame. Omitted: 16:9. `adaptive` follows the first image or video.
             */
            ratio?: ("adaptive" | "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16") | null;
        };
        /**
         * PromptReadV1
         * @description A saved Prompt as it is read. Which Character versions it shows is the Agent's record.
         */
        PromptReadV1: {
            /**
             * Prompt
             * @description What the clip shows and says. It names each attached file by its position in its list: <Picture 1> is the first of `image_asset_ids`, likewise <Video N> and <Audio N>. A new prompt must name every attached file and no other.
             */
            prompt: string;
            /**
             * Image Asset Ids
             * @description Images the clip uses, as <Picture 1>, <Picture 2>, … in this order. A person or product looks like their picture only when it is attached here and named.
             * @default []
             */
            image_asset_ids?: string[];
            /**
             * Video Asset Ids
             * @description Videos the clip uses, as <Video 1>, … in order.
             * @default []
             */
            video_asset_ids?: string[];
            /**
             * Audio Asset Ids
             * @description Audio the clip uses (a voice, music, sound), as <Audio 1>, … in order.
             * @default []
             */
            audio_asset_ids?: string[];
            /**
             * Seconds
             * @description The clip's length. Omitted: 5 seconds.
             */
            seconds?: number | null;
            /**
             * Ratio
             * @description The frame. Omitted: 16:9. `adaptive` follows the first image or video.
             */
            ratio?: ("adaptive" | "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16") | null;
            /**
             * Clip Id
             * @description For a Prompt compiled from a Storyboard: the clip it renders (`C01`, …).
             */
            clip_id?: string | null;
        };
        /** PromptVersionCreate */
        PromptVersionCreate: {
            /** @description The prompt's content. */
            data: components["schemas"]["PromptDataV1"];
            /**
             * Batch Id
             * @description The batch it is made in; one of the caller's.
             */
            batch_id?: string | null;
        };
        /**
         * RawPromptDataV1
         * @description What a raw render takes: the prompt text and the files it names, the length and the frame,
         *     which is all the video model sees.
         */
        RawPromptDataV1: {
            /**
             * Prompt
             * @description What the clip shows and says. It names each attached file by its position in its list: <Picture 1> is the first of `image_asset_ids`, likewise <Video N> and <Audio N>. A new prompt must name every attached file and no other.
             */
            prompt: string;
            /**
             * Image Asset Ids
             * @description Images the clip uses, as <Picture 1>, <Picture 2>, … in this order. A person or product looks like their picture only when it is attached here and named.
             * @default []
             */
            image_asset_ids?: string[];
            /**
             * Video Asset Ids
             * @description Videos the clip uses, as <Video 1>, … in order.
             * @default []
             */
            video_asset_ids?: string[];
            /**
             * Audio Asset Ids
             * @description Audio the clip uses (a voice, music, sound), as <Audio 1>, … in order.
             * @default []
             */
            audio_asset_ids?: string[];
            /**
             * Seconds
             * @description The clip's length. Omitted: 5 seconds.
             */
            seconds?: number | null;
            /**
             * Ratio
             * @description The frame. Omitted: 16:9. `adaptive` follows the first image or video.
             */
            ratio?: ("adaptive" | "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16") | null;
        };
        /** RawPromptInput */
        RawPromptInput: {
            /**
             * Schema Version
             * @description The version of `data`'s format: 1.
             * @constant
             */
            schema_version: 1;
            /** @description What the clip is rendered from: the prompt text, the files it names, the length and the frame. */
            data: components["schemas"]["RawPromptDataV1"];
        };
        /** RegisteredSkill */
        RegisteredSkill: {
            /** @description The Skill. */
            skill: components["schemas"]["SkillOut"];
            /** @description The new version, or the latest one when its content was the same. */
            version: components["schemas"]["SkillVersionOut"];
        };
        /** ScopeOut */
        ScopeOut: {
            /**
             * Id
             * Format: uuid
             * @description Nuva's id for the scope.
             */
            id: string;
            /**
             * External Id
             * @description Your id for the org or group, as in its path.
             */
            external_id: string;
            /**
             * Kind
             * @description `org` or `group`.
             * @enum {string}
             */
            kind: "org" | "group";
            /**
             * Parent
             * @description The parent's external id, or `customer` for the root.
             */
            parent: string;
            /**
             * Name
             * @description Its display name; null when none was given.
             */
            name: string | null;
            /**
             * Created At
             * Format: date-time
             * @description When the scope was first put.
             */
            created_at: string;
        };
        /** ScopePage */
        ScopePage: {
            /**
             * Items
             * @description The orgs and groups on this page that aren't archived, newest first.
             */
            items: components["schemas"]["ScopeOut"][];
            /**
             * Next Cursor
             * @description Pass as `cursor` for the next page; null on the last page.
             */
            next_cursor: string | null;
        };
        /** ScopeRequest */
        ScopeRequest: {
            /**
             * Kind
             * @description `org` (under the customer) or `group` (under an org).
             * @enum {string}
             */
            kind: "org" | "group";
            /**
             * Parent
             * @description A group's org, by its external id.
             */
            parent?: string | null;
            /**
             * Name
             * @description A display name. Every PUT sets it, so leaving it out clears it.
             */
            name?: string | null;
        };
        /** Script */
        Script: {
            /**
             * Kind
             * @description Always `script`.
             * @constant
             */
            kind: "script";
            /**
             * Id
             * Format: uuid
             * @description This version's id.
             */
            id: string;
            /**
             * Lineage Id
             * Format: uuid
             * @description The first version's id.
             */
            lineage_id: string;
            /**
             * Base Id
             * @description The version this one was edited from.
             */
            base_id: string | null;
            /**
             * Schema Version
             * @description The version of `data`'s format.
             */
            schema_version: number;
            /** @description The script's content. */
            data: components["schemas"]["ScriptDataV1"];
            /**
             * Batch Id
             * @description The Batch it was made in; null when none.
             */
            batch_id: string | null;
            /**
             * Created At
             * Format: date-time
             * @description When this version was saved.
             */
            created_at: string;
            /**
             * Assets
             * @description The assets `data` or `relationships` refer to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
            /** @description The Product version it was written for. */
            product: components["schemas"]["MadeFromEntity"] | null;
            /** @description The Skill version that wrote it; null when none. */
            skill: components["schemas"]["MadeWithSkill"] | null;
        };
        /** ScriptDataV1 */
        ScriptDataV1: {
            /**
             * Text
             * @description The Script, encoded by the SDK (`nuva.script`); read it as the SDK's `content`.
             */
            text: string;
        };
        /**
         * ShareAccess
         * @enum {string}
         */
        ShareAccess: "read" | "write";
        /** ShareOut */
        ShareOut: {
            /**
             * Kind
             * @description The item's kind, as in the path.
             */
            kind: string;
            /**
             * Id
             * Format: uuid
             * @description The shared item: an asset's id, an entity's id, or an Artifact's first version's id. A share covers every version.
             */
            id: string;
            /**
             * Scope
             * @description The scope it is shared with: `customer` or an external id.
             */
            scope: string;
            /** @description `read` (see and use) or `write` (also edit). */
            access: components["schemas"]["ShareAccess"];
            /**
             * Created At
             * Format: date-time
             * @description When the item was first shared with this scope.
             */
            created_at: string;
        };
        /** ShareRequest */
        ShareRequest: {
            /** @description `read` (see and use) or `write` (also edit). */
            access: components["schemas"]["ShareAccess"];
        };
        /** SharesOut */
        SharesOut: {
            /**
             * Items
             * @description The item's shares with scopes that aren't archived, oldest first.
             */
            items: components["schemas"]["ShareOut"][];
        };
        /** SkillFile */
        SkillFile: {
            /**
             * Path
             * @description The file's path in the Skill, e.g. `SKILL.md`.
             */
            path: string;
            /**
             * Bytes
             * @description Its size in bytes.
             */
            bytes: number;
            /**
             * Sha256
             * @description The SHA-256 of its content, in hex.
             */
            sha256: string;
            /**
             * Download Url
             * @description A temporary URL for its content, until `download_url_expires_at`.
             */
            download_url: string;
        };
        /**
         * SkillListed
         * @description A Skill in a list, at its latest version; SDKs before the version header read it without
         *     one (SkillOut).
         */
        SkillListed: {
            /**
             * Id
             * Format: uuid
             * @description The Skill's id.
             */
            id: string;
            /**
             * Name
             * @description Its name, as registered.
             */
            name: string;
            /**
             * Platform
             * @description Provided by Nuva to every customer.
             */
            platform: boolean;
            /**
             * Main Version
             * @description The version new work uses by default.
             */
            main_version: number | null;
            /**
             * Created At
             * Format: date-time
             * @description When its first version was registered.
             */
            created_at: string;
            /**
             * Version
             * @description The version shown here: the latest.
             */
            version: number | null;
            /**
             * Description
             * @description Its description, as registered.
             */
            description: string | null;
            /**
             * Note
             * @description What this version changes.
             */
            note: string | null;
            /**
             * Attributes
             * @description The fields for the Agent's loader, as registered.
             */
            attributes: {
                [key: string]: unknown;
            } | null;
            /**
             * Files
             * @description Its files, by path, each with a download URL.
             */
            files: components["schemas"]["SkillFile"][] | null;
            /**
             * Download Url Expires At
             * @description When the files' download URLs stop working: in an hour.
             */
            download_url_expires_at: string | null;
        };
        /** SkillOut */
        SkillOut: {
            /**
             * Id
             * Format: uuid
             * @description The Skill's id.
             */
            id: string;
            /**
             * Name
             * @description Its name, as in PUT /v1/admin/skills/{name}.
             */
            name: string;
            /**
             * Platform
             * @description Provided by Nuva to every customer.
             */
            platform: boolean;
            /**
             * Main Version
             * @description The version new work uses by default.
             */
            main_version: number | null;
            /**
             * Created At
             * Format: date-time
             * @description When its first version was registered.
             */
            created_at: string;
        };
        /** SkillPage */
        SkillPage: {
            /**
             * Items
             * @description The Skills on this page, newest first, each at its latest version.
             */
            items: components["schemas"]["SkillListed"][];
            /**
             * Next Cursor
             * @description Pass as `cursor` for the next page.
             */
            next_cursor: string | null;
        };
        /**
         * SkillRead
         * @description A Skill at one version: the latest, or the one asked for. SDKs before the version header
         *     read the Skill with its `main` version (SkillDetail).
         */
        SkillRead: {
            /**
             * Id
             * Format: uuid
             * @description The Skill's id.
             */
            id: string;
            /**
             * Name
             * @description Its name, as registered.
             */
            name: string;
            /**
             * Platform
             * @description Provided by Nuva to every customer.
             */
            platform: boolean;
            /**
             * Main Version
             * @description The version new work uses by default.
             */
            main_version: number | null;
            /**
             * Created At
             * Format: date-time
             * @description When its first version was registered.
             */
            created_at: string;
            /**
             * Version
             * @description The version shown here.
             */
            version: number | null;
            /**
             * Description
             * @description Its description, as registered.
             */
            description: string | null;
            /**
             * Note
             * @description What this version changes.
             */
            note: string | null;
            /**
             * Attributes
             * @description The fields for the Agent's loader, as registered.
             */
            attributes: {
                [key: string]: unknown;
            } | null;
            /**
             * Files
             * @description Its files, by path, each with a download URL.
             */
            files: components["schemas"]["SkillFile"][] | null;
            /**
             * Download Url Expires At
             * @description When the files' download URLs stop working: in an hour.
             */
            download_url_expires_at: string | null;
        };
        /** SkillRegistration */
        SkillRegistration: {
            /**
             * Files
             * @description Path → UTF-8 text. `SKILL.md` is required; at most 64 files, 262144 bytes each and 786432 in all.
             */
            files: {
                [key: string]: string;
            };
            /**
             * Attributes
             * @description Fields for the Agent's loader (e.g. preloaded files, host calls), stored and returned as given.
             * @default {}
             */
            attributes?: {
                [key: string]: unknown;
            };
            /**
             * Description
             * @description What the Skill is for, kept with this version.
             */
            description?: string | null;
            /**
             * Note
             * @description What this version changes.
             */
            note?: string | null;
            /** @description Where the files came from, when published from a repository. */
            source?: components["schemas"]["SkillSource"] | null;
        };
        /** SkillSource */
        SkillSource: {
            /**
             * Repo
             * @description e.g. github.com/Nuva-Lab/WhatIf
             */
            repo: string;
            /**
             * Commit
             * @description The commit, in hex.
             */
            commit: string;
            /**
             * Path
             * @description The Skill's directory.
             */
            path?: string | null;
        };
        /** SkillVersionOut */
        SkillVersionOut: {
            /**
             * Id
             * Format: uuid
             * @description The version's id; content made with it records this id.
             */
            id: string;
            /**
             * Skill Id
             * Format: uuid
             * @description The Skill it is a version of.
             */
            skill_id: string;
            /**
             * Version
             * @description 1 for the first version, then one more per new version.
             */
            version: number;
            /**
             * Description
             * @description The description registered with it.
             */
            description: string | null;
            /**
             * Note
             * @description What this version changes, as registered.
             */
            note: string | null;
            /**
             * Attributes
             * @description The fields for the Agent's loader registered with it, as given.
             */
            attributes: {
                [key: string]: unknown;
            };
            /**
             * Files
             * @description Its files, by path, each with a download URL.
             */
            files: components["schemas"]["SkillFile"][];
            /**
             * Download Url Expires At
             * Format: date-time
             * @description When the files' download URLs stop working: an hour after this response.
             */
            download_url_expires_at: string;
            /**
             * Created At
             * Format: date-time
             * @description When this version was registered.
             */
            created_at: string;
        };
        /** Storyboard */
        Storyboard: {
            /**
             * Kind
             * @description Always `storyboard`.
             * @constant
             */
            kind: "storyboard";
            /**
             * Id
             * Format: uuid
             * @description This version's id.
             */
            id: string;
            /**
             * Lineage Id
             * Format: uuid
             * @description The first version's id.
             */
            lineage_id: string;
            /**
             * Base Id
             * @description The version this one was edited from.
             */
            base_id: string | null;
            /**
             * Schema Version
             * @description The version of `data`'s format.
             */
            schema_version: number;
            /** @description The storyboard's content. */
            data: components["schemas"]["StoryboardDataV1"];
            /**
             * Batch Id
             * @description The Batch it was made in; null when none.
             */
            batch_id: string | null;
            /**
             * Created At
             * Format: date-time
             * @description When this version was saved.
             */
            created_at: string;
            /**
             * Assets
             * @description The assets `data` or `relationships` refer to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
            /** @description The Script it shoots. */
            script: components["schemas"]["MadeFromArtifact"] | null;
            /** @description The Product version it shows. */
            product: components["schemas"]["MadeFromEntity"] | null;
            /**
             * Characters
             * @description The Character versions it casts.
             * @default []
             */
            characters: components["schemas"]["MadeFromEntity"][];
            /** @description The Skill version that wrote it; null when none. */
            skill: components["schemas"]["MadeWithSkill"] | null;
        };
        /** StoryboardDataV1 */
        StoryboardDataV1: {
            /**
             * Text
             * @description How a Script is shot: casting, locations, timed shots and each clip's references, encoded by the SDK (`nuva.storyboard`). It is `based_on` its Script and the Characters it casts.
             */
            text: string;
        };
        /** TokenRequest */
        TokenRequest: {
            /**
             * External User Id
             * @description The user's id in the customer's own system. The first token for an id creates the user; later tokens for the same id identify the same user.
             */
            external_user_id: string;
        };
        /** TokenResponse */
        TokenResponse: {
            /**
             * Access Token
             * @description ES256 JWT, sent as `Authorization: Bearer <token>`.
             */
            access_token: string;
            /**
             * Token Type
             * @description Always `Bearer`.
             * @default Bearer
             */
            token_type?: string;
            /**
             * Expires At
             * Format: date-time
             * @description Request a new token before this time.
             */
            expires_at: string;
            /** @description The user the token is for. */
            user: components["schemas"]["TokenUser"];
        };
        /** TokenUser */
        TokenUser: {
            /**
             * Id
             * Format: uuid
             * @description Nuva's id for the user; the `sub` claim of the token.
             */
            id: string;
            /**
             * External User Id
             * @description The user's id in your system, as you sent it.
             */
            external_user_id: string;
        };
        /** UploadOut */
        UploadOut: {
            /**
             * Upload Url
             * @description PUT the file's bytes here, before expires_at.
             */
            upload_url: string;
            /**
             * Upload Token
             * @description Send to POST /v1/assets after the PUT succeeds.
             */
            upload_token: string;
            /**
             * Expires At
             * Format: date-time
             * @description When `upload_url` and `upload_token` stop working: an hour after the request.
             */
            expires_at: string;
            /**
             * Max Bytes
             * @description The largest file of this kind, in bytes; a larger one is refused when registered (413 ASSET_TOO_LARGE).
             */
            max_bytes: number;
        };
        /** UploadRequest */
        UploadRequest: {
            /**
             * Kind
             * @description What you will upload: `image` (JPEG, PNG or WebP), `video` (MP4) or `audio` (MP3, WAV or MP4).
             * @enum {string}
             */
            kind: "image" | "video" | "audio";
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    issue_user_token_v1_admin_tokens_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TokenRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    start_upload_v1_assets_uploads_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UploadRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UploadOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_asset_v1_assets_post: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional stable write key scoped to customer/user/method/path. Reuse only with the same effective input. */
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AssetCreate"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssetOut"];
                };
            };
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssetOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_asset_v1_assets__asset_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                asset_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssetOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    update_asset_v1_assets__asset_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                asset_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AssetEdit"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssetOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_brands_v1_brands_get: {
        parameters: {
            query?: {
                limit?: number;
                /** @description From `next_cursor`. */
                cursor?: string | null;
                /** @description Only those this user owns (an admin's view). */
                user_id?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BrandPage"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_brand_v1_brands_post: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional stable write key scoped to customer/user/method/path. Reuse only with the same effective input. */
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BrandCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Brand"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_brand_v1_brands__brand_id__get: {
        parameters: {
            query?: {
                version?: number | null;
            };
            header?: never;
            path: {
                brand_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Brand"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    update_brand_v1_brands__brand_id__patch: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional stable write key scoped to customer/user/method/path. Reuse only with the same effective input. */
                "Idempotency-Key"?: string | null;
            };
            path: {
                brand_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BrandEdit"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Brand"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_products_v1_products_get: {
        parameters: {
            query?: {
                limit?: number;
                /** @description From `next_cursor`. */
                cursor?: string | null;
                brand_id?: string | null;
                /** @description Only those this user owns (an admin's view). */
                user_id?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductPage"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_product_v1_products_post: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional stable write key scoped to customer/user/method/path. Reuse only with the same effective input. */
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Product"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_product_v1_products__product_id__get: {
        parameters: {
            query?: {
                version?: number | null;
            };
            header?: never;
            path: {
                product_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Product"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    delete_product_v1_products__product_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    update_product_v1_products__product_id__patch: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional stable write key scoped to customer/user/method/path. Reuse only with the same effective input. */
                "Idempotency-Key"?: string | null;
            };
            path: {
                product_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductEdit"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Product"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_characters_v1_characters_get: {
        parameters: {
            query?: {
                limit?: number;
                /** @description From `next_cursor`. */
                cursor?: string | null;
                /** @description Only those this user owns (an admin's view). */
                user_id?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CharacterPage"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_character_v1_characters_post: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional stable write key scoped to customer/user/method/path. Reuse only with the same effective input. */
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CharacterCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Character"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_character_v1_characters__character_id__get: {
        parameters: {
            query?: {
                version?: number | null;
            };
            header?: never;
            path: {
                character_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Character"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    update_character_v1_characters__character_id__patch: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional stable write key scoped to customer/user/method/path. Reuse only with the same effective input. */
                "Idempotency-Key"?: string | null;
            };
            path: {
                character_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CharacterEdit"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Character"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_batches_v1_batches_get: {
        parameters: {
            query?: {
                limit?: number;
                /** @description From `next_cursor`. */
                cursor?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BatchPage"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_batch_v1_batches__batch_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                batch_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BatchOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_script_v1_artifacts_script__artifact_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                artifact_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Script"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_storyboard_v1_artifacts_storyboard__artifact_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                artifact_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Storyboard"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_directing_plan_v1_artifacts_directing_plan__artifact_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                artifact_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DirectingPlan"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_prompt_v1_artifacts_prompt__artifact_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                artifact_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Prompt"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_prompt_version_v1_artifacts_prompt__artifact_id__versions_post: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional stable write key scoped to customer/user/method/path. Reuse only with the same effective input. */
                "Idempotency-Key"?: string | null;
            };
            path: {
                artifact_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PromptVersionCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Prompt"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    register_skill_v1_admin_skills__name__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                name: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SkillRegistration"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegisteredSkill"];
                };
            };
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegisteredSkill"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    set_main_v1_admin_skills__name__main_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                name: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MainRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SkillOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_skills_v1_skills_get: {
        parameters: {
            query?: {
                limit?: number;
                /** @description From `next_cursor`. */
                cursor?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SkillPage"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_skill_v1_skills__skill_id__get: {
        parameters: {
            query?: {
                /** @description The version to read; the latest when left out. */
                version?: number | null;
            };
            header?: never;
            path: {
                skill_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SkillRead"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    generate_video_v1_generate_video_post: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional stable write key scoped to customer/user/method/path. Reuse only with the same effective input. */
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GenerateVideo"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JobOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_job_v1_jobs__job_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JobOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    cancel_job_v1_jobs__job_id__cancel_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JobOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_ads_v1_ads_get: {
        parameters: {
            query?: {
                batch_id?: string | null;
                limit?: number;
                /** @description From `next_cursor`. */
                cursor?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdPage"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_ad_v1_ads__ad_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                ad_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    put_scope_v1_admin_scopes__external_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ScopeRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ScopeOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    archive_scope_v1_admin_scopes__external_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_scopes_v1_admin_scopes_get: {
        parameters: {
            query?: {
                limit?: number;
                /** @description From `next_cursor`. */
                cursor?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ScopePage"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_memberships_v1_admin_users__external_user_id__memberships_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_user_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MembershipsOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    put_memberships_v1_admin_users__external_user_id__memberships_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_user_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MembershipsRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MembershipsOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_shares_v1_shares__kind___item_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                kind: string;
                item_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SharesOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    put_share_v1_shares__kind___item_id___scope__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                kind: string;
                item_id: string;
                scope: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ShareRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ShareOut"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    delete_share_v1_shares__kind___item_id___scope__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                kind: string;
                item_id: string;
                scope: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
}

export type BackendSchemas = components["schemas"];

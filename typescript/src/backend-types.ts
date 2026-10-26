// Generated from ads_backend/openapi.json at 20c6fd9bf15f2f7dd335e0e192b58fd3ccc46d5d. Do not edit.
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
        /** Issue a user token */
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
        /** Start an upload */
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
         * @description Returns 201 with a new asset, or 200 with your existing asset when you registered the same file, with the same MIME type, before.
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
         * Read an asset you uploaded or generated
         * @description Returns 404 for assets of other users, as for missing ones. Other users get an asset's download URL with the object that references it.
         */
        get: operations["get_asset_v1_assets__asset_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
        /** Create a brand */
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
        /**
         * Save a new version of a brand
         * @description `version` must be the current version; otherwise 409 REVISION_CONFLICT. Returns the current version unchanged when the edit changes nothing.
         */
        put: operations["update_brand_v1_brands__brand_id__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
        /** Create a product */
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
        /**
         * Save a new version of a product
         * @description `version` must be the current version; otherwise 409 REVISION_CONFLICT. Returns the current version unchanged when the edit changes nothing.
         */
        put: operations["update_product_v1_products__product_id__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
        /** Create a character */
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
        /**
         * Save a new version of a character
         * @description `version` must be the current version; otherwise 409 REVISION_CONFLICT. Returns the current version unchanged when the edit changes nothing.
         */
        put: operations["update_character_v1_characters__character_id__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
        /** Create a batch */
        post: operations["create_batch_v1_batches_post"];
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
        /** Read a batch and its log */
        get: operations["get_batch_v1_batches__batch_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/batches/{batch_id}/log": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Append to a batch's log
         * @description A batch holds at most 500 log entries (409 BATCH_FULL).
         */
        post: operations["append_log_v1_batches__batch_id__log_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/artifacts/script": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create a script */
        post: operations["create_script_v1_artifacts_script_post"];
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
        /** Read a script */
        get: operations["get_script_v1_artifacts_script__artifact_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/artifacts/script/{artifact_id}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Save a new version of a script
         * @description Based on the given version, which need not be the latest: versions form a tree. `batch_id` defaults to the base's batch.
         */
        post: operations["create_script_version_v1_artifacts_script__artifact_id__versions_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/artifacts/directing_plan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create a directing_plan */
        post: operations["create_directing_plan_v1_artifacts_directing_plan_post"];
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
        /** Read a directing_plan */
        get: operations["get_directing_plan_v1_artifacts_directing_plan__artifact_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/artifacts/directing_plan/{artifact_id}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Save a new version of a directing_plan
         * @description Based on the given version, which need not be the latest: versions form a tree. `batch_id` defaults to the base's batch.
         */
        post: operations["create_directing_plan_version_v1_artifacts_directing_plan__artifact_id__versions_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/artifacts/prompt": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create a prompt */
        post: operations["create_prompt_v1_artifacts_prompt_post"];
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
        /** Read a prompt */
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
         * @description Based on the given version, which need not be the latest: versions form a tree. `batch_id` defaults to the base's batch.
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
        /** Read a Skill and its main version */
        get: operations["get_skill_v1_skills__skill_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/skills/{skill_id}/versions/{version}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read a Skill version */
        get: operations["get_skill_version_v1_skills__skill_id__versions__version__get"];
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
         * Generate a clip from a prompt
         * @description Starts a job for a prompt artifact of yours; read it with GET /v1/jobs/{id}, or receive its final status at `callback_url`.
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
        /** Read a job */
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
        /**
         * Create an ad from an exported video
         * @description The ad never changes; a new cut is a new ad. A batch holds at most 500 ads (409 BATCH_FULL).
         */
        post: operations["create_ad_v1_ads_post"];
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
        /** Read an ad */
        get: operations["get_ad_v1_ads__ad_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AdCreate */
        AdCreate: {
            /**
             * Batch Id
             * Format: uuid
             * @description One of the caller's batches.
             */
            batch_id: string;
            /**
             * Schema Version
             * @description Only 1 is accepted.
             */
            schema_version: number;
            /** @description At most 100 clips and 20 audio assets; `editor` is at most 65536 bytes as JSON. */
            composition: components["schemas"]["CompositionV1"];
            /**
             * Asset Id
             * Format: uuid
             * @description The final video: a video asset.
             */
            asset_id: string;
        };
        /** AdOut */
        AdOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Batch Id
             * Format: uuid
             */
            batch_id: string;
            /** Schema Version */
            schema_version: number;
            composition: components["schemas"]["CompositionV1"];
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
             */
            created_at: string;
        };
        /** AdPage */
        AdPage: {
            /** Items */
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
        };
        /** AssetOut */
        AssetOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "image" | "video" | "audio";
            /** Mime */
            mime: string;
            source: components["schemas"]["AssetSource"];
            /** Size Bytes */
            size_bytes: number;
            /**
             * Metadata
             * @description width and height for images; duration_ms otherwise.
             */
            metadata: {
                [key: string]: unknown;
            };
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Download Url */
            download_url: string;
            /**
             * Download Url Expires At
             * Format: date-time
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
             */
            created_at: string;
        };
        /** BatchCreate */
        BatchCreate: {
            /**
             * Intent
             * @description Its title and purpose: what it tries.
             */
            intent: string;
        };
        /** BatchOut */
        BatchOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Intent */
            intent: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Log
             * @description Oldest first.
             */
            log: components["schemas"]["LogEntry"][];
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
            /** Items */
            items: components["schemas"]["BatchSummary"][];
            /**
             * Next Cursor
             * @description Pass as `cursor` for the next page.
             */
            next_cursor: string | null;
        };
        /** BatchSummary */
        BatchSummary: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Intent */
            intent: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** Brand */
        Brand: {
            /**
             * Id
             * Format: uuid
             * @description Stays the same across versions.
             */
            id: string;
            /** Version */
            version: number;
            /**
             * Revision
             * Format: uuid
             * @description This version's id; content made from it records this id.
             */
            revision: string;
            /** Schema Version */
            schema_version: number;
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
            data: components["schemas"]["BrandDataV1"];
        };
        /** BrandDataV1 */
        BrandDataV1: {
            /** Name */
            name: string;
        };
        /** BrandPage */
        BrandPage: {
            /** Items */
            items: components["schemas"]["Brand"][];
            /**
             * Next Cursor
             * @description Pass as `cursor` for the next page.
             */
            next_cursor: string | null;
        };
        /** BrandUpdate */
        BrandUpdate: {
            /**
             * Version
             * @description The version this edit is based on.
             */
            version: number;
            data: components["schemas"]["BrandDataV1"];
        };
        /** CallbackOut */
        CallbackOut: {
            /** Url */
            url: string;
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
             * @description Stays the same across versions.
             */
            id: string;
            /** Version */
            version: number;
            /**
             * Revision
             * Format: uuid
             * @description This version's id; content made from it records this id.
             */
            revision: string;
            /** Schema Version */
            schema_version: number;
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
            data: components["schemas"]["CharacterDataV1"];
        };
        /** CharacterDataV1 */
        CharacterDataV1: {
            /** Name */
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
        /** CharacterPage */
        CharacterPage: {
            /** Items */
            items: components["schemas"]["Character"][];
            /**
             * Next Cursor
             * @description Pass as `cursor` for the next page.
             */
            next_cursor: string | null;
        };
        /** CharacterUpdate */
        CharacterUpdate: {
            /**
             * Version
             * @description The version this edit is based on.
             */
            version: number;
            data: components["schemas"]["CharacterDataV1"];
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
        /** CompositionV1 */
        CompositionV1: {
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
            /**
             * Editor
             * @description The editor's own project data, stored and returned as given.
             * @default {}
             */
            editor?: {
                [key: string]: unknown;
            };
        };
        /** DirectingPlan */
        DirectingPlan: {
            /**
             * Kind
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
            /** Schema Version */
            schema_version: number;
            data: components["schemas"]["DirectingPlanDataV1"];
            /** Batch Id */
            batch_id: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Assets
             * @description The assets `data` refers to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
            /**
             * Entities
             * @description The entity versions `data` refers to, by `revision`.
             */
            entities: {
                [key: string]: components["schemas"]["EntityRef"];
            };
            /**
             * Skills
             * @description The Skill versions `data` refers to, by version id.
             */
            skills: {
                [key: string]: components["schemas"]["SkillRef"];
            };
        };
        /** DirectingPlanCreate */
        DirectingPlanCreate: {
            /**
             * Schema Version
             * @description Only 1 is accepted.
             */
            schema_version: number;
            data: components["schemas"]["DirectingPlanDataV1"];
            /**
             * Batch Id
             * @description The batch it is made in; one of the caller's.
             */
            batch_id?: string | null;
        };
        /** DirectingPlanDataV1 */
        DirectingPlanDataV1: {
            /**
             * Script
             * @description The script it plans.
             */
            script?: string | null;
            /**
             * Specs
             * @description One per clip.
             */
            specs: components["schemas"]["Spec"][];
            /**
             * Skill
             * @description The Skill version planned with.
             */
            skill?: string | null;
        };
        /** DirectingPlanVersionCreate */
        DirectingPlanVersionCreate: {
            data: components["schemas"]["DirectingPlanDataV1"];
            /**
             * Batch Id
             * @description The batch it is made in; one of the caller's.
             */
            batch_id?: string | null;
        };
        /**
         * EntityRef
         * @description An entity version a row refers to, to read it with GET /v1/{kind}s/{id}?version=.
         */
        EntityRef: {
            /** Kind */
            kind: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Version */
            version: number;
        };
        /** Error */
        Error: {
            /** Code */
            code: string;
            /** Message */
            message: string;
            /** Retryable */
            retryable: boolean;
            /** Details */
            details?: components["schemas"]["ErrorDetail"][] | null;
        };
        /** ErrorDetail */
        ErrorDetail: {
            /** Path */
            path: string;
            /** Message */
            message: string;
        };
        /** ErrorResponse */
        ErrorResponse: {
            error: components["schemas"]["Error"];
            /** Request Id */
            request_id: string;
        };
        /** GenerateVideo */
        GenerateVideo: {
            /**
             * Prompt
             * Format: uuid
             * @description The prompt artifact to run.
             */
            prompt: string;
            /**
             * Seed
             * @default 0
             */
            seed?: number;
            /**
             * Resolution
             * @description Omitted: the model's default.
             */
            resolution?: ("480P" | "768P") | null;
            /**
             * Callback Url
             * @description A public HTTPS URL for the final status.
             */
            callback_url?: string | null;
            /**
             * Batch Id
             * @description One of the caller's batches.
             */
            batch_id?: string | null;
        };
        /** JobOut */
        JobOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            status: components["schemas"]["JobStatus"];
            /**
             * Prompt
             * Format: uuid
             */
            prompt: string;
            /** Seed */
            seed: number;
            /** Resolution */
            resolution: string | null;
            /** Batch Id */
            batch_id: string | null;
            /** @description The generated clip, once completed. */
            asset: components["schemas"]["AssetOut"] | null;
            /**
             * Checkpoint
             * @description The model weights that made the clip.
             */
            checkpoint: string | null;
            /** Error */
            error: string | null;
            callback: components["schemas"]["CallbackOut"] | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * JobStatus
         * @enum {string}
         */
        JobStatus: "queued" | "running" | "completed" | "failed" | "cancelled";
        /** LogEntry */
        LogEntry: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Text */
            text: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** LogEntryCreate */
        LogEntryCreate: {
            /**
             * Text
             * @description What was changed in the batch, and why.
             */
            text: string;
        };
        /** MainRequest */
        MainRequest: {
            /** Version */
            version: number;
        };
        /** Product */
        Product: {
            /**
             * Id
             * Format: uuid
             * @description Stays the same across versions.
             */
            id: string;
            /** Version */
            version: number;
            /**
             * Revision
             * Format: uuid
             * @description This version's id; content made from it records this id.
             */
            revision: string;
            /** Schema Version */
            schema_version: number;
            data: components["schemas"]["ProductDataV1"];
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
            data: components["schemas"]["ProductDataV1"];
            /**
             * Brand Id
             * Format: uuid
             * @description The Brand it belongs to (the Brand's id).
             */
            brand_id: string;
        };
        /** ProductDataV1 */
        ProductDataV1: {
            /** Name */
            name: string;
            /**
             * Images
             * @description Image asset ids.
             * @default []
             */
            images?: string[];
            /**
             * Selling Points
             * @default []
             */
            selling_points?: string[];
            /** Target Audience */
            target_audience?: string | null;
            /**
             * Facts
             * @description Other facts about the product.
             * @default []
             */
            facts?: string[];
            /**
             * Constraints
             * @description Brand constraints on what ads may say.
             * @default []
             */
            constraints?: string[];
        };
        /** ProductPage */
        ProductPage: {
            /** Items */
            items: components["schemas"]["Product"][];
            /**
             * Next Cursor
             * @description Pass as `cursor` for the next page.
             */
            next_cursor: string | null;
        };
        /** ProductUpdate */
        ProductUpdate: {
            /**
             * Version
             * @description The version this edit is based on.
             */
            version: number;
            data: components["schemas"]["ProductDataV1"];
            /**
             * Brand Id
             * Format: uuid
             * @description The Brand it belongs to (the Brand's id).
             */
            brand_id: string;
        };
        /** Prompt */
        Prompt: {
            /**
             * Kind
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
            /** Schema Version */
            schema_version: number;
            data: components["schemas"]["PromptDataV1"];
            /** Batch Id */
            batch_id: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Assets
             * @description The assets `data` refers to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
            /**
             * Entities
             * @description The entity versions `data` refers to, by `revision`.
             */
            entities: {
                [key: string]: components["schemas"]["EntityRef"];
            };
            /**
             * Skills
             * @description The Skill versions `data` refers to, by version id.
             */
            skills: {
                [key: string]: components["schemas"]["SkillRef"];
            };
        };
        /** PromptCreate */
        PromptCreate: {
            /**
             * Schema Version
             * @description Only 1 is accepted.
             */
            schema_version: number;
            data: components["schemas"]["PromptDataV1"];
            /**
             * Batch Id
             * @description The batch it is made in; one of the caller's.
             */
            batch_id?: string | null;
        };
        /**
         * PromptDataV1
         * @description What POST /v1/videos takes to describe a clip; seed, resolution and callback belong to the
         *     Job. Each list's order numbers its references in the prompt: <Picture 1>, <Video 1>, ...
         *     The total number of references a model takes is checked when the prompt is used.
         */
        PromptDataV1: {
            /** Prompt */
            prompt: string;
            /**
             * Image Asset Ids
             * @default []
             */
            image_asset_ids?: string[];
            /**
             * Video Asset Ids
             * @default []
             */
            video_asset_ids?: string[];
            /**
             * Audio Asset Ids
             * @default []
             */
            audio_asset_ids?: string[];
            /** Seconds */
            seconds?: number | null;
            /** Ratio */
            ratio?: ("adaptive" | "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16") | null;
            /**
             * Plan
             * @description The directing plan it comes from.
             */
            plan?: string | null;
            /**
             * Clip Key
             * @description Its spec in `plan`.
             */
            clip_key?: string | null;
        };
        /** PromptVersionCreate */
        PromptVersionCreate: {
            data: components["schemas"]["PromptDataV1"];
            /**
             * Batch Id
             * @description The batch it is made in; one of the caller's.
             */
            batch_id?: string | null;
        };
        /** RegisteredSkill */
        RegisteredSkill: {
            skill: components["schemas"]["SkillOut"];
            version: components["schemas"]["SkillVersionOut"];
        };
        /** Script */
        Script: {
            /**
             * Kind
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
            /** Schema Version */
            schema_version: number;
            data: components["schemas"]["ScriptDataV1"];
            /** Batch Id */
            batch_id: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Assets
             * @description The assets `data` refers to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
            /**
             * Entities
             * @description The entity versions `data` refers to, by `revision`.
             */
            entities: {
                [key: string]: components["schemas"]["EntityRef"];
            };
            /**
             * Skills
             * @description The Skill versions `data` refers to, by version id.
             */
            skills: {
                [key: string]: components["schemas"]["SkillRef"];
            };
        };
        /** ScriptCreate */
        ScriptCreate: {
            /**
             * Schema Version
             * @description Only 1 is accepted.
             */
            schema_version: number;
            data: components["schemas"]["ScriptDataV1"];
            /**
             * Batch Id
             * @description The batch it is made in; one of the caller's.
             */
            batch_id?: string | null;
        };
        /** ScriptDataV1 */
        ScriptDataV1: {
            /**
             * Product
             * @description The Product version written for: its `revision`.
             */
            product?: string | null;
            /**
             * Text
             * @description The script, in markdown.
             */
            text: string;
            /**
             * Skill
             * @description The Skill version written with.
             */
            skill?: string | null;
        };
        /** ScriptVersionCreate */
        ScriptVersionCreate: {
            data: components["schemas"]["ScriptDataV1"];
            /**
             * Batch Id
             * @description The batch it is made in; one of the caller's.
             */
            batch_id?: string | null;
        };
        /** SkillDetail */
        SkillDetail: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
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
             */
            created_at: string;
            main: components["schemas"]["SkillVersionOut"] | null;
        };
        /** SkillFile */
        SkillFile: {
            /** Path */
            path: string;
            /** Bytes */
            bytes: number;
            /** Sha256 */
            sha256: string;
            /** Download Url */
            download_url: string;
        };
        /** SkillOut */
        SkillOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
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
             */
            created_at: string;
        };
        /** SkillPage */
        SkillPage: {
            /** Items */
            items: components["schemas"]["SkillOut"][];
            /**
             * Next Cursor
             * @description Pass as `cursor` for the next page.
             */
            next_cursor: string | null;
        };
        /**
         * SkillRef
         * @description A Skill version a row refers to, to read it with GET /v1/skills/{id}/versions/{version}.
         */
        SkillRef: {
            /**
             * Skill Id
             * Format: uuid
             */
            skill_id: string;
            /** Name */
            name: string;
            /** Version */
            version: number;
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
            /** Description */
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
            /** Commit */
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
             */
            skill_id: string;
            /** Version */
            version: number;
            /** Description */
            description: string | null;
            /** Note */
            note: string | null;
            source: components["schemas"]["SkillSource"] | null;
            /** Attributes */
            attributes: {
                [key: string]: unknown;
            };
            /** Files */
            files: components["schemas"]["SkillFile"][];
            /**
             * Download Url Expires At
             * Format: date-time
             */
            download_url_expires_at: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** Spec */
        Spec: {
            /**
             * Clip Key
             * @description Lines the clip's prompt up with this spec.
             */
            clip_key: string;
            /**
             * Text
             * @description Picture, shots and lines, in markdown.
             */
            text: string;
            /**
             * Characters
             * @description Character versions that appear: `revision`s.
             * @default []
             */
            characters?: string[];
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
             * @default Bearer
             */
            token_type?: string;
            /**
             * Expires At
             * Format: date-time
             * @description Request a new token before this time.
             */
            expires_at: string;
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
            /** External User Id */
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
             */
            expires_at: string;
            /** Max Bytes */
            max_bytes: number;
        };
        /** UploadRequest */
        UploadRequest: {
            /**
             * Kind
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
            header?: never;
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
    list_brands_v1_brands_get: {
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
            header?: never;
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
    update_brand_v1_brands__brand_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                brand_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BrandUpdate"];
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
            header?: never;
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
    update_product_v1_products__product_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductUpdate"];
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
            header?: never;
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
    update_character_v1_characters__character_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                character_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CharacterUpdate"];
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
    create_batch_v1_batches_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BatchCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
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
    append_log_v1_batches__batch_id__log_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                batch_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LogEntryCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogEntry"];
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
    create_script_v1_artifacts_script_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ScriptCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
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
    create_script_version_v1_artifacts_script__artifact_id__versions_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                artifact_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ScriptVersionCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
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
    create_directing_plan_v1_artifacts_directing_plan_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DirectingPlanCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
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
    create_directing_plan_version_v1_artifacts_directing_plan__artifact_id__versions_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                artifact_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DirectingPlanVersionCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
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
    create_prompt_v1_artifacts_prompt_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PromptCreate"];
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
            header?: never;
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
            query?: never;
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
                    "application/json": components["schemas"]["SkillDetail"];
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
    get_skill_version_v1_skills__skill_id__versions__version__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                skill_id: string;
                version: number;
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
                    "application/json": components["schemas"]["SkillVersionOut"];
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
            header?: never;
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
    create_ad_v1_ads_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
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
}

export type BackendSchemas = components["schemas"];

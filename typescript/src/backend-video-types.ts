// Generated from ads_backend/openapi.json at 47b9f5fa0844fa1ccfd78d5c98e7ed7853fd8007. PR target only; deployment not asserted. Do not edit.
export type paths = Record<string, never>;
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AdCreate */
        AdCreate: {
            /**
             * Batch Id
             * @description An optional caller-owned Batch.
             */
            batch_id?: string | null;
            /**
             * Schema Version
             * @description Only 1 is accepted.
             */
            schema_version: number;
            /** @description At most 100 clips and 20 audio assets; `editor` is at most 65536 bytes as JSON. */
            composition?: components["schemas"]["CompositionV1"] | null;
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
             * Version
             * @description Metadata version; identity and final video remain fixed.
             */
            version: number;
            /** Batch Id */
            batch_id: string | null;
            /** Schema Version */
            schema_version: number;
            composition: components["schemas"]["CompositionV1"] | null;
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
        /** AdUpdate */
        AdUpdate: {
            /**
             * Version
             * @description Current Ad metadata version, read from AdOut.
             */
            version: number;
            /**
             * Batch Id
             * @description Omit to preserve; null removes membership; UUID attaches a Batch.
             */
            batch_id: string | null;
            /** @description Omit to preserve; null marks unknown; otherwise replace ad@1. */
            composition?: components["schemas"]["CompositionV1"] | null;
        } | {
            /**
             * Version
             * @description Current Ad metadata version, read from AdOut.
             */
            version: number;
            /**
             * Batch Id
             * @description Omit to preserve; null removes membership; UUID attaches a Batch.
             */
            batch_id?: string | null;
            /** @description Omit to preserve; null marks unknown; otherwise replace ad@1. */
            composition: components["schemas"]["CompositionV1"] | null;
        };
        /** ArtifactRelationship */
        ArtifactRelationship: {
            /**
             * Type
             * @constant
             */
            type: "based_on";
            target: components["schemas"]["ArtifactTarget"];
        };
        /** ArtifactTarget */
        ArtifactTarget: {
            /**
             * Kind
             * @description What the target is: an asset's media kind, an entity, artifact or Skill.
             * @enum {string}
             */
            kind: "image" | "video" | "audio" | "brand" | "product" | "character" | "script" | "directing_plan" | "prompt" | "skill";
            /**
             * Id
             * Format: uuid
             * @description The exact version: an asset id, an entity `revision`, an Artifact version id or a Skill version id.
             */
            id: string;
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
            /**
             * Log Uri
             * @description Where the Agent writes this batch's log, as r2://bucket/key: the key is at most 1024 bytes as UTF-8, with no empty, `.` or `..` segment. Stored as given; never read by the backend or returned.
             */
            log_uri?: string | null;
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
             * Relationships
             * @description Where it comes from, by type and then target id.
             */
            relationships: components["schemas"]["ArtifactRelationship"][];
            /**
             * Assets
             * @description The assets `data` or `relationships` refer to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
            /**
             * Entities
             * @description Entity versions in `data` or `relationships`, keyed by revision.
             */
            entities: {
                [key: string]: components["schemas"]["EntityRef"];
            };
            /**
             * Skills
             * @description Skill versions in `data` or `relationships`, keyed by version id.
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
            /**
             * Relationships
             * @description Where it comes from.
             */
            relationships?: components["schemas"]["ArtifactRelationship"][];
        };
        /** DirectingPlanDataV1 */
        DirectingPlanDataV1: {
            /**
             * Text
             * @description The plan, in markdown: how the ad is shot and cut. It need not be one section per clip.
             */
            text: string;
        };
        /** DirectingPlanVersionCreate */
        DirectingPlanVersionCreate: {
            data: components["schemas"]["DirectingPlanDataV1"];
            /**
             * Batch Id
             * @description The batch it is made in; one of the caller's.
             */
            batch_id?: string | null;
            /**
             * Relationships
             * @description Where it comes from. Omit to keep the base's; [] clears them.
             */
            relationships?: components["schemas"]["ArtifactRelationship"][];
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
            /** Acceptance */
            acceptance?: ("not_accepted" | "unknown") | null;
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
             * @description An existing saved Prompt ID.
             */
            prompt?: string | null;
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
            /** @description Raw Prompt v1 content to save atomically with this Job. */
            input?: components["schemas"]["RawPromptInput"] | null;
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
        } & ({
            prompt: string;
            input?: null;
        } | {
            input: Record<string, never>;
            prompt?: null;
        });
        JsonValue: unknown;
        /** ProductDataV1 */
        ProductDataV1: {
            /** Name */
            name: string;
            /**
             * Attributes
             * @description Product attributes as JSON data. IDs here do not establish authorized resource references.
             */
            attributes?: {
                [key: string]: components["schemas"]["JsonValue"];
            };
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
             * Relationships
             * @description Where it comes from, by type and then target id.
             */
            relationships: components["schemas"]["ArtifactRelationship"][];
            /**
             * Assets
             * @description The assets `data` or `relationships` refer to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
            /**
             * Entities
             * @description Entity versions in `data` or `relationships`, keyed by revision.
             */
            entities: {
                [key: string]: components["schemas"]["EntityRef"];
            };
            /**
             * Skills
             * @description Skill versions in `data` or `relationships`, keyed by version id.
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
            /**
             * Relationships
             * @description Where it comes from.
             */
            relationships?: components["schemas"]["ArtifactRelationship"][];
        };
        /**
         * PromptDataV1
         * @description What POST /v1/videos takes to describe a clip; seed, resolution and callback belong to the
         *     Job. Each asset list's order numbers its references in the prompt: <Picture 1>, <Video 1>, ...
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
             * Characters
             * @description Character versions that appear: `revision`s.
             * @default []
             */
            characters?: string[];
        };
        /** PromptVersionCreate */
        PromptVersionCreate: {
            data: components["schemas"]["PromptDataV1"];
            /**
             * Batch Id
             * @description The batch it is made in; one of the caller's.
             */
            batch_id?: string | null;
            /**
             * Relationships
             * @description Where it comes from. Omit to keep the base's; [] clears them.
             */
            relationships?: components["schemas"]["ArtifactRelationship"][];
        };
        /** RawPromptInput */
        RawPromptInput: {
            /**
             * Schema Version
             * @constant
             */
            schema_version: 1;
            data: components["schemas"]["PromptDataV1"];
            /** Relationships */
            relationships?: components["schemas"]["ArtifactRelationship"][] | null;
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
             * Relationships
             * @description Where it comes from, by type and then target id.
             */
            relationships: components["schemas"]["ArtifactRelationship"][];
            /**
             * Assets
             * @description The assets `data` or `relationships` refer to, with download URLs.
             */
            assets: {
                [key: string]: components["schemas"]["AssetOut"];
            };
            /**
             * Entities
             * @description Entity versions in `data` or `relationships`, keyed by revision.
             */
            entities: {
                [key: string]: components["schemas"]["EntityRef"];
            };
            /**
             * Skills
             * @description Skill versions in `data` or `relationships`, keyed by version id.
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
            /**
             * Relationships
             * @description Where it comes from.
             */
            relationships?: components["schemas"]["ArtifactRelationship"][];
        };
        /** ScriptDataV1 */
        ScriptDataV1: {
            /**
             * Text
             * @description The script, in markdown.
             */
            text: string;
        };
        /** ScriptVersionCreate */
        ScriptVersionCreate: {
            data: components["schemas"]["ScriptDataV1"];
            /**
             * Batch Id
             * @description The batch it is made in; one of the caller's.
             */
            batch_id?: string | null;
            /**
             * Relationships
             * @description Where it comes from. Omit to keep the base's; [] clears them.
             */
            relationships?: components["schemas"]["ArtifactRelationship"][];
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
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;

export type BackendSchemas = components["schemas"];

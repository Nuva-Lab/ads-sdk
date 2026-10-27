// Generated from ads_backend/openapi.json at e2fe0f45f7940b16f31826ce4b4c34fc0d86e764. PR target only; deployment not asserted. Do not edit.
import type { z } from "zod";
export const backendDefinitions: Record<string, Exclude<Parameters<typeof z.fromJSONSchema>[0], boolean>> = {
  "AdCreate": {
    "properties": {
      "batch_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Batch Id",
        "description": "An optional caller-owned Batch."
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version",
        "description": "Only 1 is accepted."
      },
      "composition": {
        "anyOf": [
          {
            "$ref": "#/$defs/CompositionV1"
          },
          {
            "type": "null"
          }
        ],
        "description": "At most 100 clips and 20 audio assets; `editor` is at most 65536 bytes as JSON."
      },
      "asset_id": {
        "type": "string",
        "format": "uuid",
        "title": "Asset Id",
        "description": "The final video: a video asset."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "schema_version",
      "asset_id"
    ],
    "title": "AdCreate"
  },
  "AdOut": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "title": "Version",
        "description": "Metadata version; identity and final video remain fixed."
      },
      "batch_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Batch Id"
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version"
      },
      "composition": {
        "anyOf": [
          {
            "$ref": "#/$defs/CompositionV1"
          },
          {
            "type": "null"
          }
        ]
      },
      "asset": {
        "$ref": "#/$defs/AssetOut",
        "description": "The final video."
      },
      "assets": {
        "additionalProperties": {
          "$ref": "#/$defs/AssetOut"
        },
        "propertyNames": {
          "format": "uuid"
        },
        "type": "object",
        "title": "Assets",
        "description": "The clips and audio the composition uses, with download URLs."
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      }
    },
    "type": "object",
    "required": [
      "id",
      "version",
      "batch_id",
      "schema_version",
      "composition",
      "asset",
      "assets",
      "created_at"
    ],
    "title": "AdOut"
  },
  "AdPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/$defs/AdOut"
        },
        "type": "array",
        "title": "Items"
      },
      "next_cursor": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Next Cursor",
        "description": "Pass as `cursor` for the next page."
      }
    },
    "type": "object",
    "required": [
      "items",
      "next_cursor"
    ],
    "title": "AdPage"
  },
  "ArtifactRelationship": {
    "properties": {
      "type": {
        "type": "string",
        "const": "based_on",
        "title": "Type"
      },
      "target": {
        "$ref": "#/$defs/ArtifactTarget"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "type",
      "target"
    ],
    "title": "ArtifactRelationship"
  },
  "ArtifactTarget": {
    "properties": {
      "kind": {
        "type": "string",
        "enum": [
          "image",
          "video",
          "audio",
          "brand",
          "product",
          "character",
          "script",
          "directing_plan",
          "prompt",
          "skill"
        ],
        "title": "Kind",
        "description": "What the target is: an asset's media kind, an entity, artifact or Skill."
      },
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The exact version: an asset id, an entity `revision`, an Artifact version id or a Skill version id."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "kind",
      "id"
    ],
    "title": "ArtifactTarget"
  },
  "AssetOut": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "kind": {
        "type": "string",
        "enum": [
          "image",
          "video",
          "audio"
        ],
        "title": "Kind"
      },
      "mime": {
        "type": "string",
        "title": "Mime"
      },
      "source": {
        "$ref": "#/$defs/AssetSource"
      },
      "size_bytes": {
        "type": "integer",
        "title": "Size Bytes"
      },
      "metadata": {
        "additionalProperties": true,
        "type": "object",
        "title": "Metadata",
        "description": "width and height for images; duration_ms otherwise."
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      },
      "download_url": {
        "type": "string",
        "title": "Download Url"
      },
      "download_url_expires_at": {
        "type": "string",
        "format": "date-time",
        "title": "Download Url Expires At"
      }
    },
    "type": "object",
    "required": [
      "id",
      "kind",
      "mime",
      "source",
      "size_bytes",
      "metadata",
      "created_at",
      "download_url",
      "download_url_expires_at"
    ],
    "title": "AssetOut"
  },
  "AssetSource": {
    "type": "string",
    "enum": [
      "uploaded",
      "generated"
    ],
    "title": "AssetSource"
  },
  "BatchAd": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "asset_id": {
        "type": "string",
        "format": "uuid",
        "title": "Asset Id",
        "description": "The final video."
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      }
    },
    "type": "object",
    "required": [
      "id",
      "asset_id",
      "created_at"
    ],
    "title": "BatchAd"
  },
  "BatchCreate": {
    "properties": {
      "intent": {
        "type": "string",
        "maxLength": 2000,
        "minLength": 1,
        "title": "Intent",
        "description": "Its title and purpose: what it tries."
      },
      "log_uri": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 1100,
            "pattern": "^r2://[a-z0-9][a-z0-9-]{1,61}[a-z0-9]/\\S+$"
          },
          {
            "type": "null"
          }
        ],
        "title": "Log Uri",
        "description": "Where the Agent writes this batch's log, as r2://bucket/key: the key is at most 1024 bytes as UTF-8, with no empty, `.` or `..` segment. Stored as given; never read by the backend or returned."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "intent"
    ],
    "title": "BatchCreate"
  },
  "BatchOut": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "intent": {
        "type": "string",
        "title": "Intent"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      },
      "ads": {
        "items": {
          "$ref": "#/$defs/BatchAd"
        },
        "type": "array",
        "title": "Ads",
        "description": "Oldest first; read each with GET /v1/ads/{id}."
      },
      "jobs": {
        "additionalProperties": {
          "type": "integer"
        },
        "type": "object",
        "title": "Jobs",
        "description": "How many of the batch's jobs are in each status."
      }
    },
    "type": "object",
    "required": [
      "id",
      "intent",
      "created_at",
      "ads",
      "jobs"
    ],
    "title": "BatchOut"
  },
  "Clip": {
    "properties": {
      "asset_id": {
        "type": "string",
        "format": "uuid",
        "title": "Asset Id",
        "description": "A video asset: a generated clip or an upload."
      },
      "start_ms": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 0
          },
          {
            "type": "null"
          }
        ],
        "title": "Start Ms",
        "description": "Trim: where the clip starts."
      },
      "end_ms": {
        "anyOf": [
          {
            "type": "integer",
            "exclusiveMinimum": 0
          },
          {
            "type": "null"
          }
        ],
        "title": "End Ms",
        "description": "Trim: where the clip ends."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "asset_id"
    ],
    "title": "Clip"
  },
  "CompositionV1": {
    "properties": {
      "clips": {
        "items": {
          "$ref": "#/$defs/Clip"
        },
        "type": "array",
        "minItems": 1,
        "title": "Clips",
        "description": "In playing order."
      },
      "audio_asset_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "title": "Audio Asset Ids",
        "description": "Music, voice-over...",
        "default": []
      },
      "editor": {
        "additionalProperties": true,
        "type": "object",
        "title": "Editor",
        "description": "The editor's own project data, stored and returned as given.",
        "default": {}
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "clips"
    ],
    "title": "CompositionV1"
  },
  "DirectingPlan": {
    "properties": {
      "kind": {
        "type": "string",
        "const": "directing_plan",
        "title": "Kind"
      },
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "This version's id."
      },
      "lineage_id": {
        "type": "string",
        "format": "uuid",
        "title": "Lineage Id",
        "description": "The first version's id."
      },
      "base_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Base Id",
        "description": "The version this one was edited from."
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version"
      },
      "data": {
        "$ref": "#/$defs/DirectingPlanDataV1"
      },
      "batch_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Batch Id"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      },
      "relationships": {
        "items": {
          "$ref": "#/$defs/ArtifactRelationship"
        },
        "type": "array",
        "title": "Relationships",
        "description": "Where it comes from, by type and then target id."
      },
      "assets": {
        "additionalProperties": {
          "$ref": "#/$defs/AssetOut"
        },
        "propertyNames": {
          "format": "uuid"
        },
        "type": "object",
        "title": "Assets",
        "description": "The assets `data` refers to, with download URLs."
      },
      "entities": {
        "additionalProperties": {
          "$ref": "#/$defs/EntityRef"
        },
        "propertyNames": {
          "format": "uuid"
        },
        "type": "object",
        "title": "Entities",
        "description": "The entity versions `data` refers to, by `revision`."
      },
      "skills": {
        "additionalProperties": {
          "$ref": "#/$defs/SkillRef"
        },
        "propertyNames": {
          "format": "uuid"
        },
        "type": "object",
        "title": "Skills",
        "description": "The Skill versions `data` refers to, by version id."
      }
    },
    "type": "object",
    "required": [
      "kind",
      "id",
      "lineage_id",
      "base_id",
      "schema_version",
      "data",
      "batch_id",
      "created_at",
      "relationships",
      "assets",
      "entities",
      "skills"
    ],
    "title": "DirectingPlan"
  },
  "DirectingPlanCreate": {
    "properties": {
      "schema_version": {
        "type": "integer",
        "title": "Schema Version",
        "description": "Only 1 is accepted."
      },
      "data": {
        "$ref": "#/$defs/DirectingPlanDataV1"
      },
      "batch_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Batch Id",
        "description": "The batch it is made in; one of the caller's."
      },
      "relationships": {
        "items": {
          "$ref": "#/$defs/ArtifactRelationship"
        },
        "type": "array",
        "maxItems": 100,
        "title": "Relationships",
        "description": "Where it comes from."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "schema_version",
      "data"
    ],
    "title": "DirectingPlanCreate"
  },
  "DirectingPlanDataV1": {
    "properties": {
      "text": {
        "type": "string",
        "maxLength": 65536,
        "minLength": 1,
        "title": "Text",
        "description": "The plan, in markdown: how the ad is shot and cut. It need not be one section per clip."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "text"
    ],
    "title": "DirectingPlanDataV1"
  },
  "DirectingPlanVersionCreate": {
    "properties": {
      "data": {
        "$ref": "#/$defs/DirectingPlanDataV1"
      },
      "batch_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Batch Id",
        "description": "The batch it is made in; one of the caller's."
      },
      "relationships": {
        "items": {
          "$ref": "#/$defs/ArtifactRelationship"
        },
        "type": "array",
        "maxItems": 100,
        "title": "Relationships",
        "description": "Where it comes from. Omit to keep the base's; [] clears them."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "data"
    ],
    "title": "DirectingPlanVersionCreate"
  },
  "EntityRef": {
    "properties": {
      "kind": {
        "type": "string",
        "title": "Kind"
      },
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "title": "Version"
      }
    },
    "type": "object",
    "required": [
      "kind",
      "id",
      "version"
    ],
    "title": "EntityRef",
    "description": "An entity version a row refers to, to read it with GET /v1/{kind}s/{id}?version=."
  },
  "Error": {
    "properties": {
      "code": {
        "type": "string",
        "title": "Code"
      },
      "message": {
        "type": "string",
        "title": "Message"
      },
      "retryable": {
        "type": "boolean",
        "title": "Retryable"
      },
      "details": {
        "anyOf": [
          {
            "items": {
              "$ref": "#/$defs/ErrorDetail"
            },
            "type": "array"
          },
          {
            "type": "null"
          }
        ],
        "title": "Details"
      },
      "acceptance": {
        "anyOf": [
          {
            "type": "string",
            "enum": [
              "not_accepted",
              "unknown"
            ]
          },
          {
            "type": "null"
          }
        ],
        "title": "Acceptance"
      }
    },
    "type": "object",
    "required": [
      "code",
      "message",
      "retryable"
    ],
    "title": "Error"
  },
  "ErrorDetail": {
    "properties": {
      "path": {
        "type": "string",
        "title": "Path"
      },
      "message": {
        "type": "string",
        "title": "Message"
      }
    },
    "type": "object",
    "required": [
      "path",
      "message"
    ],
    "title": "ErrorDetail"
  },
  "ErrorResponse": {
    "properties": {
      "error": {
        "$ref": "#/$defs/Error"
      },
      "request_id": {
        "type": "string",
        "title": "Request Id"
      }
    },
    "type": "object",
    "required": [
      "error",
      "request_id"
    ],
    "title": "ErrorResponse"
  },
  "GenerateVideo": {
    "oneOf": [
      {
        "properties": {
          "prompt": {
            "type": "string"
          },
          "input": {
            "type": "null"
          }
        },
        "type": "object",
        "required": [
          "prompt"
        ]
      },
      {
        "properties": {
          "input": {
            "type": "object"
          },
          "prompt": {
            "type": "null"
          }
        },
        "type": "object",
        "required": [
          "input"
        ]
      }
    ],
    "properties": {
      "prompt": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Prompt",
        "description": "An existing saved Prompt ID."
      },
      "seed": {
        "type": "integer",
        "maximum": 9007199254740991,
        "minimum": 0,
        "title": "Seed",
        "default": 0
      },
      "resolution": {
        "anyOf": [
          {
            "type": "string",
            "enum": [
              "480P",
              "768P"
            ]
          },
          {
            "type": "null"
          }
        ],
        "title": "Resolution",
        "description": "Omitted: the model's default."
      },
      "input": {
        "anyOf": [
          {
            "$ref": "#/$defs/RawPromptInput"
          },
          {
            "type": "null"
          }
        ],
        "description": "Raw Prompt v1 content to save atomically with this Job."
      },
      "callback_url": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 2048
          },
          {
            "type": "null"
          }
        ],
        "title": "Callback Url",
        "description": "A public HTTPS URL for the final status."
      },
      "batch_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Batch Id",
        "description": "One of the caller's batches."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "title": "GenerateVideo"
  },
  "JsonValue": {},
  "ProductDataV1": {
    "properties": {
      "name": {
        "type": "string",
        "maxLength": 200,
        "minLength": 1,
        "title": "Name"
      },
      "attributes": {
        "additionalProperties": {
          "$ref": "#/$defs/JsonValue"
        },
        "type": "object",
        "title": "Attributes",
        "description": "Product attributes as JSON data. IDs here do not establish authorized resource references."
      },
      "images": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 20,
        "title": "Images",
        "description": "Image asset ids.",
        "default": []
      },
      "selling_points": {
        "items": {
          "type": "string",
          "maxLength": 500,
          "minLength": 1
        },
        "type": "array",
        "maxItems": 20,
        "title": "Selling Points",
        "default": []
      },
      "target_audience": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 2000
          },
          {
            "type": "null"
          }
        ],
        "title": "Target Audience"
      },
      "facts": {
        "items": {
          "type": "string",
          "maxLength": 500,
          "minLength": 1
        },
        "type": "array",
        "maxItems": 20,
        "title": "Facts",
        "description": "Other facts about the product.",
        "default": []
      },
      "constraints": {
        "items": {
          "type": "string",
          "maxLength": 500,
          "minLength": 1
        },
        "type": "array",
        "maxItems": 20,
        "title": "Constraints",
        "description": "Brand constraints on what ads may say.",
        "default": []
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "name"
    ],
    "title": "ProductDataV1"
  },
  "Prompt": {
    "properties": {
      "kind": {
        "type": "string",
        "const": "prompt",
        "title": "Kind"
      },
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "This version's id."
      },
      "lineage_id": {
        "type": "string",
        "format": "uuid",
        "title": "Lineage Id",
        "description": "The first version's id."
      },
      "base_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Base Id",
        "description": "The version this one was edited from."
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version"
      },
      "data": {
        "$ref": "#/$defs/PromptDataV1"
      },
      "batch_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Batch Id"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      },
      "relationships": {
        "items": {
          "$ref": "#/$defs/ArtifactRelationship"
        },
        "type": "array",
        "title": "Relationships",
        "description": "Where it comes from, by type and then target id."
      },
      "assets": {
        "additionalProperties": {
          "$ref": "#/$defs/AssetOut"
        },
        "propertyNames": {
          "format": "uuid"
        },
        "type": "object",
        "title": "Assets",
        "description": "The assets `data` refers to, with download URLs."
      },
      "entities": {
        "additionalProperties": {
          "$ref": "#/$defs/EntityRef"
        },
        "propertyNames": {
          "format": "uuid"
        },
        "type": "object",
        "title": "Entities",
        "description": "The entity versions `data` refers to, by `revision`."
      },
      "skills": {
        "additionalProperties": {
          "$ref": "#/$defs/SkillRef"
        },
        "propertyNames": {
          "format": "uuid"
        },
        "type": "object",
        "title": "Skills",
        "description": "The Skill versions `data` refers to, by version id."
      }
    },
    "type": "object",
    "required": [
      "kind",
      "id",
      "lineage_id",
      "base_id",
      "schema_version",
      "data",
      "batch_id",
      "created_at",
      "relationships",
      "assets",
      "entities",
      "skills"
    ],
    "title": "Prompt"
  },
  "PromptCreate": {
    "properties": {
      "schema_version": {
        "type": "integer",
        "title": "Schema Version",
        "description": "Only 1 is accepted."
      },
      "data": {
        "$ref": "#/$defs/PromptDataV1"
      },
      "batch_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Batch Id",
        "description": "The batch it is made in; one of the caller's."
      },
      "relationships": {
        "items": {
          "$ref": "#/$defs/ArtifactRelationship"
        },
        "type": "array",
        "maxItems": 100,
        "title": "Relationships",
        "description": "Where it comes from."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "schema_version",
      "data"
    ],
    "title": "PromptCreate"
  },
  "PromptDataV1": {
    "properties": {
      "prompt": {
        "type": "string",
        "maxLength": 10000,
        "minLength": 1,
        "title": "Prompt"
      },
      "image_asset_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 9,
        "title": "Image Asset Ids",
        "default": []
      },
      "video_asset_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 3,
        "title": "Video Asset Ids",
        "default": []
      },
      "audio_asset_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 3,
        "title": "Audio Asset Ids",
        "default": []
      },
      "seconds": {
        "anyOf": [
          {
            "type": "number",
            "maximum": 15,
            "minimum": 5
          },
          {
            "type": "null"
          }
        ],
        "title": "Seconds"
      },
      "ratio": {
        "anyOf": [
          {
            "type": "string",
            "enum": [
              "adaptive",
              "21:9",
              "16:9",
              "4:3",
              "1:1",
              "3:4",
              "9:16"
            ]
          },
          {
            "type": "null"
          }
        ],
        "title": "Ratio"
      },
      "characters": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 10,
        "title": "Characters",
        "description": "Character versions that appear: `revision`s.",
        "default": []
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "prompt"
    ],
    "title": "PromptDataV1",
    "description": "What POST /v1/videos takes to describe a clip; seed, resolution and callback belong to the\nJob. Each asset list's order numbers its references in the prompt: <Picture 1>, <Video 1>, ...\nThe total number of references a model takes is checked when the prompt is used."
  },
  "PromptVersionCreate": {
    "properties": {
      "data": {
        "$ref": "#/$defs/PromptDataV1"
      },
      "batch_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Batch Id",
        "description": "The batch it is made in; one of the caller's."
      },
      "relationships": {
        "items": {
          "$ref": "#/$defs/ArtifactRelationship"
        },
        "type": "array",
        "maxItems": 100,
        "title": "Relationships",
        "description": "Where it comes from. Omit to keep the base's; [] clears them."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "data"
    ],
    "title": "PromptVersionCreate"
  },
  "RawPromptInput": {
    "properties": {
      "schema_version": {
        "type": "integer",
        "const": 1,
        "title": "Schema Version"
      },
      "data": {
        "$ref": "#/$defs/PromptDataV1"
      },
      "relationships": {
        "anyOf": [
          {
            "items": {
              "$ref": "#/$defs/ArtifactRelationship"
            },
            "type": "array",
            "maxItems": 100
          },
          {
            "type": "null"
          }
        ],
        "title": "Relationships"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "schema_version",
      "data"
    ],
    "title": "RawPromptInput"
  },
  "Script": {
    "properties": {
      "kind": {
        "type": "string",
        "const": "script",
        "title": "Kind"
      },
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "This version's id."
      },
      "lineage_id": {
        "type": "string",
        "format": "uuid",
        "title": "Lineage Id",
        "description": "The first version's id."
      },
      "base_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Base Id",
        "description": "The version this one was edited from."
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version"
      },
      "data": {
        "$ref": "#/$defs/ScriptDataV1"
      },
      "batch_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Batch Id"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      },
      "relationships": {
        "items": {
          "$ref": "#/$defs/ArtifactRelationship"
        },
        "type": "array",
        "title": "Relationships",
        "description": "Where it comes from, by type and then target id."
      },
      "assets": {
        "additionalProperties": {
          "$ref": "#/$defs/AssetOut"
        },
        "propertyNames": {
          "format": "uuid"
        },
        "type": "object",
        "title": "Assets",
        "description": "The assets `data` refers to, with download URLs."
      },
      "entities": {
        "additionalProperties": {
          "$ref": "#/$defs/EntityRef"
        },
        "propertyNames": {
          "format": "uuid"
        },
        "type": "object",
        "title": "Entities",
        "description": "The entity versions `data` refers to, by `revision`."
      },
      "skills": {
        "additionalProperties": {
          "$ref": "#/$defs/SkillRef"
        },
        "propertyNames": {
          "format": "uuid"
        },
        "type": "object",
        "title": "Skills",
        "description": "The Skill versions `data` refers to, by version id."
      }
    },
    "type": "object",
    "required": [
      "kind",
      "id",
      "lineage_id",
      "base_id",
      "schema_version",
      "data",
      "batch_id",
      "created_at",
      "relationships",
      "assets",
      "entities",
      "skills"
    ],
    "title": "Script"
  },
  "ScriptCreate": {
    "properties": {
      "schema_version": {
        "type": "integer",
        "title": "Schema Version",
        "description": "Only 1 is accepted."
      },
      "data": {
        "$ref": "#/$defs/ScriptDataV1"
      },
      "batch_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Batch Id",
        "description": "The batch it is made in; one of the caller's."
      },
      "relationships": {
        "items": {
          "$ref": "#/$defs/ArtifactRelationship"
        },
        "type": "array",
        "maxItems": 100,
        "title": "Relationships",
        "description": "Where it comes from."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "schema_version",
      "data"
    ],
    "title": "ScriptCreate"
  },
  "ScriptDataV1": {
    "properties": {
      "text": {
        "type": "string",
        "maxLength": 65536,
        "minLength": 1,
        "title": "Text",
        "description": "The script, in markdown."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "text"
    ],
    "title": "ScriptDataV1"
  },
  "ScriptVersionCreate": {
    "properties": {
      "data": {
        "$ref": "#/$defs/ScriptDataV1"
      },
      "batch_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Batch Id",
        "description": "The batch it is made in; one of the caller's."
      },
      "relationships": {
        "items": {
          "$ref": "#/$defs/ArtifactRelationship"
        },
        "type": "array",
        "maxItems": 100,
        "title": "Relationships",
        "description": "Where it comes from. Omit to keep the base's; [] clears them."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "data"
    ],
    "title": "ScriptVersionCreate"
  },
  "SkillRef": {
    "properties": {
      "skill_id": {
        "type": "string",
        "format": "uuid",
        "title": "Skill Id"
      },
      "name": {
        "type": "string",
        "title": "Name"
      },
      "version": {
        "type": "integer",
        "title": "Version"
      }
    },
    "type": "object",
    "required": [
      "skill_id",
      "name",
      "version"
    ],
    "title": "SkillRef",
    "description": "A Skill version a row refers to, to read it with GET /v1/skills/{id}/versions/{version}."
  }
};

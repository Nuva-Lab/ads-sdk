// Generated from ads_backend/openapi.json at 20c6fd9bf15f2f7dd335e0e192b58fd3ccc46d5d. Do not edit.
import type { z } from "zod";
export const backendDefinitions: Record<string, Exclude<Parameters<typeof z.fromJSONSchema>[0], boolean>> = {
  "AdCreate": {
    "properties": {
      "batch_id": {
        "type": "string",
        "format": "uuid",
        "title": "Batch Id",
        "description": "One of the caller's batches."
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version",
        "description": "Only 1 is accepted."
      },
      "composition": {
        "$ref": "#/$defs/CompositionV1",
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
      "batch_id",
      "schema_version",
      "composition",
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
      "batch_id": {
        "type": "string",
        "format": "uuid",
        "title": "Batch Id"
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version"
      },
      "composition": {
        "$ref": "#/$defs/CompositionV1"
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
  "AssetCreate": {
    "properties": {
      "upload_token": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Upload Token",
        "description": "From POST /v1/assets/uploads."
      },
      "url": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 2048
          },
          {
            "type": "null"
          }
        ],
        "title": "Url",
        "description": "An http(s) URL to fetch."
      },
      "kind": {
        "anyOf": [
          {
            "type": "string",
            "enum": [
              "image",
              "video",
              "audio"
            ]
          },
          {
            "type": "null"
          }
        ],
        "title": "Kind",
        "description": "Required with `url`."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "title": "AssetCreate"
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
      "log": {
        "items": {
          "$ref": "#/$defs/LogEntry"
        },
        "type": "array",
        "title": "Log",
        "description": "Oldest first."
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
      "log",
      "ads",
      "jobs"
    ],
    "title": "BatchOut"
  },
  "BatchPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/$defs/BatchSummary"
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
    "title": "BatchPage"
  },
  "BatchSummary": {
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
      }
    },
    "type": "object",
    "required": [
      "id",
      "intent",
      "created_at"
    ],
    "title": "BatchSummary"
  },
  "Brand": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "Stays the same across versions."
      },
      "version": {
        "type": "integer",
        "title": "Version"
      },
      "revision": {
        "type": "string",
        "format": "uuid",
        "title": "Revision",
        "description": "This version's id; content made from it records this id."
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version"
      },
      "data": {
        "$ref": "#/$defs/BrandDataV1"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At",
        "description": "When this version was saved."
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
      }
    },
    "type": "object",
    "required": [
      "id",
      "version",
      "revision",
      "schema_version",
      "data",
      "created_at",
      "assets"
    ],
    "title": "Brand"
  },
  "BrandCreate": {
    "properties": {
      "data": {
        "$ref": "#/$defs/BrandDataV1"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "data"
    ],
    "title": "BrandCreate"
  },
  "BrandDataV1": {
    "properties": {
      "name": {
        "type": "string",
        "maxLength": 200,
        "minLength": 1,
        "title": "Name"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "name"
    ],
    "title": "BrandDataV1"
  },
  "BrandPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/$defs/Brand"
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
    "title": "BrandPage"
  },
  "BrandUpdate": {
    "properties": {
      "version": {
        "type": "integer",
        "minimum": 1,
        "title": "Version",
        "description": "The version this edit is based on."
      },
      "data": {
        "$ref": "#/$defs/BrandDataV1"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "version",
      "data"
    ],
    "title": "BrandUpdate"
  },
  "CallbackOut": {
    "properties": {
      "url": {
        "type": "string",
        "title": "Url"
      },
      "status": {
        "anyOf": [
          {
            "$ref": "#/$defs/CallbackStatus"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "type": "object",
    "required": [
      "url",
      "status"
    ],
    "title": "CallbackOut"
  },
  "CallbackStatus": {
    "type": "string",
    "enum": [
      "pending",
      "sent",
      "failed"
    ],
    "title": "CallbackStatus"
  },
  "Character": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "Stays the same across versions."
      },
      "version": {
        "type": "integer",
        "title": "Version"
      },
      "revision": {
        "type": "string",
        "format": "uuid",
        "title": "Revision",
        "description": "This version's id; content made from it records this id."
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version"
      },
      "data": {
        "$ref": "#/$defs/CharacterDataV1"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At",
        "description": "When this version was saved."
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
      }
    },
    "type": "object",
    "required": [
      "id",
      "version",
      "revision",
      "schema_version",
      "data",
      "created_at",
      "assets"
    ],
    "title": "Character"
  },
  "CharacterCreate": {
    "properties": {
      "data": {
        "$ref": "#/$defs/CharacterDataV1"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "data"
    ],
    "title": "CharacterCreate"
  },
  "CharacterDataV1": {
    "properties": {
      "name": {
        "type": "string",
        "maxLength": 200,
        "minLength": 1,
        "title": "Name"
      },
      "description": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 5000
          },
          {
            "type": "null"
          }
        ],
        "title": "Description",
        "description": "Looks, persona, speaking style and language."
      },
      "image_asset_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 10,
        "minItems": 1,
        "title": "Image Asset Ids",
        "description": "Image asset ids; the first is the default."
      },
      "voice_asset_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Voice Asset Id",
        "description": "An audio asset id."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "name",
      "image_asset_ids"
    ],
    "title": "CharacterDataV1"
  },
  "CharacterPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/$defs/Character"
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
    "title": "CharacterPage"
  },
  "CharacterUpdate": {
    "properties": {
      "version": {
        "type": "integer",
        "minimum": 1,
        "title": "Version",
        "description": "The version this edit is based on."
      },
      "data": {
        "$ref": "#/$defs/CharacterDataV1"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "version",
      "data"
    ],
    "title": "CharacterUpdate"
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
      "script": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Script",
        "description": "The script it plans."
      },
      "specs": {
        "items": {
          "$ref": "#/$defs/Spec"
        },
        "type": "array",
        "maxItems": 30,
        "minItems": 1,
        "title": "Specs",
        "description": "One per clip."
      },
      "skill": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Skill",
        "description": "The Skill version planned with."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "specs"
    ],
    "title": "DirectingPlanDataV1",
    "x-based-on": "script"
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
    "properties": {
      "prompt": {
        "type": "string",
        "format": "uuid",
        "title": "Prompt",
        "description": "The prompt artifact to run."
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
    "required": [
      "prompt"
    ],
    "title": "GenerateVideo"
  },
  "JobOut": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "status": {
        "$ref": "#/$defs/JobStatus"
      },
      "prompt": {
        "type": "string",
        "format": "uuid",
        "title": "Prompt"
      },
      "seed": {
        "type": "integer",
        "title": "Seed"
      },
      "resolution": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Resolution"
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
      "asset": {
        "anyOf": [
          {
            "$ref": "#/$defs/AssetOut"
          },
          {
            "type": "null"
          }
        ],
        "description": "The generated clip, once completed."
      },
      "checkpoint": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Checkpoint",
        "description": "The model weights that made the clip."
      },
      "error": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Error"
      },
      "callback": {
        "anyOf": [
          {
            "$ref": "#/$defs/CallbackOut"
          },
          {
            "type": "null"
          }
        ]
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
      "status",
      "prompt",
      "seed",
      "resolution",
      "batch_id",
      "asset",
      "checkpoint",
      "error",
      "callback",
      "created_at"
    ],
    "title": "JobOut"
  },
  "JobStatus": {
    "type": "string",
    "enum": [
      "queued",
      "running",
      "completed",
      "failed",
      "cancelled"
    ],
    "title": "JobStatus"
  },
  "LogEntry": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "text": {
        "type": "string",
        "title": "Text"
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
      "text",
      "created_at"
    ],
    "title": "LogEntry"
  },
  "LogEntryCreate": {
    "properties": {
      "text": {
        "type": "string",
        "maxLength": 10000,
        "minLength": 1,
        "title": "Text",
        "description": "What was changed in the batch, and why."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "text"
    ],
    "title": "LogEntryCreate"
  },
  "MainRequest": {
    "properties": {
      "version": {
        "type": "integer",
        "minimum": 1,
        "title": "Version"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "version"
    ],
    "title": "MainRequest"
  },
  "Product": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "Stays the same across versions."
      },
      "version": {
        "type": "integer",
        "title": "Version"
      },
      "revision": {
        "type": "string",
        "format": "uuid",
        "title": "Revision",
        "description": "This version's id; content made from it records this id."
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version"
      },
      "data": {
        "$ref": "#/$defs/ProductDataV1"
      },
      "brand_id": {
        "type": "string",
        "format": "uuid",
        "title": "Brand Id",
        "description": "The Brand it belongs to (the Brand's id)."
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At",
        "description": "When this version was saved."
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
      }
    },
    "type": "object",
    "required": [
      "id",
      "version",
      "revision",
      "schema_version",
      "data",
      "brand_id",
      "created_at",
      "assets"
    ],
    "title": "Product"
  },
  "ProductCreate": {
    "properties": {
      "data": {
        "$ref": "#/$defs/ProductDataV1"
      },
      "brand_id": {
        "type": "string",
        "format": "uuid",
        "title": "Brand Id",
        "description": "The Brand it belongs to (the Brand's id)."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "data",
      "brand_id"
    ],
    "title": "ProductCreate"
  },
  "ProductDataV1": {
    "properties": {
      "name": {
        "type": "string",
        "maxLength": 200,
        "minLength": 1,
        "title": "Name"
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
  "ProductPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/$defs/Product"
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
    "title": "ProductPage"
  },
  "ProductUpdate": {
    "properties": {
      "version": {
        "type": "integer",
        "minimum": 1,
        "title": "Version",
        "description": "The version this edit is based on."
      },
      "data": {
        "$ref": "#/$defs/ProductDataV1"
      },
      "brand_id": {
        "type": "string",
        "format": "uuid",
        "title": "Brand Id",
        "description": "The Brand it belongs to (the Brand's id)."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "version",
      "data",
      "brand_id"
    ],
    "title": "ProductUpdate"
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
      "plan": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Plan",
        "description": "The directing plan it comes from."
      },
      "clip_key": {
        "anyOf": [
          {
            "type": "string",
            "pattern": "^[A-Za-z0-9_-]{1,64}$"
          },
          {
            "type": "null"
          }
        ],
        "title": "Clip Key",
        "description": "Its spec in `plan`."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "prompt"
    ],
    "title": "PromptDataV1",
    "description": "What POST /v1/videos takes to describe a clip; seed, resolution and callback belong to the\nJob. Each list's order numbers its references in the prompt: <Picture 1>, <Video 1>, ...\nThe total number of references a model takes is checked when the prompt is used.",
    "x-based-on": "plan"
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
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "data"
    ],
    "title": "PromptVersionCreate"
  },
  "RegisteredSkill": {
    "properties": {
      "skill": {
        "$ref": "#/$defs/SkillOut"
      },
      "version": {
        "$ref": "#/$defs/SkillVersionOut"
      }
    },
    "type": "object",
    "required": [
      "skill",
      "version"
    ],
    "title": "RegisteredSkill"
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
      "product": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Product",
        "description": "The Product version written for: its `revision`."
      },
      "text": {
        "type": "string",
        "maxLength": 65536,
        "minLength": 1,
        "title": "Text",
        "description": "The script, in markdown."
      },
      "skill": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Skill",
        "description": "The Skill version written with."
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
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "data"
    ],
    "title": "ScriptVersionCreate"
  },
  "SkillDetail": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "name": {
        "type": "string",
        "title": "Name"
      },
      "platform": {
        "type": "boolean",
        "title": "Platform",
        "description": "Provided by Nuva to every customer."
      },
      "main_version": {
        "anyOf": [
          {
            "type": "integer"
          },
          {
            "type": "null"
          }
        ],
        "title": "Main Version",
        "description": "The version new work uses by default."
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      },
      "main": {
        "anyOf": [
          {
            "$ref": "#/$defs/SkillVersionOut"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "type": "object",
    "required": [
      "id",
      "name",
      "platform",
      "main_version",
      "created_at",
      "main"
    ],
    "title": "SkillDetail"
  },
  "SkillFile": {
    "properties": {
      "path": {
        "type": "string",
        "title": "Path"
      },
      "bytes": {
        "type": "integer",
        "title": "Bytes"
      },
      "sha256": {
        "type": "string",
        "title": "Sha256"
      },
      "download_url": {
        "type": "string",
        "title": "Download Url"
      }
    },
    "type": "object",
    "required": [
      "path",
      "bytes",
      "sha256",
      "download_url"
    ],
    "title": "SkillFile"
  },
  "SkillOut": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "name": {
        "type": "string",
        "title": "Name"
      },
      "platform": {
        "type": "boolean",
        "title": "Platform",
        "description": "Provided by Nuva to every customer."
      },
      "main_version": {
        "anyOf": [
          {
            "type": "integer"
          },
          {
            "type": "null"
          }
        ],
        "title": "Main Version",
        "description": "The version new work uses by default."
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
      "name",
      "platform",
      "main_version",
      "created_at"
    ],
    "title": "SkillOut"
  },
  "SkillPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/$defs/SkillOut"
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
    "title": "SkillPage"
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
  },
  "SkillRegistration": {
    "properties": {
      "files": {
        "additionalProperties": {
          "type": "string"
        },
        "type": "object",
        "title": "Files",
        "description": "Path → UTF-8 text. `SKILL.md` is required; at most 64 files, 262144 bytes each and 786432 in all."
      },
      "attributes": {
        "additionalProperties": true,
        "type": "object",
        "title": "Attributes",
        "description": "Fields for the Agent's loader (e.g. preloaded files, host calls), stored and returned as given.",
        "default": {}
      },
      "description": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 1000
          },
          {
            "type": "null"
          }
        ],
        "title": "Description"
      },
      "note": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 2000
          },
          {
            "type": "null"
          }
        ],
        "title": "Note",
        "description": "What this version changes."
      },
      "source": {
        "anyOf": [
          {
            "$ref": "#/$defs/SkillSource"
          },
          {
            "type": "null"
          }
        ],
        "description": "Where the files came from, when published from a repository."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "files"
    ],
    "title": "SkillRegistration"
  },
  "SkillSource": {
    "properties": {
      "repo": {
        "type": "string",
        "maxLength": 300,
        "minLength": 1,
        "title": "Repo",
        "description": "e.g. github.com/Nuva-Lab/WhatIf"
      },
      "commit": {
        "type": "string",
        "pattern": "^[0-9a-f]{7,64}$",
        "title": "Commit"
      },
      "path": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 300
          },
          {
            "type": "null"
          }
        ],
        "title": "Path",
        "description": "The Skill's directory."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "repo",
      "commit"
    ],
    "title": "SkillSource"
  },
  "SkillVersionOut": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The version's id; content made with it records this id."
      },
      "skill_id": {
        "type": "string",
        "format": "uuid",
        "title": "Skill Id"
      },
      "version": {
        "type": "integer",
        "title": "Version"
      },
      "description": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Description"
      },
      "note": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Note"
      },
      "source": {
        "anyOf": [
          {
            "$ref": "#/$defs/SkillSource"
          },
          {
            "type": "null"
          }
        ]
      },
      "attributes": {
        "additionalProperties": true,
        "type": "object",
        "title": "Attributes"
      },
      "files": {
        "items": {
          "$ref": "#/$defs/SkillFile"
        },
        "type": "array",
        "title": "Files"
      },
      "download_url_expires_at": {
        "type": "string",
        "format": "date-time",
        "title": "Download Url Expires At"
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
      "skill_id",
      "version",
      "description",
      "note",
      "source",
      "attributes",
      "files",
      "download_url_expires_at",
      "created_at"
    ],
    "title": "SkillVersionOut"
  },
  "Spec": {
    "properties": {
      "clip_key": {
        "type": "string",
        "pattern": "^[A-Za-z0-9_-]{1,64}$",
        "title": "Clip Key",
        "description": "Lines the clip's prompt up with this spec."
      },
      "text": {
        "type": "string",
        "maxLength": 16000,
        "minLength": 1,
        "title": "Text",
        "description": "Picture, shots and lines, in markdown."
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
      "clip_key",
      "text"
    ],
    "title": "Spec"
  },
  "TokenRequest": {
    "properties": {
      "external_user_id": {
        "type": "string",
        "maxLength": 255,
        "minLength": 1,
        "pattern": "^[^\\x00-\\x1f\\x7f]+$",
        "title": "External User Id",
        "description": "The user's id in the customer's own system. The first token for an id creates the user; later tokens for the same id identify the same user."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "external_user_id"
    ],
    "title": "TokenRequest"
  },
  "TokenResponse": {
    "properties": {
      "access_token": {
        "type": "string",
        "title": "Access Token",
        "description": "ES256 JWT, sent as `Authorization: Bearer <token>`."
      },
      "token_type": {
        "type": "string",
        "title": "Token Type",
        "default": "Bearer"
      },
      "expires_at": {
        "type": "string",
        "format": "date-time",
        "title": "Expires At",
        "description": "Request a new token before this time."
      },
      "user": {
        "$ref": "#/$defs/TokenUser"
      }
    },
    "type": "object",
    "required": [
      "access_token",
      "expires_at",
      "user"
    ],
    "title": "TokenResponse"
  },
  "TokenUser": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "Nuva's id for the user; the `sub` claim of the token."
      },
      "external_user_id": {
        "type": "string",
        "title": "External User Id"
      }
    },
    "type": "object",
    "required": [
      "id",
      "external_user_id"
    ],
    "title": "TokenUser"
  },
  "UploadOut": {
    "properties": {
      "upload_url": {
        "type": "string",
        "title": "Upload Url",
        "description": "PUT the file's bytes here, before expires_at."
      },
      "upload_token": {
        "type": "string",
        "title": "Upload Token",
        "description": "Send to POST /v1/assets after the PUT succeeds."
      },
      "expires_at": {
        "type": "string",
        "format": "date-time",
        "title": "Expires At"
      },
      "max_bytes": {
        "type": "integer",
        "title": "Max Bytes"
      }
    },
    "type": "object",
    "required": [
      "upload_url",
      "upload_token",
      "expires_at",
      "max_bytes"
    ],
    "title": "UploadOut"
  },
  "UploadRequest": {
    "properties": {
      "kind": {
        "type": "string",
        "enum": [
          "image",
          "video",
          "audio"
        ],
        "title": "Kind"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "kind"
    ],
    "title": "UploadRequest"
  }
};

// Generated from ads_backend/openapi.json at pending. Do not edit.
import type { z } from "zod";
export const backendDefinitions: Record<string, Exclude<Parameters<typeof z.fromJSONSchema>[0], boolean>> = {
  "AdOut": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The Ad's id."
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
        "description": "The Batch it belongs to; null when none."
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version",
        "description": "The version of `composition`'s format."
      },
      "composition": {
        "anyOf": [
          {
            "$ref": "#/$defs/CompositionReadV1"
          },
          {
            "type": "null"
          }
        ],
        "description": "How the final video was put together: its clips in order and the audio under them; null when not known."
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
        "title": "Created At",
        "description": "When the Ad was created."
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
        "title": "Items",
        "description": "The Ads on this page, newest first."
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
      },
      "label": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 200,
            "minLength": 1
          },
          {
            "type": "null"
          }
        ],
        "title": "Label",
        "description": "A short name for what the file shows, e.g. which part of a product package."
      },
      "description": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 2000,
            "minLength": 1
          },
          {
            "type": "null"
          }
        ],
        "title": "Description",
        "description": "A longer description of what the file shows."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "title": "AssetCreate"
  },
  "AssetEdit": {
    "properties": {
      "label": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 200,
            "minLength": 1
          },
          {
            "type": "null"
          }
        ],
        "title": "Label",
        "description": "A short name for what the file shows; null removes it."
      },
      "description": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 2000,
            "minLength": 1
          },
          {
            "type": "null"
          }
        ],
        "title": "Description",
        "description": "A longer description of what the file shows; null removes it."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "title": "AssetEdit"
  },
  "AssetOut": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The asset's id."
      },
      "kind": {
        "type": "string",
        "enum": [
          "image",
          "video",
          "audio"
        ],
        "title": "Kind",
        "description": "`image`, `video` or `audio`."
      },
      "mime": {
        "type": "string",
        "title": "Mime",
        "description": "The file's MIME type, as detected from its content."
      },
      "source": {
        "$ref": "#/$defs/AssetSource",
        "description": "`uploaded` (an upload or a URL you registered) or `generated` (a Job's clip)."
      },
      "size_bytes": {
        "type": "integer",
        "title": "Size Bytes",
        "description": "The file's size in bytes."
      },
      "metadata": {
        "additionalProperties": true,
        "type": "object",
        "title": "Metadata",
        "description": "width and height for images; duration_ms otherwise."
      },
      "label": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Label",
        "description": "A short name for what the file shows, given at upload or edited since."
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
        "title": "Description",
        "description": "A longer description of what the file shows, given at upload or edited since."
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At",
        "description": "When the asset was registered."
      },
      "download_url": {
        "type": "string",
        "title": "Download Url",
        "description": "A temporary URL to download the file, until `download_url_expires_at`."
      },
      "download_url_expires_at": {
        "type": "string",
        "format": "date-time",
        "title": "Download Url Expires At",
        "description": "When `download_url` stops working: an hour after this response."
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
        "title": "Id",
        "description": "The Ad's id."
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
        "title": "Created At",
        "description": "When the Ad was created."
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
  "BatchListed": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The Batch's id."
      },
      "intent": {
        "type": "string",
        "title": "Intent",
        "description": "Its title and purpose: what it tries."
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At",
        "description": "When the Batch was created."
      },
      "ads": {
        "anyOf": [
          {
            "items": {
              "$ref": "#/$defs/BatchAd"
            },
            "type": "array"
          },
          {
            "type": "null"
          }
        ],
        "title": "Ads",
        "description": "Oldest first; read each with GET /v1/ads/{id}."
      },
      "jobs": {
        "anyOf": [
          {
            "additionalProperties": {
              "type": "integer"
            },
            "type": "object"
          },
          {
            "type": "null"
          }
        ],
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
    "title": "BatchListed",
    "description": "A Batch in a list: as GET /v1/batches/{id} reads it. SDKs before the version header read\nit without its Ads and Job counts (BatchSummary)."
  },
  "BatchOut": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The Batch's id."
      },
      "intent": {
        "type": "string",
        "title": "Intent",
        "description": "Its title and purpose: what it tries."
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At",
        "description": "When the Batch was created."
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
  "BatchPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/$defs/BatchListed"
        },
        "type": "array",
        "title": "Items",
        "description": "The Batches on this page, newest first."
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
  "Brand": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "Its id: the same for every version. A reference to it is `{id, version?}`; without `version` it means the latest."
      },
      "version": {
        "type": "integer",
        "title": "Version",
        "description": "1 for the first version, then one more per edit."
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version",
        "description": "The version of `data`'s format."
      },
      "data": {
        "$ref": "#/$defs/BrandDataV1",
        "description": "The brand's details."
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
        "$ref": "#/$defs/BrandDataV1",
        "description": "The brand's details."
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
        "title": "Name",
        "description": "The brand's name."
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
        "description": "What the brand is and stands for, given to the Script writer as context."
      },
      "attributes": {
        "additionalProperties": {
          "$ref": "#/$defs/JsonValue"
        },
        "type": "object",
        "title": "Attributes",
        "description": "More about the brand as JSON, given to the Script writer as context. IDs here are not references: they grant no access to what they name."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "name"
    ],
    "title": "BrandDataV1"
  },
  "BrandEdit": {
    "properties": {
      "version": {
        "type": "integer",
        "minimum": 1,
        "title": "Version",
        "description": "The version you read. If someone saved a newer one since, the edit is refused with 409 REVISION_CONFLICT: read the brand again."
      },
      "data": {
        "$ref": "#/$defs/BrandEditData",
        "description": "Only the fields to change; the rest keep their values. A list is replaced as a whole: `[]` empties it, and `null` clears an optional value."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "version"
    ],
    "title": "BrandEdit"
  },
  "BrandEditData": {
    "properties": {
      "name": {
        "type": "string",
        "maxLength": 200,
        "minLength": 1,
        "title": "Name",
        "description": "The brand's name."
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
        "description": "What the brand is and stands for, given to the Script writer as context."
      },
      "attributes": {
        "additionalProperties": {
          "$ref": "#/$defs/JsonValue"
        },
        "type": "object",
        "title": "Attributes",
        "description": "More about the brand as JSON, given to the Script writer as context. IDs here are not references: they grant no access to what they name."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "title": "BrandEditData"
  },
  "BrandPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/$defs/Brand"
        },
        "type": "array",
        "title": "Items",
        "description": "The brands on this page, each at its current version, newest first."
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
  "CallbackOut": {
    "properties": {
      "url": {
        "type": "string",
        "title": "Url",
        "description": "The `callback_url` the Job was started with."
      },
      "status": {
        "anyOf": [
          {
            "$ref": "#/$defs/CallbackStatus"
          },
          {
            "type": "null"
          }
        ],
        "description": "Null until the Job ends; then `pending` while the final status is being sent (failures are retried), `sent` once your URL answered 2xx, or `failed` after the last attempt."
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
        "description": "Its id: the same for every version. A reference to it is `{id, version?}`; without `version` it means the latest."
      },
      "version": {
        "type": "integer",
        "title": "Version",
        "description": "1 for the first version, then one more per edit."
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version",
        "description": "The version of `data`'s format."
      },
      "data": {
        "$ref": "#/$defs/CharacterDataV1",
        "description": "The character's details."
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
        "$ref": "#/$defs/CharacterDataV1",
        "description": "The character's details."
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
        "title": "Name",
        "description": "The character's name."
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
  "CharacterEdit": {
    "properties": {
      "version": {
        "type": "integer",
        "minimum": 1,
        "title": "Version",
        "description": "The version you read. If someone saved a newer one since, the edit is refused with 409 REVISION_CONFLICT: read the character again."
      },
      "data": {
        "$ref": "#/$defs/CharacterEditData",
        "description": "Only the fields to change; the rest keep their values. A list is replaced as a whole: `[]` empties it, and `null` clears an optional value."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "version"
    ],
    "title": "CharacterEdit"
  },
  "CharacterEditData": {
    "properties": {
      "name": {
        "type": "string",
        "maxLength": 200,
        "minLength": 1,
        "title": "Name",
        "description": "The character's name."
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
    "title": "CharacterEditData"
  },
  "CharacterPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/$defs/Character"
        },
        "type": "array",
        "title": "Items",
        "description": "The characters on this page, each at its current version, newest first."
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
  "CompositionReadV1": {
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
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "clips"
    ],
    "title": "CompositionReadV1",
    "description": "A composition as it is read; the editor's project data is the Agent's."
  },
  "DirectingPlan": {
    "properties": {
      "kind": {
        "type": "string",
        "const": "directing_plan",
        "title": "Kind",
        "description": "Always `directing_plan`."
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
        "title": "Schema Version",
        "description": "The version of `data`'s format."
      },
      "data": {
        "$ref": "#/$defs/DirectingPlanDataV1",
        "description": "The directing plan's content."
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
        "description": "The Batch it was made in; null when none."
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
        "description": "The assets `data` or `relationships` refer to, with download URLs."
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
      "assets"
    ],
    "title": "DirectingPlan"
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
  "Error": {
    "properties": {
      "code": {
        "type": "string",
        "title": "Code",
        "description": "A stable, machine-readable code, e.g. `NOT_FOUND` or `REVISION_CONFLICT`."
      },
      "message": {
        "type": "string",
        "title": "Message",
        "description": "An explanation for people to read; branch on `code`."
      },
      "retryable": {
        "type": "boolean",
        "title": "Retryable",
        "description": "Whether the same request may succeed if sent again later."
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
        "title": "Details",
        "description": "The problems with the request's fields, when the error is about them; left out otherwise."
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
        "title": "Path",
        "description": "The request field the problem is in, as a dotted path, e.g. `data.prompt`."
      },
      "message": {
        "type": "string",
        "title": "Message",
        "description": "What is wrong with it."
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
        "$ref": "#/$defs/Error",
        "description": "What went wrong."
      },
      "request_id": {
        "type": "string",
        "title": "Request Id",
        "description": "This request's id, also sent as the `X-Request-ID` header; quote it when reporting a problem."
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
        "anyOf": [
          {
            "type": "integer",
            "maximum": 9007199254740991,
            "minimum": 0
          },
          {
            "type": "null"
          }
        ],
        "title": "Seed",
        "description": "The render's randomness. Omitted: a random seed, returned as `seed`; pass it again with the same Prompt to repeat the draw."
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
        "description": "Omitted: 768P."
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
        "description": "A Prompt of your own, saved with this Job: the prompt text and the files it names. Characters and Products reach a clip only through a Storyboard; here, attach their pictures yourself."
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
        "description": "One of the caller's batches; when omitted, a saved Prompt's Job joins the Prompt's Batch."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "title": "GenerateVideo"
  },
  "JobOut": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The Job's id."
      },
      "status": {
        "$ref": "#/$defs/JobStatus",
        "description": "`queued` (waiting, also after a failed attempt that is retried), `running`, then `completed`, `failed` or `cancelled`, which are final."
      },
      "prompt": {
        "type": "string",
        "format": "uuid",
        "title": "Prompt",
        "description": "The Prompt it renders; with raw `input`, the Prompt saved for it."
      },
      "seed": {
        "type": "integer",
        "title": "Seed",
        "description": "The seed it renders with; pass it again with the same Prompt to repeat the draw."
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
        "title": "Resolution",
        "description": "`480P` or `768P`; null when not chosen: 768P."
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
        "description": "The Batch it belongs to; null when none."
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
      "error": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Error",
        "description": "Why the Job failed, once it has; null otherwise. Read `error_code`."
      },
      "error_code": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Error Code",
        "description": "`GENERATION_FAILED` when the Job failed; null otherwise."
      },
      "callback": {
        "anyOf": [
          {
            "$ref": "#/$defs/CallbackOut"
          },
          {
            "type": "null"
          }
        ],
        "description": "Delivery of the final status to `callback_url`; null when none was given."
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At",
        "description": "When the Job was started."
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
      "error",
      "callback",
      "created_at",
      "error_code"
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
  "JsonValue": {},
  "MadeFromArtifact": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The version's id."
      }
    },
    "type": "object",
    "required": [
      "id"
    ],
    "title": "MadeFromArtifact"
  },
  "MadeFromEntity": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The entity's id."
      },
      "version": {
        "type": "integer",
        "title": "Version",
        "description": "The version it was made from."
      }
    },
    "type": "object",
    "required": [
      "id",
      "version"
    ],
    "title": "MadeFromEntity"
  },
  "MadeWithSkill": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The Skill's id."
      },
      "name": {
        "type": "string",
        "title": "Name",
        "description": "Its name."
      },
      "version": {
        "type": "integer",
        "title": "Version",
        "description": "The version that wrote it."
      }
    },
    "type": "object",
    "required": [
      "id",
      "name",
      "version"
    ],
    "title": "MadeWithSkill"
  },
  "MainRequest": {
    "properties": {
      "version": {
        "type": "integer",
        "minimum": 1,
        "title": "Version",
        "description": "The version to make main."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "version"
    ],
    "title": "MainRequest"
  },
  "MembershipIn": {
    "properties": {
      "scope": {
        "type": "string",
        "maxLength": 255,
        "minLength": 1,
        "title": "Scope",
        "description": "`customer` or an external id."
      },
      "role": {
        "$ref": "#/$defs/MembershipRole",
        "description": "`member`; `admin` (reads, writes, deletes and shares what users below the scope own); or `viewer` (reads what they own, and changes nothing of theirs)."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "scope",
      "role"
    ],
    "title": "MembershipIn"
  },
  "MembershipOut": {
    "properties": {
      "scope": {
        "type": "string",
        "title": "Scope",
        "description": "`customer` or the scope's external id."
      },
      "role": {
        "$ref": "#/$defs/MembershipRole",
        "description": "`member`, `admin` or `viewer`."
      }
    },
    "type": "object",
    "required": [
      "scope",
      "role"
    ],
    "title": "MembershipOut"
  },
  "MembershipRole": {
    "type": "string",
    "enum": [
      "member",
      "admin",
      "viewer"
    ],
    "title": "MembershipRole"
  },
  "MembershipsOut": {
    "properties": {
      "user_id": {
        "type": "string",
        "format": "uuid",
        "title": "User Id",
        "description": "Nuva's id for the user, as in its user tokens."
      },
      "external_user_id": {
        "type": "string",
        "title": "External User Id",
        "description": "The user's id in your system."
      },
      "memberships": {
        "items": {
          "$ref": "#/$defs/MembershipOut"
        },
        "type": "array",
        "title": "Memberships",
        "description": "The user's roles in scopes that aren't archived, oldest scope first."
      }
    },
    "type": "object",
    "required": [
      "user_id",
      "external_user_id",
      "memberships"
    ],
    "title": "MembershipsOut"
  },
  "MembershipsRequest": {
    "properties": {
      "memberships": {
        "items": {
          "$ref": "#/$defs/MembershipIn"
        },
        "type": "array",
        "maxItems": 100,
        "title": "Memberships",
        "description": "The user's whole set of scopes and roles, each scope once; it replaces the current set, and `[]` removes them all."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "memberships"
    ],
    "title": "MembershipsRequest"
  },
  "Product": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "Its id: the same for every version. A reference to it is `{id, version?}`; without `version` it means the latest."
      },
      "version": {
        "type": "integer",
        "title": "Version",
        "description": "1 for the first version, then one more per edit."
      },
      "schema_version": {
        "type": "integer",
        "title": "Schema Version",
        "description": "The version of `data`'s format."
      },
      "data": {
        "$ref": "#/$defs/ProductDataV2",
        "description": "The product's details."
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
        "$ref": "#/$defs/ProductDataV2",
        "description": "The product's details."
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
  "ProductDataV2": {
    "properties": {
      "name": {
        "type": "string",
        "maxLength": 200,
        "minLength": 1,
        "title": "Name",
        "description": "The product's name."
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
        "description": "What the product is, given to the Script writer as context."
      },
      "attributes": {
        "additionalProperties": {
          "$ref": "#/$defs/JsonValue"
        },
        "type": "object",
        "title": "Attributes",
        "description": "More about the product as JSON, given to the Script writer as context. IDs here are not references: they grant no access to what they name."
      },
      "image_asset_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 20,
        "title": "Image Asset Ids",
        "description": "Pictures of the product. The first is the default a Storyboard shows for `{{product}}`; `{{product:<asset id>}}` picks another.",
        "default": []
      },
      "video_asset_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 5,
        "title": "Video Asset Ids",
        "description": "Videos of the product, which a Storyboard shot can name as `{{product:<asset id>}}`.",
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
        "description": "What to say about the product; Scripts cite them as facts.",
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
        "title": "Target Audience",
        "description": "Who the ads are for."
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
        "description": "Other facts the Script writer may use.",
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
        "description": "What ads may not say or show, as the brand requires.",
        "default": []
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "name"
    ],
    "title": "ProductDataV2",
    "description": "A Product as writers read it. Its media fields are named like every other list of files\n(`image_asset_ids`, `video_asset_ids`); version 1 called them `images` and `videos`."
  },
  "ProductEdit": {
    "properties": {
      "version": {
        "type": "integer",
        "minimum": 1,
        "title": "Version",
        "description": "The version you read. If someone saved a newer one since, the edit is refused with 409 REVISION_CONFLICT: read the product again."
      },
      "data": {
        "$ref": "#/$defs/ProductEditData",
        "description": "Only the fields to change; the rest keep their values. A list is replaced as a whole: `[]` empties it, and `null` clears an optional value."
      },
      "brand_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Brand Id",
        "description": "The Brand it belongs to (the Brand's id)."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "version"
    ],
    "title": "ProductEdit"
  },
  "ProductEditData": {
    "properties": {
      "name": {
        "type": "string",
        "maxLength": 200,
        "minLength": 1,
        "title": "Name",
        "description": "The product's name."
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
        "description": "What the product is, given to the Script writer as context."
      },
      "attributes": {
        "additionalProperties": {
          "$ref": "#/$defs/JsonValue"
        },
        "type": "object",
        "title": "Attributes",
        "description": "More about the product as JSON, given to the Script writer as context. IDs here are not references: they grant no access to what they name."
      },
      "image_asset_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 20,
        "title": "Image Asset Ids",
        "description": "Pictures of the product. The first is the default a Storyboard shows for `{{product}}`; `{{product:<asset id>}}` picks another."
      },
      "video_asset_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 5,
        "title": "Video Asset Ids",
        "description": "Videos of the product, which a Storyboard shot can name as `{{product:<asset id>}}`."
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
        "description": "What to say about the product; Scripts cite them as facts."
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
        "title": "Target Audience",
        "description": "Who the ads are for."
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
        "description": "Other facts the Script writer may use."
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
        "description": "What ads may not say or show, as the brand requires."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "title": "ProductEditData"
  },
  "ProductPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/$defs/Product"
        },
        "type": "array",
        "title": "Items",
        "description": "The products on this page, each at its current version, newest first."
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
  "Prompt": {
    "properties": {
      "kind": {
        "type": "string",
        "const": "prompt",
        "title": "Kind",
        "description": "Always `prompt`."
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
        "title": "Schema Version",
        "description": "The version of `data`'s format."
      },
      "data": {
        "$ref": "#/$defs/PromptReadV1",
        "description": "The prompt's content."
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
        "description": "The Batch it was made in; null when none."
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
        "description": "The assets `data` or `relationships` refer to, with download URLs."
      },
      "storyboard": {
        "anyOf": [
          {
            "$ref": "#/$defs/MadeFromArtifact"
          },
          {
            "type": "null"
          }
        ],
        "description": "The Storyboard it was compiled from (its clip is `data.clip_id`); null for raw input."
      },
      "skill": {
        "anyOf": [
          {
            "$ref": "#/$defs/MadeWithSkill"
          },
          {
            "type": "null"
          }
        ],
        "description": "The Skill version that wrote it; null when none."
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
      "storyboard",
      "skill"
    ],
    "title": "Prompt"
  },
  "PromptDataV1": {
    "properties": {
      "prompt": {
        "type": "string",
        "maxLength": 10000,
        "minLength": 1,
        "title": "Prompt",
        "description": "What the clip shows and says. It names each attached file by its position in its list: <Picture 1> is the first of `image_asset_ids`, likewise <Video N> and <Audio N>. A new prompt must name every attached file and no other."
      },
      "image_asset_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 9,
        "title": "Image Asset Ids",
        "description": "Images the clip uses, as <Picture 1>, <Picture 2>, … in this order. A person or product looks like their picture only when it is attached here and named.",
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
        "description": "Videos the clip uses, as <Video 1>, … in order.",
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
        "description": "Audio the clip uses (a voice, music, sound), as <Audio 1>, … in order.",
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
        "title": "Seconds",
        "description": "The clip's length. Omitted: 5 seconds."
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
        "title": "Ratio",
        "description": "The frame. Omitted: 16:9. `adaptive` follows the first image or video."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "prompt"
    ],
    "title": "PromptDataV1",
    "description": "A saved Prompt: what the clip is rendered from, and which Characters and Storyboard clip\nit came from, which the Agent records. Seed, resolution and callback belong to the Job. The\ntotal number of references the model takes (12) is checked when the prompt is used."
  },
  "PromptReadV1": {
    "properties": {
      "prompt": {
        "type": "string",
        "maxLength": 10000,
        "minLength": 1,
        "title": "Prompt",
        "description": "What the clip shows and says. It names each attached file by its position in its list: <Picture 1> is the first of `image_asset_ids`, likewise <Video N> and <Audio N>. A new prompt must name every attached file and no other."
      },
      "image_asset_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 9,
        "title": "Image Asset Ids",
        "description": "Images the clip uses, as <Picture 1>, <Picture 2>, … in this order. A person or product looks like their picture only when it is attached here and named.",
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
        "description": "Videos the clip uses, as <Video 1>, … in order.",
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
        "description": "Audio the clip uses (a voice, music, sound), as <Audio 1>, … in order.",
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
        "title": "Seconds",
        "description": "The clip's length. Omitted: 5 seconds."
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
        "title": "Ratio",
        "description": "The frame. Omitted: 16:9. `adaptive` follows the first image or video."
      },
      "clip_id": {
        "anyOf": [
          {
            "type": "string",
            "pattern": "^C\\d{2}$"
          },
          {
            "type": "null"
          }
        ],
        "title": "Clip Id",
        "description": "For a Prompt compiled from a Storyboard: the clip it renders (`C01`, …)."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "prompt"
    ],
    "title": "PromptReadV1",
    "description": "A saved Prompt as it is read. Which Character versions it shows is the Agent's record."
  },
  "PromptVersionCreate": {
    "properties": {
      "data": {
        "$ref": "#/$defs/PromptDataV1",
        "description": "The prompt's content."
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
  "RawPromptDataV1": {
    "properties": {
      "prompt": {
        "type": "string",
        "maxLength": 10000,
        "minLength": 1,
        "title": "Prompt",
        "description": "What the clip shows and says. It names each attached file by its position in its list: <Picture 1> is the first of `image_asset_ids`, likewise <Video N> and <Audio N>. A new prompt must name every attached file and no other."
      },
      "image_asset_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 9,
        "title": "Image Asset Ids",
        "description": "Images the clip uses, as <Picture 1>, <Picture 2>, … in this order. A person or product looks like their picture only when it is attached here and named.",
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
        "description": "Videos the clip uses, as <Video 1>, … in order.",
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
        "description": "Audio the clip uses (a voice, music, sound), as <Audio 1>, … in order.",
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
        "title": "Seconds",
        "description": "The clip's length. Omitted: 5 seconds."
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
        "title": "Ratio",
        "description": "The frame. Omitted: 16:9. `adaptive` follows the first image or video."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "prompt"
    ],
    "title": "RawPromptDataV1",
    "description": "What a raw render takes: the prompt text and the files it names, the length and the frame,\nwhich is all the video model sees."
  },
  "RawPromptInput": {
    "properties": {
      "schema_version": {
        "type": "integer",
        "const": 1,
        "title": "Schema Version",
        "description": "The version of `data`'s format: 1."
      },
      "data": {
        "$ref": "#/$defs/RawPromptDataV1",
        "description": "What the clip is rendered from: the prompt text, the files it names, the length and the frame."
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
  "RegisteredSkill": {
    "properties": {
      "skill": {
        "$ref": "#/$defs/SkillOut",
        "description": "The Skill."
      },
      "version": {
        "$ref": "#/$defs/SkillVersionOut",
        "description": "The new version, or the latest one when its content was the same."
      }
    },
    "type": "object",
    "required": [
      "skill",
      "version"
    ],
    "title": "RegisteredSkill"
  },
  "ScopeOut": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "Nuva's id for the scope."
      },
      "external_id": {
        "type": "string",
        "title": "External Id",
        "description": "Your id for the org or group, as in its path."
      },
      "kind": {
        "type": "string",
        "enum": [
          "org",
          "group"
        ],
        "title": "Kind",
        "description": "`org` or `group`."
      },
      "parent": {
        "type": "string",
        "title": "Parent",
        "description": "The parent's external id, or `customer` for the root."
      },
      "name": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Name",
        "description": "Its display name; null when none was given."
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At",
        "description": "When the scope was first put."
      }
    },
    "type": "object",
    "required": [
      "id",
      "external_id",
      "kind",
      "parent",
      "name",
      "created_at"
    ],
    "title": "ScopeOut"
  },
  "ScopePage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/$defs/ScopeOut"
        },
        "type": "array",
        "title": "Items",
        "description": "The orgs and groups on this page that aren't archived, newest first."
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
        "description": "Pass as `cursor` for the next page; null on the last page."
      }
    },
    "type": "object",
    "required": [
      "items",
      "next_cursor"
    ],
    "title": "ScopePage"
  },
  "ScopeRequest": {
    "properties": {
      "kind": {
        "type": "string",
        "enum": [
          "org",
          "group"
        ],
        "title": "Kind",
        "description": "`org` (under the customer) or `group` (under an org)."
      },
      "parent": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 255
          },
          {
            "type": "null"
          }
        ],
        "title": "Parent",
        "description": "A group's org, by its external id."
      },
      "name": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 200
          },
          {
            "type": "null"
          }
        ],
        "title": "Name",
        "description": "A display name. Every PUT sets it, so leaving it out clears it."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "kind"
    ],
    "title": "ScopeRequest"
  },
  "Script": {
    "properties": {
      "kind": {
        "type": "string",
        "const": "script",
        "title": "Kind",
        "description": "Always `script`."
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
        "title": "Schema Version",
        "description": "The version of `data`'s format."
      },
      "data": {
        "$ref": "#/$defs/ScriptDataV1",
        "description": "The script's content."
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
        "description": "The Batch it was made in; null when none."
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
        "description": "The assets `data` or `relationships` refer to, with download URLs."
      },
      "product": {
        "anyOf": [
          {
            "$ref": "#/$defs/MadeFromEntity"
          },
          {
            "type": "null"
          }
        ],
        "description": "The Product version it was written for."
      },
      "skill": {
        "anyOf": [
          {
            "$ref": "#/$defs/MadeWithSkill"
          },
          {
            "type": "null"
          }
        ],
        "description": "The Skill version that wrote it; null when none."
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
      "product",
      "skill"
    ],
    "title": "Script"
  },
  "ScriptDataV1": {
    "properties": {
      "text": {
        "type": "string",
        "maxLength": 65536,
        "minLength": 1,
        "title": "Text",
        "description": "The Script, encoded by the SDK (`nuva.script`); read it as the SDK's `content`."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "text"
    ],
    "title": "ScriptDataV1"
  },
  "ShareAccess": {
    "type": "string",
    "enum": [
      "read",
      "write"
    ],
    "title": "ShareAccess"
  },
  "ShareOut": {
    "properties": {
      "kind": {
        "type": "string",
        "title": "Kind",
        "description": "The item's kind, as in the path."
      },
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The shared item: an asset's id, an entity's id, or an Artifact's first version's id. A share covers every version."
      },
      "scope": {
        "type": "string",
        "title": "Scope",
        "description": "The scope it is shared with: `customer` or an external id."
      },
      "access": {
        "$ref": "#/$defs/ShareAccess",
        "description": "`read` (see and use) or `write` (also edit)."
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At",
        "description": "When the item was first shared with this scope."
      }
    },
    "type": "object",
    "required": [
      "kind",
      "id",
      "scope",
      "access",
      "created_at"
    ],
    "title": "ShareOut"
  },
  "ShareRequest": {
    "properties": {
      "access": {
        "$ref": "#/$defs/ShareAccess",
        "description": "`read` (see and use) or `write` (also edit)."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "access"
    ],
    "title": "ShareRequest"
  },
  "SharesOut": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/$defs/ShareOut"
        },
        "type": "array",
        "title": "Items",
        "description": "The item's shares with scopes that aren't archived, oldest first."
      }
    },
    "type": "object",
    "required": [
      "items"
    ],
    "title": "SharesOut"
  },
  "SkillFile": {
    "properties": {
      "path": {
        "type": "string",
        "title": "Path",
        "description": "The file's path in the Skill, e.g. `SKILL.md`."
      },
      "bytes": {
        "type": "integer",
        "title": "Bytes",
        "description": "Its size in bytes."
      },
      "sha256": {
        "type": "string",
        "title": "Sha256",
        "description": "The SHA-256 of its content, in hex."
      },
      "download_url": {
        "type": "string",
        "title": "Download Url",
        "description": "A temporary URL for its content, until `download_url_expires_at`."
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
  "SkillListed": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The Skill's id."
      },
      "name": {
        "type": "string",
        "title": "Name",
        "description": "Its name, as registered."
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
        "title": "Created At",
        "description": "When its first version was registered."
      },
      "version": {
        "anyOf": [
          {
            "type": "integer"
          },
          {
            "type": "null"
          }
        ],
        "title": "Version",
        "description": "The version shown here: the latest."
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
        "title": "Description",
        "description": "Its description, as registered."
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
        "title": "Note",
        "description": "What this version changes."
      },
      "attributes": {
        "anyOf": [
          {
            "additionalProperties": true,
            "type": "object"
          },
          {
            "type": "null"
          }
        ],
        "title": "Attributes",
        "description": "The fields for the Agent's loader, as registered."
      },
      "files": {
        "anyOf": [
          {
            "items": {
              "$ref": "#/$defs/SkillFile"
            },
            "type": "array"
          },
          {
            "type": "null"
          }
        ],
        "title": "Files",
        "description": "Its files, by path, each with a download URL."
      },
      "download_url_expires_at": {
        "anyOf": [
          {
            "type": "string",
            "format": "date-time"
          },
          {
            "type": "null"
          }
        ],
        "title": "Download Url Expires At",
        "description": "When the files' download URLs stop working: in an hour."
      }
    },
    "type": "object",
    "required": [
      "id",
      "name",
      "platform",
      "main_version",
      "created_at",
      "version",
      "description",
      "note",
      "attributes",
      "files",
      "download_url_expires_at"
    ],
    "title": "SkillListed",
    "description": "A Skill in a list, at its latest version; SDKs before the version header read it without\none (SkillOut)."
  },
  "SkillOut": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The Skill's id."
      },
      "name": {
        "type": "string",
        "title": "Name",
        "description": "Its name, as in PUT /v1/admin/skills/{name}."
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
        "title": "Created At",
        "description": "When its first version was registered."
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
          "$ref": "#/$defs/SkillListed"
        },
        "type": "array",
        "title": "Items",
        "description": "The Skills on this page, newest first, each at its latest version."
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
  "SkillRead": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id",
        "description": "The Skill's id."
      },
      "name": {
        "type": "string",
        "title": "Name",
        "description": "Its name, as registered."
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
        "title": "Created At",
        "description": "When its first version was registered."
      },
      "version": {
        "anyOf": [
          {
            "type": "integer"
          },
          {
            "type": "null"
          }
        ],
        "title": "Version",
        "description": "The version shown here."
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
        "title": "Description",
        "description": "Its description, as registered."
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
        "title": "Note",
        "description": "What this version changes."
      },
      "attributes": {
        "anyOf": [
          {
            "additionalProperties": true,
            "type": "object"
          },
          {
            "type": "null"
          }
        ],
        "title": "Attributes",
        "description": "The fields for the Agent's loader, as registered."
      },
      "files": {
        "anyOf": [
          {
            "items": {
              "$ref": "#/$defs/SkillFile"
            },
            "type": "array"
          },
          {
            "type": "null"
          }
        ],
        "title": "Files",
        "description": "Its files, by path, each with a download URL."
      },
      "download_url_expires_at": {
        "anyOf": [
          {
            "type": "string",
            "format": "date-time"
          },
          {
            "type": "null"
          }
        ],
        "title": "Download Url Expires At",
        "description": "When the files' download URLs stop working: in an hour."
      }
    },
    "type": "object",
    "required": [
      "id",
      "name",
      "platform",
      "main_version",
      "created_at",
      "version",
      "description",
      "note",
      "attributes",
      "files",
      "download_url_expires_at"
    ],
    "title": "SkillRead",
    "description": "A Skill at one version: the latest, or the one asked for. SDKs before the version header\nread the Skill with its `main` version (SkillDetail)."
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
        "title": "Description",
        "description": "What the Skill is for, kept with this version."
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
        "title": "Commit",
        "description": "The commit, in hex."
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
        "title": "Skill Id",
        "description": "The Skill it is a version of."
      },
      "version": {
        "type": "integer",
        "title": "Version",
        "description": "1 for the first version, then one more per new version."
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
        "title": "Description",
        "description": "The description registered with it."
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
        "title": "Note",
        "description": "What this version changes, as registered."
      },
      "attributes": {
        "additionalProperties": true,
        "type": "object",
        "title": "Attributes",
        "description": "The fields for the Agent's loader registered with it, as given."
      },
      "files": {
        "items": {
          "$ref": "#/$defs/SkillFile"
        },
        "type": "array",
        "title": "Files",
        "description": "Its files, by path, each with a download URL."
      },
      "download_url_expires_at": {
        "type": "string",
        "format": "date-time",
        "title": "Download Url Expires At",
        "description": "When the files' download URLs stop working: an hour after this response."
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At",
        "description": "When this version was registered."
      }
    },
    "type": "object",
    "required": [
      "id",
      "skill_id",
      "version",
      "description",
      "note",
      "attributes",
      "files",
      "download_url_expires_at",
      "created_at"
    ],
    "title": "SkillVersionOut"
  },
  "Storyboard": {
    "properties": {
      "kind": {
        "type": "string",
        "const": "storyboard",
        "title": "Kind",
        "description": "Always `storyboard`."
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
        "title": "Schema Version",
        "description": "The version of `data`'s format."
      },
      "data": {
        "$ref": "#/$defs/StoryboardDataV1",
        "description": "The storyboard's content."
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
        "description": "The Batch it was made in; null when none."
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
        "description": "The assets `data` or `relationships` refer to, with download URLs."
      },
      "script": {
        "anyOf": [
          {
            "$ref": "#/$defs/MadeFromArtifact"
          },
          {
            "type": "null"
          }
        ],
        "description": "The Script it shoots."
      },
      "product": {
        "anyOf": [
          {
            "$ref": "#/$defs/MadeFromEntity"
          },
          {
            "type": "null"
          }
        ],
        "description": "The Product version it shows."
      },
      "characters": {
        "items": {
          "$ref": "#/$defs/MadeFromEntity"
        },
        "type": "array",
        "title": "Characters",
        "description": "The Character versions it casts.",
        "default": []
      },
      "skill": {
        "anyOf": [
          {
            "$ref": "#/$defs/MadeWithSkill"
          },
          {
            "type": "null"
          }
        ],
        "description": "The Skill version that wrote it; null when none."
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
      "script",
      "product",
      "characters",
      "skill"
    ],
    "title": "Storyboard"
  },
  "StoryboardDataV1": {
    "properties": {
      "text": {
        "type": "string",
        "maxLength": 65536,
        "minLength": 1,
        "title": "Text",
        "description": "How a Script is shot: casting, locations, timed shots and each clip's references, encoded by the SDK (`nuva.storyboard`). It is `based_on` its Script and the Characters it casts."
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "text"
    ],
    "title": "StoryboardDataV1"
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
        "description": "Always `Bearer`.",
        "default": "Bearer"
      },
      "expires_at": {
        "type": "string",
        "format": "date-time",
        "title": "Expires At",
        "description": "Request a new token before this time."
      },
      "user": {
        "$ref": "#/$defs/TokenUser",
        "description": "The user the token is for."
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
        "title": "External User Id",
        "description": "The user's id in your system, as you sent it."
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
        "title": "Expires At",
        "description": "When `upload_url` and `upload_token` stop working: an hour after the request."
      },
      "max_bytes": {
        "type": "integer",
        "title": "Max Bytes",
        "description": "The largest file of this kind, in bytes; a larger one is refused when registered (413 ASSET_TOO_LARGE)."
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
        "title": "Kind",
        "description": "What you will upload: `image` (JPEG, PNG or WebP), `video` (MP4) or `audio` (MP3, WAV or MP4)."
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

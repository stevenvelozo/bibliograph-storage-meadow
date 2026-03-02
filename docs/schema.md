# Database Schema

## Overview

The storage provider manages three database tables. When using the SQLite provider, these tables are created automatically during `initialize()`. For other providers, the tables must already exist in the database.

## BibliographSource

Registry of data sources. Each source is identified by a unique `SourceHash`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `IDBibliographSource` | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| `GUIDBibliographSource` | TEXT | DEFAULT '0000...' | Auto-generated GUID |
| `CreateDate` | TEXT | | Record creation timestamp |
| `CreatingIDUser` | INTEGER | NOT NULL DEFAULT 0 | Creating user ID |
| `UpdateDate` | TEXT | | Last update timestamp |
| `UpdatingIDUser` | INTEGER | NOT NULL DEFAULT 0 | Updating user ID |
| `Deleted` | INTEGER | NOT NULL DEFAULT 0 | Soft delete flag (0/1) |
| `DeleteDate` | TEXT | | Deletion timestamp |
| `DeletingIDUser` | INTEGER | NOT NULL DEFAULT 0 | Deleting user ID |
| `SourceHash` | TEXT | NOT NULL DEFAULT '' | Unique source identifier (up to 512 chars) |

## BibliographRecord

Primary record storage. Each record belongs to a source (via `SourceHash`) and is identified by a `RecordGUID`. The record data and metadata are stored as serialized JSON.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `IDBibliographRecord` | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| `GUIDBibliographRecord` | TEXT | DEFAULT '0000...' | Auto-generated GUID |
| `CreateDate` | TEXT | | Record creation timestamp |
| `CreatingIDUser` | INTEGER | NOT NULL DEFAULT 0 | Creating user ID |
| `UpdateDate` | TEXT | | Last update timestamp |
| `UpdatingIDUser` | INTEGER | NOT NULL DEFAULT 0 | Updating user ID |
| `Deleted` | INTEGER | NOT NULL DEFAULT 0 | Soft delete flag (0/1) |
| `DeleteDate` | TEXT | | Deletion timestamp |
| `DeletingIDUser` | INTEGER | NOT NULL DEFAULT 0 | Deleting user ID |
| `SourceHash` | TEXT | NOT NULL DEFAULT '' | Source identifier (up to 512 chars) |
| `RecordGUID` | TEXT | NOT NULL DEFAULT '' | Unique record identifier (up to 256 chars) |
| `RecordData` | TEXT | | JSON-serialized record content |
| `MetadataJSON` | TEXT | | JSON-serialized metadata (MD5, timestamps, etc.) |
| `RecordTimestamp` | INTEGER | NOT NULL DEFAULT 0 | Epoch milliseconds for temporal queries |

## BibliographDelta

Change history tracking. Each delta record stores a JSON container with an array of changes for a specific record.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `IDBibliographDelta` | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| `GUIDBibliographDelta` | TEXT | DEFAULT '0000...' | Auto-generated GUID |
| `CreateDate` | TEXT | | Record creation timestamp |
| `CreatingIDUser` | INTEGER | NOT NULL DEFAULT 0 | Creating user ID |
| `UpdateDate` | TEXT | | Last update timestamp |
| `UpdatingIDUser` | INTEGER | NOT NULL DEFAULT 0 | Updating user ID |
| `Deleted` | INTEGER | NOT NULL DEFAULT 0 | Soft delete flag (0/1) |
| `DeleteDate` | TEXT | | Deletion timestamp |
| `DeletingIDUser` | INTEGER | NOT NULL DEFAULT 0 | Deleting user ID |
| `SourceHash` | TEXT | NOT NULL DEFAULT '' | Source identifier (up to 512 chars) |
| `RecordGUID` | TEXT | NOT NULL DEFAULT '' | Record identifier (up to 256 chars) |
| `DeltaJSON` | TEXT | | JSON-serialized delta container |

## Meadow Schema Definitions

The Meadow entity schemas use standard Meadow column types:

| Meadow Type | Purpose | Columns Using |
|-------------|---------|---------------|
| `AutoIdentity` | Auto-increment primary key | `ID*` columns |
| `AutoGUID` | Auto-generated UUID | `GUID*` columns |
| `CreateDate` | Auto-set on creation | `CreateDate` |
| `CreateIDUser` | Auto-set on creation | `CreatingIDUser` |
| `UpdateDate` | Auto-set on update | `UpdateDate` |
| `UpdateIDUser` | Auto-set on update | `UpdatingIDUser` |
| `Deleted` | Soft delete flag | `Deleted` |
| `DeleteDate` | Auto-set on delete | `DeleteDate` |
| `DeleteIDUser` | Auto-set on delete | `DeletingIDUser` |
| `String` | Variable-length text | `SourceHash`, `RecordGUID` |
| `Text` | Unlimited text | `RecordData`, `MetadataJSON`, `DeltaJSON` |
| `Numeric` | Integer | `RecordTimestamp` |

## JSON Field Formats

### RecordData

The `RecordData` field stores the application's record as a JSON string. The format is entirely application-defined:

```json
{
	"title": "Example Record",
	"body": "The record content",
	"tags": ["example", "test"]
}
```

### MetadataJSON

The `MetadataJSON` field stores per-record metadata such as content hashes and ingestion timestamps:

```json
{
	"MD5": "d41d8cd98f00b204e9800998ecf8427e",
	"IngestTimestamp": 1709280000000
}
```

### DeltaJSON

The `DeltaJSON` field stores a delta container with an array of changes:

```json
{
	"RecordGUID": "record-001",
	"Deltas": [
		{
			"Timestamp": 1709280000000,
			"Changes": { "title": "Updated Title" }
		}
	]
}
```

## Source Isolation

All record and delta queries include `SourceHash` as a filter, ensuring complete isolation between data sources. Records from one source are never visible to queries for another source.

## Soft Delete Behavior

When `persistDelete()` is called, the record's `Deleted` flag is set to `1` by Meadow's built-in delete tracking. The `DeleteDate` and `DeletingIDUser` fields are also populated. Subsequent queries exclude soft-deleted records unless delete tracking is explicitly disabled.

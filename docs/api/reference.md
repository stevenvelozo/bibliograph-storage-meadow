# API Reference

Complete method reference for `bibliograph-storage-meadow`.

## Class: BibliographStorageMeadow

Extends `BibliographStorageBase` from the `bibliograph` package. Provides Meadow-backed persistence for records, metadata, and change deltas.

### Constructor

```javascript
let tmpStorage = _Pict.serviceManager.instantiateServiceProvider(
	'BibliographStorageMeadow',
	{ 'Meadow-Provider': 'SQLite' });
```

The constructor accepts:

| Parameter | Description |
|-----------|-------------|
| `pFable` | Fable/Pict instance (injected by service manager) |
| `pOptions` | Options object -- may include `Meadow-Provider` |
| `pServiceHash` | Service hash (injected by service manager) |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `Initialized` | `boolean` | `true` after `initialize()` completes successfully |
| `MeadowProvider` | `string` | Active provider name (`'SQLite'`, `'MySQL'`, `'PostgreSQL'`, etc.) |
| `meadowSource` | `Meadow` | Meadow entity for the `BibliographSource` table |
| `meadowRecord` | `Meadow` | Meadow entity for the `BibliographRecord` table |
| `meadowDelta` | `Meadow` | Meadow entity for the `BibliographDelta` table |

## Methods by Category

### Lifecycle

| Method | Description |
|--------|-------------|
| [`initialize(fCallback)`](api/initialize.md) | Create Meadow entities and ensure tables exist |

### Source Management

| Method | Description |
|--------|-------------|
| [`sourceExists(pSourceHash, fCallback)`](api/sourceExists.md) | Check whether a source is registered |
| [`sourceCreate(pSourceHash, fCallback)`](api/sourceCreate.md) | Register a new data source |

### Record Operations

| Method | Description |
|--------|-------------|
| [`exists(pSourceHash, pRecordGUID, fCallback)`](api/exists.md) | Check whether a record exists |
| [`read(pSourceHash, pRecordGUID, fCallback)`](api/read.md) | Read and parse a record's data |
| [`persistRecord(pSourceHash, pRecordGUID, pRecordJSONString, fCallback)`](api/persistRecord.md) | Create or update a record (upsert) |
| [`persistDelete(pSourceHash, pRecordGUID, fCallback)`](api/persistDelete.md) | Soft-delete a record |

### Metadata Operations

| Method | Description |
|--------|-------------|
| [`readRecordMetadata(pSourceHash, pRecordGUID, fCallback)`](api/readRecordMetadata.md) | Read a record's metadata |
| [`persistRecordMetadata(pSourceHash, pRecordGUID, pMetadata, fCallback)`](api/persistRecordMetadata.md) | Create or update a record's metadata (upsert) |

### Timestamp Operations

| Method | Description |
|--------|-------------|
| [`stampRecordTimestamp(pSourceHash, pRecordGUID, fCallback)`](api/stampRecordTimestamp.md) | Update a record's timestamp to now |

### Delta Operations

| Method | Description |
|--------|-------------|
| [`readRecordDelta(pSourceHash, pRecordGUID, fCallback)`](api/readRecordDelta.md) | Read change history for a record |
| [`persistRecordDelta(pSourceHash, pRecordMetadata, pDeltaContainer, fCallback)`](api/persistRecordDelta.md) | Create or update change history (upsert) |

### Key Enumeration

| Method | Description |
|--------|-------------|
| [`readRecordKeys(pSourceHash, fCallback)`](api/readRecordKeys.md) | List all record GUIDs for a source |
| [`readRecordKeysByTimestamp(pSourceHash, pFromTimestamp, pToTimestamp, fCallback)`](api/readRecordKeysByTimestamp.md) | List record GUIDs within a time range |

### Inherited Methods

The following method is inherited from `BibliographStorageBase`:

| Method | Description |
|--------|-------------|
| `generateDeltaContainer(pRecordGUID)` | Create an empty delta container `{ RecordGUID, Deltas: [] }` |

## Initialization Guard

Every public method (except `initialize`) checks `this.Initialized` before proceeding. If the storage provider has not been initialized, the callback receives an `Error`:

```javascript
// This will produce an error in the callback
tmpStorage.read('my-source', 'record-001',
	(pError, pData) =>
	{
		// pError.message: "Bibliograph Meadow Storage not initialized; read [my-source]:[record-001] failed."
	});
```

Always call `initialize()` and wait for its callback before using any other method.

## Upsert Pattern

All persist methods (`persistRecord`, `persistRecordMetadata`, `persistRecordDelta`) follow an upsert pattern:

1. Look up the existing row by `SourceHash` + `RecordGUID`
2. If found, update the existing row via `meadow.doUpdate()`
3. If not found, create a new row via `meadow.doCreate()`

This means callers never need to check existence before writing -- the storage layer handles it automatically.

## Error Handling

All callbacks follow the Node.js convention `(pError, pResult)`. If an operation encounters a database error or JSON parse failure, the error is passed as the first argument. Errors are also logged via `fable.log.error()`.

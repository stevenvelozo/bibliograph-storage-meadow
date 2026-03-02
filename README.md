# bibliograph-storage-meadow

Meadow DAL-backed storage provider for Bibliograph. Enables Bibliograph to persist records, metadata, and change deltas across any Meadow-supported database backend.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Multi-Backend Persistence** -- supports SQLite, PostgreSQL, MySQL, MSSQL, and any other Meadow provider
- **Bibliograph Storage Interface** -- implements the full `BibliographStorageBase` contract
- **Record CRUD** -- create, read, update (upsert), and soft-delete records
- **Metadata Management** -- per-record metadata storage (MD5 hashes, ingest timestamps, etc.)
- **Delta Tracking** -- change history containers for record versioning
- **Temporal Queries** -- enumerate record keys within a timestamp range
- **Soft Delete** -- Meadow-managed delete tracking with audit fields
- **Auto-Schema for SQLite** -- automatic table creation when using the SQLite provider

## Installation

```shell
npm install bibliograph-storage-meadow
```

## Quick Start

```javascript
const libPict = require('pict');
const libBibliographStorageMeadow = require('bibliograph-storage-meadow');
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');

let _Pict = new libPict(
	{
		"Product": "MyApp",
		"SQLite": { "DatabaseFileName": "./data/myapp.db" },
		"Meadow-Provider": "SQLite"
	});

_Pict.serviceManager.addAndInstantiateServiceType(
	'MeadowSQLiteProvider', libMeadowConnectionSQLite);

_Pict.MeadowSQLiteProvider.connectAsync(
	(pError) =>
	{
		if (pError) { return console.error(pError); }

		let tmpStorage = _Pict.serviceManager.instantiateServiceProvider(
			'BibliographStorageMeadow',
			{ 'Meadow-Provider': 'SQLite' });

		tmpStorage.initialize(
			(pInitError) =>
			{
				if (pInitError) { return console.error(pInitError); }

				// Ready for record operations
				tmpStorage.persistRecord('my-source', 'record-001',
					JSON.stringify({ title: 'Hello', body: 'World' }),
					(pErr) =>
					{
						console.log('Record persisted!');
					});
			});
	});
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `Meadow-Provider` | `SQLite` | Meadow backend provider name |

The provider name determines which Meadow connection service is used. The corresponding connection service must be registered and connected before calling `initialize()`.

## API

### Lifecycle

| Method | Description |
|--------|-------------|
| `initialize(fCallback)` | Create Meadow entities and ensure tables exist |

### Source Operations

| Method | Description |
|--------|-------------|
| `sourceExists(hash, fCallback)` | Check if a source exists |
| `sourceCreate(hash, fCallback)` | Create a new source record |

### Record Operations

| Method | Description |
|--------|-------------|
| `exists(hash, guid, fCallback)` | Check if a record exists |
| `read(hash, guid, fCallback)` | Read and parse a record |
| `persistRecord(hash, guid, json, fCallback)` | Create or update a record |
| `persistDelete(hash, guid, fCallback)` | Soft-delete a record |

### Metadata Operations

| Method | Description |
|--------|-------------|
| `readRecordMetadata(hash, guid, fCallback)` | Read record metadata |
| `persistRecordMetadata(hash, guid, meta, fCallback)` | Create or update metadata |

### Timestamp Operations

| Method | Description |
|--------|-------------|
| `stampRecordTimestamp(hash, guid, fCallback)` | Update record timestamp to now |

### Delta Operations

| Method | Description |
|--------|-------------|
| `readRecordDelta(hash, guid, fCallback)` | Read change history |
| `persistRecordDelta(hash, meta, delta, fCallback)` | Save change history |

### Key Enumeration

| Method | Description |
|--------|-------------|
| `readRecordKeys(hash, fCallback)` | List all record GUIDs for a source |
| `readRecordKeysByTimestamp(hash, from, to, fCallback)` | List record GUIDs in time range |

## Database Tables

The storage provider manages three database tables:

| Table | Purpose |
|-------|---------|
| `BibliographSource` | Data source registry (SourceHash) |
| `BibliographRecord` | Record storage (RecordData, MetadataJSON, RecordTimestamp) |
| `BibliographDelta` | Change history (DeltaJSON) |

## Part of the Retold Framework

This module bridges the Bibliograph record management system with the Meadow data access layer, enabling multi-backend database storage within the Retold application framework.

## Testing

```shell
npm test
```

Coverage:

```shell
npm run coverage
```

## Related Packages

- [bibliograph](https://github.com/stevenvelozo/bibliograph) -- Record management and deduplication framework
- [meadow](https://github.com/stevenvelozo/meadow) -- Data access layer and ORM
- [fable](https://github.com/stevenvelozo/fable) -- Application framework and service manager
- [meadow-connection-sqlite](https://github.com/stevenvelozo/meadow-connection-sqlite) -- SQLite connector (default)
- [meadow-connection-mysql](https://github.com/stevenvelozo/meadow-connection-mysql) -- MySQL connector
- [meadow-connection-postgresql](https://github.com/stevenvelozo/meadow-connection-postgresql) -- PostgreSQL connector
- [meadow-connection-mssql](https://github.com/stevenvelozo/meadow-connection-mssql) -- MSSQL connector

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

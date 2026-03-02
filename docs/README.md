# bibliograph-storage-meadow

Meadow DAL-backed storage provider for Bibliograph. This module implements the `BibliographStorageBase` interface, enabling Bibliograph to persist records, metadata, and change deltas across any Meadow-supported database backend (SQLite, PostgreSQL, MySQL, MSSQL, and others).

## Quick Start

```javascript
const libPict = require('pict');
const libBibliographStorageMeadow = require('bibliograph-storage-meadow');
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');

// 1. Create a Pict/Fable instance with settings
let _Pict = new libPict(
	{
		"Product": "MyApp",
		"SQLite": { "DatabaseFileName": "./data/myapp.db" },
		"Meadow-Provider": "SQLite"
	});

// 2. Connect to the database
_Pict.serviceManager.addAndInstantiateServiceType(
	'MeadowSQLiteProvider', libMeadowConnectionSQLite);

_Pict.MeadowSQLiteProvider.connectAsync(
	(pError) =>
	{
		if (pError) { return console.error(pError); }

		// 3. Create and initialize the storage provider
		let tmpStorage = _Pict.serviceManager.instantiateServiceProvider(
			'BibliographStorageMeadow',
			{ 'Meadow-Provider': 'SQLite' });

		tmpStorage.initialize(
			(pInitError) =>
			{
				if (pInitError) { return console.error(pInitError); }

				// 4. Use storage operations
				tmpStorage.persistRecord('my-source', 'record-001',
					JSON.stringify({ title: 'Hello', body: 'World' }),
					(pErr) =>
					{
						console.log('Record persisted!');
					});
			});
	});
```

## How It Fits

```
Bibliograph (record management)
    |
    v
 BibliographStorageBase (interface)
    |
    v
 bibliograph-storage-meadow  <-- this module
    |
    v
 Meadow (ORM / DAL)
    |
    v
 meadow-connection-* (SQLite, MySQL, PostgreSQL, MSSQL)
    |
    v
 Database
```

## Data Model

The storage provider manages three database tables:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `BibliographSource` | Data source registry | `SourceHash` |
| `BibliographRecord` | Record storage | `SourceHash`, `RecordGUID`, `RecordData`, `MetadataJSON`, `RecordTimestamp` |
| `BibliographDelta` | Change history | `SourceHash`, `RecordGUID`, `DeltaJSON` |

## Learn More

- [Quickstart Guide](quickstart.md) -- step-by-step setup
- [Architecture](architecture.md) -- system design and data flow diagrams
- [Database Schema](schema.md) -- table structures and field details
- [API Reference](api/reference.md) -- complete method documentation

## Companion Modules

| Module | Purpose |
|--------|---------|
| [bibliograph](https://github.com/stevenvelozo/bibliograph) | Record management and deduplication framework |
| [meadow](https://github.com/stevenvelozo/meadow) | Data access layer and ORM |
| [fable](https://github.com/stevenvelozo/fable) | Application framework and service manager |
| [pict](https://github.com/stevenvelozo/pict) | MVC tools and application lifecycle |
| [meadow-connection-sqlite](https://github.com/stevenvelozo/meadow-connection-sqlite) | SQLite connector (default) |
| [meadow-connection-mysql](https://github.com/stevenvelozo/meadow-connection-mysql) | MySQL connector |
| [meadow-connection-postgresql](https://github.com/stevenvelozo/meadow-connection-postgresql) | PostgreSQL connector |

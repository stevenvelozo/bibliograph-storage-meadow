# Quickstart

Get Bibliograph Meadow storage running in five steps.

## Step 1: Install

```bash
npm install bibliograph-storage-meadow bibliograph meadow meadow-connection-sqlite pict
```

The default backend is SQLite. For other databases, install the appropriate Meadow connector instead.

## Step 2: Configure and Connect

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

// Register and connect the SQLite provider
_Pict.serviceManager.addAndInstantiateServiceType(
	'MeadowSQLiteProvider', libMeadowConnectionSQLite);

_Pict.MeadowSQLiteProvider.connectAsync(
	(pError) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Database connected!');
	});
```

## Step 3: Initialize Storage

```javascript
let tmpStorage = _Pict.serviceManager.instantiateServiceProvider(
	'BibliographStorageMeadow',
	{ 'Meadow-Provider': 'SQLite' });

tmpStorage.initialize(
	(pError) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Storage initialized!');
		// Three Meadow entities are ready:
		// tmpStorage.meadowSource, tmpStorage.meadowRecord, tmpStorage.meadowDelta
	});
```

When using SQLite, the three tables (`BibliographSource`, `BibliographRecord`, `BibliographDelta`) are created automatically during initialization.

## Step 4: Persist and Read Records

```javascript
// Register a source
tmpStorage.sourceCreate('my-data-feed',
	(pError) =>
	{
		if (pError) { return console.error(pError); }

		// Create a record
		let tmpRecord = { title: 'First Entry', body: 'Hello World', tags: ['intro'] };
		tmpStorage.persistRecord('my-data-feed', 'entry-001',
			JSON.stringify(tmpRecord),
			(pPersistError) =>
			{
				if (pPersistError) { return console.error(pPersistError); }

				// Read it back
				tmpStorage.read('my-data-feed', 'entry-001',
					(pReadError, pData) =>
					{
						console.log(pData);
						// => { title: 'First Entry', body: 'Hello World', tags: ['intro'] }
					});
			});
	});
```

## Step 5: Use Metadata and Key Enumeration

```javascript
// Store metadata alongside a record
tmpStorage.persistRecordMetadata('my-data-feed', 'entry-001',
	{ MD5: 'abc123', IngestTimestamp: Date.now() },
	(pError) =>
	{
		if (pError) { return console.error(pError); }

		// Read metadata back
		tmpStorage.readRecordMetadata('my-data-feed', 'entry-001',
			(pMetaError, pMetadata) =>
			{
				console.log(pMetadata);
				// => { MD5: 'abc123', IngestTimestamp: 1709280000000 }
			});
	});

// List all record keys for a source
tmpStorage.readRecordKeys('my-data-feed',
	(pError, pKeys) =>
	{
		console.log(pKeys);
		// => ['entry-001']
	});

// List record keys within a time range
tmpStorage.readRecordKeysByTimestamp('my-data-feed', 1709200000000, 1709300000000,
	(pError, pKeys) =>
	{
		console.log('Records in range:', pKeys);
	});
```

## Using with Bibliograph

For the full Bibliograph workflow (deduplication, merging, ingestion), wire the storage provider into a Bibliograph instance:

```javascript
const libBibliograph = require('bibliograph');

let tmpBibliograph = new libBibliograph(_Pict, {});

// Set the storage backend
tmpBibliograph.storage = tmpStorage;

// Now use Bibliograph's high-level API:
// tmpBibliograph.write(), tmpBibliograph.read(), etc.
```

## Using with PostgreSQL

```javascript
const libMeadowConnectionPostgreSQL = require('meadow-connection-postgresql');

let _Pict = new libPict(
	{
		"Product": "MyApp",
		"PostgreSQL":
		{
			"Server": "localhost",
			"Port": 5432,
			"User": "postgres",
			"Password": "secret",
			"Database": "myapp"
		},
		"Meadow-Provider": "PostgreSQL"
	});

_Pict.serviceManager.addAndInstantiateServiceType(
	'MeadowPostgreSQLProvider', libMeadowConnectionPostgreSQL);

_Pict.MeadowPostgreSQLProvider.connectAsync(
	(pError) =>
	{
		if (pError) { return console.error(pError); }

		let tmpStorage = _Pict.serviceManager.instantiateServiceProvider(
			'BibliographStorageMeadow',
			{ 'Meadow-Provider': 'PostgreSQL' });

		tmpStorage.initialize(
			(pInitError) =>
			{
				// Tables must already exist for non-SQLite providers
				// Use Meadow's createTable() or manual DDL to create them
			});
	});
```

> **Note:** For non-SQLite providers, the three tables must already exist in the database. Only the SQLite provider auto-creates tables during initialization.

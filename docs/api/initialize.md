# initialize()

Create the three Meadow entity instances and ensure their backing database tables exist.

## Signature

```javascript
storage.initialize(fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | `Function` | Callback invoked as `fCallback(pError)` when initialization is complete |

## Description

`initialize()` performs three sequential steps using Fable's `Anticipate` utility:

1. **Create Meadow entities** -- instantiates `meadowSource`, `meadowRecord`, and `meadowDelta` with their respective schemas, defaults, and the configured provider
2. **Auto-create tables (SQLite only)** -- if the provider is `'SQLite'` and the SQLite connection is available, executes `CREATE TABLE IF NOT EXISTS` DDL for all three tables
3. **Set `Initialized` flag** -- marks the storage provider as ready for use

After successful initialization, the three Meadow entity instances are available as properties:
- `storage.meadowSource` -- `BibliographSource` entity
- `storage.meadowRecord` -- `BibliographRecord` entity
- `storage.meadowDelta` -- `BibliographDelta` entity

## Example

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

				console.log('Initialized:', tmpStorage.Initialized);
				// => true

				console.log('Source entity:', typeof tmpStorage.meadowSource);
				// => 'object'
			});
	});
```

## Auto-Create Tables (SQLite)

When using the SQLite provider, initialization automatically creates the three tables:

```sql
CREATE TABLE IF NOT EXISTS BibliographSource (
	IDBibliographSource INTEGER PRIMARY KEY AUTOINCREMENT,
	GUIDBibliographSource TEXT DEFAULT '00000000-0000-0000-0000-000000000000',
	CreateDate TEXT,
	CreatingIDUser INTEGER NOT NULL DEFAULT 0,
	UpdateDate TEXT,
	UpdatingIDUser INTEGER NOT NULL DEFAULT 0,
	Deleted INTEGER NOT NULL DEFAULT 0,
	DeleteDate TEXT,
	DeletingIDUser INTEGER NOT NULL DEFAULT 0,
	SourceHash TEXT NOT NULL DEFAULT ''
);
```

For non-SQLite providers (MySQL, PostgreSQL, MSSQL), the tables must already exist in the database before calling `initialize()`.

## Error Handling

If Meadow entity creation fails (e.g., missing dependencies), the error is logged and passed to the callback. If SQLite DDL execution fails, the error is similarly propagated.

## Notes

- Must be called once before any other storage method
- All other methods check `this.Initialized` and return an error if it is `false`
- The `MeadowProvider` is determined from `options['Meadow-Provider']`, then `fable.settings['Meadow-Provider']`, defaulting to `'SQLite'`

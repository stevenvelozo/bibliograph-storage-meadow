# sourceCreate()

Register a new data source in the `BibliographSource` table.

## Signature

```javascript
storage.sourceCreate(pSourceHash, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSourceHash` | `string` | Unique source identifier (up to 512 characters) |
| `fCallback` | `Function` | Callback invoked as `fCallback(pError)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | `Error\|null` | Error object if the insert failed |

## Description

Creates a new row in the `BibliographSource` table with the given `SourceHash`. Meadow automatically populates the auto-increment ID, GUID, `CreateDate`, and `CreatingIDUser` fields.

This method does **not** check for duplicate sources before inserting. If you need to avoid duplicates, call `sourceExists()` first.

## Example

```javascript
// Register a new source
tmpStorage.sourceCreate('my-data-feed',
	(pError) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Source registered successfully.');
	});
```

## Check-then-Create Pattern

```javascript
tmpStorage.sourceExists('rss-articles',
	(pError, pExists) =>
	{
		if (pError) { return console.error(pError); }

		if (!pExists)
		{
			tmpStorage.sourceCreate('rss-articles',
				(pCreateError) =>
				{
					if (pCreateError) { return console.error(pCreateError); }
					console.log('Source created.');
				});
		}
		else
		{
			console.log('Source already exists.');
		}
	});
```

## Notes

- Requires `initialize()` to have completed successfully
- Does not enforce uniqueness -- call `sourceExists()` first if needed
- The `SourceHash` acts as a logical namespace for isolating records from different data feeds
- A trace log entry is written: `Bibliograph Meadow Source Create [<hash>]`

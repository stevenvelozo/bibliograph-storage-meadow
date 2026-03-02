# sourceExists()

Check whether a data source is registered in the `BibliographSource` table.

## Signature

```javascript
storage.sourceExists(pSourceHash, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSourceHash` | `string` | Unique source identifier (up to 512 characters) |
| `fCallback` | `Function` | Callback invoked as `fCallback(pError, pExists)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | `Error\|null` | Error object if the query failed |
| `pExists` | `boolean` | `true` if a source with the given hash exists, `false` otherwise |

## Description

Queries the `BibliographSource` table using Meadow's `doCount()` to determine if any rows match the given `SourceHash`. Returns a boolean -- does not return the source record itself.

## Example

```javascript
tmpStorage.sourceExists('my-data-feed',
	(pError, pExists) =>
	{
		if (pError) { return console.error(pError); }

		if (pExists)
		{
			console.log('Source is registered.');
		}
		else
		{
			console.log('Source not found -- creating...');
			tmpStorage.sourceCreate('my-data-feed',
				(pCreateError) =>
				{
					if (pCreateError) { return console.error(pCreateError); }
					console.log('Source created.');
				});
		}
	});
```

## Typical Workflow

```
sourceExists(hash) → true?  → proceed with record operations
                   → false? → sourceCreate(hash) → proceed
```

## Notes

- Requires `initialize()` to have completed successfully
- Returns `false` (not an error) when no matching source is found
- Soft-deleted sources are excluded by Meadow's default delete tracking

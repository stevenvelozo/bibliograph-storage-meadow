# readRecordKeys()

List all record GUIDs for a given source.

## Signature

```javascript
storage.readRecordKeys(pSourceHash, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSourceHash` | `string` | Source identifier to enumerate records for |
| `fCallback` | `Function` | Callback invoked as `fCallback(pError, pKeys)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | `Error\|null` | Error object if the query failed |
| `pKeys` | `string[]` | Array of `RecordGUID` values |

## Description

Queries the `BibliographRecord` table for all non-deleted rows matching the given `SourceHash`, with no pagination limit (`setCap(0)`). Returns an array of `RecordGUID` strings extracted from the matching rows.

If no records exist for the source, an empty array is returned.

## Example

```javascript
tmpStorage.readRecordKeys('my-data-feed',
	(pError, pKeys) =>
	{
		if (pError) { return console.error(pError); }

		console.log(`Found ${pKeys.length} records:`);
		pKeys.forEach(
			(pKey) =>
			{
				console.log(' -', pKey);
			});
	});
```

## Iterating Over All Records

```javascript
// Read all records for a source
tmpStorage.readRecordKeys('my-data-feed',
	(pError, pKeys) =>
	{
		if (pError) { return console.error(pError); }

		let tmpProcessed = 0;

		pKeys.forEach(
			(pKey) =>
			{
				tmpStorage.read('my-data-feed', pKey,
					(pReadError, pData) =>
					{
						if (pReadError) { return console.error(pReadError); }

						console.log(`Record ${pKey}:`, pData.title);
						tmpProcessed++;

						if (tmpProcessed === pKeys.length)
						{
							console.log('All records processed.');
						}
					});
			});
	});
```

## Comparison with readRecordKeysByTimestamp

| Method | Scope | Use Case |
|--------|-------|----------|
| `readRecordKeys()` | All records for a source | Full enumeration, bulk operations |
| `readRecordKeysByTimestamp()` | Records within a time range | Incremental sync, recent changes |

## Notes

- Requires `initialize()` to have completed successfully
- Returns an empty array (not an error) when no records exist
- Soft-deleted records are excluded by Meadow's default delete tracking
- The `SourceHash` filter ensures only records from the specified source are returned
- No pagination is applied -- all matching keys are returned at once
- Only `RecordGUID` values are returned, not the full record data

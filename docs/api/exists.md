# exists()

Check whether a specific record exists in the `BibliographRecord` table.

## Signature

```javascript
storage.exists(pSourceHash, pRecordGUID, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSourceHash` | `string` | Source identifier the record belongs to |
| `pRecordGUID` | `string` | Unique record identifier (up to 256 characters) |
| `fCallback` | `Function` | Callback invoked as `fCallback(pError, pExists)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | `Error\|null` | Error object if the query failed |
| `pExists` | `boolean` | `true` if the record exists, `false` otherwise |

## Description

Queries the `BibliographRecord` table using Meadow's `doCount()` with filters on both `SourceHash` and `RecordGUID`. Returns a boolean indicating whether a matching, non-deleted record exists.

## Example

```javascript
tmpStorage.exists('my-data-feed', 'entry-001',
	(pError, pExists) =>
	{
		if (pError) { return console.error(pError); }

		if (pExists)
		{
			console.log('Record exists -- reading...');
			tmpStorage.read('my-data-feed', 'entry-001',
				(pReadError, pData) =>
				{
					console.log(pData);
				});
		}
		else
		{
			console.log('Record not found.');
		}
	});
```

## Notes

- Requires `initialize()` to have completed successfully
- Returns `false` (not an error) when no matching record is found
- Soft-deleted records are excluded by Meadow's default delete tracking
- The `SourceHash` filter ensures records from other sources are never matched
- Unlike `persistRecord()`, this method does not create the record if missing

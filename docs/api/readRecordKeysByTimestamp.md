# readRecordKeysByTimestamp()

List record GUIDs for a source within a specific time range.

## Signature

```javascript
storage.readRecordKeysByTimestamp(pSourceHash, pFromTimestamp, pToTimestamp, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSourceHash` | `string` | Source identifier to query |
| `pFromTimestamp` | `number` | Start of time range (epoch milliseconds, inclusive) |
| `pToTimestamp` | `number` | End of time range (epoch milliseconds, inclusive) |
| `fCallback` | `Function` | Callback invoked as `fCallback(pError, pKeys)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | `Error\|null` | Error object if the query failed |
| `pKeys` | `string[]` | Array of `RecordGUID` values within the time range |

## Description

Queries the `BibliographRecord` table for non-deleted rows matching the given `SourceHash` where `RecordTimestamp` falls within the range `[pFromTimestamp, pToTimestamp]` (inclusive on both ends).

The timestamps are converted to numeric values if they are not already numbers. The query uses Meadow's `>=` and `<=` filter operators on the `RecordTimestamp` column.

No pagination limit is applied (`setCap(0)`) -- all matching keys are returned.

## Example

```javascript
// Find records created/modified in the last 24 hours
let tmpNow = Date.now();
let tmpOneDayAgo = tmpNow - (24 * 60 * 60 * 1000);

tmpStorage.readRecordKeysByTimestamp('my-data-feed', tmpOneDayAgo, tmpNow,
	(pError, pKeys) =>
	{
		if (pError) { return console.error(pError); }

		console.log(`${pKeys.length} records modified in the last 24 hours:`);
		pKeys.forEach(
			(pKey) =>
			{
				console.log(' -', pKey);
			});
	});
```

## Incremental Sync Example

```javascript
// Track the last sync timestamp
let tmpLastSync = loadLastSyncTimestamp(); // e.g., from a config file

let tmpNow = Date.now();

tmpStorage.readRecordKeysByTimestamp('rss-feed', tmpLastSync, tmpNow,
	(pError, pKeys) =>
	{
		if (pError) { return console.error(pError); }

		console.log(`${pKeys.length} records changed since last sync.`);

		// Process only the changed records
		pKeys.forEach(
			(pKey) =>
			{
				tmpStorage.read('rss-feed', pKey,
					(pReadError, pData) =>
					{
						// Sync this record to the external system...
						syncToExternal(pKey, pData);
					});
			});

		// Update the sync timestamp
		saveLastSyncTimestamp(tmpNow);
	});
```

## Time Range Filter

The method applies three Meadow filters:

```
SourceHash  = pSourceHash
RecordTimestamp >= pFromTimestamp
RecordTimestamp <= pToTimestamp
```

## Notes

- Requires `initialize()` to have completed successfully
- Returns an empty array (not an error) when no records match the time range
- Timestamps are epoch milliseconds (the same format used by `Date.now()` and `+new Date()`)
- Both range boundaries are **inclusive** (`>=` and `<=`)
- Non-numeric timestamp arguments are coerced to numbers via the `+` operator
- Soft-deleted records are excluded by default
- The `RecordTimestamp` is set when a record is first created (via `persistRecord()` or `persistRecordMetadata()`) and can be updated via `stampRecordTimestamp()`

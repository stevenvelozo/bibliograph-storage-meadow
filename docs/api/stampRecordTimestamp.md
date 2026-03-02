# stampRecordTimestamp()

Update a record's `RecordTimestamp` to the current time.

## Signature

```javascript
storage.stampRecordTimestamp(pSourceHash, pRecordGUID, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSourceHash` | `string` | Source identifier the record belongs to |
| `pRecordGUID` | `string` | Unique record identifier |
| `fCallback` | `Function` | Callback invoked as `fCallback(pError)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | `Error\|null` | Error object if the operation failed |

## Description

Locates the record row by `SourceHash` + `RecordGUID` and sets its `RecordTimestamp` column to `+new Date()` (current epoch milliseconds).

If the record does not exist, the callback is invoked without an error -- there is simply nothing to stamp.

This method is useful for marking a record as "touched" without modifying its `RecordData` or `MetadataJSON`. The timestamp can later be used for time-range queries via `readRecordKeysByTimestamp()`.

## Example

```javascript
tmpStorage.stampRecordTimestamp('my-data-feed', 'entry-001',
	(pError) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Timestamp updated to now.');
	});
```

## Use Case: Tracking Access

```javascript
// Read a record and stamp its timestamp to mark last access
tmpStorage.read('my-data-feed', 'entry-001',
	(pError, pData) =>
	{
		if (pError) { return console.error(pError); }

		// Process the record...
		processRecord(pData);

		// Mark it as recently accessed
		tmpStorage.stampRecordTimestamp('my-data-feed', 'entry-001',
			(pStampError) =>
			{
				if (pStampError) { return console.error(pStampError); }
				console.log('Access timestamp updated.');
			});
	});
```

## Use Case: Time-Range Queries

```javascript
// Stamp records as they are ingested
tmpStorage.persistRecord('my-feed', 'rec-100', JSON.stringify(data),
	(pError) =>
	{
		// The timestamp is set automatically on create
		// But we can update it later:
		tmpStorage.stampRecordTimestamp('my-feed', 'rec-100',
			(pStampError) =>
			{
				// Later, find all records modified in the last hour
				let tmpNow = Date.now();
				let tmpOneHourAgo = tmpNow - (60 * 60 * 1000);

				tmpStorage.readRecordKeysByTimestamp('my-feed', tmpOneHourAgo, tmpNow,
					(pKeysError, pKeys) =>
					{
						console.log('Recently modified:', pKeys);
					});
			});
	});
```

## Notes

- Requires `initialize()` to have completed successfully
- The timestamp is stored as epoch milliseconds (integer)
- If the record does not exist, the callback succeeds silently
- `RecordTimestamp` is also set automatically when a record is first created via `persistRecord()` or `persistRecordMetadata()`
- Updating the timestamp does **not** modify `RecordData` or `MetadataJSON`
- Meadow's `UpdateDate` column is also updated via the Meadow update mechanism

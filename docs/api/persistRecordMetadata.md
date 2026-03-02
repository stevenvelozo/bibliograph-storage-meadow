# persistRecordMetadata()

Create or update the metadata associated with a record (upsert).

## Signature

```javascript
storage.persistRecordMetadata(pSourceHash, pRecordGUID, pMetadata, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSourceHash` | `string` | Source identifier the record belongs to |
| `pRecordGUID` | `string` | Unique record identifier |
| `pMetadata` | `object` | Metadata object to serialize and store |
| `fCallback` | `Function` | Callback invoked as `fCallback(pError)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | `Error\|null` | Error object if the operation failed |

## Description

Follows the upsert pattern:

1. Serializes `pMetadata` to a JSON string via `JSON.stringify()`
2. Looks up the existing record row by `SourceHash` + `RecordGUID`
3. **If found** -- updates the existing row's `MetadataJSON` column
4. **If not found** -- creates a new row with `SourceHash`, `RecordGUID`, `MetadataJSON`, and `RecordTimestamp`

Note that unlike `persistRecord()`, the metadata parameter is an **object** (not a string). The method handles serialization internally.

## Example

```javascript
let tmpMetadata =
{
	MD5: 'abc123def456',
	IngestTimestamp: Date.now(),
	SourceURL: 'https://example.com/article/1'
};

tmpStorage.persistRecordMetadata('my-data-feed', 'entry-001', tmpMetadata,
	(pError) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Metadata saved.');
	});
```

## Updating Metadata

```javascript
// Read existing metadata, add a field, re-persist
tmpStorage.readRecordMetadata('my-data-feed', 'entry-001',
	(pError, pMeta) =>
	{
		if (pError) { return console.error(pError); }

		let tmpUpdatedMeta = pMeta || {};
		tmpUpdatedMeta.LastChecked = Date.now();
		tmpUpdatedMeta.CheckCount = (tmpUpdatedMeta.CheckCount || 0) + 1;

		tmpStorage.persistRecordMetadata('my-data-feed', 'entry-001', tmpUpdatedMeta,
			(pUpdateError) =>
			{
				if (pUpdateError) { return console.error(pUpdateError); }
				console.log('Metadata updated.');
			});
	});
```

## Row Creation Behavior

If no `BibliographRecord` row exists for the given `SourceHash` + `RecordGUID`, this method creates one with only metadata populated -- the `RecordData` column will be empty. This allows metadata to be stored independently of the record content.

## Notes

- Requires `initialize()` to have completed successfully
- The `pMetadata` parameter is an **object** -- it is serialized automatically
- When creating a new row, `RecordTimestamp` is set to `+new Date()` (epoch ms)
- The metadata completely replaces the previous value -- there is no merge behavior
- To merge metadata, read the existing metadata first, modify it, then re-persist

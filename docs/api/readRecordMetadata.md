# readRecordMetadata()

Read the metadata associated with a record from the `MetadataJSON` column.

## Signature

```javascript
storage.readRecordMetadata(pSourceHash, pRecordGUID, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSourceHash` | `string` | Source identifier the record belongs to |
| `pRecordGUID` | `string` | Unique record identifier |
| `fCallback` | `Function` | Callback invoked as `fCallback(pError, pMetadata)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | `Error\|null` | Error object if the query or JSON parse failed |
| `pMetadata` | `object\|false` | Parsed metadata object, or `false` if no metadata exists |

## Description

Locates the record row by `SourceHash` + `RecordGUID`, then parses the `MetadataJSON` column from its JSON string representation into a JavaScript object.

If the record does not exist or has no `MetadataJSON` value, the callback receives `false` as the second argument.

The metadata format is application-defined. Common fields include content hashes (MD5) and ingestion timestamps.

## Example

```javascript
tmpStorage.readRecordMetadata('my-data-feed', 'entry-001',
	(pError, pMetadata) =>
	{
		if (pError) { return console.error(pError); }

		if (pMetadata)
		{
			console.log('MD5:', pMetadata.MD5);
			console.log('Ingested:', new Date(pMetadata.IngestTimestamp));
		}
		else
		{
			console.log('No metadata for this record.');
		}
	});
```

## Metadata Round-Trip

```javascript
// Write metadata
let tmpMeta = { MD5: 'abc123def456', IngestTimestamp: Date.now() };
tmpStorage.persistRecordMetadata('my-data-feed', 'entry-001', tmpMeta,
	(pError) =>
	{
		if (pError) { return console.error(pError); }

		// Read it back
		tmpStorage.readRecordMetadata('my-data-feed', 'entry-001',
			(pReadError, pMetadata) =>
			{
				console.log(pMetadata.MD5);
				// => 'abc123def456'
			});
	});
```

## Typical Metadata Format

```json
{
	"MD5": "d41d8cd98f00b204e9800998ecf8427e",
	"IngestTimestamp": 1709280000000
}
```

## Notes

- Requires `initialize()` to have completed successfully
- Returns `false` (not `undefined`) when no metadata is available
- Metadata is stored in the same `BibliographRecord` row as the record data
- The `MetadataJSON` column is independent of `RecordData` -- they can be set separately
- If `MetadataJSON` contains invalid JSON, the parse error is logged and passed to the callback

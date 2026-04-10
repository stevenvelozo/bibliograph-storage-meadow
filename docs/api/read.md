# read()

Read a record's data from the `BibliographRecord` table and return the parsed JSON object.

## Signature

```javascript
storage.read(pSourceHash, pRecordGUID, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSourceHash` | `string` | Source identifier the record belongs to |
| `pRecordGUID` | `string` | Unique record identifier |
| `fCallback` | `Function` | Callback invoked as `fCallback(pError, pData)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | `Error\|null` | Error object if the query or JSON parse failed |
| `pData` | `object\|undefined` | Parsed record data, or `undefined` if not found |

## Description

Locates the record row by `SourceHash` + `RecordGUID` using the internal `_findRecord()` helper, then parses the `RecordData` column from its JSON string representation back into a JavaScript object.

If the record does not exist or has no `RecordData`, the callback receives `undefined` as the second argument (no error is raised).

If `RecordData` contains invalid JSON, the parse error is logged and passed to the callback.

## Example

```javascript
tmpStorage.read('my-data-feed', 'entry-001',
	(pError, pData) =>
	{
		if (pError) { return console.error(pError); }

		if (pData)
		{
			console.log('Title:', pData.title);
			console.log('Body:', pData.body);
			console.log('Tags:', pData.tags);
		}
		else
		{
			console.log('Record not found.');
		}
	});
```

## Round-Trip Example

```javascript
// Write a record
let tmpRecord = { title: 'Hello', body: 'World', tags: ['greeting'] };
tmpStorage.persistRecord('my-source', 'rec-001',
	JSON.stringify(tmpRecord),
	(pError) =>
	{
		if (pError) { return console.error(pError); }

		// Read it back
		tmpStorage.read('my-source', 'rec-001',
			(pReadError, pData) =>
			{
				console.log(pData);
				// => { title: 'Hello', body: 'World', tags: ['greeting'] }

				console.log(pData.title === tmpRecord.title);
				// => true
			});
	});
```

## Data Flow

```
read(hash, guid, cb)
  -> _findRecord(hash, guid)
    -> meadowRecord.doReads() with SourceHash + RecordGUID filters
      -> row found? -> JSON.parse(row.RecordData) -> cb(null, parsedObject)
      -> no row?    -> cb(undefined)
```

## Notes

- Requires `initialize()` to have completed successfully
- The `RecordData` column stores a JSON string -- this method handles parsing
- Soft-deleted records are excluded automatically
- The raw database row is not returned -- only the parsed `RecordData` content
- To access metadata, use `readRecordMetadata()` separately

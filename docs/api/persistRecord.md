# persistRecord()

Create or update a record in the `BibliographRecord` table (upsert).

## Signature

```javascript
storage.persistRecord(pSourceHash, pRecordGUID, pRecordJSONString, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSourceHash` | `string` | Source identifier the record belongs to |
| `pRecordGUID` | `string` | Unique record identifier |
| `pRecordJSONString` | `string` | Record content as a JSON string |
| `fCallback` | `Function` | Callback invoked as `fCallback(pError)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | `Error\|null` | Error object if the operation failed |

## Description

Follows the upsert pattern:

1. Calls `_findRecord()` to look up an existing row by `SourceHash` + `RecordGUID`
2. **If found** -- updates the existing row's `RecordData` column via `meadowRecord.doUpdate()`
3. **If not found** -- creates a new row with `SourceHash`, `RecordGUID`, `RecordData`, and `RecordTimestamp` set to the current epoch milliseconds

The caller is responsible for serializing the record to a JSON string before passing it. The record format is entirely application-defined.

## Example

```javascript
let tmpRecord = { title: 'My Article', body: 'Content goes here', tags: ['draft'] };

tmpStorage.persistRecord('my-data-feed', 'article-001',
	JSON.stringify(tmpRecord),
	(pError) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Record persisted.');
	});
```

## Update Example

```javascript
// Read, modify, re-persist
tmpStorage.read('my-data-feed', 'article-001',
	(pError, pData) =>
	{
		if (pError) { return console.error(pError); }

		pData.title = 'My Updated Article';
		pData.tags.push('published');

		tmpStorage.persistRecord('my-data-feed', 'article-001',
			JSON.stringify(pData),
			(pUpdateError) =>
			{
				if (pUpdateError) { return console.error(pUpdateError); }
				console.log('Record updated.');
			});
	});
```

## Upsert Flow

```
persistRecord(hash, guid, json, cb)
  -> _findRecord(hash, guid)
    -> row exists?
       YES -> meadowRecord.doUpdate({ IDBibliographRecord, RecordData: json })
       NO  -> meadowRecord.doCreate({ SourceHash, RecordGUID, RecordData, RecordTimestamp })
```

## Notes

- Requires `initialize()` to have completed successfully
- The `pRecordJSONString` parameter must be a **string** (use `JSON.stringify()`)
- When creating a new record, `RecordTimestamp` is automatically set to `+new Date()` (epoch ms)
- When updating, `RecordTimestamp` is **not** changed -- use `stampRecordTimestamp()` to update it
- Meadow automatically manages `UpdateDate` and `UpdatingIDUser` on updates
- Errors are logged via `fable.log.error()` and passed to the callback

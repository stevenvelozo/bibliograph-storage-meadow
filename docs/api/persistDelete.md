# persistDelete()

Soft-delete a record from the `BibliographRecord` table.

## Signature

```javascript
storage.persistDelete(pSourceHash, pRecordGUID, fCallback)
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

Locates the record row by `SourceHash` + `RecordGUID`, then calls Meadow's `doDelete()` which performs a **soft delete**:

- Sets `Deleted` to `1`
- Populates `DeleteDate` with the current timestamp
- Populates `DeletingIDUser` with the current user ID

The record row remains in the database but is excluded from all subsequent queries that use Meadow's default delete tracking.

If no matching record is found, a warning is logged and the callback is invoked without an error.

## Example

```javascript
tmpStorage.persistDelete('my-data-feed', 'article-001',
	(pError) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Record soft-deleted.');
	});
```

## Verifying Deletion

```javascript
// After soft-delete, the record is no longer visible
tmpStorage.exists('my-data-feed', 'article-001',
	(pError, pExists) =>
	{
		console.log(pExists);
		// => false
	});

tmpStorage.read('my-data-feed', 'article-001',
	(pError, pData) =>
	{
		console.log(pData);
		// => undefined
	});
```

## Soft Delete Behavior

```
persistDelete(hash, guid, cb)
  → _findRecord(hash, guid)
    → row found?
       YES → meadowRecord.doDelete({ IDBibliographRecord })
             → Sets Deleted = 1, DeleteDate, DeletingIDUser
       NO  → log warning, callback with no error
```

## Notes

- Requires `initialize()` to have completed successfully
- This is a **soft delete** -- the row is not physically removed from the database
- Subsequent calls to `read()`, `exists()`, `readRecordKeys()`, etc. will not return the deleted record
- The associated delta record (in `BibliographDelta`) is **not** automatically deleted
- To fully remove a record, you would need to interact directly with the Meadow entity
- A warning is logged (not an error) if the record does not exist

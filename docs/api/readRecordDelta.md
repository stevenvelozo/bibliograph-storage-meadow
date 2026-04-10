# readRecordDelta()

Read the change history (delta container) for a record from the `BibliographDelta` table.

## Signature

```javascript
storage.readRecordDelta(pSourceHash, pRecordGUID, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSourceHash` | `string` | Source identifier the record belongs to |
| `pRecordGUID` | `string` | Unique record identifier |
| `fCallback` | `Function` | Callback invoked as `fCallback(pError, pDeltaContainer)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | `Error\|null` | Error object if the query failed |
| `pDeltaContainer` | `object` | Delta container with `RecordGUID` and `Deltas` array |

## Description

Locates the delta row by `SourceHash` + `RecordGUID` in the `BibliographDelta` table, then parses the `DeltaJSON` column.

If no delta row exists, if the `DeltaJSON` column is empty, or if the stored JSON is invalid, the method returns a **fresh empty delta container** (from `generateDeltaContainer()`) instead of an error. This ensures callers always receive a valid container object.

## Delta Container Format

```json
{
	"RecordGUID": "entry-001",
	"Deltas": [
		{
			"Timestamp": 1709280000000,
			"Changes": { "title": "Updated Title" }
		},
		{
			"Timestamp": 1709290000000,
			"Changes": { "tags": ["updated", "reviewed"] }
		}
	]
}
```

## Example

```javascript
tmpStorage.readRecordDelta('my-data-feed', 'entry-001',
	(pError, pDeltaContainer) =>
	{
		if (pError) { return console.error(pError); }

		console.log('Record GUID:', pDeltaContainer.RecordGUID);
		console.log('Number of deltas:', pDeltaContainer.Deltas.length);

		pDeltaContainer.Deltas.forEach(
			(pDelta) =>
			{
				console.log('Change at', new Date(pDelta.Timestamp), ':', pDelta.Changes);
			});
	});
```

## Validation

The method validates the parsed delta container by checking for the presence of both `RecordGUID` and `Deltas` properties. If either is missing, a warning is logged and a fresh container is returned:

```
readRecordDelta(hash, guid, cb)
  -> _findDelta(hash, guid)
    -> row found?
       YES -> JSON.parse(DeltaJSON)
             -> has RecordGUID + Deltas? -> cb(null, parsedContainer)
             -> invalid structure?       -> cb(null, generateDeltaContainer(guid))
       NO  -> cb(null, generateDeltaContainer(guid))
```

## Notes

- Requires `initialize()` to have completed successfully
- **Always returns a valid delta container** -- never returns `undefined` or `false`
- If no history exists, the returned container has an empty `Deltas` array
- JSON parse errors are logged but do not propagate as callback errors -- a fresh container is returned instead
- The delta container lives in the `BibliographDelta` table, separate from the record's `BibliographRecord` row

# persistRecordDelta()

Create or update the change history (delta container) for a record (upsert).

## Signature

```javascript
storage.persistRecordDelta(pSourceHash, pRecordMetadata, pDeltaContainer, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSourceHash` | `string` | Source identifier the record belongs to |
| `pRecordMetadata` | `object` | Record metadata object -- must contain a `GUID` property |
| `pDeltaContainer` | `object` | Delta container with `RecordGUID` and `Deltas` array |
| `fCallback` | `Function` | Callback invoked as `fCallback(pError)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | `Error\|null` | Error object if the operation failed |

## Description

Follows the upsert pattern:

1. Serializes `pDeltaContainer` to a JSON string
2. Looks up the existing delta row by `SourceHash` + `pRecordMetadata.GUID` in the `BibliographDelta` table
3. **If found** -- updates the existing row's `DeltaJSON` column
4. **If not found** -- creates a new row with `SourceHash`, `RecordGUID`, and `DeltaJSON`

Note that this method uses `pRecordMetadata.GUID` (not a separate `pRecordGUID` parameter) as the record identifier. This matches the convention used by the Bibliograph framework.

## Example

```javascript
let tmpRecordMetadata = { GUID: 'entry-001' };

let tmpDeltaContainer =
{
	RecordGUID: 'entry-001',
	Deltas:
	[
		{
			Timestamp: Date.now(),
			Changes: { title: 'New Title', body: 'Updated body content' }
		}
	]
};

tmpStorage.persistRecordDelta('my-data-feed', tmpRecordMetadata, tmpDeltaContainer,
	(pError) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Delta saved.');
	});
```

## Appending Deltas

```javascript
// Read the existing delta container, add a new change, re-persist
tmpStorage.readRecordDelta('my-data-feed', 'entry-001',
	(pError, pContainer) =>
	{
		if (pError) { return console.error(pError); }

		// Append a new change entry
		pContainer.Deltas.push(
		{
			Timestamp: Date.now(),
			Changes: { status: 'reviewed' }
		});

		let tmpMeta = { GUID: 'entry-001' };
		tmpStorage.persistRecordDelta('my-data-feed', tmpMeta, pContainer,
			(pPersistError) =>
			{
				if (pPersistError) { return console.error(pPersistError); }
				console.log('Delta appended.');
			});
	});
```

## Delta Container Structure

```json
{
	"RecordGUID": "entry-001",
	"Deltas": [
		{
			"Timestamp": 1709280000000,
			"Changes": { "title": "First Update" }
		},
		{
			"Timestamp": 1709290000000,
			"Changes": { "title": "Second Update", "status": "reviewed" }
		}
	]
}
```

## Notes

- Requires `initialize()` to have completed successfully
- The `pRecordMetadata` parameter must have a `GUID` property identifying the record
- The entire delta container is replaced on update -- there is no automatic merge
- To append changes, read the existing container first, modify it, then re-persist
- The delta container is stored in the `BibliographDelta` table, separate from `BibliographRecord`
- Use `generateDeltaContainer(pRecordGUID)` (inherited from `BibliographStorageBase`) to create a fresh empty container

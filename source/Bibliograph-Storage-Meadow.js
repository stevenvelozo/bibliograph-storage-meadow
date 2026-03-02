/**
* Bibliograph Storage Provider backed by Meadow DAL.
*
* Stores records, metadata, and deltas in database tables via Meadow,
* enabling Bibliograph to use any Meadow-supported database backend
* (SQLite, PostgreSQL, MySQL, MSSQL, MongoDB, etc.).
*
* @author Steven Velozo <steven@velozo.com>
* @license MIT
*/
const libBibliographStorageBase = require('bibliograph').BibliographStorageBase;
const libMeadow = require('meadow');

// ---- Meadow Schema Definitions ----

const _SourceSchema =
[
	{ Column: 'IDBibliographSource', Type: 'AutoIdentity' },
	{ Column: 'GUIDBibliographSource', Type: 'AutoGUID' },
	{ Column: 'CreateDate', Type: 'CreateDate' },
	{ Column: 'CreatingIDUser', Type: 'CreateIDUser' },
	{ Column: 'UpdateDate', Type: 'UpdateDate' },
	{ Column: 'UpdatingIDUser', Type: 'UpdateIDUser' },
	{ Column: 'Deleted', Type: 'Deleted' },
	{ Column: 'DeleteDate', Type: 'DeleteDate' },
	{ Column: 'DeletingIDUser', Type: 'DeleteIDUser' },
	{ Column: 'SourceHash', Type: 'String', Size: '512' }
];

const _SourceDefault =
{
	IDBibliographSource: null,
	GUIDBibliographSource: '',
	CreateDate: false,
	CreatingIDUser: 0,
	UpdateDate: false,
	UpdatingIDUser: 0,
	Deleted: 0,
	DeleteDate: false,
	DeletingIDUser: 0,
	SourceHash: ''
};

const _RecordSchema =
[
	{ Column: 'IDBibliographRecord', Type: 'AutoIdentity' },
	{ Column: 'GUIDBibliographRecord', Type: 'AutoGUID' },
	{ Column: 'CreateDate', Type: 'CreateDate' },
	{ Column: 'CreatingIDUser', Type: 'CreateIDUser' },
	{ Column: 'UpdateDate', Type: 'UpdateDate' },
	{ Column: 'UpdatingIDUser', Type: 'UpdateIDUser' },
	{ Column: 'Deleted', Type: 'Deleted' },
	{ Column: 'DeleteDate', Type: 'DeleteDate' },
	{ Column: 'DeletingIDUser', Type: 'DeleteIDUser' },
	{ Column: 'SourceHash', Type: 'String', Size: '512' },
	{ Column: 'RecordGUID', Type: 'String', Size: '256' },
	{ Column: 'RecordData', Type: 'Text' },
	{ Column: 'MetadataJSON', Type: 'Text' },
	{ Column: 'RecordTimestamp', Type: 'Numeric' }
];

const _RecordDefault =
{
	IDBibliographRecord: null,
	GUIDBibliographRecord: '',
	CreateDate: false,
	CreatingIDUser: 0,
	UpdateDate: false,
	UpdatingIDUser: 0,
	Deleted: 0,
	DeleteDate: false,
	DeletingIDUser: 0,
	SourceHash: '',
	RecordGUID: '',
	RecordData: '',
	MetadataJSON: '',
	RecordTimestamp: 0
};

const _DeltaSchema =
[
	{ Column: 'IDBibliographDelta', Type: 'AutoIdentity' },
	{ Column: 'GUIDBibliographDelta', Type: 'AutoGUID' },
	{ Column: 'CreateDate', Type: 'CreateDate' },
	{ Column: 'CreatingIDUser', Type: 'CreateIDUser' },
	{ Column: 'UpdateDate', Type: 'UpdateDate' },
	{ Column: 'UpdatingIDUser', Type: 'UpdateIDUser' },
	{ Column: 'Deleted', Type: 'Deleted' },
	{ Column: 'DeleteDate', Type: 'DeleteDate' },
	{ Column: 'DeletingIDUser', Type: 'DeleteIDUser' },
	{ Column: 'SourceHash', Type: 'String', Size: '512' },
	{ Column: 'RecordGUID', Type: 'String', Size: '256' },
	{ Column: 'DeltaJSON', Type: 'Text' }
];

const _DeltaDefault =
{
	IDBibliographDelta: null,
	GUIDBibliographDelta: '',
	CreateDate: false,
	CreatingIDUser: 0,
	UpdateDate: false,
	UpdatingIDUser: 0,
	Deleted: 0,
	DeleteDate: false,
	DeletingIDUser: 0,
	SourceHash: '',
	RecordGUID: '',
	DeltaJSON: ''
};

// ---- SQLite CREATE TABLE statements ----

const _CreateTableSQL =
{
	BibliographSource:
		`CREATE TABLE IF NOT EXISTS BibliographSource (
		IDBibliographSource INTEGER PRIMARY KEY AUTOINCREMENT,
		GUIDBibliographSource TEXT DEFAULT '00000000-0000-0000-0000-000000000000',
		CreateDate TEXT,
		CreatingIDUser INTEGER NOT NULL DEFAULT 0,
		UpdateDate TEXT,
		UpdatingIDUser INTEGER NOT NULL DEFAULT 0,
		Deleted INTEGER NOT NULL DEFAULT 0,
		DeleteDate TEXT,
		DeletingIDUser INTEGER NOT NULL DEFAULT 0,
		SourceHash TEXT NOT NULL DEFAULT ''
	);`,
	BibliographRecord:
		`CREATE TABLE IF NOT EXISTS BibliographRecord (
		IDBibliographRecord INTEGER PRIMARY KEY AUTOINCREMENT,
		GUIDBibliographRecord TEXT DEFAULT '00000000-0000-0000-0000-000000000000',
		CreateDate TEXT,
		CreatingIDUser INTEGER NOT NULL DEFAULT 0,
		UpdateDate TEXT,
		UpdatingIDUser INTEGER NOT NULL DEFAULT 0,
		Deleted INTEGER NOT NULL DEFAULT 0,
		DeleteDate TEXT,
		DeletingIDUser INTEGER NOT NULL DEFAULT 0,
		SourceHash TEXT NOT NULL DEFAULT '',
		RecordGUID TEXT NOT NULL DEFAULT '',
		RecordData TEXT,
		MetadataJSON TEXT,
		RecordTimestamp INTEGER NOT NULL DEFAULT 0
	);`,
	BibliographDelta:
		`CREATE TABLE IF NOT EXISTS BibliographDelta (
		IDBibliographDelta INTEGER PRIMARY KEY AUTOINCREMENT,
		GUIDBibliographDelta TEXT DEFAULT '00000000-0000-0000-0000-000000000000',
		CreateDate TEXT,
		CreatingIDUser INTEGER NOT NULL DEFAULT 0,
		UpdateDate TEXT,
		UpdatingIDUser INTEGER NOT NULL DEFAULT 0,
		Deleted INTEGER NOT NULL DEFAULT 0,
		DeleteDate TEXT,
		DeletingIDUser INTEGER NOT NULL DEFAULT 0,
		SourceHash TEXT NOT NULL DEFAULT '',
		RecordGUID TEXT NOT NULL DEFAULT '',
		DeltaJSON TEXT
	);`
};


class BibliographStorageMeadow extends libBibliographStorageBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.Initialized = false;

		// The Meadow provider name (SQLite, MySQL, PostgreSQL, etc.)
		this.MeadowProvider = this.options['Meadow-Provider'] || this.fable.settings['Meadow-Provider'] || 'SQLite';

		// Meadow DAL instances (created during initialization)
		this.meadowSource = false;
		this.meadowRecord = false;
		this.meadowDelta = false;
	}

	/**
	 * Initialize the Meadow storage provider.
	 *
	 * Creates the 3 Meadow entity instances and ensures their tables exist.
	 *
	 * @param {Function} fCallback - Callback invoked after initialization.
	 */
	initialize(fCallback)
	{
		this.fable.log.trace(`Bibliograph Meadow Storage Initialization (provider: ${this.MeadowProvider}).`);

		let tmpAnticipate = this.fable.newAnticipate();

		// Create Meadow instances for each entity
		tmpAnticipate.anticipate(
			function (fNext)
			{
				try
				{
					this.meadowSource = libMeadow.new(this.fable, 'BibliographSource')
						.setProvider(this.MeadowProvider)
						.setDefaultIdentifier('IDBibliographSource')
						.setSchema(_SourceSchema)
						.setDefault(_SourceDefault);

					this.meadowRecord = libMeadow.new(this.fable, 'BibliographRecord')
						.setProvider(this.MeadowProvider)
						.setDefaultIdentifier('IDBibliographRecord')
						.setSchema(_RecordSchema)
						.setDefault(_RecordDefault);

					this.meadowDelta = libMeadow.new(this.fable, 'BibliographDelta')
						.setProvider(this.MeadowProvider)
						.setDefaultIdentifier('IDBibliographDelta')
						.setSchema(_DeltaSchema)
						.setDefault(_DeltaDefault);

					return fNext();
				}
				catch (pError)
				{
					this.fable.log.error(`Bibliograph Meadow Storage failed to create Meadow instances: ${pError}`);
					return fNext(pError);
				}
			}.bind(this));

		// Create tables if they don't exist (SQLite-specific raw DDL)
		tmpAnticipate.anticipate(
			function (fNext)
			{
				if (this.MeadowProvider === 'SQLite' && this.fable.MeadowSQLiteProvider && this.fable.MeadowSQLiteProvider.connected)
				{
					let tmpDB = this.fable.MeadowSQLiteProvider.db;
					try
					{
						tmpDB.exec(_CreateTableSQL.BibliographSource);
						tmpDB.exec(_CreateTableSQL.BibliographRecord);
						tmpDB.exec(_CreateTableSQL.BibliographDelta);
						this.fable.log.trace('Bibliograph Meadow Storage: SQLite tables created/verified.');
					}
					catch (pError)
					{
						this.fable.log.error(`Bibliograph Meadow Storage: Error creating SQLite tables: ${pError}`);
						return fNext(pError);
					}
				}
				else
				{
					this.fable.log.trace(`Bibliograph Meadow Storage: Skipping auto table creation for provider [${this.MeadowProvider}]. Tables must already exist.`);
				}
				return fNext();
			}.bind(this));

		// Finalize
		tmpAnticipate.anticipate(
			function (fNext)
			{
				this.Initialized = true;
				this.fable.log.trace('Bibliograph Meadow Storage Initialization complete.');
				return fNext();
			}.bind(this));

		tmpAnticipate.wait(fCallback);
	}

	// ---- Helper: find a BibliographRecord row by SourceHash + RecordGUID ----
	// pDisableDeleteTracking: if true, includes soft-deleted records (used by upsert helpers)

	_findRecord(pSourceHash, pRecordGUID, fCallback, pDisableDeleteTracking)
	{
		let tmpQuery = this.meadowRecord.query.clone()
			.addFilter('SourceHash', pSourceHash)
			.addFilter('RecordGUID', pRecordGUID);

		if (pDisableDeleteTracking)
		{
			tmpQuery.setDisableDeleteTracking(true);
		}

		this.meadowRecord.doReads(tmpQuery,
			function (pError, pQuery, pRecords)
			{
				if (pError)
				{
					return fCallback(pError);
				}

				if (pRecords && pRecords.length > 0)
				{
					return fCallback(null, pRecords[0]);
				}

				return fCallback(null, false);
			}.bind(this));
	}

	// ---- Helper: find a BibliographDelta row by SourceHash + RecordGUID ----

	_findDelta(pSourceHash, pRecordGUID, fCallback)
	{
		let tmpQuery = this.meadowDelta.query.clone()
			.addFilter('SourceHash', pSourceHash)
			.addFilter('RecordGUID', pRecordGUID);

		this.meadowDelta.doReads(tmpQuery,
			function (pError, pQuery, pRecords)
			{
				if (pError)
				{
					return fCallback(pError);
				}

				if (pRecords && pRecords.length > 0)
				{
					return fCallback(null, pRecords[0]);
				}

				return fCallback(null, false);
			}.bind(this));
	}

	// ---- Source operations ----

	sourceExists(pSourceHash, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; sourceExists [${pSourceHash}] failed.`));
		}

		let tmpQuery = this.meadowSource.query.clone()
			.addFilter('SourceHash', pSourceHash);

		this.meadowSource.doCount(tmpQuery,
			function (pError, pQuery, pCount)
			{
				if (pError)
				{
					return fCallback(pError, false);
				}
				return fCallback(null, pCount > 0);
			}.bind(this));
	}

	sourceCreate(pSourceHash, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; sourceCreate [${pSourceHash}] failed.`));
		}

		this.fable.log.trace(`Bibliograph Meadow Source Create [${pSourceHash}]`);

		let tmpQuery = this.meadowSource.query.clone()
			.addRecord({ SourceHash: pSourceHash });

		this.meadowSource.doCreate(tmpQuery,
			function (pError, pCreateQuery, pReadQuery, pRecord)
			{
				if (pError)
				{
					return fCallback(pError);
				}
				return fCallback(null);
			}.bind(this));
	}

	// ---- Record existence ----

	exists(pSourceHash, pRecordGUID, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; exists [${pSourceHash}]:[${pRecordGUID}] failed.`));
		}

		let tmpQuery = this.meadowRecord.query.clone()
			.addFilter('SourceHash', pSourceHash)
			.addFilter('RecordGUID', pRecordGUID);

		this.meadowRecord.doCount(tmpQuery,
			function (pError, pQuery, pCount)
			{
				if (pError)
				{
					return fCallback(pError, false);
				}
				return fCallback(null, pCount > 0);
			}.bind(this));
	}

	// ---- Record read ----

	read(pSourceHash, pRecordGUID, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; read [${pSourceHash}]:[${pRecordGUID}] failed.`));
		}

		this._findRecord(pSourceHash, pRecordGUID,
			function (pError, pRow)
			{
				if (pError)
				{
					return fCallback(pError);
				}

				if (!pRow || !pRow.RecordData)
				{
					return fCallback();
				}

				let tmpParsedRecord = false;
				try
				{
					tmpParsedRecord = JSON.parse(pRow.RecordData);
				}
				catch (pParseError)
				{
					this.fable.log.error(`Bibliograph Meadow Storage: Error parsing RecordData for [${pSourceHash}]:[${pRecordGUID}]: ${pParseError}`);
					return fCallback(pParseError);
				}

				return fCallback(null, tmpParsedRecord);
			}.bind(this));
	}

	// ---- Record persist (upsert) ----

	persistRecord(pSourceHash, pRecordGUID, pRecordJSONString, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; persistRecord [${pSourceHash}]:[${pRecordGUID}] failed.`));
		}

		this._findRecord(pSourceHash, pRecordGUID,
			function (pError, pExistingRow)
			{
				if (pError)
				{
					return fCallback(pError);
				}

				if (pExistingRow)
				{
					// Update existing row
					let tmpQuery = this.meadowRecord.query.clone()
						.addRecord(
						{
							IDBibliographRecord: pExistingRow.IDBibliographRecord,
							RecordData: pRecordJSONString
						});

					this.meadowRecord.doUpdate(tmpQuery,
						function (pUpdateError)
						{
							if (pUpdateError)
							{
								this.fable.log.error(`Bibliograph Meadow Storage: Error updating record [${pSourceHash}]:[${pRecordGUID}]: ${pUpdateError}`);
							}
							return fCallback(pUpdateError);
						}.bind(this));
				}
				else
				{
					// Create new row
					let tmpQuery = this.meadowRecord.query.clone()
						.addRecord(
						{
							SourceHash: pSourceHash,
							RecordGUID: pRecordGUID,
							RecordData: pRecordJSONString,
							RecordTimestamp: +new Date()
						});

					this.meadowRecord.doCreate(tmpQuery,
						function (pCreateError)
						{
							if (pCreateError)
							{
								this.fable.log.error(`Bibliograph Meadow Storage: Error creating record [${pSourceHash}]:[${pRecordGUID}]: ${pCreateError}`);
							}
							return fCallback(pCreateError);
						}.bind(this));
				}
			}.bind(this));
	}

	// ---- Record delete ----

	persistDelete(pSourceHash, pRecordGUID, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; persistDelete [${pSourceHash}]:[${pRecordGUID}] failed.`));
		}

		this._findRecord(pSourceHash, pRecordGUID,
			function (pError, pExistingRow)
			{
				if (pError)
				{
					return fCallback(pError);
				}

				if (!pExistingRow)
				{
					this.fable.log.warn(`Bibliograph Meadow Storage: Record [${pSourceHash}]:[${pRecordGUID}] not found for delete.`);
					return fCallback();
				}

				let tmpQuery = this.meadowRecord.query.clone()
					.addFilter('IDBibliographRecord', pExistingRow.IDBibliographRecord);

				this.meadowRecord.doDelete(tmpQuery,
					function (pDeleteError)
					{
						if (pDeleteError)
						{
							this.fable.log.error(`Bibliograph Meadow Storage: Error deleting record [${pSourceHash}]:[${pRecordGUID}]: ${pDeleteError}`);
						}
						return fCallback(pDeleteError);
					}.bind(this));
			}.bind(this));
	}

	// ---- Metadata ----

	readRecordMetadata(pSourceHash, pRecordGUID, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; readRecordMetadata [${pSourceHash}]:[${pRecordGUID}] failed.`));
		}

		this._findRecord(pSourceHash, pRecordGUID,
			function (pError, pRow)
			{
				if (pError)
				{
					return fCallback(pError);
				}

				if (!pRow || !pRow.MetadataJSON)
				{
					return fCallback(null, false);
				}

				try
				{
					return fCallback(null, JSON.parse(pRow.MetadataJSON));
				}
				catch (pParseError)
				{
					this.fable.log.error(`Bibliograph Meadow Storage: Error parsing MetadataJSON for [${pSourceHash}]:[${pRecordGUID}]: ${pParseError}`);
					return fCallback(pParseError);
				}
			}.bind(this));
	}

	persistRecordMetadata(pSourceHash, pRecordGUID, pMetadata, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; persistRecordMetadata [${pSourceHash}]:[${pRecordGUID}] failed.`));
		}

		this._findRecord(pSourceHash, pRecordGUID,
			function (pError, pExistingRow)
			{
				if (pError)
				{
					return fCallback(pError);
				}

				let tmpMetadataJSON = JSON.stringify(pMetadata);

				if (pExistingRow)
				{
					let tmpQuery = this.meadowRecord.query.clone()
						.addRecord(
						{
							IDBibliographRecord: pExistingRow.IDBibliographRecord,
							MetadataJSON: tmpMetadataJSON
						});

					this.meadowRecord.doUpdate(tmpQuery,
						function (pUpdateError)
						{
							return fCallback(pUpdateError);
						}.bind(this));
				}
				else
				{
					// The record row doesn't exist yet; create it with metadata only
					let tmpQuery = this.meadowRecord.query.clone()
						.addRecord(
						{
							SourceHash: pSourceHash,
							RecordGUID: pRecordGUID,
							MetadataJSON: tmpMetadataJSON,
							RecordTimestamp: +new Date()
						});

					this.meadowRecord.doCreate(tmpQuery,
						function (pCreateError)
						{
							return fCallback(pCreateError);
						}.bind(this));
				}
			}.bind(this));
	}

	// ---- Timestamp ----

	stampRecordTimestamp(pSourceHash, pRecordGUID, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; stampRecordTimestamp [${pSourceHash}]:[${pRecordGUID}] failed.`));
		}

		this._findRecord(pSourceHash, pRecordGUID,
			function (pError, pExistingRow)
			{
				if (pError)
				{
					return fCallback(pError);
				}

				if (!pExistingRow)
				{
					// No row to stamp
					return fCallback();
				}

				let tmpQuery = this.meadowRecord.query.clone()
					.addRecord(
					{
						IDBibliographRecord: pExistingRow.IDBibliographRecord,
						RecordTimestamp: +new Date()
					});

				this.meadowRecord.doUpdate(tmpQuery,
					function (pUpdateError)
					{
						return fCallback(pUpdateError);
					}.bind(this));
			}.bind(this));
	}

	// ---- Delta ----

	readRecordDelta(pSourceHash, pRecordGUID, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; readRecordDelta [${pSourceHash}]:[${pRecordGUID}] failed.`));
		}

		this._findDelta(pSourceHash, pRecordGUID,
			function (pError, pRow)
			{
				if (pError)
				{
					return fCallback(pError);
				}

				if (!pRow || !pRow.DeltaJSON)
				{
					return fCallback(null, this.generateDeltaContainer(pRecordGUID));
				}

				try
				{
					let tmpDeltaContainer = JSON.parse(pRow.DeltaJSON);

					if (!tmpDeltaContainer || !tmpDeltaContainer.hasOwnProperty('Deltas') || !tmpDeltaContainer.hasOwnProperty('RecordGUID'))
					{
						this.fable.log.warn(`Bibliograph Meadow Storage: Invalid delta container for [${pSourceHash}]:[${pRecordGUID}]`);
						return fCallback(null, this.generateDeltaContainer(pRecordGUID));
					}

					return fCallback(null, tmpDeltaContainer);
				}
				catch (pParseError)
				{
					this.fable.log.error(`Bibliograph Meadow Storage: Error parsing DeltaJSON for [${pSourceHash}]:[${pRecordGUID}]: ${pParseError}`);
					return fCallback(null, this.generateDeltaContainer(pRecordGUID));
				}
			}.bind(this));
	}

	persistRecordDelta(pSourceHash, pRecordMetadata, pDeltaContainer, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; persistRecordDelta [${pSourceHash}]:[${pRecordMetadata.GUID}] failed.`));
		}

		let tmpDeltaJSON = JSON.stringify(pDeltaContainer);

		this._findDelta(pSourceHash, pRecordMetadata.GUID,
			function (pError, pExistingRow)
			{
				if (pError)
				{
					return fCallback(pError);
				}

				if (pExistingRow)
				{
					let tmpQuery = this.meadowDelta.query.clone()
						.addRecord(
						{
							IDBibliographDelta: pExistingRow.IDBibliographDelta,
							DeltaJSON: tmpDeltaJSON
						});

					this.meadowDelta.doUpdate(tmpQuery,
						function (pUpdateError)
						{
							return fCallback(pUpdateError);
						}.bind(this));
				}
				else
				{
					let tmpQuery = this.meadowDelta.query.clone()
						.addRecord(
						{
							SourceHash: pSourceHash,
							RecordGUID: pRecordMetadata.GUID,
							DeltaJSON: tmpDeltaJSON
						});

					this.meadowDelta.doCreate(tmpQuery,
						function (pCreateError)
						{
							return fCallback(pCreateError);
						}.bind(this));
				}
			}.bind(this));
	}

	// ---- Key enumeration ----

	readRecordKeys(pSourceHash, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; readRecordKeys [${pSourceHash}] failed.`));
		}

		let tmpQuery = this.meadowRecord.query.clone()
			.addFilter('SourceHash', pSourceHash)
			.setCap(0);

		this.meadowRecord.doReads(tmpQuery,
			function (pError, pQuery, pRecords)
			{
				if (pError)
				{
					return fCallback(pError);
				}

				if (!pRecords || !Array.isArray(pRecords))
				{
					return fCallback(null, []);
				}

				let tmpKeys = pRecords.map(
					function (pRecord)
					{
						return pRecord.RecordGUID;
					});

				return fCallback(null, tmpKeys);
			}.bind(this));
	}

	readRecordKeysByTimestamp(pSourceHash, pFromTimestamp, pToTimestamp, fCallback)
	{
		if (!this.Initialized)
		{
			return fCallback(new Error(`Bibliograph Meadow Storage not initialized; readRecordKeysByTimestamp [${pSourceHash}] failed.`));
		}

		// Convert timestamps to numeric epoch ms values
		let tmpFrom = (typeof(pFromTimestamp) === 'number') ? pFromTimestamp : +pFromTimestamp;
		let tmpTo = (typeof(pToTimestamp) === 'number') ? pToTimestamp : +pToTimestamp;

		let tmpQuery = this.meadowRecord.query.clone()
			.addFilter('SourceHash', pSourceHash)
			.addFilter('RecordTimestamp', tmpFrom, '>=')
			.addFilter('RecordTimestamp', tmpTo, '<=')
			.setCap(0);

		this.meadowRecord.doReads(tmpQuery,
			function (pError, pQuery, pRecords)
			{
				if (pError)
				{
					return fCallback(pError);
				}

				if (!pRecords || !Array.isArray(pRecords))
				{
					return fCallback(null, []);
				}

				let tmpKeys = pRecords.map(
					function (pRecord)
					{
						return pRecord.RecordGUID;
					});

				return fCallback(null, tmpKeys);
			}.bind(this));
	}
}

module.exports = BibliographStorageMeadow;

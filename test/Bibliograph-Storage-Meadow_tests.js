/**
* Unit tests for Bibliograph Storage Meadow
*
* Uses SQLite as the Meadow provider for testing.
*
* @license MIT
* @author Steven Velozo <steven@velozo.com>
*/

const Chai = require('chai');
const Expect = Chai.expect;

const libFS = require('fs');
const libPict = require('pict');
const libBibliograph = require('bibliograph');
const libBibliographStorageMeadow = require('../source/Bibliograph-Storage-Meadow.js');
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');

const _SQLiteDBPath = __dirname + '/../data/BibliographMeadowTest.db';

// Clean up any previous test database before starting
try
{
	if (libFS.existsSync(_SQLiteDBPath))
	{
		libFS.unlinkSync(_SQLiteDBPath);
	}
}
catch (pError)
{
	// Ignore cleanup errors
}

// Ensure the data directory exists
let tmpDataDir = __dirname + '/../data';
if (!libFS.existsSync(tmpDataDir))
{
	libFS.mkdirSync(tmpDataDir, { recursive: true });
}

/**
 * Helper to create a fully wired Pict/Fable instance with Meadow storage.
 */
function createTestHarness(fCallback)
{
	let tmpPict = new libPict(
		{
			Product: 'BibliographStorageMeadowTest',
			SQLite:
			{
				SQLiteFilePath: _SQLiteDBPath
			},
			'Meadow-Provider': 'SQLite',
			LogStreams:
			[
				{
					level: 'fatal',
					streamtype: 'process.stdout'
				},
				{
					level: 'trace',
					path: __dirname + '/../data/tests.log'
				}
			]
		});

	// 1. Set up SQLite connection
	tmpPict.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
	tmpPict.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

	tmpPict.MeadowSQLiteProvider.connectAsync(
		function (pError)
		{
			if (pError)
			{
				return fCallback(pError);
			}

			// 2. Register Meadow storage provider BEFORE Bibliograph
			tmpPict.addServiceType('BibliographStorage', libBibliographStorageMeadow);
			tmpPict.instantiateServiceProvider('BibliographStorage', { 'Meadow-Provider': 'SQLite' });

			// 3. Register Bibliograph (it will find the already-registered BibliographStorage)
			tmpPict.addServiceTypeIfNotExists('Bibliograph', libBibliograph);
			tmpPict.instantiateServiceProvider('Bibliograph', {});

			// 4. Initialize the storage (creates tables)
			tmpPict.Bibliograph.initialize(
				function (pInitError)
				{
					if (pInitError)
					{
						return fCallback(pInitError);
					}

					return fCallback(null, tmpPict);
				});
		});
}

suite
(
	'Bibliograph-Storage-Meadow',
	function ()
	{
		let _Pict = false;

		suiteSetup
		(
			function (fDone)
			{
				createTestHarness(
					function (pError, pPict)
					{
						if (pError)
						{
							return fDone(pError);
						}
						_Pict = pPict;
						return fDone();
					});
			}
		);

		suiteTeardown
		(
			function (fDone)
			{
				try
				{
					if (_Pict && _Pict.MeadowSQLiteProvider && _Pict.MeadowSQLiteProvider.db)
					{
						_Pict.MeadowSQLiteProvider.db.close();
					}
				}
				catch (pError)
				{
					// Ignore close errors
				}
				fDone();
			}
		);

		suite
		(
			'Object Sanity',
			function ()
			{
				test
				(
					'should initialize the Meadow storage provider',
					function ()
					{
						Expect(_Pict).to.be.an('object', 'Pict should be initialized.');
						Expect(_Pict.BibliographStorage).to.be.an('object', 'BibliographStorage should be registered.');
						Expect(_Pict.BibliographStorage.Initialized).to.equal(true, 'Storage should be initialized.');
						Expect(_Pict.Bibliograph).to.be.an('object', 'Bibliograph should be registered.');
					}
				);
			}
		);

		suite
		(
			'Source Operations',
			function ()
			{
				test
				(
					'should create a source and verify it exists',
					function (fDone)
					{
						let tmpAnticipate = _Pict.newAnticipate();

						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.BibliographStorage.sourceExists('TestSource',
									function (pError, pExists)
									{
										Expect(pExists).to.equal(false, 'Source should not exist yet.');
										return fNext(pError);
									});
							});

						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.BibliographStorage.sourceCreate('TestSource', fNext);
							});

						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.BibliographStorage.sourceExists('TestSource',
									function (pError, pExists)
									{
										Expect(pExists).to.equal(true, 'Source should now exist.');
										return fNext(pError);
									});
							});

						tmpAnticipate.wait(fDone);
					}
				);
			}
		);

		suite
		(
			'Record CRUD via Bibliograph',
			function ()
			{
				test
				(
					'should write and read a record round-trip',
					function (fDone)
					{
						let tmpAnticipate = _Pict.newAnticipate();

						// Create a source
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.createSource('CRUDTest', fNext);
							});

						// Write a record
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.write('CRUDTest', 'Record-A', { Name: 'Alice', Age: 41 }, fNext);
							});

						// Read it back
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.read('CRUDTest', 'Record-A',
									function (pError, pRecord)
									{
										Expect(pRecord).to.be.an('object', 'Record should be returned.');
										Expect(pRecord.Name).to.equal('Alice', 'Name should match.');
										Expect(pRecord.Age).to.equal(41, 'Age should match.');
										return fNext(pError);
									});
							});

						tmpAnticipate.wait(fDone);
					}
				);

				test
				(
					'should verify record existence',
					function (fDone)
					{
						let tmpAnticipate = _Pict.newAnticipate();

						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.exists('CRUDTest', 'Record-A',
									function (pError, pExists)
									{
										Expect(pExists).to.equal(true, 'Record-A should exist.');
										return fNext(pError);
									});
							});

						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.exists('CRUDTest', 'Record-NONEXISTENT',
									function (pError, pExists)
									{
										Expect(pExists).to.equal(false, 'Non-existent record should not exist.');
										return fNext(pError);
									});
							});

						tmpAnticipate.wait(fDone);
					}
				);

				test
				(
					'should merge partial writes (deep merge via base class)',
					function (fDone)
					{
						let tmpAnticipate = _Pict.newAnticipate();

						// Write a partial update that adds a new field
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.write('CRUDTest', 'Record-A', { Height: 5.6 }, fNext);
							});

						// Read and verify the merge
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.read('CRUDTest', 'Record-A',
									function (pError, pRecord)
									{
										Expect(pRecord.Name).to.equal('Alice', 'Name should still be present.');
										Expect(pRecord.Age).to.equal(41, 'Age should still be present.');
										Expect(pRecord.Height).to.equal(5.6, 'Height should be added.');
										return fNext(pError);
									});
							});

						tmpAnticipate.wait(fDone);
					}
				);

				test
				(
					'should skip write when record is unchanged (dedup via metadata MD5)',
					function (fDone)
					{
						let tmpAnticipate = _Pict.newAnticipate();

						let tmpFirstIngest = false;

						// Read metadata before
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.readRecordMetadata('CRUDTest', 'Record-A',
									function (pError, pMetadata)
									{
										Expect(pMetadata).to.be.an('object', 'Metadata should exist.');
										tmpFirstIngest = pMetadata.Ingest;
										return fNext(pError);
									});
							});

						// Write exactly the same data
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.write('CRUDTest', 'Record-A', { Name: 'Alice', Age: 41, Height: 5.6 }, fNext);
							});

						// Read metadata after — MD5 should be the same
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.readRecordMetadata('CRUDTest', 'Record-A',
									function (pError, pMetadata)
									{
										Expect(pMetadata).to.be.an('object', 'Metadata should still exist.');
										// The ingest timestamp should not have changed since MD5 matched
										Expect(pMetadata.Ingest).to.equal(tmpFirstIngest, 'Ingest should not change for identical write.');
										return fNext(pError);
									});
							});

						tmpAnticipate.wait(fDone);
					}
				);

				test
				(
					'should update metadata when record changes',
					function (fDone)
					{
						let tmpAnticipate = _Pict.newAnticipate();

						let tmpOldMD5 = false;

						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.readRecordMetadata('CRUDTest', 'Record-A',
									function (pError, pMetadata)
									{
										tmpOldMD5 = pMetadata.MD5;
										return fNext(pError);
									});
							});

						// Write a change
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.write('CRUDTest', 'Record-A', { Age: 870 }, fNext);
							});

						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.readRecordMetadata('CRUDTest', 'Record-A',
									function (pError, pMetadata)
									{
										Expect(pMetadata.MD5).to.not.equal(tmpOldMD5, 'MD5 should change when record changes.');
										return fNext(pError);
									});
							});

						// Verify the data actually changed
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.read('CRUDTest', 'Record-A',
									function (pError, pRecord)
									{
										Expect(pRecord.Age).to.equal(870, 'Age should now be 870.');
										return fNext(pError);
									});
							});

						tmpAnticipate.wait(fDone);
					}
				);
			}
		);

		suite
		(
			'Key Enumeration',
			function ()
			{
				test
				(
					'should enumerate record keys for a source',
					function (fDone)
					{
						let tmpAnticipate = _Pict.newAnticipate();

						// Write a second record
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.write('CRUDTest', 'Record-B', { Name: 'Barry', Age: 39 }, fNext);
							});

						// Enumerate keys
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.readRecordKeys('CRUDTest',
									function (pError, pKeys)
									{
										Expect(pKeys).to.be.an('array', 'Keys should be an array.');
										Expect(pKeys.length).to.equal(2, 'There should be 2 records.');
										Expect(pKeys).to.include('Record-A', 'Record-A should be in the list.');
										Expect(pKeys).to.include('Record-B', 'Record-B should be in the list.');
										return fNext(pError);
									});
							});

						tmpAnticipate.wait(fDone);
					}
				);
			}
		);

		suite
		(
			'Timestamp Filtering',
			function ()
			{
				test
				(
					'should filter record keys by timestamp range',
					function (fDone)
					{
						let tmpAnticipate = _Pict.newAnticipate();

						let tmpFilterFromDate = false;

						// Wait a bit so the timestamp boundary is clean
						tmpAnticipate.anticipate(
							function (fNext)
							{
								setTimeout(
									function ()
									{
										tmpFilterFromDate = new Date();
										fNext();
									}, 200);
							});

						// Write a third record after the timestamp boundary
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.write('CRUDTest', 'Record-C', { Name: 'Cassandra', Age: 34 }, fNext);
							});

						// Only Record-C should appear in the filtered set
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.readRecordKeysByTimestamp('CRUDTest', tmpFilterFromDate, new Date(),
									function (pError, pKeys)
									{
										Expect(pKeys).to.be.an('array', 'Keys should be an array.');
										Expect(pKeys.length).to.equal(1, 'Only one record should match.');
										Expect(pKeys[0]).to.equal('Record-C', 'Record-C should be the matching key.');
										return fNext(pError);
									});
							});

						tmpAnticipate.wait(fDone);
					}
				);
			}
		);

		suite
		(
			'Delete',
			function ()
			{
				test
				(
					'should delete a record and verify it is gone',
					function (fDone)
					{
						let tmpAnticipate = _Pict.newAnticipate();

						// Delete Record-B
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.delete('CRUDTest', 'Record-B', fNext);
							});

						// Verify it no longer exists
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.exists('CRUDTest', 'Record-B',
									function (pError, pExists)
									{
										Expect(pExists).to.equal(false, 'Record-B should no longer exist.');
										return fNext(pError);
									});
							});

						// Read should return undefined/falsy
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.read('CRUDTest', 'Record-B',
									function (pError, pRecord)
									{
										Expect(pRecord).to.not.be.ok;
										return fNext(pError);
									});
							});

						// Key list should only have Record-A and Record-C
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.readRecordKeys('CRUDTest',
									function (pError, pKeys)
									{
										Expect(pKeys.length).to.equal(2, 'Should have 2 records after deletion.');
										Expect(pKeys).to.include('Record-A');
										Expect(pKeys).to.include('Record-C');
										Expect(pKeys).to.not.include('Record-B');
										return fNext(pError);
									});
							});

						tmpAnticipate.wait(fDone);
					}
				);
			}
		);

		suite
		(
			'Multiple Source Isolation',
			function ()
			{
				test
				(
					'should isolate records between sources',
					function (fDone)
					{
						let tmpAnticipate = _Pict.newAnticipate();

						// Create a second source with its own records
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.createSource('IsolationTest', fNext);
							});

						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.write('IsolationTest', 'Record-X', { Name: 'Xavier' }, fNext);
							});

						// CRUDTest should still have its records only
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.readRecordKeys('CRUDTest',
									function (pError, pKeys)
									{
										Expect(pKeys).to.not.include('Record-X', 'Record-X should not appear in CRUDTest.');
										return fNext(pError);
									});
							});

						// IsolationTest should only have Record-X
						tmpAnticipate.anticipate(
							function (fNext)
							{
								_Pict.Bibliograph.readRecordKeys('IsolationTest',
									function (pError, pKeys)
									{
										Expect(pKeys.length).to.equal(1, 'IsolationTest should have 1 record.');
										Expect(pKeys[0]).to.equal('Record-X');
										return fNext(pError);
									});
							});

						tmpAnticipate.wait(fDone);
					}
				);
			}
		);

		suite
		(
			'Non-existent Record Reads',
			function ()
			{
				test
				(
					'should return falsy for reading a non-existent record',
					function (fDone)
					{
						_Pict.Bibliograph.read('CRUDTest', 'Record-DOES-NOT-EXIST',
							function (pError, pRecord)
							{
								Expect(pRecord).to.not.be.ok;
								return fDone(pError);
							});
					}
				);

				test
				(
					'should return false metadata for non-existent record',
					function (fDone)
					{
						_Pict.Bibliograph.readRecordMetadata('CRUDTest', 'Record-DOES-NOT-EXIST',
							function (pError, pMetadata)
							{
								Expect(pMetadata).to.equal(false, 'Metadata should be false for non-existent record.');
								return fDone(pError);
							});
					}
				);
			}
		);
	}
);

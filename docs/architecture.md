# Architecture

## System Overview

The `bibliograph-storage-meadow` module sits between the Bibliograph record management framework and the database, using Meadow as the data access layer. This allows Bibliograph to store records in any Meadow-supported database without knowing database-specific details.

```mermaid
graph TB
	subgraph Application
		APP[Application Code]
		BIB[Bibliograph]
	end
	subgraph Storage Layer
		BSM["bibliograph-storage-meadow<br/>(BibliographStorageMeadow)"]
		BSB[BibliographStorageBase]
	end
	subgraph Data Access
		MS[Meadow - Source Entity]
		MR[Meadow - Record Entity]
		MD[Meadow - Delta Entity]
	end
	subgraph Database Backend
		CONN["meadow-connection-*<br/>(SQLite, MySQL, PostgreSQL, MSSQL)"]
		DB[(Database)]
	end
	APP --> BIB
	BIB --> BSM
	BSM --> BSB
	BSM --> MS
	BSM --> MR
	BSM --> MD
	MS --> CONN
	MR --> CONN
	MD --> CONN
	CONN --> DB
```

## Class Hierarchy

```mermaid
classDiagram
	class BibliographStorageBase {
		+generateDeltaContainer(guid)
		+sourceExists(hash, cb)
		+sourceCreate(hash, cb)
		+exists(hash, guid, cb)
		+read(hash, guid, cb)
		+persistRecord(hash, guid, json, cb)
		+persistDelete(hash, guid, cb)
		+readRecordMetadata(hash, guid, cb)
		+persistRecordMetadata(hash, guid, meta, cb)
		+stampRecordTimestamp(hash, guid, cb)
		+readRecordDelta(hash, guid, cb)
		+persistRecordDelta(hash, meta, delta, cb)
		+readRecordKeys(hash, cb)
		+readRecordKeysByTimestamp(hash, from, to, cb)
	}
	class BibliographStorageMeadow {
		+Initialized: boolean
		+MeadowProvider: string
		+meadowSource: Meadow
		+meadowRecord: Meadow
		+meadowDelta: Meadow
		+initialize(fCallback)
		-_findRecord(hash, guid, cb, noDelete)
		-_findDelta(hash, guid, cb)
	}
	BibliographStorageBase <|-- BibliographStorageMeadow
```

## Initialization Flow

```mermaid
sequenceDiagram
	participant App as Application
	participant BSM as BibliographStorageMeadow
	participant Meadow as Meadow
	participant DB as Database

	App->>BSM: initialize(callback)
	BSM->>Meadow: new Meadow('BibliographSource')
	BSM->>Meadow: new Meadow('BibliographRecord')
	BSM->>Meadow: new Meadow('BibliographDelta')
	Note over BSM: Set provider, schema, defaults

	alt SQLite Provider
		BSM->>DB: db.exec(CREATE TABLE BibliographSource)
		BSM->>DB: db.exec(CREATE TABLE BibliographRecord)
		BSM->>DB: db.exec(CREATE TABLE BibliographDelta)
	else Other Provider
		Note over BSM: Skip -- tables must already exist
	end

	BSM->>BSM: Initialized = true
	BSM-->>App: callback()
```

## Record Upsert Flow

All persist operations follow the same upsert pattern:

```mermaid
flowchart TD
	A["persistRecord(hash, guid, json, cb)"] --> B["_findRecord(hash, guid)"]
	B --> C{Record exists?}
	C -->|Yes| D["meadowRecord.doUpdate()<br/>Update RecordData"]
	C -->|No| E["meadowRecord.doCreate()<br/>Create with RecordData + Timestamp"]
	D --> F[callback]
	E --> F
```

## Data Flow: Read vs Write

```mermaid
flowchart LR
	subgraph Write Path
		W1[persistRecord] --> W2[JSON.stringify]
		W2 --> W3[_findRecord]
		W3 --> W4{exists?}
		W4 -->|Yes| W5[doUpdate]
		W4 -->|No| W6[doCreate]
	end
	subgraph Read Path
		R1[read] --> R2[_findRecord]
		R2 --> R3{row found?}
		R3 -->|Yes| R4[JSON.parse RecordData]
		R3 -->|No| R5[callback undefined]
		R4 --> R6[callback parsed object]
	end
```

## Three-Table Model

```mermaid
erDiagram
	BibliographSource {
		int IDBibliographSource PK
		text GUIDBibliographSource
		text SourceHash
		text CreateDate
		int Deleted
	}
	BibliographRecord {
		int IDBibliographRecord PK
		text GUIDBibliographRecord
		text SourceHash FK
		text RecordGUID
		text RecordData
		text MetadataJSON
		int RecordTimestamp
		int Deleted
	}
	BibliographDelta {
		int IDBibliographDelta PK
		text GUIDBibliographDelta
		text SourceHash FK
		text RecordGUID FK
		text DeltaJSON
		int Deleted
	}
	BibliographSource ||--o{ BibliographRecord : "SourceHash"
	BibliographRecord ||--o| BibliographDelta : "SourceHash + RecordGUID"
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Upsert pattern | Simplifies the API -- callers do not need to check existence before writing |
| JSON serialization | Records and metadata are schema-less; the database stores serialized JSON |
| Soft delete | Meadow manages `Deleted`, `DeleteDate`, `DeletingIDUser` fields automatically |
| Epoch ms timestamps | `RecordTimestamp` stores numeric epoch milliseconds for fast range queries |
| SQLite auto-create | SQLite is the default dev/test backend; auto-DDL reduces setup friction |
| Three Meadow entities | Source, Record, and Delta are independent entities with distinct schemas |
| SourceHash isolation | All queries include `SourceHash` to prevent cross-source data leakage |

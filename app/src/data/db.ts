import Dexie, { type DBCore, type DBCoreCursor, type DBCoreTable, type DBCoreTransaction, type Table } from 'dexie'
import { decryptJson, encryptJson, getOrCreateDeviceKey, loadDeviceKey, type EncryptedJson } from './crypto.ts'

// Local Dexie mirror is encrypted on-device; sync.ts sends cloud payloads over Supabase HTTPS.

export interface Profile {
  id: string // auth uid (uuid)
  nama: string
  email: string
  tanggal_lahir: string // YYYY-MM-DD
  noHp: string
  hpht: string // YYYY-MM-DD
  gravida: number
  para: number
  abortus: number
  fasyankes: string
  nama_bidan: string
  avatarPath?: string
  avatarBlob?: Blob
  pendingRegistration?: boolean
  createdAt: string
  updatedAt: string
}

export interface ScreeningResult {
  id: string
  userId: string
  tipe: string // poedji_rochjati | preeklamsia | imt_lila | danger_sign | dmg | epds | ...
  skor: number
  kategori: 'HIJAU' | 'KUNING' | 'MERAH'
  detail: Record<string, unknown> // JSONB; encrypted in Dexie, not at the application layer in Supabase
  createdAt: string
}

export interface WeightEntry { id: string; userId: string; tanggal: string; beratKg: number; createdAt?: string }
export interface SupplementReminder { id: string; userId: string; namaSuplemen: string; waktu: string; statusAktif: boolean; riwayatKepatuhan: number[]; bentuk?: string; dosis?: string; jumlah?: number; tanggalMulai?: string; tanggalSelesai?: string; frekuensi?: 'harian1' | 'harian2' | 'harian3' | 'mingguan' | string; hari?: number[]; waktuList?: string[] }
export interface DoseLog { id: string; userId: string; suplemenId: string; tanggal: string; waktu: string; status: 'taken' | 'skip' | 'none' }
export interface ANCVisit { id: string; userId: string; tanggalTerjadwal: string; statusSelesai: boolean; catatan?: string; mingguTerjadwal?: number; tanggalDiedit?: boolean }
export interface DiaryEntry { id: string; userId: string; tanggal: string; teks: string; mood: number; judul?: string }
export interface NifasScreening { id: string; userId: string; hariKe: number; parameterVital: Record<string, unknown>; status: string; createdAt: string }
export interface BBLProfile { id: string; userId: string; dataLahir: string; apgar?: number; usiaGestasi?: number }
export type BloodGroup = 'A' | 'B' | 'AB' | 'O' | ''
export interface BirthPlan {
  id: string
  userId: string
  penolong: string
  tempatBersalin: string
  pendamping: string
  hpBidanSiaga: string
  donor1Nama: string
  donor1GolonganDarah: BloodGroup
  donor2Nama: string
  donor2GolonganDarah: BloodGroup
  transportasi: string
  estimasiDana: number | null
  danaDikonfirmasi: boolean
  checklistPerlengkapan: Record<string, boolean>
  tandaPersalinanDipahami: Record<string, boolean>
  createdAt: string
  updatedAt: string
}
export interface SyncQueueItem { id?: number; table: string; op: 'insert' | 'upsert' | 'delete'; payload: Record<string, unknown>; onConflict?: string; createdAt: string }

export class SIAGADB extends Dexie {
  profiles!: Table<Profile, string>
  screeningResults!: Table<ScreeningResult, string>
  weightEntries!: Table<WeightEntry, string>
  supplementReminders!: Table<SupplementReminder, string>
  ancVisits!: Table<ANCVisit, string>
  diaryEntries!: Table<DiaryEntry, string>
  nifasScreenings!: Table<NifasScreening, string>
  bblProfiles!: Table<BBLProfile, string>
  doseLogs!: Table<DoseLog, string>
  birthPlans!: Table<BirthPlan, string>
  syncQueue!: Table<SyncQueueItem, number>

  constructor() {
    super('SIAGADB')
    this.version(1).stores({
      profiles: 'id, hpht',
      screeningResults: 'id, userId, tipe, kategori, createdAt',
      weightEntries: 'id, userId, tanggal',
      supplementReminders: 'id, userId, namaSuplemen',
      ancVisits: 'id, userId, tanggalTerjadwal',
      diaryEntries: 'id, userId, tanggal',
      nifasScreenings: 'id, userId, hariKe',
      bblProfiles: 'id, userId',
    })
    this.version(2).stores({
      syncQueue: '++id, table, createdAt',
    })
    this.version(3).stores({
      profiles: 'id, hpht, noHp',
    })
    this.version(4).stores({
      doseLogs: 'id, userId, tanggal',
    })
    this.version(5).stores({
      profiles: 'id, hpht, noHp, email',
    })
    this.version(6).stores({
      birthPlans: 'id, userId, updatedAt',
    })
    this.version(7).stores({
      profiles: 'id',
      screeningResults: 'id, userId',
      weightEntries: 'id, userId',
      supplementReminders: 'id, userId',
      ancVisits: 'id, userId',
      diaryEntries: 'id, userId',
      nifasScreenings: 'id, userId',
      bblProfiles: 'id, userId',
      doseLogs: 'id, userId',
      birthPlans: 'id, userId',
      syncQueue: '++id, table, userId, createdAt',
    })
  }
}

export const db = new SIAGADB()

export async function deleteLocalAccountData(userId: string) {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all([
      db.profiles.delete(userId),
      db.screeningResults.where('userId').equals(userId).delete(),
      db.weightEntries.where('userId').equals(userId).delete(),
      db.supplementReminders.where('userId').equals(userId).delete(),
      db.ancVisits.where('userId').equals(userId).delete(),
      db.diaryEntries.where('userId').equals(userId).delete(),
      db.nifasScreenings.where('userId').equals(userId).delete(),
      db.bblProfiles.where('userId').equals(userId).delete(),
      db.doseLogs.where('userId').equals(userId).delete(),
      db.birthPlans.where('userId').equals(userId).delete(),
      db.syncQueue.where('userId').equals(userId).delete(),
    ])
  })
}

const ENCRYPTED_TABLES = [
  'profiles', 'screeningResults', 'weightEntries', 'supplementReminders', 'ancVisits',
  'diaryEntries', 'nifasScreenings', 'bblProfiles', 'doseLogs', 'birthPlans', 'syncQueue',
]
const ALWAYS_ENCRYPTED_FIELDS = new Set(['email', 'noHp', 'hpht'])

function isEncrypted(value: unknown): value is Record<string, unknown> & EncryptedJson {
  return Boolean(value && typeof value === 'object' && '__siaga' in value)
}

function clearFields(table: DBCoreTable): Set<string> {
  const fields = new Set<string>()
  const addKeyPath = (keyPath: string | string[] | null) => {
    if (typeof keyPath === 'string') fields.add(keyPath)
    else if (Array.isArray(keyPath)) keyPath.forEach((field) => fields.add(field))
  }
  addKeyPath(table.schema.primaryKey.keyPath)
  table.schema.indexes.forEach((index) => addKeyPath(index.keyPath))
  if (table.name === 'syncQueue') ['table', 'op', 'onConflict', 'createdAt', 'userId'].forEach((field) => fields.add(field))
  ALWAYS_ENCRYPTED_FIELDS.forEach((field) => fields.delete(field))
  return fields
}

async function encryptRow(table: DBCoreTable, value: Record<string, unknown>, key?: CryptoKey) {
  if (isEncrypted(value)) return value
  const clear = clearFields(table)
  const indexed: Record<string, unknown> = {}
  const sensitive: Record<string, unknown> = {}
  for (const [field, item] of Object.entries(value)) {
    if (clear.has(field)) indexed[field] = item
    else sensitive[field] = item
  }
  if (table.name === 'syncQueue' && !indexed.userId) {
    const payload = value.payload as Record<string, unknown> | undefined
    indexed.userId = String(payload?.user_id ?? payload?.id ?? '')
  }
  return { ...indexed, ...(await encryptJson(sensitive, key)) }
}

async function decryptRow(value: Record<string, unknown>, key?: CryptoKey) {
  if (!isEncrypted(value)) return value
  const { __siaga, ...indexed } = value
  return { ...indexed, ...(await decryptJson({ __siaga }, key)) }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Gagal membaca data lokal'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('Gagal menyimpan data lokal'))
  })
}

async function migrateLocalRows(database: SIAGADB, tables: Map<string, DBCoreTable>) {
  const rawDatabase = database.backendDB()
  const names = ENCRYPTED_TABLES.filter((name) => rawDatabase.objectStoreNames.contains(name))
  if (!names.length) return

  const readTransaction = rawDatabase.transaction(names, 'readonly')
  const readDone = transactionDone(readTransaction)
  const rows = await Promise.all(names.map(async (name) => ({
    name,
    values: await requestResult(readTransaction.objectStore(name).getAll()) as Record<string, unknown>[],
  })))
  await readDone

  const hasCiphertext = rows.some(({ values }) => values.some(isEncrypted))
  let key = await loadDeviceKey()
  if (hasCiphertext && !key) throw new Error('Kunci data lokal hilang; data tetap dipertahankan dan tidak dapat dibuka')
  key ??= await getOrCreateDeviceKey()

  const replacements: Array<{ table: string; value: Record<string, unknown> }> = []
  for (const { name, values } of rows) {
    const table = tables.get(name)
    if (!table) continue
    for (const value of values) {
      if (isEncrypted(value)) {
        const clear = clearFields(table)
        const leaked = Object.keys(value).some((field) => field !== '__siaga' && !clear.has(field))
        if (leaked) replacements.push({ table: name, value: await encryptRow(table, await decryptRow(value, key), key) })
        else await decryptRow(value, key)
      } else {
        replacements.push({ table: name, value: await encryptRow(table, value, key) })
      }
    }
  }

  if (!replacements.length) return
  const writeTransaction = rawDatabase.transaction(names, 'readwrite')
  const writeDone = transactionDone(writeTransaction)
  for (const replacement of replacements) writeTransaction.objectStore(replacement.table).put(replacement.value)
  await writeDone
}

function compareKeys(left: IDBValidKey, right: IDBValidKey): number {
  return indexedDB.cmp(left, right)
}

function memoryCursor(
  rows: Record<string, unknown>[],
  table: DBCoreTable,
  indexName: string | null,
  trans: DBCoreTransaction,
  reverse: boolean,
): DBCoreCursor | null {
  if (!rows.length) return null
  const index = indexName === null ? table.schema.primaryKey : table.schema.indexes.find((item) => item.name === indexName) ?? table.schema.primaryKey
  let position = 0
  let stopped = false
  let stopValue: unknown
  const cursor: DBCoreCursor = {
    get trans() { return trans },
    get key() { return index.extractKey?.(rows[position]) },
    get primaryKey() { return table.schema.primaryKey.extractKey?.(rows[position]) },
    get value() { return rows[position] },
    get done() { return position >= rows.length },
    continue(key?: IDBValidKey) {
      position++
      if (key !== undefined) {
        while (position < rows.length) {
          const nextKey = index.extractKey?.(rows[position]) as IDBValidKey
          const comparison = compareKeys(nextKey, key)
          if (reverse ? comparison <= 0 : comparison >= 0) break
          position++
        }
      }
    },
    continuePrimaryKey(key: IDBValidKey, primaryKey: IDBValidKey) {
      position++
      while (position < rows.length) {
        const nextKey = index.extractKey?.(rows[position]) as IDBValidKey
        const nextPrimaryKey = table.schema.primaryKey.extractKey?.(rows[position]) as IDBValidKey
        const comparison = compareKeys(nextKey, key)
        if (reverse ? comparison < 0 || (comparison === 0 && compareKeys(nextPrimaryKey, primaryKey) < 0) : comparison > 0 || (comparison === 0 && compareKeys(nextPrimaryKey, primaryKey) > 0)) break
        position++
      }
    },
    advance(count: number) { position += count },
    async next() { position++; return cursor },
    start(callback: () => void) {
      while (position < rows.length && !stopped) {
        const previous = position
        callback()
        if (position === previous) position++
      }
      return Promise.resolve(stopValue)
    },
    stop(value?: unknown) { stopped = true; stopValue = value },
    fail(error: Error) { throw error },
  }
  return cursor
}

function installEncryption(database: SIAGADB) {
  let migration: Promise<void> | undefined
  database.use({
    stack: 'dbcore',
    name: 'SIAGA local encryption',
    create(downlevel: DBCore) {
      const schemas = new Map(downlevel.schema.tables.map((schema) => [schema.name, downlevel.table(schema.name)]))
      const ensureMigration = () => migration ??= migrateLocalRows(database, schemas)
      database.on('ready', ensureMigration)

      return {
        ...downlevel,
        table(name) {
          const table = downlevel.table(name)
          if (!ENCRYPTED_TABLES.includes(name)) return table
          return {
            ...table,
            async mutate(request) {
              if (request.type === 'add' || request.type === 'put') {
                const values = await Dexie.waitFor(Promise.all(request.values.map(async (value) => encryptRow(table, value, await getOrCreateDeviceKey()))))
                return table.mutate({ ...request, values, ...(request.type === 'put' ? { updates: undefined, changeSpec: undefined } : {}) })
              }
              return table.mutate(request)
            },
            async get(request) {
              const value = await table.get(request)
              return value ? decryptRow(value) : value
            },
            async getMany(request) {
              const values = await table.getMany(request)
              return Promise.all(values.map((value) => value ? decryptRow(value) : value))
            },
            async query(request) {
              const result = await table.query(request)
              return { ...result, result: await Promise.all(result.result.map((value) => decryptRow(value))) }
            },
            async openCursor(request) {
              if (!request.values) return table.openCursor(request)
              const result = await table.query({
                trans: request.trans,
                query: request.query,
                values: true,
                direction: request.reverse ? (request.unique ? 'prevunique' : 'prev') : (request.unique ? 'nextunique' : 'next'),
              })
              const values = await Promise.all(result.result.map((value) => decryptRow(value)))
              return memoryCursor(values, table, request.query.index.name, request.trans, Boolean(request.reverse))
            },
          }
        },
      }
    },
  })
}

installEncryption(db)
// ponytail: alias backwards-compat kalau ada import lama SiKiBaDB/SIGAPDB
export const SiKiBaDB = SIAGADB
export const SIGAPDB = SIAGADB

import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'
import { createServer } from 'vite'

globalThis.profileSyncCalls = []
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })
const userId = 'a393237a-d293-44af-ab39-3068bf35728a'
const server = await createServer({
  cacheDir: 'node_modules/.vite-test-registration-draft',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
  appType: 'custom',
  plugins: [{
    name: 'mock-auth-for-registration-draft-test',
    enforce: 'pre',
    resolveId(id) {
      return /^\.\/supabase(?:\.ts)?$/.test(id) ? '\0supabase-registration-draft-test' : null
    },
    load(id) {
      if (id !== '\0supabase-registration-draft-test') return null
      return `
        globalThis.supabaseStubLoaded = true
        export const supabase = {
          auth: {
            getSession: async () => ({ data: { session: { user: { id: '${userId}' }, access_token: 'verified' } } }),
            getUser: async () => ({ data: { user: { id: '${userId}', email: 'bunda@example.id' } } }),
          },
          from: () => ({ upsert: (payload) => { globalThis.profileSyncCalls.push(payload); return Promise.resolve({ error: null }) } }),
        }
      `
    },
  }],
})
try {
  const { saveRegistrationDraft } = await server.ssrLoadModule('/src/features/onboarding/registerForm.ts')
  await saveRegistrationDraft({
    nama: 'Bunda Uji', email: 'bunda@example.id', tanggalLahir: '1998-01-01',
    noHp: '081234567890', gravida: 2, para: 1, abortus: 0,
    hpht: '2026-09-01', fasyankes: 'Klinik', namaBidan: 'Bidan Uji',
  }, userId)
  const { db } = await server.ssrLoadModule('/src/data/db.ts')
  const draft = await db.profiles.get(userId)
  assert.equal(draft.nama, 'Bunda Uji')
  assert.equal(draft.hpht, '2026-09-01')
  assert.equal(draft.pendingRegistration, true)

  const { getCurrentProfile } = await server.ssrLoadModule('/src/data/currentUser.ts')
  assert.equal(globalThis.supabaseStubLoaded, true)
  const profile = await getCurrentProfile()
  assert.equal(profile.nama, 'Bunda Uji')
  assert.equal(profile.pendingRegistration, undefined)
  assert.equal((await db.profiles.get(userId)).pendingRegistration, undefined)
  assert.equal(globalThis.profileSyncCalls[0].id, userId)
  assert.equal(globalThis.profileSyncCalls[0].nama, 'Bunda Uji')
} finally {
  await server.close()
}

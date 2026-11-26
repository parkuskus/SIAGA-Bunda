import assert from 'node:assert/strict'
import { createMissingProfileDraft } from '../src/features/profil/profileRecovery.ts'

const draft = createMissingProfileDraft({ id: 'account-42', email: 'bunda@example.id' })
assert.equal(draft.id, 'account-42')
assert.equal(draft.email, 'bunda@example.id')
assert.equal(draft.nama, '')
assert.equal(draft.noHp, '')
assert.equal(draft.hpht, '')
assert.equal(draft.gravida, 1)
assert.equal(draft.para, 0)
assert.equal(draft.abortus, 0)
console.log('A missing real profile opens an empty draft for its authenticated owner, never demo data')

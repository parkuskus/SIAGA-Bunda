import assert from 'node:assert/strict'
import test from 'node:test'

const validationUI = await import('../src/features/skrining/components/screeningValidationUI.ts')
const postpartum = await import('../src/features/skrining/nifas/postpartumDay.ts')
const weightGain = await import('../src/features/tracker/weightGainReference.ts')

test('reference ranges flag values outside reference, not missing or boundary values', () => {
  assert.equal(typeof validationUI.isOutsideReferenceRange, 'function')
  const outside = validationUI.isOutsideReferenceRange
  assert.equal(outside(23.4, { min: 23.5 }), true)
  assert.equal(outside(23.5, { min: 23.5 }), false)
  assert.equal(outside(5, { min: 5, minInclusive: false }), true)
  assert.equal(outside(6, { min: 5, minInclusive: false }), false)
  assert.equal(outside(140, { max: 140, maxInclusive: false }), true)
  assert.equal(outside(Number.NaN, { min: 1, max: 2 }), false)
})

test('postpartum day uses the birth date and local calendar day', () => {
  assert.equal(typeof postpartum.postpartumDayFromBirthDate, 'function')
  const day = postpartum.postpartumDayFromBirthDate
  assert.equal(day('2026-11-01', new Date(2026, 10, 3, 23, 59)), 2)
  assert.equal(day('2026-11-03', new Date(2026, 10, 3)), 0)
  assert.equal(day('', new Date(2026, 10, 3)), null)
  assert.equal(day('2026-11-04', new Date(2026, 10, 3)), null)
  assert.equal(day('2026-09-01', new Date(2026, 10, 3)), null)
  assert.equal(day('2026-02-30', new Date(2026, 10, 3)), null)
})

test('weight gain table includes IOM total and trimester-two weekly references from the PDF', () => {
  assert.deepEqual(weightGain.WEIGHT_GAIN_REFERENCE.map(({ key, weeklyKg }) => [key, weeklyKg]), [
    ['Kurus', [0.44, 0.58]],
    ['Normal', [0.35, 0.50]],
    ['Gemuk', [0.23, 0.33]],
    ['Obesitas', [0.17, 0.27]],
  ])
})

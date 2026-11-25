import test from "node:test"
import assert from "node:assert/strict"
import { janinIllustrationPath, nearestJaninWeek } from "../src/features/edukasi/janinWeekData.ts"

test("maps gestational weeks to the closest available two-week material", () => {
  assert.equal(nearestJaninWeek(2).week, 2)
  assert.equal(nearestJaninWeek(3).week, 2)
  assert.equal(nearestJaninWeek(39).week, 38)
  assert.equal(nearestJaninWeek(40).week, 40)
  assert.equal(nearestJaninWeek(-1).week, 2)
  assert.equal(nearestJaninWeek(41).week, 40)
  assert.equal(nearestJaninWeek(Number.NaN), null)
  assert.equal(nearestJaninWeek(Number.POSITIVE_INFINITY), null)
})

test("maps material weeks to the existing S-06b illustration files", () => {
  assert.equal(janinIllustrationPath(2), "/s-06/s-06b/8.webp")
  assert.equal(janinIllustrationPath(20), "/s-06/s-06b/17.webp")
  assert.equal(janinIllustrationPath(40), "/s-06/s-06b/27.webp")
})

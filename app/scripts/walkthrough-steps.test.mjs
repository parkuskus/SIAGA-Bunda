import test from "node:test"
import assert from "node:assert/strict"
import { getWalkthroughSteps } from "../src/features/onboarding/walkthroughSteps.ts"

test("tour highlights real Beranda elements before guiding the other tabs", () => {
  const steps = getWalkthroughSteps(false)
  assert.deepEqual(steps.slice(0, 5).map((step) => step.target), [
    "home-header",
    "fetal-development",
    "pregnancy-summary",
    "quick-actions",
    "last-check",
  ])
  assert.deepEqual(steps.slice(5).map((step) => step.tab), ["skrining", "edukasi", "tracker", "profil"])
  assert.ok(steps.every((step) => step.title && step.description))
})

test("postpartum tour skips pregnancy-only fetal development", () => {
  const steps = getWalkthroughSteps(true)
  assert.equal(steps.some((step) => step.target === "fetal-development"), false)
  assert.equal(steps.length, 8)
})

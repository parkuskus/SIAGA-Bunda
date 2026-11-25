import test from "node:test"
import assert from "node:assert/strict"
import { markWalkthroughSeen, shouldShowWalkthrough, walkthroughStorageKey } from "../src/features/onboarding/walkthroughState.ts"

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

test("walkthrough state is stored per user", () => {
  const storage = memoryStorage()
  assert.equal(walkthroughStorageKey("user-a"), "siaga_walkthrough_seen_user-a")
  assert.equal(shouldShowWalkthrough("user-a", storage), true)
  markWalkthroughSeen("user-a", storage)
  assert.equal(shouldShowWalkthrough("user-a", storage), false)
  assert.equal(shouldShowWalkthrough("user-b", storage), true)
})

test("storage failures do not prevent entering the app", () => {
  const blockedStorage = {
    getItem() { throw new Error("blocked") },
    setItem() { throw new Error("blocked") },
  }
  assert.equal(shouldShowWalkthrough("user-a", blockedStorage), true)
  assert.doesNotThrow(() => markWalkthroughSeen("user-a", blockedStorage))
})

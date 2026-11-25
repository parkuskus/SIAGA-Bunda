export type WalkthroughStorage = Pick<Storage, "getItem" | "setItem">

export function walkthroughStorageKey(userId: string): string {
  return `siaga_walkthrough_seen_${userId}`
}

export function shouldShowWalkthrough(userId: string, storage: WalkthroughStorage): boolean {
  try {
    return storage.getItem(walkthroughStorageKey(userId)) !== "true"
  } catch {
    return true
  }
}

export function markWalkthroughSeen(userId: string, storage: WalkthroughStorage): void {
  try {
    storage.setItem(walkthroughStorageKey(userId), "true")
  } catch {
    // Walkthrough state is best-effort when browser storage is unavailable.
  }
}

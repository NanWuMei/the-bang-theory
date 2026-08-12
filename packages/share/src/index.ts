export interface ShareSnapshot {
  slug: string;
  dialogueIds: string[];
  createdAt: string;
}

/** Phase 4 实现：创建分享快照 */
export async function createShare(
  _dialogueIds: string[]
): Promise<ShareSnapshot> {
  throw new Error("Not implemented");
}

/** Phase 4 实现：读取分享快照 */
export async function getShare(_slug: string): Promise<ShareSnapshot | null> {
  return null;
}

export function channelPanelStats(baseCount: number, customIds: string[], importedIds: string[], pendingCount: number) {
  const saved = new Set(customIds);
  return {
    saved: baseCount + saved.size,
    imported: new Set(importedIds.filter((id) => saved.has(id))).size,
    pending: pendingCount,
  };
}
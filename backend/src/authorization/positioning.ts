/**
 * Shared helpers for stable, conflict-free ordering of columns and tasks.
 *
 * Position is a fractional index (float). New items are inserted between two
 * neighbors by averaging their positions; when the gap becomes too small to
 * reliably subdivide, the whole collection is rebalanced with evenly spaced
 * positions.
 */
export const POSITION_GAP = 1000;
export const MIN_POSITION_GAP = 1e-6;

export interface PositionedItem {
  id: string;
  position: number;
}

/**
 * Compute the position of a new item inserted between `prev` (the item just
 * before it) and `next` (the item just after it). Either may be undefined
 * when inserting at the start or end of an empty list.
 */
export function computeInsertPosition(
  prev: number | undefined,
  next: number | undefined,
): number {
  if (prev === undefined && next === undefined) return POSITION_GAP;
  if (prev === undefined) return Math.max((next as number) / 2, 0);
  if (next === undefined) return prev + POSITION_GAP;
  return (prev + next) / 2;
}

/**
 * True when the computed position is too close to a neighbor to keep
 * subdividing safely, in which case the caller should rebalance.
 */
export function needsRebalance(
  position: number,
  prev: number | undefined,
  next: number | undefined,
): boolean {
  if (prev !== undefined && Math.abs(position - prev) < MIN_POSITION_GAP) {
    return true;
  }
  if (next !== undefined && Math.abs(next - position) < MIN_POSITION_GAP) {
    return true;
  }
  return false;
}

/**
 * Builds a rebalanced position map in the format expected by Prisma updates
 * (order index -> { id, position }). Pass the desired final order of ids.
 */
export function buildRebalancedPositions(orderedIds: string[]): Map<string, number> {
  const map = new Map<string, number>();
  orderedIds.forEach((id, i) => map.set(id, (i + 1) * POSITION_GAP));
  return map;
}
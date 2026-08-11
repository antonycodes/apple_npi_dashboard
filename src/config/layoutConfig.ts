/**
 * layoutConfig — the 36 interactive positions mapped to board coordinates.
 *
 * Coordinates are percentages of a 16:9 board and were derived by tracing the
 * attached event floor-plan photo:
 *   - Bàn thu cũ (trade-in) : long table cluster on the LEFT      → 2 cols × 5 rows = 10
 *   - Bàn tư vấn (consult)  : main grid in the BOTTOM             → 8 cols × 2 rows = 16
 *   - Backup                : reserve positions in the top zone → 5 cols × 2 rows = 10
 * Total = 36.
 *
 * Numbering runs left→right, then top→bottom within each cluster.
 */
import type { ClusterKey, TablePosition } from '@/types/desk';

/**
 * Desk-code prefix per cluster — the ops-facing IDs are TC1–TC10 (Thu cũ),
 * TV1–TV16 (Tư vấn), BK1–BK10 (Backup). These same codes are the join key
 * against the Lark "Selection-*" desk tables.
 */
export const CLUSTER_PREFIX: Record<ClusterKey, string> = {
  tradein: 'TC',
  consult: 'TV',
  backup: 'BK',
};

/**
 * Minimum spacing between two adjacent desk centers, in board percent.
 *
 * A node is `--node` tall (index.css: 5.5% of the board height) and its row of
 * STT dots hangs `node/2 + 2px + dot` ≈ 5.5% of the height below the center, so
 * two rows need ≈ 8.5% plus breathing room. Columns only have to clear the node
 * width plus a 2-dot row (≈ 3.5% of the height ≈ 2.5% of a 16:9 width), but are
 * kept well above that so a 3-dot row still fits between two neighbours.
 */
const MIN_ROW_PITCH = 11; // % of board height
const MIN_COL_PITCH = 6; // % of board width

/** Assert a coordinate axis leaves enough room for the node + dot marks. */
function assertPitch(cluster: ClusterKey, axis: 'x' | 'y', values: number[], min: number): void {
  const sorted = [...values].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap < min) {
      throw new Error(
        `layoutConfig: ${cluster} ${axis} spacing ${gap}% < ${min}% — desk nodes and ` +
          `their STT dots would overlap. Move the coordinates apart (or shrink --node).`,
      );
    }
  }
}

/**
 * Build a grid of positions for one cluster.
 * Desk id/label = `${prefix}${n}` (1-based, unpadded), e.g. "TV7".
 * @param cluster  cluster key (drives the id prefix)
 * @param xs       column center X positions (%)
 * @param ys       row center Y positions (%)
 */
function buildGrid(cluster: ClusterKey, xs: number[], ys: number[]): TablePosition[] {
  assertPitch(cluster, 'x', xs, MIN_COL_PITCH);
  assertPitch(cluster, 'y', ys, MIN_ROW_PITCH);
  const prefix = CLUSTER_PREFIX[cluster];
  const out: TablePosition[] = [];
  let i = 0;
  for (const y of ys) {
    for (const x of xs) {
      i += 1;
      const code = `${prefix}${i}`;
      out.push({ id: code, cluster, label: code, x, y });
    }
  }
  return out;
}

// ── Bàn thu cũ (trade-in) — TOP-right block, 5 columns × 2 rows ─────────────
// Cùng hàng với Backup để tách hẳn khỏi vùng Tư vấn ở phía dưới.
export const TRADEIN_POSITIONS = buildGrid(
  'tradein',
  [58.5, 66.5, 74.5, 82.5, 90.5],
  [17, 29],
);

// ── Bàn tư vấn (consult) — BOTTOM-wide grid, 8 columns × 2 rows ─────────────
// Trải rộng toàn đáy bản đồ để node luôn tách biệt khỏi hai cụm phía trên.
export const CONSULT_POSITIONS = buildGrid(
  'consult',
  [10, 21.43, 32.86, 44.29, 55.71, 67.14, 78.57, 90],
  [59, 74],
);

// ── Backup — TOP-left zone, 5 columns × 2 rows ──────────────────────────────
export const BACKUP_POSITIONS = buildGrid(
  'backup',
  [9.5, 17.5, 25.5, 33.5, 41.5],
  [17, 29],
);

/** All 36 positions, flat. */
export const ALL_POSITIONS: TablePosition[] = [
  ...TRADEIN_POSITIONS,
  ...CONSULT_POSITIONS,
  ...BACKUP_POSITIONS,
];

/** Human-readable Vietnamese names per cluster, for legends/labels. */
export const CLUSTER_LABELS: Record<ClusterKey, string> = {
  tradein: 'Bàn thu cũ',
  consult: 'Bàn tư vấn',
  backup: 'Backup',
};

// Compile-time sanity: the brief mandates exactly 36 positions (10/16/10).
if (
  TRADEIN_POSITIONS.length !== 10 ||
  CONSULT_POSITIONS.length !== 16 ||
  BACKUP_POSITIONS.length !== 10
) {
  throw new Error(
    `layoutConfig: expected 10/16/10 positions, got ` +
      `${TRADEIN_POSITIONS.length}/${CONSULT_POSITIONS.length}/${BACKUP_POSITIONS.length}`,
  );
}

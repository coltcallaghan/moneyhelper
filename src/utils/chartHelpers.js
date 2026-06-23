// ─────────────────────────────────────────────────────────────────────────────
// chartHelpers.js — pure helpers for chart rendering (no React, no DOM).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute label positions for vertical chart markers so nearby labels don't
 * overlap. Markers within `threshold` of each other are grouped and alternated
 * between 'insideTop' and 'insideBottom'.
 * @param {Array<number>} markers - Marker x-values (ages); falsy entries ignored.
 * @param {number} [threshold=2] - Max gap to treat markers as a group.
 * @returns {Object<number,string>} Map of marker value → 'insideTop'|'insideBottom'.
 */
export function computeLabelPositions(markers, threshold = 2) {
  const nums = Array.from(new Set((markers || []).filter(Boolean).map(Number))).sort((a, b) => a - b);
  const groups = [];
  let cur = [];
  for (const m of nums) {
    if (cur.length === 0) { cur.push(m); continue; }
    const last = cur[cur.length - 1];
    if (m - last <= threshold) cur.push(m);
    else { groups.push(cur); cur = [m]; }
  }
  if (cur.length) groups.push(cur);
  const map = {};
  for (const g of groups) {
    if (g.length === 1) { map[g[0]] = 'insideTop'; continue; }
    if (g.length === 2) {
      map[g[0]] = 'insideTop';
      map[g[1]] = 'insideBottom';
      continue;
    }
    // For groups of 3 or more, place the middle marker at the bottom and others at top
    const mid = Math.floor(g.length / 2);
    for (let i = 0; i < g.length; i++) {
      map[g[i]] = (i === mid) ? 'insideBottom' : 'insideTop';
    }
  }
  return map;
}

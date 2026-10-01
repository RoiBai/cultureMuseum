// Equal-size archive cards. Era widths expand with density; dates are ordinal,
// not a proportional year scale. Rows within an era do not imply chronology.
export const CARD = {width: 3.1, height: 3.9, step: 3.9, rowStep: 5.2};
export const LIFT = 15;
// Stable offsets break the shelving grid while keeping era order and equal size.
export function floatingSlot(a, column, row, rows, start, elevation=0) {
  let seed=0;for(const char of a.id)seed=(seed*31+char.charCodeAt(0))>>>0;
  const phase=(seed%997)/997;
  return {
    x:start+2.4+column*CARD.step+(row%2)*.48+(phase-.5)*.35,
    y:elevation+2.5+Math.sin(column*1.7+row*1.1)*1.05+(phase-.5)*.6,
    z:(row-(rows-1)/2)*CARD.rowStep+Math.sin(column*1.1+phase*5)*.85
  };
}
export const featureValues = (a, key) => (Array.isArray(a[key]) ? a[key] : [a[key]]).filter(Boolean);

export function arrangeArchive(data, eraDefs) {
  const positions = new Map(), eras = [];
  let cursor = 0;
  for (const [id, title, subtitle, number] of eraDefs) {
    const items = data.filter(a => a.era === id);
    if (!items.length) continue;
    const rows = items.length > 30 ? 4 : items.length > 6 ? 3 : items.length > 1 ? 2 : 1;
    const columns = Math.ceil(items.length / rows);
    const width = Math.max(8.5, columns * CARD.step + 2.7);
    const depth = rows * CARD.rowStep + 1.5;
    const era = {id, title, subtitle, number, count: items.length, rows, columns,
      x: cursor + width / 2, start: cursor, end: cursor + width, width, depth, y: 0};
    items.forEach((a, i) => positions.set(a.id, {
      ...floatingSlot(a, Math.floor(i / rows), i % rows, rows, cursor),
      era: id, row: i % rows
    }));
    eras.push(era); cursor += width + 3.2;
  }
  return {positions, eras, length: Math.max(0, cursor - 3.2)};
}

// A record belongs to one shelf even when it has several selected features.
// All applicable features remain visible in its detail; no duplicated records.
export function arrangeLift(data, eraDefs, matchedIds, selected, dimension) {
  const eraOrder = new Map(eraDefs.map((e, i) => [e[0], i]));
  const records = data.filter(a => matchedIds.has(a.id));
  const selectedValues = [...(selected[dimension] || [])];
  const groups = new Map();
  for (const a of records) {
    const values = featureValues(a, dimension);
    const value = selectedValues.find(v => values.includes(v)) || values[0] || '未归类';
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(a);
  }
  const positions = new Map(), shelves = [], eras = [];
  let cursor = 0;
  for (const [value, items] of groups) {
    const start = cursor;
    items.sort((a, b) => eraOrder.get(a.era) - eraOrder.get(b.era));
    for (const [id, title] of eraDefs) {
      const peers = items.filter(a => a.era === id);
      if (!peers.length) continue;
      const rows = peers.length > 8 ? 3 : peers.length > 3 ? 2 : 1;
      const columns = Math.ceil(peers.length / rows);
      const width = Math.max(6.5, columns * CARD.step + 2.7);
      peers.forEach((a, i) => positions.set(a.id, {
        ...floatingSlot(a, Math.floor(i / rows), i % rows, rows, cursor, LIFT),
        era: id, row: i % rows, value
      }));
      eras.push({id, title, x: cursor + width / 2, start: cursor, end: cursor + width, value});
      cursor += width + 1.5;
    }
    const width = cursor - start - 1.5;
    shelves.push({value, dimension, count: items.length, start, end: start + width,
      x: start + width / 2, y: LIFT, width, depth: 17});
    cursor += 4;
  }
  return {positions, shelves, eras, length: shelves.at(-1)?.end || 0};
}

// Same-era objects stay together. Overflow creates another equally sized row,
// never a smaller image or a new chronological subdivision.
export function arrangeArtifacts(artifacts, eraDefs, cityNames, width) {
  const gutter = width < 700 ? 62 : 86;
  const available = Math.max(1, width - gutter - 20);
  const columns = Math.max(1, Math.floor(available / (width < 700 ? 96 : 120)));
  const slot = Math.min(132, available / columns);
  const rowHeight = 218;
  const positions = new Map(), eras = [], bands = [], rows = [];
  let y = 0;
  for (const [id, title, subtitle, num] of eraDefs) {
    const items = artifacts.filter(a => a.era === id)
      .sort((a,b) => cityNames.indexOf(a.city) - cityNames.indexOf(b.city));
    if (!items.length) continue;
    const rowCount = Math.ceil(items.length / columns);
    const era = {id, title, subtitle, num, count:items.length, y, height:rowCount*rowHeight+16, rowCount};
    eras.push(era);
    for (let index = 0; index < rowCount; index++) {
      const rowItems = items.slice(index*columns, (index+1)*columns);
      const row = {era:id, index, key:`${id}-${index}`, y:y+index*rowHeight, axis:y+index*rowHeight+201, ids:rowItems.map(a=>a.id)};
      rows.push(row);
      let run;
      rowItems.forEach((a,i) => {
        const x = gutter+10+slot*(i+.5);
        positions.set(a.id, {x, y:row.axis, top:row.y+45, era:id, row:index, rowKey:row.key, slot});
        if (!run || run.city !== a.city) {
          run = {city:a.city, era:id, row:index, x:gutter+10+slot*i+3, y:row.y+10, width:slot-6, height:198, count:1};
          bands.push(run);
        } else { run.width += slot; run.count++; }
      });
    }
    y += era.height;
  }
  return {gutter, columns, slot, positions, eras, bands, rows, height:y};
}

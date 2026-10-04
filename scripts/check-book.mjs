import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {pageReference,collectPassages,objectURL} from '../dist/book-source.js';

const root=new URL('../dist/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));
const book=read('data/book-index.json'),artifacts=read('data/artifacts.json');
const report=read('../docs/book-verification.json');
const norm=s=>s.replace(/\s+/gu,'');
const index=items=>{const map=new Map(items.map(x=>[x.id,x]));assert.equal(map.size,items.length,'IDs must be unique');return map};
const passages=index(book.passages),objects=index(book.objects),motifs=index(book.motifs),atlas=index(artifacts);
const localImage=path=>assert.ok(fs.existsSync(new URL(path,root)),`Missing image: ${path}`);
assert.equal(book.source.pdfPages,301);
assert.equal(book.coverage.reviewedPages,301);
assert.deepEqual(book.coverage.pages.map(p=>p.pdfPage),Array.from({length:301},(_,i)=>i+1));
for(const p of book.coverage.pages){
  assert.ok(p.reviewed,`Unreviewed page ${p.pdfPage}`);
  if(p.pdfPage>=7)assert.equal(p.printedPage,p.pdfPage-6);
  if(p.imageCount)assert.ok(p.figureReviewed,`Unreviewed figure on page ${p.pdfPage}`);
}
for(const p of passages.values()){
  assert.ok(p.quote.trim());
  assert.ok(p.pdfPage>=7&&p.pdfPage<=301);
  assert.equal(p.printedPage,p.pdfPage-6);
  assert.ok(['text-layer','visual-transcription','figure-caption'].includes(p.quoteSource));
  if(p.quoteParts){
    assert.equal(norm(p.quoteParts.map(x=>x.quote).join('')),norm(p.quote),'Cross-page quote must retain each part');
    assert.deepEqual(p.sourcePages,p.quoteParts.map(x=>x.pdfPage));
    for(const part of p.quoteParts)assert.equal(part.printedPage,part.pdfPage-6);
  }
  assert.ok(pageReference(p,book).includes('PDF 页'));
}
const kinds=new Set(['artifact','object-family','document','site','architecture','contemporary']);
for(const o of objects.values()){
  assert.ok(kinds.has(o.kind));
  assert.ok(o.passageIds.length,`No source for ${o.name}`);
  o.passageIds.forEach(id=>assert.ok(passages.has(id),`Unknown passage ${id}`));
  o.motifIds.forEach(id=>assert.ok(motifs.has(id),`Unknown motif ${id}`));
  if(o.existingId)assert.ok(atlas.has(o.existingId),`Unknown catalog identity ${o.existingId}`);
  assert.equal(o.url,objectURL(o));
  assert.ok(fs.existsSync(new URL(o.url.split('?')[0],root)));
  if(o.image)localImage(o.image);
  if(o.bookFigure){localImage(o.bookFigure.src);assert.ok(o.bookFigure.provenance)}
}
for(const m of motifs.values()){
  assert.ok(m.passageIds.length);
  m.passageIds.forEach(id=>assert.ok(passages.has(id)));
  m.objectIds.forEach(id=>{assert.ok(objects.has(id));assert.ok(objects.get(id).motifIds.includes(m.id))});
}
for(const [name,id] of Object.entries({'楚帛书':'chu-silk-manuscript','王子午鼎':'wangziwu-ding','鹿角双头镇墓兽':'guardian','包山二号墓车马纹漆奁':'hb-6914','天星观虎座鸟架鼓':'jz-459'})){
  const entry=book.objects.find(o=>o.name===name);assert.ok(entry,`Missing requested artifact ${name}`);assert.equal(entry.existingId,id);
}
const genericDrum=book.objects.find(o=>o.name==='虎座鸟架鼓');
assert.ok(genericDrum&&!genericDrum.existingId,'Generic drum must not be assigned to a specific tomb');
const chime=book.objects.filter(o=>o.existingId==='hb-4695');
assert.ok(collectPassages(book,chime).length>1,'Chime has original book passages');
assert.equal(report.sourceSHA256,book.source.sha256);
assert.equal(report.quoteFailures,0);
assert.equal(report.objects,objects.size);assert.equal(report.motifs,motifs.size);assert.equal(report.passages,passages.size);
for(const file of ['book.js','book-object.js','book-source.js','book-editorial.js'])execFileSync(process.execPath,['--check',fileURLToPath(new URL(file,root))]);
for(const file of ['book.html','book.js','book-object.html','book-object.js','book-source.js']){
  const source=fs.readFileSync(new URL(file,root),'utf8');
  assert.ok(!/href=["'][^"']*\.pdf|book\.html\?page=|打开PDF|打开书页/.test(source),`${file}: quotes should stay inline`);
}
assert.ok(!fs.existsSync(new URL('crane-flight.html',root)),'Cancelled crane flight page stays removed');
for(const file of ['index.html','object.js'])assert.ok(!fs.readFileSync(new URL(file,root),'utf8').includes('crane-flight'));
console.log(JSON.stringify({bookPages:301,objects:objects.size,motifs:motifs.size,passages:passages.size,linkedCatalogEntries:book.objects.filter(o=>o.existingId).length,failures:[]},null,2));

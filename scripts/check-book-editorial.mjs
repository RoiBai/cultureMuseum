import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readingFor,readingPages,readingFigures,editorialHTML,pageRanges} from '../dist/book-editorial.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url),'utf8'));
const book=read('book-index.json');
const passages=new Map(book.passages.map(p=>[p.id,p]));
let figures=0;
for(const [kind,records] of [['motif',book.motifs],['object',book.objects]]){
 const data=read(`book-${kind}-summaries.json`);
 assert.equal(data.sourceSHA256,book.source.sha256,'Summary must cite the reviewed source version');
 assert.deepEqual(Object.keys(data.summaries).sort(),records.map(r=>r.id).sort(),`Every ${kind} must have a summary`);
 for(const record of records){
  const r=readingFor(data,record,book);
  assert.ok(!/[\r\n]/.test(r.text),'Reading should be one coherent paragraph');
  assert.ok(r.passageIds.length,`${record.name}: missing source passages`);
  assert.equal(new Set(r.passageIds).size,r.passageIds.length);
  for(const id of r.passageIds){assert.ok(record.passageIds.includes(id),`${record.name}: unrelated source ${id}`);assert.ok(passages.has(id))}
  assert.ok(!r.passageIds.some(id=>passages.get(id).quote.replace(/\s/g,'')===r.text.replace(/\s/g,'')),`${record.name}: raw quote used as summary`);
  const expected=[...new Set(r.passageIds.flatMap(id=>{const p=passages.get(id);return p.sourcePages?.length?p.sourcePages:[p.pdfPage]}))];
  assert.deepEqual(readingPages(r,book),{pdf:pageRanges(expected),printed:pageRanges(expected.map(p=>p-6))});
  assert.ok((r.figureObjectIds||[]).length<=2);
  assert.equal(readingFigures(r,book).length,(r.figureObjectIds||[]).length,`${record.name}: unknown or duplicate figure`);
  figures+=readingFigures(r,book).length;
  const html=editorialHTML(r,book,{figures:true});
  assert.equal((html.match(/class="editorial-text"/g)||[]).length,1);
  assert.ok(html.includes('非逐字引文'));assert.ok(!html.includes('<blockquote>'));
 }
}
assert.throws(()=>readingFor({sourceSHA256:'wrong',summaries:{}},book.objects[0],book));
assert.throws(()=>readingFor({sourceSHA256:book.source.sha256,summaries:{}},book.objects[0],book));
const unsafe={text:'<script>alert("x")</script>',passageIds:[book.passages[0].id]};
assert.ok(!editorialHTML(unsafe,book).includes('<script>'));
console.log(JSON.stringify({motifSummaries:book.motifs.length,objectSummaries:book.objects.length,selectedFigures:figures,failures:[]}));

"""A later automatic extraction must not silently reverse a visual withdrawal."""
import json
from pathlib import Path
from rubbing_quality import preserve_reviewed,reviewed_entry

root=Path(__file__).resolve().parents[1]
entries=json.loads((root/'dist/data/rubbings.json').read_text())['entries']
reviews={e['id']:e for e in json.loads((root/'dist/data/rubbing-quality-review.json').read_text())['entries']}
objects={e['objectId'] for e in entries}
withdrawn=next(e for e in entries if e.get('qualityReview',{}).get('status')=='withdraw')
regenerated={**withdrawn,'available':True,'image':'incorrect-rerender.png'}
result=preserve_reviewed([regenerated],entries,reviews,objects)
restored=next(e for e in result if e['id']==withdrawn['id'])
assert not restored['available'] and 'image' not in restored
assert restored['archivedImage']==withdrawn['archivedImage']
assert regenerated['available'], 'Review must not mutate the input snapshot'
assert all(any(e['id']==r['id'] for e in result) for r in entries if r['id'] in reviews)
assert not preserve_reviewed([],entries,reviews,set()), 'Removed artifacts must not be restored'
print('Rubbing quality persistence: withdrawals and multiple reviewed crops survive re-extraction.')

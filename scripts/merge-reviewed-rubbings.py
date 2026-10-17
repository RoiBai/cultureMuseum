"""Merge visually approved candidate manifests while retaining photo provenance.

Run only after checking every candidate against its source photograph. The
separate candidate files and image hashes make the selection reproducible.
"""
from pathlib import Path
from copy import deepcopy
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
D = ROOT / 'dist'


def read(path):
    return json.loads(path.read_text())


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def merge(paths):
    rubbing = read(D / 'data/rubbings.json')
    quality = read(D / 'data/rubbing-quality-review.json')
    details = read(D / 'data/detail-regions.json')
    objects = read(D / 'data/artifacts.json')
    objects_by_id = {o['id']: o for o in objects}
    entries = {e['id']: e for e in rubbing['entries']}
    reviews = {e['id']: e for e in quality['entries']}
    merged = []
    for path in paths:
        batch = read(path)
        regions = {u['region']['id']: u for u in batch.get('detailUpdates', [])}
        for candidate in batch['entries']:
            e = deepcopy(candidate)
            assert e.get('available') and e.get('surfaceVerified') and e['view'] == 'detail', e['id']
            assert sha(D / e['photo']) == e['sourceSHA256'], e['id'] + ': source photograph changed'
            assert (D / e['image']).is_file(), e['id'] + ': missing image'
            a = objects_by_id[e['objectId']]
            assert e['source'] == a['source'], e['id'] + ': object record source differs'
            reviewed = e.get('reviewed', batch['reviewed'])
            review = e.get('qualityReview')
            reason = review.get('reason') if isinstance(review, dict) else review
            assert reason, e['id'] + ': missing visual review'
            e['qualityReview'] = {'reviewed': reviewed, 'status': 'retain', 'reason': reason,
                                  'method': batch.get('method', e['method']) + ' 原图与提取结果逐张对照；未补绘。'}
            e['extractedOn'] = reviewed
            e['extractionBatch'] = 'expansion-20261018'
            update = regions.get(e['regionId'])
            region = deepcopy(e.get('sourceRegion') or update['region'])
            assert region['rect'] == e['rect'] and region['sourceImage'] == e['photo']
            assert region['value'] == e['motif'] and region['rubbingEligible']
            e['sourceRegion'] = region
            # The object page uses displayImage coordinates. Alternate-photo crops
            # stay with the rubbing and its own photograph, never with that viewer.
            if e['photo'] == a['displayImage']:
                current = details['artifacts'].setdefault(a['id'], [])
                details['artifacts'][a['id']] = [r for r in current if r['id'] != region['id']] + [region]
            if e['motif'] not in a['motifs']:
                a['motifs'].append(e['motif'])
                a.setdefault('motifReview', {}).update({
                    'reviewed': reviewed, 'motifs': a['motifs'][:], 'photoBased': True,
                    'basis': region['basis'], 'source': a['source'],
                    'photoSource': e.get('photoSource', a['source']),
                })
            if e.get('credit'):
                e['credit']['changes'] = '原照片局部裁切与单色线条提取；去除孤立噪点、平滑边缘，未补绘。'
            entries[e['id']] = e
            reviews[e['id']] = {
                'id': e['id'], 'objectId': e['objectId'], 'motif': e['motif'], 'label': e['label'],
                'status': 'retain', 'reason': reason, 'asset': e['image'],
                'assetSHA256': sha(D / e['image']),
            }
            merged.append(e['id'])
    rubbing['entries'] = list(entries.values())
    rubbing['latestBatch'] = 'expansion-20261018'
    quality['entries'] = list(reviews.values())
    visible = sum(e['available'] for e in entries.values())
    withdrawn = sum(r['status'] == 'withdraw' for r in reviews.values())
    new = sum(bool(e.get('extractedOn')) for e in entries.values() if e['available'])
    quality['scope'] = '原有 72 个数字拓影二次审核，以及 2026-10-18 新增、重新提取的器表纹饰'
    quality['summary'].update(reviewed=len(reviews), retained=visible, withdrawn=withdrawn, newExtractions=new)
    rubbing['qualityReview'].update(reviewedAssets=len(reviews), retained=visible, withdrawn=withdrawn, newExtractions=new)
    for path, data in [('rubbings.json', rubbing), ('rubbing-quality-review.json', quality),
                       ('detail-regions.json', details), ('artifacts.json', objects)]:
        write(D / 'data' / path, data)
    print(json.dumps({'merged': len(merged), 'visible': visible, 'ids': merged}, ensure_ascii=False))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('Provide one or more visually approved candidate manifests.')
    merge([ROOT / name for name in sys.argv[1:]])

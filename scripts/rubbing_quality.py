"""Keep a visual review authoritative when the automatic extractor is rerun."""
from copy import deepcopy


def reviewed_entry(entry, review):
    result = deepcopy(entry)
    result['qualityReview'] = {
        **result.get('qualityReview', {}),
        'reviewed': review.get('reviewed', '2026-10-18'),
        'status': review['status'],
        'reason': review['reason'],
    }
    if review['status'] == 'withdraw':
        result['available'] = False
        result['kind'] = '仅有纹饰记录'
        result['unavailableReason'] = '二次图像复核：' + review['reason']
        if result.get('image'):
            result['archivedImage'] = result.pop('image')
    return result


def preserve_reviewed(entries, previous, reviews, object_ids):
    """Also retain multiple approved crops from the same object/motif family."""
    merged = {entry['id']: entry for entry in entries}
    for entry in previous:
        if entry['id'] in reviews and entry['objectId'] in object_ids:
            merged[entry['id']] = reviewed_entry(entry, reviews[entry['id']])
    return list(merged.values())

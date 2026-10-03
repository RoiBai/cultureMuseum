"""Sample either a reviewed foreground or an explicit original-image region.

Original photos and manuscript facsimiles must not silently be treated as
transparent object cutouts. A normalized paletteSampleRect is an auditable
measurement window, not a claim about ancient pigment.
"""
from PIL import Image, ImageFilter
from photo_colors import summarize_colors

def measured_palette(artifact, dist):
    photo = Image.open(dist / artifact['displayImage']).convert('RGBA')
    rect = artifact.get('paletteSampleRect')
    if rect is not None:
        assert len(rect) == 4 and all(isinstance(v, (int, float)) for v in rect)
        x, y, w, h = rect
        assert x >= 0 and y >= 0 and w > 0 and h > 0 and x + w <= 1.000001 and y + h <= 1.000001
        width, height = photo.size
        photo = photo.crop((round(x * width), round(y * height), round((x+w) * width), round((y+h) * height)))
        # Keep the original pixels for manuscript ink: resizing would blend
        # narrow strokes into the light facsimile substrate before filtering.
        if artifact.get('palettePixelFilter') is None:
            photo.thumbnail((220, 220))
        pixels = list(photo.convert('RGB').getdata())
    else:
        photo.thumbnail((220, 220))
        valid = photo.getchannel('A').filter(ImageFilter.MinFilter(3))
        pixels = [p for p, m in zip(photo.convert('RGB').getdata(), valid.getdata()) if m >= 250]
    pixel_filter = artifact.get('palettePixelFilter')
    if pixel_filter is not None:
        assert pixel_filter['method'] == 'luminance-below'
        limit = pixel_filter['maxLuminance']
        assert isinstance(limit, (int, float)) and 0 < limit < 255
        pixels = [p for p in pixels if .2126*p[0] + .7152*p[1] + .0722*p[2] < limit]
    if not pixels:
        raise ValueError('No image samples: ' + artifact['id'])
    return summarize_colors(pixels)

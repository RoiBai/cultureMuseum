"""Conservative names for photographed colours, including muted tones.

Hue alone is insufficient: a dark, low-chroma yellow-green is grey-green,
not gold. Names describe the displayed RGB swatch, never an inferred pigment.
"""
import colorsys
from collections import defaultdict

def color_name(rgb):
    h,s,v=colorsys.rgb_to_hsv(*(channel/255 for channel in rgb));h*=360
    if v<.23:return '漆黑'
    if s<.15:return '墨灰' if v<.60 else '灰白'
    if s<.30:
        if 48<=h<175 and v<.72:return '灰绿'
        if h<75 or h>=325:return '灰褐' if v<.72 else '灰白'
        return '墨灰' if v<.60 else '灰白'
    if h<18 or h>=345:return '赤红' if v>=.46 else '赭褐'
    if h<46:
        return '金黄' if h>=40 and s>=.50 and v>=.74 else '赭褐'
    if h<70:
        return '金黄' if s>=.50 and v>=.74 else '灰绿'
    if h<175:return '青绿' if s>=.35 else '灰绿'
    if h<270:return '靛蓝'
    return '绛紫'

def summarize_colors(pixels):
    groups=defaultdict(lambda:[0,0,0,0])
    for rgb in pixels:
        group=groups[color_name(rgb)];group[0]+=1
        for i in range(3):group[i+1]+=rgb[i]
    # Recheck the actual mean swatch, not just the original pixel assignments.
    # Merge categories if their averages now fall into the same colour family.
    for _ in range(8):
        revised=defaultdict(lambda:[0,0,0,0])
        for group in groups.values():
            rgb=tuple(round(group[i+1]/group[0]) for i in range(3))
            target=revised[color_name(rgb)]
            for i in range(4):target[i]+=group[i]
        if dict(revised)==dict(groups):break
        groups=revised
    result=[]
    for name,group in sorted(groups.items(),key=lambda entry:entry[1][0],reverse=True):
        if group[0]/len(pixels)<.025 or len(result)==4:continue
        rgb=tuple(round(group[i+1]/group[0]) for i in range(3))
        result.append({'name':color_name(rgb),'hex':'#%02x%02x%02x'%rgb,'share':round(group[0]/len(pixels)*100,1)})
    return result

#!/usr/bin/env python3
"""WORK0 #104: visual delta from TWO independently built GitHub commit SHAs.

Not a same-code CSS toggle. Reports separate base/head images at native
384x512 and phone 320x568/390x844, with approved 01-08 artwork alongside.
Do not use numerical MAE alone as artistic approval, particularly for live 3D.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageChops, ImageStat, ImageDraw
import json
import sys

root=Path(sys.argv[1]) if len(sys.argv)>1 else Path('work0-qa')
approved=Path(sys.argv[2]) if len(sys.argv)>2 else Path('../assets/design-approved')
refs={
    'porto':'01-porto.webp',
    'battle':'02-batalha.webp',
    'frota':'03-frota.webp',
    'forja':'04-melhorias-forja.webp',
    'cartas':'05-cartas.webp',
    'loja':'06-loja.webp',
    'missoes':'07-missoes.webp',
    'ranking':'08-ranking-perfil.webp',
}
sizes=[(384,512),(390,844),(320,568)]
records=[]
for width,height in sizes:
    for screen,filename in refs.items():
        before=Image.open(root/('base-%s-%dx%d.png'%(screen,width,height))).convert('RGB')
        after=Image.open(root/('head-%s-%dx%d.png'%(screen,width,height))).convert('RGB')
        assert before.size==after.size==(width,height), (screen,width,height)
        original=Image.open(approved/filename).convert('RGB')
        if original.size==(width,height):
            reference=original
        else:
            scaled=ImageOps.contain(original,(width,height),Image.Resampling.LANCZOS)
            reference=Image.new('RGB',(width,height),'#10263d')
            reference.paste(scaled,((width-scaled.width)//2,(height-scaled.height)//2))
        diff=ImageChops.difference(before,after)
        base_error=ImageChops.difference(reference,before)
        head_error=ImageChops.difference(reference,after)
        def mae(im):
            return round(sum(ImageStat.Stat(im).mean[:3])/3,5)
        delta_rgb=mae(diff)
        source_base=mae(base_error)
        source_head=mae(head_error)
        altered=sum(1 for r,g,b in diff.getdata() if max(r,g,b)>12)
        altered_pct=round(100*altered/(width*height),4)
        # Heatmap is a direct pixel difference, not a fabricated new render.
        heat=ImageOps.colorize(diff.convert('L'),black='#071b2c',white='#ffce73')
        board=Image.new('RGB',(width*4,height+24),'#071a30')
        for i,(name,image) in enumerate((
            ('APPROVED',reference),('BASE SHA',before),('PR HEAD SHA',after),('REAL PIXEL DIFF',heat)
        )):
            board.paste(image,(width*i,24))
            ImageDraw.Draw(board).text((width*i+7,6),name,fill='#f9daa0')
        path='compare-%s-%dx%d.png'%(screen,width,height)
        board.save(root/path,optimize=True)
        records.append({
            'screen':screen,'viewport':[width,height],
            'reference':filename,'comparison':path,
            'changed_pixels_over_12_rgb':altered,'changed_percent':altered_pct,
            'delta_mae_rgb':delta_rgb,
            'source_mae_base':source_base,'source_mae_head':source_head,
            'change_towards_reference':round(source_base-source_head,5),
            'dynamic_scene_warning':screen in ('porto','battle'),
            'approved':False
        })
result={
    'comparison':'actual GitHub base commit vs PR head commit, two builds and two live pages',
    'baseline_is_not_css_toggle':True,
    'artistic_approval':False,'screen_approvals':0,
    'caveat':'Native 384x512 is directly comparable; 320 and 390 reference images are contained to avoid distortion. WebGL wave frames are animated, so dynamic pixel differences are not causal proof.',
    'screens':records
}
(root/'true-basehead-report.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
print('WORK0_GENUINE_SHA_DIFF '+json.dumps({
    'screenshots':len(records),
    'native':{x['screen']:x['changed_percent'] for x in records if x['viewport']==[384,512]},
    'artisticApproval':False
},ensure_ascii=False))

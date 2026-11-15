"""Build three copy/paste Webflow blocks, hosted HTML and offline HTML.
Run from any directory. No packages required beyond Python's standard library.
"""
from pathlib import Path
import xml.etree.ElementTree as E
import re,json
BASE=Path(__file__).resolve().parents[1]
NS='http://www.w3.org/2000/svg'
E.register_namespace('',NS)
mascot=E.fromstring((BASE/'assets/rise.svg').read_text())
group=mascot.find('{'+NS+'}g')
group.set('transform','translate(500 435)')
group.find('.//*[@id="rise-scale"]').set('transform','scale(1.22)')
group.find('.//*[@id="rise-tilt"]').set('transform','rotate(-7)')
scene=(BASE/'assets/scene.svg').read_text().replace('<!-- RISE_MASCOT -->',E.tostring(group,encoding='unicode'))
(BASE/'assets/scene-complete.svg').write_text(scene)
body=(BASE/'story.html').read_text().replace('<!-- INLINE_SCENE -->',scene)
css=(BASE/'assets/story.css').read_text()
app=(BASE/'assets/story.js').read_text()
head='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f6f3e9"><title>RISE · Some stories are bigger than us.</title><meta name="description" content="An illustrated journey through humanity’s interplanetary heritage. Explore the Moon and Mars with RISE, a little storyteller with a big heart."><style>html,body{margin:0;background:#f6f3e9}body{overflow-x:clip}</style>'
(BASE/'index.html').write_text(head+'<link rel="stylesheet" href="assets/story.css"></head><body>'+body+'<script src="assets/vendor/gsap.min.js"></script><script src="assets/vendor/ScrollTrigger.min.js"></script><script src="assets/story.js"></script></body></html>')
footer='<script>\n'+app+'\n</script>'
blocks={'01_HEAD.html':'<style>\n'+css+'\n</style>','02_BODY_EMBED.html':body,'03_FOOTER.html':footer}
for name,content in blocks.items():
 assert len(content)<50000,(name,len(content))
 (BASE/'webflow'/name).write_text(content)
vendors=''.join('<script>\n'+(BASE/'assets/vendor'/name).read_text().replace('</script','<\\/script')+'\n</script>' for name in ['gsap.min.js','ScrollTrigger.min.js'])
preview=head+'<style>'+css+'</style></head><body>'+body+vendors+footer+'</body></html>'
(BASE/'VantaLumen_SVG_Preview.html').write_text(preview)
(BASE/'BUILD_INFO.json').write_text(json.dumps({'blocks':{k:len(v) for k,v in blocks.items()},'preview_bytes':len(preview.encode()),'engine':'GSAP 3.13.0 + ScrollTrigger 3.13.0','requires_glb_at_runtime':False},indent=2))
print((BASE/'BUILD_INFO.json').read_text())

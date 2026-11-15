"""Create an editable contact sheet from the original RISE vector layers."""
from pathlib import Path
import xml.etree.ElementTree as E
from copy import deepcopy
BASE=Path(__file__).resolve().parents[1]
NS='http://www.w3.org/2000/svg'
E.register_namespace('',NS)
def tag(name):return '{'+NS+'}'+name
source=E.fromstring((BASE/'assets/rise.svg').read_text())
mascot=source.find(tag('g'))
sheet=E.Element(tag('svg'),{'viewBox':'0 0 1400 870','width':'1400','height':'870','role':'img','aria-labelledby':'sheet-title'})
E.SubElement(sheet,tag('title'),{'id':'sheet-title'}).text='RISE · Seven expressive vector poses'
E.SubElement(sheet,tag('rect'),{'width':'1400','height':'870','fill':'#f6f3e9'})
def text(x,y,value,size=18,fill='#233d47',anchor='start',family='Arial,sans-serif'):
 E.SubElement(sheet,tag('text'),{'x':str(x),'y':str(y),'fill':fill,'font-size':str(size),'font-family':family,'text-anchor':anchor}).text=value
text(66,58,'VANTALUMEN  /  RISE',13,'#708776')
text(65,110,'A little face. Seven ways to feel.',38)
text(1335,58,'EDITABLE SVG · EMOTION STUDY',11,'#708776','end')
E.SubElement(sheet,tag('path'),{'id':'sheet-rule','d':'M65 138H1335','stroke':'#cfd9c4','fill':'none'})
spec=[('happy','A warm welcome',175,295,-7),('curious','Choosing a world',525,295,11),('amazed','The first landing',875,295,-9),('focused','A dusty discovery',1225,295,-12),('confident','A little knowledge',350,652,6),('concerned','A fragile future',700,652,8),('grateful','A shared legacy',1050,652,-3)]
for index,(emotion,caption,x,y,tilt) in enumerate(spec):
 E.SubElement(sheet,tag('ellipse'),{'id':emotion+'-ground','cx':str(x),'cy':str(y+92),'rx':'64','ry':'10','fill':'#dbe3cf'})
 outer=E.SubElement(sheet,tag('g'),{'id':'mood-'+emotion,'transform':f'translate({x} {y}) scale(.55)'})
 clone=deepcopy(mascot)
 clone.find('.//*[@id="rise-tilt"]').set('transform',f'rotate({tilt})')
 for element in clone.iter():
  if element.get('data-emotion') is not None:element.set('opacity','1' if element.get('data-emotion')==emotion else '0')
  if element.get('id'):element.set('id',emotion+'-'+element.get('id'))
 outer.append(clone)
 text(x,y+131,emotion.capitalize(),19,anchor='middle')
 text(x,y+154,f'0{index+1} / '+caption,11,'#7c9079','middle')
text(65,843,'Globe cap · gold star band · lavender cheeks · named animation layers',11,'#7c9079')
text(1335,843,'Original vector interpretation of the supplied GLB',10,'#7c9079','end')
(BASE/'RISE_Emotion_Sheet.svg').write_text(E.tostring(sheet,encoding='unicode'))

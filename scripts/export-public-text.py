"""Regenerate the public, chat-readable edition from the deployed HTML sources."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin
import re
site=Path(__file__).resolve().parents[1]
origin='https://dongchan-portfolio.me/'
class Text(HTMLParser):
 def __init__(self,url):super().__init__();self.url=url;self.out=[];self.links=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag in ['script','style']:self.skip+=1
  if self.skip:return
  if tag in ['h1','h2','h3','h4']:self.out.append('\n\n'+'#'*int(tag[1])+' ')
  elif tag in ['p','section','article','div','dl','dt','dd','figcaption','summary','tr','pre']:self.out.append('\n')
  elif tag=='li':self.out.append('\n- ')
  elif tag in ['br']:self.out.append('\n')
  elif tag in ['span','td','th']:self.out.append(' ')
  elif tag=='a':self.links.append(urljoin(self.url,d.get('href','')));self.out.append('[')
 def handle_endtag(self,tag):
  if tag in ['script','style']:self.skip=max(0,self.skip-1);return
  if self.skip:return
  if tag=='a' and self.links:self.out.append(']('+self.links.pop()+') ')
  elif tag in ['p','li','section','article','h1','h2','h3','h4','tr','pre']:self.out.append('\n')
  elif tag in ['span','td','th']:self.out.append(' ')
 def handle_data(self,data):
  if not self.skip:self.out.append(data)
paths=['index.html','projects/multi-robot.html','projects/replay.html','projects/kpi.html','projects/imitation.html','projects/youth-policy.html','projects/air-purifier.html','activities/military.html','activities/association.html','activities/hansori.html','activities/work-study.html']
parts=['# 신동찬 · 포트폴리오\n\n공개 웹 포트폴리오의 본문 텍스트입니다.\n\n[포트폴리오 홈]('+origin+')\n']
for name in paths:
 html=(site/name).read_text(encoding='utf-8');main=re.search(r'<main\b[^>]*>(.*?)</main>',html,re.S).group(1)
 parser=Text(urljoin(origin,name));parser.feed(main)
 text=re.sub(r'\n[ \t]+','\n',''.join(parser.out));text=re.sub(r'\n{3,}','\n\n',text).strip()
 parts.append('\n\n---\n\n원본: '+urljoin(origin,name)+'\n\n'+text)
(site/'portfolio.md').write_text('\n'.join(line.rstrip() for line in '\n'.join(parts).splitlines())+'\n',encoding='utf-8')
print('Public text refreshed:',len(paths),'pages')

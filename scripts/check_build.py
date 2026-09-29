"""Check preview/production separation and search metadata without network access."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser
import json,re,subprocess,sys,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(root/'build_page.py')],check=True)
preview=(root/'dist/index.html').read_bytes()
subprocess.run([sys.executable,str(root/'build_page.py'),'--production'],check=True)
assert (root/'dist/index.html').read_bytes()==preview,'Production build changed preview'
prod=(root/'production/index.html').read_text();prev=preview.decode()
expected_preview=prod.replace('data-delivery="production"','data-delivery="preview"').replace('Your details will only be used to respond to your enquiry.', 'Preview only: enquiries are not yet sent. Please don’t enter sensitive information.')
assert expected_preview.split('<body>',1)[1]==prev.split('<body>',1)[1],'Unexpected visible markup difference' 
assert 'noindex' in prev and 'noindex' not in prod and 'nofollow' not in prod
class Page(HTMLParser):
 def __init__(self):super().__init__();self.tags=[];self.text=[];self.label_depth=0;self.controls=[];self.labels=set();self.script=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);self.tags.append((tag,a))
  if tag=='label':
   self.label_depth+=1
   if 'for' in a:self.labels.add(a['for'])
  if tag in ('input','select','textarea'):self.controls.append((a,self.label_depth>0))
  if tag=='script':self.script=True
 def handle_endtag(self,tag):
  if tag=='label':self.label_depth-=1
  if tag=='script':self.script=False
 def handle_data(self,data):
  if not self.script:self.text.append(data)
p=Page();p.feed(prod)
meta={a.get('name',a.get('property')):a.get('content') for t,a in p.tags if t=='meta'}
url='https://thewelcomebook.co.uk/'
assert [a['href'] for t,a in p.tags if t=='link' and a.get('rel')=='canonical']==[url]
for k in ['og:title','og:description','og:url','og:type','og:image','og:image:alt','twitter:card','twitter:title','twitter:description','twitter:image']:assert meta.get(k),k
assert meta['og:url']==url and meta['og:image']==meta['twitter:image']==url+'og.png'
assert meta['twitter:card']=='summary_large_image'
assert 100<=len(meta['description'])<=170
assert len([t for t,a in p.tags if t=='h1'])==1
assert all(t in [x for x,a in p.tags] for t in ['main','section','footer','form'])
assert all(wrapped or a.get('id') in p.labels for a,wrapped in p.controls)
assert all('alt' in a and a['alt'] for t,a in p.tags if t=='img')
assert any(t=='a' and a.get('href')=='tel:+447887505778' for t,a in p.tags)
text=' '.join(p.text)
for v in ['£350','ONE-OFF PAYMENT','First year of Welcome Book hosting','£35 per year','Country','Coast','Modern','Digital Welcome Book','Print-ready PDF — included','Printed Welcome Book — optional extra','07887 505778','Demonstration only — not scannable.']:assert v in text,v
schemas=re.findall(r'<script type="application/ld\+json">(.*?)</script>',prod);assert len(schemas)==1
s=json.loads(schemas[0]);assert s['@type']=='Service' and s['url']==url and s['offers']['price']=='350' and s['offers']['priceCurrency']=='GBP'
assert all(k not in s for k in ['aggregateRating','review','address','email'])
for directory in ['dist','production']:
 for t,a in p.tags:
  for key in ['src','href']:
   v=a.get(key,'');u=urlparse(v)
   if v and not u.scheme and not v.startswith('#'):assert (root/directory/v).is_file(),v
robots=RobotFileParser();robots.parse((root/'production/robots.txt').read_text().splitlines())
assert all(robots.can_fetch(agent,url) for agent in ['Googlebot','Bingbot','GPTBot','*'])
assert robots.site_maps()==[url+'sitemap.xml']
xml=ET.parse(root/'production/sitemap.xml');assert [e.text for e in xml.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]==[url]
assert (root/'dist/robots.txt').read_text()=='User-agent: *\nDisallow: /\n'
assert not (root/'dist/sitemap.xml').exists()
for name in ['styles.css','app.js','og.png','favicon.ico']:
 assert (root/'dist'/name).read_bytes()==(root/'production'/name).read_bytes()
for f in (root/'dist/assets').iterdir():assert f.read_bytes()==(root/'production/assets'/f.name).read_bytes()
assert 'not been sent or saved' in (root/'production/app.js').read_text()
assert "fetch('/api/enquiry'" in (root/'production/app.js').read_text()
assert 'data-delivery="production"' in prod and 'data-delivery="preview"' in prev
assert 'scott.3639business@gmail.com' not in prod+(root/'production/app.js').read_text()
assert not (root/'production/llms.txt').exists()
for font in ['Lora','Inter','Caveat']:assert 'family='+font+':' in prod
print('PASS: preview/production separation, identical visible markup/assets, metadata, robots, sitemap, schema, real-text commercial content, basic semantics and labels; private form remains non-delivering; production uses server endpoint.')

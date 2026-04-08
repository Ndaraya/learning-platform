"""
Scrape the SAT & ACT Grammar curriculum and extract video URLs from WP export.
"""
import re, json, time, requests, xml.etree.ElementTree as ET

def load_env(path='.env.local'):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                env[k.strip()] = v.strip()
    return env

env = load_env()
session = requests.Session()
session.auth = (env['WP_EDDIFY_USER'], env['WP_EDDIFY_APP_PASSWORD'])
session.headers.update({'User-Agent': 'Mozilla/5.0 Chrome/123.0'})

COURSE_URL = 'https://eddify.co/course/sat-and-act-grammar/'

# ── Parse curriculum ──────────────────────────────────────────────────────────
print(f'Fetching {COURSE_URL}...')
html = session.get(COURSE_URL, timeout=30).text
print(f'  Page length: {len(html)}')

section_re = re.compile(
    r'<li[^>]*class="[^"]*course-section[^"]*"[^>]*data-section-id="\d+"[^>]*>(.*?)(?=<li[^>]*class="[^"]*course-section[^"]*"|$)',
    re.DOTALL | re.IGNORECASE
)
title_re = re.compile(r'<div[^>]*class="[^"]*course-section__title[^"]*"[^>]*>(.*?)</div>', re.DOTALL | re.IGNORECASE)
item_re  = re.compile(r'data-item-id="(\d+)"[^>]*data-item-type="lp_lesson"[^>]*>.*?course-item-title[^>]*>(.*?)</div>', re.DOTALL | re.IGNORECASE)

def clean(s):
    s = re.sub(r'<[^>]+>', '', s).strip()
    for ent, rep in [('&amp;','&'),('&#8211;','-'),('&quot;','"'),('&#8217;',"'"),('&#038;','&')]:
        s = s.replace(ent, rep)
    return s

modules = []
for mod_i, sec in enumerate(section_re.finditer(html), 1):
    body = sec.group(1)
    title_m = title_re.search(body)
    if not title_m: continue
    mod_title = clean(title_m.group(1))
    lessons = []
    for les_i, les in enumerate(item_re.finditer(body), 1):
        lessons.append({'order': les_i, 'item_id': les.group(1), 'title': clean(les.group(2)), 'video_url': None})
    if lessons:
        modules.append({'order': mod_i, 'title': mod_title, 'lessons': lessons})

total = sum(len(m['lessons']) for m in modules)
print(f'  Found {len(modules)} modules, {total} lessons.')
for m in modules:
    print(f'  Module {m["order"]}: {m["title"]} ({len(m["lessons"])} lessons)')

# ── Extract video URLs from WP export ─────────────────────────────────────────
item_ids = {les['item_id'] for m in modules for les in m['lessons']}
print(f'\nMatching {len(item_ids)} lesson IDs against WP export...')

tree = ET.parse('eddify.WordPress.2026-04-03.xml')
ns   = {'wp': 'http://wordpress.org/export/1.2/'}

WISTIA_RE = re.compile(r'fast\.wistia\.com/embed/medias/([\w]+)\.jsonp', re.IGNORECASE)
YT_RE     = re.compile(r'youtube(?:-nocookie)?\.com/embed/([\w-]{11})', re.IGNORECASE)

def extract_video(val):
    if not val or not val.strip(): return None
    text = val.strip()
    # YouTube (not commented out)
    if not text.startswith('<!--'):
        m = YT_RE.search(text)
        if m: return f'https://www.youtube.com/watch?v={m.group(1)}'
    # Wistia — extract ID regardless of comment status (videos may still be valid)
    m = WISTIA_RE.search(text)
    if m: return f'https://fast.wistia.com/medias/{m.group(1)}'
    return None

post_video = {}
for item in tree.getroot().iter('item'):
    pt = item.find('wp:post_type', ns)
    if pt is None or pt.text != 'lp_lesson': continue
    id_el = item.find('wp:post_id', ns)
    if id_el is None or id_el.text not in item_ids: continue
    for meta in item.findall('wp:postmeta', ns):
        key_el = meta.find('wp:meta_key', ns)
        val_el = meta.find('wp:meta_value', ns)
        if key_el is not None and key_el.text == '_lp_lesson_video_intro':
            v = extract_video(val_el.text if val_el is not None else '')
            if v: post_video[id_el.text] = v
            break

found = 0
for m in modules:
    for les in m['lessons']:
        v = post_video.get(les['item_id'])
        if v:
            les['video_url'] = v
            found += 1

print(f'  Video URLs found: {found}/{total}')

with open('.tmp/grammar_curriculum.json', 'w', encoding='utf-8') as f:
    json.dump(modules, f, indent=2, ensure_ascii=False)
print('Saved to .tmp/grammar_curriculum.json')

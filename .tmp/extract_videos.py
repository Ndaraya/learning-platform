"""
Match SAT & ACT Math lesson item IDs (from curriculum JSON)
to WP export post IDs, then extract video URLs (YouTube or Wistia).
Outputs .tmp/eddify_curriculum.json with video_url filled in.
"""
import xml.etree.ElementTree as ET
import re, json

# ── Load curriculum (has item_id = WP post ID) ────────────────────────────────
with open('.tmp/eddify_curriculum.json', encoding='utf-8') as f:
    curriculum = json.load(f)

item_ids = {les['item_id'] for mod in curriculum for les in mod['lessons']}
print(f'SAT & ACT Math lesson item IDs: {len(item_ids)}')

# ── Parse WP export ───────────────────────────────────────────────────────────
tree = ET.parse('eddify.WordPress.2026-04-03.xml')
root = tree.getroot()
ns = {
    'wp':      'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
}

YT_PATTERNS = [
    r'youtube(?:-nocookie)?\.com/embed/([\w-]{11})',
    r'youtu\.be/([\w-]{11})',
    r'youtube\.com/watch\?v=([\w-]{11})',
]
# Wistia: <script src="https://fast.wistia.com/embed/medias/HASH.jsonp" ...>
# or active embed (not commented out)
WISTIA_PATTERN = r'fast\.wistia\.com/embed/medias/([\w]+)\.jsonp'

def extract_video(meta_value):
    if not meta_value or not meta_value.strip():
        return None
    text = meta_value.strip()

    # Skip fully commented-out blocks
    stripped = text.lstrip()
    if stripped.startswith('<!--'):
        return None  # commented out = video disabled/replaced

    # YouTube
    for pat in YT_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return f'https://www.youtube.com/watch?v={m.group(1)}'

    # Active Wistia script embed
    m = re.search(WISTIA_PATTERN, text, re.IGNORECASE)
    if m:
        return f'https://fast.wistia.com/medias/{m.group(1)}'

    return None

# Build post_id -> video_url map (only for our lesson IDs)
post_video = {}
for item in root.iter('item'):
    post_type_el = item.find('wp:post_type', ns)
    if post_type_el is None or post_type_el.text != 'lp_lesson':
        continue
    id_el = item.find('wp:post_id', ns)
    if id_el is None:
        continue
    post_id = id_el.text
    if post_id not in item_ids:
        continue

    for meta in item.findall('wp:postmeta', ns):
        key_el = meta.find('wp:meta_key', ns)
        val_el = meta.find('wp:meta_value', ns)
        if key_el is not None and key_el.text == '_lp_lesson_video_intro':
            video = extract_video(val_el.text if val_el is not None else '')
            if video:
                post_video[post_id] = video
            break

print(f'Video URLs found for SAT & ACT Math lessons: {len(post_video)}/{len(item_ids)}')

# ── Patch curriculum JSON ─────────────────────────────────────────────────────
total = found = 0
for mod in curriculum:
    for les in mod['lessons']:
        total += 1
        v = post_video.get(les['item_id'])
        if v:
            les['video_url'] = v
            found += 1
        else:
            les['video_url'] = None

print(f'\nResults per module:')
for mod in curriculum:
    vids = sum(1 for l in mod['lessons'] if l['video_url'])
    print(f'  Module {mod["order"]:2d}: {mod["title"][:45]:<45} {vids}/{len(mod["lessons"])} videos')

with open('.tmp/eddify_curriculum.json', 'w', encoding='utf-8') as f:
    json.dump(curriculum, f, indent=2, ensure_ascii=False)

print(f'\nDone. {found}/{total} lessons have video URLs.')
print('Updated .tmp/eddify_curriculum.json')

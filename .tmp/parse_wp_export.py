import xml.etree.ElementTree as ET
import re, json

tree = ET.parse('eddify.WordPress.2026-04-03.xml')
root = tree.getroot()

ns = {
    'wp': 'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
    'excerpt': 'http://wordpress.org/export/1.2/excerpt/',
}

YT_PATTERNS = [
    r'youtube(?:-nocookie)?\.com/embed/([\w-]{11})',
    r'youtu\.be/([\w-]{11})',
    r'youtube\.com/watch\?v=([\w-]{11})',
    r'youtube\.com\\\/embed\\\/([\w-]{11})',
]
VIMEO_PATTERN = r'vimeo\.com/(?:video/)?(\d+)'

def extract_video(text):
    for pat in YT_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return f'https://www.youtube.com/watch?v={m.group(1)}'
    m = re.search(VIMEO_PATTERN, text, re.IGNORECASE)
    if m:
        return f'https://vimeo.com/{m.group(1)}'
    return None

lessons = []
post_types_seen = set()

for item in root.iter('item'):
    post_type_el = item.find('wp:post_type', ns)
    post_type = post_type_el.text if post_type_el is not None else ''
    post_types_seen.add(post_type)

    if post_type != 'lp_lesson':
        continue

    title_el  = item.find('title')
    id_el     = item.find('wp:post_id', ns)
    content_el = item.find('content:encoded', ns)

    title   = title_el.text if title_el is not None else ''
    post_id = id_el.text if id_el is not None else ''
    content = content_el.text if content_el is not None else ''

    video_url = extract_video(content or '')

    # Also check post meta for video fields
    if not video_url:
        for meta in item.findall('wp:postmeta', ns):
            key_el = meta.find('wp:meta_key', ns)
            val_el = meta.find('wp:meta_value', ns)
            if key_el is not None and val_el is not None:
                key = key_el.text or ''
                val = val_el.text or ''
                if 'video' in key.lower() or 'youtube' in key.lower():
                    print(f'  Meta key: {key} = {val[:80]}')
                    v = extract_video(val)
                    if v:
                        video_url = v

    lessons.append({
        'post_id': post_id,
        'title': title,
        'video_url': video_url,
        'content_length': len(content or ''),
    })

print(f'Post types in export: {post_types_seen}')
print(f'lp_lesson items found: {len(lessons)}')
print(f'With video URL: {sum(1 for l in lessons if l["video_url"])}')
print()
for l in lessons[:10]:
    print(f'  [{l["post_id"]}] {l["title"][:50]:<50} video={l["video_url"] or "none"} content_len={l["content_length"]}')

# Save for inspection
with open('.tmp/wp_lessons.json', 'w', encoding='utf-8') as f:
    json.dump(lessons, f, indent=2, ensure_ascii=False)
print('\nSaved to .tmp/wp_lessons.json')

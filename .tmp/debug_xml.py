import xml.etree.ElementTree as ET
import re, json

with open('.tmp/eddify_curriculum.json', encoding='utf-8') as f:
    curriculum = json.load(f)
item_ids = {les['item_id'] for mod in curriculum for les in mod['lessons']}

tree = ET.parse('eddify.WordPress.2026-04-03.xml')
root = tree.getroot()
ns = {'wp': 'http://wordpress.org/export/1.2/'}

# All lp_lesson post IDs in the export
all_ids = set()
for item in root.iter('item'):
    pt = item.find('wp:post_type', ns)
    if pt is not None and pt.text == 'lp_lesson':
        id_el = item.find('wp:post_id', ns)
        if id_el is not None:
            all_ids.add(id_el.text)

print(f'Total lp_lesson IDs in export: {len(all_ids)}')
print(f'SAT & ACT Math item IDs: {len(item_ids)}')
overlap = item_ids & all_ids
print(f'Overlap: {len(overlap)}')
missing = item_ids - all_ids
print(f'Missing from export: {len(missing)}')
if missing:
    print('First 5 missing:', list(missing)[:5])
    # What IDs ARE in item_ids range?
    nums = sorted(int(x) for x in item_ids)
    print(f'ID range in curriculum: {nums[0]} - {nums[-1]}')
    export_nums = sorted(int(x) for x in all_ids)
    print(f'ID range in export: {export_nums[0]} - {export_nums[-1]}')

# For lessons that DO match, show their video meta (including commented-out)
print('\n--- Video meta for matching lessons ---')
for item in root.iter('item'):
    pt = item.find('wp:post_type', ns)
    if pt is None or pt.text != 'lp_lesson':
        continue
    id_el = item.find('wp:post_id', ns)
    if id_el is None or id_el.text not in item_ids:
        continue
    title_el = item.find('title')
    for meta in item.findall('wp:postmeta', ns):
        key_el = meta.find('wp:meta_key', ns)
        val_el = meta.find('wp:meta_value', ns)
        if key_el is not None and key_el.text == '_lp_lesson_video_intro':
            val = (val_el.text or '').strip()
            print(f'  [{id_el.text}] {(title_el.text or "")[:40]}: {val[:120]!r}')

import re

with open('.tmp/debug_course.html', encoding='utf-8') as f:
    html = f.read()

# Test the exact regex from the scraper
section_re = re.compile(
    r'<div[^>]*class="[^"]*course-section[^"]*"[^>]*data-section-id="(\d+)"[^>]*>(.*?)(?=<div[^>]*class="[^"]*course-section[^"]*"[^>]*data-section-id=|\Z)',
    re.DOTALL | re.IGNORECASE
)

matches = list(section_re.finditer(html))
print(f'Regex matches: {len(matches)}')
if matches:
    print('First match section_id:', matches[0].group(1))
    print('First match content (first 300):', matches[0].group(2)[:300])
else:
    # Try simpler regex
    print()
    print('Trying simpler regex...')
    simple = re.findall(r'data-section-id="(\d+)"', html)
    print('section IDs found:', simple)

    # Check what comes right before data-section-id
    idx = html.find('data-section-id=')
    print()
    print('Context around first data-section-id (100 chars before):')
    print(html[idx-100:idx+50])

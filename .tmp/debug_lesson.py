import requests, re

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 Chrome/123.0'})

# Fetch a lesson page
url = 'https://eddify.co/course/sat-and-act-math/lessons/addition-subtraction/'
r = session.get(url, timeout=30)
html = r.text

print(f'Status: {r.status_code}, URL: {r.url}')
print(f'Page length: {len(html)}')

# Check for youtube/vimeo mentions
yt = re.findall(r'(?:youtube|youtu\.be)[^\s"\'<>]{5,60}', html, re.IGNORECASE)
print(f'\nYouTube mentions ({len(yt)}):')
for u in yt[:5]:
    print(' ', u)

vi = re.findall(r'vimeo[^\s"\'<>]{5,60}', html, re.IGNORECASE)
print(f'\nVimeo mentions ({len(vi)}):')
for u in vi[:5]:
    print(' ', u)

# Look for LearnPress AJAX data or content variables
lp_data = re.findall(r'lpData\s*=\s*\{[^}]+\}', html)
print(f'\nlpData chunks: {len(lp_data)}')

# Find content section
content_idx = html.find('lp-content')
if content_idx >= 0:
    print('\nContent area (500 chars):')
    print(html[content_idx:content_idx+500])

# Find load_content_via_ajax references
ajax = re.findall(r'load_content_via_ajax[^\n"\']{0,100}', html)
print(f'\nAJAX refs: {ajax[:3]}')

# Try the LP REST API
print('\n--- LP REST API ---')
api_url = f'https://eddify.co/wp-json/lp/v1/courses/sat-and-act-math/items'
r2 = session.get(api_url, timeout=30)
print(f'API status: {r2.status_code}')
print(r2.text[:500])

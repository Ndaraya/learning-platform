import requests, re, json

def load_env(path='.env.local'):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                env[key.strip()] = value.strip()
    return env

env     = load_env()
session = requests.Session()
session.auth = (env['WP_EDDIFY_USER'], env['WP_EDDIFY_APP_PASSWORD'])
session.headers.update({'User-Agent': 'Mozilla/5.0 Chrome/123.0'})

# 1. Get lp_course with edit context (returns full data)
print('GET lp_course/11229?context=edit')
r = session.get('https://eddify.co/wp-json/wp/v2/lp_course/11229',
                params={'context': 'edit'}, timeout=20)
print(f'Status: {r.status_code}')
if r.ok:
    data = r.json()
    print('Keys:', list(data.keys()))
    # Print content
    content = data.get('content', {})
    print('content.raw (first 500):', str(content.get('raw',''))[:500])
    meta = data.get('meta', {})
    print('meta keys:', list(meta.keys())[:20] if isinstance(meta, dict) else meta)

# 2. Try fetching lesson post directly via /wp/v2/posts with type filter
print('\nGET /wp/v2/posts?post_type=lp_lesson...')
r2 = session.get('https://eddify.co/wp-json/wp/v2/posts',
                 params={'include[]': '11548', 'context': 'edit'}, timeout=15)
print(f'Status: {r2.status_code}, body: {r2.text[:200]}')

# 3. Try WP export via REST-equivalent (admin export)
print('\nGET wp-admin/export.php?content=lp_lesson...')
r3 = session.get('https://eddify.co/wp-admin/export.php',
                 params={'content': 'lp_lesson', 'download': '1'}, timeout=30)
print(f'Status: {r3.status_code}, length: {len(r3.text)}')
print('First 500:', r3.text[:500])

# 4. Look at the lesson page HTML more carefully for data attributes
print('\nFetching lesson page HTML...')
r4 = session.get('https://eddify.co/course/sat-and-act-math/lessons/addition-subtraction/', timeout=30)
html = r4.text
# Look for any video-related data
for pattern in [r'data-video[^"\']*["\']([^"\']+)["\']',
                r'video_url["\s:=]+["\']([^"\']+)["\']',
                r'_video["\s:=]+["\']([^"\']+)["\']',
                r'iframe[^>]+src=["\']([^"\']+)["\']']:
    matches = re.findall(pattern, html, re.IGNORECASE)
    if matches:
        print(f'Pattern {pattern[:40]}: {matches[:3]}')

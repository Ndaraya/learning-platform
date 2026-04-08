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
user    = env['WP_EDDIFY_USER']
apppass = env['WP_EDDIFY_APP_PASSWORD']

session = requests.Session()
session.auth = (user, apppass)
session.headers.update({'User-Agent': 'Mozilla/5.0 Chrome/123.0'})

# 1. Check user_id in lpData on lesson page (0 = not logged in, >0 = logged in)
lesson_url = 'https://eddify.co/course/sat-and-act-math/lessons/addition-subtraction/'
print(f'Fetching: {lesson_url}')
r = session.get(lesson_url, timeout=30)
html = r.text
print(f'Status: {r.status_code}, length: {len(html)}')

uid_m = re.search(r'"user_id"\s*:\s*"(\d+)"', html)
print(f'user_id in lpData: {uid_m.group(1) if uid_m else "NOT FOUND (not logged in via Basic Auth)"}')

yt = re.findall(r'youtube(?:-nocookie)?\.com/embed/([\w-]{11})', html)
print(f'YouTube embeds in HTML: {yt}')

# 2. Try getting REST nonce via /wp-json/
r2 = session.get('https://eddify.co/wp-json/', timeout=15)
print(f'\n/wp-json/ status: {r2.status_code}')
nonce_header = r2.headers.get('X-WP-Nonce', 'not in headers')
print(f'X-WP-Nonce header: {nonce_header}')

# 3. Try getting the nonce via users/me
r3 = session.get('https://eddify.co/wp-json/wp/v2/users/me?_fields=id,name', timeout=15)
print(f'\n/users/me status: {r3.status_code}')
nonce_header3 = r3.headers.get('X-WP-Nonce', 'not in headers')
print(f'X-WP-Nonce: {nonce_header3}')

# 4. Try LP REST with the REST nonce
nonce = nonce_header3 if nonce_header3 != 'not in headers' else ''
if nonce:
    r4 = session.get('https://eddify.co/wp-json/lp/v1/load_content_via_ajax/',
                     params={'id': '11548', 'nonce': nonce},
                     headers={'X-WP-Nonce': nonce}, timeout=20)
    print(f'\nLP AJAX with REST nonce: {r4.status_code}')
    print(r4.text[:500])

# 5. Try the WP REST API with Application Passwords token
r5 = session.get('https://eddify.co/wp-json/wp/v2/posts?include[]=11548', timeout=15)
print(f'\n/posts?include[]=11548 status: {r5.status_code}')
print(r5.text[:300])

# 6. Try LP v1 profile or curriculum endpoints
for ep in ['profile', 'curriculum', 'courses', 'items']:
    rx = session.get(f'https://eddify.co/wp-json/lp/v1/{ep}', timeout=10)
    print(f'lp/v1/{ep}: {rx.status_code} — {rx.text[:100]}')

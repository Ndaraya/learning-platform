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

BASE      = 'https://eddify.co/wp-json/lp/v1'
COURSE_ID = '11229'   # SAT & ACT Math
ITEM_ID   = '11548'   # Addition & Subtraction
AJAX_URL  = 'https://eddify.co/wp-json/lp/v1/load_content_via_ajax/'

# Get nonce from course page
print('Getting nonce...')
r = session.get('https://eddify.co/course/sat-and-act-math/', timeout=20)
nonce_m = re.search(r'"nonce"\s*:\s*"([a-f0-9]+)"', r.text)
nonce = nonce_m.group(1) if nonce_m else ''
print(f'  Nonce: {nonce}')

# Try various param combinations for load_content_via_ajax
combos = [
    {'id': ITEM_ID, 'course_id': COURSE_ID, 'nonce': nonce},
    {'item_id': ITEM_ID, 'course_id': COURSE_ID, 'nonce': nonce},
    {'id': ITEM_ID, 'course_id': COURSE_ID},
    {'item_id': ITEM_ID, 'course_id': COURSE_ID},
    {'id': ITEM_ID, 'nonce': nonce},
    {'item_id': ITEM_ID, 'nonce': nonce},
]
print('\n--- load_content_via_ajax ---')
for params in combos:
    rx = session.get(AJAX_URL, params=params, timeout=15)
    body = rx.text[:200]
    has_video = 'youtube' in body.lower() or 'vimeo' in body.lower()
    print(f'params={list(params.keys())}: {rx.status_code} {"VIDEO FOUND!" if has_video else body[:100]}')

# Try course curriculum endpoint
print(f'\n--- LP v1 course {COURSE_ID} ---')
r2 = session.get(f'{BASE}/courses/{COURSE_ID}', timeout=15)
print(f'Status: {r2.status_code}')
print(r2.text[:800])

# Check all available LP v1 routes
print('\n--- All LP v1 routes ---')
r3 = session.get('https://eddify.co/wp-json/', timeout=15)
wp_data = r3.json()
routes = wp_data.get('routes', {})
lp_routes = [k for k in routes.keys() if 'lp' in k.lower()]
print(f'LP routes ({len(lp_routes)}):')
for route in sorted(lp_routes)[:30]:
    print(f'  {route}')

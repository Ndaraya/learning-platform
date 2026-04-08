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

BASE = 'https://eddify.co/wp-json/lp/v1'

# 1. Get courses list
r = session.get(f'{BASE}/courses', timeout=15)
data = r.json()
print('Courses response keys:', list(data.keys()) if isinstance(data, dict) else type(data))
if isinstance(data, dict) and 'data' in data:
    courses = data['data'].get('courses', [])
    print(f'Courses: {len(courses)}')
    for c in courses[:3]:
        print(f'  ID={c.get("ID")}, title={c.get("title", c.get("post_title", "?"))[:50]}')

    # Find SAT & ACT Math course
    sat_course = next((c for c in courses if 'sat' in str(c).lower() or 'math' in str(c.get('title','') or c.get('post_title','')).lower()), None)
    if sat_course:
        course_id = sat_course.get('ID')
        print(f'\nFound course: ID={course_id}')

        # 2. Try to get course curriculum
        for ep in [
            f'{BASE}/courses/{course_id}',
            f'{BASE}/courses/{course_id}/items',
            f'{BASE}/courses/{course_id}/curriculum',
            f'{BASE}/courses?id={course_id}&include_curriculum=true',
        ]:
            rx = session.get(ep, timeout=15)
            print(f'\nGET {ep}')
            print(f'  Status: {rx.status_code}')
            txt = rx.text[:600]
            print(f'  Body: {txt}')

# 3. Try fetching a single lesson via LP v1
print('\n--- Single lesson endpoints ---')
item_id = '11548'  # Addition & Subtraction
for ep in [
    f'{BASE}/items/{item_id}',
    f'{BASE}/lessons/{item_id}',
    f'{BASE}/lesson/{item_id}',
    f'https://eddify.co/wp-json/lp/v1/courses/sat-and-act-math',
]:
    rx = session.get(ep, timeout=15)
    print(f'GET {ep}: {rx.status_code} — {rx.text[:200]}')

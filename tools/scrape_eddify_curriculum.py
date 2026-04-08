"""
Scrape the SAT & ACT Math curriculum from eddify.co.

Uses a WordPress Application Password (Basic Auth) to authenticate —
no login form, no reCAPTCHA, Solid Security stays enabled.

Usage (from learning-platform directory):
    py -3 tools/scrape_eddify_curriculum.py

Reads WP_EDDIFY_USER and WP_EDDIFY_APP_PASSWORD from .env.local
Outputs to .tmp/eddify_curriculum.json
"""

import json
import os
import re
import sys
import time
import requests

# ── Env ───────────────────────────────────────────────────────────────────────

def load_env(path='.env.local'):
    env = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, value = line.partition('=')
                    env[key.strip()] = value.strip()
    except FileNotFoundError:
        print(f'ERROR: {path} not found. Run from the learning-platform directory.')
        sys.exit(1)
    return env

env      = load_env()
WP_USER  = env.get('WP_EDDIFY_USER', '')
WP_PASS  = env.get('WP_EDDIFY_APP_PASSWORD', '')

if not WP_USER or not WP_PASS:
    print('ERROR: WP_EDDIFY_USER and WP_EDDIFY_APP_PASSWORD must be set in .env.local')
    sys.exit(1)

BASE_URL    = 'https://eddify.co'
COURSE_URL  = f'{BASE_URL}/course/sat-and-act-math/'
AJAX_REST   = f'{BASE_URL}/wp-json/lp/v1/load_content_via_ajax/'
ADMIN_AJAX  = f'{BASE_URL}/wp-admin/admin-ajax.php'
WP_REST     = f'{BASE_URL}/wp-json/wp/v2'
OUTPUT_FILE = '.tmp/eddify_curriculum.json'

# ── HTTP session with Basic Auth ──────────────────────────────────────────────

session = requests.Session()
session.auth = (WP_USER, WP_PASS)   # Application Password — spaces are fine
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0'
})

def verify_auth():
    print(f'Verifying credentials for {WP_USER}...')
    r = session.get(f'{BASE_URL}/wp-json/wp/v2/users/me', timeout=15)
    if r.status_code == 200:
        data = r.json()
        print(f'  Authenticated as: {data.get("name")} (roles: {data.get("roles", [])})')
        return True
    else:
        print(f'  ERROR: Auth failed ({r.status_code}): {r.text[:200]}')
        sys.exit(1)

def fetch(url, params=None, retries=3):
    for attempt in range(retries):
        try:
            r = session.get(url, params=params, timeout=30)
            r.raise_for_status()
            return r.text
        except requests.RequestException as e:
            if attempt == retries - 1:
                return ''
            time.sleep(2)
    return ''

# ── Video URL extraction ──────────────────────────────────────────────────────

YT_PATTERNS = [
    r'youtube(?:-nocookie)?\.com/embed/([\w-]{11})',
    r'youtu\.be/([\w-]{11})',
    r'youtube\.com/watch\?v=([\w-]{11})',
]
VIMEO_PATTERN = r'vimeo\.com/(?:video/)?(\d+)'

def extract_video_url(text):
    for pat in YT_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return f'https://www.youtube.com/watch?v={m.group(1)}'
    m = re.search(VIMEO_PATTERN, text, re.IGNORECASE)
    if m:
        return f'https://vimeo.com/{m.group(1)}'
    return None

# ── Course page parsing ───────────────────────────────────────────────────────

def parse_curriculum(html):
    section_re = re.compile(
        r'<li[^>]*class="[^"]*course-section[^"]*"[^>]*data-section-id="\d+"[^>]*>(.*?)(?=<li[^>]*class="[^"]*course-section[^"]*"|$)',
        re.DOTALL | re.IGNORECASE
    )
    title_re = re.compile(
        r'<div[^>]*class="[^"]*course-section__title[^"]*"[^>]*>(.*?)</div>',
        re.DOTALL | re.IGNORECASE
    )
    item_re = re.compile(
        r'data-item-id="(\d+)"[^>]*data-item-type="lp_lesson"[^>]*>.*?'
        r'course-item-title[^>]*>(.*?)</div>',
        re.DOTALL | re.IGNORECASE
    )

    def clean(s):
        s = re.sub(r'<[^>]+>', '', s).strip()
        for ent, rep in [('&amp;', '&'), ('&#8211;', '-'), ('&quot;', '"'), ('&#8217;', "'")]:
            s = s.replace(ent, rep)
        return s

    modules = []
    for mod_i, sec in enumerate(section_re.finditer(html), 1):
        body = sec.group(1)
        title_m = title_re.search(body)
        if not title_m:
            continue
        mod_title = clean(title_m.group(1))

        lessons = []
        for les_i, les in enumerate(item_re.finditer(body), 1):
            lessons.append({
                'order':     les_i,
                'item_id':   les.group(1),
                'title':     clean(les.group(2)),
                'video_url': None,
            })

        if lessons:
            modules.append({'order': mod_i, 'title': mod_title, 'lessons': lessons})

    return modules

# ── Fetch video URL for a single lesson ───────────────────────────────────────

def get_video_for_lesson(item_id, nonce):
    strategies = [
        # 1. WP REST API — lp_lesson post type (may be registered)
        lambda: session.get(f'{WP_REST}/lp_lesson/{item_id}', timeout=20),
        # 2. WP REST API — generic post endpoint
        lambda: session.get(f'{WP_REST}/posts/{item_id}', timeout=20),
        # 3. LP REST — id param
        lambda: session.get(AJAX_REST, params={'id': item_id, 'nonce': nonce}, timeout=20),
        # 4. LP REST — item_id param
        lambda: session.get(AJAX_REST, params={'item_id': item_id, 'nonce': nonce}, timeout=20),
        # 5. LP REST — id param with X-WP-Nonce header
        lambda: session.get(AJAX_REST, params={'id': item_id},
                            headers={'X-WP-Nonce': nonce}, timeout=20),
        # 6. admin-ajax — lp_learn_item
        lambda: session.post(ADMIN_AJAX,
                             data={'action': 'lp_learn_item', 'item_id': item_id, 'nonce': nonce},
                             timeout=20),
        # 7. admin-ajax — learn_press_load_course_item
        lambda: session.post(ADMIN_AJAX,
                             data={'action': 'learn_press_load_course_item',
                                   'id': item_id, 'nonce': nonce},
                             timeout=20),
    ]

    for fn in strategies:
        try:
            r = fn()
            text = r.text
            # Skip known error responses
            if not text or '"status":"error"' in text or '"code":"rest_no_route"' in text:
                continue
            video = extract_video_url(text)
            if video:
                return video
            # Try extracting from JSON fields
            try:
                data = r.json()
                # WP REST post: content.rendered
                rendered = ''
                if isinstance(data, dict):
                    rendered = data.get('content', {}).get('rendered', '')
                    rendered += json.dumps(data)
                video = extract_video_url(rendered)
                if video:
                    return video
            except Exception:
                pass
        except Exception:
            pass

    return None

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    os.makedirs('.tmp', exist_ok=True)

    verify_auth()

    print(f'\nFetching course page: {COURSE_URL}')
    course_html = fetch(COURSE_URL)
    if not course_html:
        print('ERROR: Could not fetch course page.')
        sys.exit(1)

    nonce_m = re.search(r'"nonce"\s*:\s*"([a-f0-9]+)"', course_html)
    nonce   = nonce_m.group(1) if nonce_m else ''
    print(f'  Nonce: {nonce or "not found"}')

    modules = parse_curriculum(course_html)
    if not modules:
        print('ERROR: No curriculum modules found.')
        with open('.tmp/debug_course.html', 'w', encoding='utf-8') as f:
            f.write(course_html)
        sys.exit(1)

    total = sum(len(m['lessons']) for m in modules)
    print(f'  Found {len(modules)} modules, {total} lessons.\n')

    for mod in modules:
        print(f'  Module {mod["order"]}: {mod["title"]}')
        for les in mod['lessons']:
            label = les['title'][:55]
            print(f'    [{les["order"]:2d}] {label:<55}', end=' ', flush=True)
            video = get_video_for_lesson(les['item_id'], nonce)
            les['video_url'] = video
            print('ok' if video else '-- no video')
            time.sleep(0.3)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(modules, f, indent=2, ensure_ascii=False)

    found = sum(1 for m in modules for l in m['lessons'] if l.get('video_url'))
    print(f'\nDone. {found}/{total} lessons have video URLs.')
    print(f'Output saved to {OUTPUT_FILE}')

    if found == 0:
        # Show raw response for first lesson to diagnose
        first = modules[0]['lessons'][0]
        print(f'\n[DEBUG] Raw WP REST response for item {first["item_id"]}:')
        r = session.get(f'{WP_REST}/lp_lesson/{first["item_id"]}', timeout=20)
        print(f'  Status: {r.status_code}  Body: {r.text[:400]}')
        r2 = session.get(f'{WP_REST}/posts/{first["item_id"]}', timeout=20)
        print(f'  /posts/ Status: {r2.status_code}  Body: {r2.text[:400]}')


if __name__ == '__main__':
    main()

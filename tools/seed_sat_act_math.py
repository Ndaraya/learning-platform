"""
Seed the SAT & ACT Math curriculum from .tmp/eddify_curriculum.json
into the existing ACT Test Prep course.

This script:
  1. Finds the "ACT Test Prep" course in Supabase
  2. Deletes all existing modules (cascades to lessons and tasks)
  3. Creates new modules and lessons using titles + video URLs from the JSON

Usage (from learning-platform directory):
    python tools/seed_sat_act_math.py

Run scrape_eddify_curriculum.py first to generate the JSON.
Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
"""

import json
import os
import sys
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

env          = load_env()
SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
SERVICE_KEY  = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SERVICE_KEY:
    print('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    sys.exit(1)

HEADERS = {
    'Authorization': f'Bearer {SERVICE_KEY}',
    'apikey': SERVICE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

INPUT_FILE    = '.tmp/eddify_curriculum.json'
COURSE_TITLE  = 'ACT Prep'

# ── REST helpers ──────────────────────────────────────────────────────────────

def rest(method, table, data=None, params=None):
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    r = requests.request(method, url, headers=HEADERS, json=data, params=params)
    if not r.ok:
        print(f'ERROR {method} {table}: {r.status_code} {r.text}')
        sys.exit(1)
    return r.json() if r.text else []

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # 1. Load scraped curriculum
    if not os.path.exists(INPUT_FILE):
        print(f'ERROR: {INPUT_FILE} not found.')
        print('Run python tools/scrape_eddify_curriculum.py first.')
        sys.exit(1)

    with open(INPUT_FILE, encoding='utf-8') as f:
        curriculum = json.load(f)

    total_lessons_in_json = sum(len(m['lessons']) for m in curriculum)
    print(f'Loaded {len(curriculum)} modules, {total_lessons_in_json} lessons from {INPUT_FILE}')

    # 2. Find the course
    print(f'\nLooking up course "{COURSE_TITLE}"...')
    courses = rest('GET', 'courses', params={'title': f'eq.{COURSE_TITLE}', 'select': 'id,title'})
    if not courses:
        print(f'ERROR: Course "{COURSE_TITLE}" not found in Supabase.')
        print('Available courses:')
        all_courses = rest('GET', 'courses', params={'select': 'id,title'})
        for c in all_courses:
            print(f'  - {c["title"]} ({c["id"]})')
        sys.exit(1)

    course_id    = courses[0]['id']
    course_title = courses[0]['title']
    print(f'  Found: {course_title} (id={course_id})')

    # 3. Fetch and delete existing modules (lessons cascade via FK)
    print('\nFetching existing modules...')
    existing_modules = rest('GET', 'modules', params={
        'course_id': f'eq.{course_id}',
        'select': 'id,title,order',
    })

    if existing_modules:
        print(f'  Deleting {len(existing_modules)} existing modules...')
        # Delete each module — lessons and tasks cascade automatically
        for mod in existing_modules:
            rest('DELETE', 'modules', params={'id': f'eq.{mod["id"]}'})
        print('  Done.')
    else:
        print('  No existing modules found.')

    # 4. Insert new modules and lessons
    print(f'\nSeeding {len(curriculum)} modules...\n')
    total_seeded    = 0
    lessons_no_video = 0

    for module_data in sorted(curriculum, key=lambda m: m['order']):
        lessons = module_data['lessons']
        print(f'  Module {module_data["order"]}: {module_data["title"]} ({len(lessons)} lessons)')

        module = rest('POST', 'modules', data={
            'course_id': course_id,
            'title':     module_data['title'],
            'description': None,
            'order':     module_data['order'],
        })
        module_id = module[0]['id']

        for lesson_data in sorted(lessons, key=lambda l: l['order']):
            video_url = lesson_data.get('video_url') or None
            if not video_url:
                lessons_no_video += 1

            rest('POST', 'lessons', data={
                'module_id':   module_id,
                'title':       lesson_data['title'],
                'description': None,
                # Set both youtube_url (legacy) and content_url (new)
                'youtube_url': video_url,
                'content_url': video_url,
                'lesson_type': 'video',
                'content_body': None,
                'image_urls': [],
                'order':       lesson_data['order'],
            })
            total_seeded += 1

        print(f'    >> {len(lessons)} lessons inserted')

    print(f'\nDone! Replaced course content with {len(curriculum)} modules, {total_seeded} lessons.')
    if lessons_no_video:
        print(f'  Note: {lessons_no_video} lessons had no video URL extracted — '
              f'they were created with content_url=null.')
        print('  You can set their video URLs manually in the admin editor.')
    print(f'\nVisit /admin/courses/{course_id}/edit to review the content.')


if __name__ == '__main__':
    main()

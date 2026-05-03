"""
Seed the SAT Prep curriculum from .tmp/sat_curriculum.json into Supabase.

Usage (from learning-platform directory):
    py -3 tools/seed_sat_curriculum.py

Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
Idempotent: if a course with slug 'sat-prep' already exists, it is deleted
and recreated (all child data is cascade-deleted via FK constraints).

NOTE: Stripe gating is not wired in this seeder — the platform's Stripe
integration is subscription-based (not per-course). To restrict access,
publish the course only after your subscription/access control is in place.
Set published=true in the JSON or update it directly in Supabase Studio.
"""

import json
import os
import sys
import requests

# -- Load .env.local ------------------------------------------------------------

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

env = load_env()
SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
SERVICE_KEY  = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SERVICE_KEY:
    print('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    sys.exit(1)

HEADERS = {
    'Authorization': f'Bearer {SERVICE_KEY}',
    'apikey':        SERVICE_KEY,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
}

def rest(method, table, data=None, params=None):
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    r = requests.request(method, url, headers=HEADERS, json=data, params=params)
    if not r.ok:
        print(f'ERROR {method} {table}: {r.status_code} {r.text[:300]}')
        sys.exit(1)
    try:
        return r.json()
    except Exception:
        return []

# -- Main -----------------------------------------------------------------------

def main():
    curriculum_path = '.tmp/sat_curriculum.json'
    if not os.path.exists(curriculum_path):
        print(f'ERROR: {curriculum_path} not found. Run scrape_sat_curriculum.py first.')
        sys.exit(1)

    with open(curriculum_path, encoding='utf-8') as f:
        data = json.load(f)

    course_data = data['course']
    modules     = data['modules']

    print(f'SAT Prep curriculum loaded:')
    print(f'  Modules:   {len(modules)}')
    print(f'  Lessons:   {sum(len(m["lessons"]) for m in modules)}')
    print(f'  Tasks:     {sum(len(l["tasks"]) for m in modules for l in m["lessons"])}')
    print(f'  Questions: {sum(len(t["questions"]) for m in modules for l in m["lessons"] for t in l["tasks"])}')

    # -- Step 1: Get admin user ID ----------------------------------------------
    print('\nLooking up admin user...')
    profiles = rest('GET', 'profiles', params={'email': 'eq.eddify.platform@gmail.com', 'select': 'id,email'})
    if not profiles:
        print('ERROR: eddify.platform@gmail.com not found in profiles table')
        sys.exit(1)
    admin_id = profiles[0]['id']
    print(f'  Admin: {admin_id}')

    # -- Step 2: Delete existing course with this slug (idempotency) ------------
    existing = rest('GET', 'courses', params={'title': f'eq.{course_data["title"]}', 'select': 'id,title'})
    if existing:
        course_id = existing[0]['id']
        print(f'\nExisting course found (id={course_id}). Deleting for clean re-seed...')
        rest('DELETE', 'courses', params={'id': f'eq.{course_id}'})
        print('  Deleted (cascade deletes all modules/lessons/tasks/questions).')

    # -- Step 3: Create course --------------------------------------------------
    print(f'\nCreating course "{course_data["title"]}"...')
    created = rest('POST', 'courses', data={
        'title':       course_data['title'],
        'description': course_data.get('description', ''),
        'published':   course_data.get('published', False),
        'created_by':  admin_id,
    })
    course_id = created[0]['id']
    print(f'  Course created: {course_id} (published={course_data.get("published", False)})')

    # -- Step 4: Create modules -> lessons -> tasks -> questions ------------------
    total_modules   = 0
    total_lessons   = 0
    total_tasks     = 0
    total_questions = 0
    lessons_with_placeholder = []

    for mod in sorted(modules, key=lambda m: m['order']):
        mod_row = rest('POST', 'modules', data={
            'course_id':   course_id,
            'title':       mod['title'],
            'description': mod.get('description', ''),
            'order':       mod['order'],
        })
        mod_id = mod_row[0]['id']
        total_modules += 1

        lesson_count = len(mod.get('lessons', []))
        print(f'  Module {mod["order"]:2d}: {mod["title"][:60]} ({lesson_count} lessons)')

        for les in sorted(mod.get('lessons', []), key=lambda l: l['order']):
            les_row = rest('POST', 'lessons', data={
                'module_id':   mod_id,
                'title':       les['title'],
                'description': les.get('description', ''),
                'youtube_url': les['youtube_url'],
                'order':       les['order'],
            })
            les_id = les_row[0]['id']
            total_lessons += 1

            if les['youtube_url'] == data.get('meta', {}).get('placeholder_video', ''):
                lessons_with_placeholder.append(les['title'])

            for task in sorted(les.get('tasks', []), key=lambda t: t['order']):
                task_row = rest('POST', 'tasks', data={
                    'lesson_id':    les_id,
                    'title':        task['title'],
                    'type':         task['type'],
                    'instructions': task.get('instructions', ''),
                    'order':        task['order'],
                })
                task_id = task_row[0]['id']
                total_tasks += 1

                for q_ord, q in enumerate(task.get('questions', []), start=1):
                    q_data = {
                        'task_id': task_id,
                        'prompt':  q['prompt'],
                        'type':    q['type'],
                        'points':  q.get('points', 10),
                        'order':   q_ord,
                    }
                    if q['type'] == 'mcq':
                        q_data['options']        = q.get('options', [])
                        q_data['correct_answer'] = q.get('correct_answer', '')
                    else:
                        q_data['grading_rubric'] = q.get('grading_rubric', '')

                    rest('POST', 'questions', data=q_data)
                    total_questions += 1

    # -- Step 5: Summary --------------------------------------------------------
    print(f'\n-- Seed complete --')
    print(f'  Course:    {course_data["title"]} (id={course_id})')
    print(f'  Modules:   {total_modules}')
    print(f'  Lessons:   {total_lessons}')
    print(f'  Tasks:     {total_tasks}')
    print(f'  Questions: {total_questions}')
    print(f'  Published: {course_data.get("published", False)}')

    if lessons_with_placeholder:
        print(f'\nWARNING  {len(lessons_with_placeholder)} lessons still have a placeholder video URL:')
        for t in lessons_with_placeholder[:10]:
            print(f'   - {t}')
        if len(lessons_with_placeholder) > 10:
            print(f'   ... and {len(lessons_with_placeholder) - 10} more')
        print('   -> Update these in /admin/courses after verifying the YouTube URLs.')

    print(f'\n-> Visit /admin/courses to review, reorder, and publish the course.')
    print(f'-> Course is currently published=False — set to True when ready for students.')
    print(f'\nNote: Stripe per-course gating is not yet wired into this platform.')
    print('The platform uses subscription tiers (pro/annual). To restrict SAT Prep access:')
    print('  Option A: Require a "pro" subscription (existing Stripe flow covers this).')
    print('  Option B: Add per-course Stripe checkout — a separate implementation task.')

if __name__ == '__main__':
    main()

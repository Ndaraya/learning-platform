"""
Replace the Math module in ACT Prep Course with the 20 SAT & ACT Math modules.

Steps:
  1. Delete Math module from ACT Prep Course (cascades to its lessons)
  2. Move all 20 modules from ACT Prep -> ACT Prep Course
  3. Re-order: Diagnostic(0), English(1), 20 math modules(2-21), Reading(22), Science(23)

Usage: py -3 tools/migrate_math_modules.py
"""

import sys
import requests

def load_env(path='.env.local'):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                env[key.strip()] = value.strip()
    return env

env          = load_env()
SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']

HEADERS = {
    'Authorization': f'Bearer {SERVICE_KEY}',
    'apikey': SERVICE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

ACT_PREP_COURSE_ID = '80417f85-0d42-4c6f-ae9b-ed45f12bad6b'  # ACT Prep Course (main)
SAT_MATH_COURSE_ID = 'a4e47363-dc02-4197-8df7-d9f6af75b84b'  # ACT Prep (20 math modules)

MATH_MODULE_ID     = '03867f6e-5d0b-4bb8-a526-532785316abb'  # Math module to replace
READING_MODULE_ID  = '87211710-daad-42a1-b843-f6880fe48517'  # Reading (order -> 22)
SCIENCE_MODULE_ID  = '06461367-1b33-4184-966c-dd18a65a6794'  # Science (order -> 23)

def rest(method, table, data=None, params=None):
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    r = requests.request(method, url, headers=HEADERS, json=data, params=params)
    if not r.ok:
        print(f'ERROR {method} {table}: {r.status_code} {r.text}')
        sys.exit(1)
    return r.json() if r.text else []

def main():
    # 1. Fetch the 20 math modules sorted by order
    print('Fetching SAT & ACT Math modules...')
    math_modules = rest('GET', 'modules', params={
        'course_id': f'eq.{SAT_MATH_COURSE_ID}',
        'select': 'id,title,order',
        'order': 'order',
    })
    print(f'  Found {len(math_modules)} modules to move.')

    # 2. Delete the old Math module (lessons cascade)
    print('\nDeleting old Math module (and its lessons)...')
    rest('DELETE', 'modules', params={'id': f'eq.{MATH_MODULE_ID}'})
    print('  Done.')

    # 3. Move the 20 modules to ACT Prep Course and assign new orders (2-21)
    print('\nMoving 20 math modules into ACT Prep Course...')
    for i, mod in enumerate(sorted(math_modules, key=lambda m: m['order'])):
        new_order = 2 + i
        rest('PATCH', 'modules', data={
            'course_id': ACT_PREP_COURSE_ID,
            'order': new_order,
        }, params={'id': f'eq.{mod["id"]}'})
        print(f'  [{new_order:2d}] {mod["title"]}')

    # 4. Update Reading and Science orders
    print('\nUpdating Reading and Science orders...')
    rest('PATCH', 'modules', data={'order': 22}, params={'id': f'eq.{READING_MODULE_ID}'})
    print('  Reading -> order 22')
    rest('PATCH', 'modules', data={'order': 23}, params={'id': f'eq.{SCIENCE_MODULE_ID}'})
    print('  Science (Optional) -> order 23')

    # 5. Verify final structure
    print('\nFinal ACT Prep Course structure:')
    final_modules = rest('GET', 'modules', params={
        'course_id': f'eq.{ACT_PREP_COURSE_ID}',
        'select': 'id,title,order',
        'order': 'order',
    })
    for m in final_modules:
        print(f'  [{m["order"]:2d}] {m["title"]}')

    total_lessons = 0
    for m in final_modules:
        lessons = rest('GET', 'lessons', params={'module_id': f'eq.{m["id"]}', 'select': 'id'})
        total_lessons += len(lessons)

    print(f'\nTotal: {len(final_modules)} modules, {total_lessons} lessons in ACT Prep Course.')
    print(f'\nThe ACT Prep course (now empty) can be deleted from /admin/courses.')

if __name__ == '__main__':
    main()

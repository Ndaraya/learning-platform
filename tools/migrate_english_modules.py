"""
Replace the English module in ACT Prep Course with the 14 SAT & ACT Grammar modules.

Final order:
  [0]    Diagnostic Assessment
  [1-14] 14 grammar modules
  [15-34] 20 math modules
  [35]   Reading
  [36]   Science (Optional)

Usage: py -3 tools/migrate_english_modules.py
"""
import sys, json, requests

def load_env(path='.env.local'):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                env[k.strip()] = v.strip()
    return env

env = load_env()
SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {
    'Authorization': f'Bearer {SERVICE_KEY}',
    'apikey': SERVICE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

ACT_PREP_COURSE_ID = '80417f85-0d42-4c6f-ae9b-ed45f12bad6b'
ENGLISH_MODULE_ID  = '9fa2b840-e102-49d7-a677-a167d53d58b2'

def rest(method, table, data=None, params=None):
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    r = requests.request(method, url, headers=HEADERS, json=data, params=params)
    if not r.ok:
        print(f'ERROR {method} {table}: {r.status_code} {r.text}')
        sys.exit(1)
    return r.json() if r.text else []

def main():
    # Load grammar curriculum
    with open('.tmp/grammar_curriculum.json', encoding='utf-8') as f:
        grammar = json.load(f)
    total_lessons = sum(len(m['lessons']) for m in grammar)
    print(f'Grammar curriculum: {len(grammar)} modules, {total_lessons} lessons')

    # 1. Delete English module
    print('\nDeleting English module...')
    rest('DELETE', 'modules', params={'id': f'eq.{ENGLISH_MODULE_ID}'})
    print('  Done.')

    # 2. Shift all existing math modules up by 13 (to make room for 14 grammar modules at 1-14)
    #    Current math: orders 2-21 -> new orders 15-34
    #    Reading: 22 -> 35, Science: 23 -> 36
    print('\nShifting existing modules to make room...')
    existing = rest('GET', 'modules', params={
        'course_id': f'eq.{ACT_PREP_COURSE_ID}',
        'select': 'id,title,order',
        'order': 'order',
    })
    # Shift in reverse order to avoid conflicts
    for mod in sorted(existing, key=lambda m: m['order'], reverse=True):
        new_order = mod['order'] + 13
        rest('PATCH', 'modules', data={'order': new_order}, params={'id': f'eq.{mod["id"]}'})
        print(f'  {mod["title"]}: {mod["order"]} -> {new_order}')

    # 3. Seed 14 grammar modules at orders 1-14
    print('\nSeeding 14 grammar modules...')
    for mod_data in sorted(grammar, key=lambda m: m['order']):
        new_order = mod_data['order']  # already 1-14
        mod = rest('POST', 'modules', data={
            'course_id': ACT_PREP_COURSE_ID,
            'title':     mod_data['title'],
            'description': None,
            'order':     new_order,
        })
        module_id = mod[0]['id']

        for les in sorted(mod_data['lessons'], key=lambda l: l['order']):
            video_url = les.get('video_url') or None
            rest('POST', 'lessons', data={
                'module_id':   module_id,
                'title':       les['title'],
                'description': None,
                'youtube_url': video_url,
                'content_url': video_url,
                'lesson_type': 'video',
                'content_body': None,
                'image_urls': [],
                'order':       les['order'],
            })
        print(f'  [{new_order:2d}] {mod_data["title"]} ({len(mod_data["lessons"])} lessons)')

    # 4. Verify
    print('\nFinal ACT Prep Course structure:')
    final = rest('GET', 'modules', params={
        'course_id': f'eq.{ACT_PREP_COURSE_ID}',
        'select': 'id,title,order',
        'order': 'order',
    })
    total = 0
    for m in final:
        lessons = rest('GET', 'lessons', params={'module_id': f'eq.{m["id"]}', 'select': 'id'})
        total += len(lessons)
        print(f'  [{m["order"]:2d}] {m["title"]} ({len(lessons)} lessons)')
    print(f'\nTotal: {len(final)} modules, {total} lessons.')

if __name__ == '__main__':
    main()

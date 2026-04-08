"""
Patch video URLs into the ACT Prep course lessons after running the browser script.

Usage:
    py -3 tools/patch_video_urls.py .tmp/video_urls.json

Where video_urls.json is the JSON output from collect_videos_browser_script.js

The script matches lessons by title (fuzzy) since URL slugs may not exactly
match the DB lesson titles.
"""

import json
import sys
import os
import re
import requests

# ── Env ───────────────────────────────────────────────────────────────────────

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
SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
SERVICE_KEY  = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

HEADERS = {
    'Authorization': f'Bearer {SERVICE_KEY}',
    'apikey': SERVICE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

COURSE_ID = 'a4e47363-dc02-4197-8df7-d9f6af75b84b'

def rest(method, table, data=None, params=None):
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    r = requests.request(method, url, headers=HEADERS, json=data, params=params)
    if not r.ok:
        print(f'ERROR {method} {table}: {r.status_code} {r.text}')
        sys.exit(1)
    return r.json() if r.text else []

def slug_from_url(url):
    """Extract the lesson slug from a URL like .../lessons/SLUG/"""
    m = re.search(r'/lessons/([^/]+)/?$', url)
    return m.group(1) if m else ''

def normalize(s):
    """Lowercase, strip punctuation for fuzzy matching."""
    return re.sub(r'[^a-z0-9]', '', s.lower())

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print('Usage: py -3 tools/patch_video_urls.py .tmp/video_urls.json')
        sys.exit(1)

    input_file = sys.argv[1]
    if not os.path.exists(input_file):
        print(f'ERROR: {input_file} not found.')
        sys.exit(1)

    with open(input_file, encoding='utf-8') as f:
        scraped = json.load(f)

    # Build lookup: supports both v1 format (url) and v2 format (itemId + title)
    # v2: match by title directly; v1: match by slug derived from url
    title_to_video = {}  # normalized title -> videoUrl
    slug_to_video  = {}  # url slug -> videoUrl

    for item in scraped:
        if not item.get('videoUrl'):
            continue
        vid = item['videoUrl']
        if item.get('title'):
            title_to_video[normalize(item['title'])] = vid
        if item.get('url'):
            slug = slug_from_url(item['url'])
            slug_to_video[slug] = vid

    print(f'Loaded {len(scraped)} entries, {len(title_to_video) or len(slug_to_video)} with video URLs.')

    # Fetch all lessons in this course (via modules)
    print('\nFetching lessons from Supabase...')
    modules = rest('GET', 'modules', params={
        'course_id': f'eq.{COURSE_ID}',
        'select': 'id',
    })
    module_ids = [m['id'] for m in modules]

    lessons = []
    for mid in module_ids:
        batch = rest('GET', 'lessons', params={
            'module_id': f'eq.{mid}',
            'select': 'id,title',
        })
        lessons.extend(batch)

    print(f'Found {len(lessons)} lessons in DB.')

    # Match lessons by normalized title or slug
    patched = 0
    skipped = 0

    for lesson in lessons:
        lesson_id    = lesson['id']
        lesson_title = lesson['title']
        norm_title   = normalize(lesson_title)

        video_url = None

        # 1. Exact title match (v2 format)
        video_url = title_to_video.get(norm_title)

        # 2. Slug-derived match (v1 format)
        if not video_url:
            for slug, url in slug_to_video.items():
                if normalize(slug.replace('-', ' ')) == norm_title:
                    video_url = url
                    break

        # 3. Partial match
        if not video_url:
            for key, url in {**title_to_video, **{normalize(s.replace('-', ' ')): u for s, u in slug_to_video.items()}}.items():
                if key in norm_title or norm_title in key:
                    video_url = url
                    break

        if video_url:
            rest('PATCH', 'lessons', data={
                'youtube_url': video_url,
                'content_url': video_url,
            }, params={'id': f'eq.{lesson_id}'})
            print(f'  [OK] {lesson_title[:55]} -> {video_url[:50]}')
            patched += 1
        else:
            print(f'  [--] {lesson_title[:55]} (no match)')
            skipped += 1

    print(f'\nDone. {patched} lessons patched, {skipped} had no match.')
    if skipped > 0:
        print('You can set the remaining video URLs manually in the admin editor.')


if __name__ == '__main__':
    main()

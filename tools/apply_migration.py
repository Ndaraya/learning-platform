"""
Apply a SQL migration file to Supabase via the Management API.

Usage (from learning-platform/):
    py -3 tools/apply_migration.py supabase/some_migration.sql

Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_MANAGEMENT_TOKEN from .env.local.
The project ref is extracted automatically from the Supabase URL.
"""

import json
import os
import re
import sys
import requests


def load_env(path='.env.local'):
    env = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, _, v = line.partition('=')
                    env[k.strip()] = v.strip()
    except FileNotFoundError:
        print(f'ERROR: {path} not found. Run from the learning-platform directory.')
        sys.exit(1)
    return env


def main():
    if len(sys.argv) < 2:
        print('Usage: py -3 tools/apply_migration.py <path/to/migration.sql>')
        sys.exit(1)

    sql_path = sys.argv[1]
    if not os.path.exists(sql_path):
        print(f'ERROR: {sql_path} not found.')
        sys.exit(1)

    env = load_env()
    supabase_url = env.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
    management_token = env.get('SUPABASE_MANAGEMENT_TOKEN', '')

    if not supabase_url or not management_token:
        print('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_MANAGEMENT_TOKEN must be set in .env.local')
        sys.exit(1)

    m = re.match(r'https://([^.]+)\.supabase\.co', supabase_url)
    if not m:
        print(f'ERROR: Could not extract project ref from URL: {supabase_url}')
        sys.exit(1)
    project_ref = m.group(1)

    sql = open(sql_path, encoding='utf-8').read()
    print(f'Applying {sql_path} -> project {project_ref} ...')

    r = requests.post(
        f'https://api.supabase.com/v1/projects/{project_ref}/database/query',
        headers={
            'Authorization': f'Bearer {management_token}',
            'Content-Type': 'application/json',
        },
        data=json.dumps({'query': sql}),
        timeout=30,
    )

    if r.ok:
        print(f'Done. ({r.status_code})')
    else:
        print(f'ERROR {r.status_code}: {r.text[:500]}')
        sys.exit(1)


if __name__ == '__main__':
    main()

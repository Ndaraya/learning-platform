import requests, re

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 Chrome/123.0'})

# Check if WP REST API is accessible and what auth methods are available
tests = [
    'https://eddify.co/wp-json/',
    'https://eddify.co/wp-json/wp/v2/',
    'https://eddify.co/wp-json/wp/v2/lp_lesson?per_page=1',
    'https://eddify.co/wp-json/wp/v2/types',
]
for url in tests:
    r = session.get(url, timeout=15)
    print(f'{url}')
    print(f'  Status: {r.status_code}')
    if r.status_code == 200:
        data = r.json()
        if isinstance(data, dict):
            print(f'  Keys: {list(data.keys())[:8]}')
    print()

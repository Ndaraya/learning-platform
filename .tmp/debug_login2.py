import requests, re

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 Chrome/123.0'})

# Try to find the login URL
tests = [
    'https://eddify.co/wp-admin/',
    'https://eddify.co/login/',
    'https://eddify.co/sign-in/',
    'https://eddify.co/my-account/',
]
for url in tests:
    r = session.get(url, timeout=15, allow_redirects=False)
    print(f'{url} -> {r.status_code} Location: {r.headers.get("Location", "")}')

# Follow wp-admin redirect chain
print('\nFollowing /wp-admin/ redirects...')
r = session.get('https://eddify.co/wp-admin/', timeout=15, allow_redirects=True)
print(f'Final URL: {r.url}, Status: {r.status_code}')

# Try the AJAX endpoint with a nonce from the course page
print('\nFetching course page nonce...')
r_course = session.get('https://eddify.co/course/sat-and-act-math/', timeout=30)
nonce_m = re.search(r'"nonce"\s*:\s*"([a-f0-9]+)"', r_course.text)
if nonce_m:
    nonce = nonce_m.group(1)
    print(f'Nonce: {nonce}')

    # Try the load_content_via_ajax endpoint
    lesson_url = 'https://eddify.co/course/sat-and-act-math/lessons/addition-subtraction/'
    r_ajax = session.post(
        'https://eddify.co/wp-json/lp/v1/load_content_via_ajax/',
        json={'url': lesson_url},
        headers={'X-WP-Nonce': nonce},
        timeout=30
    )
    print(f'AJAX status: {r_ajax.status_code}')
    print(r_ajax.text[:800])

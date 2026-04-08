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

env = load_env()
WP_USER = env.get('WP_EDDIFY_USER', '')
WP_PASS = env.get('WP_EDDIFY_PASS', '')

print(f'User: {WP_USER}')
print(f'Pass length: {len(WP_PASS)}')

BASE_URL  = 'https://eddify.co'
LOGIN_URL = f'{BASE_URL}/wp-login.php'

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0'})

# Step 1: GET login page
print('\nGET login page...')
r1 = session.get(LOGIN_URL, timeout=30)
print(f'Status: {r1.status_code}')
print('Cookies after GET:', [(c.name, c.value[:20]) for c in session.cookies])

# Step 2: POST credentials
print('\nPOSTing credentials...')
r2 = session.post(LOGIN_URL, data={
    'log':         WP_USER,
    'pwd':         WP_PASS,
    'wp-submit':   'Log In',
    'redirect_to': f'{BASE_URL}/wp-admin/',
    'testcookie':  '1',
}, allow_redirects=True, timeout=30)

print(f'Final URL: {r2.url}')
print(f'Status: {r2.status_code}')
print('Cookies after POST:', [(c.name, c.value[:20]) for c in session.cookies])

if 'login_error' in r2.text:
    # Extract the error message
    import re
    err = re.search(r'id="login_error">(.*?)</div>', r2.text, re.DOTALL)
    if err:
        import html
        print('LOGIN ERROR:', html.unescape(re.sub(r'<[^>]+>', '', err.group(1))).strip())

logged_in = any('logged_in' in c.name for c in session.cookies)
print(f'\nLogged in: {logged_in}')

# Try fetching a lesson page
if logged_in:
    print('\nFetching a lesson page...')
    r3 = session.get('https://eddify.co/course/sat-and-act-math/lessons/addition-subtraction/', timeout=30)
    print(f'Lesson status: {r3.status_code}')
    print(f'Final URL: {r3.url}')
    has_video = 'youtube' in r3.text.lower() or 'vimeo' in r3.text.lower()
    print(f'Has video: {has_video}')
else:
    print('\nNot logged in — trying lesson page anyway...')
    r3 = session.get('https://eddify.co/course/sat-and-act-math/lessons/addition-subtraction/', timeout=30)
    print(f'Lesson status: {r3.status_code}')
    print(f'Final URL: {r3.url}')
    has_video = 'youtube' in r3.text.lower() or 'vimeo' in r3.text.lower()
    print(f'Has video (unauthenticated): {has_video}')
    # Show first 500 chars of lesson page
    print(r3.text[2000:2500])

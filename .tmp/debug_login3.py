import requests, re

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

BASE_URL  = 'https://eddify.co'
# iThemes Security hidden backend token
LOGIN_URL = f'{BASE_URL}/wp-login.php?itsec-hb-token=admin_acc'

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 Chrome/123.0'})

# Step 1: GET to initialize cookies
print('GET login page...')
r1 = session.get(LOGIN_URL, timeout=30)
print(f'Status: {r1.status_code}, URL: {r1.url}')
print('Cookies:', [(c.name, c.value[:30]) for c in session.cookies])

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
print('Cookies:', [(c.name, c.value[:30]) for c in session.cookies])

logged_in = any('logged_in' in c.name for c in session.cookies)
print(f'\nLogged in: {logged_in}')

if 'login_error' in r2.text:
    err = re.search(r'id="login_error">(.*?)</div>', r2.text, re.DOTALL)
    if err:
        import html
        print('Error:', html.unescape(re.sub(r'<[^>]+>', '', err.group(1))).strip())

if logged_in:
    print('\nFetching lesson page...')
    r3 = session.get('https://eddify.co/course/sat-and-act-math/lessons/addition-subtraction/', timeout=30)
    yt = re.findall(r'(?:youtube\.com/embed/|youtu\.be/)([\w-]{11})', r3.text)
    vimeo = re.findall(r'vimeo\.com/(?:video/)?(\d+)', r3.text)
    print(f'YouTube IDs: {yt}')
    print(f'Vimeo IDs: {vimeo}')

    # Also try AJAX
    print('\nTrying LP AJAX...')
    nonce_m = re.search(r'"nonce"\s*:\s*"([a-f0-9]+)"', r3.text)
    if nonce_m:
        nonce = nonce_m.group(1)
        r_ajax = session.post(
            'https://eddify.co/wp-admin/admin-ajax.php',
            data={
                'action': 'learnpress_item_content',
                'item_id': '11548',
                'nonce': nonce
            },
            timeout=30
        )
        print(f'AJAX status: {r_ajax.status_code}')
        print(r_ajax.text[:500])

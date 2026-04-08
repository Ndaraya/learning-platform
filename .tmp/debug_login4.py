import requests, re, html as html_mod

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

print(f'User: {WP_USER!r}, Pass: {WP_PASS!r}')

BASE_URL  = 'https://eddify.co'
LOGIN_URL = f'{BASE_URL}/wp-login.php?itsec-hb-token=admin_acc'

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 Chrome/123.0'})

# GET to prime cookies
r1 = session.get(LOGIN_URL, timeout=30)

# Check form action
form_action = re.search(r'<form[^>]+action="([^"]+)"', r1.text)
print(f'Form action: {form_action.group(1) if form_action else "NOT FOUND"}')

# Check for hidden inputs
hidden = re.findall(r'<input[^>]+type="hidden"[^>]*>', r1.text)
print('Hidden inputs:')
for h in hidden:
    print(' ', h)

# POST without following redirects
r2 = session.post(LOGIN_URL, data={
    'log':         WP_USER,
    'pwd':         WP_PASS,
    'wp-submit':   'Log In',
    'redirect_to': f'{BASE_URL}/wp-admin/',
    'testcookie':  '1',
}, allow_redirects=False, timeout=30)

print(f'\nPOST status: {r2.status_code}')
print(f'Location header: {r2.headers.get("Location", "NONE")}')
print('Set-Cookie headers:')
for k, v in r2.headers.items():
    if k.lower() == 'set-cookie':
        print(' ', v[:80])

# Look for error text
if 'login' in r2.text.lower():
    err_section = re.search(r'(login_error|<p[^>]*class="[^"]*message[^"]*"[^>]*>)(.*?)</(?:div|p)>', r2.text, re.DOTALL)
    if err_section:
        print('\nError:', html_mod.unescape(re.sub(r'<[^>]+>', '', err_section.group(2))).strip())

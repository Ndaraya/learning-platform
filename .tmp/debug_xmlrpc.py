import requests, re, xmlrpc.client

def load_env(path='.env.local'):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                env[key.strip()] = value.strip()
    return env

env      = load_env()
WP_USER  = env.get('WP_EDDIFY_USER', '')
WP_PASS  = env.get('WP_EDDIFY_PASS', '')
XMLRPC   = 'https://eddify.co/xmlrpc.php'

print('Testing XML-RPC...')
r = requests.get(XMLRPC, timeout=10)
print(f'GET xmlrpc.php: {r.status_code}')
print(r.text[:200])

if r.status_code == 200:
    print('\nTrying XML-RPC auth...')
    server = xmlrpc.client.ServerProxy(XMLRPC)
    try:
        # Get list of methods
        methods = server.system.listMethods()
        print('Available methods (first 10):', methods[:10])
    except Exception as e:
        print(f'listMethods error: {e}')

    try:
        # Try to get posts
        posts = server.wp.getPosts(1, WP_USER, WP_PASS, {
            'post_type': 'lp_lesson',
            'number': 2,
            'fields': ['post_id', 'post_title', 'post_content', 'custom_fields'],
        })
        print(f'\nGot {len(posts)} lessons via XML-RPC:')
        for p in posts:
            print(f'  ID={p.get("post_id")}, Title={p.get("post_title")}')
            content = p.get("post_content", "")
            yt = re.findall(r'youtube\.com/embed/([\w-]{11})', content)
            print(f'  YouTube IDs in content: {yt}')
            cf = p.get('custom_fields', [])
            print(f'  Custom fields: {[f["key"] for f in cf[:10]]}')
    except Exception as e:
        print(f'getPosts error: {e}')

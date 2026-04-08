"""
Seed ACT Practice Test 1 (2025 Enhanced ACT, form 25MC1) into the practice_tests table.

Usage:
  python tools/seed_practice_test_2025_1.py

Requires:
  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local

Notes:
  - 2025 Enhanced ACT uses A/B/C/D for ALL questions (answer_format = 'uniform')
  - Each section has embedded non-scored pretest questions (omitted from answer key)
  - question_counts reflects TOTAL questions on paper (including non-scored)
  - English: 50 total, 40 scored (Q1-40 keyed; Q41-50 are non-scored pretest)
  - Math:    45 total, 41 scored (Q7,16,29,40 are non-scored pretest, skipped in key)
  - Reading: 36 total, 27 scored (Q1-9 are non-scored pretest, skipped in key)
  - Science: 40 total, 34 scored (Q29-34 are non-scored pretest, skipped in key)
"""

import os
import sys
import requests

# ── Load env ──────────────────────────────────────────────────────────────────
env = {}
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            env[k.strip()] = v.strip()

SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL') or env.get('SUPABASE_URL')
SERVICE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    sys.exit(1)

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

# ── Find ACT course ────────────────────────────────────────────────────────────
resp = requests.get(
    f'{SUPABASE_URL}/rest/v1/courses',
    headers=HEADERS,
    params={'title': 'ilike.*ACT*', 'select': 'id,title'},
)
resp.raise_for_status()
courses = resp.json()
if not courses:
    print("ERROR: No ACT course found. Make sure a course with 'ACT' in the title exists.")
    sys.exit(1)

course = courses[0]
print(f"Found ACT course: {course['title']} ({course['id']})")

# ── Test data ─────────────────────────────────────────────────────────────────
TITLE = "ACT Practice Test 1 (2025)"

# Only scored questions appear; non-scored pretest questions are omitted.
# English Q41-50: non-scored (omitted). Math Q7,16,29,40: non-scored (omitted).
# Reading Q1-9: non-scored (omitted). Science Q29-34: non-scored (omitted).
ANSWER_KEY = {
    "english": {
        "1":"C","2":"B","3":"A","4":"A","5":"A","6":"A","7":"D","8":"D","9":"B","10":"B",
        "11":"B","12":"D","13":"C","14":"C","15":"D","16":"D","17":"D","18":"C","19":"A","20":"D",
        "21":"A","22":"A","23":"C","24":"C","25":"D","26":"B","27":"D","28":"A","29":"A","30":"B",
        "31":"C","32":"A","33":"A","34":"C","35":"A","36":"B","37":"B","38":"C","39":"D","40":"D"
    },
    "math": {
        "1":"D","2":"D","3":"B","4":"A","5":"C","6":"D",
        "8":"C","9":"D","10":"C","11":"B","12":"D","13":"A","14":"D","15":"A",
        "17":"A","18":"D","19":"B","20":"C","21":"C","22":"B","23":"B","24":"B","25":"A","26":"B","27":"B","28":"A",
        "30":"D","31":"C","32":"D","33":"C","34":"B","35":"C","36":"D","37":"C","38":"D","39":"C",
        "41":"D","42":"A","43":"C","44":"D","45":"A"
    },
    "reading": {
        "10":"D","11":"B","12":"C","13":"B","14":"D","15":"C","16":"D","17":"C","18":"A","19":"B",
        "20":"C","21":"D","22":"C","23":"A","24":"C","25":"D","26":"A","27":"B","28":"D","29":"D",
        "30":"A","31":"A","32":"B","33":"C","34":"D","35":"B","36":"C"
    },
    "science": {
        "1":"A","2":"A","3":"D","4":"C","5":"D","6":"A","7":"C","8":"D","9":"C","10":"A",
        "11":"C","12":"B","13":"C","14":"C","15":"B","16":"C","17":"B","18":"A","19":"D","20":"A",
        "21":"C","22":"D","23":"C","24":"D","25":"B","26":"D","27":"D","28":"B",
        "35":"B","36":"A","37":"B","38":"B","39":"C","40":"D"
    }
}

# Total questions on paper (including non-scored) — this is what the answer grid shows
QUESTION_COUNTS = {"english": 50, "math": 45, "reading": 36, "science": 40}

SCORING_TABLE = {
    "english": {
        "40":36,"39":35,"38":35,"37":33,"36":31,"35":29,"34":28,"33":27,"32":26,"31":25,
        "30":24,"29":23,"28":22,"27":22,"26":21,"25":20,"24":20,"23":19,"22":18,"21":17,
        "20":16,"19":15,"18":15,"17":14,"16":13,"15":13,"14":12,"13":11,"12":11,"11":10,
        "10":10,"9":10,"8":9,"7":8,"6":7,"5":7,"4":6,"3":5,"2":3,"1":2,"0":1
    },
    "math": {
        "41":36,"40":36,"39":35,"38":34,"37":34,"36":33,"35":32,"34":31,"33":30,"32":29,
        "31":29,"30":28,"29":27,"28":27,"27":26,"26":25,"25":24,"24":23,"23":22,"22":21,
        "21":20,"20":19,"19":19,"18":18,"17":17,"16":17,"15":17,"14":16,"13":16,"12":15,
        "11":15,"10":15,"9":14,"8":14,"7":13,"6":13,"5":12,"4":11,"3":9,"2":7,"1":5,"0":1
    },
    "reading": {
        "27":36,"26":35,"25":34,"24":32,"23":30,"22":28,"21":26,"20":25,"19":24,"18":23,
        "17":22,"16":21,"15":20,"14":18,"13":17,"12":16,"11":15,"10":14,"9":13,"8":12,
        "7":12,"6":11,"5":10,"4":9,"3":7,"2":5,"1":3,"0":1
    },
    "science": {
        "34":36,"33":35,"32":34,"31":33,"30":32,"29":31,"28":30,"27":29,"26":28,"25":27,
        "24":26,"23":25,"22":25,"21":24,"20":23,"19":23,"18":22,"17":21,"16":20,"15":19,
        "14":18,"13":18,"12":17,"11":16,"10":15,"9":14,"8":12,"7":12,"6":11,"5":10,
        "4":9,"3":7,"2":6,"1":3,"0":1
    }
}

# ── Delete existing entry (idempotent) ─────────────────────────────────────────
del_resp = requests.delete(
    f'{SUPABASE_URL}/rest/v1/practice_tests',
    headers=HEADERS,
    params={'title': f'eq.{TITLE}', 'course_id': f'eq.{course["id"]}'},
)
print(f"Deleted existing entry (status {del_resp.status_code})")

# ── Insert new entry ──────────────────────────────────────────────────────────
insert_resp = requests.post(
    f'{SUPABASE_URL}/rest/v1/practice_tests',
    headers=HEADERS,
    json={
        'course_id': course['id'],
        'title': TITLE,
        'description': 'Full-length 2025 Enhanced ACT practice test (form 25MC1). Complete the test on paper, then enter your answers here.',
        'answer_key': ANSWER_KEY,
        'scoring_table': SCORING_TABLE,
        'question_counts': QUESTION_COUNTS,
        'answer_format': 'uniform',
        'published': True,
    }
)
insert_resp.raise_for_status()
result = insert_resp.json()
print(f"Inserted: {result[0]['id']} — {result[0]['title']}")
print("Done.")

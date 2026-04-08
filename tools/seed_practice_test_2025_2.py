"""
Seed ACT Practice Test 2 (2025 Enhanced ACT, form MC5) into the practice_tests table.

Usage:
  python tools/seed_practice_test_2025_2.py

Requires:
  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local

Notes:
  - 2025 Enhanced ACT uses A/B/C/D for ALL questions (answer_format = 'uniform')
  - Each section has embedded non-scored pretest questions (omitted from answer key)
  - question_counts reflects TOTAL questions on paper (including non-scored)
  - English: 50 total, 40 scored (Q16-25 are non-scored pretest, skipped in key)
  - Math:    45 total, 41 scored (Q8,18,28,38 are non-scored pretest, skipped in key)
  - Reading: 36 total, 27 scored (Q19-27 are non-scored pretest, skipped in key)
  - Science: 40 total, 34 scored (Q6-11 are non-scored pretest, skipped in key)
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
TITLE = "ACT Practice Test 2 (2025)"

# Only scored questions appear; non-scored pretest questions are omitted.
# English Q16-25: non-scored (omitted). Math Q8,18,28,38: non-scored (omitted).
# Reading Q19-27: non-scored (omitted). Science Q6-11: non-scored (omitted).
ANSWER_KEY = {
    "english": {
        "1":"D","2":"C","3":"D","4":"D","5":"D","6":"C","7":"C","8":"C","9":"B","10":"A",
        "11":"A","12":"B","13":"C","14":"C","15":"B",
        "26":"D","27":"B","28":"D","29":"C","30":"A","31":"D","32":"C","33":"D","34":"A","35":"C",
        "36":"A","37":"C","38":"D","39":"D","40":"D","41":"B","42":"A","43":"A","44":"D","45":"B",
        "46":"D","47":"C","48":"D","49":"A","50":"D"
    },
    "math": {
        "1":"A","2":"D","3":"B","4":"B","5":"C","6":"D","7":"A",
        "9":"B","10":"D","11":"A","12":"C","13":"A","14":"D","15":"B","16":"B","17":"C",
        "19":"A","20":"B","21":"C","22":"B","23":"B","24":"D","25":"B","26":"C","27":"C",
        "29":"A","30":"D","31":"B","32":"D","33":"B","34":"B","35":"A","36":"B","37":"B",
        "39":"D","40":"A","41":"A","42":"D","43":"A","44":"A","45":"C"
    },
    "reading": {
        "1":"A","2":"B","3":"B","4":"A","5":"C","6":"C","7":"D","8":"A","9":"A","10":"B",
        "11":"C","12":"C","13":"A","14":"D","15":"A","16":"C","17":"B","18":"D",
        "28":"D","29":"B","30":"C","31":"D","32":"A","33":"D","34":"A","35":"C","36":"B"
    },
    "science": {
        "1":"D","2":"A","3":"B","4":"A","5":"C",
        "12":"A","13":"A","14":"C","15":"C","16":"D","17":"D","18":"C","19":"D","20":"B",
        "21":"B","22":"B","23":"A","24":"C","25":"D","26":"B","27":"D","28":"A","29":"D","30":"B",
        "31":"C","32":"C","33":"A","34":"B","35":"D","36":"A","37":"B","38":"A","39":"D","40":"A"
    }
}

# Total questions on paper (including non-scored) — this is what the answer grid shows
QUESTION_COUNTS = {"english": 50, "math": 45, "reading": 36, "science": 40}

SCORING_TABLE = {
    "english": {
        "40":36,"39":35,"38":35,"37":34,"36":32,"35":30,"34":28,"33":27,"32":26,"31":25,
        "30":24,"29":23,"28":23,"27":22,"26":21,"25":21,"24":20,"23":20,"22":19,"21":18,
        "20":17,"19":16,"18":15,"17":15,"16":14,"15":14,"14":13,"13":12,"12":11,"11":11,
        "10":11,"9":10,"8":10,"7":9,"6":8,"5":7,"4":6,"3":5,"2":4,"1":2,"0":1
    },
    "math": {
        "41":36,"40":36,"39":35,"38":34,"37":33,"36":31,"35":30,"34":29,"33":28,"32":27,
        "31":27,"30":26,"29":25,"28":25,"27":24,"26":23,"25":22,"24":21,"23":20,"22":19,
        "21":18,"20":18,"19":17,"18":17,"17":17,"16":16,"15":16,"14":16,"13":15,"12":15,
        "11":14,"10":14,"9":14,"8":14,"7":13,"6":12,"5":11,"4":10,"3":9,"2":7,"1":4,"0":1
    },
    "reading": {
        "27":36,"26":35,"25":34,"24":32,"23":30,"22":28,"21":27,"20":25,"19":24,"18":23,
        "17":22,"16":21,"15":20,"14":18,"13":17,"12":16,"11":15,"10":14,"9":13,"8":12,
        "7":11,"6":11,"5":10,"4":9,"3":7,"2":5,"1":3,"0":1
    },
    "science": {
        "34":36,"33":35,"32":34,"31":32,"30":30,"29":28,"28":27,"27":26,"26":26,"25":25,
        "24":24,"23":24,"22":23,"21":23,"20":22,"19":21,"18":21,"17":20,"16":19,"15":18,
        "14":18,"13":17,"12":16,"11":15,"10":14,"9":13,"8":12,"7":11,"6":11,"5":10,
        "4":9,"3":7,"2":5,"1":3,"0":1
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
        'description': 'Full-length 2025 Enhanced ACT practice test (form MC5). Complete the test on paper, then enter your answers here.',
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

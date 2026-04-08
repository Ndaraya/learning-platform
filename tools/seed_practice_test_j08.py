"""
Seed ACT Form J08 (October 2025) practice test into the practice_tests table.

Usage:
  python tools/seed_practice_test_j08.py

Requires:
  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
  (or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
"""

import json
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
TITLE = "ACT Form J08 (October 2025)"

ANSWER_KEY = {
    "english": {
        "1":"B","2":"F","3":"A","4":"J","5":"B","6":"J","7":"D","8":"H","9":"C","10":"H",
        "11":"D","12":"H","13":"A","14":"H","15":"D","16":"G","17":"A","18":"H","19":"A","20":"G",
        "21":"B","22":"F","23":"C","24":"H","25":"A","26":"J","27":"B","28":"H","29":"A","30":"G",
        "31":"D","32":"F","33":"D","34":"F","35":"C","36":"H","37":"B","38":"F","39":"C","40":"J"
    },
    "math": {
        "1":"D","2":"H","3":"D","4":"J","5":"B","6":"F","7":"H","8":"B","9":"J","10":"C",
        "11":"H","12":"C","13":"F","14":"A","15":"A","16":"G","17":"A","18":"G","19":"A","20":"G",
        "21":"C","22":"F","23":"A","24":"F","25":"A","26":"H","27":"B","28":"A","29":"H","30":"C",
        "31":"G","32":"D","33":"H","34":"C","35":"B","36":"J","37":"A","38":"H","39":"A","40":"J",
        "41":"D"
    },
    "reading": {
        "1":"C","2":"F","3":"B","4":"G","5":"D","6":"G","7":"D","8":"H","9":"A","10":"F",
        "11":"A","12":"G","13":"A","14":"H","15":"A","16":"G","17":"D","18":"H","19":"G","20":"A",
        "21":"F","22":"B","23":"H","24":"D","25":"G","26":"C","27":"J"
    },
    "science": {
        "1":"B","2":"H","3":"C","4":"J","5":"D","6":"J","7":"B","8":"H","9":"C","10":"J",
        "11":"A","12":"H","13":"D","14":"G","15":"C","16":"H","17":"D","18":"F","19":"C","20":"J",
        "21":"D","22":"G","23":"B","24":"F","25":"C","26":"G","27":"A","28":"G","29":"C","30":"G",
        "31":"C","32":"F","33":"D","34":"F"
    }
}

QUESTION_COUNTS = {"english": 40, "math": 41, "reading": 27, "science": 34}

# Raw-to-scale table derived from Form J08 scoring guide (page 47)
# Format: {"section": {"raw": scale, ...}}
def build_scoring_table():
    # Each entry: (scale, english_raws, math_raws, reading_raws, science_raws)
    # None means that scale doesn't exist for that raw range
    data = [
        # scale, english, math, reading, science
        (36, [40], [41], [26, 27], [33, 34]),
        (35, [37,38,39], [39,40], [25], [32]),
        (34, [36], [37,38], [24], [31]),
        (33, [35], [36], [23], [30]),
        (32, [34], [35], [22], [29]),
        (31, [], [33,34], [], [28]),
        (30, [33], [32], [21], []),
        (29, [32], [31], [20], [27]),
        (28, [31], [29,30], [19], [26]),
        (27, [30], [28], [], [25]),
        (26, [29], [26,27], [18], [24]),
        (25, [27,28], [25], [17], [22,23]),
        (24, [26], [23,24], [16], [21]),
        (23, [24,25], [22], [15], [19,20]),
        (22, [23], [21], [14], [18]),
        (21, [21,22], [20], [], [17]),
        (20, [19,20], [19], [13], [16]),
        (19, [18], [18], [12], [15]),
        (18, [17], [16,17], [], [14]),
        (17, [], [14,15], [11], [13]),
        (16, [16], [12,13], [10], [11,12]),
        (15, [14,15], [10,11], [], [10]),
        (14, [13], [8,9], [9], [9]),
        (13, [12], [7], [8], [8]),
        (12, [11], [6], [7], [6,7]),
        (11, [9,10], [5], [6], [5]),
        (10, [7,8], [4], [5], [4]),
        (9,  [6], [3], [4], []),
        (8,  [5], [], [], [3]),
        (7,  [4], [2], [3], []),
        (6,  [], [], [], [2]),
        (5,  [3], [], [2], []),
        (4,  [2], [1], [], [1]),
        (3,  [], [], [1], []),
        (2,  [1], [], [], []),
        (1,  [0], [0], [0], [0]),
    ]

    table = {"english": {}, "math": {}, "reading": {}, "science": {}}
    sections = ["english", "math", "reading", "science"]

    for row in data:
        scale = row[0]
        raws_per_section = row[1:]
        for i, section in enumerate(sections):
            for raw in raws_per_section[i]:
                table[section][str(raw)] = scale

    return table

SCORING_TABLE = build_scoring_table()

# ── Delete existing J08 entry (idempotent) ────────────────────────────────────
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
        'description': 'Full-length ACT practice test (My Answer Key edition). Complete the test on paper, then enter your answers here.',
        'answer_key': ANSWER_KEY,
        'scoring_table': SCORING_TABLE,
        'question_counts': QUESTION_COUNTS,
        'published': True,
    }
)
insert_resp.raise_for_status()
result = insert_resp.json()
print(f"Inserted: {result[0]['id']} — {result[0]['title']}")
print("Done.")

"""
Seed the SAT Question Bank from the three WP exports into Supabase.

Source files (all in learning-platform/):
  - eddify.questionbank.WordPress.2026-05-03.xml   lp_question posts (text, type, explanation)
  - wp_learnpress_question_answers.csv             answer options + correct-answer flags
  - wp_learnpress_quiz_questions.csv               quiz → question assignments

Usage (from learning-platform/):
    py -3 tools/seed_sat_qbank.py [--dry-run]

Idempotent: deletes and recreates the "SAT Question Bank" course on each run.
"""

import csv
import html
import json
import os
import re
import sys
import requests
from collections import defaultdict

DRY_RUN = '--dry-run' in sys.argv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SAT_QBANK_QUIZ_IDS = {
    # Algebra
    22884: ('Algebra',                     'Linear Functions 3a'),
    22885: ('Algebra',                     'Linear Inequalities 3a'),
    22887: ('Algebra',                     'Systems of Linear Equations 1a–2b'),
    23560: ('Algebra',                     'Systems of Linear Equations 3a'),
    # Advanced Math
    22895: ('Advanced Math',               'Non-Linear Equations (1–2 Variables) 1a–2b'),
    23202: ('Advanced Math',               'Non-Linear Functions 3a'),
    23208: ('Advanced Math',               'Non-Linear Equations (1–2 Variables) 3a'),
    23259: ('Advanced Math',               'Non-Linear Equations (1–2 Variables) 3b'),
    23325: ('Advanced Math',               'Non-Linear Functions 3b'),
    23371: ('Advanced Math',               'Non-Linear Functions 3c'),
    # Problem Solving & Data Analysis
    22898: ('Problem Solving & Data Analysis', 'Percentages'),
    22900: ('Problem Solving & Data Analysis', 'Probability (Hard)'),
    22904: ('Problem Solving & Data Analysis', 'Rates, Ratios, Proportions & Units'),
    # Geometry & Trigonometry
    22914: ('Geometry & Trigonometry',     'Lines, Angles & Triangles 1a–2a'),
    22915: ('Geometry & Trigonometry',     'Right Triangles & Trigonometry (Hard)'),
    22916: ('Geometry & Trigonometry',     'Circles (Hard)'),
    23602: ('Geometry & Trigonometry',     'Lines, Angles & Triangles 3a'),
}

ACT_QBANK_QUIZ_IDS = {
    # ACT English
    22465: ('ACT English', 'Commas'),
    22551: ('ACT English', 'Clauses'),
    22625: ('ACT English', 'Redundancy'),
    # ACT Math
    22656: ('ACT Math', 'Basic Algebra'),
    22737: ('ACT Math', 'Exponents'),
    22754: ('ACT Math', 'Averages'),
    22769: ('ACT Math', 'Probability'),
    22797: ('ACT Math', 'Percentages'),
}

MODULE_ORDER = {
    'Algebra': 1,
    'Advanced Math': 2,
    'Problem Solving & Data Analysis': 3,
    'Geometry & Trigonometry': 4,
    'ACT English': 1,
    'ACT Math': 2,
}

LESSON_ORDER_WITHIN_MODULE = {
    # Algebra
    'Linear Functions 3a': 1,
    'Linear Inequalities 3a': 2,
    'Systems of Linear Equations 1a–2b': 3,
    'Systems of Linear Equations 3a': 4,
    # Advanced Math
    'Non-Linear Equations (1–2 Variables) 1a–2b': 1,
    'Non-Linear Functions 3a': 2,
    'Non-Linear Equations (1–2 Variables) 3a': 3,
    'Non-Linear Equations (1–2 Variables) 3b': 4,
    'Non-Linear Functions 3b': 5,
    'Non-Linear Functions 3c': 6,
    # Problem Solving
    'Percentages': 1,
    'Probability (Hard)': 2,
    'Rates, Ratios, Proportions & Units': 3,
    # Geometry
    'Lines, Angles & Triangles 1a–2a': 1,
    'Right Triangles & Trigonometry (Hard)': 2,
    'Circles (Hard)': 3,
    'Lines, Angles & Triangles 3a': 4,
    # ACT English
    'Commas': 1,
    'Clauses': 2,
    'Redundancy': 3,
    # ACT Math
    'Basic Algebra': 1,
    'Exponents': 2,
    'Averages': 3,
    'Probability': 4,
    'Percentages': 5,
}

# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------

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

env = load_env()
SB_URL  = env.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
SB_KEY  = env.get('SUPABASE_SERVICE_ROLE_KEY', '')
HEADERS = {
    'Authorization': f'Bearer {SB_KEY}',
    'apikey':        SB_KEY,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
}

def rest(method, table, data=None, params=None):
    url = f'{SB_URL}/rest/v1/{table}'
    r = requests.request(method, url, headers=HEADERS, json=data, params=params, timeout=30)
    if not r.ok:
        print(f'ERROR {method} {table}: {r.status_code} {r.text[:300]}')
        sys.exit(1)
    try:
        return r.json()
    except Exception:
        return []

# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def strip_tags(text):
    """Strip HTML tags and decode entities."""
    if not text:
        return ''
    text = re.sub(r'<[^>]+>', '', text)
    return html.unescape(text).strip()

def convert_wp_math(text):
    """Convert WP LaTeX shortcodes to $...$ for the KaTeX renderer.

    WP uses two formats:
      [latex]...[/latex]    – QuickLaTeX shortcode (SAT-era questions)
      $latex ... &s=N$      – inline shortcode (older questions)

    Inside the LaTeX expression, % and bare $ need escaping for KaTeX.
    """
    def fix_expr(expr):
        expr = re.sub(r'(?<!\\)%', r'\\%', expr)   # % → \%
        expr = re.sub(r'(?<!\\)\$', r'\\$', expr)  # $ → \$
        return expr.strip()

    def repl_bracket(m):
        return '$' + fix_expr(m.group(1)) + '$'

    def repl_dollar(m):
        return '$' + fix_expr(m.group(1)) + '$'

    text = re.sub(r'\[latex\](.*?)\[/latex\]', repl_bracket, text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'\$latex\s+(.*?)(?:\s*&s=\d+)?\s*\$', repl_dollar, text, flags=re.DOTALL)
    return text

def clean_option(text):
    """Strip HTML, decode entities, convert WP math — for answer option strings."""
    if not text:
        return ''
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text).replace('\xa0', ' ')
    text = convert_wp_math(text)
    return text.strip()

def is_fib_question(opts_raw):
    """Return True if any option contains a LearnPress fill-in-blank shortcode."""
    return any('[fib ' in a.get('title', '') for a in opts_raw)

def extract_fib_answer(opts_raw):
    """Extract the correct answer value from a LearnPress [fib fill="VALUE" ...] shortcode."""
    for a in opts_raw:
        m = re.search(r'\[fib\s+fill=["\']?([^"\'>\]\s]+)', a.get('title', ''))
        if m:
            return m.group(1).strip()
    return ''

def clean_prompt(html_str):
    """Clean WP HTML for the prompt field: preserve <table> blocks (rendered by frontend),
    convert <p>/<br> to newlines, strip remaining tags, decode entities, convert WP math."""
    if not html_str:
        return ''
    parts = re.split(r'(<table>[\s\S]*?</table>)', html_str, flags=re.IGNORECASE)
    cleaned = []
    for part in parts:
        if re.match(r'<table>', part, re.IGNORECASE):
            cleaned.append(part.strip())
        else:
            text = re.sub(r'</p>', '\n', part, flags=re.IGNORECASE)
            text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
            text = re.sub(r'<[^>]+>', '', text)
            text = html.unescape(text).replace('\xa0', ' ')
            text = convert_wp_math(text)
            text = re.sub(r'[ \t]+', ' ', text)
            text = re.sub(r'\n{3,}', '\n\n', text).strip()
            if text:
                cleaned.append(text)
    return '\n'.join(cleaned).strip()

def extract_youtube_url(html_str):
    """Extract the first YouTube video ID and return a clean embed URL."""
    if not html_str:
        return ''
    # iframe src: .../embed/VIDEO_ID (followed by optional query params or quote)
    m = re.search(r'youtube(?:-nocookie)?\.com/embed/([\w-]+)', html_str)
    if m:
        return f'https://www.youtube-nocookie.com/embed/{m.group(1)}?rel=0'
    # watch?v=VIDEO_ID
    m2 = re.search(r'youtube\.com/watch\?v=([\w-]+)', html_str)
    if m2:
        return f'https://www.youtube-nocookie.com/embed/{m2.group(1)}?rel=0'
    return ''

def load_questions_from_xml(xml_path):
    """Parse lp_question items from WP XML export. Returns {post_id: dict}."""
    with open(xml_path, encoding='utf-8') as f:
        content = f.read()

    q_map = {}
    for item in re.findall(r'<item>(.*?)</item>', content, re.DOTALL):
        pt = re.search(r'<wp:post_type><!\[CDATA\[(.*?)\]\]>', item)
        if not pt or pt.group(1) != 'lp_question':
            continue
        pid = re.search(r'<wp:post_id>(\d+)</wp:post_id>', item)
        if not pid:
            continue

        def meta(key):
            m = re.search(
                rf'<wp:meta_key><!\[CDATA\[{re.escape(key)}\]\]>.*?<wp:meta_value><!\[CDATA\[(.*?)\]\]>',
                item, re.DOTALL)
            return m.group(1).strip() if m else ''

        content_enc = re.search(r'<content:encoded><!\[CDATA\[(.*?)\]\]>', item, re.DOTALL)
        explanation_raw = meta('_lp_explanation')

        q_map[pid.group(1)] = {
            'id':          pid.group(1),
            'content_raw': content_enc.group(1).strip() if content_enc else '',
            'type':        meta('_lp_type'),
            'explanation': explanation_raw,
            'solution_url': extract_youtube_url(explanation_raw),
            'hint':        meta('_lp_hint'),
        }
    return q_map

def load_answers(csv_path):
    """Returns {question_id: [sorted answer dicts]}."""
    ans_map = defaultdict(list)
    with open(csv_path, encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            ans_map[row['question_id']].append(row)
    # Sort each group by answer_order
    for qid in ans_map:
        ans_map[qid].sort(key=lambda r: int(r.get('answer_order', r.get('order', 0))))
    return ans_map

def load_quiz_questions(csv_path):
    """Returns {quiz_id: [sorted question_id strings]}."""
    quiz_map = defaultdict(list)
    with open(csv_path, encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            quiz_map[row['quiz_id']].append(row)
    for qz in quiz_map:
        quiz_map[qz].sort(key=lambda r: int(r.get('question_order', 0)))
    return quiz_map

# ---------------------------------------------------------------------------
# Build course structure
# ---------------------------------------------------------------------------

def build_course(quiz_id_map, q_map, ans_map, quiz_q_map, course_title, course_slug):
    """
    Returns a dict ready for seeding:
      { course, modules: [ { title, order, lessons: [ { title, order, questions: [...] } ] } ] }
    """
    # Group quizzes by module
    modules_dict = defaultdict(list)   # module_name -> [(lesson_order, lesson_title, quiz_id)]
    for quiz_id, (module_name, lesson_title) in quiz_id_map.items():
        lesson_order = LESSON_ORDER_WITHIN_MODULE.get(lesson_title, 99)
        modules_dict[module_name].append((lesson_order, lesson_title, quiz_id))

    modules = []
    for module_name, lesson_list in modules_dict.items():
        lessons = []
        for lesson_order, lesson_title, quiz_id in sorted(lesson_list):
            questions = []
            for qq_row in quiz_q_map.get(str(quiz_id), []):
                qid = qq_row['question_id']
                q   = q_map.get(qid)
                if not q:
                    continue
                opts_raw = ans_map.get(qid, [])

                if is_fib_question(opts_raw):
                    q_type  = 'written'
                    options = []
                    correct = extract_fib_answer(opts_raw)
                else:
                    options = [clean_option(a['title']) for a in opts_raw]
                    correct = next(
                        (clean_option(a['title']) for a in opts_raw if a.get('is_true') == 'yes'),
                        None) or ''
                    q_type  = 'mcq' if options else 'written'

                questions.append({
                    'prompt':        clean_prompt(q['content_raw']),
                    'type':          q_type,
                    'options':       options,
                    'correct_answer': correct,
                    'solution_url':  q['solution_url'],
                    'hint':          q['hint'],
                    'points':        1,
                })

            lessons.append({
                'title':     lesson_title,
                'order':     lesson_order,
                'questions': questions,
            })

        modules.append({
            'title': module_name,
            'order': MODULE_ORDER.get(module_name, 99),
            'lessons': lessons,
        })

    return {
        'course': {'title': course_title, 'slug': course_slug, 'published': False},
        'modules': sorted(modules, key=lambda m: m['order']),
    }

# ---------------------------------------------------------------------------
# Seed to Supabase
# ---------------------------------------------------------------------------

def seed_course(course_data):
    title = course_data['course']['title']

    # Delete existing
    existing = rest('GET', 'courses', params={'title': f'eq.{title}', 'select': 'id'})
    if existing:
        rest('DELETE', 'courses', params={'id': f'eq.{existing[0]["id"]}'})
        print(f'  Deleted existing "{title}" course (cascade).')

    # Admin user
    profiles = rest('GET', 'profiles', params={'email': 'eq.eddify.platform@gmail.com', 'select': 'id'})
    if not profiles:
        print('ERROR: admin profile not found')
        sys.exit(1)
    admin_id = profiles[0]['id']

    # Create course
    course_row = rest('POST', 'courses', data={
        'title':      title,
        'description': '',
        'published':  False,
        'created_by': admin_id,
    })[0]
    course_id = course_row['id']
    print(f'  Course created: {course_id}')

    total_lessons = total_tasks = total_questions = 0

    for mod in course_data['modules']:
        mod_row = rest('POST', 'modules', data={
            'course_id': course_id,
            'title':     mod['title'],
            'order':     mod['order'],
        })[0]
        mod_id = mod_row['id']
        print(f'  Module {mod["order"]}: {mod["title"]} ({len(mod["lessons"])} lessons)')

        for les in mod['lessons']:
            les_row = rest('POST', 'lessons', data={
                'module_id':   mod_id,
                'title':       les['title'],
                'youtube_url': '',
                'order':       les['order'],
            })[0]
            les_id = les_row['id']
            total_lessons += 1

            # One quiz task per lesson
            task_row = rest('POST', 'tasks', data={
                'lesson_id':    les_id,
                'title':        f'{les["title"]} Quiz',
                'type':         'quiz',
                'instructions': 'Answer each question. Your score will be recorded.',
                'order':        1,
            })[0]
            task_id = task_row['id']
            total_tasks += 1

            for q_ord, q in enumerate(les['questions'], start=1):
                q_data = {
                    'task_id':       task_id,
                    'prompt':        q['prompt'],
                    'type':          q['type'],
                    'points':        q['points'],
                    'author_note':   q['solution_url'] or None,
                    'hint':          q['hint'] or None,
                }
                if q['type'] == 'mcq':
                    q_data['options']        = q['options']
                    q_data['correct_answer'] = q['correct_answer']
                rest('POST', 'questions', data=q_data)
                total_questions += 1

    print(f'\n  Lessons:   {total_lessons}')
    print(f'  Tasks:     {total_tasks}')
    print(f'  Questions: {total_questions}')
    return total_questions

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    xml_path      = 'eddify.questionbank.WordPress.2026-05-03.xml'
    answers_path  = 'wp_learnpress_question_answers.csv'
    quiz_q_path   = 'wp_learnpress_quiz_questions.csv'

    for path in [xml_path, answers_path, quiz_q_path]:
        if not os.path.exists(path):
            print(f'ERROR: {path} not found. Run from the learning-platform directory.')
            sys.exit(1)

    print('Loading source data...')
    q_map      = load_questions_from_xml(xml_path)
    ans_map    = load_answers(answers_path)
    quiz_q_map = load_quiz_questions(quiz_q_path)

    print(f'  Questions in XML:   {len(q_map)}')
    print(f'  Answer rows:        {sum(len(v) for v in ans_map.values())}')
    print(f'  Quiz-question rows: {sum(len(v) for v in quiz_q_map.values())}')

    sat_data = build_course(SAT_QBANK_QUIZ_IDS, q_map, ans_map, quiz_q_map,
                             'SAT Question Bank', 'sat-question-bank')
    act_data = build_course(ACT_QBANK_QUIZ_IDS, q_map, ans_map, quiz_q_map,
                             'ACT Question Bank', 'act-question-bank')

    # Stats preview
    sat_q = sum(len(l['questions']) for m in sat_data['modules'] for l in m['lessons'])
    act_q = sum(len(l['questions']) for m in act_data['modules'] for l in m['lessons'])
    print(f'\nSAT QBank: {len(sat_data["modules"])} modules, '
          f'{sum(len(m["lessons"]) for m in sat_data["modules"])} lessons, {sat_q} questions')
    print(f'ACT QBank: {len(act_data["modules"])} modules, '
          f'{sum(len(m["lessons"]) for m in act_data["modules"])} lessons, {act_q} questions')

    if DRY_RUN:
        print('\n--dry-run: no database writes. Remove flag to seed.')
        return

    print('\n=== Seeding SAT Question Bank ===')
    seed_course(sat_data)

    print('\n=== Seeding ACT Question Bank ===')
    seed_course(act_data)

    print('\nDone. Visit /admin/courses to review and publish.')

if __name__ == '__main__':
    main()

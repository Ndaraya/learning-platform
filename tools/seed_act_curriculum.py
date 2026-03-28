"""
Seed the ACT Test Prep curriculum into the learning platform.
Run from the learning-platform directory:
    python tools/seed_act_curriculum.py

Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
Uses the super_admin account (eddify.platform@gmail.com) as created_by
"""

import json
import os
import sys
import requests

# ── Load .env.local ────────────────────────────────────────────────────────────
def load_env(path='.env.local'):
    env = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, value = line.partition('=')
                    env[key.strip()] = value.strip()
    except FileNotFoundError:
        print(f'ERROR: {path} not found. Run from the learning-platform directory.')
        sys.exit(1)
    return env

env = load_env()
SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
SERVICE_KEY  = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SERVICE_KEY:
    print('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    sys.exit(1)

HEADERS = {
    'Authorization': f'Bearer {SERVICE_KEY}',
    'apikey': SERVICE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

def rest(method, table, data=None, params=None):
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    r = requests.request(method, url, headers=HEADERS, json=data, params=params)
    if not r.ok:
        print(f'ERROR {method} {table}: {r.status_code} {r.text}')
        sys.exit(1)
    return r.json()

# ── Curriculum data ────────────────────────────────────────────────────────────
CURRICULUM = [
    {
        'title': 'English',
        'description': 'Master the 50-question ACT English test — production of writing, knowledge of language, and conventions of standard English.',
        'lessons': [
            ('Introduction to the ACT English Test',          'Learn section structure, timing, scoring, and pacing strategy for 50 questions in 35 minutes'),
            ('Understanding ACT Passage Types',               'Distinguish informational, argumentative, and narrative passages; understand how passage type affects revision testing'),
            ('Main Purpose & Idea Development',               'Identify central purpose, assess content support, and choose revisions that strengthen arguments'),
            ('Organizational Structure & Logical Flow',       'Evaluate sentence/paragraph order and identify structural problems disrupting argument clarity'),
            ('Transitions & Cohesion',                        'Select transitional phrases reflecting logical relationships; evaluate coherence effects'),
            ('Introduction, Body & Conclusion Strategies',   'Evaluate opening/closing effectiveness and identify revisions matching passage purpose'),
            ('Relevance: Adding, Deleting & Revising Content','Determine whether content serves passage purpose; evaluate deletion necessity based on relevance'),
            ('Precision & Word Choice',                       'Select contextually appropriate words; recognize unintended meaning or tone shifts'),
            ('Conciseness & Eliminating Wordiness',          'Identify redundancy and wordiness; choose concise options preserving original meaning'),
            ('Style, Tone & Register',                        'Identify passage tone and maintain register consistency; distinguish formal from informal language'),
            ('Subject-Verb Agreement',                        'Apply agreement rules across simple and complex structures; correct errors involving compound subjects'),
            ('Pronoun Agreement & Case',                      'Correct pronoun-antecedent errors; select proper case (subjective, objective, possessive)'),
            ('Verb Tense, Mood & Voice',                      'Maintain consistent tense; correct inappropriate shifts; distinguish active versus passive voice'),
            ('Modifiers & Parallelism',                       'Identify dangling/misplaced modifiers; apply parallel structure in lists and comparisons'),
            ('Comma Usage',                                   'Apply comma rules for introductory phrases, lists, restrictive/non-restrictive clauses'),
            ('Apostrophes, Semicolons & Colons',              'Use apostrophes for possession; apply semicolons joining independent clauses; use colons correctly'),
            ('Sentence Structure: Fragments, Run-Ons & Comma Splices', 'Identify fragments and run-ons; choose appropriate corrections'),
            ('English Test Strategy & Full-Length Practice',  'Apply efficient processes; use elimination strategies; manage 50-question timing in 35 minutes'),
        ],
    },
    {
        'title': 'Math',
        'description': 'Build mastery across all 45-question ACT Math topics — from integrating essential skills through higher mathematics.',
        'lessons': [
            ('Introduction to the ACT Math Test',             'Describe structure, question types, calculator policy; identify IES and PHM reporting categories'),
            ('Rates, Ratios & Proportions',                   'Calculate unit rates; set up and solve proportions; apply ratios to scale and distance problems'),
            ('Percentages & Percent Change',                  'Calculate percentages and percent increase/decrease; solve successive percent change problems'),
            ('Area, Perimeter & Basic Volume',                'Calculate 2D and 3D measurements; find areas of composite figures; compute basic volumes'),
            ('Number Sense & Order of Operations',            'Apply PEMDAS in multi-step expressions; classify numbers; evaluate absolute value expressions'),
            ('Real Numbers, Sets & Properties',               'Apply commutative, associative, distributive properties; classify real numbers; solve with absolute value'),
            ('Integers, Factors & Multiples',                 'Find GCF and LCM; apply prime factorization; understand divisibility rules'),
            ('Complex Numbers',                               'Define imaginary unit; perform complex number operations; interpret quadratic equation solutions'),
            ('Vectors & Matrices',                            'Perform matrix operations; multiply matrices; add and scale vectors'),
            ('Linear Equations & Inequalities',               'Solve single-variable equations and inequalities; graph solutions; solve word problems'),
            ('Systems of Equations',                          'Solve using substitution and elimination; identify systems with no or infinite solutions'),
            ('Quadratic Equations',                           'Solve by factoring, completing the square, or quadratic formula; interpret discriminant'),
            ('Polynomials',                                   'Add, subtract, multiply polynomials; factor using GCF and grouping; divide polynomials'),
            ('Exponents & Radicals',                          'Apply exponent rules; simplify radical expressions; convert between radical and rational exponent forms'),
            ('Absolute Value Equations & Inequalities',       'Solve absolute value equations using two-case setup; solve inequalities; interpret distance context'),
            ('Function Notation & Evaluation',                'Interpret f(x) notation; evaluate functions; determine domain and range; evaluate composite functions'),
            ('Linear & Quadratic Functions',                  'Write linear functions in multiple forms; identify quadratic features; apply transformations'),
            ('Exponential & Logarithmic Functions',           'Write growth/decay functions; apply logarithm rules; convert between exponential and logarithmic forms'),
            ('Radical, Piecewise & Absolute Value Functions', 'Graph radical functions identifying domain restrictions; evaluate piecewise functions; graph absolute value'),
            ('Analyzing & Transforming Function Graphs',      'Describe and apply shifts, reflections, stretches to parent functions; identify transformation effects'),
            ('Angles, Lines & Transversals',                  'Identify and calculate angle pairs from parallel lines; apply supplementary/vertical angle properties'),
            ('Triangles: Types, Properties & Angle Sum',      'Apply triangle angle sum; use equilateral/isosceles properties; determine congruence and similarity'),
            ('Pythagorean Theorem & Special Right Triangles', 'Apply Pythagorean theorem; use 30-60-90 and 45-45-90 ratios; identify Pythagorean triples'),
            ('Circles: Properties, Arcs & Sectors',          'Calculate arc length and sector area; apply chord, tangent, inscribed angle properties; write circle equations'),
            ('Coordinate Geometry',                           'Calculate distance and midpoint; find slope; write linear equations; determine parallel/perpendicular relationships'),
            ('3D Solids: Surface Area & Volume',              'Calculate volumes of prisms, cylinders, pyramids, cones, spheres; find surface areas; solve composite problems'),
            ('Trigonometry: SOH-CAH-TOA & Applications',     'Define trig ratios; find missing sides and angles; apply unit circle to key angle values'),
            ('Descriptive Statistics',                        'Calculate and interpret mean, median, mode; compute range and standard deviation; analyze outlier effects'),
            ('Probability & Counting Methods',                'Calculate simple and compound probability; apply permutations, combinations, counting principles'),
            ('Data Interpretation & Statistical Reasoning',  'Read scatter plots, histograms, box plots; identify trends and correlations; evaluate statistical claims'),
            ('Mathematical Modeling',                         'Translate real-world scenarios into equations; interpret variables and rates; evaluate and compare models'),
            ('Math Test Strategy & Full-Length Practice',     'Apply back-solving and estimation; identify when to skip; manage timing for 45 questions in 50 minutes'),
        ],
    },
    {
        'title': 'Reading',
        'description': 'Develop the skills to tackle all four ACT Reading passage types — literary narrative, social science, humanities, and natural science.',
        'lessons': [
            ('Introduction to the ACT Reading Test',          'Describe structure, passage types, reporting categories; develop initial passage approach strategy'),
            ('Main Idea & Central Purpose',                   'Identify central ideas and main arguments; distinguish from supporting details; select accurate summaries'),
            ('Supporting Details & Evidence Retrieval',       'Locate explicit details and facts; distinguish relevant from irrelevant evidence; identify trap answers'),
            ('Drawing Inferences & Logical Conclusions',      'Draw valid inferences; recognize supported conclusions; distinguish inference from unsupported assumptions'),
            ('Literary Narrative: Character, Setting & Sequence', 'Analyze character motivation and relationships; identify narrative sequence; interpret setting\'s effects'),
            ('Vocabulary in Context',                         'Determine word meanings using context clues; understand connotation shifts; test precise meanings'),
            ('Author\'s Purpose & Point of View',             'Identify author purpose (inform, persuade, entertain, describe); analyze bias and perspective'),
            ('Text Structure & Organization',                 'Identify text structures (compare/contrast, cause/effect); explain structural choices; analyze paragraph function'),
            ('Rhetoric & Argumentative Techniques',           'Identify rhetorical devices (anecdote, analogy, authority appeals); analyze argument support and effectiveness'),
            ('Comparing Multiple Perspectives',               'Compare paired passage arguments; identify agreement/disagreement points; synthesize information'),
            ('Evaluating Evidence & Reasoning',               'Distinguish facts from opinions; evaluate evidence quality; identify logical fallacies'),
            ('Literary Narrative Passage Strategy',           'Apply systematic approach to fiction/memoir passages; identify common literary narrative question types'),
            ('Social Science Passage Strategy',               'Navigate history, economics, political science passages; handle embedded data and statistics; detect bias'),
            ('Humanities Passage Strategy',                   'Approach memoir, biography, arts criticism; analyze author perspective and descriptive language'),
            ('Natural Science Passage Strategy',              'Read science passages without prior knowledge; extract meaning from technical vocabulary; interpret data'),
            ('Reading Test Pacing & Process of Elimination',  'Implement time management completing 4 passages in 40 minutes; apply elimination; identify trap patterns'),
        ],
    },
    {
        'title': 'Science (Optional)',
        'description': 'Strengthen data interpretation and scientific reasoning skills across the 40-question ACT Science test — scored separately from the composite.',
        'lessons': [
            ('Introduction to the ACT Science Test',          'Describe structure, question types, passage formats; explain optional status and separate scoring'),
            ('Reading Graphs & Charts',                       'Extract data values from line graphs, bar charts, scatter plots; identify variables and units'),
            ('Reading Tables & Multi-Variable Figures',       'Locate values in data tables; interpret multi-variable figures; compare values across groups'),
            ('Identifying Trends, Patterns & Relationships',  'Describe trend direction; identify correlations; recognize outliers and non-linear patterns'),
            ('Understanding Experimental Design',             'Identify independent/dependent and controlled variables; explain control group purpose; recognize valid designs'),
            ('Analyzing Results & Drawing Conclusions',       'Determine hypothesis support; draw valid conclusions; predict results from observed trends'),
            ('Comparing Multiple Experiments',                'Identify design similarities and differences; understand experimental variation purposes; integrate findings'),
            ('Identifying Competing Hypotheses',              'Summarize each hypothesis; identify key disagreement points between viewpoints'),
            ('Evaluating & Comparing Scientific Arguments',   'Identify supporting/weakening evidence; determine data consistency; evaluate argument strengths'),
            ('Biology & Life Science Data Contexts',          'Recognize biology experiment setups; navigate organism and population passages without prior knowledge'),
            ('Chemistry & Physics Data Contexts',             'Interpret chemistry and physics experiment data; extract meaning from reaction and force descriptions'),
            ('Earth & Space Science Data Contexts',           'Navigate geological, meteorological, astronomical data; read maps and cross-sections; interpret timescales'),
            ('Science Test Strategy & Full-Length Practice',  'Apply passage-ordering strategy (DR, RS before CV); use active reading and annotation; manage 35-minute timing'),
        ],
    },
]

PLACEHOLDER_URL = 'https://www.youtube.com/watch?v=placeholder'

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    # 1. Get admin user ID
    print('Looking up admin user...')
    profiles = rest('GET', 'profiles', params={'email': 'eq.eddify.platform@gmail.com', 'select': 'id,email'})
    if not profiles:
        print('ERROR: eddify.platform@gmail.com not found in profiles table')
        sys.exit(1)
    admin_id = profiles[0]['id']
    print(f'  Admin user: {admin_id}')

    # 2. Check if course already exists
    existing = rest('GET', 'courses', params={'title': 'eq.ACT Test Prep', 'select': 'id,title'})
    if existing:
        print(f'Course "ACT Test Prep" already exists (id={existing[0]["id"]}). Skipping.')
        return

    # 3. Create course
    print('Creating course "ACT Test Prep"...')
    course = rest('POST', 'courses', data={
        'title': 'ACT Test Prep',
        'description': 'A comprehensive, self-paced ACT preparation program covering English, Math, Reading, and Science. Each lesson is aligned to official ACT reporting categories and Bloom\'s Taxonomy learning objectives.',
        'created_by': admin_id,
        'published': False,
    })
    course_id = course[0]['id']
    print(f'  Course created: {course_id}')

    # 4. Create modules and lessons
    total_lessons = 0
    for module_order, module_data in enumerate(CURRICULUM, start=1):
        print(f'Creating module {module_order}: {module_data["title"]} ({len(module_data["lessons"])} lessons)...')
        module = rest('POST', 'modules', data={
            'course_id': course_id,
            'title': module_data['title'],
            'description': module_data['description'],
            'order': module_order,
        })
        module_id = module[0]['id']

        for lesson_order, (title, description) in enumerate(module_data['lessons'], start=1):
            rest('POST', 'lessons', data={
                'module_id': module_id,
                'title': title,
                'description': description,
                'youtube_url': PLACEHOLDER_URL,
                'order': lesson_order,
            })
            total_lessons += 1

        print(f'  Module {module_order} done — {len(module_data["lessons"])} lessons added')

    print(f'\nDone! Created 1 course, {len(CURRICULUM)} modules, {total_lessons} lessons.')
    print(f'Visit /admin/courses to see the course and begin adding YouTube URLs.')

if __name__ == '__main__':
    main()

"""
Seed the ACT Diagnostic Assessment module into the existing ACT Test Prep course.
Run from the learning-platform directory:
    python tools/seed_act_diagnostic.py

Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
Creates:
  - Module: "Diagnostic Assessment" (order=0)
  - Lesson: "ACT Diagnostic" (order=1)
  - 4 timed exam tasks (English, Math, Reading, Science — 10 MCQ each)
  - 40 original ACT-style questions
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

PLACEHOLDER_URL = 'https://www.youtube.com/watch?v=placeholder'

# ── Diagnostic questions ───────────────────────────────────────────────────────
# Each question: (prompt, options_list, correct_answer)

ENGLISH_QUESTIONS = [
    (
        "Read the sentence: 'The committee, along with several volunteers, [are/is] preparing the final report.' Which verb form is correct?",
        ["are", "is", "were", "have been"],
        "is"
    ),
    (
        "Which of the following correctly uses a comma?\nA) The dog barked loudly, and ran across the yard.\nB) After the rain stopped, the children went outside.\nC) She bought milk, and eggs at the store.\nD) He studied hard, but failed the exam.",
        ["A) The dog barked loudly, and ran across the yard.", "B) After the rain stopped, the children went outside.", "C) She bought milk, and eggs at the store.", "D) He studied hard, but failed the exam."],
        "B) After the rain stopped, the children went outside."
    ),
    (
        "Choose the option that eliminates redundancy: 'The new innovation in technology was a surprise to everyone.'",
        ["The new innovation was a surprise to everyone.", "The innovation in technology was a surprise to everyone.", "The technological innovation surprised everyone.", "The new technological surprise was innovative."],
        "The innovation in technology was a surprise to everyone."
    ),
    (
        "Which sentence uses an apostrophe correctly?",
        ["The dog wagged it's tail.", "The managers office is down the hall.", "The childrens' coats were left at school.", "The manager's report was thorough."],
        "The manager's report was thorough."
    ),
    (
        "Identify the sentence with a dangling modifier:\nA) Walking down the street, she admired the historic buildings.\nB) After studying all night, Maria passed the exam.\nC) Covered in mud, the children ran inside.\nD) Having finished the report, the deadline was met.",
        ["A) Walking down the street, she admired the historic buildings.", "B) After studying all night, Maria passed the exam.", "C) Covered in mud, the children ran inside.", "D) Having finished the report, the deadline was met."],
        "D) Having finished the report, the deadline was met."
    ),
    (
        "Which transition best connects these sentences? 'The study participants were exhausted. _____, they completed every task.'",
        ["Therefore", "Nevertheless", "Furthermore", "Similarly"],
        "Nevertheless"
    ),
    (
        "Choose the correctly punctuated sentence:",
        ["She has three goals: to graduate, to travel, and to write a novel.", "She has three goals: to graduate; to travel; and to write a novel.", "She has three goals, to graduate, to travel, and to write a novel.", "She has three goals — to graduate to travel and to write a novel."],
        "She has three goals: to graduate, to travel, and to write a novel."
    ),
    (
        "Which option maintains parallel structure? 'The coach told the players to practice daily, _____.'",
        ["that they should stay hydrated, and sleeping enough", "to stay hydrated, and to sleep enough", "staying hydrated, and that they should sleep enough", "hydration and sleep were important"],
        "to stay hydrated, and to sleep enough"
    ),
    (
        "Read this passage excerpt: 'The artist was known for her bold colors and her careful, precise use of negative space.' Which word is most nearly opposite in meaning to 'precise' as used here?",
        ["exact", "careful", "haphazard", "deliberate"],
        "haphazard"
    ),
    (
        "Which of the following is a sentence fragment?",
        ["Run as fast as you can.", "The tall tree with the broken branch.", "She smiled and waved.", "Dogs bark; cats meow."],
        "The tall tree with the broken branch."
    ),
]

MATH_QUESTIONS = [
    (
        "The sum of three consecutive odd integers is 81. What is the greatest of the three?",
        ["25", "27", "29", "31"],
        "29"
    ),
    (
        "A store raises all prices by 20%, then runs a 20%-off sale on the new prices. What is the net effect on the original price?",
        ["4% decrease", "0% change", "4% increase", "20% increase"],
        "4% decrease"
    ),
    (
        "What are the solutions to x² - 5x + 6 = 0?",
        ["x = 1 and x = 6", "x = 2 and x = 3", "x = -2 and x = -3", "x = -1 and x = 6"],
        "x = 2 and x = 3"
    ),
    (
        "A right circular cylinder has a radius of 3 cm and a height of 8 cm. What is its volume in terms of π?",
        ["24π cm³", "48π cm³", "72π cm³", "96π cm³"],
        "72π cm³"
    ),
    (
        "If f(x) = 2x² - 3x + 1, what is f(4)?",
        ["17", "21", "25", "29"],
        "21"
    ),
    (
        "Solve the system: x + y = 10 and x - y = 4. What is x?",
        ["3", "5", "7", "6"],
        "7"
    ),
    (
        "Simplify: (x³ · x⁴) / x²",
        ["x⁵", "x⁹", "x⁻³", "x¹²"],
        "x⁵"
    ),
    (
        "In how many ways can a committee of 3 students be chosen from a group of 7?",
        ["21", "28", "35", "42"],
        "35"
    ),
    (
        "Line m has the equation 4x − 2y = 8. What is the slope of a line perpendicular to line m?",
        ["-2", "-1/2", "1/2", "2"],
        "-1/2"
    ),
    (
        "In a right triangle, one leg is 8 and the hypotenuse is 10. What is the length of the other leg?",
        ["4", "6", "7", "9"],
        "6"
    ),
]

# Reading passage + questions
READING_PASSAGE = """The following passage is adapted from a 2018 article on urban farming.

   In the early twentieth century, city planners largely dismissed agriculture as incompatible with urban life.
Farms belonged in the countryside; cities were for industry, commerce, and housing. Yet this strict separation
has been eroding steadily. Community gardens began appearing in vacant lots during the 1970s energy crisis,
and by the 1990s, rooftop greenhouses were a novelty fixture in dense neighborhoods. Today, urban farms
range from hydroponic warehouses producing leafy greens for local restaurants to backyard plots that supply
entire blocks with summer tomatoes.
   Proponents argue that urban agriculture closes the gap between producer and consumer, reducing the carbon
footprint of food transportation while building community ties. Critics counter that urban land is too
expensive and too limited to make farming economically viable at scale. A single acre in Manhattan, they
note, costs hundreds of times more than the same land in rural Iowa.
   The most ambitious projects are attempting to sidestep the land-cost problem entirely. Vertical farms —
multi-story buildings devoted to stacked growing trays illuminated by LED lights — can produce the equivalent
of hundreds of acres of yield in a single city block. Proponents call this the future of food; skeptics point
to energy costs and argue that sunlight, for now, remains unbeaten."""

P = f"PASSAGE (Urban Farming):\n\n{READING_PASSAGE}\n\n"

READING_QUESTIONS = [
    (
        P + "According to the passage, what was the dominant view of early twentieth-century city planners regarding agriculture?",
        ["Agriculture should be integrated into urban housing.", "Farms and cities occupied distinct, separate spheres.", "Urban farms were a vital part of industrial economies.", "Community gardens were encouraged during energy crises."],
        "Farms and cities occupied distinct, separate spheres."
    ),
    (
        P + "The word 'eroding' in the second sentence of the first paragraph most nearly means:",
        ["strengthening", "weakening", "expanding", "formalizing"],
        "weakening"
    ),
    (
        P + "According to the passage, community gardens first emerged in urban areas during:",
        ["the early twentieth century", "the 1970s", "the 1990s", "the 2000s"],
        "the 1970s"
    ),
    (
        P + "Which of the following best describes the structure of the second paragraph?",
        ["A single argument is presented and supported with evidence.", "A claim is introduced, and opposing views are presented.", "Two equivalent solutions to a problem are compared.", "Historical background leads to a modern conclusion."],
        "A claim is introduced, and opposing views are presented."
    ),
    (
        P + "Critics of urban agriculture primarily base their objection on:",
        ["environmental concerns about LED lighting", "the carbon footprint of transporting food", "the high cost and scarcity of urban land", "a lack of consumer demand for local produce"],
        "the high cost and scarcity of urban land"
    ),
    (
        P + "The author's mention of 'a single acre in Manhattan' serves primarily to:",
        ["prove that urban farming is completely infeasible", "illustrate the scale of the land-cost challenge", "argue that vertical farms are the only solution", "compare rural and urban lifestyles"],
        "illustrate the scale of the land-cost challenge"
    ),
    (
        P + "What do vertical farms do to address critics' concerns?",
        ["They rely on traditional sunlight instead of electricity.", "They reduce the carbon footprint of food transportation.", "They produce large yields without requiring extensive ground-level land.", "They partner with rural farms to reduce overall land costs."],
        "They produce large yields without requiring extensive ground-level land."
    ),
    (
        P + "Which of the following best describes the author's overall tone toward urban farming?",
        ["Strongly enthusiastic", "Completely dismissive", "Balanced and informative", "Alarmed and cautionary"],
        "Balanced and informative"
    ),
    (
        P + "The phrase 'sunlight, for now, remains unbeaten' suggests that skeptics of vertical farms believe:",
        ["vertical farms will never be economically viable", "natural growing methods are currently superior but may not remain so", "LED lighting technology is fundamentally flawed", "urban farms should return to traditional outdoor growing"],
        "natural growing methods are currently superior but may not remain so"
    ),
    (
        P + "Based on the passage, which of the following would most weaken the critics' argument against urban farming?",
        ["A study showing that urban consumers prefer locally grown food", "A breakthrough that dramatically reduces the cost of urban land", "Research showing that vertical farms use less energy than expected", "Data indicating that rural farms produce higher crop yields"],
        "A breakthrough that dramatically reduces the cost of urban land"
    ),
]

# Science passage + questions
SCIENCE_TABLE = """Experiment: Effect of Light Color on Radish Seedling Growth

A researcher grew radish seedlings under five light conditions for 14 days.
All other variables (temperature 22°C, watering schedule, soil type) were held constant.
Seeds were planted in identical pots with 10 seeds per pot; the experiment was run in triplicate.

| Light Condition   | Avg. Stem Height (cm) | Avg. Leaf Width (mm) | Germination Rate (%) |
|-------------------|-----------------------|----------------------|----------------------|
| Full Spectrum     | 8.4                   | 12.1                 | 95                   |
| Red Light Only    | 10.2                  | 9.8                  | 88                   |
| Blue Light Only   | 6.1                   | 14.3                 | 91                   |
| Green Light Only  | 3.9                   | 7.2                  | 72                   |
| Darkness          | 13.7                  | 3.1                  | 65                   |"""

SCIENCE_QUESTIONS = [
    (
        f"[Science: radish seedling experiment]\n{SCIENCE_TABLE}\n\nWhich light condition produced the tallest average stem height?",
        ["Full Spectrum", "Red Light Only", "Blue Light Only", "Darkness"],
        "Darkness"
    ),
    (
        f"[Science: radish seedling experiment] Which light condition resulted in the widest average leaf width?",
        ["Full Spectrum", "Red Light Only", "Blue Light Only", "Green Light Only"],
        "Blue Light Only"
    ),
    (
        f"[Science: radish seedling experiment] What was the germination rate under Full Spectrum light?",
        ["65%", "72%", "88%", "95%"],
        "95%"
    ),
    (
        f"[Science: radish seedling experiment] Based on the data, which variable appears to have an inverse relationship with stem height?",
        ["Temperature", "Germination rate", "Leaf width", "Watering schedule"],
        "Leaf width"
    ),
    (
        f"[Science: radish seedling experiment] The high stem height under darkness is best explained by which biological process?",
        ["Photosynthesis increasing under low light", "Etiolation — seedlings stretch toward light sources", "Root growth being redirected to stem growth", "Chlorophyll production increasing in darkness"],
        "Etiolation — seedlings stretch toward light sources"
    ),
    (
        f"[Science: radish seedling experiment] A student hypothesizes that 'greater light intensity leads to higher germination rates.' Does the data support this hypothesis?",
        ["Yes, because Full Spectrum had the highest germination rate.", "No, because darkness had the highest stem height.", "Partially, because Blue Light had a higher rate than Green Light but lower than Full Spectrum.", "The data does not address light intensity, only light color."],
        "The data does not address light intensity, only light color."
    ),
    (
        f"[Science: radish seedling experiment] Which controlled variable helps ensure the experiment's results are due to light color and not other factors?",
        ["The use of identical seed types", "The constant temperature of 22°C", "Both of the above", "Neither of the above"],
        "Both of the above"
    ),
    (
        f"[Science: radish seedling experiment] If a researcher wanted to determine whether the stem height differences were statistically significant, what would be the most appropriate next step?",
        ["Repeat the experiment with different soil types", "Apply a statistical test to the triplicate results", "Increase the number of light conditions tested", "Measure stem height at day 7 instead of day 14"],
        "Apply a statistical test to the triplicate results"
    ),
    (
        f"[Science: radish seedling experiment] Based on the table, which light condition would you recommend if the goal is to maximize leaf production?",
        ["Full Spectrum", "Red Light Only", "Blue Light Only", "Green Light Only"],
        "Blue Light Only"
    ),
    (
        f"[Science: radish seedling experiment] The experiment was 'run in triplicate.' What is the primary purpose of this design choice?",
        ["To test three different soil types simultaneously", "To increase reliability by reducing the effect of random variation", "To compare results from three different researchers", "To grow three different plant species at once"],
        "To increase reliability by reducing the effect of random variation"
    ),
]

# ── Tasks config ───────────────────────────────────────────────────────────────
DIAGNOSTIC_TASKS = [
    {
        'title': 'English Diagnostic',
        'timed_mode': 'exam',
        'time_limit_seconds': 8 * 60,
        'order': 1,
        'questions': ENGLISH_QUESTIONS,
    },
    {
        'title': 'Math Diagnostic',
        'timed_mode': 'exam',
        'time_limit_seconds': 11 * 60,
        'order': 2,
        'questions': MATH_QUESTIONS,
    },
    {
        'title': 'Reading Diagnostic',
        'timed_mode': 'exam',
        'time_limit_seconds': 9 * 60,
        'order': 3,
        'questions': READING_QUESTIONS,
    },
    {
        'title': 'Science Diagnostic',
        'timed_mode': 'exam',
        'time_limit_seconds': 8 * 60,
        'order': 4,
        'questions': SCIENCE_QUESTIONS,
    },
]

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    # 1. Find the ACT Test Prep course
    print('Looking up ACT Test Prep course...')
    courses = rest('GET', 'courses', params={'title': 'eq.ACT Test Prep', 'select': 'id,title'})
    if not courses:
        print('ERROR: ACT Test Prep course not found. Run seed_act_curriculum.py first.')
        sys.exit(1)
    course_id = courses[0]['id']
    print(f'  Course: {course_id}')

    # 2. Check if diagnostic module already exists
    existing_modules = rest('GET', 'modules', params={
        'course_id': f'eq.{course_id}',
        'title': 'eq.Diagnostic Assessment',
        'select': 'id,title'
    })
    if existing_modules:
        print(f'Diagnostic Assessment module already exists (id={existing_modules[0]["id"]}). Skipping.')
        return

    # 3. Create "Diagnostic Assessment" module at order=0
    print('Creating Diagnostic Assessment module (order=0)...')
    module = rest('POST', 'modules', data={
        'course_id': course_id,
        'title': 'Diagnostic Assessment',
        'description': 'Establish your ACT baseline before starting the curriculum. Complete all four sections to receive an estimated starting score.',
        'order': 0,
    })
    module_id = module[0]['id']
    print(f'  Module created: {module_id}')

    # 4. Create lesson
    print('Creating ACT Diagnostic lesson...')
    lesson = rest('POST', 'lessons', data={
        'module_id': module_id,
        'title': 'ACT Diagnostic',
        'description': 'Complete all four timed diagnostic sections to establish your baseline ACT score estimate.',
        'youtube_url': PLACEHOLDER_URL,
        'order': 1,
    })
    lesson_id = lesson[0]['id']
    print(f'  Lesson created: {lesson_id}')

    # 5. Create tasks and questions
    total_questions = 0
    for task_data in DIAGNOSTIC_TASKS:
        print(f'Creating task: {task_data["title"]}...')
        task = rest('POST', 'tasks', data={
            'lesson_id': lesson_id,
            'title': task_data['title'],
            'type': 'quiz',
            'instructions': f'Answer all 10 questions. This is a timed exam section — you will have {task_data["time_limit_seconds"] // 60} minutes (standard time). Each question is worth 10 points.',
            'order': task_data['order'],
            'timed_mode': task_data['timed_mode'],
            'time_limit_seconds': task_data['time_limit_seconds'],
        })
        task_id = task[0]['id']

        for q_prompt, q_options, q_correct in task_data['questions']:
            rest('POST', 'questions', data={
                'task_id': task_id,
                'prompt': q_prompt,
                'type': 'mcq',
                'options': q_options,
                'correct_answer': q_correct,
                'points': 10,
            })
            total_questions += 1

        print(f'  Task created: {task_id} — {len(task_data["questions"])} questions')

    print(f'\nDone! Created 1 module, 1 lesson, {len(DIAGNOSTIC_TASKS)} tasks, {total_questions} questions.')
    print(f'Students will see the Diagnostic Assessment module first (order=0) when enrolled in ACT Test Prep.')

if __name__ == '__main__':
    main()

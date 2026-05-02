"""
import_questions.py

Reads ACT question markdown files from the Obsidian author vault and imports
them into the EDDIFY Supabase database.

Usage:
    python import_questions.py <path-to-markdown-file>
    python import_questions.py --all        # imports all files in the questions folder
    python import_questions.py --list       # lists all lessons to help set lesson_id

The markdown file's front matter must include a `lesson_id` field (UUID).
If it doesn't, the script will list available lessons and exit.

Workflow:
  1. Author creates questions in Obsidian (questions/ folder)
  2. Author adds `lesson_id: <uuid>` to the front matter
  3. Run this script — it creates a quiz task on that lesson if needed, then inserts all questions
"""

import json
import random
import re
import subprocess
import sys
import time
import uuid
from pathlib import Path

# Import diagram generator (optional — only used when diagram blocks are present)
try:
    import sys as _sys
    _sys.path.insert(0, str(Path(__file__).parent))
    from generate_diagrams import extract_diagram_blocks, generate_svg, upload_svg, get_env as _get_env
    _DIAGRAMS_AVAILABLE = True
except ImportError:
    _DIAGRAMS_AVAILABLE = False

# ── Usage ──────────────────────────────────────────────────────────────────────
__doc__ = """
import_questions.py

Reads ACT question markdown files from the Obsidian author vault and imports
them into the EDDIFY Supabase database.

Usage:
    python import_questions.py <path-to-markdown-file>
    python import_questions.py --all              # imports all files in questions/
    python import_questions.py --all --overwrite  # deletes & re-imports all questions
    python import_questions.py --list             # lists all lessons to help set lesson_id
"""

# ── Config ─────────────────────────────────────────────────────────────────────
QUESTIONS_DIR = Path("C:/Users/edkih/OneDrive/Documents/AI-Projects/Obsidian/ACT-Author/wiki/questions")
SUPABASE_URL  = "https://api.supabase.com/v1/projects/jltkdbsbrnwrqxouhpgu/database/query"
ENV_FILE      = Path(__file__).parent.parent / "learning-platform" / ".env.local"

# ── Helpers ────────────────────────────────────────────────────────────────────
def get_token():
    for line in ENV_FILE.read_text().splitlines():
        if line.startswith("SUPABASE_MANAGEMENT_TOKEN="):
            return line.split("=", 1)[1].strip()
    raise ValueError("SUPABASE_MANAGEMENT_TOKEN not found in .env.local")

def query(sql, token):
    payload = json.dumps({"query": sql})
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", SUPABASE_URL,
         "-H", f"Authorization: Bearer {token}",
         "-H", "Content-Type: application/json",
         "-d", payload],
        capture_output=True, text=True, encoding="utf-8"
    )
    data = json.loads(result.stdout)
    if isinstance(data, dict) and "message" in data:
        raise RuntimeError(f"SQL error: {data['message']}")
    time.sleep(1.2)
    return data

def escape_sql(s):
    """Escape single quotes for SQL string literals."""
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"

# ── Front matter parser ────────────────────────────────────────────────────────
def parse_front_matter(text):
    match = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not match:
        return {}
    meta = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            meta[key.strip()] = val.strip().strip('"')
    return meta

# ── Passage parser ────────────────────────────────────────────────────────────
def parse_passage(text):
    """
    Extract the passage from a markdown file.

    Format 1 — English/Reading: has '## PASSAGE: Title' heading.
      Captures text from the heading to the next '---' or '## Q' block.

    Format 2 — Science: has '# Passage: Title' heading (H1).
      Captures everything from the H1 heading to the first '## Q' block.
      Figure code blocks are replaced with their ASCII fallback art (<pre>).
      Markdown tables are converted to HTML.

    Returns (title, body) or (None, None) if no passage is found.
    The returned body does NOT include the title heading.
    """
    # Strip front matter
    body = re.sub(r"^---\n.*?\n---\n", "", text, flags=re.DOTALL)

    # ── Format 1: ## PASSAGE: Title (English/Reading) ────────────────────────────
    m = re.search(r"^## PASSAGE:\s*(.+)$", body, re.MULTILINE)
    if m:
        title = m.group(1).strip()
        # Strip italic subtitle like *(Original excerpt — Literary Narrative)*
        title = re.sub(r"\*.*?\*", "", title).strip()

        after_heading = body[m.end():]
        # Strip optional italic subtitle line
        after_heading = re.sub(r"^\s*\*[^\n]*\*\s*\n", "", after_heading)

        # Capture up to next --- or ## Q block
        end = re.search(r"\n---\s*\n|\n## Q\d+:", after_heading)
        passage_body = after_heading[:end.start()].strip() if end else after_heading.strip()
        return title, passage_body

    # ── Format 2: Science — '# Passage: Title' heading ───────────────────────────
    h1 = re.search(r"^#\s+(?:Passage|PASSAGE):\s*(.+)$", body, re.MULTILINE)
    q_start = re.search(r"\n## Q\d+:", body)
    if not q_start:
        return None, None

    if h1:
        title = h1.group(1).strip()
        raw = body[h1.end():q_start.start()].strip()
    else:
        title = None
        raw = body[:q_start.start()].strip()
        if len(raw) < 100:
            return None, None

    # Replace figure blocks + following ASCII_FALLBACK comment with <pre> ASCII art
    def figure_to_pre(m_fig):
        ascii_text = (m_fig.group(1) or "").strip()
        return (f"\n<pre>{ascii_text}</pre>\n") if ascii_text else ""

    raw = re.sub(
        r"```figure\n[\s\S]*?```\n+<!--\s*ASCII_FALLBACK:[^\n]*\n([\s\S]*?)-->",
        figure_to_pre,
        raw
    )
    # Strip remaining figure blocks (no ASCII fallback)
    raw = re.sub(r"```figure\n[\s\S]*?```", "", raw)
    # Strip remaining HTML comments
    raw = re.sub(r"<!--[\s\S]*?-->", "", raw)
    # Strip blockquote lines (> IMPORT NOTE etc.)
    raw = re.sub(r"^(>.*\n)+", "", raw.lstrip())
    # Replace --- horizontal rules with blank lines
    raw = re.sub(r"\n---\s*\n", "\n\n", raw)
    # Convert **bold** to <strong>
    raw = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", raw)
    # Convert markdown tables to HTML
    raw = _convert_md_tables_to_html(raw)
    # Clean up excessive blank lines
    raw = re.sub(r"\n{3,}", "\n\n", raw).strip()

    return title, raw


# ── Markdown table → HTML converter ───────────────────────────────────────────
def _convert_md_tables_to_html(text):
    """
    Convert markdown pipe tables to HTML <table> elements.
    Handles tables with header rows (separated by |---|---| divider lines).
    """
    lines = text.split("\n")
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Detect a markdown table row: starts and ends with | (after strip)
        if re.match(r"^\s*\|.+\|", line):
            table_lines = []
            while i < len(lines) and re.match(r"^\s*\|.+\|", lines[i]):
                table_lines.append(lines[i].strip())
                i += 1
            # Identify the separator row (e.g. |---|---|)
            sep_idx = None
            for j, tl in enumerate(table_lines):
                if re.match(r"^\|[-| :]+\|$", tl):
                    sep_idx = j
                    break
            html_rows = []
            if sep_idx is not None:
                # Header rows (before separator)
                for tl in table_lines[:sep_idx]:
                    cells = [c.strip() for c in tl.strip("|").split("|")]
                    html_rows.append("<tr>" + "".join(f"<th>{c}</th>" for c in cells) + "</tr>")
                # Data rows (after separator)
                for tl in table_lines[sep_idx + 1:]:
                    cells = [c.strip() for c in tl.strip("|").split("|")]
                    html_rows.append("<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>")
            else:
                # No header separator — all rows are data rows
                for tl in table_lines:
                    cells = [c.strip() for c in tl.strip("|").split("|")]
                    html_rows.append("<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>")
            result.append("<table>" + "".join(html_rows) + "</table>")
        else:
            result.append(line)
            i += 1
    return "\n".join(result)


# ── Question parser ────────────────────────────────────────────────────────────
def parse_questions(text):
    """
    Parse all Q# blocks from the markdown.
    Returns a list of dicts with keys:
      title, difficulty, skill, prompt, options, correct_answer, hint, explanation, author_note
    """
    # Strip front matter
    text = re.sub(r"^---\n.*?\n---\n", "", text, flags=re.DOTALL)

    # Split on question headers: ## Q1:, ## Q2:, etc.
    blocks = re.split(r"\n## Q\d+:", text)
    blocks = [b.strip() for b in blocks if b.strip()]

    questions = []
    for block in blocks:
        # Skip any block that isn't actually a question (e.g. the intro header)
        if "**Difficulty**:" not in block:
            continue
        q = {}

        # Title is the first line
        lines = block.splitlines()
        q["title"] = lines[0].strip()

        # Difficulty
        m = re.search(r"\*\*Difficulty\*\*:\s*(.+)", block)
        q["difficulty"] = m.group(1).strip() if m else None

        # Skill
        m = re.search(r"\*\*Skill\*\*:\s*(.+)", block)
        q["skill"] = m.group(1).strip() if m else None

        # Answer — use the LAST **Answer**: [A-D] in the block (handles author revisions)
        all_answers = re.findall(r"\*\*Answer\*\*:\s*([A-D])", block)
        q["correct_answer_letter"] = all_answers[-1].strip() if all_answers else None

        # Hint — short 1-2 sentence hint authored alongside the question
        m = re.search(r"\*\*Hint\*\*:\s*(.*?)(?=\*\*Explanation\*\*|\*\*Author Note\*\*|---|$)", block, re.DOTALL)
        q["hint"] = m.group(1).strip() if m else None

        # Explanation — use the LAST **Explanation** block (handles author revisions)
        all_explanations = list(re.finditer(r"\*\*Explanation\*\*:\s*(.*?)(?=\*\*Author Note\*\*|\*\*Answer\*\*|---|$)", block, re.DOTALL))
        q["explanation"] = all_explanations[-1].group(1).strip() if all_explanations else None

        # Author Note
        m = re.search(r"\*\*Author Note\*\*:\s*(.*?)(?=---|$)", block, re.DOTALL)
        q["author_note"] = m.group(1).strip() if m else None

        # Options — parse only the FINAL A-B-C-D block that appears before **Answer**:
        # This handles source files where the author revised options inline (draft + final sets)
        # and prevents options embedded inside **Explanation** text from being captured.
        answer_marker = re.search(r"\n\*\*Answer\*\*:", block)
        if answer_marker:
            options_region = block[:answer_marker.start()]
        else:
            options_region = block

        option_pattern = re.compile(r"^([A-D])\)\s*(.+)$", re.MULTILINE)
        all_opts = option_pattern.findall(options_region)

        # If there are more than 4 options (due to multiple ABCD sets in the source),
        # take only the LAST complete A-B-C-D block (the author's final revision).
        if len(all_opts) > 4:
            # Walk backwards through all_opts collecting the last complete ABCD set
            last_block = {}
            for letter, text in reversed(all_opts):
                if letter not in last_block:
                    last_block[letter] = text
                if set(last_block.keys()) == {"A", "B", "C", "D"}:
                    break
            # Reconstruct in correct order
            all_opts = [(l, last_block[l]) for l in ("A", "B", "C", "D") if l in last_block]

        # Store as ["A) text", "B) text", ...] to match grading API exact-match logic
        q["options"] = [f"{letter}) {text.strip()}" for letter, text in all_opts]
        q["options_map"] = {letter: f"{letter}) {text.strip()}" for letter, text in all_opts}

        # Prompt — everything between the Skill line and the first option line
        # We want: passage context + question stem
        skill_end = re.search(r"\*\*Skill\*\*:.+\n", block)
        first_opt = re.search(r"^A\)", options_region, re.MULTILINE)
        # If there are multiple ABCD blocks, use the last one's start position for prompt end
        if len(option_pattern.findall(options_region)) > 4:
            # Find the start of the last A) in the options region
            last_a_match = None
            for m in re.finditer(r"^A\)", options_region, re.MULTILINE):
                last_a_match = m
            first_opt = last_a_match
        if skill_end and first_opt:
            prompt_raw = block[skill_end.end():first_opt.start()].strip()
            # Convert **bold** markers → <u> (standard format going forward)
            prompt_raw = re.sub(r"\*\*(.+?)\*\*", r"<u>\1</u>", prompt_raw, flags=re.DOTALL)
            # Convert [square bracket] markers → <u> (legacy format — treated identically)
            # Use negative lookahead/lookbehind to skip [[wikilinks]]
            prompt_raw = re.sub(r"(?<!\[)\[([^\[\]]+)\](?!\])", r"<u>\1</u>", prompt_raw)
            # Convert markdown tables to HTML tables
            prompt_raw = _convert_md_tables_to_html(prompt_raw)
            q["prompt"] = prompt_raw
        else:
            q["prompt"] = q["title"]

        # Resolve correct_answer to full option text
        letter = q.get("correct_answer_letter")
        q["correct_answer"] = q["options_map"].get(letter, letter) if letter else None

        questions.append(q)

    return questions

# ── Option scrambler ──────────────────────────────────────────────────────────
def scramble_bcd(q):
    """Keep option A fixed; shuffle B, C, D. Updates correct_answer to match new labels."""
    if len(q["options"]) != 4:
        return q

    def text_of(opt):
        return opt.split(") ", 1)[1] if ") " in opt else opt

    a_opt = q["options"][0]
    bcd_texts = [text_of(o) for o in q["options"][1:]]
    correct_text = text_of(q["correct_answer"]) if q["correct_answer"] else None

    random.shuffle(bcd_texts)

    new_options = [a_opt]
    for letter, val in zip(["B", "C", "D"], bcd_texts):
        new_options.append(f"{letter}) {val}")

    q["options"] = new_options
    q["options_map"] = {o.split(")")[0]: o for o in new_options}

    if correct_text:
        for opt in new_options:
            if text_of(opt) == correct_text:
                q["correct_answer"] = opt
                break

    return q


# ── List lessons helper ────────────────────────────────────────────────────────
def list_lessons(token):
    rows = query(
        "SELECT l.id, l.title as lesson, m.title as module, c.title as course "
        "FROM lessons l "
        "JOIN modules m ON m.id = l.module_id "
        "JOIN courses c ON c.id = m.course_id "
        "ORDER BY c.title, m.\"order\", l.\"order\";",
        token
    )
    print(f"\n{'ID':<38} {'Course':<18} {'Module':<40} {'Lesson'}")
    print("-" * 120)
    for r in rows:
        print(f"{r['id']:<38} {r['course']:<18} {r['module']:<40} {r['lesson']}")

# ── Get or create quiz task ────────────────────────────────────────────────────
def get_or_create_task(lesson_id, task_title, token, passage_body=None):
    """
    Returns an existing quiz task on the lesson, or creates a new one.
    task_title: e.g. "Comma Usage — Practice Questions"
    passage_body: if provided, stored in content_body (reading passages).
    """
    rows = query(
        f"SELECT id FROM tasks WHERE lesson_id = '{lesson_id}' AND title = {escape_sql(task_title)} AND type = 'quiz';",
        token
    )
    if rows:
        task_id = rows[0]["id"]
        print(f"  -> Using existing task: {task_id}")
        if passage_body:
            query(
                f"UPDATE tasks SET content_body = {escape_sql(passage_body)} WHERE id = '{task_id}';",
                token
            )
            print(f"  -> Updated passage in content_body")
        return task_id

    # Create it
    new_id = str(uuid.uuid4())
    query(
        f"INSERT INTO tasks (id, lesson_id, title, type, \"order\", content_body) "
        f"VALUES ('{new_id}', '{lesson_id}', {escape_sql(task_title)}, 'quiz', 1, {escape_sql(passage_body)});",
        token
    )
    print(f"  -> Created new task: {new_id}")
    return new_id

# ── Check for duplicate ────────────────────────────────────────────────────────
def question_exists(task_id, skill, difficulty, token):
    rows = query(
        f"SELECT id FROM questions WHERE task_id = '{task_id}' "
        f"AND skill = {escape_sql(skill)} AND difficulty = {escape_sql(difficulty)};",
        token
    )
    return len(rows) > 0

def delete_task_questions(task_id, token):
    """Delete all questions under a task (used by --overwrite)."""
    query(f"DELETE FROM questions WHERE task_id = '{task_id}';", token)

# ── Import a single file ───────────────────────────────────────────────────────
def import_file(filepath, token, overwrite=False):
    filepath = Path(filepath)
    print(f"\nImporting: {filepath.name}{' (overwrite)' if overwrite else ''}")

    text = filepath.read_text(encoding="utf-8")
    meta = parse_front_matter(text)

    lesson_id = meta.get("lesson_id")
    if not lesson_id:
        print(f"  X No lesson_id in front matter. Run with --list to find the right lesson UUID.")
        print(f"    Then add 'lesson_id: <uuid>' to the front matter of {filepath.name}")
        return 0

    section = meta.get("section", "")
    topic   = meta.get("topic", "")
    task_title = f"{section.title()} - {topic.title()} Practice Questions"

    # Math and English never use the split-screen passage panel.
    # English rule text is captured separately and used as a hint fallback instead.
    rule_hint = None
    if section.lower() in ("math", "english"):
        passage_title, passage_body = None, None
        if section.lower() == "english":
            _, rule_body = parse_passage(text)
            rule_hint = rule_body  # may be None if no rule block in file
    else:
        passage_title, passage_body = parse_passage(text)
    # Store as "## PASSAGE: Title\n\nbody" so the task page can extract the title
    if passage_title and passage_body:
        stored_passage = f"## PASSAGE: {passage_title}\n\n{passage_body}"
    elif passage_body:
        stored_passage = passage_body
    else:
        stored_passage = None

    print(f"  lesson_id : {lesson_id}")
    print(f"  task      : {task_title}")
    if passage_title:
        print(f"  passage   : {passage_title}")
    if rule_hint:
        print(f"  rule hint : (will be applied to questions without a hint)")

    try:
        task_id = get_or_create_task(lesson_id, task_title, token, passage_body=stored_passage)
    except RuntimeError as e:
        if "23503" in str(e) or "not present in table" in str(e):
            print(f"  SKIPPED: lesson_id {lesson_id} not found in lessons table.")
            print(f"    Run --list to find the correct UUID and update the front matter.")
            return 0
        raise

    if overwrite:
        delete_task_questions(task_id, token)
        print(f"  -> Cleared existing questions for overwrite")

    questions = parse_questions(text)
    print(f"  questions : {len(questions)} found")

    if section.lower() == "english":
        for q in questions:
            if not q.get("hint") and rule_hint:
                q["hint"] = rule_hint
        questions = [scramble_bcd(q) for q in questions]

    # Pre-parse diagram blocks (keyed by question number)
    diagram_map = {}
    if _DIAGRAMS_AVAILABLE:
        for q_num, spec in extract_diagram_blocks(text):
            diagram_map[q_num] = spec
        if diagram_map:
            print(f"  diagrams  : {len(diagram_map)} found (Q{', Q'.join(str(k) for k in sorted(diagram_map))})")
            _env = _get_env()

    imported = 0
    skipped  = 0
    # Track inserted question IDs by position (1-based) for diagram patching
    inserted_ids = {}

    for i, q in enumerate(questions, 1):
        if not overwrite and question_exists(task_id, q["skill"], q["difficulty"], token):
            print(f"    Q{i} [{q['difficulty']}] {q['title'][:50]} - skipped (duplicate)")
            skipped += 1
            continue

        new_id  = str(uuid.uuid4())
        options = json.dumps(q["options"])
        points  = 1

        sql = (
            f"INSERT INTO questions "
            f"(id, task_id, prompt, type, options, correct_answer, points, "
            f" grading_rubric, hint, difficulty, skill, author_note) VALUES ("
            f"'{new_id}', '{task_id}', "
            f"{escape_sql(q['prompt'])}, 'mcq', "
            f"'{options.replace(chr(39), chr(39)+chr(39))}', "
            f"{escape_sql(q['correct_answer'])}, {points}, "
            f"{escape_sql(q['explanation'])}, "
            f"{escape_sql(q['hint'])}, "
            f"{escape_sql(q['difficulty'])}, "
            f"{escape_sql(q['skill'])}, "
            f"{escape_sql(q['author_note'])}"
            f");"
        )
        query(sql, token)
        inserted_ids[i] = new_id
        print(f"    Q{i} [{q['difficulty']}] {q['title'][:50]} - imported")
        imported += 1

        # Generate and upload diagram if present for this question
        if i in diagram_map and _DIAGRAMS_AVAILABLE:
            spec = diagram_map[i]
            dtype = spec.get("type", "?")
            print(f"      -> diagram ({dtype})...", end=" ", flush=True)
            try:
                svg = generate_svg(spec)
                image_url = upload_svg(svg, _env)
                # Patch image_url directly on the just-inserted question
                patch_sql = f"UPDATE questions SET image_url = {escape_sql(image_url)} WHERE id = '{new_id}';"
                query(patch_sql, token)
                print(f"OK ({image_url[-40:]})")
            except Exception as e:
                print(f"FAILED: {e}")

    print(f"\n  Done: {imported} imported, {skipped} skipped.")
    return imported

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    token = get_token()
    args  = sys.argv[1:]

    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return

    overwrite = "--overwrite" in args
    args = [a for a in args if a != "--overwrite"]

    if args[0] == "--list":
        list_lessons(token)
        return

    if args[0] == "--all":
        files = list(QUESTIONS_DIR.glob("*.md"))
        print(f"Found {len(files)} markdown files in {QUESTIONS_DIR}")
        total = 0
        for f in files:
            total += import_file(f, token, overwrite=overwrite)
        print(f"\nTotal imported: {total} questions across {len(files)} files.")
        return

    # Single file
    import_file(args[0], token, overwrite=overwrite)

if __name__ == "__main__":
    main()

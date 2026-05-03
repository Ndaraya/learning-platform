import re, html

def convert_wp_math(text):
    def fix_expr(expr):
        expr = re.sub(r'(?<!\\)%', r'\\%', expr)
        expr = re.sub(r'(?<!\\)\$', r'\\$', expr)
        return expr.strip()
    def repl_bracket(m):
        return '$' + fix_expr(m.group(1)) + '$'
    def repl_dollar(m):
        return '$' + fix_expr(m.group(1)) + '$'
    text = re.sub(r'\[latex\](.*?)\[/latex\]', repl_bracket, text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'\$latex\s+(.*?)(?:\s*&s=\d+)?\s*\$', repl_dollar, text, flags=re.DOTALL)
    return text

cases = [
    ('[latex]270%[/latex] greater than [latex]b[/latex]',
     '$270\\%$ greater than $b$'),
    ('[latex]$5.00[/latex] each',
     '$\\$5.00$ each'),
    (r'$latex \frac{2}{5}&s=3$',
     r'$\frac{2}{5}$'),
    (r'$latex 5\frac {2}{9} &s=1$',
     r'$5\frac {2}{9}$'),
    ('The number [latex]a[/latex] is [latex]110%[/latex] greater',
     'The number $a$ is $110\\%$ greater'),
    ('3 & 22/35  ($latex 3\\frac{22}{35} &s=2$)',
     '3 & 22/35  ($3\\frac{22}{35}$)'),
]

all_pass = True
for inp, expected in cases:
    out = convert_wp_math(inp)
    ok = out == expected
    if not ok:
        all_pass = False
    print(f"{'OK' if ok else 'FAIL'}")
    print(f"  IN:  {inp!r}")
    print(f"  OUT: {out!r}")
    if not ok:
        print(f"  EXP: {expected!r}")
    print()

print('All passed!' if all_pass else 'Some tests FAILED.')

import re

with open('.tmp/debug_course.html', encoding='utf-8') as f:
    html = f.read()

print('course-section__title count:', html.count('course-section__title'))
print('course-section lp-collapse count:', html.count('course-section lp-collapse'))

ids = re.findall(r'data-section-id="(\d+)"', html)
print('data-section-id values:', ids[:5])

idx = html.find('course-section lp-collapse')
if idx >= 0:
    print()
    print('First section raw (500 chars):')
    print(html[idx:idx+600])

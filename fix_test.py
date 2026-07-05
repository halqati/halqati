import re

with open('App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const hasData = editingTest.title?.trim() !== '' || editingTest.description?.trim() !== '';",
    "const hasData = editingTest.name?.trim() !== '';"
)

with open('App.tsx', 'w') as f:
    f.write(content)


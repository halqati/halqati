import re

with open('App.tsx', 'r') as f:
    content = f.read()

# Fix Tests
content = re.sub(
    r'(if \(!activeCircle.draftTest\) \{ \s*const allStudentIds)',
    r'const isExistingDraft = activeCircle.draftTest && (activeCircle.tests || []).some(t => t.id === activeCircle.draftTest!.id);\n                        if (!activeCircle.draftTest || isExistingDraft) {\n                            const allStudentIds',
    content
)

# Fix Plans
content = re.sub(
    r'(if \(!activeCircle.draftPlan\) \{ \s*const allStudentIds)',
    r'const isExistingDraft = activeCircle.draftPlan && (activeCircle.plans || []).some(p => p.id === activeCircle.draftPlan!.id);\n                        if (!activeCircle.draftPlan || isExistingDraft) {\n                            const allStudentIds',
    content
)

# Fix Activities
content = re.sub(
    r'(if \(!activeCircle.draftActivity\) \{ \s*setEditingActivity)',
    r'const isExistingDraft = activeCircle.draftActivity && (activeCircle.activities || []).some(a => a.id === activeCircle.draftActivity!.id);\n                        if (!activeCircle.draftActivity || isExistingDraft) {\n                            setEditingActivity',
    content
)

# Fix Announcements
content = re.sub(
    r'(if \(!activeCircle.draftAnnouncement\) \{ \s*setEditingAnnouncement)',
    r'const isExistingDraft = activeCircle.draftAnnouncement && (activeCircle.announcements || []).some(a => a.id === activeCircle.draftAnnouncement!.id);\n                        if (!activeCircle.draftAnnouncement || isExistingDraft) {\n                            setEditingAnnouncement',
    content
)

with open('App.tsx', 'w') as f:
    f.write(content)


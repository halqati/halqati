import re

with open('App.tsx', 'r') as f:
    content = f.read()

new_switch_circle = r"""    const switchCircle = (id: string) => {
        const newCircleName = appData.circles.find(c => c.id === id)?.circle;
        
        // Force save any open forms BEFORE switching circles
        if (editingSession) handleCloseSessionForm();
        if (editingTest) {
            const hasData = editingTest.title?.trim() !== '' || editingTest.description?.trim() !== '';
            setActiveCircleData(draft => ({...draft, draftTest: hasData ? editingTest : null}), false);
            setEditingTest(null);
        }
        if (editingPlan) {
            const hasData = editingPlan.name?.trim() !== '';
            setActiveCircleData(draft => ({...draft, draftPlan: hasData ? editingPlan : null}), false);
            setEditingPlan(null);
        }
        if (editingActivity) {
            const hasData = editingActivity.name?.trim() !== '';
            setActiveCircleData(draft => ({...draft, draftActivity: hasData ? editingActivity : null}), false);
            setEditingActivity(null);
        }
        if (editingAnnouncement) {
            const hasData = editingAnnouncement.title?.trim() !== '' || editingAnnouncement.content?.trim() !== '';
            setActiveCircleData(draft => ({...draft, draftAnnouncement: hasData ? editingAnnouncement : null}), false);
            setEditingAnnouncement(null);
        }
        
        setTimeout(() => {
            setAppData(d => ({ ...d, activeCircleId: id }));
            if (newCircleName) {
                addToast(`✅ تم الانتقال إلى حلقة '${newCircleName}'`);
            }
        }, 0);
    };"""

content = re.sub(
    r'    const switchCircle = \(id: string\) => \{.*?(?=\s+const handleQuickSwitch =)',
    new_switch_circle + '\n',
    content,
    flags=re.DOTALL
)

with open('App.tsx', 'w') as f:
    f.write(content)


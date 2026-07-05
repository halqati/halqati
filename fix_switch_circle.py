import re

with open('App.tsx', 'r') as f:
    content = f.read()

# Replace switchCircle
old_switch_circle = r"""    const switchCircle = \(id: string\) => \{
        const newCircleName = appData\.circles\.find\(c => c\.id === id\)\?\.circle;
        setAppData\(d => \(\{ \.\.\.d, activeCircleId: id \}\)\);
        // REMOVED: handleNavigate\('home'\);
        if \(newCircleName\) \{
            addToast\(`✅ تم الانتقال إلى حلقة '\$\{newCircleName\}'`\);
        \}
    \};"""

new_switch_circle = r"""    const switchCircle = (id: string) => {
        const newCircleName = appData.circles.find(c => c.id === id)?.circle;
        
        // Force save any open forms BEFORE switching circles
        if (editingSession) {
            handleCloseSessionForm();
        }
        
        // Use a functional update that captures the OLD activeCircleId and updates everything synchronously if needed,
        // Actually, handleCloseSessionForm uses setActiveCircleData which relies on prev.activeCircleId. 
        // If we delay the switch by a tiny bit (setTimeout), handleCloseSessionForm will finish its synchronous state updates first.
        setTimeout(() => {
            setAppData(d => ({ ...d, activeCircleId: id }));
            if (newCircleName) {
                addToast(`✅ تم الانتقال إلى حلقة '${newCircleName}'`);
            }
        }, 0);
    };"""

content = re.sub(old_switch_circle, new_switch_circle, content)

with open('App.tsx', 'w') as f:
    f.write(content)

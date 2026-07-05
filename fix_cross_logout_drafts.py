import re

with open('App.tsx', 'r') as f:
    content = f.read()

# 1. Add useEffect to save drafts to localStorage
save_drafts_effect = r"""    // Save drafts to localStorage to preserve across logouts
    useEffect(() => {
        if (!user || appData.circles.length === 0) return;
        const draftsByCircle: Record<string, any> = {};
        appData.circles.forEach(c => {
            const hasDrafts = c.draftSession || Object.keys(c.sessionDrafts || {}).length > 0 || c.draftTest || c.draftPlan || c.draftActivity || c.draftAnnouncement;
            if (hasDrafts) {
                draftsByCircle[c.id] = {
                    draftSession: c.draftSession,
                    sessionDrafts: c.sessionDrafts,
                    draftTest: c.draftTest,
                    draftPlan: c.draftPlan,
                    draftActivity: c.draftActivity,
                    draftAnnouncement: c.draftAnnouncement
                };
            }
        });
        localStorage.setItem(`tahfeez_drafts_${user.uid}`, JSON.stringify(draftsByCircle));
    }, [appData.circles, user]);"""

# insert it after useEffect for initialising
content = re.sub(
    r'(setIsInitialising\(!appData\.activeCircleId \|\| appData\.circles\.length === 0\);\s*.*?)(?=\s+const setActiveCircleData = useCallback)',
    r'\1\n' + save_drafts_effect + '\n',
    content,
    flags=re.DOTALL
)

# 2. Inject drafts when getting circles from Firestore
# We need to find where Firestore circles are mapped to local state.
# We have a useEffect for "Initial Metadata Sync"
# which does `lastSyncedCircles.current[circleData.id] = circleData;`
# Wait, `loginWithUsername` or `loginWithGoogle` does not fetch circles in `handleLogin`.
# The main useEffect for Initial Metadata Sync handles this!
# `const q = query(collection(db, 'circles'), where('authorizedUserIds', 'array-contains', user.uid));`
# `const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {`
# Inside `setAppData(prev => {` it does `if (existing) { ... } else { const newCircle = { ...circleData, ... } }`

# We need to load drafts and apply them.
new_sync_logic = r"""                            if (existing) {
                                const merged = mergeCircleMetadata(existing, circleData);
                                const normMerged = stripTemporaryFields(deepNormalizeTimestamps(getCircleMetadata(merged)));
                                const normExisting = stripTemporaryFields(deepNormalizeTimestamps(getCircleMetadata(existing)));
                                if (JSON.stringify(normMerged) !== JSON.stringify(normExisting)) {
                                    circlesMap.set(circleData.id, merged);
                                    hasRealChanges = true;
                                    lastLocalState.current[merged.id] = JSON.parse(JSON.stringify(merged));
                                }
                            } else {
                                // Load drafts from local storage if available
                                const storedDraftsRaw = localStorage.getItem(`tahfeez_drafts_${user.uid}`);
                                const storedDrafts = storedDraftsRaw ? JSON.parse(storedDraftsRaw) : {};
                                const circleDrafts = storedDrafts[circleData.id] || {};
                                
                                const newCircle = {
                                    ...circleData,
                                    students: [],
                                    sessions: [],
                                    plans: [],
                                    tests: [],
                                    activities: [],
                                    announcements: [],
                                    studentReports: [],
                                    supervisorReports: [],
                                    draftSession: circleDrafts.draftSession || null,
                                    sessionDrafts: circleDrafts.sessionDrafts || {},
                                    draftTest: circleDrafts.draftTest || null,
                                    draftPlan: circleDrafts.draftPlan || null,
                                    draftActivity: circleDrafts.draftActivity || null,
                                    draftAnnouncement: circleDrafts.draftAnnouncement || null
                                };
                                circlesMap.set(circleData.id, newCircle);"""

content = re.sub(
    r'                            if \(existing\) \{.*?circlesMap\.set\(circleData\.id, newCircle\);',
    new_sync_logic,
    content,
    flags=re.DOTALL
)

with open('App.tsx', 'w') as f:
    f.write(content)

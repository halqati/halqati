
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUsers, FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaCog, FaCheckCircle, FaRegCircle } from 'react-icons/fa';
import { Student } from '../types';
import StudentAvatar from './StudentAvatar';
import { db, collection, doc, setDoc, deleteDoc, onSnapshot } from '../firebase';

interface StudentGroup {
    id: string;
    name: string;
    studentIds: number[];
}

interface StudentGroupSelectorProps {
    students: Student[];
    selectedIds: number[];
    onSelectionChange: (ids: number[]) => void;
    circleId: string | number;
    contextKey: string; // e.g., 'session', 'test', 'plan', 'announcement', 'activity'
}

const StudentGroupSelector: React.FC<StudentGroupSelectorProps> = ({ 
    students, 
    selectedIds, 
    onSelectionChange, 
    circleId,
    contextKey
}) => {
    const [groups, setGroups] = useState<StudentGroup[]>([]);
    const [showManageModal, setShowManageModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupStudentIds, setNewGroupStudentIds] = useState<number[]>([]);
    const [autoSelectEnabled, setAutoSelectEnabled] = useState(false);
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

    // Load auto-select preferences locally (kept per teacher / device)
    useEffect(() => {
        const storedAutoSelect = localStorage.getItem(`studentgroups_autoselect_enabled_${circleId}_${contextKey}`);
        if (storedAutoSelect === 'true') {
            setAutoSelectEnabled(true);
            const storedActiveGroupId = localStorage.getItem(`studentgroups_activegroup_${circleId}_${contextKey}`);
            if (storedActiveGroupId) {
                setActiveGroupId(storedActiveGroupId);
            }
        }
    }, [circleId, contextKey]);

    // Real-time Cloud Sync for Student Groups & Legacy Local Migration
    useEffect(() => {
        if (!circleId) return;

        const circleIdStr = String(circleId);
        let hasMigrated = false;

        // Load local cache as immediate initial fallback
        const storedGroups = localStorage.getItem(`studentgroups_groups_${circleIdStr}`);
        let localGroupsCache: StudentGroup[] = [];
        if (storedGroups) {
            try {
                localGroupsCache = JSON.parse(storedGroups);
                setGroups(localGroupsCache);
            } catch (e) {
                console.error("Failed to parse local student groups", e);
            }
        }

        if (!db) return;

        // Cloud subcollection reference: circles/{circleId}/studentGroups
        const colRef = collection(db, 'circles', circleIdStr, 'studentGroups');

        const unsub = onSnapshot(colRef, async (snapshot) => {
            const remoteGroups: StudentGroup[] = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data && data.name) {
                    remoteGroups.push({
                        id: docSnap.id,
                        name: data.name,
                        studentIds: Array.isArray(data.studentIds) ? data.studentIds : []
                    });
                }
            });

            // Migrate legacy local groups to Firestore if they do not exist remotely yet
            if (!hasMigrated && localGroupsCache.length > 0) {
                hasMigrated = true;
                for (const localG of localGroupsCache) {
                    const existsRemotely = remoteGroups.some(rg => rg.id === localG.id);
                    if (!existsRemotely) {
                        try {
                            const docRef = doc(db, 'circles', circleIdStr, 'studentGroups', localG.id);
                            await setDoc(docRef, {
                                id: localG.id,
                                name: localG.name,
                                studentIds: localG.studentIds,
                                updatedAt: Date.now()
                            }, { merge: true });
                        } catch (e) {
                            console.error("Error migrating local group to cloud:", e);
                        }
                    }
                }
            }

            setGroups(remoteGroups);
            // Cache in localStorage for offline availability
            try {
                localStorage.setItem(`studentgroups_groups_${circleIdStr}`, JSON.stringify(remoteGroups));
            } catch (e) {}
        }, (error) => {
            console.error("Error listening to cloud student groups:", error);
        });

        return () => {
            unsub();
        };
    }, [circleId]);

    // Save auto-select preferences locally
    const saveAutoSelect = (enabled: boolean, groupId: string | null) => {
        setAutoSelectEnabled(enabled);
        setActiveGroupId(groupId);
        localStorage.setItem(`studentgroups_autoselect_enabled_${circleId}_${contextKey}`, enabled ? 'true' : 'false');
        if (groupId) {
            localStorage.setItem(`studentgroups_activegroup_${circleId}_${contextKey}`, groupId);
        } else {
            localStorage.removeItem(`studentgroups_activegroup_${circleId}_${contextKey}`);
        }
    };

    // Auto-select logic on mount or group change
    useEffect(() => {
        if (autoSelectEnabled && activeGroupId) {
            const group = groups.find(g => g.id === activeGroupId);
            if (group) {
                const availableIds = new Set(students.map(s => s.id));
                const validIds = group.studentIds.filter(id => availableIds.has(id));
                
                if (validIds.length > 0) {
                    onSelectionChange(validIds);
                }
            }
        }
    }, [groups, activeGroupId, autoSelectEnabled]);

    const handleGroupClick = (group: StudentGroup) => {
        if (activeGroupId === group.id) {
            // Deselect group
            setActiveGroupId(null);
            if (autoSelectEnabled) {
                saveAutoSelect(true, null);
            }
            onSelectionChange(students.map(s => s.id)); // Default: all
        } else {
            setActiveGroupId(group.id);
            if (autoSelectEnabled) {
                saveAutoSelect(true, group.id);
            }
            onSelectionChange(group.studentIds);
        }
    };

    const handleToggleAutoSelect = () => {
        const newVal = !autoSelectEnabled;
        saveAutoSelect(newVal, newVal ? activeGroupId : null);
    };

    const handleSaveGroup = async () => {
        if (!newGroupName.trim() || newGroupStudentIds.length === 0 || !circleId) return;

        const circleIdStr = String(circleId);
        const groupId = editingGroup ? editingGroup.id : Date.now().toString();
        const groupToSave: StudentGroup = {
            id: groupId,
            name: newGroupName.trim(),
            studentIds: newGroupStudentIds
        };

        // Optimistic local state update
        setGroups(prev => {
            const exists = prev.some(g => g.id === groupId);
            const next = exists ? prev.map(g => g.id === groupId ? groupToSave : g) : [...prev, groupToSave];
            try {
                localStorage.setItem(`studentgroups_groups_${circleIdStr}`, JSON.stringify(next));
            } catch (e) {}
            return next;
        });

        // Sync to Cloud Firestore Database
        if (db) {
            try {
                const docRef = doc(db, 'circles', circleIdStr, 'studentGroups', groupId);
                await setDoc(docRef, {
                    id: groupId,
                    name: groupToSave.name,
                    studentIds: groupToSave.studentIds,
                    updatedAt: Date.now()
                }, { merge: true });
            } catch (e) {
                console.error("Error saving student group to cloud:", e);
            }
        }

        setNewGroupName('');
        setNewGroupStudentIds([]);
        setEditingGroup(null);
        setShowManageModal(false);
    };

    const handleDeleteGroup = async (id: string) => {
        if (!circleId) return;
        const circleIdStr = String(circleId);

        // Optimistic local state update
        setGroups(prev => {
            const next = prev.filter(g => g.id !== id);
            try {
                localStorage.setItem(`studentgroups_groups_${circleIdStr}`, JSON.stringify(next));
            } catch (e) {}
            return next;
        });

        if (activeGroupId === id) {
            setActiveGroupId(null);
            if (autoSelectEnabled) {
                saveAutoSelect(true, null);
            }
        }

        // Remove from Cloud Firestore Database
        if (db) {
            try {
                const docRef = doc(db, 'circles', circleIdStr, 'studentGroups', id);
                await deleteDoc(docRef);
            } catch (e) {
                console.error("Error deleting student group from cloud:", e);
            }
        }
    };

    return (
        <div className="mb-4 space-y-3">
            {/* Header with Management and Auto-select Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={() => setShowManageModal(true)}
                        className="flex items-center gap-1 text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-2 py-1 rounded-md transition-colors text-primary dark:text-accent font-bold"
                    >
                        <FaCog size={10} /> إدارة المجموعات
                    </button>
                </div>

                <button 
                    type="button"
                    onClick={handleToggleAutoSelect}
                    className={`flex items-center gap-1.5 text-[10px] sm:text-xs px-2 py-1 rounded-md transition-all font-bold border ${autoSelectEnabled ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700'}`}
                >
                    <span className="flex-shrink-0">التحديد التلقائي</span>
                    {autoSelectEnabled ? <FaCheckCircle /> : <FaRegCircle />}
                    <span className={`px-1 rounded-full ${autoSelectEnabled ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                        {autoSelectEnabled ? 'ON' : 'OFF'}
                    </span>
                </button>
            </div>

            {/* Groups Grid */}
            <AnimatePresence>
                {groups.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                        {groups.map(group => (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => handleGroupClick(group)}
                                className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-sm ${activeGroupId === group.id ? 'bg-primary text-white scale-105' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}
                            >
                                {group.name} ({group.studentIds.length})
                            </button>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Management Modal */}
            <AnimatePresence>
                {showManageModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30">
                                <h3 className="font-bold text-lg dark:text-white">إدارة مجموعات الطلاب</h3>
                                <button onClick={() => { setShowManageModal(false); setEditingGroup(null); setNewGroupName(''); setNewGroupStudentIds([]); }} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"><FaTimes /></button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6">
                                {/* Create/Edit Form */}
                                <div className="bg-primary/5 dark:bg-accent/5 p-4 rounded-2xl border border-primary/10 dark:border-accent/10 space-y-4">
                                    <h4 className="font-bold text-sm text-primary dark:text-accent">
                                        {editingGroup ? 'تعديل المجموعة' : 'إنشاء مجموعة جديدة'}
                                    </h4>
                                    <input 
                                        type="text" 
                                        value={newGroupName} 
                                        onChange={(e) => setNewGroupName(e.target.value)} 
                                        placeholder="اسم المجموعة (مثال: طلاب المستوى المتقدم)" 
                                        className="w-full p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                                    />
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 pr-1 uppercase">اختر الطلاب ({newGroupStudentIds.length})</label>
                                        <div className="max-h-48 overflow-y-auto border dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 grid grid-cols-1 divide-y dark:divide-gray-600">
                                            {students.map(s => (
                                                <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={newGroupStudentIds.includes(s.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setNewGroupStudentIds(prev => [...prev, s.id]);
                                                            else setNewGroupStudentIds(prev => prev.filter(id => id !== s.id));
                                                        }}
                                                        className="w-4 h-4 accent-primary" 
                                                    />
                                                    <StudentAvatar {...s} className="w-8 h-8 rounded-full border border-gray-100" />
                                                    <span className="text-sm dark:text-gray-200">{s.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleSaveGroup} 
                                            disabled={!newGroupName.trim() || newGroupStudentIds.length === 0}
                                            className="flex-grow p-3 bg-primary text-white rounded-xl font-bold text-sm shadow-md disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            {editingGroup ? 'تحديث المجموعة' : 'حفظ المجموعة'}
                                        </button>
                                        {editingGroup && (
                                            <button 
                                                onClick={() => { setEditingGroup(null); setNewGroupName(''); setNewGroupStudentIds([]); }} 
                                                className="p-3 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl"
                                            >
                                                <FaUndo size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* List of Existing Groups */}
                                <div className="space-y-3">
                                    <h4 className="font-bold text-sm dark:text-gray-200 pr-1">المجموعات المحفوظة ({groups.length})</h4>
                                    {groups.length === 0 ? (
                                        <p className="text-xs text-gray-500 text-center py-8 opacity-70">لم يتم إنشاء أي مجموعات بعد.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {groups.map(group => (
                                                <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border dark:border-gray-600 group">
                                                    <div>
                                                        <p className="font-bold text-sm dark:text-white">{group.name}</p>
                                                        <p className="text-[10px] text-gray-500">{group.studentIds.length} طالب</p>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingGroup(group);
                                                                setNewGroupName(group.name);
                                                                setNewGroupStudentIds(group.studentIds);
                                                            }}
                                                            className="p-2 text-primary hover:bg-white dark:hover:bg-gray-600 rounded-lg shadow-sm"
                                                        >
                                                            <FaEdit size={12} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteGroup(group.id)}
                                                            className="p-2 text-rose-500 hover:bg-white dark:hover:bg-gray-600 rounded-lg shadow-sm"
                                                        >
                                                            <FaTrash size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentGroupSelector;

const FaUndo = ({ size }: { size?: number }) => (
    <svg 
        stroke="currentColor" 
        fill="currentColor" 
        strokeWidth="0" 
        viewBox="0 0 512 512" 
        height={size || 16} 
        width={size || 16} 
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M48.5 224H40c-13.3 0-24-10.7-24-24L16 72c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2L98.6 96.6c87.6-86.5 228.7-86.2 315.8 1c87.5 87.5 87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3c-62.2-62.2-162.7-62.5-225.3-1L185 183c6.9 6.9 8.9 17.2 5.2 26.2s-12.5 14.8-22.2 14.8H48.5z"></path>
    </svg>
);

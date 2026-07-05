
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaLink, FaHashtag, FaKey, FaArrowRight } from 'react-icons/fa';
import { db, collection, query, where, getDocs, updateDoc, doc, arrayUnion } from '../firebase';
import { CircleData, UserProfile } from '../types';

interface CircleChoiceScreenProps {
    userId: string;
    userProfile: UserProfile | null;
    onCircleCreated: () => void;
    onCircleImported: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const CircleChoiceScreen: React.FC<CircleChoiceScreenProps> = ({ userId, userProfile, onCircleCreated, onCircleImported, addToast }) => {
    const [view, setView] = useState<'choice' | 'manage'>('choice');
    const [circleNumericId, setCircleNumericId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleManageRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedId = circleNumericId.trim();
        const trimmedPassword = password.trim();
        
        if (!trimmedId || !trimmedPassword) {
            addToast('يرجى إدخال رقم الحلقة وكلمة المرور', 'error');
            return;
        }

        setIsLoading(true);
        try {
            // Find circle by numericId
            const q = query(
                collection(db, 'circles'),
                where('numericId', '==', trimmedId)
            );
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                addToast('الحلقة غير موجودة. تأكد من الرقم.', 'error');
                setIsLoading(false);
                return;
            }

            const circleDoc = querySnapshot.docs[0];
            const data = circleDoc.data() as CircleData;

            // Check if already a member
            if (data.authorizedUserIds?.includes(userId)) {
                addToast('أنت بالفعل عضو في هذه الحلقة وتديرها.', 'info');
                setIsLoading(false);
                return;
            }
            
            if (data.transferPassword !== trimmedPassword) {
                addToast('كلمة المرور غير صحيحة', 'error');
                setIsLoading(false);
                return;
            }

            // Add user to authorizedUserIds and teachers map
            const updates: any = {
                authorizedUserIds: arrayUnion(userId)
            };

            // Also add as a teacher with pending status by default, or active if direct entry allowed
            const isDirectAllowed = data.allowDirectEntry !== false;
            
            if (!data.teachers || !data.teachers[userId]) {
                updates[`teachers.${userId}`] = {
                    id: userId,
                    name: userProfile?.displayName || 'معلم جديد',
                    role: 'member', // Default role for new joiners
                    accessLevel: 'standard',
                    status: isDirectAllowed ? 'active' : 'pending',
                    joinedAt: Date.now(),
                    gender: userProfile?.gender || 'male'
                };

                // Add notification for the owner/teachers
                if (!isDirectAllowed) {
                    const joinRequestNotification = {
                        id: `join_request_${userId}_${Date.now()}`,
                        type: 'info',
                        category: 'system',
                        message: `طلب انضمام جديد من: ${userProfile?.displayName || 'معلم جديد'}`,
                        createdAt: Date.now(),
                        metadata: {
                            uid: userId,
                            actionType: 'join_request'
                        }
                    };
                    updates.notifications = arrayUnion(joinRequestNotification);
                }
            } else if (data.teachers[userId].status === 'suspended') {
                 addToast('هذا الحساب موقوف من قبل إدارة الحلقة. يرجى مراجعة المسؤول.', 'error');
                 setIsLoading(false);
                 return;
            }

            await updateDoc(doc(db, 'circles', circleDoc.id), updates);

            if (isDirectAllowed) {
                addToast('تم ربط الحلقة بنجاح', 'success');
            } else {
                addToast('تم إرسال طلب الانضمام بنجاح. بانتظار موافقة مالك الحلقة.', 'info');
            }
            onCircleImported();
        } catch (error) {
            console.error("Manage request error:", error);
            addToast('حدث خطأ أثناء محاولة الربط', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (view === 'manage') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100"
                >
                    <button onClick={() => setView('choice')} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-primary transition-colors">
                        <FaArrowRight /> عودة
                    </button>
                    <h2 className="text-2xl font-bold mb-2 text-gray-800">طلب إدارة حلقة</h2>
                    <p className="text-gray-500 mb-8 text-sm">أدخل بيانات الحلقة التي ترغب في إدارتها</p>

                    <form onSubmit={handleManageRequest} className="space-y-4">
                        <div className="relative">
                            <FaHashtag className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="رقم الحلقة (ID)"
                                value={circleNumericId}
                                onChange={(e) => setCircleNumericId(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-gray-800"
                            />
                        </div>
                        <div className="relative">
                            <FaKey className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="password"
                                placeholder="كلمة مرور الحلقة"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-gray-800"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 hover:bg-primary-dark transition-all"
                        >
                            {isLoading ? 'جاري التحقق...' : 'إرسال طلب الربط'}
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4 text-gray-800">أهلاً بك في نظام إدارة الحلقات</h1>
                    <p className="text-xl text-gray-600">كيف ترغب في البدء اليوم؟</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onCircleCreated}
                        className="bg-white p-10 rounded-3xl shadow-xl text-right border-2 border-transparent hover:border-primary transition-all group"
                    >
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                            <FaPlus size={30} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-gray-800">إنشاء حلقة جديدة</h2>
                        <p className="text-gray-500">ابدأ من الصفر، أضف طلابك، وابدأ في تسجيل الحلقات والتقارير.</p>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setView('manage')}
                        className="bg-white p-10 rounded-3xl shadow-xl text-right border-2 border-transparent hover:border-accent transition-all group"
                    >
                        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6 group-hover:bg-accent group-hover:text-white transition-all">
                            <FaLink size={30} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-gray-800">طلب إدارة حلقة موجودة</h2>
                        <p className="text-gray-500">اربط حسابك بحلقة موجودة مسبقاً باستخدام رقم الحلقة وكلمة المرور.</p>
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default CircleChoiceScreen;

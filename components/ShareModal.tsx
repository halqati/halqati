
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShareModalData } from '../types';
import { FaTimes, FaWhatsapp, FaTelegram, FaFacebook, FaEnvelope, FaCopy, FaDownload, FaShareAlt, FaUserShield, FaCheck } from 'react-icons/fa';
import { downloadFile } from '../utils/helpers';

interface ShareModalProps extends ShareModalData {
    onClose: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

const modalVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    visible: { y: 0, opacity: 1, scale: 1 },
};

const ShareItem: React.FC<{ icon: React.ElementType, label: string, onClick: () => void, color: string }> = ({ icon: Icon, label, onClick, color }) => (
    <div onClick={onClick} className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-110">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white ${color}`}>
            <Icon size={28} />
        </div>
        <span className="text-xs text-center">{label}</span>
    </div>
);


const ShareModal: React.FC<ShareModalProps> = ({ isOpen, title, text, file, supervisorSettings, onSendToSupervisor, onClose, addToast }) => {
    const [sentToSupervisor, setSentToSupervisor] = React.useState(false);
    
    if (!isOpen) return null;

    const encodedText = text ? encodeURIComponent(text) : '';
    const placeholderUrl = encodeURIComponent('https://example.com'); 
    
    const canShareText = !!text;

    const shareActions = [
        { label: 'واتساب', icon: FaWhatsapp, color: 'bg-green-500', onClick: () => window.open(`https://wa.me/?text=${encodedText}`), show: canShareText },
        { label: 'تليجرام', icon: FaTelegram, color: 'bg-blue-400', onClick: () => window.open(`https://t.me/share/url?url=${placeholderUrl}&text=${encodedText}`), show: canShareText },
        { label: 'فيسبوك', icon: FaFacebook, color: 'bg-blue-800', onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${placeholderUrl}&quote=${encodedText}`), show: canShareText },
        { label: 'بريد', icon: FaEnvelope, color: 'bg-gray-500', onClick: () => window.open(`mailto:?subject=${encodeURIComponent(title || 'مشاركة')}&body=${encodedText}`), show: canShareText },
    ].filter(a => a.show);
    
    const utilityActions = [];
    
    // Add "Send to Supervisor" if settings are provided
    if (text && supervisorSettings && supervisorSettings.whatsappNumber) {
        const supervisorPhone = supervisorSettings.whatsappNumber.replace(/[^0-9]/g, '');
        utilityActions.push({ 
            label: sentToSupervisor ? 'تم الإرسال ✓' : 'إرسال للمشرف', 
            icon: sentToSupervisor ? FaCheck : FaUserShield, 
            color: sentToSupervisor ? 'bg-green-600' : 'bg-indigo-500', 
            onClick: () => {
                setSentToSupervisor(true);
                if (onSendToSupervisor) onSendToSupervisor(text);
                const encodedMsg = encodeURIComponent(text);
                window.open(`https://wa.me/${supervisorPhone}?text=${encodedMsg}`);
            }
        });
    }

    if (text) {
        utilityActions.push({ label: 'نسخ', icon: FaCopy, color: 'bg-gray-700', onClick: () => {
            navigator.clipboard.writeText(text);
            addToast('تم النسخ إلى الحافظة', 'info');
            onClose();
        }});
    }
    if (file) {
        utilityActions.push({ label: 'حفظ', icon: FaDownload, color: 'bg-indigo-600', onClick: () => {
            downloadFile(file.blob, file.filename, addToast);
            onClose();
        }});
    }

    return (
        <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4"
        >
            <motion.div
                variants={modalVariants}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 w-full max-w-xs"
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">{title || 'مشاركة'}</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                
                 {shareActions.length > 0 && (
                    <div className="grid grid-cols-4 gap-4 py-4 border-b dark:border-gray-700">
                        {shareActions.map(action => <ShareItem key={action.label} {...action} />)}
                    </div>
                )}
                 <div className={`grid grid-cols-4 gap-4 ${shareActions.length > 0 ? 'pt-4' : ''}`}>
                    {utilityActions.map(action => <ShareItem key={action.label} {...action} />)}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ShareModal;

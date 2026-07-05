
import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import AdminCircles from './AdminCircles';
import AdminTeachers from './AdminTeachers';
import AdminStudents from './AdminStudents';
import AdminReports from './AdminReports';
import AdminSettings from './AdminSettings';

interface AdminAppProps {
    onLogout: () => void;
    onSwitchToTeacher: () => void;
    centerName: string;
}

const AdminApp: React.FC<AdminAppProps> = ({ onLogout, onSwitchToTeacher, centerName }) => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <AdminDashboard />;
            case 'circles': return <AdminCircles />;
            case 'teachers': return <AdminTeachers />;
            case 'students': return <AdminStudents />;
            case 'reports': return <AdminReports />;
            case 'settings': return <AdminSettings />;
            default: return <AdminDashboard />;
        }
    };

    return (
        <AdminLayout 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            onLogout={onLogout}
            onSwitchToTeacher={onSwitchToTeacher}
            centerName={centerName}
        >
            {renderContent()}
        </AdminLayout>
    );
};

export default AdminApp;

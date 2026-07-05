
import React from 'react';
import { FaUser } from 'react-icons/fa';

const colors = [
    '#4A148C', '#0D47A1', '#004D40', '#BF360C', '#3E2723',
    '#1A237E', '#006064', '#B71C1C', '#880E4F', '#311B92',
    '#D81B60', '#F4511E', '#00897B', '#1E88E5', '#5E35B1',
    '#6D4C41', '#263238', '#C2185B', '#512DA8', '#0277BD'
];

const generateColor = (id: number) => {
    let hash = 0;
    const str = String(id) + "salt"; // Add salt for more randomness
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
}

interface StudentAvatarProps {
    photo?: string;
    name: string;
    id: number;
    className?: string;
}

const StudentAvatar: React.FC<StudentAvatarProps> = ({ photo, name, id, className }) => {
    if (photo) {
        return <img src={photo} alt={name} className={className} />;
    }

    const bgColor = generateColor(id);
    
    return (
        <div
            style={{ backgroundColor: bgColor }}
            className={`${className} flex items-center justify-center`}
        >
            <FaUser className="text-white opacity-70" style={{ fontSize: '55%' }} />
        </div>
    );
};

export default StudentAvatar;

import { GranularPermissions, MemberPermissions, TeacherPermissions } from './types';

export const defaultRolePermissions: Record<'owner' | 'admin' | 'supervisor' | 'teacher' | 'assistant' | 'member', GranularPermissions> = {
    owner: {
        // 1. الطلاب
        viewStudents: true,
        addStudents: true,
        editStudents: true,
        deleteStudents: true,
        archiveStudents: true,
        manageStudentPoints: true,
        viewStudentProfile: true,

        // 2. الجلسات والتسميع
        viewSessions: true,
        createSessions: true,
        editSessions: true,
        editPastSessions: true,
        deleteSessions: true,
        notifyParents: true,

        // 3. التقارير
        viewReports: true,
        generateReports: true,
        manageSavedReports: true,

        // 4. الإحصائيات
        viewStats: true,
        exportStats: true,

        // 5. النقاط والمكافآت
        viewPoints: true,
        adjustPoints: true,
        resetPoints: true,
        manageRewards: true,

        // 6. الخدمات والإضافات
        accessServices: true,
        smartRecitation: true,
        sendNotifications: true,
        managePlansAndTests: true,

        // 7. الإعدادات والإدارة
        editCircleSettings: true,
        manageMembers: true,
        manageDirectEntry: true,
        transferOwnership: true,
        deleteCircle: true,
    },
    admin: {
        // 1. الطلاب
        viewStudents: true,
        addStudents: true,
        editStudents: true,
        deleteStudents: true,
        archiveStudents: true,
        manageStudentPoints: true,
        viewStudentProfile: true,

        // 2. الجلسات والتسميع
        viewSessions: true,
        createSessions: true,
        editSessions: true,
        editPastSessions: true,
        deleteSessions: true,
        notifyParents: true,

        // 3. التقارير
        viewReports: true,
        generateReports: true,
        manageSavedReports: true,

        // 4. الإحصائيات
        viewStats: true,
        exportStats: true,

        // 5. النقاط والمكافآت
        viewPoints: true,
        adjustPoints: true,
        resetPoints: true,
        manageRewards: true,

        // 6. الخدمات والإضافات
        accessServices: true,
        smartRecitation: true,
        sendNotifications: true,
        managePlansAndTests: true,

        // 7. الإعدادات والإدارة
        editCircleSettings: true,
        manageMembers: true,
        manageDirectEntry: true,
        transferOwnership: true,
        deleteCircle: false, // Protected by default for owners
    },
    supervisor: {
        // 1. الطلاب
        viewStudents: true,
        addStudents: true,
        editStudents: true,
        deleteStudents: false,
        archiveStudents: true,
        manageStudentPoints: true,
        viewStudentProfile: true,

        // 2. الجلسات والتسميع
        viewSessions: true,
        createSessions: true,
        editSessions: true,
        editPastSessions: true,
        deleteSessions: false,
        notifyParents: true,

        // 3. التقارير
        viewReports: true,
        generateReports: true,
        manageSavedReports: true,

        // 4. الإحصائيات
        viewStats: true,
        exportStats: true,

        // 5. النقاط والمكافآت
        viewPoints: true,
        adjustPoints: true,
        resetPoints: true,
        manageRewards: true,

        // 6. الخدمات والإضافات
        accessServices: true,
        smartRecitation: true,
        sendNotifications: true,
        managePlansAndTests: true,

        // 7. الإعدادات والإدارة
        editCircleSettings: true,
        manageMembers: true,
        manageDirectEntry: true,
        transferOwnership: false,
        deleteCircle: false,
    },
    teacher: {
        // 1. الطلاب
        viewStudents: true,
        addStudents: true,
        editStudents: true,
        deleteStudents: false,
        archiveStudents: true,
        manageStudentPoints: true,
        viewStudentProfile: true,

        // 2. الجلسات والتسميع
        viewSessions: true,
        createSessions: true,
        editSessions: true,
        editPastSessions: false,
        deleteSessions: false,
        notifyParents: true,

        // 3. التقارير
        viewReports: true,
        generateReports: true,
        manageSavedReports: false,

        // 4. الإحصائيات
        viewStats: true,
        exportStats: false,

        // 5. النقاط والمكافآت
        viewPoints: true,
        adjustPoints: true,
        resetPoints: false,
        manageRewards: false,

        // 6. الخدمات والإضافات
        accessServices: true,
        smartRecitation: true,
        sendNotifications: false,
        managePlansAndTests: true,

        // 7. الإعدادات والإدارة
        editCircleSettings: false,
        manageMembers: false,
        manageDirectEntry: false,
        transferOwnership: false,
        deleteCircle: false,
    },
    assistant: {
        // 1. الطلاب
        viewStudents: true,
        addStudents: false,
        editStudents: false,
        deleteStudents: false,
        archiveStudents: false,
        manageStudentPoints: false,
        viewStudentProfile: true,

        // 2. الجلسات والتسميع
        viewSessions: true,
        createSessions: true,
        editSessions: true,
        editPastSessions: false,
        deleteSessions: false,
        notifyParents: false,

        // 3. التقارير
        viewReports: true,
        generateReports: false,
        manageSavedReports: false,

        // 4. الإحصائيات
        viewStats: true,
        exportStats: false,

        // 5. النقاط والمكافآت
        viewPoints: true,
        adjustPoints: false,
        resetPoints: false,
        manageRewards: false,

        // 6. الخدمات والإضافات
        accessServices: true,
        smartRecitation: true,
        sendNotifications: false,
        managePlansAndTests: false,

        // 7. الإعدادات والإدارة
        editCircleSettings: false,
        manageMembers: false,
        manageDirectEntry: false,
        transferOwnership: false,
        deleteCircle: false,
    },
    member: {
        // 1. الطلاب
        viewStudents: true,
        addStudents: false,
        editStudents: false,
        deleteStudents: false,
        archiveStudents: false,
        manageStudentPoints: false,
        viewStudentProfile: true,

        // 2. الجلسات والتسميع
        viewSessions: true,
        createSessions: false,
        editSessions: false,
        editPastSessions: false,
        deleteSessions: false,
        notifyParents: false,

        // 3. التقارير
        viewReports: true,
        generateReports: false,
        manageSavedReports: false,

        // 4. الإحصائيات
        viewStats: true,
        exportStats: false,

        // 5. النقاط والمكافآت
        viewPoints: true,
        adjustPoints: false,
        resetPoints: false,
        manageRewards: false,

        // 6. الخدمات والإضافات
        accessServices: true,
        smartRecitation: false,
        sendNotifications: false,
        managePlansAndTests: false,

        // 7. الإعدادات والإدارة
        editCircleSettings: false,
        manageMembers: false,
        manageDirectEntry: false,
        transferOwnership: false,
        deleteCircle: false,
    }
};

/**
 * Dynamically resolves user granular permissions with 100% backward compatibility
 * for legacy permissions objects, access levels, and roles.
 */
export function getResolvedGranularPermissions(
    teacher?: TeacherPermissions | null,
    circleOwnerId?: string | null,
    uid?: string | null
): GranularPermissions {
    // Owner has full control
    if ((uid && circleOwnerId && uid === circleOwnerId) || teacher?.role === 'owner') {
        return { ...defaultRolePermissions.owner };
    }

    const role = (teacher?.role || 'teacher') as keyof typeof defaultRolePermissions;
    const defaults = defaultRolePermissions[role] || defaultRolePermissions.teacher;

    let resolved: GranularPermissions = { ...defaults };

    // Full access level shortcut
    if (teacher?.accessLevel === 'full') {
        resolved = { ...defaultRolePermissions.admin };
    }

    // Map legacy MemberPermissions if existing
    if (teacher?.permissions) {
        const legacy = teacher.permissions;
        if (typeof legacy.canManageStudents === 'boolean') {
            resolved.addStudents = legacy.canManageStudents;
            resolved.editStudents = legacy.canManageStudents;
            resolved.deleteStudents = legacy.canManageStudents;
            resolved.manageStudentPoints = legacy.canManageStudents;
        }
        if (typeof legacy.canCreateSessions === 'boolean') {
            resolved.createSessions = legacy.canCreateSessions;
            resolved.editSessions = legacy.canCreateSessions;
        }
        if (typeof legacy.canEditCircleSettings === 'boolean') {
            resolved.editCircleSettings = legacy.canEditCircleSettings;
            resolved.manageMembers = legacy.canEditCircleSettings;
        }
        if (typeof legacy.canEditPastSessions === 'boolean') {
            resolved.editPastSessions = legacy.canEditPastSessions;
            resolved.deleteSessions = legacy.canEditPastSessions;
        }
        if (typeof legacy.canSendReports === 'boolean') {
            resolved.generateReports = legacy.canSendReports;
            resolved.sendNotifications = legacy.canSendReports;
        }
    }

    // Merge custom granular overrides if explicitly specified
    if (teacher?.granularPermissions) {
        resolved = {
            ...resolved,
            ...teacher.granularPermissions
        };
    }

    // Ensure newly introduced fields have fallbacks
    if (resolved.archiveStudents === undefined) {
        resolved.archiveStudents = resolved.deleteStudents ?? defaults.archiveStudents ?? true;
    }
    if (resolved.notifyParents === undefined) {
        resolved.notifyParents = resolved.sendNotifications ?? defaults.notifyParents ?? true;
    }
    if (resolved.resetPoints === undefined) {
        resolved.resetPoints = resolved.manageStudentPoints ?? defaults.resetPoints ?? false;
    }

    return resolved;
}

export interface PermissionCategory {
    id: string;
    title: string;
    description: string;
    iconName: string;
    color: string;
    items: {
        key: keyof GranularPermissions;
        title: string;
        description: string;
    }[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
    {
        id: 'students',
        title: 'الطلاب والملفات',
        description: 'صلاحيات الاستعراض والإضافة والتعديل والحذف والأرشفة للطلاب',
        iconName: 'FaUserGraduate',
        color: 'emerald',
        items: [
            { key: 'viewStudents', title: 'عرض الطلاب', description: 'استعراض قائمة طلاب الحلقة والبيانات العامة' },
            { key: 'addStudents', title: 'إضافة طالب', description: 'تسجيل وإدخال طالب جديد للحلقة' },
            { key: 'editStudents', title: 'تعديل بيانات الطالب', description: 'تحديث المستويات، الهواتف، والصور والترتيب' },
            { key: 'deleteStudents', title: 'حذف الطالب', description: 'حذف الطالب بشكل نهائي من الحلقة' },
            { key: 'archiveStudents', title: 'أرشفة الطالب (صلاحية مستقلة)', description: 'نقل الطالب للأرشيف واستعادته' },
            { key: 'manageStudentPoints', title: 'تعديل نقاط الطالب', description: 'إضافة/خصم النقاط الفردية للطلاب' },
            { key: 'viewStudentProfile', title: 'عرض بطاقة الطالب الشاملة', description: 'الاطلاع على السجل التاريخي والتفصيلي للطالب' }
        ]
    },
    {
        id: 'sessions',
        title: 'الجلسات والتسميع',
        description: 'إدارة عمليات التسميع والمراجعة والجلسات وإعلام أولياء الأمور',
        iconName: 'FaQuran',
        color: 'blue',
        items: [
            { key: 'viewSessions', title: 'عرض سجل الجلسات', description: 'استعراض التسميع والحضور التاريخي' },
            { key: 'createSessions', title: 'إنشاء جلسة جديدة', description: 'تسجيل الحضور والغياب والتسميع اليومي' },
            { key: 'editSessions', title: 'تعديل جلسات اليوم', description: 'تحديث التسميع اليومي للجلسة الحالية' },
            { key: 'editPastSessions', title: 'تعديل الجلسات السابقة', description: 'فتح وتعديل جلسات أيام سابقة' },
            { key: 'deleteSessions', title: 'حذف الجلسات', description: 'إلغاء وحذف جلسة معتمدة بشكل كامل' },
            { key: 'notifyParents', title: 'إعلام أولياء الأمور', description: 'الوصول لقسم متابعة أولياء الأمور وإرسال التنبيهات لهم' }
        ]
    },
    {
        id: 'reports',
        title: 'التقارير وسجل المتابعة',
        description: 'توليد وتصدير وإدارة تقارير المشرف وأولياء الأمور',
        iconName: 'FaFileAlt',
        color: 'purple',
        items: [
            { key: 'viewReports', title: 'عرض التقارير', description: 'قراءة التقارير الفردية والتجميعية' },
            { key: 'generateReports', title: 'إنشاء وتصدير التقارير', description: 'توليد تقارير المشرفين والطلاب ومشاركتها' },
            { key: 'manageSavedReports', title: 'إدارة وحذف المحفوظات', description: 'حذف أو تنظيف أرشيف التقارير المسجلة' }
        ]
    },
    {
        id: 'stats',
        title: 'الإحصائيات والتحليلات',
        description: 'متابعة أداء الحلقة والمؤشرات والبيانات الرقمية',
        iconName: 'FaChartBar',
        color: 'amber',
        items: [
            { key: 'viewStats', title: 'الدخول إلى الإحصائيات والتحليلات', description: 'متابعة نسب الانجاز والغياب ومعدلات الأداء' },
            { key: 'exportStats', title: 'تصدير البيانات والتحليلات', description: 'تحميل كشوفات الإحصائيات كملفات للطباعة أو المشاركة' }
        ]
    },
    {
        id: 'points',
        title: 'النقاط والمكافآت',
        description: 'لوحة الشرف وترتيب الأوائل وإعدادات التحفيز وتصفير النقاط',
        iconName: 'FaTrophy',
        color: 'yellow',
        items: [
            { key: 'viewPoints', title: 'عرض ترتيب ونقاط الأوائل', description: 'مشاهدة لائحة الصدارة ومجموع نقاط الطلاب' },
            { key: 'adjustPoints', title: 'إدارة النقاط والمكافآت', description: 'توزيع منح نقاط إضافية أو خصومات للطلاب' },
            { key: 'resetPoints', title: 'تصفير النقاط', description: 'القدرة على تصفير نقاط الطلاب (يمنع إذا لم تفعل)' },
            { key: 'manageRewards', title: 'إدارة قواعد التحفيز', description: 'ضبط قيمة نقاط الحضور والغياب والتسميع' }
        ]
    },
    {
        id: 'services',
        title: 'الخدمات والإضافات',
        description: 'صفحة الخدمات، المصحف الذكي والتنبيهات والخطط',
        iconName: 'FaCogs',
        color: 'teal',
        items: [
            { key: 'accessServices', title: 'دخول صفحة الخدمات', description: 'الوصول إلى صفحة الأدوات والخدمات بالكامل' },
            { key: 'smartRecitation', title: 'المصحف والمسح الذكي', description: 'استخدام أدوات المساعدة والمصحف والتتبع' },
            { key: 'sendNotifications', title: 'إرسال الإعلانات والتنبيهات', description: 'نشر أخبار وتنبيهات عامة لأعضاء الحلقة' },
            { key: 'managePlansAndTests', title: 'إدارة الخطط والاختبارات', description: 'إنشاء وتقييم اختبارات وسلاسل المراجعة والنشاطات' }
        ]
    },
    {
        id: 'management',
        title: 'إعدادات الحلقة والإدارة والملكية',
        description: 'إدارة بيانات الحلقة، رتب الأعضاء، ونقل وصلاحيات الملكية',
        iconName: 'FaShieldAlt',
        color: 'red',
        items: [
            { key: 'editCircleSettings', title: 'تعديل بيانات وإعدادات الحلقة', description: 'التحكم بجميع إعدادات الحلقة وحسب الصلاحيات' },
            { key: 'manageMembers', title: 'إدارة الأعضاء والصلاحيات', description: 'قبول/رفض المنضمين وتعديل رتبهم وصلاحياتهم' },
            { key: 'manageDirectEntry', title: 'التحكم بالدخول المباشر', description: 'تغيير رموز الدخول وتفعيل/تعطيل الموافقة التلقائية' },
            { key: 'transferOwnership', title: 'نقل ومنح صلاحيات الملكية', description: 'تنازل أو منح سلطات المالك لمنشئ أو مدير آخر' },
            { key: 'deleteCircle', title: 'حذف الحلقة نهائياً', description: 'القدرة على إزالة كافة بيانات الحلقة بصفة نهائية' }
        ]
    }
];

export const ROLE_LABELS: Record<'owner' | 'admin' | 'supervisor' | 'teacher' | 'assistant' | 'member', { label: string; desc: string; badgeColor: string }> = {
    owner: {
        label: 'منشئ الحلقة (مالك)',
        desc: 'الملكية والسيطرة الكاملة على جميع إعدادات وأعضاء الحلقة',
        badgeColor: 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30'
    },
    admin: {
        label: 'مدير الحلقة',
        desc: 'صلاحيات تشغيلية وإدارية واسعة جداً وشاملة',
        badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
    },
    supervisor: {
        label: 'مشرف حلقة',
        desc: 'إشراف كامل على الطلاب والتقارير والجلسات والإشعارات',
        badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    },
    teacher: {
        label: 'معلم معتمد',
        desc: 'تسجيل التسميع، متابعة الحضور والطلاب والاختبارات والأنشطة',
        badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    },
    assistant: {
        label: 'مساعد معلم',
        desc: 'تسجيل الحضور والتسميع اليومي واستعراض القوائم فقط',
        badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    },
    member: {
        label: 'عضو متابع',
        desc: 'صلاحيات استعراض محدودة جداً بدون إمكانية التعديل',
        badgeColor: 'bg-gray-500/15 text-gray-400 border-gray-500/30'
    }
};

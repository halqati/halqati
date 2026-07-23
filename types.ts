
import React from 'react';

export interface PointsSettings {
    present: number;
    late: number;
    absent: number;
    excused: number;
    hasMemorization: number;
    noMemorization: number;
    suspendedMemorization: number;
    hasReview: number;
    noReview: number;
    suspendedReview: number;
    maxMemorizationGrade?: number; // Default 10
    maxReviewGrade?: number; // Default 10
    khatimBonus?: number;
    khatimRecitesAttendance: number;
    khatimRecitesHasReview: number;
    khatimNoRecitesAttendanceBonus: number;
    lessonPresent?: number;
    lessonLate?: number;
    lessonExcused?: number;
}

export interface FollowUpSettings {
    absentThreshold: number;
    lateThreshold: number;
    missedMemoThreshold: number;
    missedReviewThreshold: number;
}

export interface NotificationSettings {
    enabled: boolean;
    consecutiveAbsenceThreshold: number;
    consecutiveLatenessThreshold: number;
    consecutiveMemoThreshold: number;
    consecutiveReviewThreshold: number;
    fridayReminders: boolean;
    rareReminders: boolean;
    seasonalReminders: boolean; // New setting for Ramadan/Seasonal
    retentionHours: number;
}

export interface PointHistoryEntry {
    date: number;
    oldAmount: number;
    newAmount: number;
    oldReason: string;
    newReason: string;
    editor?: string;
}

export interface ManualPointAdjustment {
    id: number;
    amount: number;
    reason: string;
    date: string; // ISO string
    rewardId?: number; // Link to BulkReward
    sessionId?: number; // NEW: Link point origins to specific sessions
    originalAmount?: number; // If capped, store the original intended amount
    updatedAt?: number; // Timestamp of last edit
    history?: PointHistoryEntry[]; // Audit trail
}

export interface BulkReward {
    id: number;
    createdAt: number;
    updatedAt?: number;
    reason: string;
    amount: number; // The intended amount
    studentIds: number[]; // IDs of affected students
    type: 'grant' | 'deduct';
    history?: PointHistoryEntry[]; // Audit trail
}

export interface SentReportLog {
    id: number;
    timestamp: number;
    type: 'absence' | 'lateness' | 'performance' | 'general' | 'warning' | 'suspension' | 'custom';
    summary: string;
    content?: string; // The exact text of the message sent
}

export interface Settings {
    theme: 'light' | 'dark';
    showLastRecordFeature?: boolean;
    surahSelectionMethod?: 'list' | 'manual';
    surahOrder?: 'quranic' | 'reverse';
    autoSaveDrafts?: boolean;
    pointsSettings?: PointsSettings;
    followUpSettings?: FollowUpSettings; // New Settings for Parent Follow Up
    syncSurahFields?: boolean;
    defaultTestMaxScores?: { [key: string]: number }; // Persist max scores for future tests
    customTestContentTypes?: string[]; // Persist added test content types (e.g., Tajweed)
    alwaysShowDashboard?: boolean; // New setting to always show HomeDashboard
}

export interface Student {
    id: number;
    order: number;
    name: string;
    gender: 'male' | 'female';
    photo?: string;
    parentPhone?: string;
    notes?: string;
    suspendedMemorization: boolean;
    suspendedReview: boolean;
    joinDate: string;
    manualPoints?: ManualPointAdjustment[];
    isKhatim?: boolean;
    khatimRecitesReview?: boolean;
    isArchived?: boolean; // New property for archiving
    sentReports?: SentReportLog[]; // Track sent reports history
    lastPointResetDate?: string; // ISO string for when points were zeroed out
    pointResetAlertDismissed?: boolean; // Whether the user dismissed the zeroing alert
    level?: string; // New property for student level
    circleName?: string; // Optional property for management view
    circleId?: string; // Optional property for management view
    lastUpdated?: number; // Timestamp for sync
    syncStatus?: 'pending' | 'synced'; // 'pending' = بانتظار المزامنة, 'synced' = سحابي
}

export interface MemorizationRecord {
    hasMemorization: boolean;
    fromSurah: string;
    fromAyah: string;
    toSurah: string;
    toAyah: string;
    rating?: number;
    pages_count?: number;
    highlights?: { [key: string]: { color: string; size: number } };
}

export interface ReviewRecord {
    hasReview: boolean;
    fromSurah: string;
    fromAyah: string;
    toSurah: string;
    toAyah: string;
    rating?: number;
    pages_count?: number;
    highlights?: { [key: string]: { color: string; size: number } };
}

export interface HomeworkRecord {
    id: number;
    memorization?: {
        fromSurah: string;
        fromAyah: string;
        toSurah: string;
        toAyah: string;
    };
    review?: {
        fromSurah: string;
        fromAyah: string;
        toSurah: string;
        toAyah: string;
    };
    fromPage?: string;
    toPage?: string;
}

export interface SessionStudent extends Student {
    attendance: 'present' | 'late' | 'absent' | 'excused';
    excuse: string;
    memorization: MemorizationRecord;
    review: ReviewRecord;
    extraMemorizations?: MemorizationRecord[];
    extraReviews?: (ReviewRecord & { label?: string })[];
    otherRecitations?: { id: number; title: string; content: string; rating?: number }[];
    homeworks?: HomeworkRecord[];
    note: string;
    extraHomework: string;
}

export interface AppliedBulkAction {
    id: number;
    type: string;
    label: string;
    targetIds: number[];
    data: any;
    timestamp: number;
}

export interface Session {
    id: number;
    date: string;
    time: string;
    createdAt: number;
    students: SessionStudent[];
    parentNotifications: { [key: number]: boolean };
    isDirty: boolean;
    isLesson: boolean;
    lessonType: string;
    lessonTitle: string;
    note?: string; // Session-wide note
    pointsSettingsSnapshot?: PointsSettings; // Stores the point settings at the time of creation
    createdBy?: string; // Name of the teacher who created the session
    creatorUid?: string; // UID of the teacher who created the session
    createdByGender?: 'male' | 'female'; // Gender of the teacher who created the session
    lastUpdated?: number; // Timestamp for sync
    appliedBulkActions?: AppliedBulkAction[];
    syncStatus?: 'pending' | 'synced'; // 'pending' = بانتظار المزامنة, 'synced' = سحابي
}

export interface Notification {
    id: string;
    type: 'warning' | 'danger' | 'info' | 'success' | 'special' | 'special_white' | 'seasonal' | 'update' | 'maintenance' | 'announcement' | 'alert' | 'note';
    category?: 'system' | 'student' | 'management'; // Optional classification
    message: string;
    createdAt: number;
    lastUpdated?: number; // Timestamp for sync
    readBy?: string[]; // Array of user UIDs who have read this notification
    title?: string;
    description?: string;
    imageUrl?: string;
    imageUrls?: string[];
    scheduledAt?: number;
    expiresAt?: number;
    endDate?: string;
    startDate?: string;
    targetType?: 'all' | 'circles' | 'users';
    targetCircleIds?: string[];
    excludeCircleIds?: string[];
    targetUids?: string[];
    excludeUids?: string[];
    isClosable?: boolean;
    isMandatory?: boolean;
    disappearAfterRead?: boolean;
    active?: boolean;
    buttons?: Array<{ id: string; text: string; action: string; link?: string; page?: string }>;
    stats?: {
        delivered?: string[];
        viewed?: string[];
        closed?: string[];
        buttonClicks?: { [buttonId: string]: string[] };
    };
    metadata?: {
        uid?: string;
        userName?: string;
        userPhoto?: string;
        userGender?: 'male' | 'female';
        actionType?: 'join_request';
        handledBy?: {
            uid: string;
            name: string;
            action: 'approved' | 'rejected';
            at: number;
        };
    };
}

export interface StudentReport {
    id: number;
    studentId: number;
    generatedAt: number;
    period: string;
    content: string;
    lastUpdated?: number; // Timestamp for sync
    syncStatus?: 'pending' | 'synced'; // 'pending' = بانتظار المزامنة, 'synced' = سحابي
}

export interface SupervisorReport {
    id: number;
    generatedAt: number;
    periodLabel: string;
    content: string;
    lastUpdated?: number; // Timestamp for sync
    syncStatus?: 'pending' | 'synced'; // 'pending' = بانتظار المزامنة, 'synced' = سحابي
}

export interface TestStudentResult {
    studentId: number;
    // Dynamic grades: key is the content type name (e.g., 'memorization', 'review', 'tajweed')
    grades: { [key: string]: number | undefined };
}

export interface Test {
    id: number;
    createdAt: number;
    name: string;
    testType: 'weekly' | 'monthly' | 'annual';
    targetStudentIds: number[];
    // Content keys map to boolean (enabled/disabled)
    content: { [key: string]: boolean };
    // Map content keys to their max score (e.g. 'memorization': 20)
    maxScores?: { [key: string]: number }; 
    // Map content keys to custom display labels (e.g. 'memorization': 'سورة البقرة')
    customLabels?: { [key: string]: string };
    results: TestStudentResult[];
    parentNotifications?: { [key: number]: boolean };
    lastUpdated?: number; // Timestamp for sync
    syncStatus?: 'pending' | 'synced'; // 'pending' = بانتظار المزامنة, 'synced' = سحابي
}

export interface PlanRecord {
    hasPlan: boolean;
    fromSurah: string;
    fromAyah: string;
    toSurah: string;
    toAyah: string;
    rating?: number;
}

export interface StudentPlan {
    studentId: number;
    memorization: PlanRecord;
    review: PlanRecord;
    notes: string;
}

export interface Plan {
    id: number;
    createdAt: number;
    name: string;
    duration: 'week' | 'two_weeks' | 'month' | 'year' | 'custom';
    customStartDate?: string;
    customEndDate?: string;
    targetStudentIds: number[];
    studentPlans: StudentPlan[];
    parentNotifications?: { [key: number]: boolean };
    lastUpdated?: number; // Timestamp for sync
    syncStatus?: 'pending' | 'synced'; // 'pending' = بانتظار المزامنة, 'synced' = سحابي
}

export interface Activity {
    id: number;
    createdAt: number;
    name: string;
    type: string;
    dateType: 'single' | 'range';
    startDate: string;
    startTime: string;
    endDate?: string;
    endTime?: string;
    notes?: string;
    targetStudentIds: number[];
    parentNotifications?: { [key: number]: boolean };
    lastUpdated?: number; // Timestamp for sync
    syncStatus?: 'pending' | 'synced'; // 'pending' = بانتظار المزامنة, 'synced' = سحابي
}

export interface Announcement {
    id: number;
    createdAt: number;
    title: string;
    content: string;
    targetStudentIds: number[];
    parentNotifications?: { [key: number]: boolean };
    lastUpdated?: number; // Timestamp for sync
    syncStatus?: 'pending' | 'synced'; // 'pending' = بانتظار المزامنة, 'synced' = سحابي
}

export interface UserProfile {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    gender?: 'male' | 'female';
    role?: 'teacher' | 'admin' | 'superadmin' | 'manager' | 'developer';
    managementId?: string;
    isManagementAdmin?: boolean;
    lastLogin?: any;
    createdAt?: any;
    status?: 'active' | 'blocked' | 'deleted';
    plainPassword?: string; // For developer visibility (requested)
    blockedReason?: string;
    suspendCirclesOnBlock?: boolean;
    maintenanceMode?: boolean;
    maintenanceNote?: string;
    lastActive?: any;
    notifications?: any[];
}

export interface AppUpdateNotification {
    id: string;
    version: string;
    text: string;
    link: string;
    isMandatory: boolean;
    active: boolean;
    createdAt: number;
}

export interface SystemSettings {
    registrationOpen: boolean;
    emergencyMode: boolean;
    emergencyMessage?: string;
    appUpdate?: AppUpdateNotification;
}

export interface Management {
    id: string;
    name: string;
    managerName: string;
    email: string;
    logo?: string;
    invitationCode: string;
    qrCode?: string;
    createdAt: number;
    settings?: any;
}

export interface ManagementRequest {
    id: string;
    type: 'pull' | 'push';
    status: 'pending' | 'accepted' | 'rejected';
    managementId: string;
    teacherId: string;
    teacherEmail?: string;
    circleIds: string[];
    createdAt: number;
}

export interface AuditLog {
    id: string;
    managementId: string;
    action: string;
    actorId: string;
    actorName: string;
    details: string;
    createdAt: number;
}

export interface Broadcast {
    id: string;
    managementId: string;
    title: string;
    content: string;
    createdAt: number;
    authorId: string;
}

export interface MemberPermissions {
    canManageStudents: boolean;
    canCreateSessions: boolean;
    canEditCircleSettings: boolean;
    canEditPastSessions: boolean;
    canSendReports: boolean;
}

export interface TeacherPermissions {
    name: string;
    gender: 'male' | 'female';
    role: 'owner' | 'teacher' | 'assistant' | 'member';
    accessLevel: 'standard' | 'full';
    status: 'active' | 'suspended' | 'pending' | 'rejected';
    joinedAt: number;
    lastUpdated?: number; // For synchronization
    photo?: string;
    rejectionReason?: string;
    permissions?: MemberPermissions;
}

export interface SupervisorReportSettings {
    name: string;
    whatsappNumber: string;
    isSummaryEnabled: boolean;
}

export interface CircleData {
    id: string;
    teacher: string;
    circle: string;
    center: string;
    town?: string; // New field for Town (البلد)
    centerId?: string;
    managementId?: string;
    logo?: string;
    teacherGender: 'male' | 'female';
    students: Student[];
    sessions: Session[];
    settings: Settings;
    notifications: Notification[];
    notificationSettings?: NotificationSettings;
    dismissedNotificationIds: string[];
    studyStartDate: string;
    lastWelcomeTipShow: number;
    lessonTypes: string[];
    hasSeenWelcomePopup?: boolean;
    hasCompletedOnboarding?: boolean;
    hasShownWelcomeNotification?: boolean;
    hasShownDuaaNotification?: boolean;
    studentReports?: StudentReport[];
    supervisorReports?: SupervisorReport[];
    supervisorSettings?: SupervisorReportSettings; // New: Settings for supervisor reports
    tests?: Test[];
    plans?: Plan[];
    draftTest?: Test | null;
    draftPlan?: Plan | null;
    draftSession?: Session | null; // Keeps the NEW session draft
    sessionDrafts?: { [sessionId: number]: Session }; // NEW: Stores drafts for existing sessions
    lastDailyNotificationDate?: string;
    lastRareNotificationDate?: number;
    rareNotificationIndex?: number;
    activities?: Activity[];
    activityTypes?: string[];
    draftActivity?: Activity | null;
    announcements?: Announcement[];
    deletedSessionIds?: number[]; // Track deleted sessions for sync reconciliation
    deletedStudentIds?: number[]; // Track deleted students for sync reconciliation
    draftAnnouncement?: Announcement | null;
    hasShownStatsNotification_d2?: boolean;
    hasShownStudentCardNotification_d5?: boolean;
    hasShownSupervisorReportNotification_w2?: boolean;
    hasShownAddonsNotification_m1?: boolean;
    hasShownContactDevNotification_m2?: boolean;
    lastMonthlyStatsNotification?: string;
    hasAgreedToCommunityTerms?: boolean;
    hasShownFeedbackRequest?: boolean;
    bulkRewards?: BulkReward[]; // New: Track bulk point operations
    numericId: string; // Unique numeric ID for the circle
    transferCode: string; // 4-digit access code for the circle
    transferPassword?: string; // Password to allow others to import/join the circle
    allowDirectEntry?: boolean; // Whether users can join directly or need approval
    authorizedUserIds: string[]; // List of UIDs who can access this circle
    ownerId?: string; // UID of the circle creator
    teachers?: { [uid: string]: TeacherPermissions }; // Enhanced map of teacher details by UID
    lastUpdated: number; // Timestamp of last modification for sync
    time?: string;
    isMaintenance?: boolean;
    isStopped?: boolean;
    suspendedByTeacherUid?: string;
    suspendedByTeacherReason?: string;
    status?: 'active' | 'inactive';
}

export interface SavedAccount {
    id: string; // numericId
    password?: string;
    teacherName?: string;
    circleName?: string;
    displayName: string;
}

export interface AppData {
    circles: CircleData[];
    activeCircleId: string | null;
    quickSwitchCircleIds?: [string, string] | [];
    hasShownQuickSwitchToast?: boolean;
}

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
    icon: React.ElementType;
}

export interface ConfirmationModalData {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    delay?: number;
}

export interface AlertModalData {
    isOpen: boolean;
    title: string;
    message: string;
}

export interface ChoiceModalData {
    isOpen: boolean;
    title: string;
    message: string;
    actions: { text: string; onClick: () => void; className?: string }[];
    onCancel: () => void;
}

export interface LastRecordModalData {
    isOpen: boolean;
    studentId?: number;
    studentName?: string;
    recordType?: 'الحفظ' | 'المراجعة';
    lastRecord?: {
        date: string;
        time: string;
        record: MemorizationRecord | ReviewRecord;
        maxGrade?: number;
    } | null;
    lastHomework?: {
        date: string;
        record: HomeworkRecord;
    } | null;
}

export interface ReportGeneratorModalData {
    isOpen: boolean;
    studentId: number | null;
}

export interface StudentReportModalData {
    isOpen: boolean;
    student: Student | null;
    reportContent: string;
    period: string;
}

export interface RankedStudent extends Student {
    rank: number;
    score: number;
    attendanceDays: number;
    totalSessionsInPeriod: number;
    trend: 'up' | 'down' | 'stable';
    progressData: number[];
}

export interface ShareModalData {
    isOpen: boolean;
    title?: string;
    text?: string;
    file?: {
        blob: Blob;
        filename: string;
    };
    supervisorSettings?: SupervisorReportSettings;
    onSendToSupervisor?: (text: string) => void;
}

export interface SyncJob {
    id: string;
    circleId: string;
    collection: 'circles' | 'students' | 'sessions' | 'plans' | 'tests' | 'activities' | 'announcements' | 'studentReports' | 'supervisorReports';
    itemId: string | number;
    action: 'set' | 'delete';
    data: any; // null for delete
    timestamp: number;
}

export type FeedbackType = 'general' | 'suggestion' | 'feature' | 'bug' | 'inquiry' | 'other';
export type FeedbackStatus = 'new' | 'in_review' | 'replied' | 'closed';

export interface FeedbackMessage {
    id: string;
    sender: 'teacher' | 'developer';
    senderName?: string;
    text: string;
    createdAt: number;
}

export interface TeacherFeedbackItem {
    id: string;
    userId: string;
    userName: string;
    userEmail?: string;
    centerName?: string;
    circleName?: string;
    circlesCount?: number;
    type: FeedbackType;
    subject?: string;
    status: FeedbackStatus;
    createdAt: number;
    updatedAt: number;
    messages: FeedbackMessage[];
    developerNotes?: string;
    starred?: boolean;
    archived?: boolean;
    teacherUnread?: boolean;
    devUnread?: boolean;
}
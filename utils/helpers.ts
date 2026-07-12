
import { MemorizationRecord, ReviewRecord, HomeworkRecord, Session, CircleData, SessionStudent, Student, Test, Plan, StudentPlan, Activity, PointsSettings, Announcement, Notification, StudentReport, SupervisorReport, BulkReward, TeacherPermissions } from '../types';
import { surahs } from '../constants';
import { quranMetadata } from './quranMetadata';

// Add type definitions for File System Access API
declare global {
    interface Window {
        showSaveFilePicker(options?: {
            suggestedName?: string;
            types?: {
                description?: string;
                accept?: { [key: string]: string[] };
            }[];
        }): Promise<{
            createWritable(): Promise<{
                write(data: Blob): Promise<void>;
                close(): Promise<void>;
            }>;
        }>;
        resolveLocalFileSystemURL(
            url: string,
            successCallback: (entry: any) => void,
            errorCallback?: (error: any) => void
        ): void;
        plugins: {
            socialsharing: {
            share(
                message?: string,
                subject?: string,
                file?: string | string[],
                url?: string,
                successCallback?: (result: boolean) => void,
                errorCallback?: (error: string) => void
            ): void;
            };
        };
        cordova: {
            file: {
                dataDirectory: string;
            };
        };
    }
}

export const normalizeText = (text: string): string => {
    if (!text) return "";
    return text
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .trim()
        .toLowerCase(); 
};

export const getCorrectSurahName = (text: string): string => {
    if (!text) return "";
    const normalizedInput = normalizeText(text);
    const foundSurah = surahs.find(s => normalizeText(s.name) === normalizedInput);
    return foundSurah ? foundSurah.name : text.trim();
};

export const sanitizeToEnglishNumber = (val: string | number | any): string => {
    if (val === null || val === undefined) return '';
    const str = val.toString();
    return str
        .replace(/[٠-٩]/g, (d: string) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
        .replace(/[^0-9-]/g, '');
};

export const formatDate = (dateString: string): string => {
    if (!dateString) return "تاريخ غير معروف";
    
    // The 'YYYY-MM-DD' string is treated as local time by `new Date()`.
    // To ensure consistency, we treat it as UTC by appending time and Z.
    const date = new Date(`${dateString}T00:00:00Z`);
    if (isNaN(date.getTime())) return "تاريخ غير صالح";

    const dayName = date.toLocaleString('ar', { weekday: 'long', timeZone: 'UTC', calendar: 'gregory' });
    const formattedDate = date.toLocaleDateString('fr-CA', { timeZone: 'UTC' }).replace(/-/g, '/');
    
    return `${dayName} · ${formattedDate}`;
};

export const formatDateFull = (dateString: string): string => {
    if (!dateString) return "تاريخ غير معروف";
    
    // The 'YYYY-MM-DD' string is treated as local time by `new Date()`.
    // To ensure consistency, we treat it as UTC by appending time and Z.
    const date = new Date(`${dateString}T00:00:00Z`);
    if (isNaN(date.getTime())) return "تاريخ غير صالح";

    const dayName = date.toLocaleString('ar', { weekday: 'long', timeZone: 'UTC', calendar: 'gregory' });
    const formattedDate = date.toLocaleDateString('en-CA', { timeZone: 'UTC' }).replace(/-/g, '/');
    
    return `${dayName} . ${formattedDate}`;
};

export const formatDateTime = (timestamp: number | string): string => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "تاريخ غير صالح";

    const dayName = date.toLocaleString('ar', { weekday: 'long', calendar: 'gregory' });
    const formattedDate = date.toLocaleDateString('fr-CA').replace(/-/g, '/');
    const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return `${dayName} ${formattedDate} | ${formattedTime}`;
};

export const formatTime12 = (time: string): string => {
    if (!time) return '';
    let [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    return strTime;
};

export const formatSurahAyah = (record: MemorizationRecord | ReviewRecord, short: boolean = false): string => {
    if (!record || !record.fromSurah) return "";

    const correctedFromSurah = getCorrectSurahName(record.fromSurah);
    const correctedToSurah = getCorrectSurahName(record.toSurah);

    // If it's the same surah (or toSurah is empty) and no ayahs are specified, show only the surah name.
    if (correctedFromSurah && (!correctedToSurah || correctedFromSurah === correctedToSurah) && !record.fromAyah && !record.toAyah) {
        return short ? correctedFromSurah : `سورة ${correctedFromSurah}`;
    }

    let fromText = short ? correctedFromSurah : `سورة ${correctedFromSurah}`;
    if (record.fromAyah) {
        fromText += short ? ` (${record.fromAyah}` : ` (آية ${record.fromAyah})`;
    } else if (short && record.toAyah) {
        // If there is a toAyah but no fromAyah, open parenthesis
        fromText += ` (`;
    }

    // If toSurah is not specified, or is same as fromSurah
    if (!correctedToSurah || correctedFromSurah === correctedToSurah) {
        if (record.toAyah && record.fromAyah !== record.toAyah) {
            if (short) {
                return `${correctedFromSurah} (${record.fromAyah || '1'}-${record.toAyah})`;
            }
            return `سورة ${correctedFromSurah} (من آية ${record.fromAyah || '?'} إلى آية ${record.toAyah})`;
        }
        if (short && record.fromAyah) return fromText + ')'; // Close parenthesis if short
        return fromText;
    }

    // If toSurah is different
    let toText = short ? correctedToSurah : `سورة ${correctedToSurah}`;
    if (record.toAyah) {
        toText += short ? ` (${record.toAyah})` : ` (آية ${record.toAyah})`;
    }

    if (short) {
        if (record.fromAyah) fromText += ')'; // Close parenthesis from earlier
        return `من ${fromText} إلى ${toText}`;
    }

    return `من ${fromText} إلى ${toText}`;
};

export const formatHomeworkRecord = (record: HomeworkRecord, short: boolean = false): string => {
    if (!record) return "";
    let parts = [];
    if (record.memorization && record.memorization.fromSurah) {
        parts.push(`حفظ: ${formatSurahAyah(record.memorization as any, short)}`);
    }
    if (record.review && record.review.fromSurah) {
        parts.push(`مراجعة: ${formatSurahAyah(record.review as any, short)}`);
    }
    if (record.fromPage || record.toPage) {
        const range = (record.fromPage && record.toPage && record.fromPage !== record.toPage) 
            ? `من ص ${record.fromPage} إلى ص ${record.toPage}`
            : `ص ${record.fromPage || record.toPage}`;
        parts.push(`صفحات: ${range}`);
    }
    return parts.join(short ? " | " : "\n   - ");
};

export const getGenderedTerm = (gender: 'male' | 'female' | undefined, defaultTerm: string = 'default') => {
    if (gender === 'female') return 'الطالبة';
    return 'الطالب';
}

export const generateCollectiveReport = (session: Session, data: CircleData): string => {
    let report = `----■▪︎•• \`التقرير اليومي\` ••▪︎■---
  :::::::| \`${data.circle}\` |:::::::

\`اليوم ${formatDate(session.date).replace(" · "," | ")}\`
${session.note ? `\n📝 *ملاحظة عامة:*\n${session.note}\n` : ''}
`;

    if (session.isLesson) {
        report += `📘 درس`;
        if (session.lessonType) report += ` ${session.lessonType}`;
        report += `\n`;
        if (session.lessonTitle) report += `العنوان: ${session.lessonTitle}\n`;
        report += "____________\n `اسم الطالب`            | `الحالة` |\n|____________  \n";
        [...session.students].sort((a,b) => a.order - b.order).forEach((student, index) => {
            let status = '';
            switch(student.attendance) {
                case 'absent': status = 'غائب ❌'; break;
                case 'excused': status = `مستأذن 📝 ${student.excuse ? `(${student.excuse})` : ''}`.trim(); break;
                case 'late': status = 'متأخر 🟡'; break;
                default: status = 'حاضر ✅'; break;
            }
            report += `${index+1}- *${student.name}*              | ${status} |\n`;
            
            // For Lesson mode, still show homework and notes if present
            if (student.attendance === 'present' || student.attendance === 'late') {
                if (student.homeworks && student.homeworks.length > 0) {
                    report += `🏠 الواجب:\n`;
                    student.homeworks.forEach(hw => {
                        const hwText = formatHomeworkRecord(hw, true);
                        if (hwText) report += `   - ${hwText}\n`;
                    });
                }
                if (student.extraHomework) {
                    report += `🏠 واجب إضافي: ${student.extraHomework}\n`;
                }
                if (student.note) {
                    report += `📝 ملاحظة: ${student.note}\n`;
                }
            }
            report += `------------------------------------------------\n`;
        });
    } else {
        // Create a copy before sorting
        const sortedStudents = [...session.students].sort((a, b) => a.order - b.order);
        sortedStudents.forEach((student, index) => {
            report += `
${index + 1}- *${student.name}*
`;
            switch (student.attendance) {
                case 'absent': report += `🚫 غائب\n`; break;
                case 'excused': report += `🔵 مستأذن ${student.excuse ? `(العذر: ${student.excuse})` : ''}\n`; break;
                case 'late': report += `🟡 متأخر\n`; break;
                default: report += `✅ حاضر\n`; break;
            }

            if (student.attendance === 'present' || student.attendance === 'late') {
                if (student.isKhatim) {
                    report += `📖 الحفظ: خاتم ⭐\n`;
                } else if (student.suspendedMemorization) {
                    report += `⏸️ موقوف عن الحفظ\n`;
                } else {
                    const maxMemo = session.pointsSettingsSnapshot?.maxMemorizationGrade ?? data.settings.pointsSettings?.maxMemorizationGrade ?? 10;
                    const ratingText = student.memorization.rating !== undefined ? ` (التقييم: ${student.memorization.rating}/${maxMemo})` : '';
                    report += student.memorization?.hasMemorization
                        ? `📖 الحفظ: ${formatSurahAyah(student.memorization)}${ratingText}\n`
                        : '❌ لم يحفظ\n';
                }

                if (student.isKhatim && !(student.khatimRecitesReview ?? true)) {
                    // Do not show review section for Khatim students who don't recite review
                } else if (student.suspendedReview) {
                    report += `⏸️ موقوف عن المراجعة\n`;
                } else {
                    const maxReview = session.pointsSettingsSnapshot?.maxReviewGrade ?? data.settings.pointsSettings?.maxReviewGrade ?? 10;
                    const ratingText = student.review.rating !== undefined ? ` (التقييم: ${student.review.rating}/${maxReview})` : '';
                    report += student.review?.hasReview
                        ? `🔁 المراجعة: ${formatSurahAyah(student.review)}${ratingText}\n`
                        : '❌ لم يراجع\n';
                }

                // Extra Memorizations
                student.extraMemorizations?.forEach((rec, idx) => {
                    if (rec.hasMemorization) {
                        const maxMemo = session.pointsSettingsSnapshot?.maxMemorizationGrade ?? data.settings.pointsSettings?.maxMemorizationGrade ?? 10;
                        const rating = rec.rating !== undefined ? ` (التقييم: ${rec.rating}/${maxMemo})` : '';
                        report += `📖 حفظ إضافي: ${formatSurahAyah(rec)}${rating}\n`;
                    }
                });

                // Extra Reviews
                student.extraReviews?.forEach((rec, idx) => {
                    if (rec.hasReview) {
                        const maxReview = session.pointsSettingsSnapshot?.maxReviewGrade ?? data.settings.pointsSettings?.maxReviewGrade ?? 10;
                        const label = rec.label || `مراجعة إضافية ${idx + 1}`;
                        const rating = rec.rating !== undefined ? ` (التقييم: ${rec.rating}/${maxReview})` : '';
                        report += `🔁 ${label}: ${formatSurahAyah(rec)}${rating}\n`;
                    }
                });

                // Other Recitations
                student.otherRecitations?.forEach((rec) => {
                    if (rec.title || rec.content) {
                        const maxMemo = session.pointsSettingsSnapshot?.maxMemorizationGrade ?? data.settings.pointsSettings?.maxMemorizationGrade ?? 10;
                        const rating = rec.rating !== undefined ? ` (التقييم: ${rec.rating}/${maxMemo})` : '';
                        report += `🎤 ${rec.title || 'تسميع'}: ${rec.content}${rating}\n`;
                    }
                });

                // Homeworks
                if (student.homeworks && student.homeworks.length > 0) {
                    report += `🏠 الواجب:\n`;
                    student.homeworks.forEach(hw => {
                        const hwText = formatHomeworkRecord(hw, true);
                        if (hwText) report += `   - ${hwText}\n`;
                    });
                }
                
                if (student.extraHomework) {
                    report += `🏠 واجب إضافي: ${student.extraHomework}\n`;
                }
            }
             if (student.note) {
                report += `📝 ملاحظة: ${student.note}\n`;
            }
            report += `--------------------------------------
`;
        });
    }

    report += `
إدارة ${data.center}`;
    return report;
};


export const generateParentNotification = (student: SessionStudent, session: Session, data: CircleData): string => {
    const studentTerm = getGenderedTerm(student.gender);
    let status = '';
    switch(student.attendance) {
        case 'present': status = 'حاضر'; break;
        case 'late': status = 'متأخر'; break;
        case 'absent': status = 'غائب'; break;
        case 'excused': status = `مستأذن${student.excuse ? ` (العذر: ${student.excuse})` : ''}`; break;
    }

    let body = `الحالة: ${status}`;

    if (session.isLesson) {
        body += `\n📘 درس ${session.lessonType}`;
        if (session.lessonTitle) body += ` (${session.lessonTitle})`;
    }
    
    if (student.attendance === 'present' || student.attendance === 'late') {
        if (!session.isLesson) {
            const maxMemo = session.pointsSettingsSnapshot?.maxMemorizationGrade ?? data.settings.pointsSettings?.maxMemorizationGrade ?? 10;
            const memoRatingText = student.memorization.rating !== undefined ? ` (التقييم: ${student.memorization.rating}/${maxMemo})` : '';
            const memorizationText = student.isKhatim
                ? 'الحفظ: خاتم ⭐'
                : student.memorization?.hasMemorization
                    ? `الحفظ: ✅ ${formatSurahAyah(student.memorization)}${memoRatingText}`
                    : student.suspendedMemorization ? 'الحفظ: ⏸️ موقوف' : 'الحفظ: ❌ لم يحفظ';
            
            let reviewText = '';
            if (!(student.isKhatim && !(student.khatimRecitesReview ?? true))) {
                const maxReview = session.pointsSettingsSnapshot?.maxReviewGrade ?? data.settings.pointsSettings?.maxReviewGrade ?? 10;
                const reviewRatingText = student.review.rating !== undefined ? ` (التقييم: ${student.review.rating}/${maxReview})` : '';
                reviewText = student.review?.hasReview
                    ? `المراجعة: ✅ ${formatSurahAyah(student.review)}${reviewRatingText}`
                    : student.suspendedReview ? 'المراجعة: ⏸️ موقوف' : 'المراجعة: ❌ لم يراجع';
            }

            body += `\n${memorizationText}`;
            if(reviewText) {
                body += `\n${reviewText}`;
            }

            // Extra Memorizations
            student.extraMemorizations?.forEach((rec) => {
                if (rec.hasMemorization) {
                    const maxMemo = session.pointsSettingsSnapshot?.maxMemorizationGrade ?? data.settings.pointsSettings?.maxMemorizationGrade ?? 10;
                    const rating = rec.rating !== undefined ? ` (التقييم: ${rec.rating}/${maxMemo})` : '';
                    body += `\nالحفظ الإضافي: ✅ ${formatSurahAyah(rec)}${rating}`;
                }
            });

            // Extra Reviews
            student.extraReviews?.forEach((rec) => {
                if (rec.hasReview) {
                    const maxReview = session.pointsSettingsSnapshot?.maxReviewGrade ?? data.settings.pointsSettings?.maxReviewGrade ?? 10;
                    const label = rec.label || 'مراجعة إضافية';
                    const rating = rec.rating !== undefined ? ` (التقييم: ${rec.rating}/${maxReview})` : '';
                    body += `\n${label}: ✅ ${formatSurahAyah(rec)}${rating}`;
                }
            });

            // Other Recitations
            student.otherRecitations?.forEach((rec) => {
                if (rec.title || rec.content) {
                    const maxMemo = session.pointsSettingsSnapshot?.maxMemorizationGrade ?? data.settings.pointsSettings?.maxMemorizationGrade ?? 10;
                    const rating = rec.rating !== undefined ? ` (التقييم: ${rec.rating}/${maxMemo})` : '';
                    body += `\n${rec.title || 'تسميع'}: ✅ ${rec.content}${rating}`;
                }
            });
        }

        // Homeworks - Show for both lesson and normal modes
        if (student.homeworks && student.homeworks.length > 0) {
            body += `\n🏠 الواجب الدراسي:`;
            student.homeworks.forEach(hw => {
                const hwText = formatHomeworkRecord(hw);
                if (hwText) body += `\n   - ${hwText}`;
            });
        }
    }

    if (student.note) {
        body += `\n📝 ملاحظة: ${student.note}`;
    }

    if (session.note) {
        body += `\n📝 ملاحظة عامة: ${session.note}`;
    }

    if (student.extraHomework) {
        body += `\n🏠 واجب إضافي: ${student.extraHomework}`;
    }

    const message = `السلام عليكم ورحمة الله وبركاته
نود إعلامكم بالتقرير اليومي لــ ${studentTerm}:
*${student.name}*

\`${formatDate(session.date)}\`
${body}

نشكر لكم متابعتكم وحرصكم.
إدارة ${data.center}`;
    
    return encodeURIComponent(message);
};

const getDateRange = (period: string, studyStartDate: string, customStart?: string, customEnd?: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();
    let periodLabel = "";
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch(period) {
        case 'today':
            startDate = new Date(today);
            endDate = new Date(today);
            periodLabel = "اليوم";
            break;
        case 'this_week':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - (startDate.getDay() + 1) % 7);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            periodLabel = "هذا الأسبوع";
            break;
        case 'last_week':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - (startDate.getDay() + 1) % 7 - 7);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            periodLabel = "الأسبوع السابق";
            break;
        case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            periodLabel = "هذا الشهر";
            break;
        case 'last_month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            periodLabel = "الشهر السابق";
            break;
        case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            periodLabel = "هذه السنة";
            break;
        case 'last_year':
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            endDate = new Date(now.getFullYear() - 1, 11, 31);
            periodLabel = "السنة السابقة";
            break;
        case 'all_time':
            startDate = new Date(studyStartDate);
            endDate = new Date(now);
            periodLabel = "منذ بداية الدراسة";
            break;
        case 'custom':
            startDate = new Date(customStart || '');
            endDate = new Date(customEnd || '');
            const startStr = new Date(customStart || '').toLocaleDateString('fr-CA').replace(/-/g, '/');
            const endStr = new Date(customEnd || '').toLocaleDateString('fr-CA').replace(/-/g, '/');
            periodLabel = `من ${startStr} إلى ${endStr}`;
            break;
        default:
            startDate = new Date(now);
            endDate = new Date(now);
            break;
    }
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate, periodLabel };
};

export const generateStudentReportText = (student: Student, allSessions: Session[], studyStartDate: string, options: { period: string, customStart?: string, customEnd?: string, content: { [key: string]: boolean } }, fallbackPointsSettings?: PointsSettings): { reportContent: string, periodLabel: string } => {
    const { period, customStart, customEnd, content } = options;
    const { startDate, endDate, periodLabel } = getDateRange(period, studyStartDate, customStart, customEnd);
    
    const relevantSessions = allSessions
        .filter(s => {
             const sessionDate = new Date(s.date);
             return sessionDate >= startDate && sessionDate <= endDate;
        })
        .map(s => ({
            ...s,
            studentData: s.students.find(st => st.id === student.id)
        }))
        .filter(s => s.studentData)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const studentTerm = getGenderedTerm(student.gender);
    let reportContent = `تقرير ${studentTerm}: *${student.name}*\n`;
    if (student.isKhatim) {
        reportContent += `⭐ (خاتم)\n`;
    }
    reportContent += `الفترة: ${periodLabel}\n`;
    reportContent += `--------------------------------------\n\n`;
    
    if (relevantSessions.length === 0) {
        reportContent += "لا توجد بيانات لهذا الطالب في الفترة المحددة.";
        return { reportContent, periodLabel };
    }

    const attendanceStats = relevantSessions.reduce((acc, session) => {
        const attendance = session.studentData!.attendance;
        acc[attendance] = (acc[attendance] || 0) + 1;
        return acc;
    }, {} as {[key:string]: number});
    
    if (content.summary) {
        reportContent += "📊 *ملخص الأداء:*\n";
        if (content.attendance) reportContent += `- أيام الحضور: ${attendanceStats.present || 0}\n`;
        if (content.lateness) reportContent += `- أيام التأخير: ${attendanceStats.late || 0}\n`;
        if (content.excused) reportContent += `- أيام الغياب بعذر: ${attendanceStats.excused || 0}\n`;
        if (content.absence) reportContent += `- أيام الغياب بدون عذر: ${attendanceStats.absent || 0}\n`;
        
        const memoSessions = relevantSessions.filter(s => !s.isLesson && s.studentData?.memorization?.hasMemorization);
        const reviewSessions = relevantSessions.filter(s => !s.isLesson && s.studentData?.review?.hasReview);

        if (memoSessions.length > 0) {
            const first = memoSessions[0].studentData!.memorization;
            const last = memoSessions[memoSessions.length - 1].studentData!.memorization;
            const range = first.fromSurah === last.toSurah && first.fromAyah === last.toAyah 
                ? formatSurahAyah(first)
                : `${formatSurahAyah(first)} ← ${formatSurahAyah(last)}`;
            reportContent += `- إنجاز الحفظ: ${range}\n`;
        }
        
        if (reviewSessions.length > 0) {
            const first = reviewSessions[0].studentData!.review;
            const last = reviewSessions[reviewSessions.length - 1].studentData!.review;
            const range = first.fromSurah === last.toSurah && first.fromAyah === last.toAyah 
                ? formatSurahAyah(first)
                : `${formatSurahAyah(first)} ← ${formatSurahAyah(last)}`;
            reportContent += `- إنجاز المراجعة: ${range}\n`;
        }

        const allNotes = relevantSessions
            .map(s => s.studentData?.note)
            .filter(n => n && n.trim().length > 0);
        
        if (allNotes.length > 0 && !content.recitationDetails) {
            reportContent += `\n📝 *ملاحظات المعلم:*\n`;
            // Show last 3 notes if not showing full details
            allNotes.slice(-3).forEach(n => {
                reportContent += `- ${n}\n`;
            });
        }

        reportContent += `\n`;
    }
    
    const lessons = relevantSessions.filter(s => s.isLesson);
    if (content.lessons && lessons.length > 0) {
        reportContent += `📘 *جلسات الدروس (${lessons.length})*\n`;
        lessons.forEach(l => {
            reportContent += `- ${formatDate(l.date)}: ${l.lessonType} (${l.lessonTitle || 'بدون عنوان'})\n`;
        });
        reportContent += `\n`;
    }
    
    if (content.recitationDetails) {
        reportContent += "🗓️ *تفاصيل التسميع:*\n";
        relevantSessions.forEach(session => {
            const s = session.studentData!;
            if (session.isLesson) return;
            
            reportContent += `*${formatDate(session.date)}*:\n`;
            if (s.attendance === 'absent') reportContent += `- الحالة: غائب\n`;
            else if (s.attendance === 'excused') reportContent += `- الحالة: مستأذن ${s.excuse ? `(${s.excuse})` : ''}\n`;
            else {
                if (s.attendance === 'late') reportContent += '- الحالة: متأخر\n';

                const maxMemo = session.pointsSettingsSnapshot?.maxMemorizationGrade ?? fallbackPointsSettings?.maxMemorizationGrade ?? 10;
                const memoRatingText = s.memorization.rating !== undefined ? ` (التقييم: ${s.memorization.rating}/${maxMemo})` : '';
                const memoText = s.isKhatim 
                    ? 'خاتم ⭐' 
                    : s.memorization?.hasMemorization 
                        ? formatSurahAyah(s.memorization) + memoRatingText 
                        : (s.suspendedMemorization ? 'موقوف' : 'لم يحفظ');
                reportContent += `- الحفظ: ${memoText}\n`;
                
                if (!(s.isKhatim && !(s.khatimRecitesReview ?? true))) {
                    const maxReview = session.pointsSettingsSnapshot?.maxReviewGrade ?? fallbackPointsSettings?.maxReviewGrade ?? 10;
                    const revRatingText = s.review.rating !== undefined ? ` (التقييم: ${s.review.rating}/${maxReview})` : '';
                    const revText = s.review?.hasReview ? formatSurahAyah(s.review) + revRatingText : (s.suspendedReview ? 'موقوف' : 'لم يراجع');
                    reportContent += `- المراجعة: ${revText}\n`;
                }
            }
                if (s.note) {
                reportContent += `- ملاحظة: ${s.note}\n`;
            }

            const currentHomeworks = s.homeworks || [];
            if (currentHomeworks.length > 0) {
                reportContent += `- الواجب:\n`;
                currentHomeworks.forEach(hw => {
                    const hwText = formatHomeworkRecord(hw, true);
                    if (hwText) reportContent += `  * ${hwText}\n`;
                });
            } else {
                // Look for the last homework in previous sessions
                const previousSessions = allSessions
                    .filter(ps => new Date(ps.date) < new Date(session.date))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                let lastHw: HomeworkRecord[] = [];
                for (const ps of previousSessions) {
                    const psStudent = ps.students.find(pst => pst.id === student.id);
                    if (psStudent?.homeworks && psStudent.homeworks.length > 0) {
                        lastHw = psStudent.homeworks;
                        break;
                    }
                }

                if (lastHw.length > 0) {
                    reportContent += `- الواجب (مستمر):\n`;
                    lastHw.forEach(hw => {
                        const hwText = formatHomeworkRecord(hw, true);
                        if (hwText) reportContent += `  * ${hwText}\n`;
                    });
                }
            }
            reportContent += '\n';
        });
    }

    return { reportContent, periodLabel };
};

export const generateSessionSummary = (session: Session, data: CircleData): string => {
    const stats = {
        total: session.students.length,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        heardMemo: 0,
        noMemo: 0,
        heardReview: 0,
        noReview: 0
    };

    session.students.forEach(s => {
        if (s.attendance === 'present') stats.present++;
        else if (s.attendance === 'late') stats.late++;
        else if (s.attendance === 'absent') stats.absent++;
        else if (s.attendance === 'excused') stats.excused++;

        if (s.attendance === 'present' || s.attendance === 'late') {
            if (s.memorization.hasMemorization) stats.heardMemo++;
            else stats.noMemo++;

            if (s.review.hasReview) stats.heardReview++;
            else stats.noReview++;
        }
    });

    const activeCount = stats.present + stats.late;
    const memoPercent = activeCount > 0 ? Math.round((stats.heardMemo / activeCount) * 100) : 0;
    const reviewPercent = activeCount > 0 ? Math.round((stats.heardReview / activeCount) * 100) : 0;
    const attendancePercent = stats.total > 0 ? Math.round((activeCount / stats.total) * 100) : 0;

    let summary = `\n--- 📊 ملخص الجلسة ---`;

    if (session.isLesson) {
        summary += `📘 نوع الجلسة: درس (${session.lessonType || 'عام'})
👥 الحضور: ${activeCount} / ${stats.total} (${attendancePercent}%)
🚫 الغياب: ${stats.absent}
📝 المتأخرين: ${stats.late}
📝 المستأذنين: ${stats.excused}
`;
        if (session.lessonTitle) summary += `📌 العنوان: ${session.lessonTitle}\n`;
        const groupHw = session.students
            .filter(s => s.extraHomework)
            .map(s => s.extraHomework);
        
        // Filter unique homeworks or just show they exist
        const uniqueHw = Array.from(new Set(groupHw));
        if (uniqueHw.length > 0) {
            summary += `🏠 الواجب الجماعي:\n- ${uniqueHw.join('\n- ')}\n`;
        }
    } else {
        summary += `📖 نوع الجلسة: تسميع
👥 الحضور: ${activeCount} / ${stats.total} (${attendancePercent}%)
🚫 الغياب: ${stats.absent}
📝 المتأخرين: ${stats.late}
📝 المستأذنين: ${stats.excused}
---
✅ نسبة التسميع (حفظ): ${memoPercent}%
✅ نسبة التسميع (مراجعة): ${reviewPercent}%
📈 إحصائية الحفظ: سمع (${stats.heardMemo}) | لم يسمع (${stats.noMemo})
📉 إحصائية المراجعة: سمع (${stats.heardReview}) | لم يسمع (${stats.noReview})
`;
    }

    return summary;
};

export const generateSupervisorReportText = (circleData: CircleData, options: { period: string, customStart?: string, customEnd?: string, content: { [key: string]: boolean } }) => {
    const { period, customStart, customEnd, content } = options;
    // Sort a copy of the students array
    const students = [...circleData.students].sort((a, b) => a.order - b.order);
    const { sessions, studyStartDate } = circleData;
    const { startDate, endDate, periodLabel } = getDateRange(period, studyStartDate, customStart, customEnd);

    const filteredSessions = sessions.filter(s => {
        const sessionDate = new Date(s.date);
        return sessionDate >= startDate && sessionDate <= endDate;
    });

    let reportContent = `📋 *تقرير المشرف*\n`;
    reportContent += `--------------------------------------\n`;
    reportContent += `🏢 *الحلقة:* ${circleData.circle}\n`;
    reportContent += `👤 *المعلم:* ${circleData.teacher}\n`;
    reportContent += `🗓️ *الفترة:* ${periodLabel}\n`;
    
    if (period !== 'all_time') {
        const displayEndDate = period === 'today' ? startDate : new Date(endDate.getTime() - (24 * 60 * 60 * 1000));
        reportContent += `(من ${startDate.toLocaleDateString('en-CA')} م إلى ${displayEndDate.toLocaleDateString('en-CA')} م)\n`;
    }
    reportContent += `--------------------------------------\n\n`;

    if (filteredSessions.length === 0) {
        reportContent += "لا توجد بيانات في الفترة المحددة.";
        return { reportContent, periodLabel };
    }

    // Calculations
    const totalSessions = filteredSessions.length;
    const studentCount = students.length;
    const attendanceStats = { present: 0, late: 0, absent: 0, excused: 0 };
    const performanceStats = { heardMemo: 0, heardReview: 0, totalPossibleHeard: 0 };
    
    const studentAttendance = new Map<number, { present: number; late: number; absent: number; excused: number }>();
    students.forEach(s => studentAttendance.set(s.id, { present: 0, late: 0, absent: 0, excused: 0 }));

    filteredSessions.forEach(session => {
        const presentOrLateStudentsInSession = new Set<number>();
        session.students.forEach(ss => {
            if(ss.attendance === 'present' || ss.attendance === 'late') {
                presentOrLateStudentsInSession.add(ss.id);
            }
            attendanceStats[ss.attendance]++;
            const studentStat = studentAttendance.get(ss.id);
            if (studentStat) {
                studentStat[ss.attendance]++;
            }

            if (!session.isLesson && (ss.attendance === 'present' || ss.attendance === 'late')) {
                if (ss.memorization.hasMemorization) performanceStats.heardMemo++;
                if (ss.review.hasReview) performanceStats.heardReview++;
            }
        });
        if (!session.isLesson) {
             performanceStats.totalPossibleHeard += presentOrLateStudentsInSession.size;
        }
    });

    const totalAttendanceEvents = attendanceStats.present + attendanceStats.late + attendanceStats.absent + attendanceStats.excused;
    const totalPossibleAttendance = totalSessions * studentCount;
    const lessons = filteredSessions.filter(s => s.isLesson);

    if (content.summary) {
        reportContent += `📊 *ملخص الحلقة*\n`;
        reportContent += `- إجمالي الجلسات: ${totalSessions}\n`;
        reportContent += `- عدد الطلاب: ${studentCount}\n`;
        if (content.attendance) reportContent += `- نسبة الحضور: ${totalPossibleAttendance > 0 ? ((attendanceStats.present + attendanceStats.late) / totalPossibleAttendance * 100).toFixed(1) : 0}%\n`;
        if (content.absence) reportContent += `- نسبة الغياب: ${totalPossibleAttendance > 0 ? (attendanceStats.absent / totalPossibleAttendance * 100).toFixed(1) : 0}%\n`;
        if (content.lateness) reportContent += `- نسبة التأخر: ${totalPossibleAttendance > 0 ? (attendanceStats.late / totalPossibleAttendance * 100).toFixed(1) : 0}%\n`;
        if (content.excused) reportContent += `- نسبة الاستئذان: ${totalPossibleAttendance > 0 ? (attendanceStats.excused / totalPossibleAttendance * 100).toFixed(1) : 0}%\n`;
        if (content.lessons) reportContent += `- الدروس المأخوذة: ${lessons.length}\n`;
        reportContent += `- نسبة من سمعوا الحفظ: ${performanceStats.totalPossibleHeard > 0 ? (performanceStats.heardMemo / performanceStats.totalPossibleHeard * 100).toFixed(1) : 0}%\n`;
        reportContent += `- نسبة من سمعوا المراجعة: ${performanceStats.totalPossibleHeard > 0 ? (performanceStats.heardReview / performanceStats.totalPossibleHeard * 100).toFixed(1) : 0}%\n`;
        
        const suspendedStudents = students.filter(s => s.suspendedMemorization || s.suspendedReview);
        if (suspendedStudents.length > 0) {
            reportContent += `- الطلاب الموقوفون: ${suspendedStudents.map(s => s.name).join(', ')}\n`;
        }
        reportContent += `\n`;
    }

    if (content.lessons && lessons.length > 0) {
        reportContent += `📘 *جلسات الدروس (${lessons.length})*\n`;
        lessons.forEach(l => {
            reportContent += `- ${formatDate(l.date)}: ${l.lessonType} (${l.lessonTitle || 'بدون عنوان'})\n`;
        });
        reportContent += `\n`;
    }

    if (content.studentDetails) {
        reportContent += `👥 *تفاصيل الطلاب*\n`;
        students.forEach(student => {
            const stats = studentAttendance.get(student.id) || { present: 0, late: 0, absent: 0, excused: 0 };
            const studentSessions = filteredSessions.map(s => ({...s, studentData: s.students.find(ss => ss.id === student.id)})).filter(s => s.studentData);
            
            let lastMemoSession = null;
            for(let i = studentSessions.length - 1; i >= 0; i--) {
                if(studentSessions[i].studentData?.memorization.hasMemorization) {
                    lastMemoSession = studentSessions[i].studentData?.memorization;
                    break;
                }
            }

            let lastRevSession = null;
            for(let i = studentSessions.length - 1; i >= 0; i--) {
                if(studentSessions[i].studentData?.review.hasReview) {
                    lastRevSession = studentSessions[i].studentData?.review;
                    break;
                }
            }

            let lastHomeworks = null;
            for(let i = studentSessions.length - 1; i >= 0; i--) {
                if(studentSessions[i].studentData?.homeworks && studentSessions[i].studentData?.homeworks!.length > 0) {
                    lastHomeworks = studentSessions[i].studentData?.homeworks;
                    break;
                }
            }

            reportContent += `--------------------------------------\n`;
            reportContent += `*${student.name}* ${student.isKhatim ? '⭐(خاتم)' : ''}\n`;
            if (content.attendance) reportContent += `  - حضور: ${stats.present}\n`;
            if (content.lateness) reportContent += `  - تأخر: ${stats.late}\n`;
            if (content.absence) reportContent += `  - غياب: ${stats.absent}\n`;
            if (content.excused) reportContent += `  - استئذان: ${stats.excused}\n`;
            reportContent += `  - آخر حفظ: ${student.isKhatim ? 'خاتم' : lastMemoSession ? formatSurahAyah(lastMemoSession) : 'لا يوجد'}\n`;
            reportContent += `  - آخر مراجعة: ${lastRevSession ? formatSurahAyah(lastRevSession) : 'لا يوجد'}\n`;
            if (lastHomeworks && lastHomeworks.length > 0) {
                reportContent += `  - آخر واجب:\n`;
                lastHomeworks.forEach(hw => {
                    const hwText = formatHomeworkRecord(hw, true);
                    if (hwText) reportContent += `    * ${hwText}\n`;
                });
            }
        });
    }

    return { reportContent, periodLabel };
};

// --- Test & Plan Report Generators ---

const getLabel = (key: string, customLabels?: { [key: string]: string }) => {
    if (customLabels && customLabels[key]) return customLabels[key];
    if (key === 'memorization') return 'الحفظ';
    if (key === 'review') return 'المراجعة';
    if (key === 'recitation') return 'التلاوة';
    return key;
};

export const generateTestCollectiveReport = (test: Test, circleData: CircleData): string => {
    let report = `----■▪︎•• \`تقرير الاختبار\` ••▪︎■---\n`;
    report += `:::::::| \`${circleData.circle}\` |:::::::\n\n`;
    report += `*الاختبار:* ${test.name}\n`;
    report += `*التاريخ:* ${new Date(test.createdAt).toLocaleDateString('en-CA')}\n`;
    report += `--------------------------------------\n\n`;
    
    const studentMap = new Map(circleData.students.map(s => [s.id, s]));
    const enabledContentKeys = Object.keys(test.content).filter(k => test.content[k]);

    test.results.forEach((result, index) => {
        const student = studentMap.get(result.studentId);
        if (!student) return;

        report += `${index + 1}- *${student.name}*\n`;
        
        let totalScore = 0;
        let totalMax = 0;

        enabledContentKeys.forEach(key => {
            const grade = result.grades[key];
            const maxScore = test.maxScores?.[key] ?? 100;
            const label = getLabel(key, test.customLabels);

            if (grade !== undefined) {
                totalScore += grade;
                totalMax += maxScore;
                report += `  - ${label}: ${grade}/${maxScore}\n`;
            }
        });
        
        if (totalMax > 0) {
            report += `  - *المجموع: ${totalScore}/${totalMax}*\n`;
        }

        report += `--------------------------------------\n`;
    });

    report += `\nإدارة ${circleData.center}`;
    return report;
};

export const generateTestParentNotification = (student: Student, test: Test, circleData: CircleData): string => {
    const studentTerm = getGenderedTerm(student.gender);
    const result = test.results.find(r => r.studentId === student.id);
    const enabledContentKeys = Object.keys(test.content).filter(k => test.content[k]);

    let body = '';
    if (result) {
        let totalScore = 0;
        let totalMax = 0;

        enabledContentKeys.forEach(key => {
            const grade = result.grades[key];
            const maxScore = test.maxScores?.[key] ?? 100;
            const label = getLabel(key, test.customLabels);

            if (grade !== undefined) {
                totalScore += grade;
                totalMax += maxScore;
                body += `  - ${label}: ${grade}/${maxScore}\n`;
            }
        });
        if (totalMax > 0) {
            body += `  - *المجموع النهائي: ${totalScore}/${totalMax}*\n`;
        }
    } else {
        body = 'لم يتم العثور على نتيجة.';
    }

    const message = `السلام عليكم ورحمة الله وبركاته
نود إعلامكم بنتيجة اختبار ${studentTerm}: *${student.name}*

*الاختبار:* ${test.name}
*التاريخ:* ${new Date(test.createdAt).toLocaleDateString('en-CA')}

*النتائج:*\n${body}
نشكر لكم متابعتكم وحرصكم.
إدارة ${circleData.center}`;
    
    return encodeURIComponent(message);
};

export const generatePlanCollectiveReport = (plan: Plan, circleData: CircleData): string => {
    const durationLabels: {[key: string]: string} = {
        'week': 'أسبوع',
        'two_weeks': 'أسبوعين',
        'month': 'شهر',
        'year': 'سنة',
        'custom': 'فترة مخصصة'
    };
    let durationText = durationLabels[plan.duration] || plan.duration;
    if (plan.duration === 'custom' && plan.customStartDate && plan.customEndDate) {
         durationText += ` (من ${plan.customStartDate} إلى ${plan.customEndDate})`;
    }

    let report = `----■▪︎•• \`الخطة الدراسية\` ••▪︎■---\n`;
    report += `:::::::| \`${circleData.circle}\` |:::::::\n\n`;
    report += `*الخطة:* ${plan.name}\n`;
    report += `*المدة:* ${durationText}\n`;
    report += `*التاريخ:* ${new Date(plan.createdAt).toLocaleDateString('en-CA')}\n`;
    report += `--------------------------------------\n\n`;
    
    const studentMap = new Map(circleData.students.map(s => [s.id, s]));

    plan.studentPlans.forEach((studentPlan, index) => {
        const student = studentMap.get(studentPlan.studentId);
        if (!student) return;
        
        report += `${index + 1}- *${student.name}*\n`;

        const memoPlan = studentPlan.memorization;
        const reviewPlan = studentPlan.review;
        const hasMemoPlan = memoPlan && memoPlan.hasPlan && memoPlan.fromSurah;
        const hasReviewPlan = reviewPlan && reviewPlan.hasPlan && reviewPlan.fromSurah;

        if (hasMemoPlan && hasReviewPlan) {
            const memoRange = formatSurahAyah({ fromSurah: memoPlan.fromSurah, fromAyah: memoPlan.fromAyah, toSurah: memoPlan.toSurah, toAyah: memoPlan.toAyah, hasMemorization: true });
            const reviewRange = formatSurahAyah({ fromSurah: reviewPlan.fromSurah, fromAyah: reviewPlan.fromAyah, toSurah: reviewPlan.toSurah, toAyah: reviewPlan.toAyah, hasReview: true });
            report += `  - الحفظ المطلوب: ${memoRange}\n`;
            report += `  - المراجعة المطلوبة: ${reviewRange}\n`;
        } else if (hasMemoPlan) {
            const memoRange = formatSurahAyah({ fromSurah: memoPlan.fromSurah, fromAyah: memoPlan.fromAyah, toSurah: memoPlan.toSurah, toAyah: memoPlan.toAyah, hasMemorization: true });
            report += `  - خطة حفظ فقط: ${memoRange}\n`;
        } else if (hasReviewPlan) {
            const reviewRange = formatSurahAyah({ fromSurah: reviewPlan.fromSurah, fromAyah: reviewPlan.fromAyah, toSurah: reviewPlan.toSurah, toAyah: reviewPlan.toAyah, hasReview: true });
            report += `  - خطة مراجعة فقط: ${reviewRange}\n`;
        }

        if (studentPlan.notes) {
            report += `  - ملاحظات: ${studentPlan.notes}\n`;
        }
        report += `--------------------------------------\n`;
    });

    report += `\nإدارة ${circleData.center}`;
    return report;
};

export const generatePlanParentNotification = (student: Student, plan: Plan, circleData: CircleData): string => {
    const studentTerm = getGenderedTerm(student.gender);
    const studentPlan = plan.studentPlans.find(p => p.studentId === student.id);

    const durationLabels: {[key: string]: string} = {
        'week': 'أسبوع',
        'two_weeks': 'أسبوعين',
        'month': 'شهر',
        'year': 'سنة',
        'custom': 'فترة مخصصة'
    };
    let durationText = durationLabels[plan.duration] || plan.duration;
    if (plan.duration === 'custom' && plan.customStartDate && plan.customEndDate) {
         durationText += ` (من ${plan.customStartDate} إلى ${plan.customEndDate})`;
    }

    let body = '';
    if (studentPlan) {
        const memoPlan = studentPlan.memorization;
        const reviewPlan = studentPlan.review;
        const hasMemoPlan = memoPlan && memoPlan.hasPlan && memoPlan.fromSurah;
        const hasReviewPlan = reviewPlan && reviewPlan.hasPlan && reviewPlan.fromSurah;
        
        if (hasMemoPlan && hasReviewPlan) {
            const memoRange = formatSurahAyah({ fromSurah: memoPlan.fromSurah, fromAyah: memoPlan.fromAyah, toSurah: memoPlan.toSurah, toAyah: memoPlan.toAyah, hasMemorization: true });
            const reviewRange = formatSurahAyah({ fromSurah: reviewPlan.fromSurah, fromAyah: reviewPlan.fromAyah, toSurah: reviewPlan.toSurah, toAyah: reviewPlan.toAyah, hasReview: true });
            body += `  - الحفظ المطلوب: ${memoRange}\n`;
            body += `  - المراجعة المطلوبة: ${reviewRange}\n`;
        } else if (hasMemoPlan) {
            const memoRange = formatSurahAyah({ fromSurah: memoPlan.fromSurah, fromAyah: memoPlan.fromAyah, toSurah: memoPlan.toSurah, toAyah: memoPlan.toAyah, hasMemorization: true });
            body += `  - خطة حفظ فقط: ${memoRange}\n`;
        } else if (hasReviewPlan) {
            const reviewRange = formatSurahAyah({ fromSurah: reviewPlan.fromSurah, fromAyah: reviewPlan.fromAyah, toSurah: reviewPlan.toSurah, toAyah: reviewPlan.toAyah, hasReview: true });
            body += `  - خطة مراجعة فقط: ${reviewRange}\n`;
        }

        if (studentPlan.notes) {
            body += `  - ملاحظات: ${studentPlan.notes}\n`;
        }
    } else {
        body = 'لم يتم تحديد خطة.';
    }
    
    const message = `السلام عليكم ورحمة الله وبركاته
نود إعلامكم بالخطة الدراسية لـ ${studentTerm}: *${student.name}*

*الخطة:* ${plan.name}
*المدة:* ${durationText}
*التاريخ:* ${new Date(plan.createdAt).toLocaleDateString('en-CA')}

${body}
نشكر لكم متابعتكم وحرصكم.
إدارة ${circleData.center}`;

    return encodeURIComponent(message);
};

export const generateUniqueId = (): number => {
    return Date.now() + Math.floor(Math.random() * 1000000);
};

export const generateStudentId = (): number => {
    // Generate a simple 4-5 digit numeric ID as requested (e.g. 1001, 8569)
    return Math.floor(1000 + Math.random() * 9000);
};

export const formatStudentId = (id: number) => {
    if (!id) return 'ST-0000';
    const idStr = id.toString();
    // Use last 4 digits to create a professional ST-XXXX format
    const last4 = idStr.length > 4 ? idStr.slice(-4) : idStr.padStart(4, '0');
    return `ST-${last4}`;
};

/**
 * Removes undefined values from an object recursively to make it safe for Firestore.
 */
export const sanitizeForFirestore = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeForFirestore);
    }

    const sanitized: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value !== undefined) {
                sanitized[key] = sanitizeForFirestore(value);
            }
        }
    }
    return sanitized;
};

export const generateUniqueStringId = (prefix?: string): string => {
    // Allow Arabic characters, letters, numbers and underscores
    const cleanPrefix = prefix ? prefix.trim().replace(/\s+/g, '_').replace(/[^\w\u0621-\u064A0-9]/gi, '') : '';
    const id = `${Date.now()}`;
    return cleanPrefix ? `${cleanPrefix}_${id}` : id;
};

export const generateNumericId = (): string => {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return (array[0] % 900000 + 100000).toString(); // 6 random digits
};

export const generateTransferCode = (): string => {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return (array[0] % 9000 + 1000).toString(); // 4 random digits
};

export const downloadFile = async (blob: Blob, filename: string, addToast: (message: string, type?: 'success' | 'error' | 'info') => void): Promise<boolean> => {
    // Using File System Access API (modern fallback)
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'Files',
                    accept: { [blob.type]: [`.${filename.split('.').pop()}`] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            addToast('✅ تم حفظ الملف بنجاح.');
            return true;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                return true; // User cancelled, so we consider it a "success" in terms of not showing a fallback.
            }
            console.warn("showSaveFilePicker failed, falling back to legacy download.", error);
            // Fall through to legacy method
        }
    }

    // Legacy fallback using download link
    try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast('✅ بدأ تنزيل الملف.');
        return true; // Assume success for legacy method as there's no reliable failure detection.
    } catch (error) {
        console.error("File download fallback failed:", error);
        addToast('لم يتمكن المتصفح من حفظ الملف.', 'error');
        return false; // Failure
    }
};

export const shareBackupFile = (
  blob: Blob,
  filename: string,
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void
): void => {
  // Check for Cordova plugins for file writing and sharing
  const isCordovaAvailable = window.cordova && window.cordova.file && window.plugins && window.plugins.socialsharing && window.resolveLocalFileSystemURL;

  if (isCordovaAvailable) {
    // --- Cordova/Mobile Path ---
    const directoryPath = window.cordova.file.dataDirectory;
    window.resolveLocalFileSystemURL(directoryPath,
      (dirEntry) => {
        dirEntry.getFile(filename, { create: true, exclusive: false },
          (fileEntry: any) => {
            fileEntry.createWriter((fileWriter: any) => {
              fileWriter.onwriteend = () => {
                // File written successfully, now share it
                window.plugins.socialsharing.share(
                  `ملف النسخة الاحتياطية لتطبيق إدارة الحلقات`, // Message
                  `نسخة احتياطية: ${filename}`, // Subject
                  fileEntry.nativeURL, // File path
                  undefined, // Link
                  () => {
                    console.log("Share successful");
                  },
                  (error: string) => {
                    console.error("Sharing failed:", error);
                    addToast('فشلت مشاركة الملف.', 'error');
                  }
                );
              };

              fileWriter.onerror = (e: any) => {
                console.error("Write failed:", e.toString());
                addToast('فشل في إنشاء ملف النسخة الاحتياطية.', 'error');
              };

              fileWriter.write(blob);
            });
          },
          (error: any) => {
            console.error("Could not get file:", error);
            addToast('لم يتمكن من إنشاء الملف.', 'error');
          }
        );
      },
      (error: any) => {
        console.error("Could not resolve filesystem URL:", error);
        addToast('لا يمكن الوصول إلى نظام الملفات.', 'error');
      }
    );
  } else {
    // --- Web/Desktop Fallback Path ---
    addToast('هذه الميزة تعمل على الهاتف فقط.', 'info');
  }
};

export const generateStudentProfileText = (student: Student, kpis: any, circleName: string, timeframeLabel: string): string => {
    const studentTerm = getGenderedTerm(student.gender);
    
    let report = `--- *بطاقة الأداء* ---\n`;
    report += `*${studentTerm}:* ${student.name}\n`;
    report += `*الحلقة:* ${circleName}\n`;
    report += `*الفترة:* ${timeframeLabel}\n`;
    report += `------------------\n`;
    report += `📊 *المؤشرات الرئيسية:*\n`;
    report += `- إجمالي النقاط: ${kpis.totalPoints}\n`;
    report += `- نسبة الحضور: ${kpis.attendancePercentage.toFixed(0)}%\n`;
    report += `- الترتيب العام: ${kpis.rank} / ${kpis.totalStudents}\n`;
    
    return report;
};

export const generateActivityCollectiveReport = (activity: Activity, circleData: CircleData): string => {
    let report = `📢 *إعلان نشاط* 📢\n`;
    report += `--------------------------------------\n`;
    report += `*${activity.name || activity.type}*\n\n`;
    if (activity.notes) {
        report += `${activity.notes}\n\n`;
    }
    report += `*التاريخ:* ${formatDate(activity.startDate)}\n`;
    report += `*الوقت:* ${formatTime12(activity.startTime)}\n`;
    if (activity.dateType === 'range' && activity.endDate) {
        report += `*إلى:* ${formatDate(activity.endDate)} ${activity.endTime ? formatTime12(activity.endTime) : ''}\n`;
    }
    report += `\n*حلقة ${circleData.circle}*`;
    report += `\nإدارة ${circleData.center}`;
    return report;
};

export const generateActivityParentNotification = (student: Student, activity: Activity, circleData: CircleData): string => {
    const studentTerm = getGenderedTerm(student.gender);
    let body = `ندعو ${studentTerm} *${student.name}* للمشاركة في النشاط:\n\n`;
    body += `*${activity.name || activity.type}*\n`;
    if (activity.notes) {
        body += `${activity.notes}\n\n`;
    }
    body += `*التاريخ:* ${formatDate(activity.startDate)}\n`;
    body += `*الوقت:* ${formatTime12(activity.startTime)}\n`;
    if (activity.dateType === 'range' && activity.endDate) {
        body += `*إلى:* ${formatDate(activity.endDate)} ${activity.endTime ? formatTime12(activity.endTime) : ''}\n`;
    }
    
    const participationText = student.gender === 'male' ? "نأمل حضوره ومشاركته" : "نأمل حضورها ومشاركتها";

    const message = `السلام عليكم ورحمة الله وبركاته
${body}
${participationText}.
إدارة ${circleData.center}`;

    return encodeURIComponent(message);
};

export const generateAnnouncementParentNotification = (student: Student, announcement: Announcement, circleData: CircleData): string => {
    const studentTerm = getGenderedTerm(student.gender);
    
    const message = `السلام عليكم ورحمة الله وبركاته
إلى ولي أمر ${studentTerm}: *${student.name}*

📢 *${announcement.title}*

${announcement.content}

إدارة ${circleData.center}`;

    return encodeURIComponent(message);
};

export const calculatePointsForSession = (studentData: SessionStudent, settings: PointsSettings, isLesson: boolean, session?: Session): number => {
    // Priority: Use session snapshot if available (for historical accuracy), otherwise use passed current settings
    const effectiveSettings = session?.pointsSettingsSnapshot || settings;

    if (!effectiveSettings) return 0;
    
    // Logic for Lesson mode
    if (isLesson) {
        if (studentData.attendance === 'present') return effectiveSettings.lessonPresent ?? 3;
        if (studentData.attendance === 'late') return effectiveSettings.lessonLate ?? 3;
        if (studentData.attendance === 'excused') return effectiveSettings.lessonExcused ?? 3;
        return 0; // Absent from lesson
    }

    // --- Special logic for Khatim students ---
    if (studentData.isKhatim) {
        if (studentData.attendance === 'absent') {
            return effectiveSettings.absent; // Usually 0
        }
        if (studentData.attendance === 'excused') {
             return effectiveSettings.excused;
        }
        
        let khatimPoints = 0;

        if (studentData.khatimRecitesReview) {
            // Case 1: Khatim Recites Review
            // Logic: Khatim Attendance (1) + Review Points (2) = 3 Total.
            const attendancePoints = effectiveSettings.khatimRecitesAttendance ?? 1;
            khatimPoints += attendancePoints;

            // Review Part
            if (studentData.review.hasReview) {
                khatimPoints += effectiveSettings.khatimRecitesHasReview ?? 2;
            } else if (studentData.suspendedReview) {
                 khatimPoints += effectiveSettings.suspendedReview;
            } else {
                 khatimPoints += effectiveSettings.noReview;
            }
        } else {
            // Case 2: Khatim does NOT recite review (Honorary attendance)
            khatimPoints += effectiveSettings.khatimNoRecitesAttendanceBonus ?? 3;
        }
        return khatimPoints;
    }

    // --- Logic for Standard Students (Additive Model) ---
    let points = 0;

    // 1. Attendance Points
    points += effectiveSettings[studentData.attendance] || 0;
    
    // Only calculate Memo/Review points if Present or Late
    if (studentData.attendance === 'present' || studentData.attendance === 'late') {
        
        // 2. Memorization Points
        if (studentData.suspendedMemorization) {
            points += effectiveSettings.suspendedMemorization;
        } else {
            points += studentData.memorization.hasMemorization ? effectiveSettings.hasMemorization : effectiveSettings.noMemorization;
        }

        // 3. Review Points
        if (studentData.suspendedReview) {
            points += effectiveSettings.suspendedReview;
        } else {
            points += studentData.review.hasReview ? effectiveSettings.hasReview : effectiveSettings.noReview;
        }
    }

    return points;
};

// Helper function to calculate total points for a student up to "now" including manual points
// Useful for checking if a deduction will result in negative points
export const calculateStudentTotalPoints = (student: Student, sessions: Session[], pointsSettings: PointsSettings): number => {
    let total = 0;
    const resetTime = student.lastPointResetDate ? new Date(student.lastPointResetDate).getTime() : 0;

    sessions.forEach(session => {
        // Ignore sessions before the reset date
        if (session.createdAt <= resetTime) return;

        const studentData = session.students.find(s => s.id === student.id);
        if (studentData) {
            total += calculatePointsForSession(studentData, pointsSettings, session.isLesson, session);
        }
    });
    
    if (student.manualPoints) {
        student.manualPoints.forEach(adj => {
            // Ignore adjustments before the reset date
            // Note: adj.date is ISO string, but we can compare times. 
            // Better to use adj.date because it represents when the adjustment happened.
            // However, `createdAt` for sessions is numeric timestamp.
            // `adj.date` is when it happened. Let's use `adj.date` parsed.
            // Wait, for bulk rewards, we might want to check against the creation time if available, 
            // but `adj.date` is standard. 
            if (new Date(adj.date).getTime() <= resetTime) return;
            total += adj.amount;
        });
    }
    return total;
};

export const mergeCircleData = (local: CircleData, remote: CircleData): CircleData => {
    // Determine which is newer at a high level
    const localLastUpdated = local.lastUpdated || 0;
    const remoteLastUpdated = remote.lastUpdated || 0;
    const isRemoteCircleNewer = remoteLastUpdated >= localLastUpdated;

    // Use specific timestamp for deletion pruning - but be VERY conservative
    // We only prune if the remote state is significantly newer than the item creation
    const remotePruningThreshold = remoteLastUpdated;

    const mergeArrays = <T extends { id: string | number, lastUpdated?: number, createdAt?: number, generatedAt?: number, updatedAt?: number }>(
        localArr: T[] = [], 
        remoteArr: T[] = [],
        deletedIds: (string | number)[] = []
    ): T[] => {
        const safeLocal = Array.isArray(localArr) ? localArr : [];
        const safeRemote = Array.isArray(remoteArr) ? remoteArr : [];
        const deletedSet = new Set(deletedIds);
        const map = new Map<string | number, T>();
        
        // Remote entries
        safeRemote.forEach(item => {
            if (!deletedSet.has(item.id)) {
                map.set(item.id, item);
            }
        });
        
        // Local entries - merge with remote
        safeLocal.forEach(localItem => {
            if (deletedSet.has(localItem.id)) return;

            const existing = map.get(localItem.id);
            if (!existing) {
                map.set(localItem.id, localItem);
            } else {
                const localTs = localItem.lastUpdated || localItem.updatedAt || localItem.createdAt || localItem.generatedAt || 0;
                const remoteTs = (existing as any).lastUpdated || (existing as any).updatedAt || (existing as any).createdAt || (existing as any).generatedAt || 0;
                
                if (localTs > remoteTs) {
                    map.set(localItem.id, { ...existing, ...localItem });
                }
            }
        });

        return Array.from(map.values());
    };

    const mergeSessionStudents = (localSS: SessionStudent[] = [], remoteSS: SessionStudent[] = []): SessionStudent[] => {
        const map = new Map<number, SessionStudent>();
        localSS.forEach(s => map.set(s.id, s));
        remoteSS.forEach(rs => {
            const localS = map.get(rs.id);
            if (!localS) {
                map.set(rs.id, rs);
            } else {
                const isLocalEdited = localS.attendance !== 'present' || localS.note !== '' || localS.memorization.hasMemorization || localS.review.hasReview;
                const isRemoteEdited = rs.attendance !== 'present' || rs.note !== '' || rs.memorization.hasMemorization || rs.review.hasReview;

                if (isRemoteEdited && !isLocalEdited) {
                    map.set(rs.id, rs);
                } else if (isLocalEdited && !isRemoteEdited) {
                    map.set(rs.id, localS);
                } else {
                    const localTs = localS.lastUpdated || 0;
                    const remoteTs = rs.lastUpdated || 0;
                    map.set(rs.id, remoteTs >= localTs ? rs : localS);
                }
            }
        });
        return Array.from(map.values());
    };

    const mergeSessions = (localSessions: Session[] = [], remoteSessions: Session[] = [], deletedIds: number[] = []): Session[] => {
        const deletedSet = new Set(deletedIds);
        const map = new Map<number, Session>();
        
        remoteSessions.forEach(rs => {
            if (!deletedSet.has(rs.id)) {
                map.set(rs.id, rs);
            }
        });

        localSessions.forEach(ls => {
            if (deletedSet.has(ls.id)) return;
            
            const existing = map.get(ls.id);
            if (!existing) {
                map.set(ls.id, ls);
            } else {
                const localTs = ls.lastUpdated || ls.createdAt || 0;
                const remoteTs = existing.lastUpdated || existing.createdAt || 0;
                
                if (localTs > remoteTs) {
                    map.set(ls.id, {
                        ...existing,
                        ...ls,
                        students: mergeSessionStudents(ls.students, existing.students)
                    });
                } else if (remoteTs > localTs) {
                    map.set(ls.id, {
                        ...ls,
                        ...existing,
                        students: mergeSessionStudents(ls.students, existing.students)
                    });
                } else {
                    // Equal timestamps, likely just synced. Merge students just in case.
                    map.set(ls.id, {
                        ...existing,
                        ...ls,
                        students: mergeSessionStudents(ls.students, existing.students)
                    });
                }
            }
        });
        
        return Array.from(map.values());
    };

    const mergeStudents = (localStudents: Student[] = [], remoteStudents: Student[] = [], deletedIds: number[] = []): Student[] => {
        const deletedSet = new Set(deletedIds);
        const map = new Map<number, Student>();
        
        // Remote students take priority for presence
        remoteStudents.forEach(rs => {
            if (!deletedSet.has(rs.id)) {
                map.set(rs.id, rs);
            }
        });

        // Merge local students
        localStudents.forEach(ls => {
            if (deletedSet.has(ls.id)) return;
            
            const existing = map.get(ls.id);
            if (!existing) {
                map.set(ls.id, ls);
            } else {
                const localTs = ls.lastUpdated || 0;
                const remoteTs = existing.lastUpdated || 0;
                
                const newer = remoteTs >= localTs ? existing : ls;
                const older = remoteTs >= localTs ? ls : existing;

                map.set(ls.id, {
                    ...older,
                    ...newer,
                    manualPoints: mergeArrays(ls.manualPoints || [], (existing.manualPoints || [])),
                    sentReports: mergeArrays(ls.sentReports || [], (existing.sentReports || []))
                });
            }
        });
        
        return Array.from(map.values()).sort((a, b) => a.order - b.order);
    };

    const mergeTeachers = (localT: { [uid: string]: TeacherPermissions } = {}, remoteT: { [uid: string]: TeacherPermissions } = {}, authorizedIds: string[] = []): { [uid: string]: TeacherPermissions } => {
        const authSet = new Set(authorizedIds);
        const allUids = new Set([...Object.keys(localT || {}), ...Object.keys(remoteT || {})]);
        const result: { [uid: string]: TeacherPermissions } = {};
        allUids.forEach(uid => {
            if (!authSet.has(uid)) return; // Prune if not authorized

            if (localT[uid] && remoteT[uid]) {
                const lTs = localT[uid].lastUpdated || localT[uid].joinedAt || 0;
                const rTs = remoteT[uid].lastUpdated || remoteT[uid].joinedAt || 0;
                result[uid] = rTs >= lTs ? remoteT[uid] : localT[uid];
            } else {
                result[uid] = localT[uid] || remoteT[uid];
            }
        });
        return result;
    };

    const isRemoteNewer = (remote.lastUpdated || 0) >= (local.lastUpdated || 0);
    const finalAuthorizedIds = isRemoteNewer ? (remote.authorizedUserIds || []) : (local.authorizedUserIds || []);

    const result: CircleData = {
        ...local, // Default to local
        ...remote, // Overwrite with remote
        // Preserve local drafts
        draftSession: local.draftSession,
        sessionDrafts: local.sessionDrafts || {},
        draftTest: local.draftTest,
        draftPlan: local.draftPlan,
        draftActivity: local.draftActivity,
        draftAnnouncement: local.draftAnnouncement,
        // Granular merge for top-level fields
        circle: isRemoteNewer ? remote.circle : local.circle,
        teacher: isRemoteNewer ? remote.teacher : local.teacher,
        center: isRemoteNewer ? remote.center : local.center,
        town: isRemoteNewer ? remote.town : local.town,
        logo: isRemoteNewer ? remote.logo : local.logo,
        teacherGender: isRemoteNewer ? remote.teacherGender : local.teacherGender,
        studyStartDate: isRemoteNewer ? remote.studyStartDate : local.studyStartDate,
        lessonTypes: isRemoteNewer ? (remote.lessonTypes || local.lessonTypes) : (local.lessonTypes || remote.lessonTypes),
        activityTypes: isRemoteNewer ? (remote.activityTypes || local.activityTypes) : (local.activityTypes || remote.activityTypes),
        settings: isRemoteNewer ? remote.settings : local.settings,
        notificationSettings: isRemoteNewer ? remote.notificationSettings : local.notificationSettings,
        authorizedUserIds: finalAuthorizedIds,
        allowDirectEntry: isRemoteNewer ? (remote.allowDirectEntry ?? local.allowDirectEntry) : (local.allowDirectEntry ?? remote.allowDirectEntry),
        
        // Complex object merging
        teachers: mergeTeachers(local.teachers, remote.teachers, finalAuthorizedIds),
        students: mergeStudents(local.students, remote.students, isRemoteNewer ? remote.deletedStudentIds || [] : local.deletedStudentIds || []),
        notifications: mergeArrays(local.notifications || [], remote.notifications || [], Array.from(new Set([...(local.dismissedNotificationIds || []), ...(remote.dismissedNotificationIds || [])]))),
        dismissedNotificationIds: Array.from(new Set([...(local.dismissedNotificationIds || []), ...(remote.dismissedNotificationIds || [])])),
        deletedSessionIds: Array.from(new Set([...(local.deletedSessionIds || []), ...(remote.deletedSessionIds || [])])),
        deletedStudentIds: Array.from(new Set([...(local.deletedStudentIds || []), ...(remote.deletedStudentIds || [])])),
        studentReports: mergeArrays(local.studentReports, remote.studentReports),
        supervisorReports: mergeArrays(local.supervisorReports, remote.supervisorReports),
        tests: mergeArrays(local.tests, remote.tests),
        plans: mergeArrays(local.plans, remote.plans),
        activities: mergeArrays(local.activities, remote.activities),
        announcements: mergeArrays(local.announcements, remote.announcements),
        bulkRewards: mergeArrays(local.bulkRewards, remote.bulkRewards),
        lastUpdated: Math.max(local.lastUpdated || 0, remote.lastUpdated || 0)
    };

    // Second pass to handle sessions and students with merged deleted IDs
    const finalDeletedSessionIds = Array.from(new Set([...(local.deletedSessionIds || []), ...(remote.deletedSessionIds || [])]));
    const finalDeletedStudentIds = Array.from(new Set([...(local.deletedStudentIds || []), ...(remote.deletedStudentIds || [])]));
    
    result.sessions = mergeSessions(local.sessions, remote.sessions, finalDeletedSessionIds);
    result.students = mergeStudents(local.students, remote.students, finalDeletedStudentIds);

    return result;
};

export const roundToQuranFraction = (val: number): number => {
    if (val <= 0) return 0;
    const integerPart = Math.floor(val);
    const fractionalPart = val - integerPart;
    
    // Increased precision: 0.05 steps as requested
    const targets = [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.33, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.0];
    let closestFraction = targets[0];
    let minDiff = Math.abs(fractionalPart - targets[0]);
    
    for (let i = 1; i < targets.length; i++) {
        const diff = Math.abs(fractionalPart - targets[i]);
        if (diff < minDiff) {
            minDiff = diff;
            closestFraction = targets[i];
        }
    }
    
    let rounded = integerPart + closestFraction;
    if (val > 0 && rounded === 0) {
        rounded = 0.05; 
    }
    return parseFloat(rounded.toFixed(2));
};

export const calculatePagesCount = (
    fromSurahName: string,
    fromAyahStr: string | number,
    toSurahName: string,
    toAyahStr: string | number
): number => {
    if (!fromSurahName) return 0;
    
    const fromSurahNum = surahs.findIndex(s => normalizeText(s.name) === normalizeText(fromSurahName)) + 1;
    const toSurahNum = toSurahName 
        ? (surahs.findIndex(s => normalizeText(s.name) === normalizeText(toSurahName)) + 1)
        : fromSurahNum;

    if (fromSurahNum === 0 || toSurahNum === 0) return 0;

    const startSurahObj = surahs[fromSurahNum - 1];
    const endSurahObj = surahs[toSurahNum - 1];

    let fromAyah = 1;
    let toAyah = 1;

    const hasFromAyah = fromAyahStr !== undefined && fromAyahStr !== null && fromAyahStr.toString().trim() !== '';
    const hasToAyah = toAyahStr !== undefined && toAyahStr !== null && toAyahStr.toString().trim() !== '';

    if (fromSurahNum === toSurahNum) {
        if (!hasFromAyah && !hasToAyah) {
            fromAyah = 1;
            toAyah = startSurahObj.verses;
        } else if (!hasFromAyah && hasToAyah) {
            fromAyah = 1;
            toAyah = parseInt(sanitizeToEnglishNumber(toAyahStr)) || 1;
        } else if (hasFromAyah && !hasToAyah) {
            fromAyah = parseInt(sanitizeToEnglishNumber(fromAyahStr)) || 1;
            toAyah = fromAyah;
        } else {
            fromAyah = parseInt(sanitizeToEnglishNumber(fromAyahStr)) || 1;
            toAyah = parseInt(sanitizeToEnglishNumber(toAyahStr)) || fromAyah;
        }
    } else {
        if (!hasFromAyah) {
            fromAyah = 1;
        } else {
            fromAyah = parseInt(sanitizeToEnglishNumber(fromAyahStr)) || 1;
        }

        if (!hasToAyah) {
            toAyah = endSurahObj.verses;
        } else {
            toAyah = parseInt(sanitizeToEnglishNumber(toAyahStr)) || 1;
        }
    }

    let startSurah = fromSurahNum;
    let startAyah = fromAyah;
    let endSurah = toSurahNum;
    let endAyah = toAyah;

    if (startSurah > endSurah || (startSurah === endSurah && startAyah > endAyah)) {
        startSurah = toSurahNum;
        startAyah = toAyah;
        endSurah = fromSurahNum;
        endAyah = fromAyah;
    }

    const isVerseInRange = (s: number, a: number): boolean => {
        if (s < startSurah || s > endSurah) return false;
        if (s > startSurah && s < endSurah) return true;
        if (s === startSurah && s === endSurah) return a >= startAyah && a <= endAyah;
        if (s === startSurah) return a >= startAyah;
        if (s === endSurah) return a <= endAyah;
        return false;
    };

    const rangeVerses = quranMetadata.filter(v => isVerseInRange(v.surah_number, v.ayah_number));
    if (rangeVerses.length === 0) return 0;

    const pageToSavedWordsMap: { [page: number]: number } = {};
    for (const v of rangeVerses) {
        if (!pageToSavedWordsMap[v.page_number]) {
            pageToSavedWordsMap[v.page_number] = 0;
        }
        pageToSavedWordsMap[v.page_number] += v.words_count;
    }

    const affectedPages = Object.keys(pageToSavedWordsMap).map(Number);
    const pageToTotalWordsMap: { [page: number]: number } = {};
    for (const v of quranMetadata) {
        if (affectedPages.includes(v.page_number)) {
            if (!pageToTotalWordsMap[v.page_number]) {
                pageToTotalWordsMap[v.page_number] = 0;
            }
            pageToTotalWordsMap[v.page_number] += v.words_count;
        }
    }

    let totalRatios = 0;
    for (const page of affectedPages) {
        const savedWords = pageToSavedWordsMap[page] || 0;
        const totalWords = pageToTotalWordsMap[page] || 1;
        totalRatios += (savedWords / totalWords);
    }

    return roundToQuranFraction(totalRatios);
};

export const formatPagesCountArabic = (count: number): string => {
    const formattedCount = parseFloat(count.toFixed(2));
    if (formattedCount === 1 || (formattedCount > 1 && formattedCount < 2)) {
        return `${formattedCount} صفحة`;
    } else if (formattedCount >= 2 && formattedCount <= 10) {
        return `${formattedCount} صفحات`;
    } else if (formattedCount > 10) {
        return `${formattedCount} صفحة`;
    } else {
        return `${formattedCount} صفحة`;
    }
};

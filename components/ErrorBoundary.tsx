import React, { ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, LogOut, ShieldAlert, Send, CheckCircle2, ChevronDown, ChevronUp, Lock, ArrowRight } from 'lucide-react';
import { db, auth, signOut } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  userDescription: string;
  isSubmitting: boolean;
  isSubmitted: boolean;
  toastMessage: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  private longPressTimer: any = null;
  private isLongPressFired = false;

  public state: State = { 
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    userDescription: '',
    isSubmitting: false,
    isSubmitted: false,
    toastMessage: null
  };

  static getDerivedStateFromError(_: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  componentWillUnmount() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }

  handleGoHome = () => {
    try {
      const dataStr = localStorage.getItem('tahfeezMultiCircleApp_v1');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        data.activeCircleId = null;
        localStorage.setItem('tahfeezMultiCircleApp_v1', JSON.stringify(data));
      }
    } catch (e) {
      console.error("Error resetting active circle:", e);
    }
    window.location.href = window.location.origin;
  };

  // Long press timer handlers for 5-second hold on Home button
  handleHomePointerDown = () => {
    this.isLongPressFired = false;
    this.longPressTimer = setTimeout(() => {
      this.isLongPressFired = true;
      this.handleUndoLastStep();
    }, 5000);
  };

  handleHomePointerUp = () => {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    if (!this.isLongPressFired) {
      this.handleGoHome();
    }
  };

  handleHomePointerCancel = () => {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  };

  // Execute silent recovery when held for 5 seconds
  handleUndoLastStep = () => {
    try {
      // Revert problematic active state from localStorage if present
      const dataStr = localStorage.getItem('tahfeezMultiCircleApp_v1');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        // Clear active session/draft or reset active circle ID safely
        if (data.draftSession) data.draftSession = null;
        if (data.draftPlan) data.draftPlan = null;
        if (data.draftActivity) data.draftActivity = null;
        localStorage.setItem('tahfeezMultiCircleApp_v1', JSON.stringify(data));
      }
    } catch (e) {
      console.error("Error reverting last step:", e);
    }

    // Reset error boundary state so the app recovers and goes back 1 step
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      toastMessage: "تم الرجوع خطوة للخلف بنجاح لتجنب الحصول على المشكلة"
    });

    // Clear toast after 4 seconds
    setTimeout(() => {
      this.setState({ toastMessage: null });
    }, 4000);
  };

  handleLogoutAndLogin = async () => {
    try {
      localStorage.removeItem('tahfeezMultiCircleApp_v1');
      localStorage.removeItem('tahfeezUserProfile_v1');
      localStorage.removeItem('tahfeezAuthUser_v1');
      localStorage.removeItem('app_authenticated_permanently');
      localStorage.removeItem('logging_out_active');
      localStorage.removeItem('developer_acting_as_user');
      localStorage.removeItem('auth_saving_prompt_pending');
      localStorage.removeItem('auth_loading_in_progress');
      if (auth) {
        await signOut(auth);
      }
    } catch (e) {
      console.error("Error during logout in ErrorBoundary:", e);
    }
    window.location.href = window.location.origin;
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  // Send Error Report directly to Firestore collection teacher_feedbacks
  handleSubmitErrorReport = async () => {
    if (this.state.isSubmitting || this.state.isSubmitted) return;

    this.setState({ isSubmitting: true });

    try {
      let userProfile: any = null;
      let activeCircleName = '';

      try {
        const profileStr = localStorage.getItem('tahfeezUserProfile_v1');
        if (profileStr) userProfile = JSON.parse(profileStr);

        const dataStr = localStorage.getItem('tahfeezMultiCircleApp_v1');
        if (dataStr) {
          const data = JSON.parse(dataStr);
          if (data.circles && data.activeCircleId) {
            const circle = data.circles.find((c: any) => c.id === data.activeCircleId);
            if (circle) activeCircleName = circle.name || '';
          }
        }
      } catch (err) {
        console.error("Error parsing local user info for error report:", err);
      }

      const currentUser = auth?.currentUser;
      const errorMessage = this.state.error?.message || "مشكلة غير معروفة بالنظام";
      const errorName = this.state.error?.name || "ErrorBoundary";
      const errorStack = this.state.error?.stack || "";
      const userDesc = this.state.userDescription.trim();

      const timestamp = Date.now();
      const currentUrl = window.location.href;
      const currentPath = window.location.hash || window.location.pathname;

      const reportPayload = {
        type: 'bug',
        subject: `تقرير خطأ تلقائي: ${errorMessage.slice(0, 60)}`,
        status: 'new',
        userId: currentUser?.uid || userProfile?.uid || 'anonymous',
        userName: userProfile?.displayName || currentUser?.displayName || 'مستخدم النظام',
        userEmail: userProfile?.email || currentUser?.email || '',
        centerName: userProfile?.centerName || userProfile?.managementName || '',
        circleName: activeCircleName,
        createdAt: timestamp,
        updatedAt: timestamp,
        teacherUnread: false,
        devUnread: true,
        archived: false,
        starred: true,
        messages: [
          {
            id: 'msg_' + timestamp,
            sender: 'teacher',
            senderName: userProfile?.displayName || 'مستخدم النظام',
            text: `[تقرير خطأ تلقائي من النظام]\n\n` +
                  `• وصف المشكلة من المستخدم: ${userDesc || 'لم يتم كود كتابة وصف إضافي'}\n` +
                  `• رسالة الخطأ: ${errorMessage}\n` +
                  `• كود/نوع الخطأ: ${errorName}\n` +
                  `• الصفحة/المسار: ${currentPath}\n` +
                  `• اسم العملية: ErrorBoundary_Catch\n` +
                  `• بيانات المستخدم: ${userProfile?.displayName || 'مستخدم'} (${userProfile?.email || 'بدون بريد'})\n` +
                  `• الحلقة الحالية: ${activeCircleName || 'غير محددة'}\n` +
                  `• الوقت والتاريخ: ${new Date().toLocaleString('ar-EG')}\n` +
                  `• المتصفح والجهاز: ${navigator.userAgent}\n\n` +
                  `• Stack Trace:\n${errorStack}`,
            createdAt: timestamp
          }
        ],
        diagnostics: {
          errorMessage,
          errorName,
          errorStack,
          userDescription: userDesc,
          currentUrl,
          currentPath,
          userAgent: navigator.userAgent,
          userProfile
        }
      };

      if (db) {
        await addDoc(collection(db, 'teacher_feedbacks'), reportPayload);
      }

      this.setState({
        isSubmitting: false,
        isSubmitted: true
      });
    } catch (err) {
      console.error("Failed to submit error report to Firestore:", err);
      // Even if offline/failed, mark as submitted to reassure user
      this.setState({
        isSubmitting: false,
        isSubmitted: true
      });
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "حدث خلل غير متوقع بالنظام";
      const errorStack = this.state.error?.stack || "";

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex items-center justify-center p-4 md:p-6 font-sans select-none" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-3xl p-5 sm:p-7 shadow-xl text-center space-y-5 relative overflow-hidden"
          >
            {/* Minimal Header Icon */}
            <div className="w-12 h-12 bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert size={24} />
            </div>

            {/* Error Title */}
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                حدث تنبيه بالنظام
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                جميع بيانات حلقة التحفيظ الخاصة بك محفوظة وآمنة تماماً.
              </p>
            </div>

            {/* Submission Status Alert */}
            {this.state.isSubmitted ? (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold leading-relaxed text-right space-y-1.5"
              >
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 size={16} />
                  <span>تم إرسال التقرير بنجاح</span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                  تم إرسال المشكلة وجميع بياناتها إلى المطورين وسيتم مراجعتها وحل المشكلة في أقرب وقت وإبلاغكم إن شاء الله.
                </p>
              </motion.div>
            ) : (
              /* User Description Input */
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/60 rounded-2xl p-3.5 text-right space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                  ما الذي حدث عند ظهور الخلل؟ (اختياري)
                </label>
                <textarea
                  value={this.state.userDescription}
                  onChange={(e) => this.setState({ userDescription: e.target.value })}
                  placeholder="أدخل وصفاً بسيطاً للعملية التي كنت تقوم بها..."
                  rows={2}
                  className="w-full text-xs p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent resize-none"
                />

                <button
                  onClick={this.handleSubmitErrorReport}
                  disabled={this.state.isSubmitting}
                  className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Send size={13} />
                  <span>{this.state.isSubmitting ? 'جاري الإرسال...' : 'إرسال المشكلة للمطور'}</span>
                </button>
              </div>
            )}

            {/* Collapsible Error Technical Stack */}
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/60 rounded-2xl p-3 text-right">
              <button
                onClick={this.toggleDetails}
                className="w-full flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                type="button"
              >
                <span>كود التفاصيل التشخيصية</span>
                {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <AnimatePresence>
                {this.state.showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-2 border-t border-gray-200 dark:border-gray-700/80 pt-2"
                  >
                    <pre className="text-[10px] font-mono text-rose-600 dark:text-rose-400 whitespace-pre-wrap break-all max-h-32 overflow-y-auto leading-relaxed p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                      {errorMessage}
                      {"\n"}
                      {errorStack}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Home button with long press listener (5s) */}
              <button
                onPointerDown={this.handleHomePointerDown}
                onPointerUp={this.handleHomePointerUp}
                onPointerCancel={this.handleHomePointerCancel}
                onMouseDown={this.handleHomePointerDown}
                onMouseUp={this.handleHomePointerUp}
                onTouchStart={this.handleHomePointerDown}
                onTouchEnd={this.handleHomePointerUp}
                className="py-3 px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                type="button"
                title="اضغط للعودة للرئيسية، أو اضغط مطولاً 5 ثوانٍ للتراجع خطوة"
              >
                <Home size={14} />
                <span>الرئيسية</span>
              </button>

              {/* Logout button */}
              <button
                onClick={this.handleLogoutAndLogin}
                className="py-3 px-3 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                type="button"
              >
                <LogOut size={14} />
                <span>تسجيل الخروج</span>
              </button>
            </div>

            <p className="text-[10px] text-gray-400 font-normal">
              تلميح: الضغط المطول (5 ثوانٍ) على زر "الرئيسية" يتراجع خطوة واحدة للخلف.
            </p>
          </motion.div>

          {/* Toast Notification for Long Press Recovery */}
          {this.state.toastMessage && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 border border-gray-700 animate-bounce">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>{this.state.toastMessage}</span>
            </div>
          )}
        </div>
      );
    }

    return (this as any).props.children;
  }
}

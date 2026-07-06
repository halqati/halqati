import React, { ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Home, LogOut, Calendar, ShieldAlert, Lock, SendHorizontal } from 'lucide-react';
import { auth } from '../firebase';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  userDescription: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { 
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    userDescription: ''
  };

  static getDerivedStateFromError(_: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
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

  handleLogoutAndLogin = async () => {
    try {
      const dataStr = localStorage.getItem('tahfeezMultiCircleApp_v1');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        data.activeCircleId = null;
        localStorage.setItem('tahfeezMultiCircleApp_v1', JSON.stringify(data));
      }
      localStorage.removeItem('tahfeezUserProfile_v1');
      if (auth) {
        const { signOut } = await import('firebase/auth');
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

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Internal Server Error";
      const errorStack = this.state.error?.stack || "";
      
      const greeting = "السلام عليكم ورحمة الله وبركاته\nحصلت لي مشكلة في نظام حلقتي التالية:\n";
      const userDesc = this.state.userDescription.trim() 
        ? `${this.state.userDescription.trim()}\nالرجاء حل المشكله......` 
        : "الرجاء حل المشكله......";
      const errorCodeSection = `\n\nكود الخطأ:\n${errorMessage}`;
      
      const systemInfo = `\n\nمعلومات النظام:\n- المتصفح/النظام: ${navigator.userAgent}\n- الرابط: ${window.location.href}\n- الوقت: ${new Date().toLocaleString('ar-EG')}`;
      
      const reportText = encodeURIComponent(`${greeting}${userDesc}${errorCodeSection}${systemInfo}`);
      
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c0e12] text-slate-800 dark:text-gray-100 flex items-center justify-center p-4 md:p-8 font-sans transition-colors duration-300" dir="rtl">
          {/* Ambient background blur elements for visual premium feel */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full max-w-lg bg-white dark:bg-[#151922] border border-slate-100 dark:border-gray-800/80 rounded-[2.5rem] p-6 md:p-10 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.4)] text-center relative overflow-hidden z-10"
            id="error-boundary-container"
          >
            {/* Small error icon */}
            <div className="mx-auto w-14 h-14 bg-rose-500/10 dark:bg-rose-500/15 rounded-2xl flex items-center justify-center mb-6 text-rose-500 dark:text-rose-400 relative">
              <div className="absolute inset-0 bg-rose-500/10 dark:bg-rose-500/15 rounded-2xl animate-ping opacity-40" />
              <ShieldAlert className="w-7 h-7 relative z-10" />
            </div>

            {/* Error Message Header */}
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
              حدث خطأ غير متوقع
            </h1>
            
            <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 leading-relaxed max-w-md mx-auto mb-8">
              لا تقلق، جميع بيانات حلقة التحفيظ الخاصة بك آمنة تماماً. هذه مشكلة مؤقتة في النظام ونحن نعمل على معالجتها، ويمكنك الاستمرار قريباً جداً.
            </p>

            {/* When did the error occur card (Optional Details Form) */}
            <div className="bg-slate-50 dark:bg-[#1d222e] border border-slate-200/40 dark:border-gray-800/60 rounded-3xl p-5 text-right mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-gray-200">
                  متى ظهر الخطأ؟ (اختياري)
                </span>
              </div>
              <textarea
                id="error-description-input"
                value={this.state.userDescription}
                onChange={(e) => this.setState({ userDescription: e.target.value })}
                placeholder="مثال: ماذا كنت تفعل عند حدوث المشكلة؟ ومتى ظهرت؟ وما هي خطوات الوصول للمشكلة..."
                rows={3}
                className="w-full text-xs p-3.5 bg-white dark:bg-[#0f121a] border border-slate-200 dark:border-[#252c3c] rounded-2xl text-slate-800 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none leading-relaxed"
              />
              <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-slate-400 dark:text-gray-500 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>شرحك يساعدنا كثيراً في رصد المشكلة وحلها لك بأقرب وقت</span>
              </div>
            </div>

            {/* Collapsible Error Code Section Card */}
            <div className="bg-slate-50 dark:bg-[#1d222e] border border-slate-200/40 dark:border-gray-800/60 rounded-3xl p-5 text-right mb-8">
              <button
                onClick={this.toggleDetails}
                className="w-full flex items-center justify-between text-xs md:text-sm font-bold text-slate-800 dark:text-gray-200 focus:outline-none cursor-pointer"
                id="toggle-error-details-btn"
                type="button"
              >
                <span>كود وتفاصيل الخطأ</span>
                <div className="p-1 rounded-lg bg-white dark:bg-[#0f121a] border border-slate-200/50 dark:border-gray-800">
                  {this.state.showDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {this.state.showDetails ? (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-slate-200/60 dark:border-gray-800/80 pt-4">
                      <div className="flex items-center gap-2 p-3 bg-white dark:bg-[#0f121a] border border-dashed border-slate-200 dark:border-[#252c3c] rounded-2xl text-[10px] text-slate-500 dark:text-gray-400 mb-3 leading-relaxed">
                        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>سيتم إرفاق هذا الكود تلقائياً لمساعدة المطور في تصحيح الخلل المكتشف</span>
                      </div>
                      
                      <div 
                        className="text-right p-4 bg-slate-100 dark:bg-[#0f121a] rounded-2xl border border-slate-200 dark:border-[#252c3c] overflow-auto max-h-40 text-[10px] font-mono text-rose-500 dark:text-rose-400 shadow-inner"
                        id="technical-error-details"
                      >
                        <p className="font-bold mb-1">تفاصيل الخلل البرمجي:</p>
                        <pre className="leading-relaxed whitespace-pre-wrap select-all break-all">
                          {errorMessage}
                          {"\n\n"}
                          {errorStack}
                        </pre>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {/* WhatsApp Report Link Button */}
              <a 
                href={`https://wa.me/779516077?text=${reportText}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-l from-rose-500 to-[#e11d48] hover:opacity-95 text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20 hover:scale-[1.01] transition-all duration-200 text-xs md:text-sm cursor-pointer"
                id="report-whatsapp-btn"
              >
                <SendHorizontal className="w-4 h-4 rotate-180" />
                <span>إرسال تقرير بالخطأ للدعم الفني</span>
              </a>

              <div className="grid grid-cols-2 gap-3 mt-1">
                {/* Navigation Options - Separate stack matching design */}
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-[#1d222e] dark:hover:bg-[#252c3c] text-slate-700 dark:text-gray-300 border border-slate-200/50 dark:border-gray-800 font-bold py-3.5 px-3 rounded-2xl transition-all duration-200 text-xs cursor-pointer"
                  id="error-go-home-btn"
                  type="button"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>الرئيسية</span>
                </button>
                
                <button
                  onClick={this.handleLogoutAndLogin}
                  className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-[#1d222e] dark:hover:bg-[#252c3c] text-slate-700 dark:text-gray-300 border border-slate-200/50 dark:border-gray-800 font-bold py-3.5 px-3 rounded-2xl transition-all duration-200 text-xs cursor-pointer"
                  id="error-login-btn"
                  type="button"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الدخول</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}


import React, { ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FaWhatsapp, FaSync } from 'react-icons/fa';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { 
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  static getDerivedStateFromError(_: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRestart = () => {
    // Forces a hard reset to the root URL (Home page), clearing any bad navigation state.
    window.location.href = window.location.origin;
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Internal Server Error";
      const errorStack = this.state.error?.stack || "";
      const reportText = encodeURIComponent(`السلام عليكم ورحمة الله وبركاته\n\nهنالك خطأ في التطبيق\n\nكود الخطأ:\n${errorMessage}\n\n${errorStack.slice(0, 500)}`);
      
      return (
        <div className="min-h-screen bg-red-50 dark:bg-gray-900 text-red-800 dark:text-red-300 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Unobtrusive toggle icon */}
          <button 
            onClick={this.toggleDetails}
            className="absolute bottom-4 right-4 opacity-10 hover:opacity-100 transition-opacity p-2 text-gray-400 dark:text-gray-600 cursor-pointer"
            title="Technical Details"
          >
            <div className="w-1 h-1 bg-current rounded-full"></div>
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl text-center relative z-10"
          >
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 rounded-full mx-auto flex items-center justify-center mb-4">
              <span className="text-5xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">حدث خطأ غير متوقع</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-4 mb-8">
              نأسف جدًا لهذا الخلل. ربما المبرمج لم يعرف به، فرجاءً قم بالإبلاغ لنحل المشكلة بأسرع وقت.
            </p>
            
            <div className="space-y-4">
               <a 
                href={`https://wa.me/779516077?text=${reportText}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-full flex items-center justify-center gap-3 bg-green-500 text-white font-bold p-3 rounded-lg transition-transform hover:scale-105"
              >
                <FaWhatsapp size={20} />
                الإبلاغ عن المشكلة
              </a>
              <button
                onClick={this.handleRestart}
                className="w-full flex items-center justify-center gap-3 bg-blue-500 text-white font-bold p-3 rounded-lg transition-transform hover:scale-105"
              >
                <FaSync />
                إعادة تشغيل التطبيق (الرئيسية)
              </button>
            </div>

            {this.state.showDetails && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 text-left p-4 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto max-h-60"
              >
                <p className="text-xs font-mono font-bold mb-2 text-red-500">Technical Details (Code):</p>
                <pre className="text-[10px] font-mono leading-tight whitespace-pre-wrap select-all">
                  {errorMessage}
                  {"\n\n"}
                  {errorStack}
                </pre>
              </motion.div>
            )}
          </motion.div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

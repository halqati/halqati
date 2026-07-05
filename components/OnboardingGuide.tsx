import React, { useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingStep {
    elementSelector: string;
    title: string;
    content: string;
}

interface OnboardingGuideProps {
    steps: OnboardingStep[];
    onComplete: () => void;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ steps, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [rect, setRect] = useState<DOMRect | null>(null);

    useLayoutEffect(() => {
        const element = document.querySelector(steps[currentStep].elementSelector);
        
        const updateRect = () => {
             const newRect = element?.getBoundingClientRect();
             if (newRect) setRect(newRect);
        };

        if (element) {
            updateRect();
            const observer = new ResizeObserver(updateRect);
            observer.observe(document.body);
            window.addEventListener('scroll', updateRect, true);

            return () => {
                observer.disconnect();
                window.removeEventListener('scroll', updateRect, true);
            };
        } else {
            handleNext();
        }
    }, [currentStep, steps]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };
    
    const getTooltipPosition = () => {
        if (!rect) return {};

        const rootEl = document.getElementById('root');
        const appBounds = rootEl ? rootEl.getBoundingClientRect() : { left: 0, right: window.innerWidth, width: window.innerWidth };

        const tooltipHeight = 160; // Estimated height of the tooltip
        const tooltipWidth = 256;  // w-64 -> 16rem -> 256px
        const margin = 16;         // Space between element and tooltip
        const viewportPadding = 8; // Min space from edge

        // --- Vertical Positioning ---
        let top = rect.bottom + margin;

        // If not enough space below, position above the element
        if (top + tooltipHeight > window.innerHeight - viewportPadding) {
            top = rect.top - tooltipHeight - margin;
        }
        
        // Clamp to ensure it's not off-screen vertically
        top = Math.max(viewportPadding, Math.min(top, window.innerHeight - tooltipHeight - viewportPadding));


        // --- Horizontal Positioning ---
        // Ideal left position: centered with the element
        let left = rect.left + rect.width / 2 - tooltipWidth / 2;
        
        // Define the boundaries for the tooltip within the app container
        const minLeft = appBounds.left + viewportPadding;
        const maxLeft = appBounds.right - tooltipWidth - viewportPadding;
        
        // Clamp the horizontal position to stay within the app's bounds
        left = Math.max(minLeft, Math.min(left, maxLeft));

        return { top, left };
    };


    return (
        <div className="fixed inset-0 z-[1000]" onClick={(e) => e.stopPropagation()}>
            <AnimatePresence>
                {rect && (
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div
                            className="absolute rounded-lg border-2 border-white pointer-events-none transition-all duration-300 ease-in-out"
                            style={{
                                top: rect.top - 8,
                                left: rect.left - 8,
                                width: rect.width + 16,
                                height: rect.height + 16,
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                            }}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute w-64 max-w-[calc(100vw-16px)] bg-white dark:bg-gray-800 rounded-lg p-4 shadow-2xl"
                            style={getTooltipPosition()}
                        >
                            <h3 className="font-bold text-lg text-primary dark:text-accent mb-2">{steps[currentStep].title}</h3>
                            <p className="text-sm mb-4 text-gray-700 dark:text-gray-300">{steps[currentStep].content}</p>
                            <div className="flex justify-between items-center">
                                <button onClick={onComplete} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">تخطي</button>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono">{currentStep + 1} / {steps.length}</span>
                                    {currentStep > 0 && <button onClick={handlePrev} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-600">السابق</button>}
                                    <button onClick={handleNext} className="px-3 py-1 rounded bg-primary text-white">
                                        {currentStep === steps.length - 1 ? 'إنهاء' : 'التالي'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OnboardingGuide;

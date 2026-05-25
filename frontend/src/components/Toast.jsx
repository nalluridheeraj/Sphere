import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />,
  error:   <AlertCircle  className="h-4 w-4 text-rose-500 flex-shrink-0" />,
  info:    <Info         className="h-4 w-4 text-sphere-500 flex-shrink-0" />,
};

const BG = {
  success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/40',
  error:   'border-rose-200 bg-rose-50 dark:border-rose-800/40 dark:bg-rose-950/40',
  info:    'border-sphere-200 bg-sphere-50 dark:border-sphere-800/40 dark:bg-sphere-950/40',
};

const Toast = ({ message, type = 'success', onClose, duration = 3500 }) => {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 shadow-card-hover backdrop-blur-md min-w-[200px] max-w-sm animate-slide-up ${BG[type] || BG.info}`}>
      {ICONS[type] || ICONS.info}
      <p className="flex-1 text-sm font-medium text-brand-800 dark:text-brand-100">{message}</p>
      <button onClick={onClose} className="text-brand-400 hover:text-brand-600 dark:hover:text-brand-200 transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default Toast;

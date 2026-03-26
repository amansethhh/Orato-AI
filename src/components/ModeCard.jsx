import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/SettingsProvider';
import { getTranslation } from '@/components/translations';

export default function ModeCard({ icon: Icon, title, description, onClick, delay = 0, isPrimary = false }) {
  const { language } = useSettings();
  const t = (key) => getTranslation(key, language);
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "relative w-full bg-white dark:bg-slate-800 rounded-2xl p-4 lg:p-5 flex items-center gap-4 lg:gap-5",
        isPrimary ? "shadow-md border-2 border-blue-100 dark:border-blue-900" : "shadow-sm border border-gray-100 dark:border-slate-700",
        "active:shadow-inner hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900 transition-all duration-200",
        "text-left group h-[86px] lg:h-[96px] touch-manipulation"
      )}
    >
      {isPrimary && (
        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[9px] lg:text-[10px] font-semibold">
          {t('recommended')}
        </span>
      )}
      <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
        <Icon className="w-6 h-6 lg:w-7 lg:h-7 text-white dark:text-gray-100" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="text-[17px] lg:text-[19px] font-semibold text-gray-900 dark:text-gray-100 leading-tight mb-1">{title}</h3>
        {description && (
          <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400 leading-snug">{description}</p>
        )}
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </motion.button>
  );
}
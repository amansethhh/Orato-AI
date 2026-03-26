import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useSettings } from '@/components/SettingsProvider';

export default function ExpandableQuestion({ prompt }) {
  const { language } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Guard against undefined/null prompt
  const safePrompt = prompt || '';
  
  // Show first ~80 chars as preview
  const isLong = safePrompt.length > 80;
  const preview = isLong ? safePrompt.slice(0, 80) + '...' : safePrompt;
  
  return (
    <div className="px-4">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
              {preview}
            </p>
            {isLong && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 mx-auto transition-colors min-h-[44px] px-3"
              >
                {language === 'english' ? 'Tap to expand full question' : 'पूरा प्रश्न देखने के लिए टैप करें'}
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-900 dark:text-gray-100 leading-[1.6]">
              {safePrompt}
            </p>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium flex items-center gap-1 mx-auto transition-colors min-h-[44px] px-3"
            >
              {language === 'english' ? 'Tap to collapse question' : 'प्रश्न छोटा करने के लिए टैप करें'}
              <ChevronDown className="w-4 h-4 rotate-180" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
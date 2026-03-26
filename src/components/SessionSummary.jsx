import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, Presentation, MessageCircle, TrendingUp } from 'lucide-react';
import { useSettings } from '@/components/SettingsProvider';
import { getTranslation } from '@/components/translations';

const modeIcons = {
  interview: Briefcase,
  presentation: Presentation,
  casual: MessageCircle
};

export default function SessionSummary({ session }) {
  const { language } = useSettings();
  const t = (key) => getTranslation(key, language);
  
  if (!session) return null;

  const modeLabels = {
    interview: t('interviewPractice'),
    presentation: t('presentationPractice'),
    casual: t('casualSpeaking')
  };

  const ModeIcon = modeIcons[session.mode] || Briefcase;
  
  // Find strongest area
  const scores = session.scoring || {};
  const scoreValue = { high: 3, medium: 2, low: 1 };
  const strongest = Object.entries(scores)
    .sort(([, a], [, b]) => scoreValue[b] - scoreValue[a])[0];
  
  const strongestArea = strongest ? strongest[0].charAt(0).toUpperCase() + strongest[0].slice(1) : 'Communication';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
    >
      <Card className="border-0 shadow-sm overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-slate-800 dark:to-slate-800 dark:border-slate-700">
        <CardContent className="p-4 sm:p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            {language === 'english' ? 'Session Summary' : 'सत्र सारांश'}
          </h3>
          
          <div className="space-y-2.5 sm:space-y-3">
            {/* Mode */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <ModeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {language === 'english' ? 'Practice Mode' : 'अभ्यास मोड'}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{modeLabels[session.mode]}</p>
              </div>
            </div>

            {/* Strongest Area */}
            {strongest && (
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {language === 'english' ? 'Strongest Area' : 'सबसे मजबूत क्षेत्र'}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{strongestArea}</p>
                </div>
              </div>
            )}

            {/* Focus for next time */}
            {session.retry_focus && (
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-600 dark:text-amber-400 text-lg">→</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {language === 'english' ? 'Next Focus' : 'अगला फोकस'}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{session.retry_focus}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
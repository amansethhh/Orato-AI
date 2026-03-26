import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useSettings } from '@/components/SettingsProvider';
import { getTranslation } from '@/components/translations';

export default function ProgressSnapshot() {
  const { language } = useSettings();
  const t = (key) => getTranslation(key, language);
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['progress-snapshot'],
    queryFn: async () => {
      const allSessions = await api.entities.PracticeSession.list('-created_date', 10);
      return allSessions;
    },
    initialData: []
  });

  if (isLoading || sessions.length === 0) {
    return null;
  }

  // Calculate confidence trend
  const getConfidenceTrend = () => {
    const stableText = language === 'hindi' ? 'स्थिर →' : 'Stable →';
    const improvingText = language === 'hindi' ? 'सुधार हो रहा है ↑' : 'Improving ↑';
    const needsFocusText = language === 'hindi' ? 'ध्यान की ज़रूरत है' : 'Needs focus';
    
    if (sessions.length < 2) return { trend: 'stable', icon: Minus, text: stableText };
    
    const recent = sessions.slice(0, 3);
    const scores = recent.map(s => {
      const scoring = s.scoring || {};
      const avgScore = ['clarity', 'structure', 'confidence']
        .map(key => scoring[key] === 'high' ? 3 : scoring[key] === 'medium' ? 2 : 1)
        .reduce((a, b) => a + b, 0) / 3;
      return avgScore;
    });
    
    const avgRecent = scores.reduce((a, b) => a + b, 0) / scores.length;
    const older = sessions.slice(3, 6);
    
    if (older.length === 0) return { trend: 'stable', icon: Minus, text: stableText };
    
    const olderScores = older.map(s => {
      const scoring = s.scoring || {};
      const avgScore = ['clarity', 'structure', 'confidence']
        .map(key => scoring[key] === 'high' ? 3 : scoring[key] === 'medium' ? 2 : 1)
        .reduce((a, b) => a + b, 0) / 3;
      return avgScore;
    });
    
    const avgOlder = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
    
    if (avgRecent > avgOlder + 0.3) return { trend: 'improving', icon: TrendingUp, text: improvingText, color: 'text-green-600 dark:text-green-400' };
    if (avgRecent < avgOlder - 0.3) return { trend: 'needs-focus', icon: TrendingDown, text: needsFocusText, color: 'text-orange-600 dark:text-orange-400' };
    return { trend: 'stable', icon: Minus, text: stableText, color: 'text-blue-600 dark:text-blue-400' };
  };

  // Get last practiced mode
  const lastMode = sessions[0]?.mode || 'interview';
  const getModeLabel = (mode) => {
    const labels = {
      interview: t('interview'),
      presentation: t('presentation'),
      casual: t('casualSpeaking')
    };
    return labels[mode] || mode;
  };

  // Calculate strongest skill
  const getStrongestSkill = () => {
    const recent = sessions.slice(0, 5);
    const skillScores = { clarity: 0, structure: 0, confidence: 0 };
    
    recent.forEach(s => {
      const scoring = s.scoring || {};
      Object.keys(skillScores).forEach(skill => {
        if (scoring[skill] === 'high') skillScores[skill] += 3;
        else if (scoring[skill] === 'medium') skillScores[skill] += 2;
        else skillScores[skill] += 1;
      });
    });
    
    const strongest = Object.entries(skillScores).sort((a, b) => b[1] - a[1])[0];
    const skillKey = strongest[0];
    
    // Return localized skill name
    if (skillKey === 'clarity') return t('clarity');
    if (skillKey === 'structure') return t('structure');
    if (skillKey === 'confidence') return t('confidence');
    return skillKey.charAt(0).toUpperCase() + skillKey.slice(1);
  };

  // Get current focus (from last session's retry_focus or weakest skill)
  const getCurrentFocus = () => {
    const lastSession = sessions[0];
    if (lastSession?.retry_focus) {
      const focus = lastSession.retry_focus.toLowerCase();
      // Translate common focus areas
      if (focus.includes('clarity') || focus === 'clarity') return t('clarity');
      if (focus.includes('structure') || focus === 'structure') return t('structure');
      if (focus.includes('confidence') || focus === 'confidence') return t('confidence');
      if (focus.includes('fluency') || focus === 'fluency') return t('fluency');
      return lastSession.retry_focus.charAt(0).toUpperCase() + lastSession.retry_focus.slice(1);
    }
    
    // Calculate weakest skill
    const recent = sessions.slice(0, 5);
    const skillScores = { clarity: 0, structure: 0, confidence: 0 };
    
    recent.forEach(s => {
      const scoring = s.scoring || {};
      Object.keys(skillScores).forEach(skill => {
        if (scoring[skill] === 'high') skillScores[skill] += 3;
        else if (scoring[skill] === 'medium') skillScores[skill] += 2;
        else skillScores[skill] += 1;
      });
    });
    
    const weakest = Object.entries(skillScores).sort((a, b) => a[1] - b[1])[0];
    const skillKey = weakest[0];
    
    // Return localized skill name
    if (skillKey === 'clarity') return t('clarity');
    if (skillKey === 'structure') return t('structure');
    if (skillKey === 'confidence') return t('confidence');
    return skillKey.charAt(0).toUpperCase() + skillKey.slice(1);
  };

  const trend = getConfidenceTrend();
  const TrendIcon = trend.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl p-4 lg:p-5 shadow-sm border border-white/40 dark:border-slate-700 mb-6"
    >
      <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        <Target className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400" />
        {t('yourProgress')}
      </h2>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('confidenceTrend')}</p>
          <div className="flex items-center gap-1.5">
            <TrendIcon className={`w-4 h-4 ${trend.color || 'text-gray-600 dark:text-gray-400'}`} />
            <span className={`text-sm font-medium ${trend.color || 'text-gray-900 dark:text-gray-100'}`}>
              {trend.text}
            </span>
          </div>
        </div>
        
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lastPracticed')}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{getModeLabel(lastMode)}</p>
        </div>
        
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('strongestSkill')}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{getStrongestSkill()}</p>
        </div>
        
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('currentFocus')}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{getCurrentFocus()}</p>
        </div>
      </div>
      
      <p className="text-[10px] lg:text-[11px] text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
        {language === 'hindi' 
          ? 'प्रगति सत्र insights पर आधारित है, रिकॉर्डिंग संग्रहीत नहीं की जाती।'
          : 'Progress is based on session insights, not stored recordings.'}
      </p>
    </motion.div>
  );
}
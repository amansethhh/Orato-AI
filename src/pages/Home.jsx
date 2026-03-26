import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Presentation, MessageCircle, Settings } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import ModeCard from '@/components/ModeCard';
import ProgressSnapshot from '@/components/ProgressSnapshot';
import SettingsModal from '@/components/SettingsModal';
import LoginPrompt from '@/components/LoginPrompt';
import { useSettings } from '@/components/SettingsProvider';
import { getTranslation } from '@/components/translations';

const TypingPrompt = () => {
  const { language } = useSettings();
  const t = (key) => getTranslation(key, language);
  
  const prompts = [
    t('readyToPractice1'),
    t('readyToPractice2'),
    t('readyToPractice3')
  ];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  
  useEffect(() => {
    const currentPrompt = prompts[currentIndex];
    
    if (!isDeleting && displayedText.length < currentPrompt.length) {
      // Typing forward
      const timeout = setTimeout(() => {
        setDisplayedText(currentPrompt.slice(0, displayedText.length + 1));
      }, 70);
      return () => clearTimeout(timeout);
    } else if (!isDeleting && displayedText.length === currentPrompt.length) {
      // Pause at end before deleting
      const timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(timeout);
    } else if (isDeleting && displayedText.length > 0) {
      // Deleting
      const timeout = setTimeout(() => {
        setDisplayedText(currentPrompt.slice(0, displayedText.length - 1));
      }, 40);
      return () => clearTimeout(timeout);
    } else if (isDeleting && displayedText.length === 0) {
      // Move to next prompt
      setIsDeleting(false);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % prompts.length);
    }
  }, [displayedText, isDeleting, currentIndex, prompts]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="text-center mb-7 lg:mb-9 mt-2 min-h-[32px] flex items-center justify-center"
    >
      <p className="text-blue-50 dark:text-gray-300 text-sm lg:text-base font-medium">
        {displayedText}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="inline-block ml-0.5"
        >
          |
        </motion.span>
      </p>
    </motion.div>
  );
};



export default function Home() {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const { language, user, isLoadingUser } = useSettings();
  const t = (key) => getTranslation(key, language);

  // The Layout now handles intro redirect, no need to check here

  const practicesModes = [
    {
      id: 'interview',
      title: t('interviewPractice'),
      description: t('interviewDesc'),
      icon: Briefcase
    },
    {
      id: 'presentation',
      title: t('presentationPractice'),
      description: t('presentationDesc'),
      icon: Presentation
    },
    {
      id: 'casual',
      title: t('casualSpeaking'),
      description: t('casualDesc'),
      icon: MessageCircle
    }
  ];

  const handleModeClick = async (mode) => {
    // Check if user is authenticated first
    const isAuthenticated = await base44.auth.isAuthenticated();
    
    if (!isAuthenticated) {
      setSelectedMode(mode);
      setLoginPromptOpen(true);
      return;
    }

    // User is logged in, proceed to practice
    if (mode.id === 'interview') {
      navigate(createPageUrl('InterviewSetup'));
    } else {
      navigate(createPageUrl('QuestionSetup') + `?mode=${mode.id}`);
    }
  };

  const handleLoginSuccess = () => {
    setLoginPromptOpen(false);
    if (selectedMode) {
      if (selectedMode.id === 'interview') {
        navigate(createPageUrl('InterviewSetup'));
      } else {
        navigate(createPageUrl('QuestionSetup') + `?mode=${selectedMode.id}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-500 to-blue-400 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 safe-area-inset transition-colors duration-300">
      <div className="max-w-md lg:max-w-2xl xl:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 pb-16 sm:pb-20 lg:pb-24">
        {/* Settings Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute top-8 right-4 sm:right-6 lg:right-8 z-10"
        >
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-10 h-10 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 dark:hover:bg-white/20 transition-colors touch-manipulation"
          >
            <Settings className="w-5 h-5 text-white dark:text-gray-100" />
          </button>
        </motion.div>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-14"
          >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative w-16 h-16 lg:w-20 lg:h-20 bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-7"
            >
            {/* Subtle pulse animation */}
            <motion.div
              className="absolute inset-0 bg-white/10 rounded-2xl"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.4, 0.15, 0.4]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <svg className="w-8 h-8 lg:w-10 lg:h-10 text-white dark:text-gray-100 relative z-10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h4v2H8v-2h4v-3.07z"/>
            </svg>
          </motion.div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white dark:text-gray-100 mb-3 sm:mb-4 tracking-tight">
            {t('appName')}
          </h1>
          <p className="text-blue-100 dark:text-gray-300 text-base sm:text-lg lg:text-xl font-normal">
            {t('tagline')}
          </p>
        </motion.div>

        {/* Primary CTA Prompt with Typing Animation */}
        <TypingPrompt />

        {/* Mode Cards */}
        <div className="space-y-3 lg:space-y-3.5 lg:max-w-2xl lg:mx-auto">
          {practicesModes.map((mode, index) => (
            <div key={mode.id} onClick={() => handleModeClick(mode)}>
              <ModeCard
                icon={mode.icon}
                title={mode.title}
                description={mode.description}
                delay={0.3 + index * 0.1}
                isPrimary={mode.id === 'interview'}
              />
            </div>
          ))}
        </div>

        {/* Progress Section */}
        <div className="mt-10 lg:mt-12 lg:max-w-2xl lg:mx-auto">
          {/* Progress Snapshot */}
          <ProgressSnapshot />

          {/* Tip Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/40 dark:border-slate-700 mb-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-base">💡</span>
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  <span className="font-semibold">{t('tipLabel')}</span> {t('tipText')}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Privacy Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="text-center pb-6 lg:pb-8"
          >
            <p className="text-blue-200/70 dark:text-gray-400 text-[11px] lg:text-xs font-light flex items-center justify-center gap-1.5">
              <span className="text-sm">🔒</span>
              <span>{t('privacyNote')}</span>
            </p>
          </motion.div>
        </div>
        </div>

        {/* Settings Modal */}
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

        {/* Login Prompt */}
        <LoginPrompt isOpen={loginPromptOpen} onClose={() => setLoginPromptOpen(false)} />
        </div>
        );
        }
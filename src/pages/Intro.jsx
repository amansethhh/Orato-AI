import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mic, Brain, RotateCcw } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/SettingsProvider';

const TypingAnimation = () => {
  const { language } = useSettings();
  
  const prompts = language === 'hindi' 
    ? [
        'आत्मविश्वास बढ़ाएं, एक बार में एक उत्तर।',
        'वास्तविक बातचीत के लिए स्पष्ट रूप से बोलने का अभ्यास करें।',
        'रियल-टाइम AI कोचिंग प्राप्त करें जो आपके अनुसार अनुकूलित होती है।'
      ]
    : [
        'Build confidence, one response at a time.',
        'Practice speaking clearly for real conversations.',
        'Get real-time AI coaching that adapts to you.'
      ];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    const currentPrompt = prompts[currentIndex];
    
    if (!isDeleting && displayedText.length < currentPrompt.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(currentPrompt.slice(0, displayedText.length + 1));
      }, 70);
      return () => clearTimeout(timeout);
    } else if (!isDeleting && displayedText.length === currentPrompt.length) {
      const timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(timeout);
    } else if (isDeleting && displayedText.length > 0) {
      const timeout = setTimeout(() => {
        setDisplayedText(currentPrompt.slice(0, displayedText.length - 1));
      }, 40);
      return () => clearTimeout(timeout);
    } else if (isDeleting && displayedText.length === 0) {
      setIsDeleting(false);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % prompts.length);
    }
  }, [displayedText, isDeleting, currentIndex, prompts]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center mb-12 min-h-[32px] sm:min-h-[36px] flex items-center justify-center px-2"
    >
      <p className="text-gray-700 dark:text-gray-200 text-base sm:text-lg font-medium">
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

export default function Intro() {
  const navigate = useNavigate();
  const { language, user, isLoadingUser } = useSettings();
  
  useEffect(() => {
    // If user is already logged in AND has seen intro, redirect to Home
    // This allows logged-out users to see the intro again
    const hasSeenIntro = localStorage.getItem('orato_has_seen_intro');
    if (!isLoadingUser && user && hasSeenIntro) {
      navigate(createPageUrl('Home'), { replace: true });
    }
  }, [user, isLoadingUser, navigate]);
  
  const handleContinue = async () => {
    // Mark intro as seen
    localStorage.setItem('orato_has_seen_intro', 'true');
    
    // In local/mock mode, user is always authenticated — go to Home
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        navigate(createPageUrl('Home'));
      } else {
        navigate(createPageUrl('Home'));
      }
    } catch {
      navigate(createPageUrl('Home'));
    }
  };
  
  const features = language === 'hindi' 
    ? [
        {
          icon: Mic,
          title: 'वास्तविक बातचीत का अभ्यास करें',
          description: 'इंटरव्यू, प्रेजेंटेशन और रोज़मर्रा की बातचीत का अभ्यास करें वास्तविक, AI-जनित प्रॉम्प्ट के साथ जो स्वाभाविक लगते हैं, लिखित नहीं।'
        },
        {
          icon: Brain,
          title: 'स्पष्ट, समझाने योग्य AI फीडबैक',
          description: 'स्पष्टता, आत्मविश्वास, संरचना और प्रवाह पर संरचित फीडबैक प्राप्त करें—आप कैसे बोलते हैं उसके आधार पर, आप क्या कहते हैं उसके आधार पर नहीं।'
        },
        {
          icon: RotateCcw,
          title: 'समय के साथ अनुकूली कोचिंग',
          description: 'Orato AI आपके हाल के अभ्यास फोकस के आधार पर भविष्य के प्रश्नों को अनुकूलित करता है, जिससे आप सत्र दर सत्र सुधार करते हैं।'
        }
      ]
    : [
        {
          icon: Mic,
          title: 'Practice Real Conversations',
          description: 'Practice interviews, presentations, and everyday speaking with realistic, AI-generated prompts that feel natural, not scripted.'
        },
        {
          icon: Brain,
          title: 'Clear, Explainable AI Feedback',
          description: 'Receive structured feedback on clarity, confidence, structure, and fluency based on how you speak, not what you say.'
        },
        {
          icon: RotateCcw,
          title: 'Adaptive Coaching Over Time',
          description: 'Orato AI adapts future questions based on your recent practice focus, helping you improve session by session.'
        }
      ];
  
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-900 safe-area-inset transition-colors duration-300">
      <div className="max-w-md lg:max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg"
          >
            <motion.div
              className="absolute inset-0 bg-blue-400/20 rounded-3xl"
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.4, 0.15, 0.4]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <Mic className="w-10 h-10 lg:w-12 lg:h-12 text-white relative z-10" />
          </motion.div>
          
          {/* App Name */}
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Orato AI
          </h1>
          
          {/* Typing Animation */}
          <TypingAnimation />
        </motion.div>
        
        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 mb-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Who It's For */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mb-6"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'hindi'
              ? 'छात्रों, नौकरी खोजने वालों और पेशेवरों के लिए।'
              : 'For students, job seekers, and professionals.'}
          </p>
        </motion.div>

        {/* Privacy Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="text-center mb-8"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
            <span className="text-sm">🔒</span>
            <span>
              {language === 'hindi'
                ? 'आपकी आवाज़ रियल टाइम में प्रोसेस होती है और कभी स्टोर नहीं होती।'
                : 'Your voice is processed in real time and never stored.'}
            </span>
          </p>
        </motion.div>
        
        {/* CTA Button - Sticky on Mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="sticky bottom-4 sm:static"
        >
          <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.1 }}>
            <Button
              onClick={handleContinue}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white font-semibold text-base shadow-xl touch-manipulation"
            >
              {language === 'hindi' ? 'Orato AI के साथ जारी रखें' : 'Continue with Orato AI'}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
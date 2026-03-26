import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, RotateCcw, CheckCircle, Target, Lightbulb, Volume2, TrendingUp, Sparkles } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ScoreIndicator from '@/components/ScoreIndicator';
import SessionSummary from '@/components/SessionSummary';
import { useSettings } from '@/components/SettingsProvider';
import { getTranslation } from '@/components/translations';

export default function AIFeedback() {
  const navigate = useNavigate();
  const { language } = useSettings();
  const t = (key) => getTranslation(key, language);
  
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');
  const isDemo = urlParams.get('demo') === 'true';
  
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const [showRephrasing, setShowRephrasing] = useState(false);
  const [isPlayingRephrased, setIsPlayingRephrased] = useState(false);
  const [confidenceTrend, setConfidenceTrend] = useState(null);
  const [voiceProfile, setVoiceProfile] = useState(null);
  const [practiceStreak, setPracticeStreak] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  
  const synthRef = useRef(null);

  useEffect(() => {
    loadSession();
    checkConfidenceTrend();
    generateVoiceProfile();
    checkPracticeStreak();
  }, [sessionId]);

  useEffect(() => {
    // Auto-play feedback when loaded (with natural pause + coaching state)
    if (session?.feedback?.full_feedback && !hasAutoPlayed) {
      setHasAutoPlayed(true);
      // Wait 1.2 seconds for natural coach-like pause
      setTimeout(() => {
        speakFeedback();
      }, 1200);
    }
  }, [session, hasAutoPlayed]);

  const loadSession = async () => {
    if (!sessionId) return;
    
    try {
      const sessions = await api.entities.PracticeSession.filter({ id: sessionId });
      if (sessions.length > 0) {
        setSession(sessions[0]);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkConfidenceTrend = async () => {
    try {
      // Get last 3 sessions
      const recentSessions = await api.entities.PracticeSession.list('-created_date', 3);
      setSessionCount(recentSessions.length);
      
      if (recentSessions.length >= 2) {
        const confidenceScores = recentSessions
          .filter(s => s.scoring?.confidence)
          .map(s => s.scoring.confidence);
        
        // Check if confidence is improving
        const scoreValue = { low: 1, medium: 2, high: 3 };
        if (confidenceScores.length >= 2) {
          const recent = scoreValue[confidenceScores[0]];
          const older = scoreValue[confidenceScores[confidenceScores.length - 1]];
          
          if (recent > older) {
            setConfidenceTrend('improving');
          } else if (recent === 3 && confidenceScores.filter(s => s === 'high').length >= 2) {
            setConfidenceTrend('consistent');
          }
        }
      }
    } catch (error) {
      // Silently fail - trend is optional
    }
  };

  const generateVoiceProfile = async () => {
    try {
      const recentSessions = await api.entities.PracticeSession.list('-created_date', 5);

      if (recentSessions.length >= 3) {
        // Analyze communication patterns with enhanced intelligence
        const avgFillers = recentSessions
          .filter(s => s.filler_word_count != null)
          .reduce((sum, s) => sum + s.filler_word_count, 0) / recentSessions.filter(s => s.filler_word_count != null).length;

        const clarityScores = recentSessions.filter(s => s.scoring?.clarity).map(s => s.scoring.clarity);
        const structureScores = recentSessions.filter(s => s.scoring?.structure).map(s => s.scoring.structure);
        const confidenceScores = recentSessions.filter(s => s.scoring?.confidence).map(s => s.scoring.confidence);

        const scoreToNum = { low: 1, medium: 2, high: 3 };
        const avgClarity = clarityScores.reduce((sum, s) => sum + scoreToNum[s], 0) / clarityScores.length;
        const avgStructure = structureScores.reduce((sum, s) => sum + scoreToNum[s], 0) / structureScores.length;
        const avgConfidence = confidenceScores.reduce((sum, s) => sum + scoreToNum[s], 0) / confidenceScores.length;

        // Intelligent profile generation based on patterns
        let profile = "";

        // Strengths-based approach
        if (language === 'hindi') {
          // Hindi voice profiles
          if (avgClarity >= 2.5 && avgFillers < 2) {
            profile = "आपका बोलना स्पष्ट और प्रवाहमय है, बहुत कम हिचकिचाहट के साथ।";
          } else if (avgClarity >= 2.5 && avgFillers >= 3) {
            profile = "आप विचारों को स्पष्ट रूप से व्यक्त करते हैं। फिलर शब्दों को कम करने से आपकी उपस्थिति मजबूत हो सकती है।";
          } else if (avgConfidence >= 2.5) {
            profile = "आप अपनी प्रस्तुति में आत्मविश्वासी लगते हैं — इसे बनाए रखें।";
          } else if (avgStructure < 2 && avgClarity >= 2) {
            profile = "आपके विचार स्पष्ट हैं। बोलने से पहले उन्हें व्यवस्थित करना आपको और मजबूत बना सकता है।";
          } else if (avgFillers < 2) {
            profile = "आप स्वाभाविक प्रवाह के साथ सुचारू रूप से बोलते हैं।";
          } else if (avgConfidence < 2 && avgClarity >= 2) {
            profile = "आपका संदेश स्पष्ट है। थोड़े अधिक विश्वास के साथ बोलना आपके प्रभाव को बढ़ा सकता है।";
          }
        } else {
          // English voice profiles
          if (avgClarity >= 2.5 && avgFillers < 2) {
            profile = "Your speaking is clear and fluent with minimal hesitation.";
          } else if (avgClarity >= 2.5 && avgFillers >= 3) {
            profile = "You express ideas clearly. Reducing filler words can strengthen your presence.";
          } else if (avgConfidence >= 2.5) {
            profile = "You sound confident in your delivery — keep building on that.";
          } else if (avgStructure < 2 && avgClarity >= 2) {
            profile = "Your ideas are clear. Organizing them before speaking can make you even stronger.";
          } else if (avgFillers < 2) {
            profile = "You speak smoothly with natural flow.";
          } else if (avgConfidence < 2 && avgClarity >= 2) {
            profile = "Your message is clear. Speaking with slightly more conviction can enhance your impact.";
          }
        }

        if (profile) {
          setVoiceProfile(profile);
        }
      }
    } catch (error) {
      // Silently fail - profile is optional
    }
  };

  const checkPracticeStreak = async () => {
    try {
      const allSessions = await api.entities.PracticeSession.list('-created_date', 30);
      
      if (allSessions.length >= 2) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const todaySessions = allSessions.filter(s => {
          const sessionDate = new Date(s.created_date);
          return sessionDate.toDateString() === today.toDateString();
        });
        
        const yesterdaySessions = allSessions.filter(s => {
          const sessionDate = new Date(s.created_date);
          return sessionDate.toDateString() === yesterday.toDateString();
        });
        
        if (todaySessions.length > 0 && yesterdaySessions.length > 0) {
          setPracticeStreak(2);
        } else if (allSessions.length >= 3) {
          setPracticeStreak('habit');
        }
      }
    } catch (error) {
      // Silently fail
    }
  };

  const speakFeedback = () => {
    if (!session?.feedback?.full_feedback) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(session.feedback.full_feedback);
    
    // Optimal voice settings for coach-like delivery
    utterance.rate = 0.92; // Slightly slower for clarity and warmth
    utterance.pitch = 1.0; // Natural pitch
    utterance.volume = 1.0; // Full volume
    
    // Set language based on user preference
    utterance.lang = language === 'hindi' ? 'hi-IN' : 'en-US';
    
    // Load voices if needed
    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Voices not loaded yet, wait for them
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        assignVoice();
      };
    } else {
      assignVoice();
    }
    
    function assignVoice() {
      if (language === 'hindi') {
        // Prioritize Hindi voices
        const hindiVoice = voices.find(v => 
          v.lang.includes('hi') || 
          v.lang.includes('HI') ||
          v.name.includes('Hindi') ||
          v.name.includes('Lekha') ||
          v.name.includes('Hemant')
        );
        
        if (hindiVoice) {
          utterance.voice = hindiVoice;
        }
      } else {
        // Prioritize natural, professional English voices
        const preferredVoice = voices.find(v => 
          v.name.includes('Samantha') || 
          v.name.includes('Google UK English Female') ||
          v.name.includes('Google US English') ||
          v.name.includes('Microsoft Zira') ||
          v.name.includes('Karen') ||
          (v.lang.startsWith('en') && v.name.includes('Female'))
        ) || voices.find(v => v.lang.startsWith('en'));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speakFeedback();
    }
  };

  const speakRephrasing = () => {
    if (!session?.feedback?.rephrased_version) return;
    
    if (isPlayingRephrased) {
      window.speechSynthesis.cancel();
      setIsPlayingRephrased(false);
      return;
    }
    
    window.speechSynthesis.cancel();
    
    const introText = language === 'hindi' 
      ? "यह उसी विचार को बेहतर तरीके से कहने का एक तरीका है: "
      : "Here's a stronger way to express the same idea: ";
    const fullText = introText + session.feedback.rephrased_version;
    
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = language === 'hindi' ? 'hi-IN' : 'en-US';
    
    let voices = window.speechSynthesis.getVoices();
    
    if (language === 'hindi') {
      const hindiVoice = voices.find(v => 
        v.lang.includes('hi') || 
        v.lang.includes('HI') ||
        v.name.includes('Hindi') ||
        v.name.includes('Lekha') ||
        v.name.includes('Hemant')
      );
      if (hindiVoice) utterance.voice = hindiVoice;
    } else {
      const preferredVoice = voices.find(v => 
        v.name.includes('Samantha') || 
        v.name.includes('Google UK English Female') ||
        v.lang.startsWith('en')
      );
      if (preferredVoice) utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => setIsPlayingRephrased(true);
    utterance.onend = () => setIsPlayingRephrased(false);
    utterance.onerror = () => setIsPlayingRephrased(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const handleRetry = () => {
    const retryUrl = createPageUrl('VoicePractice') + 
      `?mode=${session.mode}` +
      `&retryFocus=${encodeURIComponent(session.retry_focus || 'improvement')}` +
      `&parentSession=${session.id}` +
      `&prompt=${encodeURIComponent(session.prompt)}`;
    
    navigate(retryUrl);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-900 transition-colors duration-300">
        <div className="max-w-md mx-auto px-6 py-6">
          <div className="flex items-center mb-8">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-6 w-32 mx-auto" />
          </div>
          <Skeleton className="h-24 w-full rounded-2xl mb-6" />
          <Skeleton className="h-32 w-full rounded-2xl mb-4" />
          <Skeleton className="h-32 w-full rounded-2xl mb-4" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-900 safe-area-inset transition-colors duration-300">
      <div className="max-w-md lg:max-w-3xl xl:max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-4 sm:py-6 lg:py-8 pb-16 sm:pb-20 lg:pb-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center mb-8"
        >
          <Link 
            to={createPageUrl('Home')}
            className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center active:bg-gray-50 dark:active:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors touch-manipulation flex-shrink-0"
          >
            <ChevronLeft className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="flex-1 text-center text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 pr-11 sm:pr-10 truncate">
            {t('aiFeedback')}
          </h1>
        </motion.div>

        {/* Demo Mode Badge */}
        {isDemo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 mb-4 sm:mb-6 flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
              <span className="font-semibold">Demo Mode:</span> Using sample response
            </p>
          </motion.div>
        )}

        {/* Confidence Trend & Practice Streak - Always Show */}
        <div className="space-y-3 mb-6 lg:mb-8 lg:max-w-2xl lg:mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-800 rounded-xl p-3 flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-700 dark:text-green-300">
              {confidenceTrend === 'improving' 
                ? t('confidenceImproving')
                : confidenceTrend === 'consistent'
                ? t('confidenceConsistent')
                : language === 'hindi'
                ? 'आप मजबूत आत्मविश्वास बनाए रख रहे हैं — इसे बनाए रखें!'
                : 'You\'re maintaining strong confidence — keep building on that!'}
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {practiceStreak === 2 
                ? t('practiceStreak2Day')
                : practiceStreak === 'habit'
                ? t('practiceBuildingHabit')
                : sessionCount > 0
                ? `${sessionCount} ${t('practiceSessionsCompleted')}`
                : language === 'hindi'
                ? 'आप बोलने की आदत बना रहे हैं।'
                : 'You\'re building a speaking habit.'}
            </p>
          </motion.div>
        </div>

        {/* Coaching State Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col items-center gap-2 mb-4"
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-2 h-2 bg-blue-500 rounded-full"
            />
            <span className="text-sm text-slate-600 dark:text-gray-400 font-medium">{t('aiCoachActive')}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-md px-4">
            {t('explainability')}
          </p>
        </motion.div>

        {/* AI Feedback - Full Text Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 sm:mb-6 lg:mb-8 lg:max-w-2xl lg:mx-auto"
        >
          <Card className="border-0 shadow-sm overflow-hidden bg-white dark:bg-slate-800/90 dark:border-slate-700">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🎯</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                  {t('aiFeedback')}
                </h3>
              </div>
              
              {/* Feedback text */}
              <div className="bg-slate-50 dark:bg-slate-700/80 rounded-lg p-3 mb-4">
                <p className="text-slate-900 dark:text-gray-200 text-sm leading-relaxed break-words">
                  {session?.feedback?.full_feedback || 'Your response showed confidence and clarity.'}
                </p>
              </div>
              
              {/* Audio player */}
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleSpeak}
                  className="w-12 h-12 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center shadow-lg flex-shrink-0 touch-manipulation"
                >
                  {isSpeaking ? (
                    <Pause className="w-5 h-5 text-white fill-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  )}
                </motion.button>
                
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <Volume2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      {language === 'hindi' ? 'फीडबैक सुनें' : t('playFeedback')}
                    </span>
                  </div>
                  {/* Animated waveform */}
                  <div className="flex items-center gap-0.5 h-4">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-blue-400 dark:bg-blue-500 rounded-full"
                        animate={isSpeaking ? {
                          height: [3, Math.random() * 12 + 4, 3],
                        } : {
                          height: 3
                        }}
                        transition={isSpeaking ? {
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.03,
                        } : {}}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Context Reminder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="mb-4 text-center lg:max-w-2xl lg:mx-auto"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {session?.mode === 'interview' 
              ? t('interviewContextReminder')
              : session?.mode === 'presentation'
              ? t('presentationContextReminder')
              : session?.mode === 'casual'
              ? t('casualContextReminder')
              : t('defaultContextReminder')}
          </p>
        </motion.div>

        {/* Performance Scores */}
        {session?.scoring && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4 sm:mb-6 lg:mb-8 lg:max-w-2xl lg:mx-auto"
          >
            <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 overflow-hidden dark:border-slate-700">
              <CardContent className="p-4 sm:p-5">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  {t('performanceIndicators')}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 font-medium">Clarity</p>
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      session.scoring.clarity === 'high' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : session.scoring.clarity === 'medium'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {session.scoring.clarity === 'high' ? 'Strong' : session.scoring.clarity === 'medium' ? 'Good' : 'Okay'}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 font-medium">Structure</p>
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      session.scoring.structure === 'high' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : session.scoring.structure === 'medium'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {session.scoring.structure === 'high' ? 'Strong' : session.scoring.structure === 'medium' ? 'Good' : 'Okay'}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 font-medium">Confidence</p>
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      session.scoring.confidence === 'high' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : session.scoring.confidence === 'medium'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {session.scoring.confidence === 'high' ? 'Strong' : session.scoring.confidence === 'medium' ? 'Good' : 'Okay'}
                    </div>
                  </div>
                </div>
                {session.filler_word_count > 5 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700"
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      💡 {t('fillerWordsDetected')} {session.filler_word_count} {t('fillerWordsBoost')}
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Feedback Cards */}
        <div className="space-y-4 lg:space-y-5 lg:max-w-2xl lg:mx-auto">
          {/* What you did well */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <Card className="border-0 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">{t('whatYouDidWell')}</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed break-words">
                      {session?.feedback?.did_well || 'Your response showed confidence and clarity.'}
                    </p>
                    {session?.mode && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2.5 font-medium">
                        {session.mode === 'interview' 
                          ? t('interviewStrength')
                          : session.mode === 'presentation'
                          ? t('presentationStrength')
                          : session.mode === 'casual'
                          ? t('casualStrength')
                          : `${t('defaultStrength')} ${session.mode} practice.`}
                      </p>
                    )}
                    {session?.feedback?.reasoning && (
                      <p className="text-xs text-gray-400 mt-2 italic">
                        {session.feedback.reasoning}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* What can be improved */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <Card className="border-0 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">{t('whatCanBeImproved')}</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed break-words">
                      {session?.feedback?.improve || 'You can strengthen this by reducing filler words and adding more structure.'}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2.5 font-medium">
                      {session?.mode === 'interview' 
                        ? t('interviewImprovement')
                        : session?.mode === 'presentation'
                        ? t('presentationImprovement')
                        : session?.mode === 'casual'
                        ? t('casualImprovement')
                        : t('defaultImprovement')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* One actionable tip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          >
            <Card className="border-0 shadow-sm overflow-hidden bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-800 dark:border-slate-700">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">{t('oneActionableTip')}</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed break-words">
                      {session?.feedback?.tip || 'Try pausing briefly before answering to gather your thoughts.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Confidence Replay - Transformation Moment */}
          {session?.feedback?.rephrased_version && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
            >
              <Card className="border-0 shadow-sm overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-100 dark:border-purple-800">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <motion.div 
                      className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 text-sm sm:text-base">
                        {session?.mode === 'interview' 
                          ? t('strongCandidateAnswer')
                          : session?.mode === 'presentation'
                          ? t('strongPresenterAnswer')
                          : session?.mode === 'casual'
                          ? t('naturalAnswer')
                          : t('betterAnswer')}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {session?.mode === 'casual' 
                          ? t('focusPatternNotWords')
                          : t('focusPatternPresentation')}
                      </p>
                      
                      {/* Always show the improved version text */}
                      <div className="bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-lg p-3 border border-purple-100 dark:border-purple-800 mb-3">
                        <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed italic break-words">
                          "{session.feedback.rephrased_version}"
                        </p>
                      </div>
                      
                      <button
                        onClick={speakRephrasing}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors flex items-center gap-1.5"
                      >
                        {isPlayingRephrased ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-purple-600 dark:fill-purple-400" />
                            {t('pause')}
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-purple-600 dark:fill-purple-400" />
                            {language === 'hindi' ? 'फिर से चलाएँ' : t('playAgain')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Session Summary */}
        <div className="mt-6 sm:mt-8 lg:mt-10 lg:max-w-2xl lg:mx-auto">
          <SessionSummary session={session} />
        </div>

        {/* Voice Profile Insight */}
        {voiceProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            className="mt-4 sm:mt-6 lg:max-w-2xl lg:mx-auto"
          >
            <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-100 dark:border-indigo-800">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 dark:text-indigo-400 text-sm">👤</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">{t('yourVoiceProfile')}</h4>
                    <p className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed break-words">{voiceProfile}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Next Question Intelligence */}
        {session?.retry_focus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            className="mt-4 sm:mt-6 lg:max-w-2xl lg:mx-auto"
          >
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('whatsNext')}</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {session?.mode === 'interview' 
                    ? <>{t('nextFocusInterview')} <span className="font-semibold text-blue-700 dark:text-blue-400">{session.retry_focus || t('improvement')}</span>, {t('basedOnResponse')}</>
                    : session?.mode === 'presentation'
                    ? <>{t('nextFocusPresentation')} <span className="font-semibold text-purple-700 dark:text-purple-400">{session.retry_focus || t('confidence')}</span> {t('audienceEngagement')}</>
                    : session?.mode === 'casual'
                    ? <>{t('nextFocusCasual')} <span className="font-semibold text-green-700 dark:text-green-400">{t('fluency')}</span>, {t('basedOnSpeaking')}</>
                    : <>{t('nextFocusDefault')} <span className="font-semibold text-blue-700 dark:text-blue-400">{session.retry_focus}</span>, {t('basedOnResponse')}</>}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* CTAs */}
        <div className="space-y-3 mt-4 sm:mt-6 lg:max-w-2xl lg:mx-auto">
          {/* Retry Same Question */}
          {session?.retry_focus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.72, duration: 0.4 }}
            >
              <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.15, ease: "easeOut" }}>
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  className="w-full h-auto rounded-xl border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 active:bg-gray-100 dark:active:bg-slate-600 hover:border-gray-300 dark:hover:border-slate-500 font-medium shadow-sm touch-manipulation text-[15px] px-4 py-3 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-[17px] h-[17px]" />
                  <span>{session?.mode === 'presentation' ? t('retrySegment') : session?.mode === 'casual' ? t('retryThisOne') : t('retryQuestion')}</span>
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Primary CTA - Next Question */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.78, duration: 0.4 }}
          >
            <Link to={createPageUrl('Home')}>
              <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.15, ease: "easeOut" }}>
                <Button 
                  className="w-full h-auto rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm touch-manipulation flex flex-col items-center justify-center gap-0.5 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Target className="w-[17px] h-[17px]" />
                    <span className="font-semibold text-[15px] sm:text-base">
                      {session?.mode === 'presentation' 
                        ? t('nextSegment')
                        : session?.mode === 'casual'
                        ? t('continueNextQuestion')
                        : t('nextQuestion')}
                    </span>
                  </div>
                  <span className="text-[11px] sm:text-xs font-normal opacity-75">
                    {t('focusedOn')} {session?.retry_focus || (session?.mode === 'presentation' ? t('confidence') : t('improvement'))}
                  </span>
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>

        {/* TTS Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.82 }}
          className="mt-6 sm:mt-8 lg:max-w-2xl lg:mx-auto"
        >
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4">
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed text-center">
              {language === 'hindi' 
                ? 'ऑडियो प्लेबैक आपके ब्राउज़र या डिवाइस में उपलब्ध टेक्स्ट-टू-स्पीच वॉइस पर निर्भर करता है। बेहतर अनुभव के लिए, अपनी भाषा (हिंदी या अंग्रेज़ी) की वॉइस सेटिंग्स देखें।'
                : 'Audio playback depends on the text-to-speech voices available in your browser or device settings. For the best experience, check your language voice settings.'}
            </p>
          </div>
        </motion.div>

        {/* Privacy Confidence Boost */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="text-center mb-6 lg:max-w-2xl lg:mx-auto"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
            <span>🔒</span>
            <span>{t('privacyNote')}</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
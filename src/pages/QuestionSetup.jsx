import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, Edit3, MessageCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/SettingsProvider';
import { getTranslation } from '@/components/translations';

export default function QuestionSetup() {
  const navigate = useNavigate();
  const { language } = useSettings();
  const t = (key) => getTranslation(key, language);
  
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'presentation';

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const isAuthenticated = await api.auth.isAuthenticated();
      if (!isAuthenticated) {
        navigate(createPageUrl('Intro'), { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);
  const [useManualQuestion, setUseManualQuestion] = useState(false);
  const [manualQuestion, setManualQuestion] = useState('');
  const [presentationType, setPresentationType] = useState('business');
  const [audienceType, setAudienceType] = useState('general');
  const [duration, setDuration] = useState('short');

  const modeLabels = {
    presentation: 'Presentation Practice',
    casual: 'Casual Speaking'
  };

  const handleStart = () => {
    const params = new URLSearchParams({
      mode,
      presentationType: mode === 'presentation' ? presentationType : '',
      audienceType: mode === 'presentation' ? audienceType : '',
      duration: mode === 'presentation' ? duration : ''
    });
    
    if (useManualQuestion) {
      if (!manualQuestion.trim()) return;
      params.append('manual', 'true');
      params.append('prompt', manualQuestion);
    }
    
    navigate(createPageUrl('VoicePractice') + `?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-900 safe-area-inset transition-colors duration-300">
      <div className="max-w-md lg:max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center mb-8"
        >
          <Link 
            to={createPageUrl('Home')}
            className="w-11 h-11 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center active:bg-gray-200 dark:active:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors touch-manipulation"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="flex-1 text-center text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 pr-11 sm:pr-10 truncate">
            {mode === 'presentation' ? t('presentationPractice') : t('casualSpeaking')}
          </h1>
        </motion.div>

        {/* Content */}
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 sm:p-6 mb-6 transition-colors duration-300"
          >
            {/* Toggle Mode */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setUseManualQuestion(false)}
                className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                  !useManualQuestion 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
                >
                <Sparkles className="w-4 h-4 inline-block mr-1.5" />
                {language === 'english' ? 'AI Prompt' : 'AI प्रॉम्प्ट'}
                </button>
                <button
                onClick={() => setUseManualQuestion(true)}
                className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                  useManualQuestion 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
                >
                <Edit3 className="w-4 h-4 inline-block mr-1.5" />
                {language === 'english' ? 'My Prompt' : 'मेरा प्रॉम्प्ट'}
                </button>
            </div>

            {useManualQuestion ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block">
                    {language === 'english' ? 'Enter your practice prompt' : 'अपना अभ्यास प्रॉम्प्ट दर्ज करें'}
                  </label>
                  <textarea
                    value={manualQuestion}
                    onChange={(e) => setManualQuestion(e.target.value)}
                    placeholder={mode === 'presentation' 
                      ? (language === 'english' ? "e.g. Present the key benefits of remote work" : "जैसे: रिमोट वर्क के मुख्य लाभ प्रस्तुत करें")
                      : (language === 'english' ? "e.g. Describe your morning routine" : "जैसे: अपनी सुबह की दिनचर्या का वर्णन करें")}
                    className="w-full min-h-[120px] p-3 rounded-xl border bg-white text-gray-900 placeholder:text-gray-400 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200 dark:placeholder:text-gray-400 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none resize-none text-sm transition-colors"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <Sparkles className="w-12 h-12 text-blue-500 dark:text-blue-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {language === 'english' ? 'AI will generate a practice prompt for you' : 'AI आपके लिए एक अभ्यास प्रॉम्प्ट बनाएगा'}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Context Summary Cards */}
          {mode === 'presentation' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 mb-6"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {language === 'english' ? "What you'll practice" : 'आप क्या अभ्यास करेंगे'}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {language === 'english'
                  ? "You'll practice explaining your topic as a short presentation focused on clarity, confidence, and audience engagement."
                  : 'आप अपने विषय को स्पष्टता, आत्मविश्वास और दर्शकों की सहभागिता पर केंद्रित एक संक्षिप्त प्रस्तुति के रूप में समझाने का अभ्यास करेंगे।'}
              </p>
            </motion.div>
          )}

          {mode === 'casual' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6"
            >
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                      {language === 'english' ? "What you'll practice" : 'आप क्या अभ्यास करेंगे'}
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {language === 'english'
                        ? "You'll practice speaking naturally about everyday topics to build fluency, clarity, and comfort—without pressure or perfect answers."
                        : 'आप रोज़मर्रा के विषयों के बारे में स्वाभाविक रूप से बोलने का अभ्यास करेंगे ताकि प्रवाह, स्पष्टता और आराम बढ़े—बिना दबाव या सही उत्तरों की चिंता किए।'}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                {language === 'english'
                  ? 'Casual practice helps you build confidence for real conversations.'
                  : 'रोज़मर्रा का अभ्यास वास्तविक बातचीत के लिए आत्मविश्वास बढ़ाने में मदद करता है।'}
              </p>
            </motion.div>
          )}

          {/* Start Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={handleStart}
              disabled={useManualQuestion ? !manualQuestion.trim() : false}
              style={{
                WebkitTapHighlightColor: 'transparent',
              }}
              className="w-full h-12 sm:h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 dark:active:from-blue-800 dark:active:to-blue-900 text-white font-semibold shadow-lg shadow-blue-200 dark:shadow-blue-900/40 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {t('startPractice')}
            </Button>
          </motion.div>

          {/* Privacy Confidence */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-6 sm:mt-8"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
              <span>🔒</span>
              <span>{t('privacyNote')}</span>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
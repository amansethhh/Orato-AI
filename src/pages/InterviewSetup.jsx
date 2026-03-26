import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, Edit3 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/components/SettingsProvider';
import { getTranslation } from '@/components/translations';

export default function InterviewSetup() {
  const navigate = useNavigate();
  const { language } = useSettings();
  const t = (key) => getTranslation(key, language);

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
  
  const [interviewType, setInterviewType] = useState('behavioral');
  const [jobRole, setJobRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('fresher');
  const [useManualQuestion, setUseManualQuestion] = useState(false);
  const [manualQuestion, setManualQuestion] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    if (useManualQuestion) {
      if (!manualQuestion.trim()) return;
      setIsStarting(true);
      // Pass interview context even for manual questions
      const params = new URLSearchParams({
        mode: 'interview',
        manual: 'true',
        prompt: manualQuestion,
        type: interviewType,
        role: jobRole,
        experience: experienceLevel
      });
      setTimeout(() => {
        navigate(createPageUrl('VoicePractice') + `?${params.toString()}`);
      }, 800);
    } else {
      if (!jobRole.trim()) return;
      setIsStarting(true);
      const params = new URLSearchParams({
        mode: 'interview',
        type: interviewType,
        role: jobRole,
        experience: experienceLevel
      });
      setTimeout(() => {
        navigate(createPageUrl('VoicePractice') + `?${params.toString()}`);
      }, 800);
    }
  };

  const isFormValid = useManualQuestion ? manualQuestion.trim() : jobRole.trim();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-900 safe-area-inset transition-colors duration-300">
      <div className="max-w-md lg:max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center justify-center mb-8"
        >
          <Link 
            to={createPageUrl('Home')}
            className="absolute left-0 w-11 h-11 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center active:bg-gray-200 dark:active:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors touch-manipulation"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('interviewSetup')}
          </h1>
        </motion.div>

        {/* Contextual Helper */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8 px-2"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('contextHelper')}
          </p>
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
            <div className="mb-5">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setUseManualQuestion(false)}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                    !useManualQuestion 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                  }`}
                >
                  <Sparkles className="w-4 h-4 inline-block mr-1.5" />
                  {t('aiQuestion')}
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
                  {t('myQuestion')}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {language === 'english'
                  ? "Choose how you'd like to practice — AI-generated or your own question."
                  : 'चुनें कि आप कैसे अभ्यास करना चाहते हैं — AI-जनित या आपका अपना प्रश्न।'}
              </p>
            </div>

            {useManualQuestion ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
                key="manual"
              >
                <div>
                  <Label htmlFor="manual-question" className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block">
                    {t('enterQuestion')}
                  </Label>
                  <textarea
                    id="manual-question"
                    value={manualQuestion}
                    onChange={(e) => setManualQuestion(e.target.value)}
                    placeholder={language === 'english' ? 'e.g. Tell me about a time you faced a difficult challenge' : 'जैसे: मुझे एक कठिन चुनौती के बारे में बताएं जिसका आपने सामना किया'}
                    className="w-full min-h-[120px] p-3 rounded-xl border bg-white text-gray-900 placeholder:text-gray-400 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200 dark:placeholder:text-gray-400 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none resize-none text-sm transition-colors"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                    {language === 'english'
                      ? 'Orato AI will still analyze clarity, structure, confidence, and filler words in your response.'
                      : 'Orato AI अभी भी आपकी प्रतिक्रिया में स्पष्टता, संरचना, आत्मविश्वास और फिलर शब्दों का विश्लेषण करेगा।'}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
                key="ai"
              >
                <div>
                  <Label htmlFor="interview-type" className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block">
                    {t('interviewType')}
                  </Label>
                  <Select value={interviewType} onValueChange={setInterviewType}>
                    <SelectTrigger id="interview-type" className="w-full bg-white border-gray-300 text-gray-900 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                      <SelectItem value="behavioral" className="text-gray-900 dark:text-gray-200 dark:focus:bg-slate-700">{t('hrBehavioralFull')}</SelectItem>
                      <SelectItem value="technical" className="text-gray-900 dark:text-gray-200 dark:focus:bg-slate-700">{t('technicalFull')}</SelectItem>
                      <SelectItem value="managerial" className="text-gray-900 dark:text-gray-200 dark:focus:bg-slate-700">{t('managerialFull')}</SelectItem>
                      <SelectItem value="leadership" className="text-gray-900 dark:text-gray-200 dark:focus:bg-slate-700">{t('leadershipFull')}</SelectItem>
                      <SelectItem value="mixed" className="text-gray-900 dark:text-gray-200 dark:focus:bg-slate-700">{t('mockInterviewMixed')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    {language === 'english' 
                      ? 'Determines the style and focus of questions you\'ll be asked.'
                      : 'यह निर्धारित करता है कि आपसे किस शैली और फोकस के प्रश्न पूछे जाएंगे।'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="job-role" className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block">
                    {t('jobRole')}
                  </Label>
                  <Input
                    id="job-role"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder={language === 'english' ? 'e.g. Software Engineer' : 'जैसे: सॉफ्टवेयर इंजीनियर'}
                    className="w-full bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:placeholder:text-gray-400"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    {language === 'english'
                      ? 'Be specific to receive more relevant and realistic questions.'
                      : 'अधिक प्रासंगिक और यथार्थवादी प्रश्न प्राप्त करने के लिए विशिष्ट रहें।'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="experience" className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block">
                    {t('experienceLevel')} <span className="text-gray-400 dark:text-gray-500 font-normal">({t('optional')})</span>
                  </Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger id="experience" className="w-full bg-white border-gray-300 text-gray-900 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                      <SelectItem value="fresher" className="text-gray-900 dark:text-gray-200 dark:focus:bg-slate-700">{t('fresherLevel')}</SelectItem>
                      <SelectItem value="1-3" className="text-gray-900 dark:text-gray-200 dark:focus:bg-slate-700">{t('oneToThreeYears')}</SelectItem>
                      <SelectItem value="3-7" className="text-gray-900 dark:text-gray-200 dark:focus:bg-slate-700">{t('threeToSevenYears')}</SelectItem>
                      <SelectItem value="senior" className="text-gray-900 dark:text-gray-200 dark:focus:bg-slate-700">{t('seniorLevel')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    {language === 'english'
                      ? 'Optional — but recommended for more accurate difficulty calibration.'
                      : 'वैकल्पिक — लेकिन बेहतर कठिनाई निर्धारण के लिए अनुशंसित।'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Trust & Privacy */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
                <span>🔒</span>
                <span>{language === 'english' 
                  ? 'Your inputs are used only for real-time coaching and are never stored.'
                  : 'आपकी इनपुट केवल रियल-टाइम कोचिंग के लिए उपयोग की जाती है और कभी संग्रहीत नहीं की जाती।'}</span>
              </p>
            </div>
          </motion.div>

          {/* Confidence Confirmation Strip */}
          {!useManualQuestion && jobRole.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-4 mb-6"
            >
              <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">✅</span>
                <span>
                  {language === 'english' 
                    ? <>Ready to practice <span className="font-semibold">{interviewType === 'behavioral' ? t('hrBehavioralFull') : interviewType === 'technical' ? t('technicalFull') : interviewType === 'managerial' ? t('managerialFull') : interviewType === 'leadership' ? t('leadershipFull') : t('mockInterviewMixed')}</span> interview questions for a <span className="font-semibold">{jobRole}</span> ({experienceLevel === 'fresher' ? t('fresherLevel') : experienceLevel === '1-3' ? t('oneToThreeYears') : experienceLevel === '3-7' ? t('threeToSevenYears') : t('seniorLevel')}).</>
                    : <><span className="font-semibold">{jobRole}</span> के लिए <span className="font-semibold">{interviewType === 'behavioral' ? t('hrBehavioralFull') : interviewType === 'technical' ? t('technicalFull') : interviewType === 'managerial' ? t('managerialFull') : interviewType === 'leadership' ? t('leadershipFull') : t('mockInterviewMixed')}</span> इंटरव्यू प्रश्नों का अभ्यास करने के लिए तैयार ({experienceLevel === 'fresher' ? t('fresherLevel') : experienceLevel === '1-3' ? t('oneToThreeYears') : experienceLevel === '3-7' ? t('threeToSevenYears') : t('seniorLevel')}).</>}
                </span>
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
              disabled={!isFormValid || isStarting}
              style={{
                WebkitTapHighlightColor: 'transparent',
              }}
              className="w-full h-12 sm:h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 dark:active:from-blue-800 dark:active:to-blue-900 text-white font-semibold shadow-lg shadow-blue-200 dark:shadow-blue-900/40 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isStarting ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block"
                  >
                    ⚙️
                  </motion.span>
                  {t('preparingInterview')}
                </span>
              ) : (
                t('startInterviewPractice')
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
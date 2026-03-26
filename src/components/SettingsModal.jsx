import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Globe, User, Target, MessageSquare, Lock, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/components/SettingsProvider';
import { getTranslation } from '@/components/translations';

export default function SettingsModal({ isOpen, onClose }) {
  const {
    appearance,
    language,
    coachingFocus,
    feedbackStyle,
    user,
    updateAppearance,
    updateLanguage,
    updateCoachingFocus,
    updateFeedbackStyle,
    logout,
  } = useSettings();

  const [isLoading, setIsLoading] = useState(false);
  const t = (key) => getTranslation(key, language);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await base44.auth.redirectToLogin(window.location.href);
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings')}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settingsSubtitle')}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-5 space-y-6">
            {/* Appearance */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                {appearance === 'light' ? (
                  <Sun className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('appearance')}</h3>
              </div>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => updateAppearance('light')}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                    appearance === 'light'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('light')}
                </button>
                <button
                  onClick={() => updateAppearance('dark')}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                    appearance === 'dark'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('dark')}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('appearanceDesc')}</p>
            </section>

            {/* Language */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('language')}</h3>
              </div>
              <div className="space-y-2 mb-2">
                <button
                  onClick={() => updateLanguage('english')}
                  className={`w-full py-2.5 px-4 rounded-xl text-left font-medium text-sm transition-all flex items-center justify-between ${
                    language === 'english'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>English</span>
                  {language === 'english' && <span className="text-blue-600 dark:text-blue-400">✓</span>}
                </button>
                <button
                  onClick={() => updateLanguage('hindi')}
                  className={`w-full py-2.5 px-4 rounded-xl text-left font-medium text-sm transition-all flex items-center justify-between ${
                    language === 'hindi'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>हिंदी</span>
                  {language === 'hindi' && <span className="text-blue-600 dark:text-blue-400">✓</span>}
                </button>
                <div className="py-2.5 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-sm border-2 border-transparent cursor-not-allowed">
                  {t('moreLanguages')}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('languageDesc')}</p>
            </section>

            {/* Account */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('account')}</h3>
              </div>
              {user ? (
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('signedInAs')}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</p>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full"
                  >
                    {t('logOut')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t('accountDesc')}
                  </p>
                  <Button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {t('continueWithGoogle')}
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full"
                  >
                    {t('continueAsGuest')}
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
                🔒 {t('accountPrivacy')}
              </p>
            </section>

            {/* Coaching Preferences */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('coachingPreferences')}</h3>
              </div>
              
              {/* Coaching Focus */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('coachingFocus')}</p>
                <div className="space-y-2 mb-2">
                  {['confidence', 'clarity', 'structure', 'fluency'].map((focus) => (
                    <button
                      key={focus}
                      onClick={() => updateCoachingFocus(focus)}
                      className={`w-full py-2 px-4 rounded-lg text-left text-sm transition-all ${
                        coachingFocus === focus
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t(focus)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('coachingFocusDesc')}</p>
              </div>

              {/* Feedback Style */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('feedbackStyle')}</p>
                </div>
                <div className="space-y-2 mb-2">
                  {['encouraging', 'balanced', 'direct'].map((style) => (
                    <button
                      key={style}
                      onClick={() => updateFeedbackStyle(style)}
                      className={`w-full py-2 px-4 rounded-lg text-left text-sm transition-all ${
                        feedbackStyle === style
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t(style)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('feedbackStyleDesc')}</p>
              </div>
            </section>

            {/* Privacy */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('privacyTitle')}</h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  {t('privacySubtitle')}
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5">✓</span>
                    <span><strong>{t('voiceRecordings')}</strong> {t('voiceRecordingsDesc')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5">✓</span>
                    <span><strong>{t('transcripts')}</strong> {t('transcriptsDesc')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5">✓</span>
                    <span><strong>{t('whatWeSave')}</strong> {t('whatWeSaveDesc')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5">✓</span>
                    <span><strong>{t('yourPreferences')}</strong> {t('yourPreferencesDesc')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">✗</span>
                    <span><strong>{t('neverShared')}</strong> {t('neverSharedDesc')}</span>
                  </li>
                </ul>
                <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed pt-2 border-t border-gray-200 dark:border-gray-700">
                  {t('privacyFooter')}
                </p>
              </div>
            </section>

            {/* Contact Developer */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('support')}</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('supportDesc')}</p>
              <a
                href="https://www.linkedin.com/in/amansethhh/"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('contactDeveloper')}
                </Button>
              </a>
            </section>

            {/* About */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('aboutTitle')}</h3>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30 space-y-3">
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {t('aboutIntro')}
                </p>
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    <strong className="text-gray-700 dark:text-gray-300">{t('ourMission')}</strong><br />
                    {t('missionDesc')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    <strong className="text-gray-700 dark:text-gray-300">{t('howItWorks')}</strong><br />
                    {t('howItWorksDesc')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    <strong className="text-gray-700 dark:text-gray-300">{t('whoItsFor')}</strong><br />
                    {t('whoItsForDesc')}
                  </p>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed pt-2 border-t border-blue-200 dark:border-blue-800">
                  {t('aboutFooter')}
                </p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
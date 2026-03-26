import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/api/apiClient';
import { useSettings } from '@/components/SettingsProvider';
import { getTranslation } from '@/components/translations';

export default function LoginPrompt({ isOpen, onClose }) {
  const { language } = useSettings();
  const t = (key) => getTranslation(key, language);

  const handleLogin = async () => {
    try {
      // In local mode, user is always authenticated — just close the prompt
      onClose();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl z-50 p-6"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
              {t('loginRequired')}
            </h2>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6 leading-relaxed">
              {t('loginMessage')}
            </p>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                {t('loginNow')}
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full"
              >
                {t('continueAsGuest')}
              </Button>
            </div>

            {/* Privacy Note */}
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-4">
              🔒 {t('accountPrivacy')}
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
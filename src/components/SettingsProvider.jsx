import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

// Load theme from localStorage synchronously BEFORE first render
const getInitialAppearance = () => {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem('orato_appearance') || 'light';
};

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return 'english';
  return localStorage.getItem('orato_language') || 'english';
};

const getInitialCoachingFocus = () => {
  if (typeof window === 'undefined') return 'confidence';
  return localStorage.getItem('orato_coaching_focus') || 'confidence';
};

const getInitialFeedbackStyle = () => {
  if (typeof window === 'undefined') return 'encouraging';
  return localStorage.getItem('orato_feedback_style') || 'encouraging';
};

export const SettingsProvider = ({ children }) => {
  const [appearance, setAppearance] = useState(getInitialAppearance);
  const [language, setLanguage] = useState(getInitialLanguage);
  const [coachingFocus, setCoachingFocus] = useState(getInitialCoachingFocus);
  const [feedbackStyle, setFeedbackStyle] = useState(getInitialFeedbackStyle);
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Apply theme IMMEDIATELY on mount and changes using useLayoutEffect
  React.useLayoutEffect(() => {
    if (appearance === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appearance]);

  // Load user and preferences on mount
  useEffect(() => {
    loadUserAndPreferences();
  }, []);

  const loadUserAndPreferences = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load preferences from user data or localStorage
      const savedAppearance = currentUser?.appearance || localStorage.getItem('orato_appearance') || 'light';
      const savedLanguage = currentUser?.language || localStorage.getItem('orato_language') || 'english';
      const savedFocus = currentUser?.coaching_focus || localStorage.getItem('orato_coaching_focus') || 'confidence';
      const savedStyle = currentUser?.feedback_style || localStorage.getItem('orato_feedback_style') || 'encouraging';

      setAppearance(savedAppearance);
      setLanguage(savedLanguage);
      setCoachingFocus(savedFocus);
      setFeedbackStyle(savedStyle);
    } catch {
      // Not logged in - load from localStorage
      setAppearance(localStorage.getItem('orato_appearance') || 'light');
      setLanguage(localStorage.getItem('orato_language') || 'english');
      setCoachingFocus(localStorage.getItem('orato_coaching_focus') || 'confidence');
      setFeedbackStyle(localStorage.getItem('orato_feedback_style') || 'encouraging');
      setUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const updateAppearance = async (value) => {
    setAppearance(value);
    localStorage.setItem('orato_appearance', value);
    try {
      if (user) await base44.auth.updateMe({ appearance: value });
    } catch (e) {
      console.error('Failed to save appearance:', e);
    }
  };

  const updateLanguage = async (value) => {
    setLanguage(value);
    localStorage.setItem('orato_language', value);
    try {
      if (user) await base44.auth.updateMe({ language: value });
    } catch (e) {
      console.error('Failed to save language:', e);
    }
  };

  const updateCoachingFocus = async (value) => {
    setCoachingFocus(value);
    localStorage.setItem('orato_coaching_focus', value);
    try {
      if (user) await base44.auth.updateMe({ coaching_focus: value });
    } catch (e) {
      console.error('Failed to save coaching focus:', e);
    }
  };

  const updateFeedbackStyle = async (value) => {
    setFeedbackStyle(value);
    localStorage.setItem('orato_feedback_style', value);
    try {
      if (user) await base44.auth.updateMe({ feedback_style: value });
    } catch (e) {
      console.error('Failed to save feedback style:', e);
    }
  };

  const logout = async () => {
    // Clear intro flag immediately so user sees intro again
    localStorage.removeItem('orato_has_seen_intro');
    
    // Clear user state
    setUser(null);
    
    // Perform logout and redirect to Intro page
    try {
      await base44.auth.logout(window.location.origin + '/#/Intro');
    } catch {
      // If logout fails, still redirect to intro
      window.location.href = '/#/Intro';
    }
  };

  const value = {
    appearance,
    language,
    coachingFocus,
    feedbackStyle,
    user,
    isLoadingUser,
    updateAppearance,
    updateLanguage,
    updateCoachingFocus,
    updateFeedbackStyle,
    logout,
    refreshUser: loadUserAndPreferences,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SettingsProvider } from '@/components/SettingsProvider';
import { api } from '@/api/apiClient';
import { createPageUrl } from '@/utils';

// Apply theme synchronously before React renders ANYTHING
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('orato_appearance');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkIntroAndAuth = async () => {
      try {
        const hasSeenIntro = localStorage.getItem('orato_has_seen_intro');

        let isAuthenticated = false;
        try {
          isAuthenticated = await api.auth.isAuthenticated();
        } catch {
          isAuthenticated = true; // fallback: assume authenticated locally
        }

        // If user hasn't seen intro and not on intro page, redirect to intro
        if (!hasSeenIntro && currentPageName !== 'Intro') {
          navigate(createPageUrl('Intro'), { replace: true });
        }
      } catch {
        // If auth check fails, continue to let the page handle it
      } finally {
        setIsChecking(false);
      }
    };

    checkIntroAndAuth();
  }, [currentPageName, navigate, location.pathname]);

  // Show loading only briefly while checking
  if (isChecking && currentPageName !== 'Intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SettingsProvider>
      {children}
    </SettingsProvider>
  );
}
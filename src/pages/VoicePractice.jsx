import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Mic, Square, Loader2, Target } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import VoiceWaveform from '@/components/VoiceWaveform';
import ExpandableQuestion from '@/components/ExpandableQuestion';
import { useSettings } from '@/components/SettingsProvider';
import { getTranslation } from '@/components/translations';

const prompts = {
  interview: [
    "Tell me about yourself.",
    "What are your greatest strengths?",
    "Where do you see yourself in five years?",
    "Why should we hire you?",
    "Describe a challenge you've overcome."
  ],
  presentation: [
    "Introduce your project idea in 60 seconds.",
    "Explain the key benefits of your proposal.",
    "Summarize your main points clearly.",
    "Describe your vision for this initiative.",
    "Pitch your solution to a potential investor."
  ],
  casual: [
    "Tell me about your favorite hobby.",
    "Describe your ideal weekend.",
    "Share an interesting story from your life.",
    "What inspires you the most?",
    "Talk about something you learned recently."
  ]
};

const modeCoachingFocus = {
  interview: {
    focus: "structure, clarity, and relevance to the question",
    encourage: "structuring answers with a specific situation, action taken, and result achieved",
    avoid: "rambling or going off-topic"
  },
  presentation: {
    focus: "clarity, pacing, and confidence in delivery",
    encourage: "starting with a clear opening statement and ending with a strong conclusion",
    avoid: "rushing through points or unclear transitions"
  },
  casual: {
    focus: "natural fluency and conversational flow",
    encourage: "speaking smoothly with fewer hesitations",
    avoid: "excessive filler words like 'um', 'like', or 'you know'"
  }
};



export default function VoicePractice() {
  const navigate = useNavigate();
  const { language, user, coachingFocus, feedbackStyle } = useSettings();
  const t = (key) => getTranslation(key, language);
  
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'interview';
  const retryFocus = urlParams.get('retryFocus');
  const parentSessionId = urlParams.get('parentSession');
  const customPrompt = urlParams.get('prompt');
  const isManual = urlParams.get('manual') === 'true';
  
  // Interview context parameters
  const interviewType = urlParams.get('type');
  const jobRole = urlParams.get('role');
  const experienceLevel = urlParams.get('experience');
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [sessionState, setSessionState] = useState('ready'); // ready, listening, analyzing, coaching
  const [coachingHint, setCoachingHint] = useState('');
  const [showCoachingHint, setShowCoachingHint] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [audioStream, setAudioStream] = useState(null);
  const [processingError, setProcessingError] = useState(null);
  const totalQuestions = 5;
  
  // Presentation context parameters
  const presentationType = urlParams.get('presentationType');
  const audienceType = urlParams.get('audienceType');
  const duration = urlParams.get('duration');
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const transcriptRef = useRef('');
  const recognitionRef = useRef(null);
  const isSubmittingRef = useRef(false);

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

  const modeLabels = {
    interview: t('interviewPractice'),
    presentation: t('presentationPractice'),
    casual: t('casualSpeaking')
  };

  useEffect(() => {
    if (customPrompt) {
      // Use custom prompt if provided (manual or retry)
      setCurrentPrompt(decodeURIComponent(customPrompt));
    } else if (mode === 'interview' && !isManual) {
      // Generate context-aware interview question
      generateInterviewQuestion();
    } else if (!isManual) {
      // Generate dynamic prompt for non-interview modes
      generateDynamicPrompt();
    }
  }, [mode, customPrompt, isManual]);

  const generateInterviewQuestion = async () => {
    setIsGeneratingQuestion(true);
    try {
      const typeDescriptions = {
        behavioral: 'behavioral/HR focusing on teamwork, challenges, and soft skills',
        technical: 'technical focusing on problem-solving approach and methodology',
        managerial: 'managerial focusing on leadership, delegation, and decision-making',
        leadership: 'leadership focusing on vision, team motivation, and influence',
        mixed: 'mixed covering both behavioral and situational aspects'
      };

      const experienceDescriptions = {
        fresher: 'suitable for fresh graduates or students',
        '1-3': 'suitable for early-career professionals with 1-3 years experience',
        '3-7': 'suitable for mid-level professionals with 3-7 years experience',
        senior: 'suitable for senior professionals with significant experience'
      };

      let contextPrompt = `Generate ONE realistic ${typeDescriptions[interviewType] || 'behavioral'} interview question`;

      if (jobRole) {
        contextPrompt += ` for a ${jobRole} role`;
      }

      if (experienceLevel && experienceDescriptions[experienceLevel]) {
        contextPrompt += `, ${experienceDescriptions[experienceLevel]}`;
      }

      contextPrompt += `.\n\nRules:
  - Make it specific and relevant
  - Avoid generic questions
  - Focus on real scenarios
  - Keep it clear and direct
  - DO NOT repeat common questions

  Output ONLY the question, nothing else.`;

      const languageEnforcement = language === 'hindi'
        ? `\n\nðŸ”’ CRITICAL: Your question MUST be in pure Hindi. Even if the job role is in English, generate the question natively in Hindi. Do not translate - think in Hindi.`
        : `\n\nðŸ”’ CRITICAL: Your question MUST be in English only.`;

      const result = await api.integrations.Core.InvokeLLM({
        prompt: contextPrompt + languageEnforcement,
        response_json_schema: {
          type: "object",
          properties: {
            question: { type: "string" }
          }
        }
      });
      setCurrentPrompt(result.question);
    } catch (error) {
      const randomPrompt = prompts.interview[Math.floor(Math.random() * prompts.interview.length)];
      setCurrentPrompt(randomPrompt);
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const generateDynamicPrompt = async () => {
    setIsGeneratingQuestion(true);
    try {
      const promptTypes = {
        presentation: 'Generate ONE clear presentation prompt that asks the user to present or explain something. Keep it focused and specific. Examples: "Present the benefits of renewable energy" or "Explain your approach to time management".',
        casual: 'Generate ONE conversational speaking prompt about everyday topics. Keep it natural and relatable. Examples: "Describe your ideal vacation" or "Talk about a skill you\'re learning".'
      };

      const languagePrefixPrompt = language === 'hindi'
        ? `ðŸ”’ LANGUAGE: Generate the prompt in pure, native Hindi only.\n\n`
        : `ðŸ”’ LANGUAGE: Generate the prompt in English only.\n\n`;

      const result = await api.integrations.Core.InvokeLLM({
        prompt: `${languagePrefixPrompt}${promptTypes[mode]}\n\nOutput ONLY the prompt, nothing else.`,
        response_json_schema: {
          type: "object",
          properties: {
            prompt: { type: "string" }
          }
        }
      });
      setCurrentPrompt(result.prompt);
    } catch (error) {
      const modePrompts = prompts[mode] || prompts.casual;
      const randomPrompt = modePrompts[Math.floor(Math.random() * modePrompts.length)];
      setCurrentPrompt(randomPrompt);
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Show coaching hint after 15 seconds
      const hintTimer = setTimeout(() => {
        const hints = mode === 'interview' 
          ? [
              "Try structuring your answer using the STAR method.",
              "Mention a concrete example to strengthen your response.",
              "Briefly explain the impact of your actions."
            ]
          : mode === 'presentation'
          ? [
              "Start with your main point, then support it.",
              "Keep your pacing steady and deliberate.",
              "End with a clear takeaway."
            ]
          : [
              "Speak smoothly and naturally.",
              "Take your time organizing your thoughts.",
              "Reduce filler words for clearer expression."
            ];
        
        setCoachingHint(hints[Math.floor(Math.random() * hints.length)]);
        setShowCoachingHint(true);
        
        // Auto-fade after 8 seconds
        setTimeout(() => setShowCoachingHint(false), 8000);
      }, 15000);
      
      return () => {
        clearTimeout(hintTimer);
        setShowCoachingHint(false);
      };
    } else {
      clearInterval(timerRef.current);
      setRecordingTime(0);
      setShowCoachingHint(false);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, mode]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // â”€â”€ Speech Recognition setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[VoicePractice] SpeechRecognition not available in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'hindi' ? 'hi-IN' : 'en-US';
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      transcriptRef.current = (finalTranscript + interim).trim();
    };

    recognition.onerror = (event) => {
      console.warn('[SpeechRecognition] error:', event.error);
      // Don't crash â€” transcript will just be empty
    };

    recognition.onend = () => {
      // Finalize whatever we have
      if (finalTranscript) {
        transcriptRef.current = finalTranscript.trim();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* already stopped */ }
      recognitionRef.current = null;
    }
  };

  const startRecording = async () => {
    if (isSubmittingRef.current) return; // prevent double-tap
    transcriptRef.current = ''; // reset transcript

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream); // for real waveform

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
        stopSpeechRecognition();
        await processRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setSessionState('listening');

      // Start Speech Recognition concurrently
      startSpeechRecognition();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setAudioStream(null);
      // Switch to demo mode on microphone error
      setIsProcessing(true);
      setSessionState('analyzing');

      // Show brief message then process demo
      setTimeout(async () => {
        await processRecording();
      }, 800);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setSessionState('analyzing');
    }
  };

  const processRecording = async () => {
    // Prevent duplicate submissions
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setIsProcessing(true);
    setSessionState('analyzing');
    
    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      
      // Upload the audio file (local blob URL)
      const { file_url } = await api.integrations.Core.UploadFile({ file: audioFile });

      // Use real transcript from Speech Recognition, or fall back to demo
      const realTranscript = (transcriptRef.current || '').trim();
      const isShortTranscript = realTranscript.split(/\s+/).length < 3;
      const useDemoTranscript = !realTranscript || isShortTranscript;

      const capturedTranscript = useDemoTranscript
        ? (mode === 'interview'
            ? "I'm a software engineer with five years of experience. I've worked on various projects and I really enjoy problem solving. Um, I think my biggest strength is being able to work well with teams."
            : mode === 'presentation'
            ? "So today I want to talk about our new project. It's really exciting and, um, we think it will be great for our users. The main benefits are efficiency and ease of use."
            : "I really love hiking. It's something I do every weekend. Um, you know, being in nature is really relaxing and it helps me clear my mind.")
        : realTranscript;

      console.log('[VoicePractice] Transcript:', useDemoTranscript ? '(demo fallback)' : `(${capturedTranscript.split(/\\s+/).length} words)`, capturedTranscript.slice(0, 120));
      
      // Create practice session
      const session = await api.entities.PracticeSession.create({
        mode,
        prompt: currentPrompt,
        transcript: capturedTranscript,
        audio_url: file_url
      });



      // Get parent session data for improvement comparison if this is a retry
      let parentSession = null;
      if (parentSessionId) {
        const sessions = await api.entities.PracticeSession.filter({ id: parentSessionId });
        if (sessions.length > 0) {
          parentSession = sessions[0];
        }
      }

      // Build and send the AI coaching prompt (all prompt logic in aiService.js)
      const { buildCoachingPrompt } = await import('@/api/aiService.js');
      const coachingPrompt = buildCoachingPrompt({
        mode,
        currentPrompt,
        transcript: capturedTranscript,
        language,
        feedbackStyle,
        coachingFocus,
        interviewType,
        jobRole,
        experienceLevel,
        parentSession,
        retryFocus,
      });

      const analysis = await api.integrations.Core.InvokeLLM({
        prompt: coachingPrompt,
        transcript: capturedTranscript,
      });

      console.log('[VoicePractice] AI response:', { isMock: analysis._isMock, scoring: analysis.scoring });

      // Update session with analysis
      await api.entities.PracticeSession.update(session.id, {
        transcript: capturedTranscript,
        feedback: {
          did_well: analysis.did_well,
          improve: analysis.improve,
          tip: analysis.tip,
          full_feedback: analysis.full_feedback,
          reasoning: analysis.reasoning || "Based on your delivery and content clarity.",
          rephrased_version: analysis.rephrased_version,
        },
        scoring: analysis.scoring,
        filler_word_count: analysis.filler_word_count,
        retry_focus: analysis.retry_focus,
        parent_session_id: parentSessionId || null,
      });

      setSessionState('coaching');
      navigate(createPageUrl('AIFeedback') + `?session=${session.id}${useDemoTranscript ? '&demo=true' : ''}`);
      
    } catch (error) {
      console.error('Error processing recording:', error);
      setProcessingError(error.message || 'Something went wrong');
      
      // Emergency fallback â€” create demo session using transcript-aware mock
      try {
        const fallbackTranscript = (transcriptRef.current || '').trim() || "I have experience in this area and enjoy working with teams.";
        
        const { buildCoachingPrompt: buildPrompt } = await import('@/api/aiService.js');
        const fallbackPrompt = buildPrompt({ mode, currentPrompt, transcript: fallbackTranscript, language, feedbackStyle, coachingFocus });
        const fallbackAnalysis = await api.integrations.Core.InvokeLLM({ prompt: fallbackPrompt, transcript: fallbackTranscript });

        const demoSession = await api.entities.PracticeSession.create({
          mode,
          prompt: currentPrompt,
          transcript: fallbackTranscript,
          scoring: fallbackAnalysis.scoring,
          filler_word_count: fallbackAnalysis.filler_word_count,
          retry_focus: fallbackAnalysis.retry_focus,
          feedback: {
            did_well: fallbackAnalysis.did_well,
            improve: fallbackAnalysis.improve,
            tip: fallbackAnalysis.tip,
            full_feedback: fallbackAnalysis.full_feedback,
            reasoning: fallbackAnalysis.reasoning,
            rephrased_version: fallbackAnalysis.rephrased_version,
          },
          parent_session_id: parentSessionId || null,
        });
        
        navigate(createPageUrl('AIFeedback') + `?session=${demoSession.id}&demo=true`);
      } catch (innerError) {
        console.error('Critical error in fallback:', innerError);
        setIsProcessing(false);
        setSessionState('ready');
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };


  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 safe-area-inset transition-colors duration-300">
      <div className="max-w-md lg:max-w-3xl xl:max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-4 sm:py-6 lg:py-8">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-white dark:from-slate-900 via-white dark:via-slate-900 to-transparent pb-4 -mt-4 pt-4 sm:-mt-6 sm:pt-6 lg:-mt-8 lg:pt-8 transition-colors duration-300">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center mb-6"
          >
            <Link 
              to={createPageUrl('Home')}
              className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center active:bg-gray-200 dark:active:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors touch-manipulation flex-shrink-0 min-w-[44px] min-h-[44px]"
            >
              <ChevronLeft className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="flex-1 text-center text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 pr-11 sm:pr-10 truncate">
              {modeLabels[mode]}
            </h1>
          </motion.div>

          {/* Session Progress */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-2"
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {mode === 'presentation' ? `Practice Segment ${questionNumber} of ${totalQuestions} â€¢ Introduction` : `Question ${questionNumber} of ${totalQuestions}`}
              </span>
            </div>
            <div className="w-full max-w-md mx-auto h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-blue-500 dark:bg-blue-600 rounded-full"
              />
            </div>
          </motion.div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center justify-center min-h-[70vh] lg:min-h-[75vh]">
          {/* Retry Focus Badge */}
          {retryFocus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 mb-6 flex items-center gap-2"
            >
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-semibold">{language === 'english' ? 'Focus on:' : 'à¤«à¥‹à¤•à¤¸:'}</span> {retryFocus}
              </p>
            </motion.div>
          )}

          {/* Context Pill - Sticky (Both Interview and Presentation) */}
          {mode === 'interview' && interviewType && jobRole && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex justify-center mb-4 sticky top-28 z-10"
            >
              <div className="bg-blue-50/95 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200 dark:border-blue-800 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
                <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full" />
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 font-medium">
                  {language === 'english'
                    ? `${interviewType === 'behavioral' ? 'HR / Behavioral' : interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} Interview â€¢ ${jobRole} â€¢ ${experienceLevel === 'fresher' ? 'Fresher' : experienceLevel === '1-3' ? '1â€“3 years' : experienceLevel === '3-7' ? '3â€“7 years' : 'Senior'}`
                    : `${interviewType === 'behavioral' ? 'à¤à¤šà¤†à¤° / à¤µà¥à¤¯à¤µà¤¹à¤¾à¤°à¤¿à¤•' : interviewType === 'technical' ? 'à¤¤à¤•à¤¨à¥€à¤•à¥€' : interviewType === 'managerial' ? 'à¤ªà¥à¤°à¤¬à¤‚à¤§à¤•à¥€à¤¯' : interviewType === 'leadership' ? 'à¤¨à¥‡à¤¤à¥ƒà¤¤à¥à¤µ' : interviewType} à¤‡à¤‚à¤Ÿà¤°à¤µà¥à¤¯à¥‚ â€¢ ${jobRole} â€¢ ${experienceLevel === 'fresher' ? 'à¤«à¥à¤°à¥‡à¤¶à¤°' : experienceLevel === '1-3' ? '1â€“3 à¤µà¤°à¥à¤·' : experienceLevel === '3-7' ? '3â€“7 à¤µà¤°à¥à¤·' : 'à¤¸à¥€à¤¨à¤¿à¤¯à¤°'}`}
                </p>
              </div>
            </motion.div>
          )}
          
          {mode === 'presentation' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex justify-center mb-4 sticky top-28 z-10"
            >
              <div className="bg-purple-50/95 dark:bg-purple-900/30 backdrop-blur-sm border border-purple-200 dark:border-purple-800 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
                <div className="w-1.5 h-1.5 bg-purple-500 dark:bg-purple-400 rounded-full" />
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 font-medium">
                  ðŸ“Š {language === 'english' ? 'Presentation' : 'à¤ªà¥à¤°à¥‡à¤œà¥‡à¤‚à¤Ÿà¥‡à¤¶à¤¨'} â€¢ {isManual ? (language === 'english' ? 'Custom Topic' : 'à¤•à¤¸à¥à¤Ÿà¤® à¤µà¤¿à¤·à¤¯') : (language === 'english' ? 'AI-Generated Topic' : 'AI-à¤œà¤¨à¤¿à¤¤ à¤µà¤¿à¤·à¤¯')}
                </p>
              </div>
            </motion.div>
          )}
          
          {mode === 'casual' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex justify-center mb-4 sticky top-28 z-10"
            >
              <div className="bg-green-50/95 dark:bg-green-900/30 backdrop-blur-sm border border-green-200 dark:border-green-800 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
                <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full" />
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 font-medium">
                  ðŸ’¬ {language === 'english' ? 'Casual Speaking â€¢ Everyday Conversation' : 'à¤°à¥‹à¤œà¤¼à¤®à¤°à¥à¤°à¤¾ à¤•à¥€ à¤¬à¤¾à¤¤à¤šà¥€à¤¤'}
                </p>
              </div>
            </motion.div>
          )}

          {/* Prompt */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-4 lg:max-w-2xl lg:mx-auto"
            >
            {isGeneratingQuestion ? (
              <div className="flex items-center justify-center gap-2 px-4">
                <Loader2 className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-spin" />
                <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400">{t('generatingQuestion')}</p>
              </div>
            ) : (
              <ExpandableQuestion prompt={currentPrompt} />
            )}
          </motion.div>

          {/* Context Awareness Helper */}
          {!isGeneratingQuestion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-16 lg:mb-20 px-4"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {mode === 'interview' 
                  ? 'Your answer is evaluated based on this context.'
                  : mode === 'presentation'
                  ? 'Your response is evaluated based on this presentation context.'
                  : 'This practice helps you sound natural and confident in everyday conversations.'}
              </p>
            </motion.div>
          )}

          {/* Recording UI */}
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center"
              >
                <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                  <Loader2 className="w-10 h-10 text-blue-500 dark:text-blue-400 animate-spin" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-medium">{t('analyzing')}</p>
              </motion.div>
            ) : (
              <motion.div
                key="recording"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center"
              >
                {/* Mic Button with pulse animation */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center transition-all duration-300 touch-manipulation min-w-[80px] min-h-[80px] ${
                    isRecording 
                      ? 'bg-red-500 shadow-lg shadow-red-500/40 dark:shadow-red-500/30' 
                      : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/40 dark:shadow-blue-500/30'
                  }`}
                >
                  {isRecording && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-red-400"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0, 0.5]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                  {isRecording ? (
                    <Square className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 text-white fill-white relative z-10" />
                    ) : (
                    <Mic className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white relative z-10" />
                  )}
                </motion.button>

                {/* Session State & Recording indicator */}
                <div className="h-24 flex flex-col items-center justify-center mt-6">
                  {sessionState === 'listening' && isRecording ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 mb-2"
                      >
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                          {t('listening')}
                        </span>
                      </motion.div>
                      <VoiceWaveform isRecording={isRecording} audioStream={audioStream} />
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-3">{formatTime(recordingTime)}</p>

                      {/* Live Coaching Hint */}
                      <AnimatePresence>
                        {showCoachingHint && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.4 }}
                            className="mt-3 max-w-xs"
                          >
                            <p className="text-xs text-blue-600 dark:text-blue-400 text-center leading-relaxed">
                              ðŸ’¡ {coachingHint}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      </>
                  ) : sessionState === 'analyzing' ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center"
                    >
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Loader2 className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin" />
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t('analyzing')}</span>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">{t('tapToRecord')}</p>
                      <p className="text-gray-300 dark:text-gray-600 text-xs mt-1.5">{t('practiceSpace')}</p>
                    </>
                  )}
                </div>

                {/* Stop button */}
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <Button
                      onClick={stopRecording}
                      variant="outline"
                      className="text-red-500 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 touch-manipulation min-h-[44px] px-6"
                    >
                      {t('stopRecording')}
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

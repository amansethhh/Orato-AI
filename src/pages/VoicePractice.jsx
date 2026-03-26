import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Mic, Square, Loader2, Target } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
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
  const totalQuestions = 5;
  
  // Presentation context parameters
  const presentationType = urlParams.get('presentationType');
  const audienceType = urlParams.get('audienceType');
  const duration = urlParams.get('duration');
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
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
        ? `\n\n🔒 CRITICAL: Your question MUST be in pure Hindi. Even if the job role is in English, generate the question natively in Hindi. Do not translate - think in Hindi.`
        : `\n\n🔒 CRITICAL: Your question MUST be in English only.`;

      const result = await base44.integrations.Core.InvokeLLM({
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
        ? `🔒 LANGUAGE: Generate the prompt in pure, native Hindi only.\n\n`
        : `🔒 LANGUAGE: Generate the prompt in English only.\n\n`;

      const result = await base44.integrations.Core.InvokeLLM({
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        await processRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setSessionState('listening');
    } catch (err) {
      console.error('Error accessing microphone:', err);
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
    setIsProcessing(true);
    setSessionState('analyzing');
    
    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      
      // Upload the audio file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
      
      // Create practice session
      const session = await base44.entities.PracticeSession.create({
        mode,
        prompt: currentPrompt,
        audio_url: file_url
      });

      const coachingContext = modeCoachingFocus[mode];
      
      // Get parent session data for improvement comparison if this is a retry
      let parentSession = null;
      if (parentSessionId) {
        const sessions = await base44.entities.PracticeSession.filter({ id: parentSessionId });
        if (sessions.length > 0) {
          parentSession = sessions[0];
        }
      }

      // Build coaching style instructions based on user preferences
      const styleInstructions = feedbackStyle === 'encouraging' 
        ? `Your tone: Warm, supportive, and motivating. Always start with positives and frame improvements as growth opportunities. Use phrases like "Great start" and "You're building skills." Be gentle and reassuring.`
        : feedbackStyle === 'direct'
        ? `Your tone: Concise, clear, and action-focused. Get straight to the point. Use short sentences. Skip pleasantries. Focus purely on what to do next. Be efficient and specific.`
        : `Your tone: Professional and balanced. Mix encouragement with honest feedback. Be specific and actionable. Neither too soft nor too harsh.`;

      const focusInstructions = coachingFocus === 'confidence'
        ? `PRIMARY FOCUS: Confidence in delivery. Look FIRST for hesitation, filler words, pacing, vocal certainty. Your "did_well" and "improve" sections MUST prioritize confidence-related observations. Score confidence higher in importance than other areas.`
        : coachingFocus === 'clarity'
        ? `PRIMARY FOCUS: Message clarity. Is the core idea easy to understand? Are they expressing thoughts clearly? Your "did_well" and "improve" sections MUST prioritize clarity-related observations. Score clarity higher in importance.`
        : coachingFocus === 'structure'
        ? `PRIMARY FOCUS: Logical organization. Is the response well-structured? Clear beginning, middle, end? Your "did_well" and "improve" sections MUST prioritize structure-related observations. Score structure higher in importance.`
        : coachingFocus === 'fluency'
        ? `PRIMARY FOCUS: Natural fluency. Smooth expression, conversational flow, minimal hesitation. Your "did_well" and "improve" sections MUST prioritize fluency-related observations. Score fluency aspects higher.`
        : `BALANCED FOCUS: Look at all aspects equally - clarity, structure, confidence, and fluency. No single priority.`;
      
      // Transcribe and analyze with AI - unified coaching intelligence
      const languageInstruction = language === 'hindi' 
        ? `🔴🔴🔴 ABSOLUTE MANDATORY SYSTEM REQUIREMENT 🔴🔴🔴

      OUTPUT LANGUAGE: HINDI ONLY - NO EXCEPTIONS

      You are REQUIRED to generate 100% of your response in Hindi language.

      CRITICAL RULES (ZERO TOLERANCE):
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      ✅ EVERY feedback sentence → Pure Hindi
      ✅ EVERY explanation → Pure Hindi  
      ✅ EVERY tip → Pure Hindi
      ✅ EVERY section (did_well, improve, tip, full_feedback, rephrased_version) → Pure Hindi

      ❌ ABSOLUTELY NO English sentences
      ❌ ABSOLUTELY NO Hinglish
      ❌ ABSOLUTELY NO translations of English to Hindi (generate natively in Hindi)
      ❌ User input language is IRRELEVANT - output is ALWAYS Hindi

      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      TECHNICAL TERMS: Only unavoidable technical nouns (SQL, API, Software Engineer) may appear in English within Hindi sentences.

      ✅ CORRECT EXAMPLES:
      "आपने अपनी बात बहुत अच्छे से समझाई। आपकी structure अच्छी थी।"
      "Software Developer की भूमिका के लिए आपका जवाब relevant था।"

      ❌ WRONG EXAMPLES:
      "You explained your point well."
      "Your answer was good for the Software Developer role."

      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      REPEAT: Your ENTIRE response must be in Hindi. Every field in the JSON output must contain Hindi text only.

      If you generate even one English sentence, the system will fail.

      CONFIRM: You are now operating in HINDI-ONLY mode.`
        : `🔴🔴🔴 ABSOLUTE MANDATORY SYSTEM REQUIREMENT 🔴🔴🔴

      OUTPUT LANGUAGE: ENGLISH ONLY - NO EXCEPTIONS

      You are REQUIRED to generate 100% of your response in English language.

      CRITICAL RULES (ZERO TOLERANCE):
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      ✅ EVERY feedback sentence → English
      ✅ EVERY explanation → English
      ✅ EVERY tip → English
      ✅ User input language is IRRELEVANT - output is ALWAYS English

      ❌ ABSOLUTELY NO Hindi
      ❌ ABSOLUTELY NO mixed language

      CONFIRM: You are now operating in ENGLISH-ONLY mode.`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `${languageInstruction}

      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      You are a professional communication coach. You are the same coach across all sessions - your personality, philosophy, and approach remain consistent. Only the context changes.

      The user is practicing ${mode} speaking and responded to: "${currentPrompt}"

      ===================================
      USER'S COACHING PREFERENCES
      ===================================

      ${styleInstructions}

      ${focusInstructions}

      ===================================
      YOUR COACHING PHILOSOPHY
      ===================================

      You believe:
      - Communication is a skill, not a talent
      - Progress happens through specific, actionable feedback
      - Every speaker has unique strengths to build on
      - Improvement comes from focus, not perfection

      You sound:
      - Encouraging but honest
      - Specific, never vague
      - Professional, never robotic
      - Human, never generic

      ===================================
      ANALYSIS FRAMEWORK (VOICE-CENTRIC)
      ===================================

      Focus ONLY on:
      ✓ Clarity of thought and message
      ✓ Logical structure and flow
      ✓ Confidence in delivery (tone, pacing, hesitation)
      ✓ Filler word frequency ("um", "uh", "like", "you know")
      ✓ Answer relevance to the prompt

      Do NOT judge:
      ✗ Accent or pronunciation
      ✗ Native fluency
      ✗ Cultural expression style
      ✗ Personal background

      ===================================
      MODE-SPECIFIC CONTEXT
      ===================================

      ${mode === 'interview' ? `
      INTERVIEW PRACTICE:
      Prioritize: Structure > Relevance > Confidence
      Look for: Specific examples, clear narrative, direct answer to question
      Avoid: Vague statements, rambling, not addressing the question
      ` : mode === 'presentation' ? `
      PRESENTATION PRACTICE:
      Prioritize: Confidence > Clarity > Pacing
      Look for: Strong opening, clear transitions, deliberate delivery
      Avoid: Rushed delivery, weak conclusions, excessive qualifiers
      ` : `
      CASUAL SPEAKING:
      Prioritize: Fluency > Natural Flow > Ease
      Look for: Smooth expression, conversational tone, minimal hesitation
      Avoid: Over-formality, excessive fillers, unnatural pauses
      `}

===================================
INTELLIGENT ANALYSIS PROCESS
===================================

STEP 1: Transcribe accurately.

STEP 2: Understand their core message.
- What are they trying to communicate?
- Did they address the prompt?

STEP 3: Identify the ONE most impactful improvement area.
Not everything - just what matters most right now.

STEP 4: Count filler words precisely.
Count only: "um", "uh", "like", "you know", "so", "basically"

STEP 5: Detect strengths to reinforce.
Every speaker has something they did well - find it.

${parentSession ? `
STEP 6: COMPARE TO PREVIOUS ATTEMPT (RETRY MODE)
User is focusing on: ${retryFocus || 'general improvement'}

Previous attempt:
- Transcript: "${parentSession.transcript}"
- Filler count: ${parentSession.filler_word_count || 'unknown'}
- Previous feedback: "${parentSession.feedback?.improve || 'none'}"

Your job:
1. Detect ANY improvement, even subtle
2. Acknowledge progress explicitly in "did_well"
3. Adapt your coaching - don't repeat identical advice
4. If they improved on retry focus, celebrate it

Examples:
- "Your structure is much clearer this time."
- "Great - you reduced filler words from ${parentSession.filler_word_count || '5'} to fewer."
- "This version sounds more confident and deliberate."

CRITICAL: Make them feel their effort paid off.
` : ''}

===================================
SMART SCORING SYSTEM
===================================

Score honestly but fairly. Think relative progress, not absolute perfection.

Clarity: Is the core message understandable?
- High: Clear, easy to follow
- Medium: Mostly clear, some confusion
- Low: Unclear or hard to understand

Structure: Is the response logically organized?
- High: Well-structured flow
- Medium: Some structure, could be tighter
- Low: Disorganized or rambling

Confidence: Does delivery sound assured?
- High: Confident, deliberate
- Medium: Mostly confident, slight hesitation
- Low: Uncertain, frequent pauses

Scoring rules:
- Default to Medium unless clearly High or Low
- If retry shows improvement, adjust score up
- Never score Low on all three - find at least one strength
- Scores should motivate continued practice

===================================
FEEDBACK STRUCTURE (MAX 3 POINTS)
===================================

Provide feedback in this exact format:

1. did_well: ONE specific strength (required)
   - Reference their actual words or delivery
   - Be genuine and specific
   - No generic praise
   - Example: "You opened with a clear statement that set context."

2. improve: ONE most impactful improvement area (required)
   - The single most important thing to work on
   - Be constructive and actionable
   - Example: "Your answer would be stronger with a specific example."

3. tip: ONE immediately actionable next step (required)
   - Simple, clear, doable right now
   - Example: "Next time, pause 2 seconds before speaking to gather your thoughts."

4. full_feedback: 2-3 sentences combining the above (required)
   - Natural coaching voice
   - Structure: strength + improvement + action
   - Sound human, not robotic
   - Example: "You communicated your main idea clearly. To make it even stronger, try adding a specific example next time. Before you speak, take a breath to organize your thoughts."

5. reasoning: WHY you're giving this feedback (required)
   - One sentence max
   - Human language, no jargon
   - Example: "Based on your sentence structure and pacing."
   - Example: "Due to your clear opening but missing examples."

6. rephrased_version: Better version of their response (required)
   - Keep their core message
   - Improve structure and confidence
   - Realistic, not perfect
   - Example: "I'm passionate about software engineering because I love solving complex problems. In my recent project, I built a feature that reduced processing time by 40%."

7. retry_focus: Next focus area in 1-2 words (required)
   - What to improve on retry
   - Examples: "structure", "confidence", "specific examples", "reducing fillers"

===================================
COACHING TONE RULES
===================================

Sound like a real human coach:
✓ Warm but honest
✓ Encouraging but specific
✓ Professional but friendly
✓ Direct but kind

Avoid sounding like:
✗ Generic AI assistant
✗ Harsh critic
✗ Overly enthusiastic bot
✗ Technical analyzer

Language rules:
- Use "you" and "your"
- Keep sentences short
- No buzzwords or jargon
- No fake enthusiasm
- No robotic patterns

If input is weak or too short:
Respond with: "That's okay - let's build your confidence step by step. Try expressing one clear idea next time."

NEVER:
- Hallucinate metrics you didn't measure
- Claim medical/psychological expertise
- Make absolute accuracy claims
- Judge personal traits

===================================
RELIABILITY SAFEGUARDS
===================================

Handle edge cases gracefully:

- If transcript is empty/unintelligible:
  Set transcript to "[Unable to capture clear audio]"
  Provide encouraging fallback coaching
  
- If response is too short (under 5 words):
  Still give constructive feedback
  Focus on "Let's practice expressing a fuller thought"
  
- If response is excellent:
  Acknowledge it genuinely
  Offer one subtle refinement
  Don't invent problems

- If unsure about scoring:
  Default to Medium
  Focus on what you CAN observe

===================================
OUTPUT FORMAT (JSON)
===================================

${language === 'hindi' ? `🔴 FINAL REMINDER: ALL text fields in this JSON MUST be in Hindi language. Every single field.` : `🔴 FINAL REMINDER: ALL text fields in this JSON MUST be in English language.`}

Return this exact structure:`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            transcript: { type: "string" },
            scoring: {
              type: "object",
              properties: {
                clarity: { type: "string", enum: ["low", "medium", "high"] },
                structure: { type: "string", enum: ["low", "medium", "high"] },
                confidence: { type: "string", enum: ["low", "medium", "high"] }
              }
            },
            filler_word_count: { type: "number" },
            did_well: { type: "string" },
            improve: { type: "string" },
            tip: { type: "string" },
            full_feedback: { type: "string" },
            reasoning: { type: "string", description: "Brief explanation of why this feedback was given" },
            rephrased_version: { type: "string", description: "Improved version of part of their response" },
            retry_focus: { type: "string", description: "One word or short phrase: what to focus on next" }
          }
        }
      });

      // Update session with all analysis data including reasoning
      await base44.entities.PracticeSession.update(session.id, {
        transcript: analysis.transcript,
        feedback: {
          did_well: analysis.did_well,
          improve: analysis.improve,
          tip: analysis.tip,
          full_feedback: analysis.full_feedback,
          reasoning: analysis.reasoning || "Based on your delivery and content clarity.",
          rephrased_version: analysis.rephrased_version
        },
        scoring: analysis.scoring,
        filler_word_count: analysis.filler_word_count,
        retry_focus: analysis.retry_focus,
        parent_session_id: parentSessionId || null
      });

      // Navigate to feedback page with coaching state
      setSessionState('coaching');
      navigate(createPageUrl('AIFeedback') + `?session=${session.id}`);
      
    } catch (error) {
      console.error('Error processing recording:', error);
      
      // Demo fallback - if recording fails, create demo session with full intelligence
      // Enhanced demo mode with intelligent fallback
      const demoTranscript = mode === 'interview' 
        ? "I'm a software engineer with five years of experience. I've worked on various projects and I really enjoy problem solving. Um, I think my biggest strength is being able to work well with teams."
        : mode === 'presentation'
        ? "So today I want to talk about our new project. It's really exciting and, um, we think it will be great for our users. The main benefits are efficiency and ease of use."
        : "I really love hiking. It's something I do every weekend. Um, you know, being in nature is really relaxing and it helps me clear my mind.";

      // Generate intelligent demo feedback using enhanced AI logic
      let demoFeedback;
      try {
        const demoLanguageInstruction = language === 'hindi'
          ? `🔴 MANDATORY: Generate ALL feedback in Hindi language ONLY. No English sentences allowed.`
          : `🔴 MANDATORY: Generate ALL feedback in English language ONLY.`;
        
        demoFeedback = await base44.integrations.Core.InvokeLLM({
          prompt: `${demoLanguageInstruction}

You are a professional communication coach. Analyze this ${mode} practice response to: "${currentPrompt}"

      User's response: "${demoTranscript}"

      Provide coaching feedback following these rules:
      - did_well: ONE specific positive from their actual words
      - improve: ONE clear improvement area  
      - tip: ONE actionable suggestion
      - full_feedback: 2-3 sentences (positive + improvement + tip)
      - rephrased_version: Improved version of part of their response

      Mode-specific focus:
      ${mode === 'interview' ? 'Structure and relevance to question' : mode === 'presentation' ? 'Confidence and clear delivery' : 'Natural fluency and conversational ease'}`,
          response_json_schema: {
            type: "object",
            properties: {
              did_well: { type: "string" },
              improve: { type: "string" },
              tip: { type: "string" },
              full_feedback: { type: "string" },
              reasoning: { type: "string" },
              rephrased_version: { type: "string" }
              }
              }
              });
              } catch {
              // Fallback to hardcoded demo feedback
              demoFeedback = {
          did_well: mode === 'interview'
            ? "You mentioned specific experience and highlighted teamwork as a strength - that's concrete and relevant."
            : mode === 'presentation'
            ? "You clearly identified the key benefits - efficiency and ease of use. That's helpful context."
            : "You conveyed genuine enthusiasm for hiking and explained how it benefits you.",
          improve: mode === 'interview'
            ? "Your answer could be more structured - try moving from background to achievements to why you're interested."
            : mode === 'presentation'
            ? "Reduce filler words and add a clear opening that previews your main points."
            : "Work on reducing filler words like 'um' and 'you know' for more confident delivery.",
          tip: mode === 'interview'
            ? "Before answering, take a breath and mentally outline: experience, achievement, and why this role."
            : mode === 'presentation'
            ? "Start with 'Today I'll cover three points' - this frames your message clearly."
            : "Try recording yourself and count your filler words - awareness helps improvement.",
          full_feedback: mode === 'interview'
            ? "You mentioned specific experience and teamwork - that's relevant. To strengthen your answer, structure it from background to achievements to interest in the role. Take a breath before answering to outline these parts mentally."
            : mode === 'presentation'
            ? "You identified key benefits clearly. Reducing filler words and previewing your points upfront will strengthen delivery. Try opening with 'Today I'll cover three points' next time."
            : "You conveyed enthusiasm well. Reducing filler words like 'um' will make you sound more confident. Record yourself and count fillers - awareness drives improvement.",
          reasoning: mode === 'interview'
            ? "Based on answer structure and relevance to the question."
            : mode === 'presentation'
            ? "Due to delivery pacing and use of transitional language."
            : "Based on conversational fluency and filler word usage.",
          rephrased_version: mode === 'interview'
            ? "I'm a software engineer with five years of experience in problem-solving and team collaboration. My greatest strength is building relationships that drive project success."
            : mode === 'presentation'
            ? "Today I'll share our new project, which delivers two key benefits: improved efficiency and seamless ease of use."
            : "Hiking is my passion - every weekend, I'm outdoors. Being in nature clears my mind and helps me recharge."
        };
      }

      const demoSession = await base44.entities.PracticeSession.create({
        mode,
        prompt: currentPrompt,
        transcript: demoTranscript,
        scoring: {
          clarity: mode === 'interview' ? 'medium' : mode === 'presentation' ? 'medium' : 'high',
          structure: mode === 'interview' ? 'medium' : mode === 'presentation' ? 'medium' : 'medium',
          confidence: mode === 'interview' ? 'medium' : mode === 'presentation' ? 'medium' : 'high'
        },
        filler_word_count: mode === 'interview' ? 1 : mode === 'presentation' ? 1 : 2,
        retry_focus: mode === 'interview' ? 'structure' : mode === 'presentation' ? 'confidence' : 'fluency',
        feedback: demoFeedback,
        parent_session_id: parentSessionId || null
      });
      
      navigate(createPageUrl('AIFeedback') + `?session=${demoSession.id}&demo=true`);
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
                {mode === 'presentation' ? `Practice Segment ${questionNumber} of ${totalQuestions} • Introduction` : `Question ${questionNumber} of ${totalQuestions}`}
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
                <span className="font-semibold">{language === 'english' ? 'Focus on:' : 'फोकस:'}</span> {retryFocus}
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
                    ? `${interviewType === 'behavioral' ? 'HR / Behavioral' : interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} Interview • ${jobRole} • ${experienceLevel === 'fresher' ? 'Fresher' : experienceLevel === '1-3' ? '1–3 years' : experienceLevel === '3-7' ? '3–7 years' : 'Senior'}`
                    : `${interviewType === 'behavioral' ? 'एचआर / व्यवहारिक' : interviewType === 'technical' ? 'तकनीकी' : interviewType === 'managerial' ? 'प्रबंधकीय' : interviewType === 'leadership' ? 'नेतृत्व' : interviewType} इंटरव्यू • ${jobRole} • ${experienceLevel === 'fresher' ? 'फ्रेशर' : experienceLevel === '1-3' ? '1–3 वर्ष' : experienceLevel === '3-7' ? '3–7 वर्ष' : 'सीनियर'}`}
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
                  📊 {language === 'english' ? 'Presentation' : 'प्रेजेंटेशन'} • {isManual ? (language === 'english' ? 'Custom Topic' : 'कस्टम विषय') : (language === 'english' ? 'AI-Generated Topic' : 'AI-जनित विषय')}
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
                  💬 {language === 'english' ? 'Casual Speaking • Everyday Conversation' : 'रोज़मर्रा की बातचीत'}
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
                      <VoiceWaveform isRecording={isRecording} />
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
                              💡 {coachingHint}
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
<div align="center">

# 🎙️ Orato AI

**AI-powered communication coach — practice interviews, presentations, and everyday speaking with intelligent feedback.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Live Application Flow](#live-application-flow)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Features](#features)
6. [Current Limitations](#current-limitations)
7. [Local AI Migration Roadmap](#local-ai-migration-roadmap)
8. [API Integration Guide](#api-integration-guide)
9. [Folder Structure](#folder-structure)
10. [Setup & Running Locally](#setup--running-locally)
11. [Environment Variables](#environment-variables)
12. [Future Improvements](#future-improvements)

---

## Overview

Orato AI is a **local-first, frontend-only speech coaching application** built with React, Vite, and Tailwind CSS. It guides users through structured voice practice sessions across three modes — Interview, Presentation, and Casual Speaking — and returns structured AI feedback on clarity, confidence, structure, and fluency.

**Key design goals:**
- Zero backend required — all data persists to `localStorage`
- Works fully offline once built
- Bilingual support (English & Hindi)
- Mobile-first responsive design with dark mode

> **Note:** This project was originally scaffolded with Base44. All Base44 cloud dependencies have been removed. The app now runs entirely on a local mock API layer (`src/api/base44Client.js`) that simulates ~200 ms network latency and stores data in `localStorage`. The AI feedback is currently **mocked** — see [Current Limitations](#current-limitations) and the [migration roadmap](#local-ai-migration-roadmap) to replace it with real LLM APIs.

---

## Live Application Flow

```
Intro  →  Home  →  Setup  →  VoicePractice  →  AIFeedback
  ↑                  ↑
  |        InterviewSetup (for interview mode)
  |        QuestionSetup  (for presentation/casual mode)
  |
  └── (first-time users only; localStorage flag: orato_has_seen_intro)
```

| Step | Page | Description |
|------|------|-------------|
| 1 | **Intro** | Landing page with animated feature cards and a single CTA. Sets `orato_has_seen_intro` in `localStorage`. |
| 2 | **Home** | Mode selection dashboard with live typing animation. Shows progress snapshot from previous sessions. |
| 3 | **InterviewSetup** | Configures interview type, job role, and experience level. Supports AI-generated or manual questions. |
| 3 | **QuestionSetup** | Configures presentation/casual practice. Supports AI prompt or manual topic entry. |
| 4 | **VoicePractice** | Records audio via `MediaRecorder`, shows animated waveform and coaching hints, sends recording for analysis. |
| 5 | **AIFeedback** | Displays structured feedback: scores, did-well, areas to improve, tip, full narrative, and a rephrased version. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 3 + `tailwindcss-animate` |
| Component Library | shadcn/ui (Radix UI primitives) |
| Animations | Framer Motion |
| Routing | React Router v6 |
| Data Fetching | TanStack React Query v5 |
| Icons | Lucide React |
| State / Settings | React Context + `localStorage` |
| Mock API | Custom `base44Client.js` (localStorage-backed) |
| Language | JavaScript (JSX) |

---

## Architecture

### Frontend Structure

```
src/
├── App.jsx              # Root: AuthProvider → QueryClientProvider → Router
├── Layout.jsx           # Route wrapper: checks intro flag, wraps SettingsProvider
├── pages.config.js      # Central page registry and mainPage definition
├── main.jsx             # React DOM entry point
│
├── pages/               # One file per route/screen
├── components/          # Shared UI components
├── api/                 # Mock API layer (base44Client.js)
├── lib/                 # Auth context, query client, utilities
├── hooks/               # Custom hooks (use-mobile)
└── utils/               # Shared helpers (createPageUrl)
```

### Mock API Layer (`src/api/base44Client.js`)

This file is the **single replacement** for the original `@base44/sdk` package. It exports a `base44` object with three namespaces:

```js
base44.auth           // me(), isAuthenticated(), updateMe(), logout()
base44.entities       // PracticeSession: create(), filter(), list(), update()
base44.integrations   // Core: InvokeLLM(), UploadFile()
```

All methods are `async`, simulate ~200 ms latency, and persist data to `localStorage` under the following keys:

| Key | Contents |
|-----|----------|
| `orato_mock_user` | User profile (name, email, appearance, language, coaching preferences) |
| `orato_mock_sessions` | Array of all `PracticeSession` objects |
| `orato_has_seen_intro` | Boolean flag (set after first Intro visit) |
| `orato_appearance` | `"light"` or `"dark"` |
| `orato_language` | `"english"` or `"hindi"` |
| `orato_coaching_focus` | `"confidence"` \| `"clarity"` \| `"structure"` \| `"fluency"` |
| `orato_feedback_style` | `"encouraging"` \| `"balanced"` \| `"direct"` |

**`InvokeLLM` mock behaviour:**
- Detects the intent of the prompt (question generation vs. feedback/analysis)
- Returns randomised feedback from three pre-defined templates with hardcoded scoring
- **Does NOT call any external AI API** — see [migration roadmap](#local-ai-migration-roadmap)

### Routing

React Router v6 with hash-based navigation (`BrowserRouter`). All pages are registered in `src/pages.config.js` and dynamically rendered by `App.jsx`. The `Layout` component wraps every page and enforces the intro-redirect guard.

### State Management

There is no global state library. State flows through:
1. **`SettingsProvider`** (React Context) — user profile, theme, language, coaching preferences; persisted to both `localStorage` and the mock user object
2. **TanStack React Query** — async data fetching for session lists (e.g., `ProgressSnapshot`)
3. **Local component state** (`useState`) — recording state, form inputs, UI toggles
4. **URL search params** — pass mode, prompt, retry context, and interview parameters between pages

---

## Features

### 1. Practice Modes

| Mode | Route | Setup Page | Description |
|------|-------|-----------|-------------|
| **Interview** | `/VoicePractice?mode=interview` | `InterviewSetup` | Behavioral, technical, managerial, leadership, or mixed questions tailored to a job role and experience level |
| **Presentation** | `/VoicePractice?mode=presentation` | `QuestionSetup` | Practice presenting and explaining topics clearly |
| **Casual Speaking** | `/VoicePractice?mode=casual` | `QuestionSetup` | Everyday conversational fluency with low-pressure prompts |

All modes support two question entry paths:
- **AI-generated:** Calls `base44.integrations.Core.InvokeLLM` with a context-rich prompt
- **Manual:** User enters their own question/topic

### 2. Voice Interaction System

Implemented in `VoicePractice.jsx`:

- **Microphone capture:** `navigator.mediaDevices.getUserMedia({ audio: true })`
- **Recording:** `MediaRecorder` API captures `audio/webm` chunks
- **Waveform animation:** `VoiceWaveform` component — five animated bars using Framer Motion (purely decorative; not tied to actual audio levels)
- **Recording timer:** Live elapsed-time counter shown during recording
- **Coaching hints:** Context-specific tips (STAR method, pacing, etc.) displayed after 15 seconds of recording
- **Demo fallback:** If microphone permission is denied, the app silently falls back to processing a zero-byte blob

> ⚠️ The waveform is **animated CSS only** — it does not visualize actual microphone amplitude.

### 3. AI Feedback System

After recording stops, `processRecording()` in `VoicePractice.jsx`:
1. Creates a `Blob` from the recorded audio chunks
2. Uploads it via `base44.integrations.Core.UploadFile` (returns a local blob URL)
3. Creates a `PracticeSession` record in localStorage
4. Calls `base44.integrations.Core.InvokeLLM` with a detailed coaching prompt
5. Updates the session with the returned feedback
6. Navigates to `AIFeedback?session=<id>`

The `AIFeedback` page displays:
- **Score indicators** (`ScoreIndicator`): Clarity, Structure, Confidence — each rated Low / Medium / High
- **Feedback sections:** What you did well, one improvement, actionable tip, full narrative, reasoning
- **Rephrased version:** A model rewrite of the response
- **Text-to-speech playback:** Uses the browser's `window.speechSynthesis` API to read the full feedback aloud
- **Retry flow:** "Try Again" navigates back to `VoicePractice` with `retryFocus` and `parentSession` query params, enabling comparative feedback

> ⚠️ All feedback content is currently **mocked** — the LLM prompt is well-crafted but `InvokeLLM` returns pre-written template data, not a real AI response.

### 4. Progress Tracking

`ProgressSnapshot` (shown on the Home page) computes from the last 10 sessions stored in `localStorage`:
- **Confidence trend** (Improving / Stable / Needs focus) — compares average scores of the 3 most recent vs. the 3 older sessions
- **Last practiced mode**
- **Strongest skill** — the dimension (clarity/structure/confidence) with the highest average score
- **Current focus** — derived from the last session's `retry_focus` or the weakest dimension

### 5. Settings & Personalisation

`SettingsModal` (accessible from the gear icon on the Home page) exposes:

| Setting | Options |
|---------|---------|
| **Appearance** | Light / Dark |
| **Language** | English / Hindi (more languages stubbed as disabled) |
| **Coaching Focus** | Confidence / Clarity / Structure / Fluency |
| **Feedback Style** | Encouraging / Balanced / Direct |

Changes are saved immediately to `localStorage` **and** synced to the mock user object. The coaching focus and feedback style are injected into the LLM prompt to shape the character and emphasis of feedback.

### 6. Bilingual UI (English & Hindi)

All user-facing strings are managed through `src/components/translations.jsx`. The `getTranslation(key, language)` helper is used throughout every page and component, covering full Hindi translations for all interface text including coaching prompts and feedback instructions.

---

## Current Limitations

These are honest, known limitations of the current implementation:

| Area | Status | Details |
|------|--------|---------|
| **AI Feedback (LLM)** | ❌ Mocked | `InvokeLLM` returns hard-coded template responses. No external API is called. |
| **Speech-to-Text** | ❌ Not implemented | Audio is captured but never transcribed. The mock returns a hardcoded transcript string. |
| **Voice Analysis** | ❌ Not implemented | Filler word count, pacing, and tone are all mock values. |
| **Waveform Visualisation** | ⚠️ Decorative | The animated waveform is CSS-only and does not reflect actual microphone amplitude. |
| **Audio Upload** | ⚠️ Local only | `UploadFile` creates a local `blob:` URL. No audio is sent to any server. |
| **User Authentication** | ⚠️ Always true | `isAuthenticated()` always returns `true`. There is no real auth flow. |
| **More Languages** | ⚠️ Stubbed | Only English and Hindi are implemented; additional language buttons are disabled. |
| **Session History UI** | ⚠️ Missing | No dedicated page for browsing past sessions. |
| **Streak / Gamification** | ⚠️ Stubbed | `checkPracticeStreak()` is called in `AIFeedback` but is not connected to real data. |

---

## Local AI Migration Roadmap

A step-by-step plan to replace every mocked capability with a real, local-first or API-backed implementation.

### Step 1 — Real Voice Capture (already ~80% done)

`MediaRecorder` is already wired up. Complete it:
- Implement `ondataavailable` chunk handling with proper MIME type selection (`audio/webm;codecs=opus` on Chrome, `audio/mp4` on Safari)
- Add real amplitude data via `AudioContext` + `AnalyserNode` to drive the waveform bars visually

```js
// src/pages/VoicePractice.jsx — replace decorative waveform
const audioContext = new AudioContext();
const source = audioContext.createMediaStreamSource(stream);
const analyser = audioContext.createAnalyser();
source.connect(analyser);
// Read analyser.getByteTimeDomainData(dataArray) on each animation frame
```

### Step 2 — Speech-to-Text

**Option A — Web Speech API (zero cost, browser-native):**
```js
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = language === 'hindi' ? 'hi-IN' : 'en-US';
recognition.onresult = (event) => { /* accumulate transcript */ };
recognition.start(); // run concurrently with MediaRecorder
```

**Option B — OpenAI Whisper API (higher accuracy):**
```js
// After recording stops, send the audio blob to Whisper
const formData = new FormData();
formData.append('file', audioBlob, 'recording.webm');
formData.append('model', 'whisper-1');
formData.append('language', language === 'hindi' ? 'hi' : 'en');
const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
  body: formData,
});
const { text } = await res.json();
```

### Step 3 — AI Feedback Generation

Replace the `InvokeLLM` mock in `src/api/base44Client.js`. The detailed coaching prompt already exists in `VoicePractice.jsx` — just pass it to a real LLM:

**OpenAI (GPT-4o / GPT-4o-mini):**
```js
// src/api/base44Client.js — Core.InvokeLLM replacement
async InvokeLLM({ prompt, response_json_schema }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a professional communication coach.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
},
```

**Google Gemini:**
```js
async InvokeLLM({ prompt }) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );
  const data = await res.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
},
```

### Step 4 — Scoring System

Once you have a real transcript, you can calculate filler words client-side before calling the LLM:

```js
// src/utils/analysis.js
const FILLERS = ['um', 'uh', 'like', 'you know', 'so', 'basically'];

export function countFillerWords(transcript) {
  const lower = transcript.toLowerCase();
  return FILLERS.reduce((total, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    return total + (lower.match(regex) || []).length;
  }, 0);
}

export function estimateWordsPerMinute(transcript, durationSeconds) {
  const wordCount = transcript.trim().split(/\s+/).length;
  return Math.round((wordCount / durationSeconds) * 60);
}
```

Pass `filler_word_count` and `words_per_minute` into the LLM prompt for more accurate scoring.

### Step 5 — Text-to-Speech Feedback

The browser `speechSynthesis` API is already used in `AIFeedback.jsx`. Enhance it:

```js
const speak = (text, lang) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'hindi' ? 'hi-IN' : 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  // Select a natural-sounding voice if available
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang === utterance.lang && v.localService);
  if (preferred) utterance.voice = preferred;
  speechSynthesis.speak(utterance);
};
```

---

## API Integration Guide

### Where to Plug In

All AI/API calls are centralised in **`src/api/base44Client.js`**. Replace the two functions in the `Core` namespace:

| Function | Current Behaviour | Replace With |
|----------|------------------|-------------|
| `Core.InvokeLLM({ prompt })` | Returns mocked template data | OpenAI Chat Completions, Gemini GenerateContent, or any LLM endpoint |
| `Core.UploadFile({ file })` | Returns a local `blob:` URL | OpenAI Whisper (for transcription) or your own file storage |

### Recommended Model Selection

| Use Case | OpenAI | Google Gemini |
|----------|--------|--------------|
| Question generation | `gpt-4o-mini` | `gemini-1.5-flash` |
| Feedback analysis | `gpt-4o` or `gpt-4o-mini` | `gemini-1.5-pro` |
| Transcription | `whisper-1` | — (use Web Speech API instead) |

### Environment Variables

Create a `.env.local` file in the project root (never commit this):

```env
# OpenAI
VITE_OPENAI_API_KEY=sk-...

# Google Gemini
VITE_GEMINI_API_KEY=AIza...

# Optional: force mock mode even when API keys are set
VITE_MOCK_MODE=false
```

> All variables **must** start with `VITE_` to be exposed to the browser bundle by Vite.

**Guard your keys** — since this is a pure frontend app, API keys placed in `.env.local` are visible in the built bundle. For production, proxy calls through a lightweight serverless function (see [Future Improvements](#future-improvements)).

---

## Folder Structure

```
Orato-AI/
├── index.html                  # Vite entry point
├── vite.config.js              # Vite config (@ alias → src/)
├── tailwind.config.js          # Tailwind theme configuration
├── postcss.config.js
├── components.json             # shadcn/ui component registry config
├── jsconfig.json               # Path aliases for IDE support
├── package.json
│
└── src/
    ├── App.jsx                 # Root component; wraps Auth, Query, Router
    ├── Layout.jsx              # Shared layout: intro guard + SettingsProvider
    ├── main.jsx                # ReactDOM.createRoot entry
    ├── pages.config.js         # Registers all pages; sets mainPage = "Intro"
    │
    ├── pages/                  # One file per screen/route
    │   ├── Intro.jsx           # Landing page with typing animation
    │   ├── Home.jsx            # Mode selection + ProgressSnapshot
    │   ├── InterviewSetup.jsx  # Interview context form
    │   ├── QuestionSetup.jsx   # Presentation/casual prompt form
    │   ├── VoicePractice.jsx   # Recording, prompt display, coaching hints
    │   └── AIFeedback.jsx      # Scores, feedback sections, TTS playback
    │
    ├── components/
    │   ├── SettingsProvider.jsx    # React Context for user prefs + theme
    │   ├── SettingsModal.jsx       # Bottom-sheet settings panel
    │   ├── VoiceWaveform.jsx       # Animated recording indicator
    │   ├── ProgressSnapshot.jsx    # Home page stats (trend, streak, focus)
    │   ├── ScoreIndicator.jsx      # Pill badge: Low / Good / Strong
    │   ├── SessionSummary.jsx      # Mode + strongest area card in feedback
    │   ├── ModeCard.jsx            # Clickable practice-mode selection card
    │   ├── ExpandableQuestion.jsx  # Collapsible prompt display
    │   ├── LoginPrompt.jsx         # Modal shown when auth is required
    │   ├── UserNotRegisteredError.jsx  # Error state for unregistered users
    │   ├── translations.jsx        # All UI strings (English + Hindi)
    │   └── ui/                     # shadcn/ui primitives (Button, Card, etc.)
    │
    ├── api/
    │   └── base44Client.js         # Mock API: auth, PracticeSession, InvokeLLM
    │
    ├── lib/
    │   ├── AuthContext.jsx         # App-level auth state (always authenticated in mock)
    │   ├── query-client.js         # TanStack Query client singleton
    │   ├── app-params.js           # App-level parameter helpers
    │   ├── utils.js                # cn() utility (clsx + tailwind-merge)
    │   ├── PageNotFound.jsx        # 404 fallback route
    │   ├── NavigationTracker.jsx   # Logs page transitions via appLogs.logUserInApp
    │   └── VisualEditAgent.jsx     # Dev-time visual editor overlay (Base44 remnant)
    │
    ├── hooks/
    │   └── use-mobile.jsx          # Returns true when viewport < 768 px
    │
    └── utils/
        └── index.js                # createPageUrl(pageName): "/PageName"
```

---

## Setup & Running Locally

### Prerequisites

- Node.js 18+ and npm 9+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/Orato-AI.git
cd Orato-AI

# 2. Install dependencies
npm install

# 3. (Optional) Configure API keys — see Environment Variables section
cp .env.example .env.local   # create this file if it doesn't exist
# then edit .env.local with your keys

# 4. Start development server
npm run dev
```

The app will be available at **[http://localhost:5173](http://localhost:5173)**.

### Other Scripts

```bash
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm run lint       # ESLint check
npm run lint:fix   # ESLint auto-fix
```

### First Run

1. Open [http://localhost:5173](http://localhost:5173)
2. The **Intro** page loads automatically (first-time only)
3. Click **Continue with Orato AI** — the `orato_has_seen_intro` flag is set
4. Select a practice mode on the **Home** page
5. Complete the setup form and click **Start Practice**
6. Grant microphone permission and begin speaking
7. Stop the recording to receive feedback

> To reset the app to first-run state, open DevTools → Application → Local Storage → delete all `orato_*` keys.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_OPENAI_API_KEY` | Optional* | OpenAI API key for real LLM feedback and Whisper transcription |
| `VITE_GEMINI_API_KEY` | Optional* | Google Gemini API key as an alternative LLM provider |
| `VITE_MOCK_MODE` | No | Set to `"true"` to force mock mode even if API keys are present |

*Optional until you replace the mock `InvokeLLM` — the app runs fully without them.

---

## Future Improvements

### High Priority

- **Real LLM integration** — Replace `InvokeLLM` with OpenAI or Gemini (see [Step 3](#step-3--ai-feedback-generation))
- **Real speech-to-text** — Implement Web Speech API live transcription during recording
- **Amplitude-driven waveform** — Connect `AnalyserNode` to `VoiceWaveform` bars

### Architecture

- **Serverless API proxy** — Move API key usage to a Vercel/Cloudflare Edge Function to prevent key exposure in the browser bundle
- **IndexedDB storage** — Replace `localStorage` with IndexedDB for larger session history and binary audio storage
- **Session history page** — A dedicated screen to browse, replay, and compare past sessions

### Performance

- **Code splitting** — Lazy-load `AIFeedback` and practice pages with `React.lazy`
- **Query caching** — Increase TanStack Query `staleTime` to avoid redundant localStorage reads
- **Audio compression** — Downsample or compress audio before Whisper upload to reduce API cost and latency

### Product

- **Streak tracking** — Persist daily practice streaks and surface them on the Home page
- **Session export** — Export session transcripts and feedback as PDF (jsPDF is already installed)
- **Additional languages** — Extend `translations.jsx` and add speech recognition language codes
- **Accessibility** — Add ARIA labels to recording controls and improve keyboard navigation

### Error Handling

- **Microphone permission UX** — Show a clear, actionable prompt when permission is denied instead of silent fallback
- **API error boundaries** — Wrap `InvokeLLM` calls with retry logic and user-visible error states
- **Offline detection** — Notify users gracefully when an API key is set but there is no network

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

<div align="center">
  Built by <a href="https://www.linkedin.com/in/amansethhh/">Aman Seth</a>
</div>

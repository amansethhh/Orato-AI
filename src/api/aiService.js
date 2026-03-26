/**
 * AI Service Layer — Orato AI
 *
 * Providers:  OpenAI (gpt-4o-mini) · Google Gemini (gemini-2.0-flash) · Mock fallback
 * Features:   Response validation · 15 s timeout · 2-attempt retry · Rate-limit handling
 *             Response caching (5 min TTL) · Adaptive question difficulty · Debug logging
 */

// ── Constants ────────────────────────────────────────────────────────────────

const API_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEBUG = import.meta.env.DEV;

const SYSTEM_PROMPT = `You are an expert communication coach named "Coach Orato". You have a warm, professional personality and years of experience helping people communicate better.

CORE PRINCIPLES:
1. Analyze spoken responses based ONLY on delivery (clarity, confidence, structure, fluency) — NOT content correctness.
2. ALWAYS reference the user's ACTUAL words. Quote specific phrases they used.
3. NEVER give generic feedback. Every comment must tie to something specific in their transcript.
4. Sound like a real human coach, not an AI. Use natural language, brief sentences, and concrete examples.

ANTI-GENERIC RULES:
- Instead of "Good structure" → say "Starting with 'In my previous role...' immediately set context — that's strong."
- Instead of "Improve confidence" → say "The phrase 'I think maybe...' at the start signals uncertainty. Try dropping 'I think' and stating it directly."
- Instead of "Practice more" → say "Try this: record yourself saying your first sentence three times, each time removing one filler word."

You must ALWAYS respond with valid JSON matching the exact schema requested. Never include markdown formatting or code fences in your response.`;

// ── Feedback Schema ──────────────────────────────────────────────────────────

const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    feedback:      { type: "string", description: "2-3 sentence coaching narrative referencing specific phrases from the transcript" },
    clarity:       { type: "number", description: "0-100 score" },
    confidence:    { type: "number", description: "0-100 score" },
    structure:     { type: "number", description: "0-100 score" },
    fluency:       { type: "number", description: "0-100 score" },
    strengths:     { type: "array", items: { type: "string" }, description: "1-3 specific strengths, each referencing a phrase from the transcript" },
    improvements:  { type: "array", items: { type: "string" }, description: "1-3 improvement areas with concrete suggestions" },
    tip:           { type: "string", description: "One immediately actionable next step" },
    sampleAnswer:  { type: "string", description: "Improved version of the response preserving the speaker's core message" },
  },
  required: ["feedback", "clarity", "confidence", "structure", "fluency", "strengths", "improvements", "tip", "sampleAnswer"],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(label, data) {
  if (DEBUG) console.log(`[aiService] ${label}:`, data);
}

function clampScore(val) {
  const n = Number(val);
  if (Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreToLevel(score) {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/** Simple string hash for cache keys. */
function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

/** Count filler words in a transcript. */
function countFillers(text) {
  const lower = (text || "").toLowerCase();
  const fillers = ["um", "uh", "like", "you know", "so basically", "basically", "actually", "i mean", "sort of", "kind of"];
  let count = 0;
  for (const f of fillers) {
    const regex = new RegExp(`\\b${f}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

/** Compute deterministic base scores from transcript analysis. */
function computeBaseScores(transcript) {
  const text = (transcript || "").trim();
  if (!text || text.length < 10) return { clarity: 40, confidence: 35, structure: 35, fluency: 40 };

  const words = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const fillerCount = countFillers(text);
  const avgWordsPerSentence = sentences > 0 ? words / sentences : words;

  // Clarity: based on sentence structure and word choice
  let clarity = 55;
  if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 20) clarity += 15; // good sentence length
  if (sentences >= 2) clarity += 10; // multiple sentences = better explanation
  if (words >= 20) clarity += 5;

  // Confidence: penalized by fillers and short responses
  let confidence = 55;
  confidence -= Math.min(25, fillerCount * 5); // each filler word = -5
  if (words >= 30) confidence += 10;
  if (text.includes("I believe") || text.includes("I'm confident") || text.includes("clearly")) confidence += 5;
  if (text.includes("I think maybe") || text.includes("I guess") || text.includes("not sure")) confidence -= 10;

  // Structure: beginning + middle + end
  let structure = 50;
  if (sentences >= 3) structure += 15; // enough content for structure
  if (sentences >= 2 && sentences <= 6) structure += 10; // not too rambling
  if (words > 100) structure -= 5; // too long can mean rambling

  // Fluency: smoothness
  let fluency = 55;
  fluency -= Math.min(20, fillerCount * 4);
  if (avgWordsPerSentence >= 6 && avgWordsPerSentence <= 18) fluency += 10;
  if (words >= 15 && words <= 80) fluency += 10; // sweet spot

  return {
    clarity: clampScore(clarity),
    confidence: clampScore(confidence),
    structure: clampScore(structure),
    fluency: clampScore(fluency),
  };
}

// ── Response Cache ───────────────────────────────────────────────────────────

const _cache = new Map();

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  // Keep cache small
  if (_cache.size > 50) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
  _cache.set(key, { data, ts: Date.now() });
}

// ── Fetch with Timeout ───────────────────────────────────────────────────────

async function fetchWithTimeout(url, options, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Response Validation ──────────────────────────────────────────────────────

function validateFeedback(obj) {
  if (!obj || typeof obj !== "object") return null;
  return {
    feedback:      typeof obj.feedback === "string" && obj.feedback.length > 5 ? obj.feedback : "Good effort. Keep practicing.",
    clarity:       clampScore(obj.clarity),
    confidence:    clampScore(obj.confidence),
    structure:     clampScore(obj.structure),
    fluency:       clampScore(obj.fluency),
    strengths:     Array.isArray(obj.strengths) ? obj.strengths.filter(s => typeof s === "string" && s.length > 3).slice(0, 5) : ["Good attempt"],
    improvements:  Array.isArray(obj.improvements) ? obj.improvements.filter(s => typeof s === "string" && s.length > 3).slice(0, 5) : ["Continue practicing"],
    tip:           typeof obj.tip === "string" && obj.tip.length > 3 ? obj.tip : "Try again with more detail.",
    sampleAnswer:  typeof obj.sampleAnswer === "string" ? obj.sampleAnswer : "",
  };
}

function safeParse(raw) {
  if (typeof raw !== "string") return raw;
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(text);
}

// ── Provider: OpenAI ─────────────────────────────────────────────────────────

async function callOpenAI(prompt, apiKey) {
  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 1400,
  };

  log("OpenAI request", { model: body.model, promptLength: prompt.length });

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // Rate limit handling
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("retry-after") || "3", 10);
    log("Rate limited, waiting", `${retryAfter}s`);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    throw new Error(`OpenAI rate limited (429). Retrying after ${retryAfter}s.`);
  }

  if (res.status === 401) {
    throw new Error("OpenAI: Invalid API key (401). Switching to mock.");
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI: empty response");

  log("OpenAI raw response", content);
  return safeParse(content);
}

// ── Provider: Google Gemini ──────────────────────────────────────────────────

async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      { parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.6,
      maxOutputTokens: 1400,
    },
  };

  log("Gemini request", { promptLength: prompt.length });

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 3000));
    throw new Error("Gemini rate limited (429). Retrying.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error("Gemini: Invalid API key. Switching to mock.");
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini: empty response");

  log("Gemini raw response", text);
  return safeParse(text);
}

// ── Mock Fallback (transcript-aware) ─────────────────────────────────────────

function getMockFeedback(transcript) {
  const base = computeBaseScores(transcript);
  const fillers = countFillers(transcript);
  const words = (transcript || "").split(/\s+/).length;
  const firstPhrase = (transcript || "").split(/[,.!?]/)[0]?.trim() || "your response";

  return {
    feedback: `You opened with "${firstPhrase}" which immediately ${base.structure >= 60 ? "set clear context" : "could use a stronger opening"}. ${fillers > 2 ? `I noticed ${fillers} filler words — replacing those with brief pauses will boost your confidence.` : "Your delivery was fairly smooth."} ${words > 30 ? "You provided enough detail for a solid answer." : "Try expanding with a specific example next time."}`,
    clarity: base.clarity,
    confidence: base.confidence,
    structure: base.structure,
    fluency: base.fluency,
    strengths: [
      `Opening with "${firstPhrase}" ${base.clarity >= 60 ? "clearly established your point" : "showed your intent"}`,
      words >= 20 ? "Provided enough substance for evaluation" : "Kept your answer concise",
      base.confidence >= 60 ? "Delivered with reasonable poise" : "Showed willingness to practice",
    ],
    improvements: [
      fillers > 1 ? `Reduce filler words (counted ${fillers}) — try pausing silently instead` : "Consider adding a brief pause before answering to gather thoughts",
      base.structure < 60 ? "Structure: try the pattern — context → action → result" : "Add one quantifiable result to strengthen your example",
      base.confidence < 55 ? "Drop hedging phrases like 'I think' or 'maybe' — state directly" : "Vary your vocal tone to emphasize key points",
    ],
    tip: fillers > 2
      ? `Record your next attempt and count filler words. You used ${fillers} — aim for ${Math.max(0, fillers - 2)} or fewer.`
      : "Before answering, take one breath and mentally note your opening word.",
    sampleAnswer: "",
  };
}

// ── Adaptive Question Pools ──────────────────────────────────────────────────

const QUESTION_POOLS = {
  interview: {
    easy: [
      "Tell me about yourself and your background.",
      "What are your greatest strengths?",
      "Why are you interested in this position?",
      "Describe your ideal work environment.",
      "What motivates you at work?",
      "Tell me about a project you're proud of.",
      "How do you handle feedback from managers?",
      "What do you know about our company?",
    ],
    medium: [
      "Tell me about a time you demonstrated leadership in a challenging situation.",
      "How do you handle conflicting priorities when working on multiple projects?",
      "Describe a situation where you had to learn a new skill quickly to complete a task.",
      "What approach do you take when you disagree with a team member's idea?",
      "How do you measure success in your work?",
      "Walk me through a difficult decision you made at work and its outcome.",
      "How do you stay organized when managing multiple deadlines?",
      "Describe a time you failed and what you learned from it.",
    ],
    hard: [
      "Tell me about a time you influenced a critical business decision without having formal authority.",
      "Describe a situation where you had to pivot your entire approach mid-project. What drove the change?",
      "How would you handle discovering that your team has been following a flawed process for months?",
      "Walk me through your approach to making a decision when you only have 60% of the information you need.",
      "Describe a conflict with a senior stakeholder and how you resolved it while maintaining the relationship.",
      "Tell me about the most complex cross-functional initiative you've led.",
      "How would you approach joining a team where morale is low and the previous lead was let go?",
      "Describe how you've balanced short-term delivery pressure with long-term technical quality.",
    ],
  },
  presentation: {
    easy: [
      "Introduce yourself to a small team in 30 seconds.",
      "Explain your favorite hobby to someone who has never tried it.",
      "Describe what you did at work today in one minute.",
      "Present one benefit of a product you use daily.",
      "Share a fun fact and explain why it's interesting.",
    ],
    medium: [
      "Present a project update to your team — cover status, blockers, and next steps.",
      "Pitch a new idea to your manager — explain the problem, your solution, and expected impact.",
      "Explain a complex concept from your field to a non-technical audience.",
      "Present the results of a recent project and what you learned.",
      "Deliver a 2-minute overview of your team's quarterly achievements.",
    ],
    hard: [
      "Deliver a 3-minute keynote-style pitch for a product that doesn't exist yet.",
      "Present a controversial opinion to a skeptical audience and defend your position.",
      "Handle an unexpected difficult question mid-presentation and recover smoothly.",
      "Present bad news to stakeholders while maintaining confidence and offering a path forward.",
      "Deliver an impromptu toast at a company event for someone you barely know.",
    ],
  },
  casual: {
    easy: [
      "Talk about a movie or show you watched recently.",
      "Describe your typical weekend.",
      "Share a funny story from your life.",
      "Talk about your favorite food and why you like it.",
      "Describe a place you'd love to visit.",
    ],
    medium: [
      "Explain why you chose your current career path.",
      "Describe a challenge you overcame recently and how it changed your perspective.",
      "Talk about a book, podcast, or article that made you think differently.",
      "Share your opinion on a current trend and why you feel that way.",
      "Describe the most interesting person you've met and what made them memorable.",
    ],
    hard: [
      "Debate both sides of a topic you feel strongly about.",
      "Tell a story from your life that shaped who you are today — make it compelling.",
      "Explain a complex issue in current events as if talking to a friend.",
      "Describe a time your perspective on something important fundamentally changed.",
      "Talk about what success means to you and how that definition has evolved.",
    ],
  },
};

/** Pick adaptive difficulty based on recent scores. */
function pickDifficulty(previousScores) {
  if (!previousScores || previousScores.length === 0) return "medium";
  const avg = previousScores.reduce((a, b) => a + b, 0) / previousScores.length;
  if (avg >= 70) return "hard";
  if (avg <= 40) return "easy";
  return "medium";
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Detect which AI provider is available.
 * Respects VITE_AI_PROVIDER preference.
 */
export function getProvider() {
  const forceMock = import.meta.env.VITE_MOCK_MODE === "true";
  if (forceMock) return "mock";

  const pref = (import.meta.env.VITE_AI_PROVIDER || "auto").toLowerCase();
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (pref === "openai" && openaiKey?.length > 10) return "openai";
  if (pref === "gemini" && geminiKey?.length > 10) return "gemini";

  // Auto: try openai first, then gemini
  if (openaiKey?.length > 10) return "openai";
  if (geminiKey?.length > 10) return "gemini";
  return "mock";
}

/**
 * Call the AI with retry + caching.
 * Always returns a validated feedback object — never throws.
 *
 * @param {string}  prompt       Full prompt (already assembled).
 * @param {string}  transcript   The user's spoken text (for deterministic scoring).
 * @param {boolean} skipCache    If true, bypass the response cache (e.g. retries).
 * @returns {{ data: object, provider: string, isMock: boolean }}
 */
export async function invokeLLM(prompt, transcript = "", skipCache = false) {
  const provider = getProvider();
  log("Provider selected", provider);

  // Mock mode
  if (provider === "mock") {
    const mock = getMockFeedback(transcript);
    log("Mock feedback (transcript-aware)", mock);
    return { data: mock, provider: "mock", isMock: true };
  }

  // Cache check
  const cacheKey = hashStr(prompt);
  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      log("Cache hit", cacheKey);
      return { data: cached, provider: provider + "-cached", isMock: false };
    }
  }

  const apiKey = provider === "openai"
    ? import.meta.env.VITE_OPENAI_API_KEY
    : import.meta.env.VITE_GEMINI_API_KEY;

  const callFn = provider === "openai" ? callOpenAI : callGemini;

  const schemaInstruction = `\n\nYou MUST respond with a single valid JSON object matching this exact schema — no markdown, no explanation, just the JSON:\n${JSON.stringify(FEEDBACK_SCHEMA, null, 2)}`;
  const fullPrompt = prompt + schemaInstruction;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      log(`Attempt ${attempt}/${MAX_RETRIES}`, { provider });

      const raw = await callFn(fullPrompt, apiKey);

      // Merge AI scores with deterministic base scores for consistency
      const baseScores = computeBaseScores(transcript);
      if (raw && typeof raw === "object") {
        // Blend: 60% AI score + 40% deterministic score for consistency
        raw.clarity     = Math.round((clampScore(raw.clarity)     * 0.6) + (baseScores.clarity     * 0.4));
        raw.confidence  = Math.round((clampScore(raw.confidence)  * 0.6) + (baseScores.confidence  * 0.4));
        raw.structure   = Math.round((clampScore(raw.structure)   * 0.6) + (baseScores.structure   * 0.4));
        raw.fluency     = Math.round((clampScore(raw.fluency)     * 0.6) + (baseScores.fluency     * 0.4));
      }

      const validated = validateFeedback(raw);
      if (validated) {
        setCache(cacheKey, validated);
        log("Validated feedback", validated);
        return { data: validated, provider, isMock: false };
      }
      log("Validation failed, raw was", raw);
    } catch (err) {
      log(`Attempt ${attempt} error`, err.message);

      // If auth error, don't retry — fall through to mock
      if (err.message.includes("401") || err.message.includes("403") || err.message.includes("Invalid API key")) {
        break;
      }

      if (attempt === MAX_RETRIES) {
        console.error("[aiService] All retries exhausted:", err.message);
      }
    }
  }

  // Fallback to transcript-aware mock
  const fallback = getMockFeedback(transcript);
  log("Falling back to transcript-aware mock", fallback);
  return { data: fallback, provider: "mock-fallback", isMock: true };
}

/**
 * Generate an adaptive practice question.
 *
 * @param {string} contextPrompt
 * @param {{ mode, experienceLevel, previousScores }} opts
 */
export async function generateQuestion(contextPrompt, opts = {}) {
  const { mode = "interview", experienceLevel, previousScores } = opts;
  const difficulty = pickDifficulty(previousScores);
  const provider = getProvider();

  // Always pick from pool first (fast), optionally enhance with AI
  const pool = QUESTION_POOLS[mode]?.[difficulty] || QUESTION_POOLS.interview.medium;
  const poolQuestion = pool[Math.floor(Math.random() * pool.length)];

  if (provider === "mock") return poolQuestion;

  // Try AI for a more tailored question
  const apiKey = provider === "openai"
    ? import.meta.env.VITE_OPENAI_API_KEY
    : import.meta.env.VITE_GEMINI_API_KEY;
  const callFn = provider === "openai" ? callOpenAI : callGemini;

  const difficultyContext = difficulty === "hard"
    ? "Generate a challenging, nuanced question requiring specific examples and complex reasoning."
    : difficulty === "easy"
    ? "Generate a straightforward, approachable question suitable for someone just starting to practice."
    : "Generate a moderate-difficulty question that encourages thoughtful response.";

  const experienceContext = experienceLevel
    ? `The user has ${experienceLevel} years of experience.`
    : "";

  const fullPrompt = `${contextPrompt}

${difficultyContext}
${experienceContext}
Difficulty level: ${difficulty}

Respond with a JSON object: { "question": "<your question here>" }. Only the JSON, no extra text.`;

  try {
    const raw = await callFn(fullPrompt, apiKey);
    if (raw?.question?.length > 10) return raw.question;
    if (raw?.prompt?.length > 10) return raw.prompt;
  } catch (err) {
    log("generateQuestion AI error, using pool", err.message);
  }

  return poolQuestion;
}

/**
 * Convert numeric scores (0-100) to level labels for UI.
 */
export function scoresToLevels(scores) {
  return {
    clarity:    scoreToLevel(scores.clarity),
    structure:  scoreToLevel(scores.structure),
    confidence: scoreToLevel(scores.confidence),
  };
}

/**
 * Build the full coaching analysis prompt.
 * Now deeply analyzes transcript and provides deterministic scoring hints.
 */
export function buildCoachingPrompt({
  mode,
  currentPrompt,
  transcript,
  language,
  feedbackStyle,
  coachingFocus,
  interviewType,
  jobRole,
  experienceLevel,
  parentSession,
  retryFocus,
}) {
  // Pre-analyze transcript for the AI
  const fillerCount = countFillers(transcript);
  const wordCount = (transcript || "").split(/\s+/).length;
  const sentenceCount = (transcript || "").split(/[.!?]+/).filter(s => s.trim()).length;
  const baseScores = computeBaseScores(transcript);
  const firstPhrase = (transcript || "").split(/[,.!?]/)[0]?.trim() || "";

  // Style
  const styleMap = {
    encouraging: "Tone: Warm, supportive, motivating. Start with genuine positives. Frame improvements as growth opportunities.",
    direct: "Tone: Concise, action-focused. Get straight to the point. No filler praise. Be efficient and specific.",
    balanced: "Tone: Professional and balanced. Mix encouragement with honest, specific feedback.",
  };
  const styleInstructions = styleMap[feedbackStyle] || styleMap.balanced;

  // Focus
  const focusMap = {
    confidence: "PRIMARY FOCUS: Confidence. Look for hesitation markers, hedging language ('I think', 'maybe'), pacing, and vocal certainty.",
    clarity: "PRIMARY FOCUS: Clarity. Is the core idea immediately understandable? Are there ambiguous statements?",
    structure: "PRIMARY FOCUS: Structure. Clear beginning, middle, end? Logical progression? STAR method if interview?",
    fluency: "PRIMARY FOCUS: Fluency. Smooth expression, natural flow, minimal hesitation and filler words.",
  };
  const focusInstructions = focusMap[coachingFocus] || "BALANCED FOCUS: Evaluate all dimensions equally.";

  // Language
  const langBlock = language === "hindi"
    ? `LANGUAGE: Generate ALL text in Hindi. Only technical nouns may be English. Every field must be Hindi.`
    : `LANGUAGE: Generate ALL text in English.`;

  // Mode context
  const modeMap = {
    interview: `Interview Practice. Type: ${interviewType || "behavioral"}. Role: ${jobRole || "general"}. Experience: ${experienceLevel || "any"}.
Prioritize: Structure > Relevance > Confidence.`,
    presentation: `Presentation Practice. Prioritize: Confidence > Clarity > Pacing.`,
    casual: `Casual Speaking. Prioritize: Fluency > Natural Flow > Ease.`,
  };
  const modeContext = modeMap[mode] || modeMap.interview;

  // Retry comparison
  let retryBlock = "";
  if (parentSession) {
    retryBlock = `
RETRY MODE — This is a second attempt. Compare to previous:
Previous transcript: "${(parentSession.transcript || "").slice(0, 300)}"
Previous feedback: "${parentSession.feedback?.improve || "none"}"
Focus area: ${retryFocus || "general improvement"}
IMPORTANT: Acknowledge ANY improvement, even subtle. Make the user feel their effort paid off.`;
  }

  return `${langBlock}

${styleInstructions}

${focusInstructions}

MODE: ${modeContext}

QUESTION: "${currentPrompt}"

USER'S SPOKEN RESPONSE (transcript):
"${transcript}"

TRANSCRIPT ANALYSIS (pre-computed — use these as anchoring data):
- Word count: ${wordCount}
- Sentence count: ${sentenceCount}
- Filler word count: ${fillerCount}
- Opening phrase: "${firstPhrase}"
- Base score hints: clarity ~${baseScores.clarity}, confidence ~${baseScores.confidence}, structure ~${baseScores.structure}, fluency ~${baseScores.fluency}

${retryBlock}

SCORING RULES:
- Score 0-100 for clarity, confidence, structure, fluency
- Use the base score hints above as anchoring — deviate by at most ±15 points
- ${fillerCount > 3 ? `High filler count (${fillerCount}) → confidence should be ≤55` : fillerCount === 0 ? "No fillers detected → fluency gets a bonus" : "Moderate fillers — note in improvements"}
- ${wordCount < 15 ? "Very short response → structure should be ≤45" : wordCount > 80 ? "Long response — check if rambling" : "Good response length"}
- Never score below 20 — always find at least one strength
- If retry, adjust scores up for any improvement

FEEDBACK RULES:
- "feedback": 2-3 sentences. MUST quote at least one phrase from their transcript.
- "strengths": 1-3 items. Each MUST reference something specific they said.
- "improvements": 1-3 items. Give concrete alternatives (e.g., "Instead of 'I think maybe...' try 'I believe...'")
- "tip": ONE immediately actionable step they can do on the next attempt
- "sampleAnswer": A better version preserving their core message and style

Respond with a single valid JSON object. No markdown, no fences, just JSON.`;
}

// ── Exported Utilities ───────────────────────────────────────────────────────

export { countFillers, computeBaseScores };

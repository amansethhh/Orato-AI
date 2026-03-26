/**
 * Orato AI — Server Configuration
 * Central config for all server settings. Import this instead of hardcoding values.
 */

const config = {
  // ── Server ─────────────────────────────────────────────────────────────────
  port: parseInt(process.env.PORT || "3001", 10),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",

  // ── AI Provider ────────────────────────────────────────────────────────────
  aiProvider: (process.env.AI_PROVIDER || "auto").toLowerCase(), // auto | openai | gemini
  openaiKey: process.env.OPENAI_API_KEY || "",
  geminiKey: process.env.GEMINI_API_KEY || "",

  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  rateLimit: {
    windowMs: 60 * 1000,       // 1 minute window
    maxRequests: 30,            // 30 requests per window per IP
    message: { error: "Too many requests. Please wait a moment and try again." },
  },

  // ── Timeouts ───────────────────────────────────────────────────────────────
  aiTimeout: 12_000,           // 12 seconds per AI call
  maxRetries: 2,               // retry up to 2 times on failure

  // ── Cache ──────────────────────────────────────────────────────────────────
  cache: {
    ttl: 5 * 60 * 1000,        // 5 minutes
    maxSize: 200,               // max cached entries
    dedupeWindowMs: 10_000,     // 10s dedup window for identical transcripts
  },

  // ── Input Validation ───────────────────────────────────────────────────────
  validation: {
    maxPromptLength: 15_000,    // max chars for prompt field
    maxTranscriptLength: 10_000, // max chars for transcript field
    minTranscriptLength: 1,     // min chars for transcript (reject empty)
  },

  // ── Feedback Schema (expected AI response fields) ──────────────────────────
  feedbackSchema: {
    requiredFields: ["feedback", "clarity", "confidence", "structure", "fluency"],
    numericFields: ["clarity", "confidence", "structure", "fluency"],
    arrayFields: ["strengths", "improvements"],
    stringFields: ["feedback", "tip", "sampleAnswer"],
  },
};

export default config;

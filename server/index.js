/**
 * Orato AI — Backend Proxy Server
 *
 * Protects API keys, validates requests/responses, caches, rate-limits,
 * and provides a resilient AI proxy that never crashes.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import config from "./config.js";

const app = express();

// ── Logging ──────────────────────────────────────────────────────────────────

function log(level, msg, data = null) {
  const ts = new Date().toISOString();
  const entry = `[${ts}] [${level.toUpperCase()}] ${msg}`;
  if (data) console[level === "error" ? "error" : "log"](entry, data);
  else console[level === "error" ? "error" : "log"](entry);
}

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json({ limit: "1mb" }));
app.use(cors({
  origin: config.frontendUrl,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

// Rate limiter
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: config.rateLimit.message,
});
app.use("/api/", limiter);

// Request logger (no sensitive data)
app.use("/api/", (req, _res, next) => {
  log("info", `${req.method} ${req.path}`, {
    ip: req.ip,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    promptLen: req.body?.prompt?.length || 0,
    transcriptLen: req.body?.transcript?.length || 0,
  });
  next();
});

// ── In-Memory Cache ──────────────────────────────────────────────────────────

const cache = new Map();
const dedupeMap = new Map(); // transcript hash → { response, expiresAt }

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return `h${h}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  // Evict oldest if at max size
  if (cache.size >= config.cache.maxSize) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { data, expiresAt: Date.now() + config.cache.ttl });
}

function getDeduped(transcriptHash) {
  const entry = dedupeMap.get(transcriptHash);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    dedupeMap.delete(transcriptHash);
    return null;
  }
  return entry.data;
}

function setDeduped(transcriptHash, data) {
  dedupeMap.set(transcriptHash, {
    data,
    expiresAt: Date.now() + config.cache.dedupeWindowMs,
  });
}

// ── AI Provider Selection ────────────────────────────────────────────────────

function getProvider() {
  const pref = config.aiProvider;
  const hasOpenAI = config.openaiKey.length > 10;
  const hasGemini = config.geminiKey.length > 10;

  if (pref === "openai" && hasOpenAI) return "openai";
  if (pref === "gemini" && hasGemini) return "gemini";
  if (hasOpenAI) return "openai";
  if (hasGemini) return "gemini";
  return "mock";
}

// ── AI API Callers ───────────────────────────────────────────────────────────

async function callOpenAI(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.aiTimeout);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openaiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        messages: [
          { role: "system", content: "You are a communication coach. Always respond with valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (res.status === 401 || res.status === 403) throw new Error("AUTH_FAILED");
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || "";
    return parseAIResponse(text);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") throw new Error("TIMEOUT");
    throw err;
  }
}

async function callGemini(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.aiTimeout);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (res.status === 401 || res.status === 403) throw new Error("AUTH_FAILED");
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return parseAIResponse(text);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") throw new Error("TIMEOUT");
    throw err;
  }
}

// ── Response Parsing & Validation ────────────────────────────────────────────

function parseAIResponse(text) {
  // Extract JSON from markdown code fences or raw text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[1].trim());
  } catch {
    return null;
  }
}

function validateFeedback(data) {
  if (!data || typeof data !== "object") return null;

  const { requiredFields, numericFields, arrayFields, stringFields } = config.feedbackSchema;

  // Check required fields exist
  for (const field of requiredFields) {
    if (data[field] === undefined && data[field] === null) return null;
  }

  // Clamp numeric fields to 0–100
  for (const field of numericFields) {
    if (typeof data[field] === "number") {
      data[field] = Math.max(0, Math.min(100, Math.round(data[field])));
    } else if (typeof data[field] === "string") {
      const n = parseInt(data[field], 10);
      data[field] = isNaN(n) ? 50 : Math.max(0, Math.min(100, n));
    } else {
      data[field] = 50; // safe default
    }
  }

  // Ensure arrays
  for (const field of arrayFields) {
    if (!Array.isArray(data[field])) {
      data[field] = data[field] ? [String(data[field])] : [];
    }
  }

  // Ensure strings
  for (const field of stringFields) {
    if (typeof data[field] !== "string") {
      data[field] = data[field] ? String(data[field]) : "";
    }
  }

  return data;
}

function getFallbackFeedback(transcript = "") {
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  return {
    feedback: "Your response was received. Keep practicing to improve your delivery.",
    clarity: 55,
    confidence: 50,
    structure: 50,
    fluency: 55,
    strengths: ["You provided a response — that's the first step."],
    improvements: ["Try adding more specific details next time."],
    tip: "Before speaking, take a breath and outline your main points mentally.",
    sampleAnswer: "",
    filler_word_count: Math.max(0, Math.floor(wordCount * 0.1)),
    _isFallback: true,
  };
}

// ── AI Call with Retry ───────────────────────────────────────────────────────

async function callAIWithRetry(prompt, transcript) {
  const provider = getProvider();
  log("info", `AI provider: ${provider}`);

  if (provider === "mock") {
    return { data: getFallbackFeedback(transcript), provider: "mock", isMock: true };
  }

  const callFn = provider === "openai" ? callOpenAI : callGemini;
  const schemaInstruction = `\n\nRespond ONLY with a valid JSON object (no markdown, no explanation) matching this schema:
{
  "feedback": "string - 2-3 sentence coaching feedback",
  "clarity": "number 0-100",
  "confidence": "number 0-100",
  "structure": "number 0-100",
  "fluency": "number 0-100",
  "strengths": ["string array - 1-3 specific strengths"],
  "improvements": ["string array - 1-3 specific improvements"],
  "tip": "string - one actionable tip",
  "sampleAnswer": "string - improved version of their response",
  "filler_word_count": "number"
}`;

  const fullPrompt = prompt + schemaInstruction;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      log("info", `AI attempt ${attempt}/${config.maxRetries}`);
      const raw = await callFn(fullPrompt);
      const validated = validateFeedback(raw);

      if (validated) {
        log("info", "AI response validated successfully");
        return { data: validated, provider, isMock: false };
      }

      log("warn", `Attempt ${attempt}: validation failed, raw:`, raw);
    } catch (err) {
      log("error", `Attempt ${attempt} error: ${err.message}`);

      if (err.message === "AUTH_FAILED") {
        // Don't retry auth failures
        log("error", "API key rejected — returning fallback");
        break;
      }

      if (err.message === "RATE_LIMITED" && attempt < config.maxRetries) {
        // Exponential backoff for rate limits
        const backoff = 2000 * attempt;
        log("warn", `Rate limited, waiting ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  // All retries failed — return fallback
  log("warn", "All AI attempts failed, returning fallback");
  return { data: getFallbackFeedback(transcript), provider: "fallback", isMock: true };
}

// ── Request Validation ───────────────────────────────────────────────────────

function validateAIRequest(body) {
  const errors = [];
  const { maxPromptLength, maxTranscriptLength, minTranscriptLength } = config.validation;

  if (!body || typeof body !== "object") {
    return ["Request body must be a JSON object."];
  }

  if (typeof body.prompt !== "string" || !body.prompt.trim()) {
    errors.push("'prompt' is required and must be a non-empty string.");
  } else if (body.prompt.length > maxPromptLength) {
    errors.push(`'prompt' exceeds maximum length of ${maxPromptLength} characters.`);
  }

  if (typeof body.transcript !== "string") {
    errors.push("'transcript' is required and must be a string.");
  } else if (body.transcript.trim().length < minTranscriptLength) {
    errors.push("'transcript' must not be empty.");
  } else if (body.transcript.length > maxTranscriptLength) {
    errors.push(`'transcript' exceeds maximum length of ${maxTranscriptLength} characters.`);
  }

  return errors;
}

function validateQuestionRequest(body) {
  const errors = [];
  if (!body || typeof body !== "object") {
    return ["Request body must be a JSON object."];
  }
  if (typeof body.prompt !== "string" || !body.prompt.trim()) {
    errors.push("'prompt' is required and must be a non-empty string.");
  }
  return errors;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (_req, res) => {
  const provider = getProvider();
  res.json({
    status: "ok",
    provider,
    uptime: Math.floor(process.uptime()),
    cacheSize: cache.size,
    timestamp: new Date().toISOString(),
  });
});

// AI Feedback — main endpoint
app.post("/api/ai", async (req, res) => {
  try {
    const errors = validateAIRequest(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const { prompt, transcript } = req.body;

    // Check transcript deduplication
    const transcriptHash = hashStr(transcript.trim().toLowerCase());
    const deduped = getDeduped(transcriptHash);
    if (deduped) {
      log("info", "Transcript dedup hit");
      return res.json({ ...deduped, _cached: true });
    }

    // Check prompt cache
    const cacheKey = hashStr(prompt);
    const cached = getCached(cacheKey);
    if (cached) {
      log("info", "Prompt cache hit");
      return res.json({ ...cached, _cached: true });
    }

    // Call AI
    const result = await callAIWithRetry(prompt, transcript);

    // Cache the response
    setCache(cacheKey, result.data);
    setDeduped(transcriptHash, result.data);

    return res.json({
      ...result.data,
      _provider: result.provider,
      _isMock: result.isMock,
    });
  } catch (err) {
    log("error", "Unhandled error in /api/ai", err.message);
    return res.status(500).json({
      error: "Internal server error",
      ...getFallbackFeedback(req.body?.transcript || ""),
    });
  }
});

// AI Question Generation
app.post("/api/ai/question", async (req, res) => {
  try {
    const errors = validateQuestionRequest(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const { prompt } = req.body;
    const provider = getProvider();

    if (provider === "mock") {
      return res.json({ question: "Tell me about a challenging situation you faced and how you handled it." });
    }

    const callFn = provider === "openai" ? callOpenAI : callGemini;
    const fullPrompt = prompt + '\n\nRespond ONLY with a JSON object: {"question": "your generated question here"}';

    try {
      const raw = await callFn(fullPrompt);
      if (raw?.question) {
        return res.json({ question: raw.question });
      }
    } catch (err) {
      log("error", "Question generation failed", err.message);
    }

    // Fallback question
    return res.json({ question: "Describe a project you're proud of and what you learned from it." });
  } catch (err) {
    log("error", "Unhandled error in /api/ai/question", err.message);
    return res.status(500).json({
      error: "Internal server error",
      question: "What motivates you in your career?",
    });
  }
});

// ── Global Error Handler ─────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  log("error", "Unhandled server error", { message: err.message, stack: err.stack });
  res.status(500).json({
    error: "Something went wrong. Please try again.",
    _serverError: config.nodeEnv === "development" ? err.message : undefined,
  });
});

// ── 404 Handler ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// ── Start ────────────────────────────────────────────────────────────────────

app.listen(config.port, () => {
  const provider = getProvider();
  log("info", `Orato AI server running on port ${config.port}`);
  log("info", `AI Provider: ${provider}`);
  log("info", `Frontend URL: ${config.frontendUrl}`);
  log("info", `Rate limit: ${config.rateLimit.maxRequests} req/${config.rateLimit.windowMs / 1000}s`);
  log("info", `Cache TTL: ${config.cache.ttl / 1000}s, max size: ${config.cache.maxSize}`);
});

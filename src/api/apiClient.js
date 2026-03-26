/**
 * Orato AI — API Client
 * Local API layer with localStorage persistence.
 * Delegates AI calls to aiService.js.
 */

import logger from "@/lib/logger.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const safeParse = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const safeStringify = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    logger.warn("localStorage write failed:", e);
  }
};

// ── Default User ─────────────────────────────────────────────────────────────

const DEFAULT_USER = {
  id: "local-user-001",
  name: "Orato User",
  email: "user@orato.local",
  role: "admin",
  appearance: "light",
  language: "english",
  coaching_focus: "confidence",
  feedback_style: "encouraging",
};

const getUser = () => safeParse("orato_user", { ...DEFAULT_USER });
const setUser = (u) => safeStringify("orato_user", u);

// Initialise user on first load (migrate old key if present)
if (!localStorage.getItem("orato_user")) {
  const legacy = safeParse("orato_mock_user");
  if (legacy) {
    safeStringify("orato_user", legacy);
    localStorage.removeItem("orato_mock_user");
  } else {
    setUser({ ...DEFAULT_USER });
  }
}

// ── Sessions Store ───────────────────────────────────────────────────────────

const getSessions = () => safeParse("orato_sessions", safeParse("orato_mock_sessions", []));
const setSessions = (s) => safeStringify("orato_sessions", s);

// Migrate legacy key
if (localStorage.getItem("orato_mock_sessions") && !localStorage.getItem("orato_sessions")) {
  safeStringify("orato_sessions", safeParse("orato_mock_sessions", []));
}

// ── Auth ─────────────────────────────────────────────────────────────────────

const auth = {
  async me() {
    await delay();
    return { ...getUser() };
  },

  async isAuthenticated() {
    await delay(100);
    return true;
  },

  async logout(redirectUrl) {
    await delay(100);
    localStorage.removeItem("orato_user");
    if (redirectUrl) window.location.href = redirectUrl;
  },

  async redirectToLogin(returnUrl) {
    await delay(100);
    if (returnUrl) window.location.href = returnUrl;
  },

  async updateMe(updates) {
    await delay();
    const user = getUser();
    const updated = { ...user, ...updates };
    setUser(updated);
    return { ...updated };
  },
};

// ── Entities ─────────────────────────────────────────────────────────────────

const PracticeSession = {
  async create(data) {
    await delay(300);
    const session = {
      id: generateId(),
      created_date: new Date().toISOString(),
      mode: data.mode || "interview",
      prompt: data.prompt || "",
      transcript: data.transcript || "",
      audio_url: data.audio_url || "",
      feedback: data.feedback || null,
      scoring: data.scoring || null,
      filler_word_count: data.filler_word_count || 0,
      retry_focus: data.retry_focus || null,
      parent_session_id: data.parent_session_id || null,
      questions: data.questions || [],
      answers: data.answers || [],
      score: data.score || 0,
      ...data,
    };
    const sessions = getSessions();
    sessions.unshift(session);
    setSessions(sessions);
    return { ...session };
  },

  async filter(query) {
    await delay();
    const sessions = getSessions();
    if (query?.id) return sessions.filter((s) => s.id === query.id);
    if (query?.parent_session_id) return sessions.filter((s) => s.parent_session_id === query.parent_session_id);
    return sessions;
  },

  async list(sortField, limit) {
    await delay();
    let sessions = [...getSessions()];
    if (sortField) {
      const desc = sortField.startsWith("-");
      const field = desc ? sortField.slice(1) : sortField;
      sessions.sort((a, b) => {
        const va = a[field] || "";
        const vb = b[field] || "";
        return desc ? vb.localeCompare(va) : va.localeCompare(vb);
      });
    }
    if (limit && typeof limit === "number") sessions = sessions.slice(0, limit);
    return sessions;
  },

  async update(id, data) {
    await delay();
    const sessions = getSessions();
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx !== -1) {
      sessions[idx] = { ...sessions[idx], ...data };
      setSessions(sessions);
      return { ...sessions[idx] };
    }
    return null;
  },
};

const entities = { PracticeSession };

// ── AI Integration (delegates to aiService.js) ───────────────────────────────

import { invokeLLM, generateQuestion, scoresToLevels } from "./aiService.js";

const Core = {
  async InvokeLLM({ prompt, response_json_schema, transcript, ...rest }) {
    const promptLower = (prompt || "").toLowerCase();

    // Question generation
    if (
      promptLower.includes("generate") &&
      (promptLower.includes("question") || promptLower.includes("prompt"))
    ) {
      const question = await generateQuestion(prompt, rest);
      return { question, prompt: question, questions: [question] };
    }

    // Feedback / analysis
    const { data, isMock } = await invokeLLM(prompt, transcript || "");

    const levels = scoresToLevels({
      clarity: data.clarity ?? 50,
      structure: data.structure ?? 50,
      confidence: data.confidence ?? 50,
    });

    return {
      ...data,
      transcript: data.sampleAnswer || "",
      scoring: levels,
      filler_word_count: data.filler_word_count || Math.floor(Math.random() * 4) + 1,
      did_well: (data.strengths || [])[0] || "Good effort.",
      improve: (data.improvements || [])[0] || "Continue practicing.",
      tip: data.tip || "Try again with more detail.",
      full_feedback: data.feedback || "Response processed successfully.",
      reasoning: `Based on scores — Clarity: ${data.clarity}, Confidence: ${data.confidence}, Structure: ${data.structure}.`,
      rephrased_version: data.sampleAnswer || "",
      retry_focus:
        data.structure < data.clarity && data.structure < data.confidence
          ? "structure"
          : data.confidence < data.clarity
          ? "confidence"
          : "clarity",
      overall_feedback: data.feedback,
      score: Math.round(
        ((data.clarity || 50) + (data.confidence || 50) + (data.structure || 50) + (data.fluency || 50)) / 4
      ),
      strengths: data.strengths || ["Good attempt"],
      areas_for_improvement: data.improvements || ["Continue practicing"],
      suggestions: data.improvements || ["Continue practicing"],
      _isMock: isMock,
    };
  },

  async UploadFile({ file }) {
    let fileUrl = "blob:local-audio-url";
    if (file && typeof URL !== "undefined") {
      try {
        fileUrl = URL.createObjectURL(file);
      } catch {
        fileUrl = "blob:local-audio-url";
      }
    }
    return { file_url: fileUrl };
  },
};

const integrations = { Core };

// ── App Logs ─────────────────────────────────────────────────────────────────

const appLogs = {
  async logUserInApp(pageName) {
    if (import.meta.env.DEV) logger.debug(`Page: ${pageName}`);
  },
};

// ── Export ────────────────────────────────────────────────────────────────────

export const api = { auth, entities, integrations, appLogs };

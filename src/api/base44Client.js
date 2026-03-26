/**
 * Local Mock API Layer — replaces @base44/sdk
 * All methods are async and simulate ~200ms network latency.
 * Data is persisted to localStorage.
 */

const isMock = import.meta.env.VITE_MOCK_MODE === "true";

// ── Helpers ──────────────────────────────────────────────────────────────────

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** Safe JSON parse with fallback */
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
    console.warn('[mock] localStorage write failed:', e);
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

const getUser = () => safeParse("orato_mock_user", { ...DEFAULT_USER });
const setUser = (u) => safeStringify("orato_mock_user", u);

// Initialise user on first load
if (!localStorage.getItem("orato_mock_user")) {
  setUser({ ...DEFAULT_USER });
}

// ── Practice Sessions Store ──────────────────────────────────────────────────

const getSessions = () => safeParse("orato_mock_sessions", []);
const setSessions = (s) => safeStringify("orato_mock_sessions", s);

// ── Auth namespace ───────────────────────────────────────────────────────────

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
    localStorage.removeItem("orato_mock_user");
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },

  async redirectToLogin(returnUrl) {
    await delay(100);
    // In mock mode, just navigate to the return URL (user is always "logged in")
    if (returnUrl) {
      window.location.href = returnUrl;
    }
  },

  async updateMe(updates) {
    await delay();
    const user = getUser();
    const updated = { ...user, ...updates };
    setUser(updated);
    return { ...updated };
  },
};

// ── Entities namespace ───────────────────────────────────────────────────────

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
    if (query && query.id) {
      return sessions.filter((s) => s.id === query.id);
    }
    if (query && query.parent_session_id) {
      return sessions.filter(
        (s) => s.parent_session_id === query.parent_session_id
      );
    }
    return sessions;
  },

  async list(sortField, limit) {
    await delay();
    let sessions = [...getSessions()];

    // Handle sort (e.g. "-created_date" = descending)
    if (sortField) {
      const desc = sortField.startsWith("-");
      const field = desc ? sortField.slice(1) : sortField;
      sessions.sort((a, b) => {
        const va = a[field] || "";
        const vb = b[field] || "";
        return desc ? vb.localeCompare(va) : va.localeCompare(vb);
      });
    }

    if (limit && typeof limit === "number") {
      sessions = sessions.slice(0, limit);
    }

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

// ── Integrations namespace ───────────────────────────────────────────────────

const MOCK_FEEDBACK_TEMPLATES = [
  {
    feedback:
      "Your response demonstrated strong analytical thinking. You structured your answer well with a clear introduction and logical progression. Consider adding more specific examples to strengthen your points.",
    score: 78,
    suggestions: [
      "Use the STAR method to structure behavioral answers",
      "Include quantifiable results when describing achievements",
      "Maintain steady pacing — you rushed slightly in the middle section",
    ],
  },
  {
    feedback:
      "Great confidence and clarity in your delivery! Your tone was professional and engaging. Work on reducing filler words and pausing intentionally instead.",
    score: 85,
    suggestions: [
      "Replace 'um' and 'like' with brief pauses",
      "Open with a strong hook statement",
      "Summarize your key point at the end",
    ],
  },
  {
    feedback:
      "Solid attempt! Your content knowledge is clearly strong. Focus on vocal variety and emotional engagement to make your response more compelling.",
    score: 72,
    suggestions: [
      "Vary your pitch to emphasise key points",
      "Use hand gestures to reinforce your message",
      "Practice the 3-point structure: context, action, result",
    ],
  },
];

const Core = {
  async InvokeLLM({ prompt, response_json_schema, ...rest }) {
    await delay(800);

    // Attempt to determine what kind of response is expected
    const promptLower = (prompt || "").toLowerCase();

    // Question generation (single question or list)
    if (
      promptLower.includes("generate") &&
      (promptLower.includes("question") || promptLower.includes("prompt"))
    ) {
      const questionPool = [
        "Tell me about a time you demonstrated leadership in a challenging situation.",
        "How do you handle conflicting priorities when working on multiple projects?",
        "Describe a situation where you had to learn a new skill quickly to complete a task.",
        "What approach do you take when you disagree with a team member's idea?",
        "How do you measure success in your work?",
      ];
      // Return both .question (single) and .questions (array) for compatibility
      const picked = questionPool[Math.floor(Math.random() * questionPool.length)];
      return {
        question: picked,
        prompt: picked,
        questions: questionPool,
      };
    }

    // Feedback / analysis
    if (
      promptLower.includes("feedback") ||
      promptLower.includes("analyze") ||
      promptLower.includes("analyse") ||
      promptLower.includes("evaluate") ||
      promptLower.includes("score") ||
      promptLower.includes("coach")
    ) {
      const template =
        MOCK_FEEDBACK_TEMPLATES[
          Math.floor(Math.random() * MOCK_FEEDBACK_TEMPLATES.length)
        ];

      return {
        // Fields expected by VoicePractice processRecording
        transcript:
          "I believe my greatest strength is problem-solving. In my previous role, I identified a bottleneck in our deployment pipeline and implemented an automated solution that reduced deployment time by 40%.",
        scoring: {
          clarity: ["medium", "high"][Math.floor(Math.random() * 2)],
          structure: ["medium", "high"][Math.floor(Math.random() * 2)],
          confidence: ["medium", "high"][Math.floor(Math.random() * 2)],
        },
        filler_word_count: Math.floor(Math.random() * 4) + 1,
        did_well:
          "You provided a specific, quantifiable example that directly supported your main point.",
        improve:
          "Try adding a brief context-setting sentence before diving into your example.",
        tip: "Start with a one-sentence summary, then expand with your example.",
        full_feedback: template.feedback,
        reasoning:
          "Based on your sentence structure, pacing, and use of concrete examples.",
        rephrased_version:
          "My greatest strength is problem-solving. For instance, I spotted a deployment bottleneck and built an automated fix that cut deploy time by 40%.",
        retry_focus: "structure",
        // Legacy fields for AIFeedback compatibility
        overall_feedback: template.feedback,
        score: template.score,
        strengths: [
          "Clear communication",
          "Good structure",
          "Confident delivery",
        ],
        areas_for_improvement: template.suggestions,
        filler_words: { um: 3, like: 2, you_know: 1 },
        suggestions: template.suggestions,
      };
    }

    // Default: return a generic acknowledgement
    return {
      feedback: "Response processed successfully.",
      score: 75,
      suggestions: ["Continue practicing for improvement."],
      transcript: "",
      scoring: { clarity: "medium", structure: "medium", confidence: "medium" },
      filler_word_count: 0,
      did_well: "Good effort.",
      improve: "Continue practicing.",
      tip: "Try again with more detail.",
      full_feedback: "Response processed successfully.",
      reasoning: "General assessment.",
      rephrased_version: "",
      retry_focus: "general",
    };
  },

  async UploadFile({ file }) {
    await delay(500);
    // Create a local blob URL from the file if provided
    let fileUrl = "blob:mock-audio-url";
    if (file && typeof URL !== "undefined") {
      try {
        fileUrl = URL.createObjectURL(file);
      } catch {
        fileUrl = "blob:mock-audio-url";
      }
    }
    return { file_url: fileUrl };
  },
};

const integrations = { Core };

// ── App Logs namespace ───────────────────────────────────────────────────────

const appLogs = {
  async logUserInApp(pageName) {
    console.log(`[mock] User navigated to: ${pageName}`);
  },
};

// ── Export ────────────────────────────────────────────────────────────────────

export const base44 = {
  auth,
  entities,
  integrations,
  appLogs,
};

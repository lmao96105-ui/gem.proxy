import 'dotenv/config';

function optionalNumber(name) {
  return process.env[name] !== undefined ? Number(process.env[name]) : undefined;
}

export const config = {
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'production',

  // --- API key handling ------------------------------------------------
  // Both are now OPTIONAL. Nothing has to be set in Railway at all — see
  // middleware/auth.js for the three supported modes (pure bring-your-own-
  // key, password substitution, and local-testing fallback).
  //
  // geminiApiKey: only used as a fallback when the caller doesn't send a
  // key of their own (local curl testing) or as the real key that
  // proxyApiKey substitutes in for ("password mode").
  geminiApiKey: process.env.GEMINI_API_KEY || undefined,
  // proxyApiKey: an optional "password" you can hand out instead of your
  // real Gemini key. Only meaningful if geminiApiKey is also set.
  proxyApiKey: process.env.PROXY_API_KEY || undefined,
  geminiBaseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com',

  // Per-category Gemini safety thresholds.
  safetyThresholds: {
    harassment: 'BLOCK_NONE',
    hateSpeech: 'BLOCK_NONE',
    sexuallyExplicit: 'BLOCK_NONE',
    dangerousContent: 'BLOCK_NONE',
  },

  allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Per-IP request cap. Raised well above the original defaults (30/min)
  // since a single interactive roleplay session can easily fire off many
  // requests a minute (regenerates, swipes, streaming reconnects). This
  // only guards against a runaway loop/bug — it does not raise your
  // actual Gemini quota.
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 180),

  // How long to wait for Gemini to start responding before giving up.
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 600_000),

  // Transient-error retry (500 overloaded / 503 overloaded / 504). See
  // lib/upstreamFetch.js. Defaults to 1 — i.e. OFF, single attempt, no
  // retry — so a failed request always surfaces immediately instead of
  // silently resending the (often large, roleplay-context-sized) body.
  // Set RETRY_ATTEMPTS above 1 if you'd rather the proxy retry transient
  // errors for you.
  retryAttempts: Number(process.env.RETRY_ATTEMPTS || 1),
  retryBaseDelayMs: Number(process.env.RETRY_BASE_DELAY_MS || 500),

  // Applied ONLY when the client didn't already set the field itself.
  defaultTemperature: optionalNumber('DEFAULT_TEMPERATURE'),
  defaultTopP: optionalNumber('DEFAULT_TOP_P'),
  // 12000 out of the box — raise/lower with DEFAULT_MAX_TOKENS, or set
  // max_tokens per-request from the client (Janitor) to override either way.
  defaultMaxTokens: optionalNumber('DEFAULT_MAX_TOKENS') ?? 12000,

  // Hard ceiling — applied even if the client asks for more. Protects quota.
  // Unset by default, i.e. no ceiling beyond what the client/model allow.
  maxTokensCap: optionalNumber('MAX_TOKENS_CAP'),

  // Gemini "thinking" (extended reasoning) controls — applied only when the
  // client didn't already ask for thinking itself on that request.

  // Master switch. If false, we don't send a reasoning level/budget of our
  // own at all — Gemini just uses whatever it defaults to for that model.
  enableThinking: process.env.ENABLE_THINKING === 'true',

  // Only used when enableThinking is true. 'minimal' | 'low' | 'medium' | 'high'.
  // On Gemini 3.x models (gemini-3-flash, gemini-3.6-flash, gemini-3.7-flash,
  // ...) this is sent as-is (thinkingLevel).
  // Note: gemini-3.7-flash and gemini-3.8-flash reject 'minimal' with a 400
  // — use 'low' as the lightest setting if you're targeting those two.
  // On the older Gemini 2.5 models, which don't understand levels, it's
  // mapped to an approximate token budget instead (see EFFORT_TO_BUDGET in
  // lib/generationDefaults.js).
  reasoningEffort: process.env.REASONING_EFFORT,

  // Whether to ask Gemini for its thought summaries. Off by default.
  // Independent of enableThinking — most current models still do some
  // internal reasoning even without an explicit level set, so this can be
  // turned on by itself if you just want to see what's happening under the
  // hood. When on, thoughts are wrapped in <think></think> tags — kept out
  // of the OpenAI-compat `reasoning_content`-style split and instead
  // prepended straight onto the visible message, exactly as requested.
  showReasoning: process.env.SHOW_REASONING === 'true',

  // --- Optional roleplay/jailbreak tricks (see lib/roleplayTricks.js) ---
  // All OFF by default. Each changes how Gemini responds, so nothing here
  // activates unless you explicitly set it in Railway/`.env`.

  // Appends a trailing assistant turn asking Gemini to allow explicit/NSFW
  // content and avoid refusal phrasing.
  enablePrefill: process.env.ENABLE_PREFILL === 'true',

  // Appends a fake "(OOC: Continue?)" / "(OOC: Yes)" turn pair before
  // generation — a continuation-priming trick to nudge past refusals.
  enableOocTrick: process.env.ENABLE_OOC_TRICK === 'true',

  // Replaces every space in the conversation with an invisible Braille
  // blank character (U+2800) to defeat keyword-based content filters.
  // Changes the literal text Gemini sees on every turn — test before
  // relying on it.
  enableBrailleTrick: process.env.ENABLE_BRAILLE_TRICK === 'true',

  // Collapses the entire conversation into a single assistant-role turn
  // formatted as a script (Name: line) instead of alternating turns.
  enableNoAss: process.env.ENABLE_NOASS === 'true',

  // Gives Gemini a Google Search tool it can call mid-generation for
  // real-world facts/grounding.
  enableGoogleSearch: process.env.ENABLE_GOOGLE_SEARCH === 'true',
};

// One readable line per completed request, to stdout — Railway captures
// stdout as your deploy's logs automatically, nothing extra to configure.
// Kept separate from morgan (which logs the raw HTTP method/path/status
// line) since morgan has no idea what model was requested or how many
// tokens Gemini counted — that only becomes known once we've parsed
// Gemini's own response.
//
// Deliberately plain `key=value` text rather than JSON: Railway's log
// viewer free-text-searches stdout, so `model=gemini-2.5-flash` or
// `status=429` are both directly searchable as-is. Switch this to
// `console.log(JSON.stringify({...}))` instead if you'd rather pipe these
// into something structured later — every field below would carry over
// unchanged.
export function logGeminiRequest({
  model,
  stream,
  status,
  finishReason,
  promptTokens,
  completionTokens,
  totalTokens,
  durationMs,
  error,
}) {
  const parts = [`model=${model}`, `stream=${stream}`, `status=${status}`];

  // The single most useful field for diagnosing a cut-off reply: Gemini's
  // OWN finishReason, before it gets translated to OpenAI's vaguer
  // 'length'/'content_filter'/'stop'. 'MAX_TOKENS' means the token budget
  // ran out (raise max_tokens); 'SAFETY' or 'RECITATION' means Gemini's
  // safety system actually blocked it. Those need very different fixes —
  // this line is what tells you which one you're looking at.
  if (finishReason !== undefined) parts.push(`finishReason=${finishReason}`);

  // Token counts are only known once Gemini's response (or the final SSE
  // chunk, for streaming) has actually come back — omitted rather than
  // printed as 0/undefined when a request failed before that point.
  if (promptTokens !== undefined) parts.push(`promptTokens=${promptTokens}`);
  if (completionTokens !== undefined) parts.push(`completionTokens=${completionTokens}`);
  if (totalTokens !== undefined) parts.push(`totalTokens=${totalTokens}`);

  parts.push(`duration=${durationMs}ms`);

  if (error) {
    // Quotes so the message reads as one field when scanning the line;
    // any literal quotes in the message itself are neutralized so they
    // can't prematurely close that field.
    parts.push(`error="${String(error).replace(/"/g, "'")}"`);
  }

  const line = `[gemini] ${parts.join(' ')}`;
  if (error) console.error(line);
  else console.log(line);
}

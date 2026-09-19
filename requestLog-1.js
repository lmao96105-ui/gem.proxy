// One readable line per completed request, to stdout — Railway captures
// stdout as your deploy's logs automatically, nothing extra to configure.
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
  key,
}) {
  const parts = [`model=${model}`];
  if (key !== undefined) parts.push(`key=${key}`);
  parts.push(`stream=${stream}`, `status=${status}`);

  if (finishReason !== undefined) parts.push(`finishReason=${finishReason}`);
  if (promptTokens !== undefined) parts.push(`promptTokens=${promptTokens}`);
  if (completionTokens !== undefined) parts.push(`completionTokens=${completionTokens}`);
  if (totalTokens !== undefined) parts.push(`totalTokens=${totalTokens}`);

  parts.push(`duration=${durationMs}ms`);

  if (error) {
    parts.push(`error="${String(error).replace(/"/g, "'")}"`);
  }

  const line = `[gemini] ${parts.join(' ')}`;
  if (error) console.error(line);
  else console.log(line);
}
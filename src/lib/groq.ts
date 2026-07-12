/**
 * Thin Groq client. Groq exposes an OpenAI-compatible Chat Completions API,
 * so we just POST to it with fetch — no SDK dependency needed.
 *
 * Every AI feature in the app degrades gracefully: call `groqConfigured()`
 * first, and always keep a deterministic fallback for when the key is missing
 * or Groq is unreachable.
 */

export const GROQ_MODEL = "llama-3.3-70b-versatile";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** True when a Groq API key is present in the environment. */
export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/**
 * Run a chat completion and return the assistant's text.
 * Throws if the key is missing or Groq returns an error — callers should
 * catch and fall back to non-AI behaviour.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  { temperature = 0.4, maxTokens = 600, model = GROQ_MODEL }: ChatOptions = {}
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
    // Never cache AI responses.
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq request failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty response");
  return content.trim();
}

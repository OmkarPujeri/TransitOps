// Groq chat client (OpenAI-compatible API). Callers keep a fallback for when the key is missing.

export const GROQ_MODEL = "llama-3.3-70b-versatile";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// True when a Groq API key is present.
export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

// Returns the assistant's text; throws if the key is missing or Groq errors.
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

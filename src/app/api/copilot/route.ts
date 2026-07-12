import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildFleetSnapshot } from "@/lib/fleet-snapshot";
import { chatCompletion, groqConfigured, type ChatMessage } from "@/lib/groq";

/**
 * Copilot chat — answers questions grounded in the live fleet snapshot.
 *
 *   POST { messages: {role, content}[] }
 *   ->   { reply }  |  { error }
 *
 * The snapshot is rebuilt server-side on every request so answers always
 * reflect current data (the client never supplies fleet facts).
 */
export async function POST(req: Request) {
  if (!groqConfigured()) {
    return NextResponse.json({
      error: "AI is not configured. Add GROQ_API_KEY to .env.local to enable the copilot.",
    });
  }

  let history: ChatMessage[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.messages)) {
      history = body.messages
        .filter((m: ChatMessage) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-10); // keep the last few turns
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (history.length === 0) {
    return NextResponse.json({ error: "Ask a question to get started." }, { status: 400 });
  }

  const supabase = await createClient();
  const { text } = await buildFleetSnapshot(supabase);

  const system: ChatMessage = {
    role: "system",
    content:
      "You are TransitOps Copilot, an assistant for a fleet operations manager. " +
      "Answer using ONLY the live fleet data below. Be concise and specific — cite reg numbers, " +
      "names, and figures. Short markdown lists are fine. If the data doesn't cover the question, " +
      "say so plainly rather than guessing.\n\n=== LIVE FLEET SNAPSHOT ===\n" +
      text,
  };

  try {
    const reply = await chatCompletion([system, ...history], { temperature: 0.4, maxTokens: 700 });
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "The AI service failed. Try again.",
    });
  }
}

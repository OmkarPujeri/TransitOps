"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, AlertTriangle, Truck, Users, Route, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

type Summary = {
  vehiclesTotal: number;
  vehiclesAvailable: number;
  driversEligible: number;
  tripsActive: number;
  totalCost: number;
};

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Which vehicles are idle right now?",
  "Who can I dispatch for a 15,000 kg load?",
  "Which driver has the best safety score?",
  "What's my biggest operating cost?",
];

export function CopilotClient({ summary, configured }: { summary: Summary; configured: boolean }) {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (data.error) {
        toast.push(data.error, "error");
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${data.error}` }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch {
      toast.push("Request failed. Check your connection.", "error");
    } finally {
      setSending(false);
    }
  }

  const stats = [
    { icon: Truck, label: "Available", value: `${summary.vehiclesAvailable}/${summary.vehiclesTotal}` },
    { icon: Users, label: "Drivers ready", value: String(summary.driversEligible) },
    { icon: Route, label: "Active trips", value: String(summary.tripsActive) },
    { icon: DollarSign, label: "Total cost", value: formatCurrency(summary.totalCost) },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Live stat strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-3 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)]">
              <s.icon className="h-4 w-4 text-[var(--muted)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">{s.label}</div>
              <div className="text-sm font-semibold">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {!configured && (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          AI is not configured. Add <code className="mx-1 rounded bg-amber-100 px-1">GROQ_API_KEY</code> to
          <code className="mx-1 rounded bg-amber-100 px-1">.env.local</code> and restart the dev server.
        </div>
      )}

      {/* Chat surface */}
      <div className="card flex min-h-0 flex-1 flex-col p-0">
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Ask the fleet anything</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Grounded in your live vehicles, drivers, trips, and costs.
                </p>
              </div>
              <div className="flex max-w-md flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={!configured}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--foreground)] disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => <Bubble key={i} message={m} />)
          )}

          {sending && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Copilot is thinking…
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-[var(--border)] p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!configured || sending}
            placeholder={configured ? "Ask about vehicles, drivers, trips, costs…" : "AI not configured"}
            className="h-10 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50"
          />
          <Button type="submit" disabled={!configured || sending || !input.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--primary)] px-4 py-2.5 text-sm text-white"
            : "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-[var(--surface-2)] px-4 py-2.5 text-sm"
        }
      >
        {message.content}
      </div>
    </div>
  );
}

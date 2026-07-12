// Minimal Resend email client (fetch, no SDK). Callers keep a dry-run fallback when the key is missing.

const RESEND_URL = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { error: "RESEND_API_KEY not configured" };

  const from = process.env.RESEND_FROM || "TransitOps <onboarding@resend.dev>";

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { error: `Resend failed (${res.status}): ${detail.slice(0, 200)}` };
  }
  const data = await res.json().catch(() => ({}));
  return { id: data?.id };
}

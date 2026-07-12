import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, emailConfigured } from "@/lib/email";
import type { Driver } from "@/lib/types";

// License reminders: POST { withinDays? } -> { sent, count, drivers, dryRun } | { error }.
// Emails a digest to the ops manager; no RESEND_API_KEY = dry-run preview. Cron-friendly.
export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let withinDays = 30;
  try {
    const body = await req.json().catch(() => ({}));
    if (Number.isFinite(Number(body?.withinDays))) withinDays = Math.max(1, Number(body.withinDays));
  } catch {
    /* default */
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("drivers")
    .select("*")
    .lte("license_expiry", cutoffStr)
    .order("license_expiry");

  const drivers = (data ?? []) as Driver[];
  const flagged = drivers.map((d) => ({
    name: d.full_name,
    license: d.license_number,
    expiry: d.license_expiry,
    expired: d.license_expiry < today,
  }));

  if (flagged.length === 0) {
    return NextResponse.json({ sent: false, count: 0, drivers: [], dryRun: !emailConfigured() });
  }

  const rows = flagged
    .map(
      (f) =>
        `<tr><td style="padding:6px 10px">${f.name}</td>` +
        `<td style="padding:6px 10px;font-family:monospace">${f.license}</td>` +
        `<td style="padding:6px 10px">${f.expiry}</td>` +
        `<td style="padding:6px 10px;color:${f.expired ? "#dc2626" : "#d97706"}">${
          f.expired ? "EXPIRED" : "Expiring soon"
        }</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px">
      <h2 style="color:#4f46e5">TransitOps · License Reminders</h2>
      <p>${flagged.length} driver license(s) need attention within ${withinDays} days:</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;border:1px solid #e2e8f0">
        <thead><tr style="background:#f1f3f5;text-align:left">
          <th style="padding:6px 10px">Driver</th><th style="padding:6px 10px">License</th>
          <th style="padding:6px 10px">Expiry</th><th style="padding:6px 10px">Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#64748b;font-size:12px;margin-top:16px">Sent by TransitOps compliance monitoring.</p>
    </div>`;

  // No key → dry run: report who WOULD be emailed, without failing.
  if (!emailConfigured()) {
    return NextResponse.json({ sent: false, dryRun: true, count: flagged.length, drivers: flagged });
  }

  const result = await sendEmail({
    to: user.email!,
    subject: `${flagged.length} driver license(s) need attention`,
    html,
  });
  if (result.error) return NextResponse.json({ error: result.error });

  return NextResponse.json({ sent: true, dryRun: false, count: flagged.length, drivers: flagged });
}

import { createClient } from "@/lib/supabase/server";
import { buildFleetSnapshot } from "@/lib/fleet-snapshot";
import { groqConfigured } from "@/lib/groq";
import { PageHeader } from "@/components/page-header";
import { CopilotClient } from "./copilot-client";

export default async function CopilotPage() {
  const supabase = await createClient();
  const { summary } = await buildFleetSnapshot(supabase);

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <PageHeader
        title="AI Copilot"
        subtitle="Ask about your fleet in plain English. Answers are grounded in live data."
      />
      <CopilotClient summary={summary} configured={groqConfigured()} />
    </div>
  );
}

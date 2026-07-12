"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
type ToastCtx = { push: (message: string, tone?: Toast["tone"]) => void };

const Ctx = React.createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const push = React.useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="card flex items-center gap-2 px-4 py-3 text-sm shadow-lg"
          >
            {t.tone === "success" && <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />}
            {t.tone === "error" && <XCircle className="h-4 w-4 text-[var(--danger)]" />}
            {t.tone === "info" && <Info className="h-4 w-4 text-[var(--info)]" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

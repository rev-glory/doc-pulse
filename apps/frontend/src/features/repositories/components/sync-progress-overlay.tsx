import React from "react";

export interface LogLine {
  id: string;
  text: string;
  status: "pending" | "success" | "running" | "error";
  timestamp: string;
}

export interface SyncProgressOverlayProps {
  accountLogin?: string;
  logs: LogLine[];
  progress: number; // 0 to 100
  onSkip?: () => void;
}

export const SyncProgressOverlay: React.FC<SyncProgressOverlayProps> = ({
  accountLogin = "GitHub Account",
  logs,
  progress,
  onSkip,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md animate-fade-in p-4">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden text-zinc-100">
        {/* Background Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center">
          {/* Header */}
          <h2 className="text-xl font-bold tracking-tight">
            Connecting {accountLogin}
          </h2>
          <p className="text-sm text-zinc-400 mt-1.5 text-center">
            Synchronizing your repository tree and indexing code structures.
          </p>

          {/* Premium Circular Loader */}
          <div className="relative flex items-center justify-center w-28 h-28 my-8">
            {/* Spinning Gradient Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
            <div
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 border-r-emerald-500 animate-spin"
              style={{
                animationDuration: "1.5s",
              }}
            />
            {/* Pulsing Core */}
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-zinc-950 border border-zinc-800/80 shadow-inner">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                className="w-8 h-8 text-indigo-400 animate-pulse"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </div>

            {/* Percentage Display */}
            <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-extrabold font-mono tracking-wider text-emerald-400">
              {progress}%
            </div>
          </div>

          {/* Vercel-style Terminal Logs */}
          <div className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 font-mono text-[11px] leading-relaxed h-52 overflow-y-auto text-left shadow-inner flex flex-col gap-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5">
                <span className="text-zinc-600 select-none font-semibold">
                  {log.timestamp}
                </span>
                <span className="flex-shrink-0 mt-0.5">
                  {log.status === "success" && (
                    <span className="text-emerald-500">✓</span>
                  )}
                  {log.status === "running" && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  )}
                  {log.status === "pending" && (
                    <span className="text-zinc-700">○</span>
                  )}
                  {log.status === "error" && (
                    <span className="text-red-500">✗</span>
                  )}
                </span>
                <span
                  className={`
                  ${log.status === "success" ? "text-zinc-300" : ""}
                  ${log.status === "running" ? "text-indigo-400 font-semibold" : ""}
                  ${log.status === "pending" ? "text-zinc-600" : ""}
                  ${log.status === "error" ? "text-red-400 font-bold" : ""}
                `}
                >
                  {log.text}
                </span>
              </div>
            ))}
          </div>

          {/* Actions & Non-blocking Skip */}
          {onSkip && (
            <button
              onClick={onSkip}
              className="mt-6 text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline cursor-pointer"
            >
              Continue to dashboard in background &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

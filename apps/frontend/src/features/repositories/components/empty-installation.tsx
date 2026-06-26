import React from 'react';

export interface EmptyInstallationProps {
  onConnect: () => void;
}

export const EmptyInstallation: React.FC<EmptyInstallationProps> = ({ onConnect }) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 sm:p-12 shadow-lg max-w-4xl mx-auto my-6 animate-fade-in">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-72 h-72 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center text-center">
        {/* Animated Connection Graphic */}
        <div className="flex items-center justify-center gap-6 mb-8">
          {/* DocPulse Logo Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 dark:shadow-indigo-500/10 border border-indigo-400/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>

          {/* Glowing Pulse Connection */}
          <div className="relative flex items-center justify-center w-16">
            <span className="absolute inline-flex h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <span className="absolute inline-flex h-2 w-4 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 animate-[shimmer_1.5s_infinite]" />
          </div>

          {/* GitHub Logo Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-950 dark:bg-zinc-800 text-white shadow-xl shadow-black/20 border border-zinc-700/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="w-8 h-8" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
            </svg>
          </div>
        </div>

        {/* Text Copy */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
          Supercharge Your Code Documentation
        </h1>
        <p className="mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl leading-relaxed">
          Connect your GitHub account or organizations to start auto-generating, evaluating, and monitoring developer-friendly documentation for your codebases in real time.
        </p>

        {/* Call to Action Button */}
        <button
          onClick={onConnect}
          className="mt-8 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-98 text-white font-semibold rounded-lg shadow-md shadow-indigo-600/20 dark:shadow-none hover:shadow-lg transition-all cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Connect GitHub App
        </button>

        {/* Snyk-style security reassurances */}
        <div className="mt-12 w-full border-t border-zinc-150 dark:border-zinc-800/80 pt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">
            Security & Permission Transparency
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="flex items-start gap-2.5 text-left">
              <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Metadata Access</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Read-only permissions for repository lists, branches, and file paths.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-left">
              <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Pull Requests</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Write permissions are strictly scoped to opening PRs for documentation updates.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-left">
              <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Webhook Automation</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Receives push and PR events to keep documentation instantly synchronized.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

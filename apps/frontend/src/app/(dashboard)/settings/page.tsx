'use client';

import React, { useState } from 'react';
import { useApiQuery } from '@/lib/query/use-api-query';
import { DashboardApi } from '@/lib/api/services/dashboard.api';
import { UsersApi } from '@/lib/api/services/users.api';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';

export default function SystemSettingsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'profile' | 'system'>('profile');

  // Query 1: System configs
  const {
    data: sysSettings,
    isLoading: isSysLoading,
    error: sysError,
    refetch: refetchSys,
  } = useApiQuery({
    queryKey: ['dashboard', 'settings'],
    queryFn: DashboardApi.getSettings,
  });

  // Query 2: User profile
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useApiQuery({
    queryKey: ['users', 'profile'],
    queryFn: UsersApi.getUserProfile,
  });

  // Query 3: User settings
  const {
    data: userPrefs,
    isLoading: isPrefsLoading,
    error: prefsError,
    refetch: refetchPrefs,
  } = useApiQuery({
    queryKey: ['users', 'settings'],
    queryFn: UsersApi.getUserSettings,
  });

  // Form states
  const [displayName, setDisplayName] = useState<string>('');
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [emailAlerts, setEmailAlerts] = useState<boolean>(true);

  // Status banners
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state flags
  const [profileInitialized, setProfileInitialized] = useState(false);
  if (profile && !profileInitialized) {
    setDisplayName(profile.displayName || '');
    setProfileInitialized(true);
  }

  const [prefsInitialized, setPrefsInitialized] = useState(false);
  if (userPrefs && !prefsInitialized) {
    setTheme(userPrefs.theme || 'system');
    setEmailAlerts(userPrefs.notifications?.email ?? true);
    setPrefsInitialized(true);
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setProfileSuccess(false);
    try {
      await UsersApi.updateUserProfile({ displayName: displayName || null });
      setProfileSuccess(true);
      refetchProfile();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update profile.');
    }
  };

  const handleUpdatePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setPrefsSuccess(false);
    try {
      await UsersApi.updateUserSettings({
        theme,
        notifications: { email: emailAlerts },
        ai: { provider: 'openai' }, // backend defaults
      });
      setPrefsSuccess(true);
      refetchPrefs();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update settings.');
    }
  };

  if (isSysLoading || isProfileLoading || isPrefsLoading) {
    return (
      <div>
        <PageHeader title="System Settings" />
        <LoadingState message="Loading configuration metadata..." rows={6} />
      </div>
    );
  }

  if (sysError || profileError || prefsError) {
    const errorMsg =
      sysError?.message || profileError?.message || prefsError?.message || 'Failed to retrieve settings parameters.';
    return (
      <div>
        <PageHeader title="System Settings" />
        <ErrorState
          message={errorMsg}
          retry={() => {
            refetchSys();
            refetchProfile();
            refetchPrefs();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="System Settings"
        description="Configure your personal preferences, notification endpoints, and view active environment stats."
      />

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-100'
          }`}
        >
          Profile & Preferences
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'system'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-100'
          }`}
        >
          System Configuration
        </button>
      </div>

      {formError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300 rounded-lg text-xs font-medium">
          ⚠️ {formError}
        </div>
      )}

      {activeTab === 'profile' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl items-start">
          {/* User Profile Form */}
          <SectionCard title="User Profile" description="Your personal identity on DocPulse.">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {profileSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-bold">
                  ✓ Profile updated successfully!
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">GitHub Username</label>
                <input
                  type="text"
                  value={`@${profile?.githubLogin}`}
                  disabled
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-400 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  placeholder="Enter display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-xs rounded-lg shadow-sm transition-all"
              >
                Save Profile
              </button>
            </form>
          </SectionCard>

          {/* User Preferences Form */}
          <SectionCard title="Notification & Theme Preferences" description="Manage email alerts, visual styles, and engine models.">
            <form onSubmit={handleUpdatePrefs} className="space-y-5 text-xs">
              {prefsSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-bold">
                  ✓ Preferences updated successfully!
                </div>
              )}

              {/* Theme preference */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Appearance Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="w-full p-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                >
                  <option value="system">Follow System Settings</option>
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>

              {/* AI Engine Model - Gemini Current */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active AI Engine</label>
                <input
                  type="text"
                  value="Gemini (Current)"
                  disabled
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-500 font-bold"
                />
                <span className="block text-[10px] text-zinc-400">
                  Google Gemini API is the active language model. Exposing alternative AI nodes is currently locked.
                </span>
              </div>

              {/* Email Alerts preference */}
              <div className="flex items-center gap-3 py-2 border-t border-b border-zinc-100 dark:border-zinc-850">
                <input
                  id="emailAlerts"
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 bg-zinc-100 border-zinc-300 focus:ring-emerald-500"
                />
                <div>
                  <label htmlFor="emailAlerts" className="font-bold text-zinc-800 dark:text-zinc-200 block cursor-pointer">
                    Enable email notification alerts
                  </label>
                  <span className="block text-[10px] text-zinc-400">
                    Receive diagnostic messages when human reviews require attention.
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-xs rounded-lg shadow-sm transition-all"
              >
                Save Preferences
              </button>
            </form>
          </SectionCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
          {/* General Configs */}
          <SectionCard title="General Workspace" description="Defaults for user session and interface.">
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">Application Mode</span>
                <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-bold">
                  DEVELOPMENT
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">Default Branch fallback</span>
                <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                  {sysSettings?.general.defaultBranch}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Model Configs */}
          <SectionCard title="AI Models" description="Google Gemini model configuration.">
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">Active Model</span>
                <span className="font-mono bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded font-bold">
                  {sysSettings?.models.activeModel}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">Model Temperature</span>
                <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                  {sysSettings?.models.temperature}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Workflow Configs */}
          <SectionCard title="Orchestration Workflow" description="LangGraph pipeline trigger points.">
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">Trigger Event</span>
                <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300 uppercase font-bold">
                  {sysSettings?.workflow.triggerEvent}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">GitHub App ID</span>
                <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                  {sysSettings?.workflow.appId}
                </span>
              </div>
              <div className="py-2.5">
                <span className="block font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Webhook Target URL</span>
                <span className="block font-mono bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 break-all select-all">
                  {sysSettings?.workflow.webhookUrl}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Performance Configs */}
          <SectionCard title="Resource & Performance" description="Background consumer limits.">
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">BullMQ Concurrency Bound</span>
                <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-bold">
                  {sysSettings?.performance.concurrencyLimit} active jobs
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">Node Max Retries</span>
                <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-bold">
                  {sysSettings?.performance.retryLimit} attempts
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

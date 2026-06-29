'use client';

import React, { useState } from 'react';
import { useApiQuery } from '@/lib/query/use-api-query';
import { DashboardApi } from '@/lib/api/services/dashboard.api';
import { UsersApi } from '@/lib/api/services/users.api';
import { GitHubApi } from '@/lib/api/services/github.api';
import { RepositoryApi, type ConnectRepositoryDto } from '@/lib/api/services/repository.api';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';

export default function SystemSettingsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'connect'>('profile');

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

  // Query 4: GitHub installations (for connect form)
  const {
    data: installations,
    isLoading: isInstLoading,
  } = useApiQuery({
    queryKey: ['github', 'installations'],
    queryFn: GitHubApi.getInstallations,
  });

  // Form states — Profile
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

  // Connect repository form state
  const [connectInstallationId, setConnectInstallationId] = useState('');
  const [connectOwner, setConnectOwner] = useState('');
  const [connectRepoName, setConnectRepoName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

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

  const handleConnectRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectError(null);
    setConnectSuccess(null);
    setIsConnecting(true);

    const dto: ConnectRepositoryDto = {
      installationId: connectInstallationId,
      owner: connectOwner.trim(),
      repositoryName: connectRepoName.trim(),
    };

    try {
      const result = await RepositoryApi.connectRepository(dto);
      setConnectSuccess(`✓ Repository "${result.fullName}" connected successfully!`);
      setConnectOwner('');
      setConnectRepoName('');
    } catch (err: any) {
      setConnectError(err?.message || 'Failed to connect repository.');
    } finally {
      setIsConnecting(false);
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
        {(
          [
            { key: 'profile', label: 'Profile & Preferences' },
            { key: 'connect', label: 'Connect Repository' },
            { key: 'system', label: 'System Configuration' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {formError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300 rounded-lg text-xs font-medium">
          ⚠️ {formError}
        </div>
      )}

      {/* ── Profile Tab ── */}
      {activeTab === 'profile' && (
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

              {profile?.githubAvatarUrl && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">GitHub Avatar</label>
                  <div className="flex items-center gap-3">
                    <img
                      src={profile.githubAvatarUrl}
                      alt={profile.githubLogin}
                      className="w-12 h-12 rounded-full border-2 border-zinc-200 dark:border-zinc-700"
                    />
                    <span className="text-xs text-zinc-500">Profile photo synced from GitHub</span>
                  </div>
                </div>
              )}

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

              {profile?.email && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email</label>
                  <input
                    type="text"
                    value={profile.email}
                    disabled
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-400 font-mono"
                  />
                </div>
              )}

              <div className="space-y-1.5 text-xs text-zinc-400">
                <span>Member since: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}</span>
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
                  value={sysSettings?.models?.activeModel || 'Gemini (Current)'}
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

              {/* Current preference summary */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Current Theme</span>
                  <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase">{userPrefs?.theme || 'system'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Email Alerts</span>
                  <span className={`font-bold ${userPrefs?.notifications?.email ? 'text-emerald-600' : 'text-zinc-400'}`}>
                    {userPrefs?.notifications?.email ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">AI Provider</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{userPrefs?.ai?.provider || '—'}</span>
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
      )}

      {/* ── Connect Repository Tab ── */}
      {activeTab === 'connect' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl items-start">
          <SectionCard title="Connect a Repository" description="Manually connect a specific GitHub repository to DocPulse using POST /repositories/connect.">
            <form onSubmit={handleConnectRepository} className="space-y-5 text-xs">
              {connectSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300 rounded font-bold">
                  {connectSuccess}
                </div>
              )}
              {connectError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300 rounded">
                  ⚠️ {connectError}
                </div>
              )}

              {/* Installation select */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  GitHub App Installation
                </label>
                {isInstLoading ? (
                  <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-400 animate-pulse">
                    Loading installations…
                  </div>
                ) : (
                  <select
                    value={connectInstallationId}
                    onChange={(e) => {
                      setConnectInstallationId(e.target.value);
                      // Auto-fill owner from selected installation
                      const inst = installations?.find((i) => i.id === e.target.value);
                      if (inst) setConnectOwner(inst.accountLogin);
                    }}
                    required
                    className="w-full p-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select an installation…</option>
                    {(installations || []).map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.accountLogin} ({inst.accountType}) — ID: {inst.installationId}
                      </option>
                    ))}
                  </select>
                )}
                {(!installations || installations.length === 0) && !isInstLoading && (
                  <p className="text-zinc-400 italic">
                    No installations found.{' '}
                    <a
                      href="https://github.com/apps/docpulse-test-app/installations/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline font-bold"
                    >
                      Install GitHub App →
                    </a>
                  </p>
                )}
              </div>

              {/* Owner */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Repository Owner (GitHub username / org)
                </label>
                <input
                  type="text"
                  value={connectOwner}
                  onChange={(e) => setConnectOwner(e.target.value)}
                  placeholder="e.g. octocat"
                  required
                  className="w-full p-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Repository name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={connectRepoName}
                  onChange={(e) => setConnectRepoName(e.target.value)}
                  placeholder="e.g. my-project"
                  required
                  className="w-full p-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
                {connectOwner && connectRepoName && (
                  <span className="text-zinc-400 text-[10px]">
                    Will connect: <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{connectOwner}/{connectRepoName}</span>
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isConnecting || !connectInstallationId}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition-all"
              >
                {isConnecting ? 'Connecting…' : '→ Connect Repository'}
              </button>
            </form>
          </SectionCard>

          {/* Info sidebar */}
          <SectionCard title="About Manual Connection" description="When to use this form.">
            <div className="space-y-4 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <p>
                The automatic sync (<strong className="text-zinc-800 dark:text-zinc-200">Sync Repositories</strong> on the Repositories page) fetches
                all repos accessible to a GitHub App installation in bulk.
              </p>
              <p>
                Use this form to connect a <strong className="text-zinc-800 dark:text-zinc-200">single specific repository</strong> by name, useful when:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>You only want to monitor one repo from a large org</li>
                <li>The bulk sync missed a newly created repo</li>
                <li>You want to re-connect a previously deleted repository</li>
              </ul>
              <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded">
                <span className="font-mono text-[10px] text-zinc-500">POST /api/repositories/connect</span>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── System Config Tab ── */}
      {activeTab === 'system' && (
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

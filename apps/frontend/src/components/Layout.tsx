import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, Bell, Bot, Crown, LifeBuoy, LogOut, Settings, Sparkles, Trophy } from 'lucide-react';
import { api } from '../lib/api';
import type { Guild, User } from '../lib/types';

type Props = {
  user: User;
  guilds: Guild[];
  selectedGuildId?: string;
  onSelectGuild: (guildId: string) => void;
};

const navItems = [
  { to: 'settings', label: 'Settings', icon: Settings },
  { to: 'moderation', label: 'Moderation', icon: Activity },
  { to: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: 'tickets', label: 'Tickets', icon: LifeBuoy },
  { to: 'announcements', label: 'Announcements', icon: Bell },
  { to: 'analytics', label: 'Analytics', icon: BarChart3 },
  { to: 'embed-builder', label: 'Embed Builder', icon: Sparkles }
];

export function Layout({ user, guilds, selectedGuildId, onSelectGuild }: Props) {
  const navigate = useNavigate();

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    navigate('/');
  }

  return (
    <div className="min-h-screen text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-slate-950/80 p-5 backdrop-blur md:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-500 p-2"><Bot /></div>
          <div>
            <p className="font-bold">Server Manager</p>
            <p className="text-xs text-slate-400">Discord bot dashboard</p>
          </div>
        </div>

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Server</label>
        <select
          value={selectedGuildId ?? ''}
          onChange={(event) => onSelectGuild(event.target.value)}
          className="mb-6 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white"
        >
          {guilds.map((guild) => <option value={guild.id} key={guild.id}>{guild.name}</option>)}
        </select>

        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm"><Crown size={16} /> {user.username}</div>
          <button onClick={logout} className="mt-3 flex items-center gap-2 text-sm text-slate-400 hover:text-white"><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      <main className="p-4 md:ml-72 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

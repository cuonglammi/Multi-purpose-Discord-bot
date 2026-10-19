import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { api } from './lib/api';
import type { Guild, User } from './lib/types';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Moderation from './pages/Moderation';
import Leaderboard from './pages/Leaderboard';
import Analytics from './pages/Analytics';
import EmbedBuilder from './pages/EmbedBuilder';
import Tickets from './pages/Tickets';
import Announcements from './pages/Announcements';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const me = await api<User>('/api/auth/me');
        const serverList = await api<Guild[]>('/api/guilds');
        setUser(me);
        setGuilds(serverList);
        setSelectedGuildId((current) => current ?? serverList[0]?.id);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const selectedGuild = useMemo(() => guilds.find((guild) => guild.id === selectedGuildId), [guilds, selectedGuildId]);

  function selectGuild(guildId: string) {
    setSelectedGuildId(guildId);
    navigate('/dashboard/settings');
  }

  if (loading) return <div className="grid min-h-screen place-items-center text-white">Loading dashboard...</div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard/settings" replace /> : <Login />} />
      <Route
        path="/dashboard"
        element={
          user ? (
            <Layout user={user} guilds={guilds} selectedGuildId={selectedGuildId} onSelectGuild={selectGuild} />
          ) : <Navigate to="/" replace />
        }
      >
        <Route index element={<Navigate to="settings" replace />} />
        <Route path="settings" element={<Settings guild={selectedGuild} />} />
        <Route path="moderation" element={<Moderation guild={selectedGuild} />} />
        <Route path="leaderboard" element={<Leaderboard guild={selectedGuild} />} />
        <Route path="tickets" element={<Tickets guild={selectedGuild} />} />
        <Route path="announcements" element={<Announcements guild={selectedGuild} />} />
        <Route path="analytics" element={<Analytics guild={selectedGuild} />} />
        <Route path="embed-builder" element={<EmbedBuilder guild={selectedGuild} />} />
      </Route>
    </Routes>
  );
}

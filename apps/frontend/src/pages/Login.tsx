import { Bot, ShieldCheck, Sparkles } from 'lucide-react';
import { discordLoginUrl } from '../lib/api';
import { Card } from '../components/Card';

export default function Login() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-white">
      <Card className="max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-500 p-3"><Bot size={32} /></div>
          <div>
            <h1 className="text-3xl font-black">Discord Server Manager</h1>
            <p className="text-slate-400">Configure your bot from a clean admin dashboard.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-950/60 p-4"><ShieldCheck className="mb-3" /><h2 className="font-bold">Admin-only</h2><p className="text-sm text-slate-400">Only servers where you have Administrator are shown.</p></div>
          <div className="rounded-2xl bg-slate-950/60 p-4"><Sparkles className="mb-3" /><h2 className="font-bold">Modern slash commands</h2><p className="text-sm text-slate-400">Moderation, tickets, XP, logging, and more.</p></div>
          <div className="rounded-2xl bg-slate-950/60 p-4"><Bot className="mb-3" /><h2 className="font-bold">Full product</h2><p className="text-sm text-slate-400">Bot, REST API, database, and frontend.</p></div>
        </div>

        <a href={discordLoginUrl()} className="mt-8 inline-flex rounded-xl bg-indigo-500 px-5 py-3 font-bold hover:bg-indigo-400">Login with Discord</a>
      </Card>
    </main>
  );
}

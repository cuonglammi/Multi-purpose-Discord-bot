import { useEffect, useState } from 'react';
import { Card, CardTitle } from '../components/Card';
import { api, transcriptUrl } from '../lib/api';
import type { Guild } from '../lib/types';

type Ticket = {
  id: string;
  channelId?: string | null;
  openerId: string;
  status: 'OPEN' | 'CLOSED';
  closedById?: string | null;
  createdAt: string;
  closedAt?: string | null;
  transcriptHtml?: string | null;
};

export default function Tickets({ guild }: { guild?: Guild }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (!guild) return;
    void api<Ticket[]>(`/api/guilds/${guild.id}/tickets`).then(setTickets);
  }, [guild]);

  if (!guild) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><p className="text-sm uppercase tracking-wide text-indigo-300">{guild.name}</p><h1 className="text-3xl font-black text-white">Tickets</h1></div>
      <Card>
        <CardTitle>Recent tickets</CardTitle>
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-xl bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">Ticket {ticket.id.slice(0, 8)}</p>
                  <p className="text-sm text-slate-400">Opened by {ticket.openerId} • {new Date(ticket.createdAt).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${ticket.status === 'OPEN' ? 'bg-green-500/20 text-green-200' : 'bg-slate-500/20 text-slate-200'}`}>{ticket.status}</span>
              </div>
              {ticket.transcriptHtml && <a className="mt-3 inline-block text-sm font-semibold text-indigo-300 hover:text-indigo-200" href={transcriptUrl(guild.id, ticket.id)} target="_blank" rel="noreferrer">Open transcript</a>}
            </div>
          ))}
          {!tickets.length && <p className="text-slate-400">No tickets yet. Members can open one with /ticket open.</p>}
        </div>
      </Card>
    </div>
  );
}

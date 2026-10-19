# Multi-purpose Discord Server Management Bot + Dashboard

A full-stack Discord management product:

- **Backend:** TypeScript, Discord.js v14, Express, Prisma ORM, PostgreSQL
- **Frontend:** React, TypeScript, Vite, TailwindCSS, Recharts
- **Auth:** Discord OAuth2 dashboard login
- **Hosting target:** Railway for API/bot/PostgreSQL, Vercel for dashboard

## Features included

### Bot MVP

- Slash commands only: `/warn`, `/kick`, `/ban`, `/timeout`, `/rank`, `/leaderboard`, `/ticket open`, `/ticket close`, `/ping`
- Welcome/goodbye messages with configurable channel/message
- Auto-role on member join
- Moderation actions with best-effort DM notifications
- Message edit/delete logging to configurable log channel

### Extras scaffolded/implemented

- XP/leveling system with cooldowns and generated SVG rank cards
- Ticket channels, message capture, close flow, HTML transcript stored in DB
- Anti-spam with configurable thresholds and timeout duration
- Scheduled announcements runner
- Dashboard live-ish activity feed via polling
- Leaderboard
- Analytics charts for member snapshots and command usage
- Dashboard embed builder that can send embeds to Discord channels

## Discord setup

1. Create an application in the Discord Developer Portal.
2. Create a bot and copy the token.
3. Enable these privileged gateway intents for the bot:
   - Server Members Intent
   - Message Content Intent
4. Add OAuth2 redirect URL:

```txt
http://localhost:3001/api/auth/callback
```

5. Invite the bot with scopes:

```txt
bot applications.commands
```

Recommended permissions for testing: Administrator. For production, narrow it to the actions you use: Manage Roles, Kick Members, Ban Members, Moderate Members, Manage Channels, Send Messages, View Channels, Read Message History.

## Local development

```bash
# 1) Start PostgreSQL
cd discord-server-management-bot
docker compose up -d

# 2) Install deps
npm install

# 3) Configure backend env
cp .env apps/backend/.env
# edit apps/backend/.env with your Discord app credentials

# 4) Create DB tables
npm run db:generate
npm run db:migrate

# 5) Register slash commands
npm run commands:register

# 6) Run bot/API + dashboard
npm run dev
```

Open the dashboard at:

```txt
http://localhost:5173
```

Backend API runs at:

```txt
http://localhost:3001
```

## Production deployment notes

### Railway

Deploy `apps/backend` as the service root. Add a Railway PostgreSQL database and set:

- `DATABASE_URL`
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI=https://your-railway-domain/api/auth/callback`
- `FRONTEND_URL=https://your-vercel-domain`
- `COOKIE_SECRET`
- `NODE_ENV=production`

Run migration during deploy or manually:

```bash
npm run prisma:migrate:deploy -w apps/backend
```

### Vercel

Deploy `apps/frontend` as the project root. Set:

```txt
VITE_API_URL=https://your-railway-domain
```

## Security notes

This is a strong portfolio MVP, not a hardened SaaS yet. Before real production use:

- Encrypt OAuth access/refresh tokens at rest.
- Add CSRF protection for dashboard mutations.
- Add API rate limiting.
- Add audit logs for dashboard config changes.
- Restrict bot permissions instead of using Administrator.
- Move transcript exports to object storage if they get large.

## Project structure

```txt
apps/backend
  prisma/schema.prisma
  src/api         Express routes and auth
  src/discord    Discord event and slash command handlers
  src/jobs       scheduled announcement runner
  src/lib        shared Discord/Prisma/config helpers
  src/services   XP, tickets, logging, permissions

apps/frontend
  src/pages      dashboard screens
  src/components shared UI
  src/lib        API client/types
```

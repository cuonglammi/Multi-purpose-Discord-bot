export type User = {
  id: string;
  username: string;
  avatar?: string | null;
};

export type Guild = {
  id: string;
  name: string;
  icon?: string | null;
  botPresent: boolean;
};

export type Channel = {
  id: string;
  name: string;
  type: number;
};

export type Role = {
  id: string;
  name: string;
  position: number;
};

export type GuildConfig = {
  id: string;
  guildId: string;
  welcomeChannelId?: string | null;
  welcomeMessage: string;
  goodbyeChannelId?: string | null;
  goodbyeMessage: string;
  autoRoleId?: string | null;
  logChannelId?: string | null;
  antiSpamEnabled: boolean;
  antiSpamMaxMessages: number;
  antiSpamWindowSeconds: number;
  antiSpamTimeoutSeconds: number;
  xpEnabled: boolean;
  xpCooldownSeconds: number;
  xpMin: number;
  xpMax: number;
};

export type ModerationAction = {
  id: string;
  guildId: string;
  targetId: string;
  moderatorId: string;
  type: 'WARN' | 'KICK' | 'BAN' | 'TIMEOUT';
  reason: string;
  durationSeconds?: number | null;
  createdAt: string;
};

export type Member = {
  id: string;
  guildId: string;
  userId: string;
  username?: string | null;
  xp: number;
  level: number;
  messages: number;
};

export type ActivityItem = {
  kind: 'moderation' | 'command' | 'warning' | 'ticket';
  at: string;
  item: Record<string, unknown>;
};

export type AnalyticsPayload = {
  snapshots: { id: string; memberCount: number; createdAt: string }[];
  commandUsage: { commandName: string; count: number }[];
};

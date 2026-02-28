function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeToken(value: unknown) {
  return toStringValue(value).trim().toLowerCase();
}

export function normalizePlayerIdentity(value: unknown) {
  return normalizeToken(value).replace(/\s+/g, " ");
}

export function createResultIdentityKey(input: {
  player?: unknown;
  userName?: unknown;
  userId?: unknown;
  id?: unknown;
}) {
  const playerKey = normalizePlayerIdentity(input.player ?? input.userName);
  if (playerKey) return `player:${playerKey}`;

  const userKey = normalizeToken(input.userId);
  if (userKey) return `user:${userKey}`;

  const rowKey = normalizeToken(input.id);
  return rowKey ? `row:${rowKey}` : "";
}

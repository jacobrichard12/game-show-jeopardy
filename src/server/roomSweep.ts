// When an idle room is deleted (server.ts sweeps every 30 minutes). Rooms
// live only in memory, so this is all that ends a game short of a restart.
//
// A game can sit idle for hours between sessions (e.g. a conference that
// plays in the morning and again in the evening), so:
//  - a room with any screen still connected is never swept, and
//  - otherwise it survives a full day with no host action or join.
export const ROOM_IDLE_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SWEEP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function shouldSweepRoom(lastActivity: number, now: number, connectedSockets: number): boolean {
  if (connectedSockets > 0) return false;
  return now - lastActivity > ROOM_IDLE_MS;
}

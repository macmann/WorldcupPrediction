export const config = {
  jwtSecret: process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET ?? "dev-only-change-me",
  tournamentStartTime: new Date(process.env.TOURNAMENT_START_TIME ?? "2026-06-11T00:00:00.000Z"),
  footballApiBaseUrl: process.env.FOOTBALL_API_BASE_URL ?? "https://api.football-data.org/v4",
  footballApiKey: process.env.FOOTBALL_API_KEY ?? "",
  wc2026ApiBaseUrl: process.env.WC2026_API_BASE_URL ?? "https://api.wc2026api.com",
  wc2026ApiKey: process.env.WC2026_API_KEY ?? "",
  worldCupCompetitionCode: process.env.WORLD_CUP_COMPETITION_CODE ?? "WC",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379"
};

export const GLOBAL_LEAGUE_NAME = "Global World Cup Standings";
export const GLOBAL_LEAGUE_CODE = "GLOBAL26";

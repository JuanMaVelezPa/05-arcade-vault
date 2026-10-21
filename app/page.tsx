import HomeLanding from "@/components/HomeLanding";
import { getCurrentUser } from "@/lib/auth";
import { getGames, getRecentScores, getTopPlayers } from "@/lib/catalog";
import { formatTimeAgo } from "@/lib/format";

export default async function HomePage() {
  const [games, user, recent, topPlayers] = await Promise.all([
    getGames(),
    getCurrentUser(),
    getRecentScores(7),
    getTopPlayers(5),
  ]);
  // Computed here, not in the client component, so server and client markup match
  const now = new Date();
  return (
    <HomeLanding
      games={games}
      user={user}
      recent={recent.map((r) => ({
        ...r,
        ago: formatTimeAgo(r.createdAt, now),
      }))}
      topPlayers={topPlayers}
    />
  );
}

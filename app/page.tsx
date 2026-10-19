import HomeLanding from "@/components/HomeLanding";
import { getCurrentUser } from "@/lib/auth";
import { getGames } from "@/lib/catalog";

export default async function HomePage() {
  const [games, user] = await Promise.all([getGames(), getCurrentUser()]);
  return <HomeLanding games={games} user={user} />;
}

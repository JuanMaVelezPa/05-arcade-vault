import HomeLanding from "@/components/HomeLanding";
import { getGames } from "@/lib/catalog";

export default async function HomePage() {
  const games = await getGames();
  return <HomeLanding games={games} />;
}

import GamesBrowser from "@/components/GamesBrowser";
import { getGames } from "@/lib/catalog";

export default async function GamesPage() {
  const games = await getGames();
  return <GamesBrowser games={games} />;
}

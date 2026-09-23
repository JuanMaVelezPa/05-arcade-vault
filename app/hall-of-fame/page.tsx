import { getGames } from "@/lib/catalog";

import HallOfFameClient from "./HallOfFameClient";

export default async function HallOfFamePage() {
  const games = await getGames();
  return <HallOfFameClient games={games} />;
}

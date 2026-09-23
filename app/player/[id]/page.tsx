import { notFound } from "next/navigation";
import GamePlayer from "@/components/GamePlayer";
import { getGame } from "@/lib/catalog";

export default async function GamePlayerPage({ params }: PageProps<"/player/[id]">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}

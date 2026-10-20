import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GamePlayer from "@/components/GamePlayer";
import { getCurrentUser } from "@/lib/auth";
import { getGame } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: PageProps<"/player/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) return { title: "Game not found · Arcade Vault" };
  return { title: `Play ${game.title} · Arcade Vault` };
}

export default async function GamePlayerPage({
  params,
}: PageProps<"/player/[id]">) {
  const { id } = await params;
  const [game, user] = await Promise.all([getGame(id), getCurrentUser()]);
  if (!game) notFound();

  return <GamePlayer game={game} username={user?.username ?? null} />;
}

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ClassificationResult } from "@/types/classification";

export async function insertGames(
  slug: string,
  game_name: string,
  gameLink: string,
  reply: ClassificationResult,
  thumbnail: string | null,
) {
  const { error } = await supabaseAdmin.from("games").insert({
    canonical_slug: slug,
    game_name: game_name,
    game_image: thumbnail,
    game_links: [gameLink],
    game_title: reply.game_title,
    classification_accurateness: reply.classification_accurateness,
    classification_code: reply.classification_code,
    extra_explanation: reply.extra_explanation,
  });

  if (error) {
    console.error("Supabase insertGames error:", error.message);
    throw new Error("Failed to insert game to database");
  }
}

export async function appendLinkGame(slug: string, gameLink: string) {
  const { error } = await supabaseAdmin.rpc("append_game_link", {
    input_slug: slug,
    new_link: gameLink,
  });

  if (error) {
    console.error("appendLinkGame error:", error.message);
    throw new Error("Failed to append game link");
  }
}

export async function getGames(
  slug: string,
): Promise<ClassificationResult | null> {
  const { data, error } = await supabaseAdmin
    .from("games")
    .select(
      `
      game_title,
      classification_accurateness,
      classification_code,
      extra_explanation
    `,
    )
    .eq("canonical_slug", slug)
    .maybeSingle(); // safer than .single()

  // Handle Supabase error
  if (error) {
    console.error("Supabase getGames error:", error.message);
    throw new Error("Failed to fetch game from database");
  }

  // No data found → return null
  if (!data) {
    return null;
  }

  return data;
}

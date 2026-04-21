import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSystemInstruction } from "@/utils/getSystemInstruction";
import { generateSlug } from "@/utils/generateSlug";
import { getGames, insertGames } from "./supabase.updateGames";
import { ClassificationResult } from "@/types/classification";
import { validateSteamUrl } from "@/utils/validateSteamUrl";
import { getThumbnail } from "./steam.getThumbnail";

// Define the expected shape of the request body to avoid implicit 'any'
interface ChatRequestBody {
  game_name: string;
  game_link: string;
}

export async function POST(request: NextRequest) {
  try {
    // Safely parse the JSON body
    const body = (await request.json()) as ChatRequestBody;
    const { game_name, game_link } = body;

    if (!game_name || !game_link) {
      return NextResponse.json(
        { error: "Game name and link are required." },
        { status: 400 },
      );
    }

    if (!validateSteamUrl(game_link).isValid) {
      return NextResponse.json(
        { error: "Invalid Steam URL." },
        { status: 400 },
      );
    }

    const slug = generateSlug(game_name);

    const existingGame = await getGames(slug);
    if (existingGame) {
      //Still not having append
      return NextResponse.json(existingGame);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }

    // Initialize the Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      // Gemini supports system instructions directly in the model initialization
      systemInstruction: getSystemInstruction(),
    });

    // Generate the completion with a strict token limit matching your original code
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: `Game Title: ${game_name} (${game_link})` }],
        },
      ],
    });

    const rawText = await result.response.text();

    // Step 1: parse the outer string into object
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      console.error("Failed to parse AI response:", rawText, err);
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 500 },
      );
    }

    // Step 2: validate shape (IMPORTANT)
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("game_title" in parsed)
    ) {
      console.error("Unexpected structure:", parsed);
      return NextResponse.json(
        { error: "Unexpected AI response structure" },
        { status: 500 },
      );
    }

    // Step 3: cast safely
    const reply = parsed as ClassificationResult;

    const thumbnail = await getThumbnail(game_link);

    insertGames(slug, game_name, game_link, reply, thumbnail);

    return NextResponse.json(reply);
  } catch (error: unknown) {
    // Type-safe error handling to avoid ESLint 'any' warnings
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Gemini error:", errorMessage);

    return NextResponse.json(
      { error: "Chat completion failed." },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { getSystemInstruction } from "@/utils/getSystemInstruction";
import { generateSlug } from "@/utils/generateSlug";
import { validateSteamUrl } from "@/utils/validateSteamUrl";

import { getGames, insertGames } from "./supabase.updateGames";
import { getThumbnail } from "./steam.getThumbnail";

import { ClassificationResult } from "@/types/classification";

/**
 * Expected request payload structure
 */
interface CreateGameRequest {
  game_name: string;
  game_link: string;
}

/**
 * Entry point for POST /api/...
 */
export async function POST(request: NextRequest) {
  try {
    const { game_name, game_link } = await parseAndValidateRequest(request);

    const slug = generateSlug(game_name);

    const existingGame = await findExistingGame(slug);
    if (existingGame) {
      return NextResponse.json(existingGame);
    }

    const aiResponse = await generateGameClassification(game_name, game_link);

    const thumbnail = await getThumbnail(game_link);

    await persistGame({
      slug,
      gameName: game_name,
      gameLink: game_link,
      classification: aiResponse,
      thumbnail,
    });

    return NextResponse.json(aiResponse);
  } catch (error: unknown) {
    return handleErrorResponse(error);
  }
}

/**
 * Parse and validate incoming request
 */
async function parseAndValidateRequest(
  request: NextRequest,
): Promise<CreateGameRequest> {
  const body = (await request.json()) as CreateGameRequest;
  const { game_name, game_link } = body;

  if (!game_name || !game_link) {
    throw new HttpError(400, "Game name and link are required.");
  }

  const validationResult = await validateSteamUrl(game_link);

  if (!validationResult.isValid) {
    throw new HttpError(400, validationResult.error);
  }

  return { game_name, game_link };
}

/**
 * Check if game already exists
 */
async function findExistingGame(slug: string) {
  return getGames(slug);
}

/**
 * Generate classification using Gemini
 */
async function generateGameClassification(
  gameName: string,
  gameLink: string,
): Promise<ClassificationResult> {
  const apiKey = getRequiredEnv("GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    systemInstruction: getSystemInstruction(),
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: `Game Title: ${gameName} (${gameLink})` }],
      },
    ],
  });

  const rawText = await result.response.text();

  return parseAndValidateAIResponse(rawText);
}

/**
 * Parse AI response and validate structure
 */
function parseAndValidateAIResponse(rawText: string): ClassificationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    console.error("Failed to parse AI response:", rawText, error);
    throw new HttpError(500, "Invalid AI response format");
  }

  if (!isValidClassification(parsed)) {
    console.error("Unexpected structure:", parsed);
    throw new HttpError(500, "Unexpected AI response structure");
  }

  return parsed;
}

/**
 * Type guard for ClassificationResult
 */
function isValidClassification(data: unknown): data is ClassificationResult {
  return typeof data === "object" && data !== null && "game_title" in data;
}

/**
 * Persist game into database
 */
async function persistGame(params: {
  slug: string;
  gameName: string;
  gameLink: string;
  classification: ClassificationResult;
  thumbnail: string | null;
}) {
  const { slug, gameName, gameLink, classification, thumbnail } = params;

  // Intentionally not awaited in original logic — preserved behavior?
  return insertGames(slug, gameName, gameLink, classification, thumbnail);
}

/**
 * Ensure required environment variables exist
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} environment variable is missing.`);
  }

  return value;
}

/**
 * Standardized error response handling
 */
function handleErrorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "An unknown error occurred";

  const status = error instanceof HttpError ? error.statusCode : 500;

  console.error("API Error:", message);

  return NextResponse.json({ error: message }, { status });
}

/**
 * Custom error type for controlled HTTP responses
 */
class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

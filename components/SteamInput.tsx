"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { validateSteamUrl } from "../utils/validateSteamUrl";
import type { ClassificationResult } from "@/types/classification";
import Image from "next/image";

interface GameSearchResult {
  game_name: string;
  game_image: string | null;
  canonical_slug: string;
}

interface Props {
  onResult: (data: ClassificationResult) => void;
  onLoading: (loading: boolean) => void;
  onError: (message: string) => void;
  onDropdownOpenChange?: (open: boolean) => void;
}

export default function SteamInput({
  onResult,
  onLoading,
  onError,
  onDropdownOpenChange, // ✅ add this
}: Props) {
  const [value, setValue] = useState<string>("");

  // 🔹 Search states
  const [debouncedValue, setDebouncedValue] = useState<string>("");
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [selectedGame, setSelectedGame] = useState<GameSearchResult | null>(
    null,
  );

  // ----------------------------------
  // 1. Debounce input
  // ----------------------------------
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, 700); // 500–1000ms is optimal

    return () => clearTimeout(timeout);
  }, [value]);

  // ----------------------------------
  // 2. Search from Supabase
  // ----------------------------------
  useEffect(() => {
    const searchGames = async () => {
      // Avoid useless queries
      if (!debouncedValue || debouncedValue.length < 2) {
        setResults([]);
        return;
      }

      setLoadingSearch(true);

      const { data, error } = await supabase
        .from("games")
        .select("game_name, game_image, canonical_slug")
        .ilike("game_name", `%${debouncedValue}%`)
        .limit(10);

      if (error) {
        console.error("Search error:", error.message);
        setResults([]);
      } else {
        setResults(data || []);
      }

      setLoadingSearch(false);
    };

    searchGames();
  }, [debouncedValue, value]);

  useEffect(() => {
    onDropdownOpenChange?.(results.length > 0);
  }, [onDropdownOpenChange, results]);

  // ----------------------------------
  // 3. Submit logic (dual mode)
  // ----------------------------------
  const handleSubmit = async (): Promise<void> => {
    const linkCheck = await validateSteamUrl(value);

    // CASE 1: Valid Steam link → normal flow
    if (linkCheck.isValid) {
      await processSteamUrl(value);
      return;
    }

    // CASE 2: Not a link → must use selected or first result
    const gameToUse = selectedGame || results[0];

    if (!gameToUse) {
      onError("Game not found in database. Please use a Steam link instead.");
      return;
    }

    try {
      onLoading(true);

      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("canonical_slug", gameToUse.canonical_slug)
        .single();

      if (error || !data) {
        throw new Error("Cached data not found.");
      }

      onResult(data);
    } catch (err) {
      console.error(err);
      onError("Failed to fetch cached result.");
    } finally {
      onLoading(false);
    }
  };

  // ----------------------------------
  // 4. Keyboard handling
  // ----------------------------------
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ----------------------------------
  // 6. Existing API flow (unchanged)
  // ----------------------------------
  const processSteamUrl = async (input: string): Promise<void> => {
    const result = await validateSteamUrl(input);

    if (!result.isValid) {
      onError(result.error);
      return;
    }

    try {
      onLoading(true);
      onError("");

      const res = await fetch("/api/rating", {
        method: "POST",
        body: JSON.stringify({
          game_name: result.name,
          game_link: input,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Server error. Please try again.");
      }

      const data: ClassificationResult = await res.json();

      if (
        !data ||
        !data.game_title ||
        !data.classification_code ||
        !data.classification_accurateness
      ) {
        throw new Error("Invalid response from server.");
      }

      onResult(data);
    } catch (err) {
      console.error("Request failed", err);

      onError(
        err instanceof Error
          ? err.message
          : "Internal error. Please try again.",
      );
    } finally {
      onLoading(false);
    }
  };

  // ----------------------------------
  // 7. UI
  // ----------------------------------
  return (
    <div className="w-full max-w-xl px-4 relative">
      <input
        type="text"
        placeholder="Search game or paste Steam link..."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSelectedGame(null); // reset selection on typing
        }}
        onKeyDown={handleKeyDown}
        className="w-full border border-gray-300 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-white"
      />

      {/* Dropdown */}
      {results.length > 0 && (
        <div className="absolute w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
          {results.map((game) => (
            <div
              key={game.canonical_slug}
              onClick={() => {
                setSelectedGame(game);
                setValue(game.game_name);
                setResults([]);
              }}
              className="flex items-center gap-3 p-2 hover:bg-gray-700 cursor-pointer"
            >
              {game.game_image && (
                <Image
                  src={game.game_image}
                  alt={game.game_name}
                  width={184}
                  height={69}
                  className="h-10 w-auto rounded"
                />
              )}
              <span className="text-sm text-white">{game.game_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

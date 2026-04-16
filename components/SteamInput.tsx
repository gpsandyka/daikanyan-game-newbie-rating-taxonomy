"use client";

import { useState } from "react";
import { validateSteamUrl } from "../utils/validateSteamUrl";
import type { ClassificationResult } from "@/types/classification";

interface Props {
  onResult: (data: ClassificationResult) => void;
  onLoading: (loading: boolean) => void;
  onError: (message: string) => void;
}

export default function SteamInput({ onResult, onLoading, onError }: Props) {
  //V1 still use link only,
  //V2 will use game name and search on database
  const [value, setValue] = useState<string>("");

  const handleSubmit = async (): Promise<void> => {
    //Handle submit is different with handle click (on dropdown suggestion)
    // In V2, when the text is non link, just get the top dropdown if any (if not exist, give warning)
    // And when the text is link, just do normally
    await processSteamUrl(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    //Search on V2 goes here
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    const pasted = e.clipboardData.getData("text");
    const result = validateSteamUrl(pasted); //Later V2 input can be non-link

    if (!result.isValid) {
      console.warn(result.error);
    }
  };

  const processSteamUrl = async (input: string): Promise<void> => {
    const result = validateSteamUrl(input);

    if (!result.isValid) {
      onError(result.error);
      return;
    }

    try {
      onLoading(true);
      onError(""); // clear previous error

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

  return (
    <div className="w-full max-w-xl px-4">
      <input
        type="text"
        placeholder="Paste Steam game link..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="w-full border border-gray-300 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-white"
      />
    </div>
  );
}

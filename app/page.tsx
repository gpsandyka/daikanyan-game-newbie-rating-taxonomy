"use client";

import { useState } from "react";
import SteamInput from "@/components/SteamInput";
import ResultCard from "@/components/ResultCard";
import type { ClassificationResult } from "@/types/classification";

export default function Home() {
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-3xl flex flex-col items-center text-center gap-8">
        {/* Title */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight 
                      bg-linear-to-r from-[#2BB3D9] to-[#A1A0A1] 
                      bg-clip-text text-transparent"
        >
          Daika Game Newbie Rating Taxonomy
        </h1>

        {/* Input */}
        <div className="w-full max-w-xl">
          <div
            className="backdrop-blur-md bg-white/5 border border-white/10 
                          rounded-2xl px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
          >
            <SteamInput
              onResult={(data) => {
                setError(null); // clear error
                setResult(data);
              }}
              onLoading={setLoading}
              onError={(msg) => {
                setResult(null); // clear result
                setError(msg);
              }}
            />
          </div>
        </div>

        {/* Loading */}
        {loading && <p className="text-sm text-gray-400">Processing...</p>}

        {/* Error */}
        {error && !loading && <p className="text-sm text-red-400">{error}</p>}

        {/* Result */}
        {result && !loading && !error && <ResultCard data={result} />}

        {/* Footer */}
        <p className="text-sm text-gray-400 opacity-70">
          paste your steam link and continue
        </p>
      </div>
    </div>
  );
}

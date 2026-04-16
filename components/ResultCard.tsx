import Image from "next/image";
import type { ClassificationResult } from "@/types/classification";

interface Props {
  data: ClassificationResult;
}

export default function ResultCard({ data }: Props) {
  const getImagePath = () => {
    const code = data.classification_code;

    // edge case handling
    if (!code || code === "Unable to classify") return null;

    return `/${code.replace("+", "")}.png`;
    // expects /public/3.png, /7.png etc
  };

  const imagePath = getImagePath();

  return (
    <div className="w-full max-w-xl mt-6">
      <div
        className="backdrop-blur-md bg-white/5 border border-white/10 
                      rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.4)] 
                      flex flex-col gap-4"
      >
        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-semibold text-white">
          {data.game_title}
        </h2>

        {/* Accuracy */}
        <p className="text-sm text-gray-300">
          Accuracy: {data.classification_accurateness}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Rating:</span>

          {imagePath ? (
            <Image
              src={imagePath}
              alt={data.classification_code}
              width={48}
              height={48}
              className="rounded-md"
            />
          ) : (
            <span className="text-sm text-gray-400">
              {data.classification_code}
            </span>
          )}
        </div>

        {/* Explanation (scrollable) */}
        <div className="max-h-40 overflow-y-auto pr-2 text-sm text-gray-300 leading-relaxed">
          {data.extra_explanation}
        </div>
      </div>
    </div>
  );
}

type ValidationResult =
  | {
      isValid: true;
      type: "app";
      appId: string;
      name: string;
    }
  | {
      isValid: false;
      error: string;
    };

export async function validateSteamUrl(url: string): Promise<ValidationResult> {
  if (!url) {
    return { isValid: false, error: "URL is required" };
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }

  // Enforce Steam domain
  if (!parsed.hostname.includes("store.steampowered.com")) {
    return { isValid: false, error: "Must be a Steam store URL" };
  }

  /**
   * Updated regex:
   * - /app/{id}
   * - optional /{slug}
   */
  const match = parsed.pathname.match(/^\/app\/(\d+)(?:\/([^\/]+))?/);

  if (!match) {
    return {
      isValid: false,
      error: "URL must be a valid Steam app link",
    };
  }

  const appId = match[1];
  const slug = match[2];

  let name: string | null = null;

  // Case 1: slug exists → use it
  if (slug) {
    name = decodeURIComponent(slug)
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .trim();
  }

  // Case 2: slug missing → fetch from Steam API
  if (!name || name.length < 2) {
    try {
      const res = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appId}`,
      );

      const data = await res.json();

      const appData = data?.[appId];

      if (!appData?.success) {
        return {
          isValid: false,
          error: "Steam API failed to resolve app",
        };
      }

      name = appData.data?.name;

      if (!name) {
        return {
          isValid: false,
          error: "Game name not found from Steam API",
        };
      }
    } catch (err) {
      return {
        isValid: false,
        error: "Failed to fetch game data",
      };
    }
  }

  return {
    isValid: true,
    type: "app",
    appId,
    name,
  };
}

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

export function validateSteamUrl(url: string): ValidationResult {
  if (!url) {
    return { isValid: false, error: "URL is required" };
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }

  // Enforce domain
  if (!parsed.hostname.includes("store.steampowered.com")) {
    return { isValid: false, error: "Must be a Steam store URL" };
  }

  // Match /app/{id}/{slug}
  const match = parsed.pathname.match(/^\/app\/(\d+)\/([^\/]+)/);

  if (!match) {
    return {
      isValid: false,
      error: "URL must include game name (slug)",
    };
  }

  const appId = match[1];
  const slug = match[2];

  // Normalize slug → readable name
  const name = decodeURIComponent(slug)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .trim();

  if (!name || name.length < 2) {
    return {
      isValid: false,
      error: "Invalid game name in URL",
    };
  }

  return {
    isValid: true,
    type: "app",
    appId,
    name,
  };
}

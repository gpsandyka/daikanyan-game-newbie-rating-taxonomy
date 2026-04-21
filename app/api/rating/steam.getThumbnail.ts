export async function getThumbnail(steamLink: string): Promise<string> {
  const appId = extractAppId(steamLink);
  if (!appId) {
    throw new Error("Invalid Steam link");
  }

  const steamRes = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${appId}`,
  );

  const steamJson = await steamRes.json();

  if (!steamJson[appId]?.success) {
    throw new Error("Invalid Steam app");
  }

  const appData = steamJson[appId]?.data;

  const gameImage =
    appData?.capsule_imagev5 ||
    appData?.capsule_image ||
    appData?.header_image ||
    null;

  return gameImage;
}

function extractAppId(steamLink: string): string | null {
  const regex = /\/app\/(\d+)/;
  const match = steamLink.match(regex);
  return match ? match[1] : null;
}

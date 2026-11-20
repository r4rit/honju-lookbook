export function getSafeExternalUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function buildNaverMapUrl(shop: {
  naver_map_url?: string | null;
  address: string;
  name: string;
}): string {
  const safeCustomUrl = getSafeExternalUrl(shop.naver_map_url);
  if (safeCustomUrl) {
    return safeCustomUrl;
  }

  const query = (shop.address || shop.name).trim();
  if (query.length === 0) {
    return "https://map.naver.com";
  }

  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}

export function buildKakaoMapUrl(shop: {
  address: string;
  name: string;
}): string {
  const query = (shop.address || shop.name).trim();
  if (query.length === 0) {
    return "https://map.kakao.com";
  }

  return `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
}

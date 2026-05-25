import API from "./api";
import { resolveApiAsset } from "./apiHelpers";

export interface SiteSettings {
  logo?: string;
  logo_ar?: string;
  site_name?: string;
  favicon?: string;
  [key: string]: any;
}

const SETTINGS_CACHE_KEY = "error505_site_settings_cache_v1";
const SETTINGS_CACHE_TTL = 30 * 60 * 1000;

let memorySettingsCache: { data: SiteSettings; createdAt: number } | null = null;

const isFresh = (createdAt: number) => Date.now() - createdAt < SETTINGS_CACHE_TTL;

const normalizeSettings = (data: any): SiteSettings => ({
  ...data,
  logo: data?.logo ? resolveApiAsset(data.logo) : undefined,
  logo_ar: data?.logo_ar ? resolveApiAsset(data.logo_ar) : undefined,
  favicon: data?.favicon ? resolveApiAsset(data.favicon) : undefined,
});

const readCachedSettings = (): SiteSettings | null => {
  if (memorySettingsCache && isFresh(memorySettingsCache.createdAt)) return memorySettingsCache.data;
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { data?: SiteSettings; createdAt?: number };
    if (!parsed?.data || !parsed.createdAt || !isFresh(parsed.createdAt)) return null;

    memorySettingsCache = { data: parsed.data, createdAt: parsed.createdAt };
    return parsed.data;
  } catch {
    return null;
  }
};

const writeCachedSettings = (data: SiteSettings) => {
  const createdAt = Date.now();
  memorySettingsCache = { data, createdAt };

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({ data, createdAt }));
  } catch {
    // ignore storage errors
  }
};

export const getSiteSettings = async (): Promise<SiteSettings> => {
  const cached = readCachedSettings();
  if (cached) return cached;

  try {
    const res = await API.get("settings");
    const data = normalizeSettings(res.data?.data ?? res.data ?? {});
    writeCachedSettings(data);
    return data;
  } catch (error) {
    console.error("Failed to fetch site settings:", error);
    return {};
  }
};

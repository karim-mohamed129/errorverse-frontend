import API from "./api";
import { unwrapApiList } from "./apiHelpers";

export type HomeContentApiItem = {
  id: number | string;
  title?: string;
  views?: string | number;
  cover_image?: string;
  image?: string;
  chapter_type?: string;
  favourites_count?: string | number;
  share_count?: string | number;
  creator_name?: string;
  content_type?: string;
  visibility_date?: string | null;
  is_favourite?: boolean;
  latest_chapter_number?: string | number | null;
  chapter?: string;
  is_exclusive?: boolean;
  next_chapter?: string;
  latest_chapter?: { id?: string | number; chapter_number?: string | number };
  last_chapter?: { id?: string | number; chapter_number?: string | number };
  latest_chapter_id?: string | number;
  last_chapter_id?: string | number;
  chapter_id?: string | number;
  created_at?: string;
  updated_at?: string;
};

export type HomeBlogApiItem = {
  id: number | string;
  title?: string;
  image?: string;
  content?: string;
  created_at?: string;
  category_name?: string;
};

export type HomeApiData = {
  trending: HomeContentApiItem[];
  exclusive: HomeContentApiItem[];
  just_dropped: HomeContentApiItem[];
  top_picks: HomeContentApiItem[];
  blogs: HomeBlogApiItem[];
  unread_nitification_count?: number;
};

const EMPTY_HOME_DATA: HomeApiData = {
  trending: [],
  exclusive: [],
  just_dropped: [],
  top_picks: [],
  blogs: [],
  unread_nitification_count: 0,
};

const HOME_CACHE_KEY = "error505_home_data_cache_v1";
const HOME_CACHE_TTL = 5 * 60 * 1000;

let memoryHomeCache: { data: HomeApiData; createdAt: number } | null = null;

const normalizeHomeData = (payload: any): HomeApiData => {
  const data = payload?.data?.data ?? payload?.data ?? payload ?? {};

  return {
    ...EMPTY_HOME_DATA,
    trending: Array.isArray(data.trending) ? data.trending : [],
    exclusive: Array.isArray(data.exclusive) ? data.exclusive : [],
    just_dropped: Array.isArray(data.just_dropped) ? data.just_dropped : [],
    top_picks: Array.isArray(data.top_picks) ? data.top_picks : [],
    blogs: Array.isArray(data.blogs) ? data.blogs : [],
    unread_nitification_count: data.unread_nitification_count ?? 0,
  };
};

const isFresh = (createdAt: number) => Date.now() - createdAt < HOME_CACHE_TTL;

export const readCachedHomeData = (): HomeApiData | null => {
  if (memoryHomeCache && isFresh(memoryHomeCache.createdAt)) return memoryHomeCache.data;

  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { data?: HomeApiData; createdAt?: number };
    if (!parsed?.data || !parsed.createdAt || !isFresh(parsed.createdAt)) return null;

    memoryHomeCache = { data: parsed.data, createdAt: parsed.createdAt };
    return parsed.data;
  } catch {
    return null;
  }
};

const writeCachedHomeData = (data: HomeApiData) => {
  const createdAt = Date.now();
  memoryHomeCache = { data, createdAt };

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ data, createdAt }));
  } catch {
    // ignore storage errors
  }
};

export const getHomeData = async (forceRefresh = false): Promise<HomeApiData> => {
  if (!forceRefresh) {
    const cached = readCachedHomeData();
    if (cached) return cached;
  }

  const response = await API.get("home");
  const data = normalizeHomeData(response);
  writeCachedHomeData(data);

  return data;
};

// Kept for compatibility with any old imports.
export const getHomeSeedData = getHomeData;

export const getCreatorContentItems = async (creatorId: string | number) => {
  const res = await API.get(`creator/${creatorId}/content`);
  return unwrapApiList(res);
};

export const getContentByCategoryId = async (
  categoryId: string | number,
  perPage = 20
) => {
  const res = await API.get("content", {
    params: { category_id: categoryId, per_page: perPage },
  });
  return unwrapApiList(res);
};

export const getContentItems = async (perPage = 100) => {
  const res = await API.get("content", { params: { per_page: perPage } });
  return unwrapApiList(res);
};

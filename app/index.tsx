import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Header from "../components/Header";
import BackToTop from "../components/BackToTop";
import SectionHeader from "../components/SectionHeader";
import SliderSection from "../components/SliderSection";
import BlogCard, { BlogItem } from "../components/BlogCard";
import { CardItem, CardVariant } from "../components/MangaCard";
import {
  getHomeData,
  readCachedHomeData,
  HomeApiData,
  HomeBlogApiItem,
  HomeContentApiItem,
} from "../services/homeApi";
import { resolveApiAsset } from "../services/apiHelpers";
import { usePersistedLang } from "../components/usePersistedLang";
import "./Globals.css";

import arrowImg from "../assets/images/arrow.png";
import crownImg from "../assets/images/crown.png";
import viewsIcon from "../assets/images/dashbaord/icons/views.png";
import likesIcon from "../assets/images/dashbaord/icons/likes.png";
import sharesIcon from "../assets/images/dashbaord/icons/share.png";
import chipShape from "../assets/icons/chip-shape.svg";
import heart from "../assets/icons/heart.svg";

const Footer = lazy(() => import("../components/Footer"));

type SectionData = {
  name: string;
  variant: CardVariant;
  rowClass: string;
  items: CardItem[];
};

type DragState = {
  isDown: boolean;
  startX: number;
  scrollLeft: number;
};

const assetUri = (asset: any): string => {
  if (typeof asset === "string") return asset;
  if (typeof asset === "number") return String(asset);
  return asset?.src ?? asset?.uri ?? asset?.default?.src ?? asset?.default?.uri ?? asset?.default ?? "";
};

const arrowUri = assetUri(arrowImg);
const crownUri = assetUri(crownImg);
const viewsUri = assetUri(viewsIcon);
const likesUri = assetUri(likesIcon);
const sharesUri = assetUri(sharesIcon);
const chipShapeUri = assetUri(chipShape);
const heartUri = assetUri(heart);

const FALLBACK_IMAGE = "https://dreamhrms.com/error_505/images/default.png";

const SECTION_CONFIG: Array<Pick<SectionData, "name" | "variant" | "rowClass"> & { count: number }> = [
  { name: "EXCLUSIVE CONTENT", variant: "featured", rowClass: "row-1", count: 2 },
  { name: "TRENDING", variant: "standard", rowClass: "row-2", count: 4 },
  { name: "JUST DROPPED", variant: "chapter", rowClass: "row-3", count: 4 },
  { name: "TOP PICKS", variant: "compactOverlay", rowClass: "row-4", count: 2 },
];

const createFallbackCard = (
  rowClass: string,
  variant: CardVariant,
  index: number
): CardItem => ({
  id: `${rowClass}-fallback-${index + 1}`,
  href: "/categories",
  image: FALLBACK_IMAGE,
  title: variant === "featured" ? `Exclusive Content ${index + 1}` : "THE TITTLE",
  views: "0",
  likes: "0",
  comments: "0",
  chapter: variant === "chapter" || variant === "featured" ? "CH.12" : "",
  type: variant === "featured" ? "ONESHOT MANGA" : "MANGA",
  creator: "",
  dropped: false,
  topLabel: variant === "featured" ? "ONESHOT MANGA" : "MANGA",
  ctaLabel: variant === "featured" ? "NEXT CHAPTER" : "Read More",
  metaDate: variant === "featured" ? "Sat 15th . Oct" : "",
  metaIcon: variant === "featured" ? crownUri : "",
  author: "",
  isFavorite: false,
});

const buildLightFallbackSections = (): SectionData[] =>
  SECTION_CONFIG.map((section) => ({
    name: section.name,
    variant: section.variant,
    rowClass: section.rowClass,
    items: Array.from({ length: section.count }, (_, index) =>
      createFallbackCard(section.rowClass, section.variant, index)
    ),
  }));

const staticBlogs: BlogItem[] = [1, 2, 3].map((index) => ({
  id: `blog-fallback-${index}`,
  image: FALLBACK_IMAGE,
  title: "BLOG NAME",
  date: "",
  excerpt: "",
  category: "",
}));

const formatMetric = (value: string | number | null | undefined, fallback = "0") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const safeText = (value: string | number | null | undefined, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const getContentHref = (item: HomeContentApiItem) => {
  const id = encodeURIComponent(String(item.id));
  return `/category-inner?id=${id}&view=grid`;
};

const getChapterLabel = (item: HomeContentApiItem, fallback = "CH.12") => {
  const directChapter = safeText(item.chapter);
  const latestNumber = safeText(item.latest_chapter_number);
  const chapterType = safeText(item.chapter_type).toUpperCase();

  if (latestNumber) {
    if (chapterType === "EPISODE" || directChapter.toUpperCase().startsWith("EP")) {
      return directChapter && /\d/.test(directChapter) ? directChapter : `EP ${latestNumber}`;
    }

    if (directChapter && /\d/.test(directChapter)) return directChapter;
    return `CH.${latestNumber}`;
  }

  return directChapter || fallback;
};

const mapContentToCard = (
  item: HomeContentApiItem,
  variant: CardVariant,
  fallback: CardItem,
  index: number
): CardItem => {
  const contentType = safeText(item.content_type, fallback.type || "MANGA").toUpperCase();
  const nextChapter = safeText(item.next_chapter, fallback.ctaLabel || "Read More");
  const image = resolveApiAsset(item.cover_image || item.image) || fallback.image || FALLBACK_IMAGE;

  return {
    ...fallback,
    id: String(item.id ?? fallback.id ?? index),
    href: getContentHref(item),
    image,
    title: safeText(item.title, fallback.title || "THE TITTLE"),
    views: formatMetric(item.views, fallback.views || "0"),
    likes: formatMetric(item.favourites_count, fallback.likes || "0"),
    comments: formatMetric(item.share_count, fallback.comments || "0"),
    chapter: getChapterLabel(item, fallback.chapter || "CH.12"),
    type: contentType,
    creator: safeText(item.creator_name, fallback.creator || ""),
    topLabel: contentType,
    ctaLabel: variant === "featured" ? nextChapter.toUpperCase() : nextChapter,
    metaDate: safeText(item.visibility_date || item.created_at, fallback.metaDate || ""),
    isFavorite: Boolean(item.is_favourite),
  };
};

const mapBlogToCard = (blog: HomeBlogApiItem, fallback: BlogItem, index: number): BlogItem => ({
  ...fallback,
  id: String(blog.id ?? fallback.id ?? index),
  image: resolveApiAsset(blog.image) || fallback.image || FALLBACK_IMAGE,
  title: safeText(blog.title, fallback.title || "BLOG NAME"),
  date: safeText(blog.created_at, fallback.date || ""),
  excerpt: safeText(blog.content, fallback.excerpt || ""),
  category: safeText(blog.category_name, fallback.category || ""),
});

const replaceSectionItems = (
  sections: SectionData[],
  rowClass: string,
  apiItems: HomeContentApiItem[] | undefined
) =>
  sections.map((section) => {
    if (section.rowClass !== rowClass || !apiItems?.length) return section;

    return {
      ...section,
      items: apiItems.map((item, index) =>
        mapContentToCard(
          item,
          section.variant,
          section.items[index % section.items.length] ||
            createFallbackCard(section.rowClass, section.variant, index),
          index
        )
      ),
    };
  });

const buildSectionsFromApi = (homeData: HomeApiData | null): SectionData[] => {
  let sections = buildLightFallbackSections();
  if (!homeData) return sections;

  sections = replaceSectionItems(sections, "row-1", homeData.exclusive);
  sections = replaceSectionItems(sections, "row-2", homeData.trending);
  sections = replaceSectionItems(sections, "row-3", homeData.just_dropped);
  sections = replaceSectionItems(sections, "row-4", homeData.top_picks);

  return sections;
};

const buildBlogsFromApi = (homeData: HomeApiData | null): BlogItem[] => {
  if (!homeData?.blogs?.length) return staticBlogs;

  return homeData.blogs.map((blog, index) =>
    mapBlogToCard(blog, staticBlogs[index % staticBlogs.length] || staticBlogs[0], index)
  );
};

export default function App() {
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([]);
  const resizeFrameRef = useRef<number | null>(null);
  const [dragStates, setDragStates] = useState<Record<number, DragState>>({});
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1440
  );

  const [lang, setLang] = usePersistedLang("en");
  const [homeData, setHomeData] = useState<HomeApiData | null>(() => readCachedHomeData());

  const isMobile = windowWidth <= 991;
  const isArabic = lang === "ar";
  const pageDir = isArabic ? "rtl" : "ltr";

  const sections = useMemo(() => buildSectionsFromApi(homeData), [homeData]);
  const blogs = useMemo(() => buildBlogsFromApi(homeData), [homeData]);

  useEffect(() => {
    let isMounted = true;

    const loadHomeData = async () => {
      try {
        const nextHomeData = await getHomeData();
        if (isMounted) setHomeData(nextHomeData);
      } catch (error) {
        console.error("Failed to load home API data:", error);
      }
    };

    void loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (resizeFrameRef.current !== null) cancelAnimationFrame(resizeFrameRef.current);

      resizeFrameRef.current = requestAnimationFrame(() => {
        setWindowWidth(window.innerWidth);
        resizeFrameRef.current = null;
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeFrameRef.current !== null) cancelAnimationFrame(resizeFrameRef.current);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dir = pageDir;
    document.documentElement.lang = lang;
    document.body.dir = pageDir;

    document.documentElement.classList.toggle("is-rtl", isArabic);
    document.documentElement.classList.toggle("is-ltr", !isArabic);
    document.body.classList.toggle("is-rtl", isArabic);
    document.body.classList.toggle("is-ltr", !isArabic);
  }, [pageDir, lang, isArabic]);

  useEffect(() => {
    setDragStates({});

    requestAnimationFrame(() => {
      scrollRefs.current.forEach((container) => {
        if (!container) return;
        container.scrollLeft = 0;
      });
    });
  }, [lang]);

  const getCardStep = useCallback((index: number) => {
    const container = scrollRefs.current[index];
    if (!container) return 0;

    const firstCard = container.querySelector(
      ".manga-col, .blog-col"
    ) as HTMLElement | null;

    if (!firstCard) return 0;

    const track = container.querySelector(
      ".cards-track, .blogs-grid"
    ) as HTMLElement | null;

    const styles = track ? window.getComputedStyle(track) : null;
    const gap = styles ? parseFloat(styles.gap || "0") : 0;
    const cardWidth = firstCard.offsetWidth;

    return cardWidth + gap;
  }, []);

  const getVisibleCards = useCallback((index: number) => {
    const row = document.querySelector(`.row-${index + 1}`) as HTMLElement | null;
    if (!row) return 1;

    const variableName = index === 4 ? "--blog-cols" : "--cols";
    const rawCols = window.getComputedStyle(row).getPropertyValue(variableName).trim();
    const cols = parseFloat(rawCols);

    if (!Number.isFinite(cols) || cols <= 0) return 1;
    return cols;
  }, []);

  const getScrollAmount = useCallback(
    (index: number) => {
      const step = getCardStep(index);
      return step * getVisibleCards(index);
    },
    [getCardStep, getVisibleCards]
  );

  const snapToNearestCard = useCallback(
    (index: number) => {
      const container = scrollRefs.current[index];
      if (!container) return;

      const step = getCardStep(index);
      if (!step) return;

      const snappedLeft = Math.round(container.scrollLeft / step) * step;
      container.scrollTo({ left: snappedLeft, behavior: "smooth" });
    },
    [getCardStep]
  );

  const scrollLeftFn = useCallback(
    (index: number) => {
      const amount = getScrollAmount(index);

      scrollRefs.current[index]?.scrollBy({
        left: isArabic ? amount : -amount,
        behavior: "smooth",
      });
    },
    [getScrollAmount, isArabic]
  );

  const scrollRightFn = useCallback(
    (index: number) => {
      const amount = getScrollAmount(index);

      scrollRefs.current[index]?.scrollBy({
        left: isArabic ? -amount : amount,
        behavior: "smooth",
      });
    },
    [getScrollAmount, isArabic]
  );

  const handleMouseDown = useCallback(
    (index: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile) return;

      const slider = scrollRefs.current[index];
      if (!slider) return;

      setDragStates((prev) => ({
        ...prev,
        [index]: {
          isDown: true,
          startX: e.pageX - slider.offsetLeft,
          scrollLeft: slider.scrollLeft,
        },
      }));
    },
    [isMobile]
  );

  const handleMouseLeave = useCallback(
    (index: number) => {
      const wasDragging = dragStates[index]?.isDown;

      setDragStates((prev) => ({
        ...prev,
        [index]: {
          ...(prev[index] || {
            startX: 0,
            scrollLeft: 0,
            isDown: false,
          }),
          isDown: false,
        },
      }));

      if (wasDragging) snapToNearestCard(index);
    },
    [dragStates, snapToNearestCard]
  );

  const handleMouseUp = useCallback(
    (index: number) => {
      setDragStates((prev) => ({
        ...prev,
        [index]: {
          ...(prev[index] || {
            startX: 0,
            scrollLeft: 0,
            isDown: false,
          }),
          isDown: false,
        },
      }));

      snapToNearestCard(index);
    },
    [snapToNearestCard]
  );

  const handleMouseMove = useCallback(
    (index: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile) return;

      const slider = scrollRefs.current[index];
      const state = dragStates[index];

      if (!slider || !state?.isDown) return;

      e.preventDefault();

      const x = e.pageX - slider.offsetLeft;
      const walk = (x - state.startX) * 1.5;

      slider.scrollLeft = state.scrollLeft - walk * (isArabic ? -1 : 1);
    },
    [dragStates, isArabic, isMobile]
  );

  const goToCategories = useCallback(() => {
    window.location.href = "/categories";
  }, []);

  const goToBlogs = useCallback(() => {
    window.location.href = "/blogs";
  }, []);

  return (
    <div
      className={`home-page ${isArabic ? "lang-ar-page" : "lang-en-page"}`}
      dir={pageDir}
      lang={lang}
    >
      <div className="home-noise" />

      <Header lang={lang} onLanguageChange={setLang} currentPage="home" />

      <main key={`main-${lang}`} className="page-content py-4 py-md-5" dir={pageDir}>
        {sections.map((section, index) => (
          <SliderSection
            key={`${lang}-${section.name}`}
            index={index}
            title={section.name}
            rowClass={section.rowClass}
            items={section.items}
            variant={section.variant}
            isMobile={isMobile}
            chipImage={chipShapeUri}
            arrowImage={arrowUri}
            heartImage={heartUri}
            viewsImage={viewsUri}
            likesImage={likesUri}
            sharesImage={sharesUri}
            scrollRefs={scrollRefs}
            dragStates={dragStates}
            handleMouseDown={handleMouseDown}
            handleMouseLeave={handleMouseLeave}
            handleMouseUp={handleMouseUp}
            handleMouseMove={handleMouseMove}
            scrollLeftFn={scrollLeftFn}
            scrollRightFn={scrollRightFn}
            lang="en"
            onSeeMore={goToCategories}
          />
        ))}

        <section className="content-section row-5" dir={pageDir}>
          <SectionHeader title="BLOGS" chipImage={chipShapeUri} onSeeMore={goToBlogs} lang="en" />

          <div className="slider-shell slider-row-5">
            {!isMobile && (
              <button
                className="nav-arrow nav-arrow-left"
                onClick={() => scrollLeftFn(4)}
                onMouseDown={(e) => e.preventDefault()}
                aria-label={isArabic ? "التمرير يسارًا" : "Scroll blogs left"}
                type="button"
              >
                <img
                  src={arrowUri}
                  alt=""
                  className="arrow-icon left"
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                />
              </button>
            )}

            <div className="slider-viewport">
              <div
                className={`scroll-container ${dragStates[4]?.isDown ? "dragging" : ""}`}
                ref={(el) => {
                  scrollRefs.current[4] = el;
                }}
                onMouseDown={(e) => handleMouseDown(4, e)}
                onMouseLeave={() => handleMouseLeave(4)}
                onMouseUp={() => handleMouseUp(4)}
                onMouseMove={(e) => handleMouseMove(4, e)}
              >
                <div className="blogs-grid">
                  {blogs.map((blog) => (
                    <div className="blog-col" key={blog.id}>
                      <BlogCard
                        blog={blog}
                        lang="en"
                        onReadMore={() => {
                          window.location.href = `/blog-inner?id=${encodeURIComponent(blog.id)}`;
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {!isMobile && (
              <button
                className="nav-arrow nav-arrow-right"
                onClick={() => scrollRightFn(4)}
                onMouseDown={(e) => e.preventDefault()}
                aria-label={isArabic ? "التمرير يمينًا" : "Scroll blogs right"}
                type="button"
              >
                <img
                  src={arrowUri}
                  alt=""
                  className="arrow-icon right"
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                />
              </button>
            )}
          </div>
        </section>
      </main>

      <BackToTop />

      <div className="footer-direction-shell" dir={pageDir}>
        <Suspense fallback={null}>
          <Footer lang={lang} />
        </Suspense>
      </div>
    </div>
  );
}

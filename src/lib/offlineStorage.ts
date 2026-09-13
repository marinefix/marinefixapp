import type { GuideWithRelations } from "../types";

const OFFLINE_GUIDES_KEY = "marine_offline_guides_data";
const OFFLINE_CACHE_NAME = "marine-fix-offline-guides-v2";

export const API_BASE_URL = "https://marinefixapp.pages.dev";

type OfflineGuide = GuideWithRelations & { savedAt?: string };

export function resolveRemoteUrl(url: string): string {
  if (!url) return url;
  const value = url.trim();
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:") || value.startsWith("blob:")) return value;
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return value;
}

function getAttachmentUrls(guide: GuideWithRelations): string[] {
  const urls: string[] = [];
  const addUrl = (value: any) => {
    if (typeof value === "string" && value.trim()) {
      urls.push(resolveRemoteUrl(value.trim()));
      return;
    }
    if (value && typeof value === "object") {
      const url = value.url || value.image_url || value.image || value.publicUrl || "";
      if (typeof url === "string" && url.trim()) urls.push(resolveRemoteUrl(url.trim()));
    }
  };
  if (Array.isArray(guide.images)) guide.images.forEach(addUrl);
  if (Array.isArray(guide.steps)) {
    guide.steps.forEach((step: any) => {
      let raw = step?.images || step?.step_images || [];
      if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { raw = []; } }
      if (Array.isArray(raw)) raw.forEach(addUrl);
    });
  }
  return [...new Set(urls)];
}

async function cacheAttachment(url: string): Promise<void> {
  try {
    if (url.startsWith("data:") || url.startsWith("blob:")) return;
    const absoluteUrl = resolveRemoteUrl(url);
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    if (await cache.match(absoluteUrl)) return;
    const response = await fetch(absoluteUrl, { method: "GET", mode: "cors", credentials: "omit", cache: "no-store" });
    if (!response.ok) {
      console.warn(`Failed to cache attachment (${response.status}):`, absoluteUrl);
      return;
    }
    await cache.put(absoluteUrl, response.clone());
  } catch (err) {
    console.warn("Failed to cache offline attachment:", url, err);
  }
}

async function cacheGuideAttachments(guide: GuideWithRelations): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  await Promise.all(getAttachmentUrls(guide).map(cacheAttachment));
}

export async function saveGuideOffline(guide: GuideWithRelations): Promise<void> {
  try {
    const existing = getOfflineGuides();
    existing[guide.id] = { ...guide, savedAt: new Date().toISOString() };
    localStorage.setItem(OFFLINE_GUIDES_KEY, JSON.stringify(existing));
    await cacheGuideAttachments(guide);
  } catch (err) {
    console.error("Failed to cache guide offline:", err);
  }
}

export async function removeGuideOffline(guideId: string): Promise<void> {
  try {
    const existing = getOfflineGuides();
    delete existing[guideId];
    localStorage.setItem(OFFLINE_GUIDES_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error("Failed to remove offline guide:", err);
  }
}

export function getOfflineGuides(): Record<string, OfflineGuide> {
  try {
    const raw = localStorage.getItem(OFFLINE_GUIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("Failed to read offline guides:", err);
    return {};
  }
}

export function getOfflineGuideById(guideId: string): GuideWithRelations | null {
  return getOfflineGuides()[guideId] || null;
}

export function isGuideSavedOffline(guideId: string): boolean {
  return Boolean(getOfflineGuides()[guideId]);
}

export async function getOfflineAttachmentUrl(url: string): Promise<string> {
  const absoluteUrl = resolveRemoteUrl(url);
  if (absoluteUrl.startsWith("data:") || absoluteUrl.startsWith("blob:")) return absoluteUrl;
  if (typeof window === "undefined" || !("caches" in window)) return absoluteUrl;
  try {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    const response = await cache.match(absoluteUrl);
    if (!response) return absoluteUrl;
    const blob = await response.blob();
    if (!blob.size) return absoluteUrl;
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn("Failed to read cached attachment:", absoluteUrl, err);
    return absoluteUrl;
  }
}

export async function clearOfflineGuides(): Promise<void> {
  try {
    localStorage.removeItem(OFFLINE_GUIDES_KEY);
    if (typeof window !== "undefined" && "caches" in window) await caches.delete(OFFLINE_CACHE_NAME);
  } catch (err) {
    console.error("Failed to clear offline guides:", err);
  }
}

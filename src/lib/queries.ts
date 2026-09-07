import type {
  Category,
  Equipment,
  Guide,
  GuideWithRelations,
} from "../types";
import { getOfflineGuides } from "./offlineStorage";

const API_BASE_URL = "https://marinefixapp.pages.dev";

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const res = await fetch(url, options);

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(errText || `API error: ${res.status}`);
  }

  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/api/categories");
}

export async function fetchEquipment(
  categoryId?: string
): Promise<Equipment[]> {
  const url = categoryId
    ? `/api/equipment?category_id=${encodeURIComponent(categoryId)}`
    : "/api/equipment";

  return apiFetch<Equipment[]>(url);
}

export async function fetchEquipmentByCategory(
  categoryId: string
): Promise<(Equipment & { guides_count?: number })[]> {
  return apiFetch<(Equipment & { guides_count?: number })[]>(
    `/api/equipment?category_id=${encodeURIComponent(categoryId)}`
  );
}

export async function fetchEquipmentById(
  id: string
): Promise<Equipment | null> {
  try {
    return await apiFetch<Equipment>(
      `/api/equipment?id=${encodeURIComponent(id)}`
    );
  } catch {
    return null;
  }
}

export async function fetchGuides(
  equipmentId?: string
): Promise<Guide[]> {
  const url = equipmentId
    ? `/api/guides?equipment_id=${encodeURIComponent(equipmentId)}`
    : "/api/guides";

  return apiFetch<Guide[]>(url);
}

export async function fetchGuidesByEquipment(
  equipmentId: string
): Promise<Guide[]> {
  return apiFetch<Guide[]>(
    `/api/guides?equipment_id=${encodeURIComponent(equipmentId)}`
  );
}

export async function fetchGuideById(
  id: string
): Promise<GuideWithRelations | null> {
  try {
    return await apiFetch<GuideWithRelations>(
      `/api/guides?id=${encodeURIComponent(id)}`
    );
  } catch {
    return null;
  }
}

export type SearchResult = {
  guides: (Guide & { equipment?: Equipment })[];
  equipment: Equipment[];
};

export async function searchAll(
  query: string
): Promise<SearchResult> {
  const q = query.trim();

  if (!q) {
    return { guides: [], equipment: [] };
  }

  return apiFetch<SearchResult>(
    `/api/search?q=${encodeURIComponent(q)}`
  );
}

// ---------------- BOOKMARKS ----------------

const LOCAL_BOOKMARKS_KEY = "marinefix_local_bookmarks";

function getLocalBookmarkIds(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalBookmarkIds(ids: string[]) {
  try {
    localStorage.setItem(
      LOCAL_BOOKMARKS_KEY,
      JSON.stringify(ids)
    );
  } catch (e) {
    console.error("LocalStorage save error:", e);
  }
}

export async function fetchBookmarkIds(): Promise<string[]> {
  try {
    const res = await apiFetch<{ ids: string[] }>(
      "/api/bookmarks?ids_only=true"
    );

    const serverIds = res.ids || [];
    const localIds = getLocalBookmarkIds();

    // Keep local-only bookmarks available for offline use.
    const merged = Array.from(
      new Set([...serverIds, ...localIds])
    );

    saveLocalBookmarkIds(merged);

    return merged;
  } catch {
    return getLocalBookmarkIds();
  }
}

export async function fetchBookmarkedGuides(): Promise<
  GuideWithRelations[]
> {
  try {
    const serverGuides =
      await apiFetch<GuideWithRelations[]>("/api/bookmarks");

    // An empty server list is valid when there are no bookmarks.
    if (serverGuides && serverGuides.length > 0) {
      return serverGuides;
    }
  } catch (err) {
    console.warn(
      "Server bookmark fetch failed, using offline guides:",
      err
    );
  }

  // TRUE OFFLINE FALLBACK
  const offlineGuides = getOfflineGuides();

  return Object.values(offlineGuides) as GuideWithRelations[];
}

export async function addBookmark(
  guideId: string
): Promise<void> {
  const localIds = getLocalBookmarkIds();

  if (!localIds.includes(guideId)) {
    saveLocalBookmarkIds([...localIds, guideId]);
  }

  try {
    await apiFetch("/api/bookmarks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        guide_id: guideId,
      }),
    });
  } catch (err) {
    console.warn(
      "Backend bookmark sync failed, preserved locally:",
      err
    );
  }
}

export async function removeBookmark(
  guideId: string
): Promise<void> {
  const localIds = getLocalBookmarkIds().filter(
    (id) => id !== guideId
  );

  saveLocalBookmarkIds(localIds);

  try {
    await apiFetch(
      `/api/bookmarks?guide_id=${encodeURIComponent(guideId)}`,
      {
        method: "DELETE",
      }
    );
  } catch (err) {
    console.warn(
      "Backend bookmark delete sync failed:",
      err
    );
  }
}

// ---------------- UPLOAD ----------------

export async function uploadImage(
  file: File
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${API_BASE_URL}/api/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error("Failed to upload image to R2");
  }

  const data = (await res.json()) as {
    url: string;
  };

  return data.url;
}

// ---------------- GUIDE CREATE ----------------

export async function createGuide(input: {
  equipment_id: string;
  title: string;
  author_email?: string;
  author_phone?: string;
  symptom?: string;
  safety_ppe?: string[];
  tools_required?: string[];
  introduction?: string;

  steps: {
    title: string;
    instruction: string;
    warning?: string;
    images?: any[];
  }[];

  image_urls: {
    url: string;
    caption?: string;
  }[];

  status?: string;
  is_approved?: boolean;
}): Promise<Guide> {
  return apiFetch<Guide>("/api/guides", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

// ---------------- ADMIN ----------------

export async function getPendingGuides(): Promise<
  (Guide & { equipment?: Equipment })[]
> {
  return apiFetch<
    (Guide & { equipment?: Equipment })[]
  >("/api/guides?pending=true");
}

export async function approveGuide(
  guideId: string
): Promise<void> {
  await apiFetch("/api/guides", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: guideId,
      action: "approve",
    }),
  });
}

export async function rejectGuide(
  guideId: string
): Promise<void> {
  await apiFetch("/api/guides", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: guideId,
      action: "reject",
    }),
  });
}

// ---------------- FEEDBACK ----------------

export type FeedbackType =
  | "feedback"
  | "bug"
  | "feature";

export async function submitFeedback(input: {
  type: FeedbackType;
  rating: number;
  message: string;
  email?: string;
}): Promise<void> {
  await apiFetch("/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...input,

      page:
        typeof window !== "undefined"
          ? window.location.pathname
          : "home",

      device:
        typeof window !== "undefined" &&
        (window.location.protocol === "capacitor:" ||
          window.location.protocol === "file:")
          ? "android-app"
          : "web",
    }),
  });
}
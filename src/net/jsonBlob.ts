/**
 * Shared JSONBlob client helpers.
 *
 * jsonblob.com currently expires new blobs in ~24h (see x-jsonblob-expires-at).
 * Hardcoded bootstrap URLs therefore go 404 regularly. These helpers:
 *  1. Try the bootstrap URL, then a localStorage-cached URL
 *  2. On GET 404, POST a fresh blob seeded with local data and cache its URL
 *  3. Retry transient 429 / 408 / 5xx failures
 *
 * After a recreate storm, browsers may temporarily diverge onto different blob
 * IDs until the next deploy refreshes the shared bootstrap URL — but stores
 * stay writable instead of permanently dead.
 */

export const JSONBLOB_API = "https://jsonblob.com/api/jsonBlob";

const BLOB_ATTEMPTS = 4;
const BLOB_RETRY_BASE_MS = 250;

export function jsonBlobUrl(idOrPath: string): string {
  if (/^https?:\/\//i.test(idOrPath)) return idOrPath.replace(/\/?$/, "");
  const id = idOrPath.replace(/^\/api\/jsonBlob\//, "").replace(/^\//, "");
  return `${JSONBLOB_API}/${id}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

function readCachedUrl(cacheKey: string): string | null {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const url = String(raw).trim();
    return url.startsWith("http") ? url.replace(/\/?$/, "") : null;
  } catch {
    return null;
  }
}

function writeCachedUrl(cacheKey: string, url: string): void {
  try {
    localStorage.setItem(cacheKey, url.replace(/\/?$/, ""));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Candidate URLs: bootstrap first (shared), then any per-browser cache. */
export function candidateBlobUrls(bootstrapUrl: string, cacheKey: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [bootstrapUrl, readCachedUrl(cacheKey) ?? ""]) {
    const url = raw ? jsonBlobUrl(raw) : "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

async function fetchOnce(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < BLOB_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        ...init,
        headers: {
          Accept: "application/json",
          ...(init?.headers ?? {}),
        },
      });
      if (shouldRetryStatus(res.status) && attempt < BLOB_ATTEMPTS - 1) {
        await sleep(BLOB_RETRY_BASE_MS * 2 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < BLOB_ATTEMPTS - 1) {
        await sleep(BLOB_RETRY_BASE_MS * 2 ** attempt);
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("blob fetch failed");
}

/**
 * POST a new blob. Returns the absolute URL from Location (or constructed id).
 */
export async function createJsonBlob(seed: unknown): Promise<string> {
  const res = await fetchOnce(JSONBLOB_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(seed ?? {}),
  });
  if (res.status !== 201 && !res.ok) {
    throw new Error(`create blob failed: ${res.status}`);
  }
  const loc = res.headers.get("Location") || res.headers.get("location");
  if (loc) {
    if (/^https?:\/\//i.test(loc)) return loc.replace(/\/?$/, "");
    // Relative Location: /api/jsonBlob/<id>
    return jsonBlobUrl(loc);
  }
  try {
    const data = (await res.json()) as { id?: unknown };
    if (data?.id) return jsonBlobUrl(String(data.id));
  } catch {
    /* fall through */
  }
  throw new Error("create blob missing Location");
}

export type LiveBlob = {
  url: string;
  /** True when we had to POST a replacement after 404. */
  recreated: boolean;
};

/**
 * Resolve a live blob URL. Tries bootstrap + cached; on all 404s, creates a
 * new blob seeded with `seed` and caches it under `cacheKey`.
 */
export async function ensureLiveBlob(
  bootstrapUrl: string,
  cacheKey: string,
  seed: unknown,
): Promise<LiveBlob> {
  const candidates = candidateBlobUrls(bootstrapUrl, cacheKey);
  let saw404 = false;

  for (const url of candidates) {
    const res = await fetchOnce(url);
    if (res.ok) {
      writeCachedUrl(cacheKey, url);
      return { url, recreated: false };
    }
    if (res.status === 404) {
      saw404 = true;
      continue;
    }
    // Non-404 hard failure on a known URL — still prefer recreating over hanging offline
    if (res.status === 410 || res.status === 403) {
      saw404 = true;
      continue;
    }
    throw new Error(String(res.status));
  }

  if (!saw404 && candidates.length === 0) {
    /* no candidates — create */
  }

  const created = await createJsonBlob(seed);
  writeCachedUrl(cacheKey, created);
  return { url: created, recreated: true };
}

/** GET JSON from a live blob, recreating on 404 with seed. */
export async function getJsonBlob<T = unknown>(
  bootstrapUrl: string,
  cacheKey: string,
  seed: unknown,
): Promise<{ data: T; url: string; recreated: boolean }> {
  const live = await ensureLiveBlob(bootstrapUrl, cacheKey, seed);
  const res = await fetchOnce(live.url);
  if (res.status === 404) {
    // Race: expired between ensure and get — create once more.
    const created = await createJsonBlob(seed);
    writeCachedUrl(cacheKey, created);
    return { data: seed as T, url: created, recreated: true };
  }
  if (!res.ok) throw new Error(String(res.status));
  return { data: (await res.json()) as T, url: live.url, recreated: live.recreated };
}

/** PUT JSON to the active blob URL, recreating + retrying once on 404. */
export async function putJsonBlob(
  bootstrapUrl: string,
  cacheKey: string,
  body: unknown,
  opts: { keepalive?: boolean } = {},
): Promise<{ data: unknown; url: string }> {
  const live = await ensureLiveBlob(bootstrapUrl, cacheKey, body);

  const putOnce = async (url: string) =>
    fetchOnce(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: opts.keepalive,
    });

  let res = await putOnce(live.url);
  if (res.status === 404) {
    const created = await createJsonBlob(body);
    writeCachedUrl(cacheKey, created);
    res = await putOnce(created);
    if (!res.ok) throw new Error(String(res.status));
    try {
      return { data: await res.json(), url: created };
    } catch {
      return { data: body, url: created };
    }
  }
  if (!res.ok) throw new Error(String(res.status));
  writeCachedUrl(cacheKey, live.url);
  try {
    return { data: await res.json(), url: live.url };
  } catch {
    return { data: body, url: live.url };
  }
}

/** Test seams (node verify scripts). */
export const __jsonBlobTest = {
  jsonBlobUrl,
  candidateBlobUrls,
  shouldRetryStatus,
  BLOB_ATTEMPTS,
};

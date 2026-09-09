import type { Recall, RecallClassification } from "../types/recall";
import { buildDietaryPredicate, type DietaryConcern, matchesDietaryConcerns } from "./dietary";
import { mockRecalls } from "./mockData";
import { buildReasonCategoryPredicate, categorizeReason, isReasonCategory } from "./reasonCategory";
import { STATE_NAMES } from "./usStates";

interface OpenFDARecord {
  recall_number?: string;
  event_id?: string;
  product_description?: string;
  reason_for_recall?: string;
  classification?: RecallClassification;
  status?: string;
  distribution_pattern?: string;
  recalling_firm?: string;
  city?: string;
  state?: string;
  country?: string;
  recall_initiation_date?: string;
  report_date?: string;
  product_type?: string;
  code_info?: string;
  more_code_info?: string;
  voluntary_mandated?: string;
  address_1?: string;
  address_2?: string;
  postal_code?: string;
  center_classification_date?: string;
  initial_firm_notification?: string;
  product_quantity?: string;
  termination_date?: string;
}

const KNOWN_CLASSIFICATIONS = new Set(["Class I", "Class II", "Class III", "Not Yet Classified"]);

function normalizeClassification(raw?: string): RecallClassification {
  if (!raw || typeof raw !== "string") return "Unknown";
  const trimmed = raw.trim();
  if (KNOWN_CLASSIFICATIONS.has(trimmed)) return trimmed as RecallClassification;
  if (trimmed === "") return "Unknown";
  return "Unknown";
}

function normalizeStatus(raw?: string): string {
  if (!raw || typeof raw !== "string" || raw.trim() === "") return "Unknown";
  return raw.trim();
}

function stableId(r: Omit<Recall, "id">): string {
  if (r.recallNumber.trim()) return r.recallNumber.trim();
  // An event can contain distinct products/lots. Without a recall number,
  // identify the full normalized record, whose field order is fixed below.
  // Literal JSON avoids hash/delimiter collisions. Changed source fields create
  // a new internal key; this key is never a fabricated FDA recall number.
  return `source:${JSON.stringify(r)}`;
}

function mapOpenFDA(r: OpenFDARecord): Recall | null {
  if (!r || typeof r !== "object") return null;
  // Preserve missing as unknown, do not invent
  const rawClassification = typeof r.classification === "string" ? r.classification : undefined;
  const rawStatus = typeof r.status === "string" ? r.status : undefined;
  const record: Omit<Recall, "id"> = {
    recallNumber: typeof r.recall_number === "string" ? r.recall_number : "",
    eventId: typeof r.event_id === "string" ? r.event_id : "",
    productDescription: typeof r.product_description === "string" ? r.product_description : "",
    reasonForRecall: typeof r.reason_for_recall === "string" ? r.reason_for_recall : "",
    classification: normalizeClassification(rawClassification),
    status: normalizeStatus(rawStatus),
    distributionPattern: typeof r.distribution_pattern === "string" ? r.distribution_pattern : "",
    recallingFirm: typeof r.recalling_firm === "string" ? r.recalling_firm : "",
    city: typeof r.city === "string" ? r.city : "",
    state: typeof r.state === "string" ? r.state : "",
    country: typeof r.country === "string" ? r.country : "",
    recallInitiationDate:
      typeof r.recall_initiation_date === "string"
        ? r.recall_initiation_date
        : typeof r.report_date === "string"
          ? r.report_date
          : "",
    productType: typeof r.product_type === "string" ? r.product_type : "",
    codeInfo: typeof r.code_info === "string" ? r.code_info : "",
    moreCodeInfo: typeof r.more_code_info === "string" ? r.more_code_info : "",
    voluntaryMandated: typeof r.voluntary_mandated === "string" ? r.voluntary_mandated : "",
    rawClassification,
    rawStatus,
    address1: typeof r.address_1 === "string" ? r.address_1 : "",
    address2: typeof r.address_2 === "string" ? r.address_2 : "",
    postalCode: typeof r.postal_code === "string" ? r.postal_code : "",
    centerClassificationDate: typeof r.center_classification_date === "string" ? r.center_classification_date : "",
    initialFirmNotification: typeof r.initial_firm_notification === "string" ? r.initial_firm_notification : "",
    productQuantity: typeof r.product_quantity === "string" ? r.product_quantity : "",
    terminationDate: typeof r.termination_date === "string" ? r.termination_date : "",
  };
  return { id: stableId(record), ...record };
}

export function sanitizeSearchQuery(query: string): string {
  return query.replace(/["\\]/g, "").trim();
}

export function matchesDistributionPattern(distributionPattern: string, selectedState: string): boolean {
  if (!selectedState) return true;
  const pattern = distributionPattern.toLowerCase();
  if (!pattern || pattern.trim() === "") return false; // unclear, not matching specific state
  // Nationwide is potentially relevant to any state
  if (pattern.includes("nationwide") || pattern.includes("national distribution") || pattern.includes("nationwide -")) {
    return true;
  }
  if (selectedState === "Nationwide") {
    return pattern.includes("nationwide") || pattern.includes("national");
  }
  // Bounded abbreviation match: \bCA\b etc. (case-sensitive for abbreviations to avoid matching English words like "in" for IN)
  const abbr = selectedState;
  const full = STATE_NAMES[selectedState] || "";
  const abbrRegex = new RegExp(`\\b${abbr}\\b`);
  if (abbrRegex.test(distributionPattern)) return true;
  if (full && new RegExp(`\\b${full}\\b`, "i").test(distributionPattern)) return true;
  return false;
}

export function isDistributionUnclear(distributionPattern: string): boolean {
  const p = distributionPattern.trim().toLowerCase();
  if (!p) return true;
  if (p === "n/a" || p === "unknown" || p.includes("direct to consumer") || p.includes("retail only")) {
    // Consider ambiguous/region-only as unclear if no state abbreviation or nationwide present
    const hasState = Object.keys(STATE_NAMES).some(
      (abbr) =>
        new RegExp(`\\b${abbr}\\b`, "i").test(distributionPattern) ||
        new RegExp(`\\b${STATE_NAMES[abbr]}\\b`, "i").test(distributionPattern),
    );
    const hasNationwide = p.includes("nationwide") || p.includes("national");
    return !hasState && !hasNationwide;
  }
  return false;
}

/**
 * Build the cross-field OR clause grouped in parentheses.
 */
export function buildGroupedSearchClause(search: string): string | null {
  const sanitized = sanitizeSearchQuery(search);
  if (!sanitized) return null;
  const fields = ["product_description", "reason_for_recall", "recalling_firm"];
  const inner = fields.map((f) => `${f}:"${sanitized}"`).join(" OR ");
  return `(${inner})`;
}

/**
 * Build the full search= value with grouped OR and optional predicates composed outside via AND.
 */
export function buildSearchParam(search: string, predicates: string[] = []): string | null {
  const grouped = buildGroupedSearchClause(search);
  const parts: string[] = [];
  if (grouped) parts.push(grouped);
  parts.push(...predicates.filter(Boolean));
  if (parts.length === 0) return null;
  return parts.join(" AND ");
}

const CACHE_KEY = "ponder:openfda:cache";
const SYNC_KEY = "ponder:openfda:lastSynced";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

/**
 * Build a collision-free cache key using JSON.stringify of a tuple.
 * Dietary array is sorted so [milk, eggs] and [eggs, milk] produce the same key.
 */
export function buildCacheKey(
  search: string,
  classification: string,
  status: string,
  state: string,
  dietary: string[],
  limit: number,
  skip: number,
  hazard: string,
): string {
  const sortedDietary = [...dietary].sort();
  return JSON.stringify([
    sanitizeSearchQuery(search),
    classification,
    status,
    state,
    sortedDietary,
    limit,
    skip,
    hazard,
  ]);
}

/** openFDA rejects skip above this; deeper pages use Link / search_after. */
export const OPENFDA_SKIP_CAP = 25000;
/** Uncached jumps past the skip window walk this many cursor hops, then stop with a clear error. */
const MAX_SEARCH_AFTER_HOPS = 32;

type CachedPage = { recalls: Recall[]; total: number; nextUrl?: string | null };

interface CacheEntry {
  key: string;
  data: CachedPage;
  timestamp: number;
}

const nextUrlByCacheKey = new Map<string, string>();

function getCache(cacheKey: string): CachedPage | null {
  const entry = getCacheEntry(cacheKey);
  return entry ? entry.data : null;
}

function getCacheEntry(cacheKey: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entries: CacheEntry[] = JSON.parse(raw);
    const hit = entries.find((e) => e.key === cacheKey);
    if (!hit) return null;
    if (Date.now() - hit.timestamp > CACHE_TTL_MS) return null;
    return hit;
  } catch {
    return null;
  }
}

function setCache(cacheKey: string, data: CachedPage): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const entries: CacheEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = entries.filter((e) => e.key !== cacheKey);
    filtered.unshift({ key: cacheKey, data, timestamp: Date.now() });
    localStorage.setItem(CACHE_KEY, JSON.stringify(filtered.slice(0, 20)));
    localStorage.setItem(SYNC_KEY, new Date().toISOString());
  } catch {}
}

export function getLastSynced(): string | null {
  try {
    return localStorage.getItem(SYNC_KEY);
  } catch {
    return null;
  }
}

export function clearCache(): void {
  nextUrlByCacheKey.clear();
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(SYNC_KEY);
  } catch {}
}

export function isDemoMode(): boolean {
  try {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (params.get("demo") === "1" || params.get("demo") === "true") return true;
    if (localStorage.getItem("ponder:demo") === "1") return true;
    if ((import.meta as unknown as { env: Record<string, string> }).env?.VITE_DEMO === "true") return true;
  } catch {}
  return false;
}

export type FetchError = {
  code: "NOT_FOUND" | "RATE_LIMIT" | "TIMEOUT" | "NETWORK" | "SERVER" | "BAD_REQUEST" | "MALFORMED";
  message: string;
  status?: number;
  retryable: boolean;
};

export type FetchResult = {
  recalls: Recall[];
  total: number;
  error: FetchError | null;
  isStale: boolean;
  lastSynced: string | null;
  isDemo: boolean;
  /** openFDA Link rel=next URL (includes search_after) when present. */
  nextCursor?: string | null;
};

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(
  url: string,
  timeoutMs = FETCH_TIMEOUT_MS,
  outerSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function parseErrorCode(status: number, body: unknown): FetchError {
  const msg =
    typeof body === "object" && body !== null && "error" in body
      ? String((body as { error: { message?: string } }).error.message || "")
      : "";
  // openFDA returns HTTP 404 + "No matches found" for empty result sets — expected, not an outage.
  if (status === 404 && /no matches/i.test(msg)) {
    return { code: "NOT_FOUND", message: "No matches found", status, retryable: false };
  }
  if (status === 429) return { code: "RATE_LIMIT", message: "Rate limited — retry shortly", status, retryable: true };
  if (status === 400) return { code: "BAD_REQUEST", message: msg || "Bad request", status, retryable: false };
  if (status >= 500) return { code: "SERVER", message: msg || `Server error ${status}`, status, retryable: true };
  return {
    code: "SERVER",
    message: msg || `Request failed ${status}`,
    status,
    retryable: status >= 500 || status === 429,
  };
}

/**
 * Extract rel="next" from an openFDA Link header.
 * @see https://open.fda.gov/apis/paging/
 */
export function parseOpenFdaLinkNext(linkHeader: string | null | undefined): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const trimmed = part.trim();
    const urlMatch = trimmed.match(/^<([^>]+)>/);
    if (!urlMatch) continue;
    const relMatch = trimmed.match(/\brel\s*=\s*"?([^";,\s]+)"?/i);
    if (relMatch && relMatch[1].toLowerCase() === "next") {
      return urlMatch[1];
    }
  }
  return null;
}

function linkNextFromResponse(res: Response): string | null {
  const raw = res.headers?.get?.("link") ?? null;
  return parseOpenFdaLinkNext(raw);
}

function rememberNextUrl(cacheKey: string, res: Response): string | null {
  const next = linkNextFromResponse(res);
  if (next) nextUrlByCacheKey.set(cacheKey, next);
  else nextUrlByCacheKey.delete(cacheKey);
  return next;
}

function peekNextUrl(cacheKey: string): string | null {
  const memory = nextUrlByCacheKey.get(cacheKey);
  if (memory) return memory;
  const fromCache = getCache(cacheKey)?.nextUrl;
  if (fromCache) {
    nextUrlByCacheKey.set(cacheKey, fromCache);
    return fromCache;
  }
  return null;
}

function enforcementEndpoints(): { proxyBase: string; directBase: string; isBrowser: boolean } {
  const isBrowser = typeof window !== "undefined" && window.location.origin !== "null";
  const proxyBase = isBrowser
    ? `${window.location.origin}/api/food/enforcement.json`
    : "https://api.fda.gov/food/enforcement.json";
  const directBase = "https://api.fda.gov/food/enforcement.json";
  return { proxyBase, directBase, isBrowser };
}

function buildSkipQuery(limit: number, skip: number, searchParam: string | null): string {
  let q = `?limit=${limit}&skip=${skip}&sort=report_date:desc`;
  if (searchParam) q += `&search=${encodeURIComponent(searchParam)}`;
  return q;
}

function rewriteFdaUrlToProxy(fdaUrl: string, proxyBase: string, directBase: string): string {
  if (fdaUrl.startsWith(directBase)) {
    return proxyBase + fdaUrl.slice(directBase.length);
  }
  try {
    const parsed = new URL(fdaUrl);
    if (parsed.hostname === "api.fda.gov" && parsed.pathname.includes("/food/enforcement.json")) {
      return `${proxyBase}${parsed.search}`;
    }
  } catch {
    /* keep original */
  }
  return fdaUrl;
}

function cursorRequestUrls(cursorUrl: string): { preferredUrl: string; fallbackUrl: string | null } {
  const { proxyBase, directBase, isBrowser } = enforcementEndpoints();
  const preferredUrl = isBrowser ? rewriteFdaUrlToProxy(cursorUrl, proxyBase, directBase) : cursorUrl;
  const fallbackUrl = preferredUrl !== cursorUrl ? cursorUrl : null;
  return { preferredUrl, fallbackUrl };
}

function skipRequestUrls(
  limit: number,
  skip: number,
  searchParam: string | null,
): { preferredUrl: string; fallbackUrl: string | null } {
  const { proxyBase, directBase, isBrowser } = enforcementEndpoints();
  const query = buildSkipQuery(limit, skip, searchParam);
  const preferredUrl = `${proxyBase}${query}`;
  const fallbackUrl = isBrowser && proxyBase !== directBase ? `${directBase}${query}` : null;
  return { preferredUrl, fallbackUrl };
}

async function fetchEnforcementResponse(
  preferredUrl: string,
  fallbackUrl: string | null,
  signal?: AbortSignal,
): Promise<Response> {
  const fallback = fallbackUrl && fallbackUrl !== preferredUrl ? fallbackUrl : null;
  let res: Response;
  try {
    res = await fetchWithTimeout(preferredUrl, FETCH_TIMEOUT_MS, signal);
    const contentType = res.headers?.get?.("content-type") ?? null;
    const isSpaCatchAll = res.ok && contentType !== null && !contentType.includes("application/json");
    if (fallback && ((!res.ok && res.status === 404) || isSpaCatchAll)) {
      res = await fetchWithTimeout(fallback, FETCH_TIMEOUT_MS, signal);
    }
  } catch (e) {
    if (fallback && !(e instanceof DOMException && e.name === "AbortError")) {
      res = await fetchWithTimeout(fallback, FETCH_TIMEOUT_MS, signal);
    } else {
      throw e;
    }
  }
  return res;
}

function staleOrEmpty(cached: CachedPage | null, cachedEntry: CacheEntry | null, err: FetchError): FetchResult {
  if (cached && cachedEntry) {
    return {
      recalls: cached.recalls,
      total: cached.total,
      error: err,
      isStale: true,
      lastSynced: new Date(cachedEntry.timestamp).toISOString(),
      isDemo: false,
      nextCursor: cached.nextUrl ?? peekNextUrl(cachedEntry.key),
    };
  }
  return {
    recalls: [],
    total: 0,
    error: err,
    isStale: false,
    lastSynced: getLastSynced(),
    isDemo: false,
    nextCursor: null,
  };
}

async function interpretEnforcementResponse(
  res: Response,
  cacheKey: string,
  cachedEntry: CacheEntry | null,
): Promise<FetchResult> {
  const cached = cachedEntry?.data ?? null;
  const nextCursor = rememberNextUrl(cacheKey, res);
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const err = parseErrorCode(res.status, body);
    if (err.code === "NOT_FOUND") {
      setCache(cacheKey, { recalls: [], total: 0, nextUrl: nextCursor });
      return {
        recalls: [],
        total: 0,
        error: null,
        isStale: false,
        lastSynced: getLastSynced(),
        isDemo: false,
        nextCursor,
      };
    }
    return staleOrEmpty(cached, cachedEntry, err);
  }
  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    const err: FetchError = { code: "MALFORMED", message: "Invalid JSON in FDA response", retryable: true };
    return staleOrEmpty(cached, cachedEntry, err);
  }
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { results?: unknown }).results)) {
    const err: FetchError = {
      code: "MALFORMED",
      message: "Malformed FDA response: missing results array",
      retryable: true,
    };
    return staleOrEmpty(cached, cachedEntry, err);
  }
  const data = raw as {
    results: unknown[];
    meta?: { results?: { total?: unknown; skip?: unknown; limit?: unknown } };
  };
  if (data.meta?.results) {
    const m = data.meta.results;
    if (
      (m.total !== undefined && typeof m.total !== "number") ||
      (m.skip !== undefined && typeof m.skip !== "number") ||
      (m.limit !== undefined && typeof m.limit !== "number")
    ) {
      const err: FetchError = {
        code: "MALFORMED",
        message: "Malformed FDA response: invalid pagination meta",
        retryable: true,
      };
      return staleOrEmpty(cached, cachedEntry, err);
    }
  }
  const mapped = (data.results as OpenFDARecord[]).map(mapOpenFDA).filter((r): r is Recall => r !== null);
  const seen = new Set<string>();
  const recalls: Recall[] = [];
  for (const r of mapped) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      recalls.push(r);
    }
  }
  const total = typeof data.meta?.results?.total === "number" ? data.meta.results.total : recalls.length;
  setCache(cacheKey, { recalls, total, nextUrl: nextCursor });
  return { recalls, total, error: null, isStale: false, lastSynced: getLastSynced(), isDemo: false, nextCursor };
}

async function loadEnforcementPage(
  preferredUrl: string,
  fallbackUrl: string | null,
  cacheKey: string,
  signal?: AbortSignal,
): Promise<FetchResult> {
  const cachedEntry = getCacheEntry(cacheKey);
  const res = await fetchEnforcementResponse(preferredUrl, fallbackUrl, signal);
  return interpretEnforcementResponse(res, cacheKey, cachedEntry);
}

function cursorMissingResult(total: number, message: string, asError: boolean): FetchResult {
  return {
    recalls: [],
    total,
    error: asError
      ? {
          code: "BAD_REQUEST",
          message,
          status: 400,
          retryable: false,
        }
      : null,
    isStale: false,
    lastSynced: getLastSynced(),
    isDemo: false,
    nextCursor: null,
  };
}

export async function fetchRecalls(params?: {
  search?: string;
  limit?: number;
  skip?: number;
  classification?: string;
  status?: string;
  state?: string;
  dietary?: string[];
  /** Reason category name from reasonCategory.ts; filters reason_for_recall server-side. */
  hazard?: string;
  signal?: AbortSignal;
}): Promise<FetchResult> {
  const limit = params?.limit ?? 20;
  const skip = params?.skip ?? 0;
  const search = params?.search || "";
  const classification = params?.classification || "";
  const status = params?.status || "";
  const state = params?.state || "";
  const dietary = params?.dietary || [];
  const hazard = params?.hazard || "";
  const predicates: string[] = [];
  if (classification) predicates.push(`classification:"${sanitizeSearchQuery(classification)}"`);
  if (hazard && isReasonCategory(hazard)) predicates.push(buildReasonCategoryPredicate(hazard));
  if (status) predicates.push(`status:"${sanitizeSearchQuery(status)}"`);
  if (state) {
    if (state === "Nationwide") {
      predicates.push(`distribution_pattern:"Nationwide"`);
    } else {
      predicates.push(
        `(distribution_pattern:"${sanitizeSearchQuery(state)}" OR distribution_pattern:"Nationwide" OR distribution_pattern:"national")`,
      );
    }
  }
  if (dietary.length > 0) {
    const dp = buildDietaryPredicate(dietary as DietaryConcern[]);
    if (dp) predicates.push(dp);
  }
  const searchParam = buildSearchParam(search, predicates);
  const cacheKey = buildCacheKey(search, classification, status, state, dietary, limit, skip, hazard);
  const cachedEntry = getCacheEntry(cacheKey);
  const cached = cachedEntry?.data ?? null;
  const demo = isDemoMode();
  const keyForSkip = (pageSkip: number) =>
    buildCacheKey(search, classification, status, state, dietary, limit, pageSkip, hazard);

  // Demo mode: explicit, conspicuously fictional data — filter before slicing
  if (demo) {
    const q = sanitizeSearchQuery(search).toLowerCase();
    let filtered = mockRecalls.map((r) => ({
      ...r,
      productDescription: `DEMO — Fictional — ${r.productDescription}`,
      recallNumber: `DEMO-${r.recallNumber}`,
    }));
    if (q) {
      filtered = filtered.filter((r) =>
        `${r.productDescription} ${r.reasonForRecall} ${r.recallingFirm}`.toLowerCase().includes(q),
      );
    }
    if (classification) filtered = filtered.filter((r) => r.classification === classification);
    if (status) filtered = filtered.filter((r) => r.status.toLowerCase() === status.toLowerCase());
    if (state) filtered = filtered.filter((r) => matchesDistributionPattern(r.distributionPattern, state));
    if (dietary.length > 0) filtered = filtered.filter((r) => matchesDietaryConcerns(r, dietary as DietaryConcern[]));
    if (hazard) filtered = filtered.filter((r) => categorizeReason(r.reasonForRecall) === hazard);
    const total = filtered.length;
    const paged = filtered.slice(skip, skip + limit);
    return { recalls: paged, total, error: null, isStale: false, lastSynced: getLastSynced(), isDemo: true };
  }

  try {
    if (params?.signal?.aborted) {
      const err: FetchError = { code: "NETWORK", message: "Aborted", retryable: false };
      return { recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false };
    }

    let preferredUrl: string;
    let fallbackUrl: string | null;
    // Under-cap: skip/limit as before. Over-cap: openFDA Link / search_after (skip cannot exceed 25,000).
    if (skip <= OPENFDA_SKIP_CAP) {
      const urls = skipRequestUrls(limit, skip, searchParam);
      preferredUrl = urls.preferredUrl;
      fallbackUrl = urls.fallbackUrl;
    } else {
      let cursorUrl: string | null = null;
      let cursorPageSkip = skip;
      for (let prev = skip - limit; prev >= 0; prev -= limit) {
        const stored = peekNextUrl(keyForSkip(prev));
        if (stored) {
          cursorUrl = stored;
          cursorPageSkip = prev + limit;
          break;
        }
        if (prev <= OPENFDA_SKIP_CAP) break;
      }
      if (!cursorUrl) {
        let seedSkip = skip;
        while (seedSkip > OPENFDA_SKIP_CAP) seedSkip -= limit;
        if (seedSkip < 0) seedSkip = 0;
        const seedUrls = skipRequestUrls(limit, seedSkip, searchParam);
        const seed = await loadEnforcementPage(
          seedUrls.preferredUrl,
          seedUrls.fallbackUrl,
          keyForSkip(seedSkip),
          params?.signal,
        );
        if (seed.error && !seed.isStale) return seed;
        cursorUrl = seed.nextCursor ?? peekNextUrl(keyForSkip(seedSkip));
        cursorPageSkip = seedSkip + limit;
        if (!cursorUrl) {
          const knownTotal = seed.total;
          const moreRemain = knownTotal > seedSkip + limit;
          return cursorMissingResult(
            knownTotal,
            "openFDA did not return a search_after cursor to page past skip 25,000",
            moreRemain,
          );
        }
      }
      let hops = 0;
      while (cursorUrl && cursorPageSkip < skip) {
        hops += 1;
        if (hops > MAX_SEARCH_AFTER_HOPS) {
          return cursorMissingResult(
            0,
            "Too far past openFDA skip 25,000 without a search_after cursor — page forward from the skip window",
            true,
          );
        }
        const walkUrls = cursorRequestUrls(cursorUrl);
        const walk = await loadEnforcementPage(
          walkUrls.preferredUrl,
          walkUrls.fallbackUrl,
          keyForSkip(cursorPageSkip),
          params?.signal,
        );
        if (walk.error && !walk.isStale) return walk;
        const next = walk.nextCursor ?? peekNextUrl(keyForSkip(cursorPageSkip));
        if (!next) {
          const moreRemain = walk.total > cursorPageSkip + limit;
          return cursorMissingResult(
            walk.total,
            "openFDA search_after cursor ended before the requested page",
            moreRemain,
          );
        }
        cursorUrl = next;
        cursorPageSkip += limit;
      }
      if (!cursorUrl) {
        return cursorMissingResult(0, "openFDA did not return a search_after cursor to page past skip 25,000", true);
      }
      const cursorUrls = cursorRequestUrls(cursorUrl);
      preferredUrl = cursorUrls.preferredUrl;
      fallbackUrl = cursorUrls.fallbackUrl;
    }

    // No api_key in client bundle; server proxy injects OPENFDA_API_KEY when available
    return await loadEnforcementPage(preferredUrl, fallbackUrl, cacheKey, params?.signal);
  } catch (e: unknown) {
    const isAbort = e instanceof DOMException && e.name === "AbortError";
    const err: FetchError = isAbort
      ? { code: "TIMEOUT", message: "Request timed out", retryable: true }
      : { code: "NETWORK", message: e instanceof Error ? e.message : "Network error", retryable: true };
    if (cached && cachedEntry) {
      return {
        recalls: cached.recalls,
        total: cached.total,
        error: err,
        isStale: true,
        lastSynced: new Date(cachedEntry.timestamp).toISOString(),
        isDemo: false,
        nextCursor: cached.nextUrl ?? null,
      };
    }
    return { recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false };
  }
}

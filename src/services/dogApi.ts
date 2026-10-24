import {
  breedSchema,
  paginatedBreedsSchema,
  groupsResponseSchema,
  type Breed,
  type BreedGroup,
} from "@/types/dogApi";

const BASE_URL = (
  process.env.EXPO_PUBLIC_DOG_API_BASE_URL ??
  "https://dogapi.dog/api/v2"
).replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 20000;
const MAX_RETRIES = 3;


export class ApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}


const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const backoffMs = (attempt: number): number =>
  Math.min(8000, 500 * 2 ** attempt) +
  Math.floor(Math.random() * 250);

function buildUrl(
  path: string,
  params?: Record<string, string>,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const query = params
    ? Object.entries(params)
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        )
        .join("&")
    : "";

  return `${BASE_URL}${normalizedPath}${query ? `?${query}` : ""}`;
}

async function getJson(
  url: string,
  attempt = 0,
): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    console.log(
      `DOG API REQUEST [${attempt + 1}/${MAX_RETRIES + 1}]:`,
      url,
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.api+json",
      },
      signal: controller.signal,
    });

    console.log("DOG API HTTP STATUS:", response.status);

    if (!response.ok) {
      const retryable =
        response.status === 429 || response.status >= 500;

      if (retryable && attempt < MAX_RETRIES) {
        console.warn(
          `DOG API HTTP ${response.status}; retrying`,
        );

        await delay(backoffMs(attempt));
        return getJson(url, attempt + 1);
      }

      throw new ApiError(
        `Dog API request failed with HTTP ${response.status}`,
        response.status,
      );
    }

    const json: unknown = await response.json();

    console.log("DOG API JSON RESPONSE RECEIVED");

    return json;
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    const message = timedOut
      ? `Request timed out after ${REQUEST_TIMEOUT_MS}ms`
      : error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);

    const isAbortError =
      error instanceof Error && error.name === "AbortError";

    const retryable =
      timedOut || isAbortError || error instanceof TypeError;

    if (retryable && attempt < MAX_RETRIES) {
      console.warn(
        `DOG API RETRY ${attempt + 1}/${MAX_RETRIES}:`,
        message,
      );

      await delay(backoffMs(attempt));
      return getJson(url, attempt + 1);
    }

    console.error("DOG API REQUEST FAILED:", {
      url,
      attempt: attempt + 1,
      message,
    });

    throw new ApiError(message);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBreedPage(
  page: number,
  size = 48,
): Promise<{
  breeds: Breed[];
  next: number | null;
  total?: number;
}> {
  const url = buildUrl("/breeds", {
    "page[number]": String(page),
    "page[size]": String(size),
  });

  const raw = await getJson(url);
  const parsed = paginatedBreedsSchema.safeParse(raw);

  if (!parsed.success) {
    console.error(
      "BREED RESPONSE VALIDATION FAILED:",
      parsed.error.issues,
    );

    throw new ApiError(
      "Dog API returned an invalid breeds response.",
    );
  }

  const total = parsed.data.meta?.pagination?.records;

  return {
    breeds: parsed.data.data,
    next: parsed.data.meta?.pagination?.next ?? null,
    ...(typeof total === "number" ? { total } : {}),
  };
}

export async function fetchAllBreeds(
  onPage?: (page: number, count: number) => void,
): Promise<Breed[]> {
  const breedsById = new Map<string, Breed>();

  let page: number | null = 1;
  let pagesFetched = 0;

  while (page !== null) {
    const result = await fetchBreedPage(page);

    for (const breed of result.breeds) {
      breedsById.set(breed.id, breed);
    }

    pagesFetched += 1;
    onPage?.(pagesFetched, breedsById.size);

    console.log(
      `BREED PAGE ${pagesFetched} LOADED; UNIQUE BREEDS:`,
      breedsById.size,
    );

    page = result.next;

    if (pagesFetched > 100) {
      throw new ApiError(
        "Breed pagination exceeded the safety limit.",
      );
    }
  }

  return [...breedsById.values()].sort((a, b) =>
    a.attributes.name.localeCompare(b.attributes.name),
  );
}


export async function fetchGroups(): Promise<BreedGroup[]> {
  const url = buildUrl("/groups");

  const raw = await getJson(url);
  const parsed = groupsResponseSchema.safeParse(raw);

  if (!parsed.success) {
    console.error(
      "GROUP RESPONSE VALIDATION FAILED:",
      parsed.error.issues,
    );

    throw new ApiError(
      "Dog API returned an invalid groups response.",
    );
  }

  console.log("BREED GROUPS RECEIVED:", parsed.data.data.length);

  return parsed.data.data;
}


// export async function fetchGroups(): Promise<BreedGroup[]> {
//   const url = buildUrl("/groups", {
//     "page[size]": "1000",
//   });

//   const raw = await getJson(url);
//   const parsed = groupsResponseSchema.safeParse(raw);

//   if (!parsed.success) {
//     console.error(
//       "GROUP RESPONSE VALIDATION FAILED:",
//       parsed.error.issues,
//     );

//     throw new ApiError(
//       "Dog API returned an invalid groups response.",
//     );
//   }

//   return parsed.data.data;
// }

export async function fetchBreedById(id: string): Promise<Breed> {
  const url = buildUrl(`/breeds/${encodeURIComponent(id)}`);
  const raw = await getJson(url);

  const wrapped =
    typeof raw === "object" &&
    raw !== null &&
    "data" in raw
      ? (raw as { data: unknown }).data
      : raw;

  const parsed = breedSchema.safeParse(wrapped);

  if (!parsed.success) {
    console.error(
      "BREED DETAIL VALIDATION FAILED:",
      parsed.error.issues,
    );

    throw new ApiError(
      "Dog API returned an invalid breed detail.",
    );
  }

  return parsed.data;
}

export async function testDogApiConnection(): Promise<void> {
  console.log("DOG API CONNECTIVITY TEST STARTED");

  const result = await fetchBreedPage(1, 5);

  console.log(
    "DOG API CONNECTIVITY TEST SUCCESS:",
    result.breeds.length,
    "breeds returned",
  );
}

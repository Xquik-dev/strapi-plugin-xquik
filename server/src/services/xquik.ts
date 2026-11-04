import { z } from "zod";

const XQUIK_URL = "https://xquik.com";
const API_URL = `${XQUIK_URL}/api/v1/x`;
const REQUEST_TIMEOUT_MS = 30_000;
const NO_USER_IDS = new Set(["", ".", ".."]);

export class XquikError extends Error {
  override readonly name = "XquikError";
  readonly code: string;
  readonly status: number | undefined;

  constructor(
    code: string,
    message: string,
    status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.code = code;
    this.status = status;
  }
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  description?: string;
  followers?: number;
  following?: number;
  verified?: boolean;
  isBlueVerified?: boolean;
  isVerified?: boolean;
  profilePicture?: string;
  profilePictureOriginal?: string;
  coverPicture?: string;
  location?: string;
  url?: string;
  createdAt?: string;
  statusesCount?: number;
  [field: string]: unknown;
}

export interface Post {
  id: string;
  text?: string;
  createdAt?: string;
  url?: string;
  lang?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  quoteCount?: number;
  viewCount?: number;
  bookmarkCount?: number;
  conversationId?: string;
  isReply?: boolean;
  isRetweet?: boolean;
  isQuoteStatus?: boolean;
  author?: UserProfile;
  [field: string]: unknown;
}

export interface PostPage {
  tweets: Post[];
  has_next_page: boolean;
  next_cursor: string;
  [field: string]: unknown;
}

export interface SearchPostsQuery {
  q: string;
  limit?: number;
  cursor?: string;
  queryType?: string;
  [filter: string]: string | number | boolean | undefined;
}

export interface StrapiHandle {
  plugin(name: "xquik"): { config(key: "apiKey"): string };
}

const postPageSchema: z.ZodType<PostPage> = z.looseObject({
  tweets: z.array(z.looseObject({ id: z.string() })),
  has_next_page: z.boolean(),
  next_cursor: z.string(),
});

const userProfileSchema: z.ZodType<UserProfile> = z.looseObject({
  id: z.string(),
  username: z.string(),
  name: z.string(),
});

const failureSchema = z.looseObject({
  error: z.string(),
  message: z.string().optional(),
});

const failureFrom = (status: number, body: unknown): XquikError => {
  const failure = failureSchema.safeParse(body);
  return failure.success
    ? new XquikError(
        failure.data.error,
        failure.data.message ??
          "Xquik rejected the request. Check the error code.",
        status,
      )
    : new XquikError(
        "http_error",
        "Xquik returned an unknown error. Retry later.",
        status,
      );
};

const readApi = async <Body>(
  strapi: StrapiHandle,
  path: string,
  schema: z.ZodType<Body>,
): Promise<Body> => {
  const apiKey = strapi.plugin("xquik").config("apiKey");
  if (apiKey === "") {
    throw new XquikError(
      "missing_api_key",
      `Set XQUIK_API_KEY. Get a key at ${XQUIK_URL}.`,
    );
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers: { accept: "application/json", "x-api-key": apiKey },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    redirect: "error",
  }).catch((cause: unknown) => {
    throw new XquikError(
      "network_error",
      "Xquik did not answer. Check the network and retry.",
      undefined,
      { cause },
    );
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw failureFrom(response.status, body);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new XquikError(
      "invalid_response",
      "Xquik sent an unexpected response. Update the plugin or retry.",
      response.status,
    );
  }
  return parsed.data;
};

const xquikService = ({ strapi }: { strapi: StrapiHandle }) => ({
  searchPosts(query: SearchPostsQuery): Promise<PostPage> {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.set(name, String(value));
      }
    }
    return readApi(
      strapi,
      `/tweets/search?${params.toString()}`,
      postPageSchema,
    );
  },

  getUser(id: string): Promise<UserProfile> {
    if (NO_USER_IDS.has(id)) {
      return Promise.reject(
        new XquikError("invalid_user", "Pass a user ID or username."),
      );
    }
    return readApi(
      strapi,
      `/users/${encodeURIComponent(id)}`,
      userProfileSchema,
    );
  },
});

export default xquikService;

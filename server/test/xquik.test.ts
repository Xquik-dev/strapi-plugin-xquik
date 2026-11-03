import { afterEach, expect, expectTypeOf, mock, test } from "bun:test";

import plugin, { XquikError } from "../src/index";
import type {
  Post,
  PostPage,
  SearchPostsQuery,
  UserProfile,
} from "../src/index";

const API_KEY = "xq_test_key";
const realFetch = globalThis.fetch;

const POST_PAGE = {
  tweets: [
    {
      id: "2102761519985332442",
      text: "This galaxy is a little extra.",
      likeCount: 9775,
      author: { id: "11348282", username: "NASA", name: "NASA" },
      conversationId: "2102761519985332442",
    },
  ],
  has_next_page: true,
  next_cursor: "DAACCgACGRElMJcAAA",
  filtered_count: 0,
};

const PROFILE = {
  id: "11348282",
  username: "NASA",
  name: "NASA",
  followers: 92376187,
  verifiedType: "Government",
};

const createService = (apiKey = API_KEY) =>
  plugin.services.xquik({
    strapi: { plugin: () => ({ config: () => apiKey }) },
  });

const stubFetch = (respond: () => Promise<Response>) => {
  const fake = mock(respond);
  globalThis.fetch = Object.assign(fake, { preconnect: realFetch.preconnect });
  return fake;
};

const stubJson = (status: number, body: unknown) =>
  stubFetch(() => Promise.resolve(Response.json(body, { status })));

const stubHtml = (status: number) =>
  stubFetch(() =>
    Promise.resolve(
      new Response("<html>Bad gateway</html>", {
        status,
        headers: { "content-type": "text/html" },
      }),
    ),
  );

const stubNetworkFailure = () =>
  stubFetch(() => Promise.reject(new TypeError("fetch failed")));

const rejection = async (call: Promise<unknown>): Promise<XquikError> => {
  try {
    await call;
  } catch (error) {
    if (error instanceof XquikError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected the call to reject.");
};

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("searchPosts sends the exact request and keeps unknown fields", async () => {
  const fake = stubJson(200, POST_PAGE);

  const page = await createService().searchPosts({
    q: "from:NASA",
    limit: 2,
    verifiedOnly: true,
    cursor: undefined,
    language: undefined,
  });

  expect(fake).toHaveBeenCalledTimes(1);
  expect(fake).toHaveBeenCalledWith(
    "https://xquik.com/api/v1/x/tweets/search?q=from%3ANASA&limit=2&verifiedOnly=true",
    {
      headers: { accept: "application/json", "x-api-key": API_KEY },
      signal: expect.any(AbortSignal),
      redirect: "error",
    },
  );
  expect(page).toEqual(POST_PAGE);
});

test.each([
  ["@NASA", "https://xquik.com/api/v1/x/users/%40NASA"],
  ["x.com/nasa", "https://xquik.com/api/v1/x/users/x.com%2Fnasa"],
])("getUser encodes %s in the path", async (id, url) => {
  const fake = stubJson(200, PROFILE);

  const profile = await createService().getUser(id);

  expect(fake).toHaveBeenCalledWith(url, expect.anything());
  expect(profile).toEqual(PROFILE);
});

test("an empty key rejects without a request", async () => {
  const fake = stubJson(200, POST_PAGE);

  const error = await rejection(createService("").searchPosts({ q: "NASA" }));

  expect(error.code).toBe("missing_api_key");
  expect(error.status).toBeUndefined();
  expect(error.message).toContain("XQUIK_API_KEY");
  expect(fake).not.toHaveBeenCalled();
});

test("the key is read on every call", async () => {
  stubJson(200, PROFILE);
  let apiKey = "";
  const service = plugin.services.xquik({
    strapi: { plugin: () => ({ config: () => apiKey }) },
  });

  await rejection(service.getUser("NASA"));
  apiKey = API_KEY;

  expect(await service.getUser("NASA")).toEqual(PROFILE);
});

test("a failure body becomes an XquikError with its code and message", async () => {
  stubJson(402, {
    error: "insufficient_credits",
    message: "Add credits to continue.",
  });

  const error = await rejection(createService().getUser("NASA"));

  expect(error.name).toBe("XquikError");
  expect(error.status).toBe(402);
  expect(error.code).toBe("insufficient_credits");
  expect(error.message).toBe("Add credits to continue.");
});

test("a failure body without a message keeps its code", async () => {
  stubJson(429, { error: "rate_limit_exceeded" });

  const error = await rejection(createService().getUser("NASA"));

  expect(error.status).toBe(429);
  expect(error.code).toBe("rate_limit_exceeded");
  expect(error.message).not.toBe("");
});

test("an HTML failure rejects with http_error and the status", async () => {
  stubHtml(502);

  const error = await rejection(createService().getUser("NASA"));

  expect(error.status).toBe(502);
  expect(error.code).toBe("http_error");
});

test("a 200 body without tweets rejects", async () => {
  stubJson(200, { has_next_page: false, next_cursor: "" });

  const error = await rejection(createService().searchPosts({ q: "NASA" }));

  expect(error.status).toBe(200);
  expect(error.code).toBe("invalid_response");
});

test("a 200 body that is not JSON rejects", async () => {
  stubHtml(200);

  const error = await rejection(createService().getUser("NASA"));

  expect(error.status).toBe(200);
  expect(error.code).toBe("invalid_response");
});

test("a failed request rejects with network_error", async () => {
  stubNetworkFailure();

  const error = await rejection(createService().getUser("NASA"));

  expect(error.status).toBeUndefined();
  expect(error.code).toBe("network_error");
});

test.each([
  ["a failure body", () => stubJson(401, { error: "invalid_api_key" })],
  ["an HTML failure", () => stubHtml(502)],
  ["a malformed page", () => stubJson(200, {})],
  ["a failed request", stubNetworkFailure],
])("%s keeps the key out of the error", async (_name, stub) => {
  stub();

  const error = await rejection(createService().searchPosts({ q: "NASA" }));

  expect(error.message).not.toContain(API_KEY);
  expect(String(error.stack)).not.toContain(API_KEY);
});

test("the config default reads XQUIK_API_KEY through env", () => {
  const env = (key: string, fallback: string) =>
    key === "XQUIK_API_KEY" ? API_KEY : fallback;

  expect(plugin.config.default({ env })).toEqual({ apiKey: API_KEY });
  expect(plugin.config.default({ env: (_key, fallback) => fallback })).toEqual({
    apiKey: "",
  });
});

test("the config validator accepts a string and rejects a number", () => {
  expect(() => {
    plugin.config.validator({ apiKey: API_KEY });
  }).not.toThrow();
  expect(() => {
    plugin.config.validator({ apiKey: 42 });
  }).toThrow(TypeError);
});

test("the exported types match the contract", () => {
  type Service = ReturnType<typeof createService>;

  expectTypeOf<Parameters<Service["searchPosts"]>>().toEqualTypeOf<
    [SearchPostsQuery]
  >();
  expectTypeOf<
    Awaited<ReturnType<Service["searchPosts"]>>
  >().toEqualTypeOf<PostPage>();
  expectTypeOf<Parameters<Service["getUser"]>>().toEqualTypeOf<[string]>();
  expectTypeOf<
    Awaited<ReturnType<Service["getUser"]>>
  >().toEqualTypeOf<UserProfile>();

  expectTypeOf<SearchPostsQuery["q"]>().toEqualTypeOf<string>();
  expectTypeOf<SearchPostsQuery["limit"]>().toEqualTypeOf<number | undefined>();
  expectTypeOf<SearchPostsQuery["cursor"]>().toEqualTypeOf<
    string | undefined
  >();
  expectTypeOf<SearchPostsQuery["minLikes"]>().toEqualTypeOf<
    string | number | boolean | undefined
  >();

  expectTypeOf<PostPage["tweets"]>().toEqualTypeOf<Post[]>();
  expectTypeOf<PostPage["has_next_page"]>().toEqualTypeOf<boolean>();
  expectTypeOf<PostPage["next_cursor"]>().toEqualTypeOf<string>();
  expectTypeOf<Post["id"]>().toEqualTypeOf<string>();
  expectTypeOf<Post["text"]>().toEqualTypeOf<string | undefined>();
  expectTypeOf<Post["likeCount"]>().toEqualTypeOf<number | undefined>();
  expectTypeOf<Post["author"]>().toEqualTypeOf<UserProfile | undefined>();

  expectTypeOf<UserProfile["username"]>().toEqualTypeOf<string>();
  expectTypeOf<UserProfile["followers"]>().toEqualTypeOf<number | undefined>();

  expectTypeOf<XquikError["code"]>().toEqualTypeOf<string>();
  expectTypeOf<XquikError["status"]>().toEqualTypeOf<number | undefined>();
});

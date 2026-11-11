import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

import { z } from "zod";

const failure = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
const postPage = z.object({
  tweets: z.array(z.object({ id: z.string() })),
  has_next_page: z.boolean(),
});
const profile = z.object({
  username: z.string(),
  followers: z.number().optional(),
});

const base = new URL(z.string().parse(process.argv[2]));
const started = performance.now();
const startup = AbortSignal.timeout(180_000);

const report = (result: Record<string, unknown>) => {
  process.stdout.write(`${JSON.stringify(result)}\n`);
};

const waitForHealth = async (): Promise<number> => {
  const status = await fetch(new URL("/_health", base), {
    signal: startup,
  }).then(
    (response) => response.status,
    () => 0,
  );
  if (status === 204) {
    return status;
  }
  assert.ok(
    !startup.aborted,
    "Strapi did not answer /_health with 204 within 180 seconds.",
  );
  await delay(1000);
  return waitForHealth();
};

const getJson = async <Body>(path: string, body: z.ZodType<Body>) => {
  const response = await fetch(new URL(`/api/xquik-smoke${path}`, base));
  const json: unknown = await response.json();
  const parsed = body.safeParse(json);
  assert.ok(parsed.success, `${response.status} ${JSON.stringify(json)}`);
  return { status: response.status, body: parsed.data };
};

const health = await waitForHealth();
report({
  check: "health",
  status: health,
  startupSeconds: Math.round((performance.now() - started) / 1000),
});

if (process.env["XQUIK_API_KEY"]) {
  const search = await getJson("/search?q=from%3ANASA&limit=2", postPage);
  assert.equal(search.status, 200);
  const [firstPost] = search.body.tweets;
  assert.ok(firstPost, "Expected at least 1 post from NASA.");
  report({
    check: "searchPosts",
    status: search.status,
    postCount: search.body.tweets.length,
    firstPostId: firstPost.id,
    has_next_page: search.body.has_next_page,
  });

  const user = await getJson("/users/NASA", profile);
  assert.equal(user.status, 200);
  assert.equal(user.body.username.toLowerCase(), "nasa");
  report({
    check: "getUser",
    status: user.status,
    username: user.body.username,
    followers: user.body.followers,
  });
} else {
  const missing = await getJson("/search?q=from%3ANASA&limit=1", failure);
  assert.equal(missing.status, 500, JSON.stringify(missing.body.error));
  assert.equal(missing.body.error.code, "missing_api_key");
  report({
    check: "missing_api_key",
    status: missing.status,
    code: missing.body.error.code,
  });
}

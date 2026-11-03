import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const base = new URL(process.argv[2]);
const started = performance.now();
const startup = AbortSignal.timeout(180_000);

const report = (result) => {
  process.stdout.write(`${JSON.stringify(result)}\n`);
};

const waitForHealth = async () => {
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

const getJson = async (path) => {
  const response = await fetch(new URL(`/api/xquik-smoke${path}`, base));
  return { status: response.status, body: await response.json() };
};

const health = await waitForHealth();
report({
  check: "health",
  status: health,
  startupSeconds: Math.round((performance.now() - started) / 1000),
});

if (process.env.XQUIK_API_KEY) {
  const search = await getJson("/search?q=from%3ANASA&limit=2");
  assert.equal(search.status, 200, JSON.stringify(search.body.error));
  const posts = search.body.tweets;
  assert.ok(posts.length > 0, "Expected at least 1 post from NASA.");
  report({
    check: "searchPosts",
    status: search.status,
    postCount: posts.length,
    firstPostId: posts[0].id,
    has_next_page: search.body.has_next_page,
  });

  const user = await getJson("/users/NASA");
  assert.equal(user.status, 200, JSON.stringify(user.body.error));
  assert.equal(user.body.username.toLowerCase(), "nasa");
  report({
    check: "getUser",
    status: user.status,
    username: user.body.username,
    followers: user.body.followers,
  });
} else {
  const missing = await getJson("/search?q=from%3ANASA&limit=1");
  assert.equal(missing.status, 500, JSON.stringify(missing.body.error));
  assert.equal(missing.body.error.code, "missing_api_key");
  report({
    check: "missing_api_key",
    status: missing.status,
    code: missing.body.error.code,
  });
}

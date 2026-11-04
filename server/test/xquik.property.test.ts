import { afterEach, expect, mock, test } from "bun:test";
import fc from "fast-check";

import plugin, { XquikError } from "../src/index";

const realFetch = globalThis.fetch;
const USERS_PATH = "/api/v1/x/users/";
const REFUSED = ["", ".", ".."];
const PROFILE = { id: "11348282", username: "NASA", name: "NASA" };

const service = () =>
  plugin.services.xquik({
    strapi: { plugin: () => ({ config: () => "xq_test_key" }) },
  });

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("getUser asks for exactly the given user or refuses an ID that names none", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.oneof(fc.constantFrom(...REFUSED), fc.string({ unit: "grapheme" })),
      async (id) => {
        const requested: string[] = [];
        globalThis.fetch = Object.assign(
          mock((input: RequestInfo | URL) => {
            requested.push(
              input instanceof Request ? input.url : String(input),
            );
            return Promise.resolve(Response.json(PROFILE));
          }),
          { preconnect: realFetch.preconnect },
        );
        const outcome = await service()
          .getUser(id)
          .then(
            () => {
              const { pathname } = new URL(requested[0] ?? "");
              return pathname.startsWith(USERS_PATH)
                ? decodeURIComponent(pathname.slice(USERS_PATH.length))
                : `left ${USERS_PATH}`;
            },
            (error: unknown) =>
              error instanceof XquikError ? error.code : "other error",
          );
        expect([outcome, requested.length]).toEqual(
          REFUSED.includes(id) ? ["invalid_user", 0] : [id, 1],
        );
      },
    ),
  );
});

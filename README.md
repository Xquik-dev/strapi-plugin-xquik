# Tweet API Plugin for Strapi 5 by Xquik

Use this Strapi tweet API plugin by Xquik to search tweets & profiles.
It adds an `xquik` service to your Strapi 5 server.

Xquik is the world's fastest and cheapest X (Twitter) scraper service with the most complete X (Twitter) data.
Most other Apify Actors charge before filtering or deduplication.
Xquik charges only for delivered, unique, filter-matching results and never pads rows.
Xquik is independent and not affiliated with X Corp.

<!-- trust:win:start -->

The Xquik REST API read 45 tweets per second on 2026-10-15. That cost $0.15 per 1,000. The fastest of 4 rival Actors read 12.5 per second. The cheapest cost $0.173 per 1,000. [Compare each run](https://xquik.com/benchmarks#benchmark-x-tweet-scraper).

<!-- trust:win:end -->

## Install the Strapi X (Twitter) plugin

You need Strapi 5 & Node.js 20 to 26.

```sh
npm install strapi-plugin-xquik
```

Strapi 5 enables the plugin on its next start.

## Add your API key

Copy a key from [your Xquik account](https://dashboard.xquik.com/en/account?tab=api-keys).
Add it to your app's `.env` file.

```sh
XQUIK_API_KEY=xq_...
```

## Search X (Twitter) posts for your CMS

Call the service from any controller, service or lifecycle hook.

```js
const page = await strapi
  .plugin("xquik")
  .service("xquik")
  .searchPosts({ q: "from:NASA", limit: 10 });
```

Next, read the [search fields](#search-fields), the [error table](#handle-errors) or the [search API reference](https://docs.xquik.com/api-reference/x/search-tweets).

<!-- trust:start -->

## Benchmarks & usage

[![X (Twitter) API p99 server read time](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Frest-p99.json)](https://xquik.com/benchmarks#speed)
[![X (Twitter) API package downloads](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fdownloads.json)](https://xquik.com/benchmarks#downloads)

- 4.9 s p99 REST server read time over 7 days, failures included ([source](https://xquik.com/benchmarks#speed)) <!-- trust:rest-p99 4871 -->
- 64,000+ downloads of Xquik's X (Twitter) API packages across 6 registries ([source](https://xquik.com/benchmarks#downloads)) <!-- trust:downloads 64497 -->

Checked on 2026-11-09. See each number with its date & source on [xquik.com/benchmarks](https://xquik.com/benchmarks) or as [JSON](https://xquik.com/trust.json).

<!-- trust:end -->

## Search fields

`searchPosts(query)` takes these fields.

| Field | Type | Use |
| --- | --- | --- |
| `q` | string | Required. A search query, a post ID or a tweet URL. |
| `limit` | number | Most posts to return, from 1 to 10,000. The API default is 20. |
| `cursor` | string | The `next_cursor` of the previous page. |
| `queryType` | string | `Latest` lists new posts first. `Top` lists high-engagement posts first. |

It also passes every other filter in the [search API reference](https://docs.xquik.com/api-reference/x/search-tweets).
Examples are `language`, `minLikes`, `sinceDate` & `untilDate`.
`q` takes [X (Twitter) search operators](https://github.com/Xquik-dev/x-twitter-advanced-search), such as `from:` & `since:`.

It returns `{ tweets, has_next_page, next_cursor }`.
Each post has an `id`.
It also has fields such as `text`, `createdAt`, `likeCount`, `viewCount` & `author`.

To read the next page, pass `next_cursor` as `cursor` with the same filters.
Stop when `has_next_page` is `false`.

## Read a profile

```js
const profile = await strapi.plugin("xquik").service("xquik").getUser("NASA");
```

`getUser(id)` takes a user ID, a username or a profile URL.
A username works with or without `@`.
It returns the profile with `id`, `username` & `name`.
It also has fields such as `description`, `followers`, `following` & `verified`.
The [profile API reference](https://docs.xquik.com/api-reference/x/get-user) lists every field.

## Configure

The plugin reads `XQUIK_API_KEY` by default.
To set the key another way, set `apiKey` in `config/plugins.js`.

```js
module.exports = ({ env }) => ({
  xquik: {
    config: {
      apiKey: env("XQUIK_API_KEY"),
    },
  },
});
```

| Option | Type | Default | Use |
| --- | --- | --- | --- |
| `apiKey` | string | `XQUIK_API_KEY`, or `""` | The key the plugin sends in `x-api-key`. |

The plugin reads the key on each call.
With no key, a call fails before it sends a request.

The plugin runs on the server only.
It adds no admin pages, routes or content types.

## Handle errors

Each failure throws an `XquikError`.
Its `code` names the failure.
Its `status` holds the HTTP status when the API answered.

| `code` | `status` | Next step |
| --- | --- | --- |
| `missing_api_key` | `undefined` | Set `XQUIK_API_KEY` or `apiKey`. |
| `network_error` | `undefined` | The request failed or took over 30 seconds. Retry. |
| `unauthenticated` | `401` | Check your API key. |
| `insufficient_credits` | `402` | Add credits in your Xquik dashboard. |
| `rate_limit_exceeded` | `429` | Wait, then retry. |
| `http_error` | The status | The API sent an error without a JSON body. Retry. |
| `invalid_response` | The status | The response didn't match the contract. Update the plugin. |

Other API errors keep the API's own `code` & `message`.
The [API reference](https://docs.xquik.com/api-reference/overview) lists every code.

This controller returns search results & turns an `XquikError` into a JSON error.

```js
module.exports = ({ strapi }) => ({
  async search(ctx) {
    try {
      ctx.body = await strapi
        .plugin("xquik")
        .service("xquik")
        .searchPosts({ q: ctx.query.q, limit: 10 });
    } catch (error) {
      if (error.name !== "XquikError") {
        throw error;
      }
      ctx.status = error.status ?? 500;
      ctx.body = { error: { code: error.code, message: error.message } };
    }
  },
});
```

## Questions

### Do I need an X (Twitter) developer account?

No. Public reads need only an Xquik API key.
Private reads & account actions need a connected X (Twitter) account.

### Is this the official X (Twitter) API?

No. Xquik runs its own REST API.
The plugin calls that API, not the official X (Twitter) API.

## More Xquik tools

- [X (Twitter) scraper API & MCP server](https://github.com/Xquik-dev/x-twitter-scraper) with REST, MCP & Skill setup.
- X (Twitter) API SDKs for [TypeScript](https://github.com/Xquik-dev/x-twitter-scraper-typescript), [Python](https://github.com/Xquik-dev/x-twitter-scraper-python), [Go](https://github.com/Xquik-dev/x-twitter-scraper-go), [Ruby](https://github.com/Xquik-dev/x-twitter-scraper-ruby), [Java](https://github.com/Xquik-dev/x-twitter-scraper-java), [Kotlin](https://github.com/Xquik-dev/x-twitter-scraper-kotlin), [C#](https://github.com/Xquik-dev/x-twitter-scraper-csharp) & [PHP](https://github.com/Xquik-dev/x-twitter-scraper-php).
- [X (Twitter) CLI](https://github.com/Xquik-dev/x-twitter-scraper-cli) for terminal workflows.
- The [X (Twitter) API alternative skill](https://github.com/Xquik-dev/x-api) & [X (Twitter) advanced search operators](https://github.com/Xquik-dev/x-twitter-advanced-search).
- X (Twitter) agent plugins for [OpenClaw](https://github.com/Xquik-dev/tweetclaw) & [Hermes Agent](https://github.com/Xquik-dev/hermes-tweet).
- The [X (Twitter) API documentation source](https://github.com/Xquik-dev/xquik-docs).
- X (Twitter) integrations for [n8n](https://github.com/Xquik-dev/n8n-nodes-xquik), [Prefect](https://github.com/Xquik-dev/prefect-xquik), [Haystack](https://github.com/Xquik-dev/xquik-haystack), [Paperclip](https://github.com/Xquik-dev/paperclip-plugin-xquik), [Terraform](https://github.com/Xquik-dev/terraform-provider-x-twitter-scraper), [Convex](https://github.com/Xquik-dev/xquik-convex) & [Supabase](https://github.com/Xquik-dev/xquik-supabase).
- X (Twitter) MCP for [AI agents](https://github.com/Xquik-dev/xquik-mcp), [VS Code](https://github.com/Xquik-dev/xquik-vscode) & [Raycast](https://github.com/Xquik-dev/xquik-raycast).
- [Xquik X (Twitter) API & scraper](https://xquik.com) and the [X (Twitter) API documentation](https://docs.xquik.com/api-reference/overview).

## Develop

```sh
bin/check-local
```

`bin/check-local` runs every check in order.
Last, it starts a fresh Strapi 5 app with the packed plugin.
Then it calls the service over HTTP.

## License

[MIT](LICENSE)

Xquik makes this plugin. Strapi doesn't make or endorse it.

Xquik is an independent third-party service. Not affiliated with X Corp. "Twitter" and "X" are trademarks of X Corp.

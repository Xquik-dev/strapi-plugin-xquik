# X API & Twitter API Plugin for Strapi 5

<img src="https://raw.githubusercontent.com/Xquik-dev/strapi-plugin-xquik/main/assets/logo.png" alt="Xquik logo" width="96" height="96">

This Strapi Twitter plugin by Xquik searches X posts & reads X profiles from your Strapi 5 server.

[Xquik](https://xquik.com) is the world's fastest and cheapest X Twitter data API with the most complete X data.
Searches & extractions charge only for delivered, unique, filter-matching results.

Xquik is an independent third-party service. Not affiliated with X Corp. "Twitter" and "X" are trademarks of X Corp.
Xquik makes this plugin. Strapi doesn't make or endorse it.

This plugin adds an `xquik` service to your Strapi 5 server.
The service searches X posts & reads X profiles.
It runs on the server only. It adds no admin pages, routes or content types.

## Requirements

- Strapi 5
- Node.js 20 to 26
- An Xquik API key from your dashboard at [xquik.com](https://xquik.com)

## Install the Strapi Twitter & X plugin

```sh
npm install strapi-plugin-xquik
```

Strapi 5 enables the plugin on its next start. The package is on [npm](https://www.npmjs.com/package/strapi-plugin-xquik).

## Configure

Add your API key to your app's `.env` file.

```sh
XQUIK_API_KEY=xq_...
```

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

| Option   | Type   | Default                  | Use                                            |
| -------- | ------ | ------------------------ | ---------------------------------------------- |
| `apiKey` | string | `XQUIK_API_KEY`, or `""` | The key the plugin sends in `x-api-key`.       |

The plugin reads the key on each call.
With no key, a call fails before it sends a request.

## Search X posts for your Twitter CMS

Call the service from any controller, service or lifecycle hook.

```js
const page = await strapi
  .plugin("xquik")
  .service("xquik")
  .searchPosts({ q: "from:NASA", limit: 10 });
```

`searchPosts(query)` takes these fields.

| Field       | Type   | Use                                                                |
| ----------- | ------ | ------------------------------------------------------------------ |
| `q`         | string | Required. A search query, a post ID or a post URL.                 |
| `limit`     | number | Most posts to return, from 1 to 10,000. The API default is 20.     |
| `cursor`    | string | The `next_cursor` of the previous page.                            |
| `queryType` | string | `Latest` lists the newest posts first. `Top` lists high-engagement posts first.|

It also passes every other search filter in the [search API reference](https://docs.xquik.com/api-reference/x/search-tweets).
Examples are `language`, `minLikes`, `sinceDate` & `untilDate`.
`q` takes [X search operators](https://github.com/Xquik-dev/x-twitter-advanced-search), such as `from:` & `since:`.

It returns `{ tweets, has_next_page, next_cursor }`.
Each post has an `id`. It also has fields such as `text`, `createdAt`, `likeCount`, `viewCount` & `author`.

To read the next page, pass `next_cursor` as `cursor` with the same filters.
Stop when `has_next_page` is `false`.

## Read a profile

```js
const profile = await strapi.plugin("xquik").service("xquik").getUser("NASA");
```

`getUser(id)` takes a user ID, a username with or without `@`, or a profile URL such as `x.com/nasa`.
It returns the profile with `id`, `username` & `name`.
It also has fields such as `description`, `followers`, `following` & `verified`.
The [profile API reference](https://docs.xquik.com/api-reference/x/get-user) lists every field.

## Handle errors

Each failure throws an `XquikError`.
Its `code` names the failure. Its `status` holds the HTTP status when the API answered.

| `code`                 | `status`    | Next step                                                   |
| ---------------------- | ----------- | ----------------------------------------------------------- |
| `missing_api_key`      | `undefined` | Set `XQUIK_API_KEY` or `apiKey`.                            |
| `network_error`        | `undefined` | The request failed or took over 30 seconds. Retry.          |
| `unauthenticated`      | `401`       | Check your API key.                                         |
| `insufficient_credits` | `402`       | Add credits in your Xquik dashboard.                        |
| `rate_limit_exceeded`  | `429`       | Wait, then retry.                                           |
| `http_error`           | The status  | The API sent an error without a JSON body. Retry.           |
| `invalid_response`     | The status  | The response didn't match the contract. Update the plugin.  |

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

<!-- trust:start -->

## Trust & usage

[![Twitter API package downloads](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fdownloads.json)](https://xquik.com/trust#downloads)
[![Twitter scraper users on Apify](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fapify-users.json)](https://apify.com/xquik)
[![Twitter scraper runs on Apify](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fapify-runs.json)](https://apify.com/xquik)
[![Tweet scraper rating on Apify](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fapify-rating.json)](https://apify.com/xquik/x-tweet-scraper/reviews)
[![Xquik Twitter API accounts](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Faccounts.json)](https://xquik.com/trust#accounts)
[![Twitter Skill installs](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fskill-installs.json)](https://xquik.com/trust#skill-installs)
[![Xquik verified revenue on TrustMRR](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Frevenue.json)](https://trustmrr.com/startup/xquik)
[![Twitter API p99 server read time](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Frest-p99.json)](https://xquik.com/trust#speed)
[![Xquik GitHub stars](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fgithub-stars.json)](https://github.com/Xquik-dev)

- 54,000+ downloads of Xquik's Twitter API packages on npm, PyPI, RubyGems, NuGet, Packagist & Terraform ([source](https://xquik.com/trust#downloads)) <!-- trust:downloads 54576 -->
- 10,000+ users of Xquik's Twitter scraper Actors on Apify ([source](https://apify.com/xquik)) <!-- trust:apify-users 10119 -->
- 7,000,000+ runs of Xquik's Twitter scraper Actors on Apify ([source](https://apify.com/xquik)) <!-- trust:apify-runs 7076266 -->
- 4.66 of 5 for the X Tweet Scraper from 16 Apify reviews ([source](https://apify.com/xquik/x-tweet-scraper/reviews)) <!-- trust:apify-rating 4.66 16 -->
- 4,100+ accounts on xquik.com ([source](https://xquik.com/trust#accounts)) <!-- trust:accounts 4126 -->
- 1,600+ installs of Xquik's Twitter Skills on skills.sh ([source](https://xquik.com/trust#skill-installs)) <!-- trust:skill-installs 1619 -->
- $40,000+ in revenue verified by TrustMRR ([source](https://trustmrr.com/startup/xquik)) <!-- trust:revenue 40329 -->
- 13.8 s p99 REST API server read time over 7 days, failed reads included ([source](https://xquik.com/trust#speed)) <!-- trust:rest-p99 13778 -->
- 380+ GitHub stars across Xquik's repos ([source](https://github.com/Xquik-dev)) <!-- trust:github-stars 386 -->

Checked on 2026-10-28. See each number with its date & source on [xquik.com/trust](https://xquik.com/trust) or as [JSON](https://xquik.com/trust.json).

<!-- trust:end -->

## Questions

### Do I need an X developer account?

No. Public reads need only an Xquik API key. Private reads & X account actions
need a connected X account.

### Is this the official X API?

No. Xquik is an independent third-party service with its own REST API. The plugin
calls that API, not the official X API.

## Develop

```sh
bin/check-local
```

`bin/check-local` runs every check in order.
It installs, then checks format, lint, types & tests.
It builds & verifies the plugin, then runs `npm audit` & `npm pack --dry-run`.
Last, it starts a fresh Strapi 5 app with the packed plugin & calls the service over HTTP.
With `XQUIK_API_KEY` set, that last check calls the live API.

## License

[MIT](LICENSE)

## More Xquik tools

- [X (Twitter) scraper API & Twitter MCP server](https://github.com/Xquik-dev/x-twitter-scraper) with REST, MCP & Skill setup.
- Twitter API SDKs for [TypeScript](https://github.com/Xquik-dev/x-twitter-scraper-typescript), [Python](https://github.com/Xquik-dev/x-twitter-scraper-python), [Go](https://github.com/Xquik-dev/x-twitter-scraper-go), [Ruby](https://github.com/Xquik-dev/x-twitter-scraper-ruby), [Java](https://github.com/Xquik-dev/x-twitter-scraper-java), [Kotlin](https://github.com/Xquik-dev/x-twitter-scraper-kotlin), [C#](https://github.com/Xquik-dev/x-twitter-scraper-csharp) & [PHP](https://github.com/Xquik-dev/x-twitter-scraper-php).
- [Twitter CLI & X CLI](https://github.com/Xquik-dev/x-twitter-scraper-cli), the [X API alternative skill](https://github.com/Xquik-dev/x-api) and [Twitter advanced search operators](https://github.com/Xquik-dev/x-twitter-advanced-search) with tested examples.
- Twitter agent plugins for [OpenClaw](https://github.com/Xquik-dev/tweetclaw) & [Hermes Agent](https://github.com/Xquik-dev/hermes-tweet), and the [Twitter API documentation source](https://github.com/Xquik-dev/xquik-docs).
- Twitter integrations for [n8n](https://github.com/Xquik-dev/n8n-nodes-xquik), [Prefect](https://github.com/Xquik-dev/prefect-xquik), [Haystack](https://github.com/Xquik-dev/xquik-haystack), [Paperclip](https://github.com/Xquik-dev/paperclip-plugin-xquik), [Terraform](https://github.com/Xquik-dev/terraform-provider-x-twitter-scraper), [Convex](https://github.com/Xquik-dev/xquik-convex), [Supabase](https://github.com/Xquik-dev/xquik-supabase) & [Strapi](https://github.com/Xquik-dev/strapi-plugin-xquik).
- Twitter MCP for [AI agents](https://github.com/Xquik-dev/xquik-mcp), [VS Code](https://github.com/Xquik-dev/xquik-vscode) & [Raycast](https://github.com/Xquik-dev/xquik-raycast).
- [Xquik X API & Twitter scraper](https://xquik.com) and the [Twitter API documentation](https://docs.xquik.com/api-reference/overview).

# X API & Twitter API Plugin for Strapi 5

<img src="https://raw.githubusercontent.com/Xquik-dev/strapi-plugin-xquik/main/assets/logo.png" alt="Xquik logo" width="96" height="96">

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

## Install

```sh
npm install strapi-plugin-xquik
```

Strapi 5 enables the plugin on its next start.

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

## Search posts

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

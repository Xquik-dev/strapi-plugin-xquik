# strapi-plugin-xquik

[![Convex Component](https://www.convex.dev/components/badge/convex-xquik)](https://www.convex.dev/components/convex-xquik)

Search X posts & read profiles from Strapi 5 with the Xquik X Twitter data API. Not affiliated with X Corp.

> Xquik is an independent third-party service. Not affiliated with X Corp.
> "Twitter" and "X" are trademarks of X Corp.

## What you get

- A Strapi 5 plugin that searches X posts and reads X profiles through Xquik.

## Status

This plugin is in development and has no release yet.

## Use the Xquik API

Call the same API from your own Strapi code today. Create an API key in your Xquik dashboard. Send it in the `x-api-key` header.

```bash
curl "https://xquik.com/api/v1/x/tweets/search?q=twitter%20api&limit=10" \
  -H "x-api-key: xq_..."
```

Read the [API reference](https://docs.xquik.com/api-reference/overview) for every route.

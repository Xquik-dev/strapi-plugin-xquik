import { z } from "zod";

import type {
  PostPage,
  SearchPostsQuery,
  UserProfile,
} from "../../../server/src/index";

interface Context {
  readonly query: Record<string, unknown>;
  readonly params: { readonly id: string };
  body: unknown;
  status: number;
}

interface XquikService {
  readonly searchPosts: (query: SearchPostsQuery) => Promise<PostPage>;
  readonly getUser: (id: string) => Promise<UserProfile>;
}

interface Strapi {
  readonly plugin: (name: "xquik") => {
    readonly service: (name: "xquik") => XquikService;
  };
}

const searchQuery = z.object({ q: z.string(), limit: z.string() });
const xquikError = z.object({
  name: z.literal("XquikError"),
  code: z.string(),
  message: z.string(),
  status: z.number().optional(),
});

const respond = async (ctx: Context, request: Promise<unknown>) => {
  try {
    ctx.body = await request;
  } catch (error) {
    const failure = xquikError.safeParse(error);
    if (!failure.success) {
      throw error;
    }
    ctx.status = failure.data.status ?? 500;
    ctx.body = {
      error: { code: failure.data.code, message: failure.data.message },
    };
  }
};

export default ({ strapi }: { strapi: Strapi }) => ({
  searchPosts(ctx: Context) {
    const { q, limit } = searchQuery.parse(ctx.query);
    return respond(
      ctx,
      strapi
        .plugin("xquik")
        .service("xquik")
        .searchPosts({ q, limit: Number(limit) }),
    );
  },

  getUser(ctx: Context) {
    return respond(
      ctx,
      strapi.plugin("xquik").service("xquik").getUser(ctx.params.id),
    );
  },
});

const respond = async (ctx, request) => {
  try {
    ctx.body = await request;
  } catch (error) {
    if (error.name !== "XquikError") {
      throw error;
    }
    ctx.status = error.status ?? 500;
    ctx.body = { error: { code: error.code, message: error.message } };
  }
};

module.exports = ({ strapi }) => ({
  searchPosts(ctx) {
    const { q, limit } = ctx.query;
    return respond(
      ctx,
      strapi
        .plugin("xquik")
        .service("xquik")
        .searchPosts({ q, limit: Number(limit) }),
    );
  },

  getUser(ctx) {
    return respond(
      ctx,
      strapi.plugin("xquik").service("xquik").getUser(ctx.params.id),
    );
  },
});

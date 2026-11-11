export default {
  routes: [
    {
      method: "GET",
      path: "/xquik-smoke/search",
      handler: "api::xquik-smoke.xquik-smoke.searchPosts",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/xquik-smoke/users/:id",
      handler: "api::xquik-smoke.xquik-smoke.getUser",
      config: { auth: false },
    },
  ],
};

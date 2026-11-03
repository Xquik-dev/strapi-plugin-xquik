export default {
  default: ({ env }: { env: (key: string, fallback: string) => string }) => ({
    apiKey: env("XQUIK_API_KEY", ""),
  }),
  validator(config: { apiKey: unknown }) {
    if (typeof config.apiKey !== "string") {
      throw new TypeError("Set the xquik apiKey config to a string.");
    }
  },
};

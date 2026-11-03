import config from "./config";
import xquik from "./services/xquik";

export { XquikError } from "./services/xquik";
export type {
  Post,
  PostPage,
  SearchPostsQuery,
  UserProfile,
} from "./services/xquik";

export default {
  config,
  services: { xquik },
};

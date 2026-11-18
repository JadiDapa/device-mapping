import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// getAuth() is deferred to request time (not called at module load) so
// `next build`'s route-data collection, which imports this module before
// runtime env vars exist, never constructs the auth instance.
export const { GET, POST } = toNextJsHandler((request: Request) =>
  getAuth().handler(request),
);

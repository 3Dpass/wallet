/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  serverDependenciesToBundle: [
    "@apollo/client",
    "@wry/equality",
    "@wry/trie",
    "ts-invariant",
    "@wry/caches",
    "optimism",
    "zen-observable-ts",
    "@wry/context",
  ],
  future: {
    v2_errorBoundary: true,
    v2_normalizeFormMethod: true,
    v2_meta: true,
    v2_routeConvention: true,
    v2_headers: true,
    v2_dev: true,
  },
};

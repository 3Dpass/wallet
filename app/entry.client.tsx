import { RemixBrowser } from "@remix-run/react";
import { hydrateRoot } from "react-dom/client";
import * as Sentry from "@sentry/remix";
import { useEffect } from "react";
import { useLocation, useMatches } from "@remix-run/react";

Sentry.init({
  dsn: "https://42c6a2e62115458ebafe021b76ad393b@o1317910.ingest.sentry.io/6571390",
  tracesSampleRate: 1,
  integrations: [
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.remixRouterInstrumentation(useEffect, useLocation, useMatches),
    }),
  ],
});

hydrateRoot(document, <RemixBrowser />);

/**
 * Cloudflare Pages worker for analytics-flights.
 *
 * One job: serve the static export unchanged, except for `/ingest/*`, which is
 * reverse-proxied to PostHog so analytics travel on this site's own origin.
 *
 * Why bother: adblockers block `us.i.posthog.com` by hostname. That drops the
 * events, and it also drops `recorder.js`, which the SDK fetches lazily after
 * init -- so session replay dies silently while the page looks fine. A
 * first-party path is not on those lists.
 *
 * PostHog serves two upstreams and they are not interchangeable:
 *
 *   /ingest/static/*  -> us-assets.i.posthog.com   (array.js, recorder.js)
 *   /ingest/*         -> us.i.posthog.com          (/e, /flags, /s ingestion)
 *
 * Adding this file puts the Pages project in "advanced mode": every request is
 * routed here first, so the `env.ASSETS.fetch(request)` fallback below is what
 * serves the dashboard itself. Breaking it breaks the whole site, not just
 * analytics.
 */

const POSTHOG_INGEST = "https://us.i.posthog.com";
const POSTHOG_ASSETS = "https://us-assets.i.posthog.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/ingest" && !url.pathname.startsWith("/ingest/")) {
      return env.ASSETS.fetch(request);
    }

    const path = url.pathname.slice("/ingest".length) || "/";
    const base = path.startsWith("/static/") ? POSTHOG_ASSETS : POSTHOG_INGEST;
    const upstream = new URL(path + url.search, base);

    const headers = new Headers(request.headers);
    headers.set("Host", upstream.hostname);
    // The browser's Origin/Referer name this site; PostHog only needs the token.
    headers.delete("cookie");

    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : request.body;

    return fetch(
      new Request(upstream, {
        method: request.method,
        headers,
        body,
        redirect: "manual",
      }),
    );
  },
};

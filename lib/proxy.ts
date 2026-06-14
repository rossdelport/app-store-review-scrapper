import { ProxyAgent } from "undici";
import { HttpsProxyAgent } from "https-proxy-agent";

/**
 * Optional outbound proxy for store requests.
 *
 * Apple and Google throttle/serve-empty to datacenter IPs (e.g. Vercel), so to
 * scrape from a cloud host you route requests through a proxy that has a
 * non-flagged (ideally residential) IP. Set SCRAPER_PROXY_URL to enable it,
 * e.g. a scraping-API proxy endpoint:
 *
 *   SCRAPER_PROXY_URL=http://USER:PASS@proxy-host:PORT
 *
 * Some proxies (e.g. ScraperAPI "proxy mode") intercept TLS and present their
 * own certificate for the target. For those, also set:
 *
 *   SCRAPER_PROXY_INSECURE=true
 *
 * which skips certificate verification for the (already proxied) connection.
 * When SCRAPER_PROXY_URL is unset, everything works as before (direct).
 */
export function getProxyUrl(): string | undefined {
  const url = process.env.SCRAPER_PROXY_URL?.trim();
  return url ? url : undefined;
}

export function proxyEnabled(): boolean {
  return getProxyUrl() !== undefined;
}

export function proxyInsecure(): boolean {
  const v = process.env.SCRAPER_PROXY_INSECURE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

// Reuse a single dispatcher/agent across requests (connection pooling).
let _dispatcher: ProxyAgent | undefined;
let _gotAgent: { https: HttpsProxyAgent<string> } | undefined;

/** undici dispatcher for the App Store's `fetch` / `request` calls. */
export function fetchDispatcher(): ProxyAgent | undefined {
  const url = getProxyUrl();
  if (!url) return undefined;
  if (!_dispatcher) {
    _dispatcher = new ProxyAgent({
      uri: url,
      requestTls: proxyInsecure() ? { rejectUnauthorized: false } : undefined,
    });
  }
  return _dispatcher;
}

/** `got` agent (used by google-play-scraper) for HTTPS targets. */
export function gotProxyAgent(): { https: HttpsProxyAgent<string> } | undefined {
  const url = getProxyUrl();
  if (!url) return undefined;
  if (!_gotAgent) _gotAgent = { https: new HttpsProxyAgent(url) };
  return _gotAgent;
}

/** got `https` options — disables cert checks when using an intercepting proxy. */
export function gotHttpsOptions(): { rejectUnauthorized: boolean } | undefined {
  return getProxyUrl() && proxyInsecure() ? { rejectUnauthorized: false } : undefined;
}

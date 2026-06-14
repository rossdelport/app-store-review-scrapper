/** Turn a raw scraper/network error into a message that's safe and useful to
 *  show a user. Network egress is the most common failure mode (e.g. a host
 *  that blocks outbound traffic, or Apple/Google rate-limiting). */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);

  if (/429|too many requests/i.test(msg)) {
    return "The store is rate-limiting this server (HTTP 429). Wait a moment and try again, or run the app from a host with a different IP.";
  }
  if (/403|forbidden/i.test(msg)) {
    return "The store blocked this request (HTTP 403). This usually means the host's IP is blocked or rate-limited (common on shared cloud platforms), or outbound network access is restricted. Try the 'Load sample data' button, or run the app from a host with open, non-flagged internet access.";
  }
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|fetch failed|network/i.test(msg)) {
    return "Couldn't reach the store. Check this server's internet access and try again.";
  }
  if (/404|not found/i.test(msg)) {
    return "No reviews found for that app in the selected country. Try a different country or app.";
  }
  return msg || "Something went wrong while scraping reviews.";
}

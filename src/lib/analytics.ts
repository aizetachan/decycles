/**
 * Safely send a custom event to Google Analytics (gtag.js)
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  const gtag = (window as any).gtag;
  if (gtag) {
    gtag("event", eventName, params);
  }
}

/**
 * Safely set user properties in Google Analytics (gtag.js)
 */
export function setUserProperties(properties: {
  user_role?: "user" | "creator" | "admin" | "anonymous";
  has_shop?: "true" | "false";
  [key: string]: any;
}) {
  const gtag = (window as any).gtag;
  if (gtag) {
    gtag("set", "user_properties", properties);
  }
}

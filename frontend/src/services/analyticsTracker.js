import { getBackendBaseUrl } from '../utils/apiBase';
import { getSessionId } from '../utils';

const TRACKING_URL = `${getBackendBaseUrl()}/api/v1/analytics/events`;
const VISITOR_KEY = 'analytics_visitor_id';

const getStoredId = (key, prefix) => {
  if (typeof window === 'undefined') return null;

  try {
    let value = localStorage.getItem(key);
    if (!value) {
      value = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(key, value);
    }
    return value;
  } catch {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
};

const getUtmParams = () => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);

  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  };
};

const normalizePayload = (eventName, payload = {}) => ({
  ...payload,
  ...getUtmParams(),
  event_name: eventName,
  visitor_id: payload.visitor_id || payload.visitorId || getStoredId(VISITOR_KEY, 'visitor'),
  session_id: payload.session_id || payload.sessionId || getSessionId(),
  path: payload.path || (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search || ''}` : '/'),
  title: payload.title || (typeof document !== 'undefined' ? document.title : ''),
  referrer: payload.referrer || (typeof document !== 'undefined' ? document.referrer : ''),
});

const toFormBody = (payload) => {
  const form = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  });
  return form;
};

export const trackAnalyticsEvent = (eventName, payload = {}) => {
  if (!eventName || typeof window === 'undefined') return;

  const eventPayload = normalizePayload(eventName, payload);
  const body = toFormBody(eventPayload);

  try {
    if (navigator.sendBeacon && navigator.sendBeacon(TRACKING_URL, body)) return;
  } catch {
    // Fallback below.
  }

  fetch(TRACKING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => {});
};

export const getAnalyticsVisitorId = () => getStoredId(VISITOR_KEY, 'visitor');

export default trackAnalyticsEvent;

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getBackendBaseUrl } from '../../utils/apiBase';
import { getSessionId } from '../../utils';
import { getAnalyticsVisitorId } from '../../services/analyticsTracker';

const TRACKING_URL = `${getBackendBaseUrl()}/api/v1/analytics/visit`;
const IGNORED_PATH_PREFIXES = ['/admin'];

const shouldTrackPath = (path) => (
  !IGNORED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
);

const sendVisit = (payload) => {
  const body = new URLSearchParams(payload);

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

const VercelVisitTracker = () => {
  const location = useLocation();
  const lastTrackedPath = useRef('');

  useEffect(() => {
    const path = `${location.pathname}${location.search || ''}`;
    if (!shouldTrackPath(path) || lastTrackedPath.current === path) {
      return;
    }

    lastTrackedPath.current = path;
    sendVisit({
      path,
      title: document.title || '',
      referrer: document.referrer || '',
      visitor_id: getAnalyticsVisitorId(),
      session_id: getSessionId(),
      timestamp: new Date().toISOString(),
    });
  }, [location.pathname, location.search]);

  return null;
};

export default VercelVisitTracker;

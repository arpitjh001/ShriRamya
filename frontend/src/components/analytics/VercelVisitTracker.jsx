import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getBackendBaseUrl } from '../../utils/apiBase';

const TRACKING_URL = `${getBackendBaseUrl()}/api/v1/analytics/visit`;
const IGNORED_PATH_PREFIXES = ['/admin'];

const shouldTrackPath = (path) => (
  !IGNORED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
);

const sendVisit = (payload) => {
  const searchParams = new URLSearchParams(payload);

  if (navigator.sendBeacon && navigator.sendBeacon(TRACKING_URL, searchParams)) {
    return;
  }

  fetch(TRACKING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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
      timestamp: new Date().toISOString(),
    });
  }, [location.pathname, location.search]);

  return null;
};

export default VercelVisitTracker;

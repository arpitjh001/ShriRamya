const LOCAL_API_HOST_PATTERN = /(backend:8000|localhost:8000|127\.0\.0\.1:8000)/i;

const getBrowserHostname = () => {
  if (typeof window === "undefined" || !window.location) {
    return "";
  }

  return window.location.hostname.toLowerCase();
};

const isLocalBrowserHost = (hostname) => (
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "0.0.0.0"
);

export const normalizeBackendUrl = (value) => {
  const trimmedValue = typeof value === "string" ? value.trim().replace(/\/$/, "") : "";

  if (!trimmedValue) {
    return "";
  }

  const browserHostname = getBrowserHostname();
  const pointsToLocalApi = LOCAL_API_HOST_PATTERN.test(trimmedValue);

  if (trimmedValue.includes("backend:8000")) {
    return "";
  }

  if (pointsToLocalApi && !isLocalBrowserHost(browserHostname)) {
    return "";
  }

  return trimmedValue;
};

export const getBackendBaseUrl = () => normalizeBackendUrl(process.env.REACT_APP_BACKEND_URL || "");

export const normalizeApiRows = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }

  if (payload && typeof payload === "object" && payload.data && typeof payload.data === "object") {
    const values = Object.values(payload.data);
    if (values.every((item) => item && typeof item === "object")) {
      return values;
    }
  }

  return [];
};

export const normalizeMediaUrl = (value) => {
  if (!value) {
    return "";
  }

  const raw = String(value).trim();
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
    return parsed.toString();
  } catch {
    return raw.replace(/\/{2,}/g, "/");
  }
};

export const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

export const valueOrDash = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
};

export const toSearchText = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSearchText(item)).join(" ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return String(value);
};

export const matchesSearch = (record, query) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return Object.entries(record).some(([key, value]) => {
    const keyText = key.toLowerCase();
    const valueText = toSearchText(value).toLowerCase();
    return keyText.includes(normalizedQuery) || valueText.includes(normalizedQuery);
  });
};

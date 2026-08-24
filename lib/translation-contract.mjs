const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

export function isoDateValue(value, field, source, { required = false } = {}) {
  let normalized = "";
  if (typeof value === "string") normalized = value.trim();
  else if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    normalized = value.toISOString().slice(0, 10);
  } else if (value != null) {
    throw new Error(`${source}: ${field} must use YYYY-MM-DD`);
  }

  if (!normalized) {
    if (required) throw new Error(`${source}: ${field} is required`);
    return "";
  }
  if (!ISO_DATE.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new Error(`${source}: ${field} must use YYYY-MM-DD`);
  }
  return normalized;
}

export function translationLifecycleValues(data, status, source) {
  const publishedISO = isoDateValue(data.published, "published", source, {
    required: status === "published",
  });
  return {
    publishedISO,
    updatedISO: isoDateValue(data.updated, "updated", source) || publishedISO,
  };
}

export function translationEditionIsVisible(status, previewEnabled) {
  return status === "published" || (previewEnabled && (status === "draft" || status === "review"));
}

export function canonicalizeLocalizedTranslationRoutes(markdown, routeMap) {
  return [...routeMap.entries()]
    .sort(([left], [right]) => right.length - left.length)
    .reduce((content, [localizedRoute, sourceRoute]) => content.replaceAll(localizedRoute, sourceRoute), markdown);
}

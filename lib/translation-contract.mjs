import crypto from "node:crypto";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const REVISION = /^sha256:([\da-f]{64})$/u;

export function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

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

export function sourceRevisionValue(value, source, { required = false } = {}) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) {
    if (required) throw new Error(`${source}: source_revision is required`);
    return "";
  }
  if (!REVISION.test(normalized)) {
    throw new Error(`${source}: source_revision must use sha256:<64 lowercase hex digits>`);
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
    sourceRevision: sourceRevisionValue(data.source_revision, source, {
      required: status !== "draft",
    }),
  };
}

export function publicationDecisionValue(value, status, source) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${source}: publication must be an object`);
  }
  const decision = typeof value.decision === "string" ? value.decision.trim() : "";
  if (decision !== "local-preview" && decision !== "approved") {
    throw new Error(`${source}: publication.decision must be local-preview / approved`);
  }
  if (status === "published" && decision !== "approved") {
    throw new Error(`${source}: published editions require publication.decision: approved`);
  }
  if (decision === "approved") {
    if (typeof value.decided_by !== "string" || !value.decided_by.trim()) {
      throw new Error(`${source}: approved publication requires publication.decided_by`);
    }
    isoDateValue(value.decided_at, "publication.decided_at", source, { required: true });
  }
  return decision;
}

export function translationEditionIsVisible(status, previewEnabled) {
  return status === "published" || (previewEnabled && (status === "draft" || status === "review"));
}

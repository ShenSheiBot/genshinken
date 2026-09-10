const versionIdPattern = /(?:Worker\s+)?Version\s+ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/iu;

export function extractWorkerVersionId(output) {
  const match = String(output).match(versionIdPattern);
  if (!match) {
    throw new Error("Cloudflare preview upload completed without a readable Worker Version ID; fixed preview was not promoted.");
  }
  return match[1];
}

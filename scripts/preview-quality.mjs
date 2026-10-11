/** The deploy consumer requires Quality's successful run for this exact commit. */
export function requireSuccessfulQuality(runs, commit) {
  const latest = runs.filter((run) => run.headSha === commit)
    .sort((a, b) => b.databaseId - a.databaseId)[0];
  if (!latest || latest.status !== "completed" || latest.conclusion !== "success") {
    throw new Error(`Preview requires successful Quality CI for ${commit}; latest result: ${latest?.conclusion || latest?.status || "no run"}.`);
  }
  return latest;
}

export function previewVersionCommit(version) {
  const tag = version.annotations?.["workers/tag"];
  if (!/^git-[a-f0-9]{40}$/u.test(tag ?? "")) {
    throw new Error("Preview version has no full Git commit tag; upload a Quality-approved commit first.");
  }
  return tag.slice(4);
}

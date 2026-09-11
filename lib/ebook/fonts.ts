/**
 * Per-book font subsetting. Delegates to scripts/build-ebook-font-subsets.py,
 * which reuses the site's pinned-source pyftsubset infrastructure from
 * scripts/build-cjk-font-subsets.py (no duplicated download/subset logic).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { EpubFontAsset } from "./epub";

interface SubsetterFontRecord {
  family: string;
  file: string;
  bytes: number;
  sha256: string;
  weight: string;
  emphasisAlias?: string | null;
  codePointCount: number;
  licenseFile: string;
  licensePath: string;
}

export function subsetEbookFonts(
  charset: string,
  options: { root?: string; python?: string } = {}
): EpubFontAsset[] {
  const root = options.root ?? process.cwd();
  const python = options.python ?? "python3";
  const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ebook-fonts-"));
  try {
    const charsetFile = path.join(workDirectory, "charset.txt");
    const outputDirectory = path.join(workDirectory, "subsets");
    fs.writeFileSync(charsetFile, charset, "utf8");
    const completed = spawnSync(
      python,
      [
        path.join(root, "scripts", "build-ebook-font-subsets.py"),
        "--charset-file",
        charsetFile,
        "--output-dir",
        outputDirectory,
      ],
      { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
    if (completed.status !== 0) {
      throw new Error(
        `[ebook] font subsetting failed:\n${completed.stderr || completed.stdout || completed.error}`
      );
    }
    const parsed = JSON.parse(completed.stdout.trim().split("\n").pop() ?? "") as {
      fonts: SubsetterFontRecord[];
    };
    return parsed.fonts.map((record): EpubFontAsset => ({
      family: record.family,
      fileName: record.file,
      data: fs.readFileSync(path.join(outputDirectory, record.file)),
      weight: record.weight,
      emphasisAlias: record.emphasisAlias ?? undefined,
      licenseFileName: record.licenseFile,
      licenseData: fs.readFileSync(record.licensePath),
    }));
  } finally {
    fs.rmSync(workDirectory, { recursive: true, force: true });
  }
}

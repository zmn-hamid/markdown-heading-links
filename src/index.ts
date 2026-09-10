import { TFile, type App, type CachedMetadata } from "obsidian";
import { buildHeadingIndex, type HeadingTarget } from "./slug";

export class HeadingIndex {
  private readonly cache = new Map<string, Map<string, HeadingTarget>>();

  constructor(private readonly app: App) {}

  get(file: TFile): Map<string, HeadingTarget> {
    const cached = this.cache.get(file.path);
    if (cached) {
      return cached;
    }

    const index = buildHeadingIndex(this.app.metadataCache.getFileCache(file));
    this.cache.set(file.path, index);
    return index;
  }

  getMetadata(file: TFile): CachedMetadata | null {
    return this.app.metadataCache.getFileCache(file);
  }

  invalidate(file: TFile): void {
    this.cache.delete(file.path);
  }

  invalidatePath(path: string): void {
    this.cache.delete(path);
  }

  clear(): void {
    this.cache.clear();
  }
}

export function resolveTargetFile(app: App, notePath: string, sourcePath: string): TFile | null {
  if (notePath.length === 0) {
    const file = app.vault.getAbstractFileByPath(sourcePath);
    return file instanceof TFile ? file : null;
  }

  return app.metadataCache.getFirstLinkpathDest(notePath, sourcePath);
}


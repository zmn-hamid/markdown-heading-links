import type { CachedMetadata, OpenViewState, PaneType, Workspace } from "obsidian";
import { decodeFragment, isGfmSlugCandidate, type HeadingTarget } from "./slug";
import { resolveTargetFile, type HeadingIndex } from "./index";

interface HoverLinkPayload {
  linktext?: string;
  sourcePath?: string;
  hoverParent?: {
    file?: {
      path?: string;
    };
  };
}

interface PatchedWorkspace {
  openLinkText(
    linktext: string,
    sourcePath: string,
    newLeaf?: PaneType | boolean,
    openViewState?: OpenViewState
  ): Promise<void>;
  trigger(name: string, ...args: unknown[]): unknown;
}

let virtualBlockCounter = 0;

function splitLinktext(linktext: string): { notePath: string; fragment: string } | null {
  const hashIndex = linktext.indexOf("#");
  if (hashIndex < 0) {
    return null;
  }

  return {
    notePath: linktext.slice(0, hashIndex),
    fragment: linktext.slice(hashIndex + 1)
  };
}

function injectVirtualBlock(cache: CachedMetadata, target: HeadingTarget, prefix: string): string {
  const blockId = `${prefix}${target.slug}-${virtualBlockCounter++}`;
  const blocks = (cache.blocks ??= {});
  blocks[blockId] = {
    id: blockId,
    position: target.position
  };

  window.setTimeout(() => {
    if (cache.blocks?.[blockId]?.id === blockId) {
      delete cache.blocks[blockId];
    }
  }, 3000);

  return blockId;
}

function resolveHeading(
  app: Parameters<typeof resolveTargetFile>[0],
  index: HeadingIndex,
  linktext: string,
  sourcePath: string
): { notePath: string; target: HeadingTarget; file: import("obsidian").TFile } | null {
  const parsed = splitLinktext(linktext);
  if (!parsed || !isGfmSlugCandidate(parsed.fragment)) {
    return null;
  }

  const file = resolveTargetFile(app, parsed.notePath, sourcePath);
  if (!file) {
    return null;
  }

  const target = index.get(file).get(decodeFragment(parsed.fragment));
  if (!target) {
    return null;
  }

  return { notePath: parsed.notePath, target, file };
}

function getSourcePath(app: Parameters<typeof resolveTargetFile>[0], payload: HoverLinkPayload): string {
  return (
    payload.sourcePath ??
    payload.hoverParent?.file?.path ??
    app.workspace.getActiveFile()?.path ??
    ""
  );
}

export function applyLinkPatches(
  app: Parameters<typeof resolveTargetFile>[0],
  index: HeadingIndex
): () => void {
  const workspace = app.workspace as unknown as PatchedWorkspace & Workspace;
  const originalOpenLinkText = workspace.openLinkText.bind(workspace);
  const originalTrigger = workspace.trigger.bind(workspace);

  workspace.openLinkText = async (
    linktext: string,
    sourcePath: string,
    newLeaf?: PaneType | boolean,
    openViewState?: OpenViewState
  ) => {
    try {
      if (typeof linktext === "string") {
        const resolved = resolveHeading(app, index, linktext, sourcePath);
        if (resolved) {
          const cache = index.getMetadata(resolved.file);
          if (cache) {
            const blockId = injectVirtualBlock(cache, resolved.target, "markdown-heading-links-");
            const nativeLinktext = resolved.notePath.length > 0
              ? `${resolved.notePath}#^${blockId}`
              : `#^${blockId}`;
            return originalOpenLinkText(nativeLinktext, sourcePath, newLeaf, openViewState);
          }
        }
      }
    } catch (error) {
      console.error("[Markdown Heading Links] Could not resolve a Markdown heading link.", error);
    }

    return originalOpenLinkText(linktext, sourcePath, newLeaf, openViewState);
  };

  workspace.trigger = (name: string, ...args: unknown[]) => {
    if (name === "hover-link") {
      try {
        const payload = args[0] as HoverLinkPayload | undefined;
        if (payload?.linktext) {
          const sourcePath = getSourcePath(app, payload);
          const resolved = resolveHeading(app, index, payload.linktext, sourcePath);
          if (resolved) {
            const cache = index.getMetadata(resolved.file);
            if (cache) {
              const blockId = injectVirtualBlock(cache, resolved.target, "markdown-heading-links-hover-");
              payload.linktext = resolved.notePath.length > 0
                ? `${resolved.notePath}#^${blockId}`
                : `#^${blockId}`;
            }
          }
        }
      } catch (error) {
        console.error("[Markdown Heading Links] Could not resolve a heading hover preview.", error);
      }
    }

    return originalTrigger(name, ...args);
  };

  return () => {
    workspace.openLinkText = originalOpenLinkText;
    workspace.trigger = originalTrigger;
  };
}


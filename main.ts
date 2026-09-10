import {
  Notice,
  Plugin,
  TFile,
  FuzzySuggestModal,
  type Editor,
  setIcon,
  setTooltip
} from "obsidian";
import { HeadingIndex } from "./src/index";
import { applyLinkPatches } from "./src/link-patches";
import { getHeadingTargets, type HeadingTarget } from "./src/slug";
import { MarkdownHeadingSuggest } from "./src/heading-suggest";

export default class MarkdownHeadingLinksPlugin extends Plugin {
  private headingIndex!: HeadingIndex;
  private cleanupLinks!: () => void;

  async onload(): Promise<void> {
    this.headingIndex = new HeadingIndex(this.app);

    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      this.headingIndex.invalidate(file);
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (file instanceof TFile) {
        this.headingIndex.invalidatePath(oldPath);
        this.headingIndex.invalidate(file);
      }
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (file instanceof TFile) {
        this.headingIndex.invalidate(file);
      }
    }));

    this.cleanupLinks = applyLinkPatches(this.app, this.headingIndex);
    this.registerEditorSuggest(new MarkdownHeadingSuggest(this.app));
    this.registerMarkdownPostProcessor((element, context) => {
      this.addHeadingButtons(element, context.sourcePath, context.getSectionInfo(element));
    });

    this.registerEditorCommands();
  }

  onunload(): void {
    this.cleanupLinks?.();
    this.headingIndex?.clear();
  }

  private addHeadingButtons(
    element: HTMLElement,
    sourcePath: string,
    sectionInfo: { lineStart: number; lineEnd: number } | null
  ): void {
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) {
      return;
    }

    const targets = getHeadingTargets(this.headingIndex.getMetadata(file));
    const headings = Array.from(element.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"));

    for (const headingEl of headings) {
      if (headingEl.querySelector(".markdown-heading-links-copy")) {
        continue;
      }

      const headingTarget = this.findHeadingTarget(headingEl, targets, sectionInfo);
      if (!headingTarget) {
        continue;
      }

      headingEl.classList.add("markdown-heading-links-heading");
      const button = headingEl.createEl("button", {
        cls: ["markdown-heading-links-copy", "clickable-icon"],
        attr: {
          type: "button",
          "aria-label": `Copy heading slug #${headingTarget.slug}`
        }
      });
      setIcon(button, "link");
      setTooltip(button, `Copy heading slug #${headingTarget.slug}`);

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void this.copyHeadingSlug(headingTarget);
      });
    }
  }

  private findHeadingTarget(
    headingEl: HTMLElement,
    targets: HeadingTarget[],
    sectionInfo: { lineStart: number; lineEnd: number } | null
  ): HeadingTarget | null {
    const headingText = headingEl.textContent?.trim() ?? "";
    const level = Number(headingEl.tagName.slice(1));

    if (sectionInfo) {
      const exactLine = targets.find((target) =>
        target.line === sectionInfo.lineStart && target.level === level
      );
      if (exactLine) {
        return exactLine;
      }

      const inSection = targets.find((target) =>
        target.line >= sectionInfo.lineStart &&
        target.line <= sectionInfo.lineEnd &&
        target.level === level &&
        target.heading === headingText
      );
      if (inSection) {
        return inSection;
      }
    }

    return targets.find((target) =>
      target.level === level && target.heading === headingText
    ) ?? null;
  }

  private registerEditorCommands(): void {
    this.addCommand({
      id: "copy-heading-slug",
      name: "Copy heading slug",
      editorCheckCallback: (checking, editor, view) => {
        const target = view.file ? this.getHeadingAtCursor(editor, view.file) : null;
        if (!target) {
          return false;
        }

        if (!checking) {
          void this.copyHeadingSlug(target);
        }
        return true;
      }
    });

    this.addCommand({
      id: "copy-markdown-heading-link",
      name: "Copy Markdown link to heading",
      editorCheckCallback: (checking, editor, view) => {
        const target = view.file ? this.getHeadingAtCursor(editor, view.file) : null;
        if (!target) {
          return false;
        }

        if (!checking) {
          void this.copyText(`[${target.heading}](#${target.slug})`, "Markdown heading link copied");
        }
        return true;
      }
    });

    this.addCommand({
      id: "suggest-heading-slug",
      name: "Suggest heading slug",
      editorCallback: (editor, view) => {
        if (!view.file) {
          return;
        }

        const targets = getHeadingTargets(this.headingIndex.getMetadata(view.file));
        new HeadingSlugModal(this.app, targets, (target) => {
          this.insertHeadingSlug(editor, target);
        }).open();
      }
    });

    this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor, view) => {
      const target = view.file ? this.getHeadingAtCursor(editor, view.file) : null;
      if (!target) {
        return;
      }

      menu.addItem((item) => {
        item
          .setTitle("Copy heading slug")
          .setIcon("link")
          .onClick(() => void this.copyHeadingSlug(target));
      });
      menu.addItem((item) => {
        item
          .setTitle("Copy Markdown link to heading")
          .setIcon("link")
          .onClick(() => void this.copyText(`[${target.heading}](#${target.slug})`, "Markdown heading link copied"));
      });
    }));
  }

  private getHeadingAtCursor(editor: Editor, file: TFile): HeadingTarget | null {
    const cursorLine = editor.getCursor().line;
    const target = getHeadingTargets(this.headingIndex.getMetadata(file))
      .find((candidate) => candidate.line === cursorLine);
    return target ?? null;
  }

  private async copyHeadingSlug(target: HeadingTarget): Promise<void> {
    await this.copyText(`#${target.slug}`, `Copied heading slug #${target.slug}`);
  }

  private insertHeadingSlug(editor: Editor, target: HeadingTarget): void {
    const cursor = editor.getCursor();
    const linePrefix = editor.getLine(cursor.line).slice(0, cursor.ch);
    const linkMatch = linePrefix.match(/\]\(([^)\n#]*)#[^\n)]*$/);

    if (linkMatch) {
      const hashIndex = linePrefix.lastIndexOf("#");
      editor.replaceRange(
        `#${target.slug}`,
        { line: cursor.line, ch: hashIndex },
        cursor
      );
      return;
    }

    editor.replaceRange(`#${target.slug}`, cursor);
  }

  private async copyText(text: string, message: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      new Notice(message);
    } catch (error) {
      console.error("[Markdown Heading Links] Could not copy text.", error);
      new Notice("Could not copy to the clipboard");
    }
  }
}

class HeadingSlugModal extends FuzzySuggestModal<HeadingTarget> {
  constructor(
    app: MarkdownHeadingLinksPlugin["app"],
    private readonly targets: HeadingTarget[],
    private readonly onChoose: (target: HeadingTarget) => void
  ) {
    super(app);
  }

  getItems(): HeadingTarget[] {
    return this.targets;
  }

  getItemText(target: HeadingTarget): string {
    return `#${target.slug} — ${target.heading}`;
  }

  onChooseItem(target: HeadingTarget): void {
    this.onChoose(target);
  }
}

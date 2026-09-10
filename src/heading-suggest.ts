import {
  Editor,
  EditorSuggest,
  type EditorPosition,
  type EditorSuggestContext,
  type EditorSuggestTriggerInfo,
  type TFile,
  setIcon
} from "obsidian";
import type { App } from "obsidian";
import { getHeadingTargets, type HeadingTarget } from "./slug";
import { resolveTargetFile } from "./index";

export class MarkdownHeadingSuggest extends EditorSuggest<HeadingTarget> {
  constructor(private readonly pluginApp: App) {
    super(pluginApp);
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    file: TFile | null
  ): EditorSuggestTriggerInfo | null {
    if (!file) {
      return null;
    }

    const linePrefix = editor.getLine(cursor.line).slice(0, cursor.ch);
    const match = linePrefix.match(/\]\(([^)\n#]*)#([^\n)]*)$/);
    if (!match) {
      return null;
    }

    const notePath = match[1];
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(notePath)) {
      return null;
    }

    const hashIndex = linePrefix.lastIndexOf("#");
    return {
      // Include the # in the trigger range. This makes the empty-query case
      // reliable as well: Obsidian sees a non-empty trigger immediately after
      // the user types # and can open the suggestion list.
      start: { line: cursor.line, ch: hashIndex },
      end: cursor,
      query: `#${match[2]}`
    };
  }

  getSuggestions(context: EditorSuggestContext): HeadingTarget[] {
    const file = resolveTargetFile(this.pluginApp, this.getNotePath(context), context.file.path);
    if (!file) {
      return [];
    }

    const query = context.query.replace(/^#/, "").toLocaleLowerCase();
    const targets = getHeadingTargets(this.pluginApp.metadataCache.getFileCache(file));

    return targets
      .filter((target) =>
        target.slug.toLocaleLowerCase().includes(query) ||
        target.heading.toLocaleLowerCase().includes(query)
      )
      .sort((a, b) => {
        const aStarts = a.slug.toLocaleLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.slug.toLocaleLowerCase().startsWith(query) ? 0 : 1;
        return aStarts - bStarts || a.line - b.line;
      })
      .slice(0, 100);
  }

  renderSuggestion(target: HeadingTarget, el: HTMLElement): void {
    const row = el.createDiv({ cls: "markdown-heading-links-suggestion" });
    const icon = row.createSpan({ cls: "markdown-heading-links-suggestion-icon" });
    setIcon(icon, "heading");

    const details = row.createDiv({ cls: "markdown-heading-links-suggestion-details" });
    details.createDiv({
      cls: "markdown-heading-links-suggestion-heading",
      text: target.heading
    });
    details.createDiv({
      cls: "markdown-heading-links-suggestion-slug",
      text: `#${target.slug}`
    });
  }

  selectSuggestion(target: HeadingTarget): void {
    if (!this.context) {
      return;
    }

    this.context.editor.replaceRange(`#${target.slug}`, this.context.start, this.context.end);
    this.close();
  }

  private getNotePath(context: EditorSuggestContext): string {
    const linePrefix = context.editor.getLine(context.end.line).slice(0, context.end.ch);
    const match = linePrefix.match(/\]\(([^)\n#]*)#[^\n)]*$/);
    return match?.[1] ?? "";
  }
}

# Markdown Heading Links

Make standard Markdown heading links work properly in Obsidian.

Obsidian supports heading links in wikilink syntax, but links such as `[Read more](#getting-started)` do not receive native hover previews. This plugin bridges that gap and makes Markdown heading links easier to create.

## Features

- Native Ctrl/Cmd-hover previews for Markdown heading links.
- Click navigation for GitHub-style heading slugs, including links to other notes.
- Heading autocomplete: type `#` after `[link text](` and choose a heading.
- Copy-slug buttons beside headings in Reading view.
- Commands for copying a heading slug or a complete Markdown link.
- Duplicate headings use `-1`, `-2`, and later suffixes.

## Usage

Given this heading:

```markdown
## Getting Started
```

Type the following in Edit mode:

```markdown
[Read more](# 
```

**Important**: add a space in the end to activate the suggestions.

Choose a heading such as **Getting Started** from the suggestions. The plugin inserts:

```markdown
[Read more](#getting-started)
```

In Reading view, hover over a heading to reveal its link button and copy the slug. You can also open the Command palette with `Ctrl/Cmd+P` and search for:

- **Suggest heading slug**
- **Copy heading slug**
- **Copy Markdown link to heading**

You can also place the cursor on the heading in the writing mode and right click on it and choose one of the copy options that you can find in the command palette as well.

## Installation

### Community plugin

The plugin is listed in the [Obsidian Community directory](https://community.obsidian.md/plugins/markdown-heading-links)
and is currently pending review. After approval, search for **Markdown Heading
Links** in **Settings > Community plugins** and install it from there. Until
then, use the manual installation instructions below.

### Manual installation

1. **Download the plugin files** from the [latest GitHub release](https://github.com/zmn-hamid/markdown-heading-links/releases/latest): [`main.js`](https://github.com/zmn-hamid/markdown-heading-links/releases/latest/download/main.js), [`manifest.json`](https://github.com/zmn-hamid/markdown-heading-links/releases/latest/download/manifest.json), and [`styles.css`](https://github.com/zmn-hamid/markdown-heading-links/releases/latest/download/styles.css).
2. **Create a folder** named `markdown-heading-links` and place all three files directly inside it.
3. **Enable community plugins in Obsidian:**
   Go to **Settings > Community Plugins** and turn off **Restricted Mode** if it's on.
4. **Open the plugins folder:**
   Still in **Settings > Community Plugins**, click the **folder icon** (hover text: "Open plugins folder").
5. **Copy the `markdown-heading-links` folder** into the plugins folder that just opened.
6. **Reload Obsidian:**
   Either restart Obsidian completely, or click the **refresh icon** in **Settings > Community Plugins** to rescan the folder.
7. **Enable the plugin:**
   In **Settings > Community Plugins**, find **Markdown Heading Links** in the list and toggle it **ON**.
8. **Verify it loaded:**
   The toggle should stay on and no error message should appear. If it does, double-check that the folder structure is `plugins/markdown-heading-links/main.js` (not `plugins/markdown-heading-links/markdown-heading-links/main.js`).

**Tip:** Make sure `main.js` and `manifest.json` sit directly inside `markdown-heading-links/`, not inside another subfolder.

Requires Obsidian 1.5.0 or later.

## Privacy

Markdown Heading Links works entirely inside your vault. It does not collect
telemetry, make network requests, or send your note contents anywhere.

## Development

```bash
npm install
npm test
npm run build
```

The production build creates `main.js`, which is intentionally ignored by Git.
For a release, publish `main.js`, `manifest.json`, and `styles.css` as separate
assets on a GitHub release whose tag exactly matches the version in
`manifest.json`.

# ClickDeck Release Checklist

This checklist is for preparing a GitHub alpha release. It is not a Chrome Web Store submission checklist yet.

## Product Boundary

- [x] The README states that ClickDeck is a Chrome/Edge extension.
- [x] The README states that the project is alpha.
- [x] The README keeps MVP boundaries clear: no AI, no source-code write-back, no free-form canvas, no editable PPT export.
- [x] The README explains current HTML and PDF export behavior without over-promising.

## Discoverability

- [x] The README first screen includes natural search terms: visual HTML page editing, Chrome extension, browser, DevTools, HTML presentations, AI-generated pages, export HTML, export PDF.
- [x] The README describes use cases instead of only listing internal features.
- [x] The English section comes first for GitHub visitors.
- [x] The Chinese section mirrors the product positioning for Chinese users.
- [ ] After publishing on GitHub, add repository topics such as `chrome-extension`, `edge-extension`, `visual-editor`, `html-editor`, `devtools`, `presentation`, `pdf-export`, `open-source`.

## Demo Assets

- [x] A stable local demo page exists at `fixtures/showcase-page.html`.
- [ ] Record an English UI GIF using the showcase page.
- [ ] Add the GIF to the README once the recording looks clean.
- [ ] Capture at least one still screenshot for social posts or issues.

## Validation

- [x] `npm run build`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run e2e`
- [ ] Manual Chrome test: load `dist/`, open `fixtures/showcase-page.html`, toggle ClickDeck, edit text, undo/redo, export HTML, trigger PDF.
- [ ] Manual Edge test: load `dist/`, open `fixtures/showcase-page.html`, toggle ClickDeck, run the same smoke flow.

## Repository Readiness

- [x] MIT license exists.
- [x] README includes privacy notes.
- [x] README includes known limitations.
- [ ] Confirm GitHub repository name: `ClickDeck`.
- [ ] Confirm whether `package.json` should stay `"private": true` to prevent accidental npm publishing.
- [ ] Push the repository after the worktree is clean.

## Suggested Demo Flow

1. Open `fixtures/showcase-page.html`.
2. Enable ClickDeck with `Alt+Shift+C`.
3. Select the main headline.
4. Increase font size once.
5. Change color to a warmer accent.
6. Edit one short phrase in place.
7. Use undo and redo.
8. Export HTML or trigger PDF export.

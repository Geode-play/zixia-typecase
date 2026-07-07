# SVG Font Switcher Product Spec

## Product Positioning

SVG Font Switcher is a local SVG font workflow tool for comparing SVG cards, refining individual text nodes, and exporting production-ready PNG or editable SVG files.

The frozen core is:

- Browse: view and compare one or more SVG canvas cards.
- Select: apply batch font rules to the current canvas card.
- Edit: refine a selected text node only after the user clicks it.
- Export: export the current canvas card or all visible cards as PNG or SVG.

## Core Behavior

- A canvas card is a complete SVG preview/export unit. Each card keeps its own SVG source, file name, font rules, export size, background, and local text overrides.
- Uploading one SVG fills the first canvas card. Uploading or dropping multiple SVGs creates multiple visible cards directly in the preview.
- Once cards exist, the add button opens a choice between importing more SVG cards and duplicating the current card.
- Batch font changes affect only the active canvas.
- Global font rules support CJK text and Latin text separately.
- Mixed CJK/Latin plain text is automatically split into CJK and Latin font runs when the selected CJK and Latin fonts differ.
- Local text refinement supports replacing a selected node's text content, font family, and font size. It is available directly for a single card, and after focusing a card when multiple cards are visible.
- Export supports PNG and SVG, both for the active canvas card and for all visible cards.

## Out Of Scope

These are intentionally excluded from the current core:

- Editing text color.
- Editing font weight.
- Multi-select text editing.
- Exporting JPG, PDF, ZIP, or other formats.
- Automatically syncing font changes across all canvases.

## Collaboration Rules

- Any feature change must update this spec first.
- Frozen behavior should not change during visual or style iterations.
- Interaction changes should reduce decision cost and preserve the four functional boundaries.
- Visual style can continue to evolve as long as it does not add new product behavior.

## Acceptance Checklist

- Uploading one SVG shows a canvas preview.
- Uploading multiple SVGs shows multiple visible canvas cards without a separate file list.
- Uploaded fonts can be applied to the active canvas.
- CJK and Latin font rules can be set separately.
- Multiple canvas cards can be compared and keep independent SVG sources and settings.
- Clicking a text node opens local refinement controls in single-card mode or focused-card mode.
- In multi-card overview, clicking text selects the card and does not open local refinement controls.
- Local refinement can change the selected node's text, font, and size.
- PNG and SVG export work for one canvas and for all canvases.
- Chinese UI copy renders correctly.

# Unicode fallback emoji picker

## Goal

Improve the custom emoji prompt flow by letting users select a Unicode fallback without leaving the landing page or copying an emoji from a third-party catalog.

## Interaction

The existing `Unicode fallback` text input remains editable. An emoji trigger is added inside the field and opens an anchored popover.

The popover initially shows a curated set of 24 common emojis. A search field queries the complete bundled Emoji Styles dataset by CLDR label, Unicode character, and codepoint. Search results are capped at 60 items to keep rendering responsive.

Selecting an emoji:

1. Updates the existing Unicode fallback state.
2. Updates the generated prompt through the current data flow.
3. Closes the popover.
4. Restores focus to the trigger.

The popover closes on Escape or an outside click. Manual input continues to work unchanged.

## Component boundaries

Create a focused picker component in the demo instead of adding picker state and keyboard behavior directly to the already-large `App` component. The component receives the selected emoji and an `onSelect` callback, and reads the existing bundled emoji dataset for search.

The picker owns:

- open/closed state;
- search query and filtered results;
- active keyboard option;
- focus restoration and outside-click handling.

`App` continues to own `freeStyleEmoji`, prompt generation, and the rest of the free-style builder.

## Accessibility

- The trigger exposes its expanded state and controls relationship.
- The popover has a labelled search field and a keyboard-navigable emoji grid.
- Arrow keys move through results; Enter selects; Escape closes.
- Every option has an accessible CLDR label rather than relying on the glyph alone.
- Focus returns to the trigger after selection or dismissal.

## Responsive behavior

On desktop the picker is anchored beneath the Unicode fallback field. On narrow screens it uses the available field width, constrains its height, and scrolls internally without causing horizontal page overflow.

## Testing

Add demo component tests with the monorepo's existing Vitest, jsdom, and Testing Library stack, covering:

- opening and closing the picker;
- the compact initial selection;
- full-dataset search by name and Unicode character;
- selecting an emoji and notifying `App`;
- Escape, outside-click, and keyboard selection behavior;
- accessible trigger, search, options, and focus restoration.

Run the demo typecheck and production build, then validate the interaction and mobile layout in the browser.

## Out of scope

- Persisted recent emojis.
- Category tabs or skin-tone controls.
- Third-party picker dependencies.
- Changes to the core, React, or Web Component public APIs.

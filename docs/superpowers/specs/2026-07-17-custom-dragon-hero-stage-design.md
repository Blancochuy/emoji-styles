# Custom Dragon Hero Stage Design

## Goal

Expose the independent `custom-dragon` provider in the landing-page hero stage so visitors can compare its mapped dragon asset and Fluent 3D fallback with the six existing providers.

## User experience

- Keep `Custom Emoji` as the initial hero provider and keep the current initial emoji.
- Add `Chinese Dragon` as a seventh floating provider control.
- Add `🐉` to the hero emoji switcher.
- Selecting `Chinese Dragon` and `🐉` renders the local `custom-dragon` WebP in the hero core and the provider preview.
- Selecting `Chinese Dragon` with any other switcher emoji renders through `publicProviders.fluent3d`.
- Existing provider controls and emoji choices retain their current behavior.

## Architecture

Register `customDragonProvider` in the shared `STYLES` collection after the six current hero providers. Expand the hero slice from six to seven entries so the new provider participates in the same state and rendering flow as the existing controls. Extend the switcher array with `🐉`; no new state or component abstraction is required.

The provider's existing mapped-provider configuration remains the source of truth for the local dragon asset and Fluent 3D fallback. The hero does not special-case asset URLs.

## Layout

Add a `provider-float-7` desktop position that balances the new control around the existing orbital composition without obscuring the hero core or toolbar. Include the seventh control in mobile positioning resets. Mobile continues using the existing grid and must remain free of horizontal overflow at 390×844.

## Accessibility

The new provider control uses the accessible name `Preview Chinese Dragon`. The new switcher control uses `Try 🐉`. The rendered image retains the provider's existing accessible emoji label and `data-provider="custom-dragon"` marker.

## Testing and validation

- Add a landing integration test that selects `Preview Chinese Dragon`, selects `Try 🐉`, and verifies the local dragon rendering and active toolbar state.
- Run the full demo test suite, TypeScript check, and production build.
- Validate the hero in a desktop viewport and at 390×844, confirming the seventh control is visible and there is no horizontal overflow.
- Preserve the five known Windows-only baseline failures in `scripts/tests/skills.test.ts` as pre-existing environment issues.

## Out of scope

- Replacing any existing hero provider.
- Changing the default hero selection.
- Adding new artwork or modifying the dragon provider package.
- Refactoring the hero stage into a new component.

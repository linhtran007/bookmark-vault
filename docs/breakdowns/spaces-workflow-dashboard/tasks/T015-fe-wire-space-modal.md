# T015: FE - Wire space modal into sidebar (remove prompts)

- **ID**: T015
- **State**: `pending`

## Business Summary
Improve perceived quality and consistency by removing `window.prompt`/`window.alert` flows.

## Logic
- Add Space opens the modal
- Rename Space opens the same modal
- After success, refresh list and select the created/renamed space

## Technical Logic
- Replace prompt logic in `components/spaces/SpacesSidebar.tsx`.
- Keep delete confirmation via `ConfirmDialog`.

## Testing
- No FE tests. Verify manually.

## Files
- Modify: `components/spaces/SpacesSidebar.tsx`

## Reference Patterns
- Existing sidebar: `components/spaces/SpacesSidebar.tsx:1`
- Confirm dialog: `components/ui/ConfirmDialog.tsx:28`

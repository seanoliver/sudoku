# Keyboard focus after removing controls

## Symptom

Keyboard shortcuts stop responding after N hides the focused Exclude chip or Backspace clears annotations while Erase has focus.

## Root cause

Both controls unmount after these state changes. Browser focus falls to the body, outside the app element that owns the keyboard handler. Clicking Erase already restores board focus; keyboard deletion and Notes transitions lacked that restoration.

## Reproduction

1. Select an empty cell, enable Notes, and click Exclude.
2. Press N. The Exclude chip disappears and document.activeElement becomes BODY.
3. Press N again. Notes stays off because the event cannot reach the app handler.
4. Alternatively, add a note, focus Erase, then press Backspace. Erase disappears and focus falls to BODY.

## Fix

Restore focus to the selected board cell after toggling Notes and after keyboard deletion. Both paths reuse the existing board focus pattern.

## Verification

Pre-fix reproduction in the local production browser confirmed BODY focus and ignored subsequent N input for the Exclude case, and BODY focus after keyboard deletion from Erase. After the fix, both paths restore the selected cell as document.activeElement, and the next N or digit key works without clicking. Browser checks used the rebuilt production app on a fresh localhost port. All 69 tests, lint, typecheck and the production build passed.

## Recurrence guardrail

When a control can disappear after a shortcut, include keyboard activation from that control in browser QA. Confirm that focus remains within the app and the next shortcut works without a pointer click.

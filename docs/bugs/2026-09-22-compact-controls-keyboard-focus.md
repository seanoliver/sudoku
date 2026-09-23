# Keyboard focus after removing controls

## Symptom

Keyboard shortcuts stop responding after N hides the focused Exclude chip or Backspace, Undo, or a note toggle clears the last annotation while Erase has focus.

## Root cause

Both controls unmount after these state changes. Browser focus falls to the body, outside the app element that owns the keyboard handler. Clicking Erase already restores board focus; keyboard edits, Undo and Notes transitions lacked that restoration.

## Reproduction

1. Select an empty cell, enable Notes, and click Exclude.
2. Press N. The Exclude chip disappears and document.activeElement becomes BODY.
3. Press N again. Notes stays off because the event cannot reach the app handler.
4. Alternatively, add a note, focus Erase, then press Backspace, Cmd/Ctrl+Z, or the same digit. Erase disappears and focus falls to BODY.

## Fix

Restore focus to the selected board cell after toggling Notes, keyboard number entry, keyboard deletion and keyboard Undo. A shared helper also serves existing selection clearing and pointer actions.

## Verification

Pre-fix reproduction in the local production browser confirmed BODY focus and ignored subsequent N input for the Exclude case, and BODY focus after keyboard deletion from Erase. Undo and last-note toggling from Erase also reproduced BODY focus before their fix. After the fix, all four paths restore the selected cell as document.activeElement, and the next N or digit key works without clicking. Browser checks used the rebuilt production app on a fresh localhost port. All 69 tests, lint, typecheck and the production build passed.

## Recurrence guardrail

When a control can disappear after a shortcut, include keyboard activation from that control in browser QA. Confirm that focus remains within the app and the next shortcut works without a pointer click.

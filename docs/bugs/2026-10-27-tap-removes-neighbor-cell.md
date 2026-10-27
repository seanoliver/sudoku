# A tap in a drag selection removes the neighboring cell

## Symptom
In the iPhone app (TestFlight 1.0 (13)), after dragging across cells, tapping one of the selected cells sometimes removed the cell next to it from the selection.

## Root cause
Unconfirmed, because only a real finger shows it. The likely cause is that iOS hit-tests a press and a tap differently:

- The press (`pointerdown`) lands on the cell under the exact touch point. `useNoteSelection` starts drags from that cell.
- iOS WebKit then sends the synthetic `click` to the cell it picks from the fingertip's contact area. That cell can be a neighbor when the fingertip overlaps it.

`clickCell` acted on the cell that received the `click`, so the press and the tap could name different cells.

## Reproduction
Real touches with a point-sized contact all removed the tapped cell: Chromium touch emulation, Playwright WebKit (mouse and touch), and Safari on the iPhone 17 Simulator (iOS 26.2) driven by `safaridriver` touch actions. The neighbor case needs a real fingertip on a device.

The e2e test reproduces the mismatch directly. It presses one cell and redirects the resulting `click` to its neighbor.

## Fix
`useNoteSelection` records the pressed cell on `pointerup` when the gesture was a tap. `clickCell` acts on that cell for pointer clicks (`detail !== 0`). Keyboard and assistive activation (`detail === 0`) still use the cell that received the click.

## Verification
- `e2e/batch-sticky.spec.ts`: "a tap that iOS delivers to a neighboring cell still removes the pressed cell from the selection" passes in Chromium and WebKit with the fix, and fails in both when `clickCell` uses the clicked cell.
- On-device check: TestFlight build 14 from this branch.

## Recurrence guardrail
Board taps act on the cell from `pointerdown`, the same hit test drags use. Don't take the cell for a tap from the `click` event's target.

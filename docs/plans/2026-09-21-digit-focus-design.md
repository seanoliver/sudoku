# Digit focus design

Approved in conversation: offer an explicit Focus button and a hold on a filled cell. Show a quiet shortcut hint until the first successful hold, then retain the instruction only in How to play.

## Behavior

Select a filled cell and activate Focus on its digit, or hold a filled cell for 400ms. Focus persists across empty-cell selection, note/exclusion modes, batch-note entry, Clear selection, and undo. Selecting another filled cell switches an active focus. Clear focus returns to ordinary selected-cell highlighting. Focus resets for a new puzzle or reload, never writes game history, and never enters a number. Existing Smart highlighting remains opt-in; matching values and visible positive notes highlight independently of it.

Hold on an empty cell retains batch selection. Moving before the hold threshold, cancellation, blur, a second pointer, pausing, and dialogs must prevent unintended focus. Holding a filled cell while a batch exists may change focus without changing the batch or its keyboard target.

## Presentation and accessibility

A minimalist 58px standalone panel with a focus icon and an accessible close control above the board groups the shortcut hint with its action and offers Focus on the selected digit, then Focusing on the digit and Clear focus. Keep its height stable while choosing cells. The hint reads “You can also hold a filled cell.” It is shown only with an available Focus action, before the shortcut has been learned. Persist only that learned flag, tolerating storage failure. Put the complete instructions in How to play. Native buttons provide keyboard access; focus and batch controls remain separate.

## Verification

Browser checks cover explicit and hold activation, canceled gestures, matching notes, Smart highlighting on/off, annotation modes, batch persistence, switching, clearing, keyboard focus, pause/dialog cancellation, preference persistence, reload/new puzzle reset, both themes, and phone layout. Existing unit tests and release gates must pass. Keep production game saving and the latest correctness and corner fixes.

export type Move = 'push' | 'pop' | 'grow' | 'shrink';
// Each class needs a matching `::view-transition-*(.class)` rule in globals.css, or that screen does not animate.
export const SCREEN_ENTER = { push: 'push-in', pop: 'pop-in', grow: 'fade', shrink: 'fade', default: 'none' };
export const SCREEN_EXIT = { push: 'push-out', pop: 'pop-out', grow: 'fade', shrink: 'fade', default: 'none' };
export const BOARD_SHARE = { grow: 'board', shrink: 'board', default: 'none' };

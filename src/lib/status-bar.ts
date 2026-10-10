/** iOS build: the status bar's text follows the app's own theme, and turns light while a card sheet blacks out the page around the game. */
const native = process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios' ? import('@capacitor/status-bar') : null;

export function setStatusBarText(light: boolean) {
  native?.then(({ StatusBar, Style }) => StatusBar.setStyle({ style: light ? Style.Dark : Style.Light })).catch(() => { /* The status bar keeps the system style. */ });
}

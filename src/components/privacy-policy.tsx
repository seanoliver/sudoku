/** The privacy policy, shared by the /privacy page and the in-app views. */
export function PrivacyPolicy() {
  return <div className="privacy-policy">
    <p>Sudoku has no accounts and no servers that hold your data.</p>
    <h3>On your device</h3>
    <p>Your puzzles, notes, history, lessons, and settings are saved on your device and never leave it. Deleting the app, or clearing the site&apos;s data in your browser, deletes them.</p>
    <h3>The app</h3>
    <p>The iPhone app collects nothing. It makes no network requests and uses no analytics.</p>
    <h3>The website</h3>
    <p>sudoku.seanoliver.dev counts page views with Vercel Web Analytics, which uses no cookies and does not identify you.</p>
    <h3>Contact</h3>
    <p>Questions go to <a href="https://github.com/seanoliver/sudoku/issues">the project&apos;s GitHub issues</a>.</p>
    <p className="privacy-updated">Updated October 2026.</p>
  </div>;
}

/** The privacy policy, shared by the /privacy page and the in-app views. */
export function PrivacyPolicy({ headingLevel = 3 }: { headingLevel?: 2 | 3 } = {}) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return <div className="privacy-policy">
    <p>Sudoku has no accounts and no servers that hold your data.</p>
    <H>On your device</H>
    <p>Your puzzles, notes, history, lessons, and settings are saved on your device and never leave it. Deleting the app, or clearing the site&apos;s data in your browser, deletes them.</p>
    <H>The app</H>
    <p>The iPhone app collects nothing. It makes no network requests and uses no analytics.</p>
    <H>The website</H>
    <p>sudoku.seanoliver.dev counts page views with Vercel Web Analytics, which uses no cookies and does not identify you.</p>
    <H>Contact</H>
    <p>Questions go to <a href="https://github.com/seanoliver/sudoku/issues">the project&apos;s GitHub issues</a>.</p>
    <p className="privacy-updated">Updated October 2026.</p>
  </div>;
}

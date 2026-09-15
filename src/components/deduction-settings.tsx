import { DEDUCTIONS, type DeductionId, type DeductionSettings as Settings } from '@/lib/deductions';

function PointingPairsExample() {
  return <figure className="deduction-example">
    <div className="example-caption">Example row across three boxes</div>
    <div className="pointing-example" role="img" aria-label="The left box has only two possible 5s, both in the top row. Remove 5 from the six cells to their right, outside that box.">
      {Array.from({ length: 27 }, (_, i) => {
        const source = i % 9 < 3;
        return <span key={i} aria-hidden="true" className={`example-cell ${source ? 'example-source' : ''}`}>
          {i < 2 ? <b>5</b> : i >= 3 && i < 9 ? <del>5</del> : <span className="example-dot">·</span>}
        </span>;
      })}
    </div>
    <figcaption>The left box must put its 5 in one of the two marked cells. Both are in the top row, so 5 can be removed from that row outside the box. This also works in a column.</figcaption>
  </figure>;
}

function HiddenPairsExample() {
  const cells = [[3,5,7], [1,2], [2,4], [1,6], [3,7,9], [2,5], [4,8], [1,6], [2,9]];
  return <figure className="deduction-example">
    <div className="example-caption">Example box</div>
    <div className="hidden-example" role="img" aria-label="Only the top-left and center cells allow 3 or 7. Those two cells must contain 3 and 7, so remove the extra 5 from the top-left cell and the extra 9 from the center cell.">
      {cells.map((digits, i) => <span key={i} aria-hidden="true" className={`example-cell ${i === 0 || i === 4 ? 'example-source' : ''}`}>
        {digits.map(digit => i === 0 || i === 4
          ? digit === 3 || digit === 7 ? <b key={digit}>{digit}</b> : <del key={digit}>{digit}</del>
          : <span key={digit}>{digit}</span>)}
      </span>)}
    </div>
    <figcaption>Only the two marked cells allow 3 and 7. Those cells must contain that pair, so their extra 5 and 9 can be removed. This also works in a row or column.</figcaption>
  </figure>;
}

const EXAMPLES: Record<DeductionId, typeof PointingPairsExample> = {
  pointingPairs: PointingPairsExample,
  hiddenPairs: HiddenPairsExample,
};

export function DeductionSettings({ value, onChange }: { value: Settings; onChange: (value: Settings) => void }) {
  return <section className="deduction-settings" aria-labelledby="deductions-title">
    <h3 id="deductions-title">Deductions</h3>
    <p className="deductions-intro">Choose which deductions run automatically. They refine Auto notes and Smart highlighting, and can reveal further deductions. Your manual notes stay as you wrote them.</p>
    {DEDUCTIONS.map(rule => {
      const Example = EXAMPLES[rule.id];
      return <div className="deduction-option" key={rule.id}>
        <div className="setting-row">
          <div><strong>{rule.title}</strong><p id={`${rule.id}-description`}>{rule.description}</p></div>
          <button className="switch" role="switch" aria-checked={value[rule.id]} aria-label={rule.title} aria-describedby={`${rule.id}-description`} onClick={() => onChange({ ...value, [rule.id]: !value[rule.id] })}><span/></button>
        </div>
        <details>
          <summary>Show example<span className="sr-only"> for {rule.title}</span></summary>
          <Example/>
        </details>
      </div>;
    })}
    <p className="deductions-footnote">Turn a deduction off to restore possibilities it removed. Deductions pause when current entries create a contradiction. Numbers are never filled in automatically.</p>
  </section>;
}

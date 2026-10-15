import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Code2, KeyRound, LaptopMinimal, Mail, RotateCcw, ScanText } from 'lucide-react';

type Finding = { id: string; label: string; value: string; placeholder: string; kind: 'email' | 'key' };
type Scenario = { id: string; label: string; draft: string; findings: Finding[] };

const scenarios: Scenario[] = [
  {
    id: 'prompt', label: 'Prompt',
    draft: 'Help me debug this request. My email is demo@example.com and my API key is demo-key-not-real.',
    findings: [
      { id: 'email', label: 'Email address', value: 'demo@example.com', placeholder: '[EMAIL_1]', kind: 'email' },
      { id: 'api', label: 'API key', value: 'demo-key-not-real', placeholder: '[API_KEY_1]', kind: 'key' },
    ],
  },
  {
    id: 'code', label: 'Code',
    draft: '# Sample .env — fake values only\nSERVICE_API_KEY=demo-key-not-real\nDATABASE_PASSWORD=demo-password-not-real',
    findings: [
      { id: 'api', label: 'API key', value: 'demo-key-not-real', placeholder: '[API_KEY_1]', kind: 'key' },
      { id: 'password', label: 'Database password', value: 'demo-password-not-real', placeholder: '[PASSWORD_1]', kind: 'key' },
    ],
  },
];

/** A self-contained illustration. It does not run Veilo or send any data. */
export function PromptDemo() {
  const [scenarioId, setScenarioId] = useState('prompt');
  const [selected, setSelected] = useState<string[]>(['email', 'api']);
  const [sentText, setSentText] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const scenario = scenarios.find(item => item.id === scenarioId)!;
  const selectedCount = scenario.findings.filter(item => selected.includes(item.id)).length;

  function chooseScenario(next: Scenario) {
    setScenarioId(next.id);
    setSelected(next.findings.map(item => item.id));
    setSentText(null);
  }

  function toggleFinding(id: string) {
    setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  function replaceSelected() {
    const result = scenario.findings.reduce((text, finding) => selected.includes(finding.id)
      ? text.split(finding.value).join(finding.placeholder) : text, scenario.draft);
    setSentText(result);
  }

  return (
    <div className="prompt-demo">
      <div className="demo-chrome">
        <span className="demo-chrome-title"><ScanText size={16} aria-hidden="true" /> A little preview</span>
        <span className="demo-local"><LaptopMinimal size={14} aria-hidden="true" /> Runs on your device</span>
      </div>

      <div className="demo-tabs" role="group" aria-label="Choose an illustrative sample">
        {scenarios.map(item => (
          <button key={item.id} type="button" className={`demo-tab${item.id === scenarioId ? ' is-active' : ''}`}
            aria-pressed={item.id === scenarioId} onClick={() => chooseScenario(item)}>
            {item.id === 'code' ? <Code2 size={15} aria-hidden="true" /> : <ScanText size={15} aria-hidden="true" />}
            {item.label}
          </button>
        ))}
        <span className="demo-sample-note">All values are made up</span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${scenarioId}-${sentText === null ? 'review' : 'result'}`} className="demo-panel"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}
          onAnimationComplete={() => { if (sentText !== null) resultHeading.current?.focus({ preventScroll: true }); }}>
          {sentText === null ? (
            <>
              <div className="demo-draft">
                <span className="demo-draft-label">Your draft</span>
                <pre className={`demo-message${scenarioId === 'code' ? ' is-code' : ''}`}>{scenario.draft}</pre>
              </div>

              <div className="demo-review">
                <div className="demo-review-heading">
                  <span className="demo-review-symbol" aria-hidden="true"><KeyRound size={18} /></span>
                  <div><h3>A quick privacy check</h3><p>Choose what stays private.</p></div>
                  <span className="demo-finding-count">{scenario.findings.length} items</span>
                </div>

                <fieldset className="demo-findings">
                  <legend className="demo-sr-only">Select the sample details to replace</legend>
                  {scenario.findings.map(finding => (
                    <label className={`demo-finding${selected.includes(finding.id) ? ' is-selected' : ''}`} key={finding.id}>
                      <input type="checkbox" checked={selected.includes(finding.id)}
                        onChange={() => toggleFinding(finding.id)} aria-label={`Replace ${finding.label.toLowerCase()} with ${finding.placeholder}`} />
                      <span className="demo-finding-icon" aria-hidden="true">
                        {finding.kind === 'email' ? <Mail size={16} /> : <KeyRound size={16} />}
                      </span>
                      <span className="demo-finding-label">{finding.label}</span>
                      <code className="demo-placeholder">{finding.placeholder}</code>
                    </label>
                  ))}
                </fieldset>

                <div className="demo-actions">
                  <span className="demo-selection-note">{selectedCount ? `${selectedCount} selected` : 'Select an item to replace'}</span>
                  <button type="button" className="demo-replace" onClick={replaceSelected} disabled={!selectedCount}>
                    Replace selected <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="demo-result">
              <div className="demo-result-heading"><span className="demo-result-check" aria-hidden="true"><Check size={18} /></span>
                <div><h3 ref={resultHeading} tabIndex={-1}>Ready to share</h3><p>A preview of the prompt you would share.</p></div>
              </div>
              <pre className={`demo-message demo-result-message${scenarioId === 'code' ? ' is-code' : ''}`}>{sentText}</pre>
              <p className="demo-result-note">{selectedCount === scenario.findings.length
                ? 'Your selected details became placeholders. The rest stays useful.'
                : 'Only your selections became placeholders. Unselected details remain visible.'}</p>
              <button type="button" className="demo-reset" onClick={() => chooseScenario(scenario)}>
                <RotateCcw size={15} aria-hidden="true" /> Try again
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="demo-status demo-sr-only" role="status" aria-live="polite" aria-atomic="true">
        {sentText !== null ? `Preview updated. ${selectedCount} fake ${selectedCount === 1 ? 'value was' : 'values were'} replaced with placeholders.` : ''}
      </p>
      <p className="demo-disclaimer">Illustrative demo. No message is sent.</p>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Code2, Download, FileCode2, FileText, Image, KeyRound, LockKeyhole, Menu, Monitor, MousePointer2, Plus, ScanLine, Settings2, SlidersHorizontal, X } from 'lucide-react';
import { PromptDemo } from './PromptDemo';
import { FeedbackModal } from './FeedbackModal';

const GITHUB = 'https://github.com/tharxn/Veilo';

function Github({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19 4.77 5.07 5.07 0 0 0 18.91 1S17.73.65 15 2.48a13.38 13.38 0 0 0-7 0C5.27.65 4.09 1 4.09 1A5.07 5.07 0 0 0 4 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 8 18.13V22" /></svg>;
}

function Brand({ light = false }: { light?: boolean }) {
  return <span className="brand"><img src={light ? '/veilo-mark-dark.svg' : '/veilo-mark.svg'} alt="" width="34" height="34" /><span>Veilo</span></span>;
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-55px' }} transition={{ duration: .65, delay, ease: [.22, 1, .36, 1] }}>{children}</motion.div>;
}

function ChromeIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M12 8h9M8.5 14 4 6M14 15.5 9 22" /></svg>;
}

function InstallButton({ className = '', children = 'Get Veilo' }: { className?: string; children?: ReactNode }) {
  return <a className={`button button-primary ${className}`} href="#get-started"><ChromeIcon /><span>{children}</span><ArrowUpRight size={17} /></a>;
}

function Header() {
  const [open, setOpen] = useState(false);
  const nav = [{ href: '#how-it-works', label: 'How it works' }, { href: '#your-controls', label: 'Your controls' }, { href: '#questions', label: 'Questions' }];
  return <header className="site-header">
    <div className="nav-wrap container">
      <a href="#top" className="brand-link" aria-label="Veilo home"><Brand /></a>
      <nav className="desktop-nav" aria-label="Main navigation">{nav.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
      <div className="nav-actions"><a className="github-icon" href={GITHUB} target="_blank" rel="noreferrer" aria-label="Veilo on GitHub"><Github size={20} /></a><a className="button button-ink nav-install" href="#get-started">Get Veilo <ArrowUpRight size={16} /></a><button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close navigation' : 'Open navigation'}>{open ? <X size={22} /> : <Menu size={22} />}</button></div>
    </div>
    <AnimatePresence>{open && <motion.nav id="mobile-nav" className="mobile-nav" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} aria-label="Mobile navigation">{nav.map(link => <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}<ArrowUpRight size={17} /></a>)}<a href="#get-started" onClick={() => setOpen(false)}>Get Veilo<ArrowRight size={17} /></a></motion.nav>}</AnimatePresence>
  </header>;
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const float = useTransform(scrollYProgress, [0, 1], [0, -48]);
  return <section className="hero container" id="top" ref={ref}>
    <div className="hero-copy">
      <motion.div className="eyebrow hero-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .7 }}><span className="tiny-mark">✳</span> A little privacy. A lot of peace of mind.</motion.div>
      <motion.h1 initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .85, ease: [.22, 1, .36, 1] }}>Share your ideas.<br /><span>Keep your<br className="desktop-break" /> details.</span></motion.h1>
      <motion.p className="hero-description" initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75, delay: .12 }}>A second look before you share with AI. Veilo checks for personal details and secrets, so you can choose what goes into your next prompt.</motion.p>
      <motion.div className="hero-cta" initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75, delay: .2 }}><InstallButton /><a className="text-link" href="#how-it-works">Meet your new privacy habit <ArrowDown size={16} /></a></motion.div>
      <div className="hero-footnote"><span><Check size={14} /> Checks on your device</span><span><Check size={14} /> Open source</span><span><Check size={14} /> No Veilo account</span></div>
    </div>
    <motion.div className="hero-visual" style={{ y: reduced ? 0 : float }} initial={reduced ? false : { opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .15, ease: [.22, 1, .36, 1] }}>
      <div className="visual-topline"><span className="line-symbol" /><span>Your words. Your choice.</span><MousePointer2 size={14} /></div>
      <PromptDemo />
      <div className="visual-caption"><span className="caption-line" /> A small pause before the big send.</div>
    </motion.div>
  </section>;
}

const platforms = [
  { name: 'ChatGPT', logo: 'chatgpt.svg' },
  { name: 'Claude', logo: 'claude.png' },
  { name: 'Gemini', logo: 'gemini.svg' },
  { name: 'Copilot', logo: 'copilot.png' },
  { name: 'Perplexity', logo: 'perplexity.svg' },
  { name: 'Grok', logo: 'grok.svg' },
];

function PlatformStrip() {
  return <section className="platforms container" aria-label="Popular AI platforms"><div className="platform-intro">For the AI chats<br /><strong>you already use.</strong></div><div className="platform-list">{platforms.map((platform, i) => <span key={platform.name} className={`platform-name platform-${i}`}><img src={`/platforms/${platform.logo}`} alt="" width="28" height="28" />{platform.name}</span>)}</div><p>And other recognized AI chats. Platform support can change.</p></section>;
}

function Steps() {
  const steps = [
    { number: '01', icon: <FileText size={22} />, title: 'Write like you always do.', text: 'Ask a question. Paste a snippet. Draft a reply. Keep using your favourite supported AI chat.' },
    { number: '02', icon: <ScanLine size={22} />, title: 'Take a second look.', text: 'Veilo spots possible sensitive details and opens a review. Choose which text to replace.' },
    { number: '03', icon: <ArrowUpRight size={22} />, title: 'Send what you mean to.', text: 'Selected values become placeholders. The rest of your prompt carries on as you wrote it.' },
  ];
  return <section className="how-section section container" id="how-it-works">
    <Reveal className="section-heading"><span className="eyebrow section-kicker"><span /> A pause, not a detour</span><h2>One small moment.<br />A more considered prompt.</h2><p>You don’t need to change how you work.<br className="desktop-break" /> Just give your details a second thought.</p></Reveal>
    <div className="steps-grid">{steps.map((step, i) => <Reveal key={step.number} className="step" delay={i * .09}><div className="step-top"><span className="step-number">{step.number}</span>{step.icon}</div><h3>{step.title}</h3><p>{step.text}</p></Reveal>)}</div>
  </section>;
}

function AttachmentPreview() {
  const [tab, setTab] = useState<'image' | 'file'>('image');
  return <div className="attachment-preview">
    <div className="attachment-switch" role="group" aria-label="Attachment preview type"><button aria-pressed={tab === 'image'} onClick={() => setTab('image')} className={tab === 'image' ? 'is-active' : ''}><Image size={14} /> An image</button><button aria-pressed={tab === 'file'} onClick={() => setTab('file')} className={tab === 'file' ? 'is-active' : ''}><FileCode2 size={14} /> A file</button></div>
    <div className={`sample-file ${tab === 'file' ? 'sample-code' : ''}`}><div className="sample-file-heading">{tab === 'image' ? <Image size={19} /> : <FileCode2 size={19} />}<span>{tab === 'image' ? 'project-screenshot.png' : 'project.env'}</span><span className="file-format">{tab === 'image' ? 'PNG' : 'ENV'}</span></div><div className="sample-file-content"><span className="sample-label">{tab === 'image' ? 'Project credentials' : '# Sample environment'}</span><div><span>API_KEY</span><mark>demo-key-123</mark></div><div><span>EMAIL</span><mark>demo@example.com</mark></div><div className="scan-line" aria-hidden="true" /></div><span className="sample-only">Made-up example</span></div>
    <div className="attachment-found"><span className="attachment-found-icon"><ScanLine size={17} /></span><div><strong>Sensitive information found</strong><span>Review before sharing the original.</span></div><Check size={17} /></div>
  </div>;
}

function Features() {
  return <section className="features-section section container" id="what-it-checks">
    <Reveal className="feature-heading"><div><span className="eyebrow section-kicker"><span /> More than a forgotten email</span><h2>The little details<br />that deserve a little care.</h2></div><p>From a quick question to a code snippet,<br className="desktop-break" /> a secret can slip in anywhere.</p></Reveal>
    <div className="features-grid">
      <Reveal className="feature-panel text-feature"><div className="feature-icon"><KeyRound size={22} /></div><h3>Keep the context.<br />Leave out the credentials.</h3><p>Email addresses, passwords, API keys, identity numbers, and more. Replace selected matches with clear placeholders.</p><div className="redaction-sample"><div className="redaction-before"><span className="mini-label">Your draft</span><code>My API key is <span>demo-key-123</span></code></div><div className="redaction-arrow"><ArrowDown size={17} /><span>You decide</span></div><div className="redaction-after"><span className="mini-label">Your reviewed prompt</span><code>My API key is <span>[API_KEY_1]</span></code><Check size={15} /></div></div></Reveal>
      <Reveal className="feature-panel attachment-feature" delay={.09}><div className="feature-icon"><Image size={22} /></div><h3>That screenshot<br />might have a secret, too.</h3><p>Supported images and text files get a local check. Cancel the upload, or choose to share the original file.</p><AttachmentPreview /><p className="attachment-honesty">Attachments are checked and flagged, not redacted.</p></Reveal>
    </div>
    <Reveal className="local-band"><div className="local-band-mark"><LockKeyhole size={25} /></div><div><h3>Less sharing starts on your device.</h3><p>Text checks and image OCR run locally. No Veilo server is needed to inspect your content.</p></div><a href="#questions" className="local-band-link">A closer look at privacy <ArrowUpRight size={18} /></a></Reveal>
  </section>;
}

const controls = [
  { id: 'email', label: 'Email addresses', value: 'demo@example.com' },
  { id: 'keys', label: 'API keys', value: '[API_KEY_1]' },
  { id: 'password', label: 'Passwords', value: '[PASSWORD_1]' },
  { id: 'phone', label: 'Phone numbers', value: '[PHONE_1]' },
];

function Controls() {
  const [selected, setSelected] = useState(['keys', 'password', 'phone']);
  function toggle(id: string) { setSelected(prev => prev.includes(id) ? prev.filter(value => value !== id) : [...prev, id]); }
  return <section className="controls-section section" id="your-controls"><div className="container controls-grid"><Reveal className="controls-copy"><span className="eyebrow section-kicker"><span /> Privacy, on your terms</span><h2>A little protection.<br /><span>A lot of say.</span></h2><p>Keep the checks you want. Skip the ones you don’t. Veilo fits the way you use AI, whether that’s writing an email or working through a tricky bug.</p><ul className="control-benefits"><li><SlidersHorizontal size={19} /><span>Choose from 24 detection label groups.</span></li><li><Monitor size={19} /><span>Set protection for individual AI sites.</span></li><li><Settings2 size={19} /><span>Make an exception right in the review.</span></li></ul><a href="#get-started" className="text-link">Make yourself comfortable <ArrowUpRight size={17} /></a></Reveal><Reveal className="controls-visual" delay={.1}><div className="preferences-card"><div className="preferences-bar"><Brand /><Settings2 size={18} /></div><div className="preferences-body"><div className="preference-title"><div><h3>Your detection preferences</h3><p>A preview. Try a toggle.</p></div><span>{selected.length} on</span></div>{controls.map(item => <div className="preference-row" key={item.id}><span>{item.label}</span><button role="switch" aria-checked={selected.includes(item.id)} aria-label={`Detect ${item.label.toLowerCase()} in preview`} className={`demo-switch ${selected.includes(item.id) ? 'is-on' : ''}`} onClick={() => toggle(item.id)}><span /></button></div>)}<div className="preferences-note"><LockKeyhole size={14} /><span>Your extension preferences stay on your device.</span></div></div></div><div className="controls-caption"><span className="small-cross">+</span> Less interruption. More intention.</div></Reveal></div></section>;
}

const faqs = [
  { question: 'What does Veilo actually protect?', answer: 'Veilo checks prompts for possible personal information and developer secrets, such as emails, phone numbers, passwords, API keys, and identity numbers. You choose which detected text to replace with placeholders. It also checks supported image and text-file uploads and warns before you share them.' },
  { question: 'Does my content go to a Veilo server?', answer: 'No Veilo server is needed for detection. Text checks and image OCR run on your device in the extension. The AI provider receives the prompt or original attachment you choose to send, including any values you leave unchecked.' },
  { question: 'Does Veilo use another AI to read my prompts?', answer: 'Text detection uses written rules, context, and format validators. Supported images are read with bundled English Tesseract OCR, then checked with detection rules. Veilo does not need a hosted language model for those checks.' },
  { question: 'Can Veilo remove secrets from an image or file?', answer: 'Veilo currently warns about supported attachments; it does not rewrite files or edit image pixels. When a warning appears, Cancel stops the upload, while Send Anyway shares the original file. Unsupported formats also offer Cancel or Send Anyway without inspection.' },
  { question: 'Will it catch every sensitive detail?', answer: 'No. Patterns can miss unusual values, and OCR can misread small, blurry, handwritten, or non-English text. AI websites can also change their interfaces. Review what you share and check that Veilo reports protection as active.' },
  { question: 'How can I install Veilo?', answer: 'Choose Download ZIP below for a ready-to-use extension, or use the command line to build it from source. Extract the ZIP, open chrome://extensions, enable Developer mode, and use Load unpacked to select the extracted folder containing manifest.json. The ZIP needs no Node.js or build commands. Veilo is not yet listed in the Chrome Web Store.' },
];

function Questions() {
  const [open, setOpen] = useState<number | null>(0);
  return <section className="faq-section section container" id="questions"><Reveal className="faq-heading"><span className="eyebrow section-kicker"><span /> Good questions</span><h2>A little clarity<br />goes a long way.</h2><p>Privacy tools should be easy<br className="desktop-break" /> to understand, too.</p><a className="text-link" href={`${GITHUB}#readme`} target="_blank" rel="noreferrer">Read the documentation <ArrowUpRight size={16} /></a></Reveal><div className="faq-list">{faqs.map((faq, index) => <div key={faq.question} className={`faq-item ${open === index ? 'is-open' : ''}`}><h3><button id={`question-${index}`} aria-expanded={open === index} aria-controls={`answer-${index}`} onClick={() => setOpen(open === index ? null : index)}>{faq.question}<Plus size={19} className="faq-plus" /></button></h3><AnimatePresence initial={false}>{open === index && <motion.div id={`answer-${index}`} role="region" aria-labelledby={`question-${index}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .25, ease: [.22, 1, .36, 1] }}><p>{faq.answer}</p></motion.div>}</AnimatePresence></div>)}</div></section>;
}

function GetStarted() {
  const [method, setMethod] = useState<'zip' | 'cli'>('zip');
  const [copied, setCopied] = useState(false);
  const command = 'git clone https://github.com/tharxn/Veilo.git\ncd Veilo\nnpm install\nnpm run build';

  async function copyCommands() {
    try { await navigator.clipboard.writeText(command); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(false); }
  }

  return <section className="get-started-section container" id="get-started">
    <Reveal className="get-started-card">
      <div className="get-started-copy">
        <span className="eyebrow"><ChromeIcon size={17} /> Available for Chrome</span>
        <h2>Your next prompt.<br /><span>A little more private.</span></h2>
        <p>Choose the ready-to-use ZIP or build from source with the command line. A few setup steps, then back to your ideas.</p>
        <a className="button button-cream" href={GITHUB} target="_blank" rel="noreferrer"><Github size={18} /> View the source <ArrowUpRight size={17} /></a>
        <span className="install-status">Unpacked extension · Chrome Web Store release to come</span>
      </div>

      <div className="install-options">
        <p className="install-method-label">Choose how to install</p>
        <div className="install-method-picker" role="group" aria-label="Installation method">
          <button type="button" aria-pressed={method === 'zip'} aria-controls="install-instructions" onClick={() => setMethod('zip')}>
            <Download size={17} aria-hidden="true" /><span>Download ZIP</span>
          </button>
          <button type="button" aria-pressed={method === 'cli'} aria-controls="install-instructions" onClick={() => setMethod('cli')}>
            <Code2 size={17} aria-hidden="true" /><span>Command line</span>
          </button>
        </div>

        <div id="install-instructions" className="install-instructions">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={method} className="install-steps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}>
              {method === 'zip' ? <>
                <div className="install-step">
                  <span>1</span>
                  <div>
                    <h3>Download and extract</h3>
                    <p>Extract the ZIP into a folder you’ll keep, such as Documents/Veilo. No Node.js, build commands, or API key needed.</p>
                    <div className="zip-download-action">
                      <a className="button button-cream zip-download" href="/downloads/Veilo-extension-0.2.0.zip" download="Veilo-extension-0.2.0.zip"><Download size={18} aria-hidden="true" /><span>Download Veilo ZIP</span></a>
                      <span className="zip-download-meta">Version 0.2.0 · 4.7 MB</span>
                    </div>
                  </div>
                </div>
                <div className="install-step">
                  <span>2</span>
                  <div><h3>Load it in Chrome</h3><p>Open <code>chrome://extensions</code> and turn on <strong>Developer mode</strong>. Click <strong>Load unpacked</strong> and select the extracted folder containing <code>manifest.json</code>.</p></div>
                </div>
                <div className="install-step">
                  <span>3</span>
                  <div><h3>Make yourself at home</h3><p>Pin Veilo, check that protection is on, and refresh any open AI chat tabs. Keep the extracted folder in place while Veilo is installed.</p></div>
                </div>
              </> : <>
                <div className="install-step">
                  <span>1</span>
                  <div><h3>Clone and build</h3><p>Install Git and Node.js 18 or newer, then run these commands in your terminal.</p></div>
                </div>
                <div className="command-block">
                  <div><span>Terminal</span><button type="button" onClick={copyCommands} aria-label="Copy installation commands"><span role="status">{copied ? <><Check size={13} /> Copied</> : <>Copy <Code2 size={13} /></>}</span></button></div>
                  <pre><code>{command}</code></pre>
                </div>
                <div className="install-step">
                  <span>2</span>
                  <div><h3>Load it in Chrome</h3><p>Open <code>chrome://extensions</code>, turn on <strong>Developer mode</strong>, and click <strong>Load unpacked</strong>. Select <code>packages/extension/dist</code> inside the cloned project.</p></div>
                </div>
                <div className="install-step">
                  <span>3</span>
                  <div><h3>Open an AI chat</h3><p>Pin Veilo, check that protection is on, and refresh any open AI chat tabs. After rebuilding, reload Veilo in Chrome’s extension manager too.</p></div>
                </div>
              </>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Reveal>
  </section>;
}

function Footer({ onFeedback }: { onFeedback: () => void }) {
  return <footer className="site-footer container">
    <div className="footer-top">
      <a href="#top" className="brand-link" aria-label="Back to Veilo home"><Brand /></a>
      <p>A little more thought.<br />A little less oversharing.</p>
      <nav className="footer-links" aria-label="Footer">
        <a href={GITHUB} target="_blank" rel="noreferrer"><span className="footer-link-tail">GitHub<ArrowUpRight size={14} aria-hidden="true" /></span></a>
        <button type="button" className="footer-feedback" aria-haspopup="dialog" onClick={onFeedback}><span className="footer-link-tail">Feedback<ArrowUpRight size={14} aria-hidden="true" /></span></button>
        <a href="#questions">Privacy & <span className="footer-link-tail">questions<ArrowUpRight size={14} aria-hidden="true" /></span></a>
      </nav>
    </div>
    <div className="footer-bottom">
      <span>Made for your everyday AI conversations.</span>
      <div className="footer-credit"><span>Open source. Considered by design.</span><span>Made by Tharun</span></div>
      <a href="#top">Back to <span className="footer-link-tail">top<ArrowUpRight size={13} aria-hidden="true" /></span></a>
    </div>
  </footer>;
}

export default function App() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: .001 });
  useEffect(() => {
    function followSection(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      const hash = link?.getAttribute('href');
      const section = hash && hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
      if (!section || !hash) return;
      event.preventDefault();
      history.replaceState(null, '', hash);
      requestAnimationFrame(() => {
        section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
        if (hash === '#main') section.focus({ preventScroll: true });
      });
    }
    document.addEventListener('click', followSection);
    return () => document.removeEventListener('click', followSection);
  }, []);
  return <><a className="skip-link" href="#main">Skip to content</a><motion.div className="reading-progress" style={{ scaleX: progress }} /><Header /><main id="main" tabIndex={-1}><Hero /><PlatformStrip /><Steps /><Features /><Controls /><Questions /><GetStarted /></main><Footer onFeedback={() => setFeedbackOpen(true)} />{feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}</>;
}

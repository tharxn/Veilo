import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Bug, Check, Lightbulb, LoaderCircle, LockKeyhole, MessageSquare, X } from 'lucide-react';
import { isFeedbackEmail, MAX_FEEDBACK_MESSAGE_LENGTH } from '../shared/feedbackValidation';
import './feedback.css';

const categories = [
  { value: 'bug', label: 'Report a bug', Icon: Bug },
  { value: 'feature', label: 'Suggest an idea', Icon: Lightbulb },
  { value: 'general', label: 'Something else', Icon: MessageSquare },
] as const;
type Category = typeof categories[number]['value'];

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const retryRef = useRef<{ content: string; id: string } | null>(null);
  const busyRef = useRef(false);
  const backdropRef = useRef(false);
  const [category, setCategory] = useState<Category>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ message?: string; email?: string }>({});
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      requestRef.current?.abort();
      dialog.close();
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (submitted) headingRef.current?.focus({ preventScroll: true });
  }, [submitted]);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [error]);

  function close() {
    if (!busyRef.current) onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    // Read the displayed fields at submit time: browser autofill can update an
    // input without updating React's onChange state first.
    const fields = new FormData(event.currentTarget);
    const trimmedMessage = String(fields.get('message') ?? '').trim();
    const trimmedEmail = String(fields.get('email') ?? '').trim();
    const website = String(fields.get('website') ?? '');
    setMessage(trimmedMessage);
    setEmail(trimmedEmail);
    const nextErrors: { message?: string; email?: string } = {};
    if (!trimmedMessage) nextErrors.message = 'Please write a message before sending.';
    else if (trimmedMessage.length > MAX_FEEDBACK_MESSAGE_LENGTH) nextErrors.message = 'Please keep your message within 3,000 characters.';
    if (!trimmedEmail) nextErrors.email = 'Please enter your email so we know who the feedback is from.';
    else if (!isFeedbackEmail(trimmedEmail)) nextErrors.email = 'Please enter a valid email address, such as you@example.com.';
    setFieldErrors(nextErrors);
    setError('');
    if (nextErrors.message || nextErrors.email) {
      if (nextErrors.message) messageRef.current?.focus();
      else emailRef.current?.focus();
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    busyRef.current = true;
    setSending(true);
    setError('');
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const content = JSON.stringify({ category, message: trimmedMessage, email: trimmedEmail, website });
      if (retryRef.current?.content !== content) retryRef.current = { content, id: crypto.randomUUID() };
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ category, message: trimmedMessage, email: trimmedEmail, website, submissionId: retryRef.current.id }),
        signal: controller.signal,
      });
      const result: unknown = await response.json();
      if (response.status === 202 && typeof result === 'object' && result !== null && 'ok' in result && result.ok === true) {
        setSubmitted(true);
      } else {
        const reason = typeof result === 'object' && result !== null && 'message' in result && typeof result.message === 'string'
          ? result.message
          : 'Feedback could not be confirmed. Your message is still here; please try again.';
        setError(reason);
      }
    } catch {
      if (dialogRef.current?.open) setError('We couldn’t confirm your feedback. Check your connection and try again. Your message is still here.');
    } finally {
      window.clearTimeout(timeout);
      busyRef.current = false;
      setSending(false);
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  return <dialog
    ref={dialogRef}
    className="feedback-dialog"
    aria-labelledby="feedback-title"
    aria-describedby="feedback-description"
    onCancel={event => { event.preventDefault(); close(); }}
    onPointerDown={event => { backdropRef.current = event.target === event.currentTarget; }}
    onClick={event => {
      if (!backdropRef.current || event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }}
  >
    {submitted ? <div className="feedback-success">
      <button type="button" className="feedback-close" aria-label="Close feedback" onClick={close}><X /></button>
      <span className="feedback-success-mark" aria-hidden="true"><Check /></span>
      <h2 id="feedback-title" ref={headingRef} tabIndex={-1}>Thanks for your feedback.</h2>
      <p id="feedback-description">Your feedback has been submitted to Veilo. It helps shape what comes next.</p>
      <button type="button" className="feedback-done" onClick={close}>Back to Veilo <ArrowRight size={16} /></button>
    </div> : <form className="feedback-form" noValidate onSubmit={submit} aria-busy={sending}>
      <header className="feedback-header">
        <span className="feedback-eyebrow"><MessageSquare size={14} aria-hidden="true" /> A note to Veilo</span>
        <button type="button" className="feedback-close" aria-label="Close feedback" disabled={sending} onClick={close}><X /></button>
        <h2 id="feedback-title" ref={headingRef} tabIndex={-1}>Share your feedback.</h2>
        <p id="feedback-description">Send an idea or tell me what needs a fix.</p>
      </header>
      <fieldset className="feedback-types" disabled={sending}>
        <legend>What’s on your mind?</legend>
        {categories.map(({ value, label, Icon }) => <label className={`feedback-type ${category === value ? 'is-selected' : ''}`} key={value}>
          <input type="radio" name="feedback-category" value={value} checked={category === value} onChange={() => setCategory(value)} />
          <span><Icon aria-hidden="true" />{label}</span>
        </label>)}
      </fieldset>
      <div className="feedback-field">
        <label htmlFor="feedback-message">Your message</label>
        <textarea ref={messageRef} id="feedback-message" name="message" required maxLength={MAX_FEEDBACK_MESSAGE_LENGTH} rows={4} value={message} onChange={event => { setMessage(event.target.value); setError(''); setFieldErrors(previous => ({ ...previous, message: undefined })); }} disabled={sending} aria-invalid={Boolean(fieldErrors.message)} aria-describedby={`feedback-message-count${fieldErrors.message ? ' feedback-message-error' : ''}`} placeholder="Tell me what happened, or what you’d love to see…" />
        <div className="feedback-field-meta feedback-count"><span id="feedback-message-count">{message.length.toLocaleString()} / 3,000</span></div>
        {fieldErrors.message && <p id="feedback-message-error" className="feedback-field-error" role="alert">{fieldErrors.message}</p>}
      </div>
      <div className="feedback-field">
        <label htmlFor="feedback-email">Your email</label>
        <input ref={emailRef} id="feedback-email" name="email" type="email" required autoComplete="email" maxLength={254} value={email} onChange={event => { setEmail(event.target.value); setError(''); setFieldErrors(previous => ({ ...previous, email: undefined })); }} disabled={sending} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'feedback-email-error' : undefined} placeholder="you@example.com" />
        {fieldErrors.email && <p id="feedback-email-error" className="feedback-field-error" role="alert">{fieldErrors.email}</p>}
      </div>
      {/* A hidden field avoids Chrome treating the spam check as a contact field. */}
      <input type="hidden" name="website" defaultValue="" autoComplete="off" />
      <p className="feedback-note"><LockKeyhole aria-hidden="true" /><span>Your feedback is emailed privately to Veilo.</span></p>
      {error && <p ref={errorRef} className="feedback-error" role="alert">{error}</p>}
      <div className="feedback-actions">
        <button className="feedback-cancel" type="button" disabled={sending} onClick={close}>Cancel</button>
        <button className="feedback-submit" type="submit" disabled={sending} aria-busy={sending}>{sending ? <><LoaderCircle size={16} aria-hidden="true" /> Sending…</> : <>Send feedback <ArrowRight size={16} aria-hidden="true" /></>}</button>
      </div>
    </form>}
  </dialog>;
}

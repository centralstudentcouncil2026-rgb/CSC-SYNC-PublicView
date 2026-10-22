import { supabaseRequest } from '../services/supabase.js';
import { escapeHtml as esc } from './ui.js';

const draftKey = 'csc-sync-public-feedback-draft-v1';
const clientKey = 'csc-sync-public-feedback-client-v1';
const empty = () => ({ kind: 'Concern', title: '', message: '', name: '', contact: '', requestId: crypto.randomUUID() });
let draft = empty(), busy = false, notice = '', success = false;
try {
  const saved = JSON.parse(localStorage.getItem(draftKey));
  if (saved && typeof saved === 'object') {
    for (const key of ['title', 'message', 'name', 'contact']) draft[key] = String(saved[key] || '').slice(0, key === 'message' ? 4000 : key === 'title' ? 160 : key === 'name' ? 100 : 300);
    if (['Concern', 'Thought', 'Idea'].includes(saved.kind)) draft.kind = saved.kind;
    if (/^[\da-f-]{36}$/i.test(saved.requestId || '')) draft.requestId = saved.requestId;
  }
} catch { /* Storage may be unavailable. Keep the current in-memory draft. */ }
export const hasPublicFeedbackDraft = () => Boolean(draft.kind !== 'Concern' || draft.title || draft.message || draft.name || draft.contact);
function persist() { try { localStorage.setItem(draftKey, JSON.stringify(draft)); } catch { /* Keep the draft in memory. */ } }
function clientId() {
  try {
    const saved = localStorage.getItem(clientKey);
    if (/^[\da-f-]{36}$/i.test(saved || '')) return saved;
    const id = crypto.randomUUID(); localStorage.setItem(clientKey, id); return id;
  } catch { return draft.requestId; }
}

export function publicFeedbackContent() {
  return `<div class="student-about-body">
    <section class="student-about-intro"><h2>CSC S.Y.N.C.</h2>
      <p>Systemized Year-round Network Calendar helps the university community discover approved public events, keep track of activities, and connect with event organizers. It brings scheduling and coordination together for the Central Student Council and university organizations.</p>
      <p class="student-creator-credit">Created by Rex Dominic F. Perico.</p>
      <p>Under the leadership of Rex Dominic F. Perico — Central Student Council administration, SY 2026–2027.</p>
    </section>
    <form data-public-feedback><h2>Share with the CSC</h2><p>Send a concern, thought, or idea privately to the CSC team. Contact details are optional.</p>
      <div class="student-feedback-grid">
        <label>Type<select class="input" name="kind" ${busy ? 'disabled' : ''}>${['Concern', 'Thought', 'Idea'].map(kind => `<option ${draft.kind === kind ? 'selected' : ''}>${kind}</option>`).join('')}</select></label>
        <label>Title<input class="input" name="title" maxlength="160" value="${esc(draft.title)}" required ${busy ? 'readonly' : ''}></label>
        <label>Name (optional)<input class="input" name="name" maxlength="100" autocomplete="name" value="${esc(draft.name)}" ${busy ? 'readonly' : ''}></label>
        <label>Contact (optional)<input class="input" name="contact" maxlength="300" placeholder="Email, phone, or Messenger link" value="${esc(draft.contact)}" ${busy ? 'readonly' : ''}></label>
        <label class="student-feedback-message">Message<textarea class="input" name="message" rows="3" maxlength="4000" required ${busy ? 'readonly' : ''}>${esc(draft.message)}</textarea></label>
      </div>
      <label class="student-feedback-trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
      ${notice ? `<p class="student-feedback-notice ${success ? 'success' : 'error'}" role="${success ? 'status' : 'alert'}">${esc(notice)}</p>` : ''}
      <div class="student-feedback-actions"><button class="blue-pill" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Sending…' : 'Send to CSC'}</button></div>
    </form></div>`;
}

export function bindPublicFeedback(container, repaint) {
  const form = container.querySelector('[data-public-feedback]');
  if (!form) return;
  const capture = () => {
    for (const key of ['kind', 'title', 'message', 'name', 'contact']) draft[key] = form.elements.namedItem(key).value;
    persist();
  };
  form.oninput = capture;
  form.onchange = capture;
  form.onsubmit = async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    capture();
    const website = form.elements.website.value;
    busy = true; success = false; notice = ''; repaint();
    try {
      await supabaseRequest('/rpc/submit_public_feedback', { method: 'POST', body: JSON.stringify({
        p_request_id: draft.requestId, p_client_id: clientId(), p_kind: draft.kind,
        p_title: draft.title, p_message: draft.message, p_name: draft.name, p_contact: draft.contact, p_website: website,
      }) });
      draft = empty();
      try { localStorage.removeItem(draftKey); } catch { /* Already cleared in memory. */ }
      success = true; notice = 'Thank you. Your submission has been sent to CSC administrators.';
    } catch (error) {
      notice = /submit_public_feedback|schema cache|PGRST202/.test(error.message)
        ? 'Feedback needs database setup. Apply 043_public_feedback.sql. Your draft is saved.'
        : `${error.message || 'Your submission could not be sent.'} Your draft is saved. Please retry.`;
    } finally { busy = false; repaint(); }
  };
}

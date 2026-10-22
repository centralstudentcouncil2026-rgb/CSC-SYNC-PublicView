import { CSC_NAME } from '../shared/calendar-organization-filter.js';
import { publicFeedbackContent, bindPublicFeedback, hasPublicFeedbackDraft } from '../shared/public-feedback.js?v=20261022-public-feedback';
import { messengerHref } from "../shared/contact-links.js?v=20261022-messenger";
import { eventOccurrencesBetween } from '../services/events.js?v=20261022-calendar-blocks';
import { mapEvent } from '../services/database.js?v=20261022-calendar-blocks';
import { supabaseRequest } from '../services/supabase.js';
import { escapeHtml as esc, formatTime, monthTitle } from '../shared/ui.js';
import { adjacentMonth } from '../shared/schedule-controls.js';
import { monthSegments, renderMonthRows, bindMonthOverflow } from '../shared/calendar-layout.js?v=20261020-fit-strips';
import { calendarScheduleLabel, renderMainCalendarStrip } from '../shared/main-calendar.js?v=20261022-title-first';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const view = { date: today(), mode: 'month', filter: 'all', modal: hasPublicFeedbackDraft() ? { kind: 'about' } : null };
let events = [], loaded = false, loadError = '', controller;
let organizerContact = { id: '', state: 'loading', phone: '' };
let repaintView = null;
const repaint = () => repaintView?.();
const parts = date => ({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) });
const selectedEvents = () => events.filter(event => view.filter === 'all' || event.organizationName === view.filter);
const occurrences = (first, last) => eventOccurrencesBetween(first, last, selectedEvents());
const color = event => event.adminCreated ? 'admin-schedule' : 'approved';
const arrow = direction => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction < 0 ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'}"/></svg>`;

function header() {
  const organizations = [...new Set(events.map(event => event.organizationName))].sort();
  return `<header class="org-header schedule-calendar-header main-calendar-header">
    <div class="org-brand">
      <img class="seal logo-mark" src="./src/assets/csc-logo.png" alt="CSC S.Y.N.C. logo">
      <div><strong>CSC S.Y.N.C.</strong><small>Student Calendar</small></div></div>
    <h1>${view.mode === 'year' ? view.date.slice(0, 4) : monthTitle(view.date)}</h1>
    <div class="org-header-controls">
      <select class="top-pill" data-student-filter aria-label="Organization filter"><option value="all">Organizations</option>${organizations.map(name => `<option value="${esc(name)}" ${view.filter === name ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select>
      <select class="top-pill" data-student-view aria-label="Calendar view"><option value="month" ${view.mode === 'month' ? 'selected' : ''}>Month</option><option value="year" ${view.mode === 'year' ? 'selected' : ''}>Year</option></select>
      ${[-1, 1].map(step => `<button class="round-button nav-button" type="button" data-student-step="${step}" aria-label="${step < 0 ? 'Previous' : 'Next'} ${view.mode}" title="${step < 0 ? 'Previous' : 'Next'} ${view.mode}">${arrow(step)}</button>`).join('')}
      <button class="round-button" type="button" data-student-about aria-label="About CSC SYNC" title="About CSC SYNC"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/></svg></button>
    </div></header>`;
}

function monthGrid() {
  const { year, month } = parts(view.date);
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  const count = Math.ceil((offset + last) / 7) * 7;
  const bars = renderMonthRows(monthSegments(occurrences(`${prefix}01`, `${prefix}${last}`), year, month, offset), count / 7,
    (event, ...position) => renderMainCalendarStrip(event, ...position, { organizationName: event.organizationName }, { escapeHtml: esc, formatTime, color: color(event) }));
  return `<section class="org-calendar-shell main-calendar"><div class="weekday-row">${days.map(day => `<div>${day}</div>`).join('')}</div><div class="month-grid rows-${count / 7}">${Array.from({ length: count }, (_, index) => {
    const day = index - offset + 1;
    const date = day > 0 && day <= last ? `${prefix}${String(day).padStart(2, '0')}` : '';
    return `<button class="month-cell ${date === today() ? 'today' : ''}" ${date ? `data-student-date="${date}"` : 'disabled'}>${date ? `<strong class="month-date-number">${day}</strong>` : ''}</button>`;
  }).join('')}${bars}</div></section>`;
}

function yearGrid() {
  const year = Number(view.date.slice(0, 4));
  return `<section class="year-grid student-year-grid">${Array.from({ length: 12 }, (_, index) => {
    const prefix = `${year}-${String(index + 1).padStart(2, '0')}-`;
    const offset = new Date(Date.UTC(year, index, 1)).getUTCDay();
    const last = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
    const rows = occurrences(`${prefix}01`, `${prefix}${last}`);
    return `<button class="mini-month ${view.date.slice(0, 7) === prefix.slice(0, 7) ? 'active' : ''}" type="button" data-student-month="${prefix}01"><span class="mini-month-title"><strong>${new Date(Date.UTC(year, index, 1)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })}</strong><small>${year}</small></span><span class="mini-weekdays">${days.map(day => `<b>${day[0]}</b>`).join('')}</span><span class="mini-calendar-grid">${Array.from({ length: 42 }, (_, cell) => {
      const day = cell - offset + 1;
      if (day < 1 || day > last) return '<span class="mini-day empty"></span>';
      const date = `${prefix}${String(day).padStart(2, '0')}`;
      const dayEvents = rows.filter(event => event.occurrenceDate === date);
      return `<span class="mini-day ${dayEvents.length ? 'has-events' : ''}"><span class="mini-day-number">${day}</span>${dayEvents.length ? `<span class="mini-event-strips">${dayEvents.slice(0, 2).map(event => `<i class="${color(event)}" title="${esc(calendarScheduleLabel(event, event))}">${esc(calendarScheduleLabel(event, event))}</i>`).join('')}${dayEvents.length > 2 ? '<em>+</em>' : ''}</span>` : ''}</span>`;
    }).join('')}</span></button>`;
  }).join('')}</section>`;
}

function chip(event) {
  return `<button class="event-chip ${color(event)}" type="button" data-event-detail="${esc(event.id)}" data-event-starts-at="${esc(event.occurrenceFullStartsAt || event.startsAt)}" data-event-ends-at="${esc(event.occurrenceFullEndsAt || event.endsAt)}">${esc(calendarScheduleLabel(event, event))}</button>`;
}

function contactAction(event) {
  if (!event) return '';
  const contact = organizerContact.id === event.id ? organizerContact : { state: 'loading', phone: '' };
  const phone = String(contact.phone || '').replace(/[\s().-]/g, '');
  const valid = /^\+?\d{6,15}$/.test(phone);
  const messenger = messengerHref(contact.messengerUrl);
  return `<footer class="student-contact-actions" aria-label="Contact organizer">${contact.state === 'error' ? '<button class="white-pill" type="button" data-student-contact-retry>Retry organizer contact</button>' : contact.state === 'loading' ? '<button class="blue-pill" type="button" disabled>Loading organizer contact...</button>' : valid || messenger ? `${valid ? `<a class="blue-pill" data-student-organizer-contact href="tel:${esc(phone)}">Phone</a>` : ''}${messenger ? `<a class="blue-pill" data-student-organizer-messenger href="${esc(messenger)}" target="_blank" rel="noopener noreferrer">Messenger</a>` : ''}` : '<button class="white-pill" type="button" disabled>Contact Organizer unavailable</button>'}</footer>`;
}

function modal() {
  if (!view.modal) return '';
  if (view.modal.kind === 'about') return `<div class="modal-backdrop" data-student-backdrop><section class="modal-card schedule-popup-card student-about-card" role="dialog" aria-modal="true" aria-label="About CSC SYNC"><div class="modal-topline"><span>About CSC SYNC</span><button class="modal-x" type="button" data-student-close>Close</button></div>${publicFeedbackContent()}</section></div>`;
  const detail = view.modal.kind === 'detail';
  const event = detail && selectedEvents().find(item => item.id === view.modal.id);
  const fields = event ? [['Organization', event.organizationName], ['Status', 'Approved'], ['Category', event.category], ['Venue', event.venue], ['Date and time', `${view.modal.start.slice(0, 10)} ${formatTime(view.modal.start)} – ${view.modal.end.slice(0, 10)} ${formatTime(view.modal.end)}`], ['Repeat', event.frequency === 'none' ? 'Does not repeat' : `${event.frequency} until ${event.repeatUntil || 'not set'}`], ['Description', event.publicDescription || 'No description provided.']] : [];
  const dayEvents = !detail && occurrences(view.modal.date, view.modal.date);
  return `<div class="modal-backdrop" data-student-backdrop><section class="modal-card schedule-popup-card student-detail-card" role="dialog" aria-modal="true" aria-label="${detail ? 'Schedule details' : 'Day schedules'}" data-popup-kind="calendar" data-popup-category="${esc(event?.category || '')}"><div class="modal-topline"><span>${detail ? esc(event?.title || 'Schedule unavailable') : `Schedules · ${view.modal.date}`}</span><button class="modal-x" type="button" data-student-close>Close</button></div>${detail ? `<section class="event-detail-modal compact-schedule-detail"><div class="detail-list schedule-detail-list">${event ? fields.map(([name, value]) => `<div class="${name === 'Description' ? 'wide compact-text' : ''}"><span>${name}</span><strong>${esc(value)}</strong></div>`).join('') : '<p>This approved public schedule is no longer available.</p>'}</div>${contactAction(event)}</section>` : `<div class="day-schedules-body"><section class="day-schedule-list">${dayEvents.length ? dayEvents.map(chip).join('') : '<p>No approved public schedules for this date.</p>'}</section></div>`}</section></div>`;
}

export function renderPublicView() {
  return `<div class="student-dashboard" data-student-calendar>${header()}<div class="org-workspace">
    <main class="org-main">${view.mode === 'month' ? monthGrid() : yearGrid()}</main></div>
    ${!loaded || loadError ? `<div class="student-calendar-notice" role="${loadError ? 'alert' : 'status'}">${esc(loadError || 'Loading approved public schedules…')}${loadError ? '<button type="button" class="white-pill" data-student-retry>Retry</button>' : ''}</div>` : ''}${modal()}</div>`;
}

export function mountPublicView(container, { onChange = null } = {}) {
  repaintView = onChange;
  if (!container) { controller?.dispose(); controller = null; return; }
  container.onclick = event => {
    const target = event.target.closest('button, [data-student-backdrop]');
    if (!target) return;
    if (target.dataset.studentStep) { view.date = adjacentMonth(view.date, Number(target.dataset.studentStep) * (view.mode === 'year' ? 12 : 1)); view.modal = null; }
    else if (target.hasAttribute('data-student-about')) view.modal = { kind: 'about' };
    else if (target.dataset.studentMonth) { view.date = target.dataset.studentMonth; view.mode = 'month'; }
    else if (target.dataset.studentDate) view.modal = { kind: 'day', date: target.dataset.studentDate };
    else if (target.dataset.eventDetail) { organizerContact = { id: '', state: 'loading', phone: '' }; view.modal = { kind: 'detail', id: target.dataset.eventDetail, start: target.dataset.eventStartsAt, end: target.dataset.eventEndsAt }; }
    else if (target.hasAttribute('data-student-close') || target.hasAttribute('data-student-backdrop') && event.target === target) view.modal = null;
    else if (target.hasAttribute('data-student-contact-retry')) { void controller?.refreshContact(); return; }
    else if (target.hasAttribute('data-student-retry')) { void controller?.refresh(); return; }
    else return;
    repaint();
  };
  container.onchange = event => {
    if (event.target.hasAttribute('data-student-filter')) { view.filter = event.target.value; view.modal = null; }
    else if (event.target.hasAttribute('data-student-view')) { view.mode = event.target.value; view.modal = null; }
    else return;
    repaint();
  };
  container.onkeydown = event => { if (event.key === 'Escape' && view.modal) { event.stopPropagation(); view.modal = null; repaint(); } };
  const dialog = container.querySelector('[role="dialog"]');
  if (dialog && !dialog.contains(document.activeElement)) dialog.querySelector('[data-student-close]')?.focus({ preventScroll: true });
  bindMonthOverflow(container);
  bindPublicFeedback(container, repaint);
  if (controller) {
    if (view.modal?.kind === 'detail' && organizerContact.id !== view.modal.id) void controller.refreshContact();
    return;
  }
  let disposed = false, pending = false;
  const contactRequests = new Set();
  async function refreshContact() {
    const id = view.modal?.kind === 'detail' ? view.modal.id : '';
    if (disposed || !id || !selectedEvents().some(event => event.id === id) || contactRequests.has(id)) return;
    contactRequests.add(id);
    if (organizerContact.id !== id) organizerContact = { id, state: 'loading', phone: '' };
    const stillOpen = () => !disposed && view.modal?.kind === 'detail' && view.modal.id === id && selectedEvents().some(event => event.id === id);
    try {
      const result = await supabaseRequest('/rpc/student_organizer_contact', { method: 'POST', body: JSON.stringify({ p_event_id: id }) });
      if (!stillOpen()) return;
      const next = { id, state: 'ready', phone: result?.event_id === id ? result.phone || '' : '', messengerUrl: result?.event_id === id ? messengerHref(result.messenger_url) : '' };
      if (JSON.stringify(next) !== JSON.stringify(organizerContact)) { organizerContact = next; repaint(); }
    } catch {
      if (stillOpen()) { organizerContact = { id, state: 'error', phone: '' }; repaint(); }
    } finally { contactRequests.delete(id); }
  }
  async function refresh() {
    if (disposed || pending) return;
    pending = true;
    try {
      const rows = await supabaseRequest('/rpc/student_calendar_events', { method: 'POST', body: '{}' });
      if (disposed) return;
      const next = rows.filter(row => row.status === 'approved' && row.visibility === 'public').map(row => ({ ...mapEvent({ ...row, owner_account_id: row.organization_name }, { starts_at: row.starts_at, ends_at: row.ends_at }, { frequency: row.frequency, repeat_until: row.repeat_until }), organizationName: row.admin_created === true ? CSC_NAME : row.organization_name || 'Organization', adminCreated: row.admin_created === true }));
      const changed = !loaded || loadError || JSON.stringify(next) !== JSON.stringify(events);
      events = next; loaded = true; loadError = '';
      if (view.filter !== 'all' && !events.some(event => event.organizationName === view.filter)) view.filter = 'all';
      if (changed) repaint();
      if (view.modal?.kind === 'detail') void refreshContact();
    } catch (error) {
      if (disposed) return;
      const message = /student_calendar_events|schema cache|PGRST202/.test(error.message) ? 'Student Calendar needs database setup. Apply 034_student_calendar.sql.' : 'Schedules could not be refreshed. Please retry.';
      if (message !== loadError) { loadError = message; repaint(); }
    } finally { pending = false; }
  }
  const visible = () => { if (!document.hidden) void refresh(); };
  const timer = setInterval(refresh, 8000);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', visible);
  controller = { refresh, refreshContact, dispose() { disposed = true; organizerContact = { id: '', state: 'loading', phone: '' }; clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible); } };
  void refresh();
}

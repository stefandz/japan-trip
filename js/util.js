// Tiny helpers shared by the views.

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function progress(n, total) {
  const pct = total ? Math.round((n / total) * 100) : 0;
  return `<div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`;
}

// Views re-render wholesale, so a plain CSS animation would replay on every stamp, seal and hanko
// at each update. Only animate what was stamped in the last moment, and let a re-render mid-way
// carry on where it left off. `at` is a timestamp or ISO string; pair with [data-fresh] in the CSS.
const INK_MS = 450;
export function inkAnim(at) {
  const age = Date.now() - (typeof at === 'number' ? at : Date.parse(at));
  return age >= 0 && age < INK_MS ? ` data-fresh style="animation-delay:-${age}ms"` : '';
}

export const shortDate = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

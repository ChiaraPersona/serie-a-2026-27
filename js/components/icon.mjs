import icons from '../vendor/lucide-icons.mjs';

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Decorative by default: the containing control supplies its accessible name.
export function icon(name, className = '') {
  const nodes = icons[name];
  if (!nodes) throw new Error(`Unknown Lucide icon: ${name}`);
  const children = nodes.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([key,value]) => `${key}="${escape(value)}"`).join(' ')}/>`).join('');
  return `<svg class="lucide ${escape(className)}" data-lucide="${escape(name)}" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${children}</svg>`;
}

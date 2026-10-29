const ITEM = 'a[data-testid="dynamic-side-panel-items-item"]';
const SHOW_MORE = '[data-testid="dynamic-side-panel-items-show-more"]';
const SEARCH_INPUT = '[data-testid="dynamic-side-panel-items-search-input"]';
const WORKFLOW_PATH = /^\/([^/]+\/[^/]+)\/actions\/workflows\/([^/]+)$/;
const RUN_HASH = '#ghx-run';
const ICONS = {
  chevron: 'M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z',
  play: 'M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z',
  pin: 'M4.456.734a1.75 1.75 0 0 1 2.826.504l.613 1.327a3.081 3.081 0 0 0 2.084 1.707l2.454.584c1.332.317 1.8 1.972.832 2.94L11.06 10l3.72 3.72a.748.748 0 0 1-.332 1.265.75.75 0 0 1-.729-.205L10 11.06l-2.204 2.205c-.968.968-2.623.5-2.94-.832l-.584-2.454a3.081 3.081 0 0 0-1.707-2.084l-1.327-.613a1.75 1.75 0 0 1-.504-2.826L4.456.734ZM5.92 1.866a.25.25 0 0 0-.404-.072L1.794 5.516a.25.25 0 0 0 .072.404l1.328.613A4.582 4.582 0 0 1 5.73 9.63l.584 2.454a.25.25 0 0 0 .42.12l5.47-5.47a.25.25 0 0 0-.12-.42L9.63 5.73a4.581 4.581 0 0 1-3.098-2.537L5.92 1.866Z',
  x: 'M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z',
};
const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

const load = (k, d) => { try { return JSON.parse(localStorage.getItem('ghx:' + k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem('ghx:' + k, JSON.stringify(v)); } catch {} };

function icon(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `octicon ${cls}`);
  svg.setAttribute('width', 16);
  svg.setAttribute('height', 16);
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<path d="${ICONS[name]}"/>`;
  return svg;
}

function h(tag, props = {}, ...children) {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...children);
  return el;
}

function button(label, iconName, cls, onclick) {
  return h('button', { type: 'button', className: `Button ${cls}`, onclick },
    h('span', { className: 'Button-content' },
      ...(iconName ? [h('span', { className: 'Button-visual Button-leadingVisual' }, icon(iconName))] : []),
      ...(label ? [h('span', { className: 'Button-label', textContent: label })] : [])));
}

const first = (...selectors) => selectors.map(s => document.querySelector(s)).find(Boolean);

const PINNED_ANCHORS = [
  'react-partial[partial-name="dashboard-lists"] [class^="List__"]',
  'react-partial[partial-name="dashboard-lists"]',
  '#dashboard',
];
const HEALTH_CHECKS = {
  dashboard: {
    'список репозиториев': ITEM,
    'секция Pull requests': PINNED_ANCHORS[0],
    'раскладка дашборда': '.feed-background .dashboard-sidebar',
  },
  workflow: {
    'шапка workflow': '[data-component="PH_Actions"]',
  },
};

let checkedPath = '';

function healthCheck(page) {
  const path = location.pathname;
  if (checkedPath === path) return;
  checkedPath = path;
  setTimeout(() => {
    if (location.pathname !== path) return;
    const missing = Object.entries(HEALTH_CHECKS[page]).filter(([, s]) => !document.querySelector(s)).map(([name]) => name);
    if (missing.length) console.warn(`[ghx] GitHub изменил разметку, не найдено: ${missing.join(', ')}`);
  }, 5000);
}

const isDashboard = () => location.pathname === '/' || location.pathname === '/dashboard';

function render() {
  const path = location.pathname;
  if (isDashboard()) {
    healthCheck('dashboard');
    layoutOffset();
    previewToFooter();
    sidebar();
    pinnedSection();
  }
  const wf = path.match(WORKFLOW_PATH);
  if (wf) {
    healthCheck('workflow');
    workflowPage(wf[1], decodeURIComponent(wf[2]));
  }
}

function layoutOffset() {
  const feed = document.querySelector('.feed-background');
  if (!feed) return;
  const top = `${Math.round(feed.getBoundingClientRect().top + scrollY)}px`;
  if (document.documentElement.style.getPropertyValue('--ghx-top') !== top)
    document.documentElement.style.setProperty('--ghx-top', top);
}

function previewToFooter() {
  const row = document.getElementById('dashboard-preview-menu-button')?.closest('.Stack');
  const target = document.querySelector('footer.footer .d-flex');
  if (row && target && row.parentElement !== target) target.append(row);
}

const repo = li => li.querySelector('a').getAttribute('href').split('/').slice(1);
const byRepo = (a, b) => {
  const [o1, r1] = repo(a), [o2, r2] = repo(b);
  return collator.compare(o1, o2) || collator.compare(r1, r2);
};

let renderedSidebar = '';

function sidebar() {
  const search = document.querySelector(SEARCH_INPUT);
  if (search) {
    const list = search.closest('ul');
    if (list.classList.contains('ghx-hidden')) {
      list.classList.remove('ghx-hidden');
      search.focus();
    }
    document.getElementById('ghx-repos')?.remove();
    renderedSidebar = '';
    return;
  }
  document.querySelector(SHOW_MORE)?.click();
  const list = document.querySelector(`${ITEM}:not(#ghx-repos *)`)?.closest('ul');
  if (!list) return;
  const items = [...list.children].filter(li => li.querySelector(ITEM));
  const sig = items.map(li => repo(li).join('/')).join();
  const out = document.getElementById('ghx-repos');
  if (sig === renderedSidebar && out?.previousElementSibling === list) return;

  renderedSidebar = sig;
  out?.remove();
  list.classList.add('ghx-hidden');
  list.after(repoGroups(list, items));
}

function repoGroups(list, items) {
  const shell = () => {
    const ul = list.cloneNode(false);
    ul.classList.remove('ghx-hidden');
    ul.removeAttribute('aria-labelledby');
    return ul;
  };
  const collapsed = load('collapsed', {});
  const groups = Map.groupBy(items.map(li => li.cloneNode(true)).sort(byRepo), li => repo(li)[0]);

  const root = shell();
  root.id = 'ghx-repos';
  for (const [owner, lis] of groups) {
    const li = groupHeader(items[0], owner, lis.length, !(collapsed[owner] ?? true));
    const sub = shell();
    lis.forEach(l => l.querySelector('a').style.setProperty('--subitem-depth', 1));
    sub.append(...lis);
    li.append(sub);
    root.append(li);
  }
  return root;
}

function groupHeader(sample, owner, count, expanded) {
  const li = sample.cloneNode(true);
  li.dataset.hasSubitem = true;
  const a = li.querySelector('a');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = a.className;
  btn.dataset.size = a.dataset.size ?? 'medium';
  btn.ariaExpanded = expanded;
  btn.onclick = () => {
    const open = btn.ariaExpanded !== 'true';
    btn.ariaExpanded = open;
    save('collapsed', { ...load('collapsed', {}), [owner]: !open });
  };
  btn.append(...a.childNodes);
  btn.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  a.replaceWith(btn);

  const img = btn.querySelector('img');
  if (img) img.src = `https://github.com/${owner}.png?size=32`;
  const label = btn.querySelector('[data-component="ActionList.Item.Label"]');
  label.textContent = owner;
  label.after(h('span', { className: 'ghx-trailing' },
    h('span', { className: 'ghx-count', textContent: count }),
    icon('chevron', 'ghx-chevron')));
  return li;
}

const pinKey = (r, file) => `${r}/${file}`;
const workflowUrl = p => `/${p.repo}/actions/workflows/${encodeURIComponent(p.file)}`;

function slot() {
  const anchor = first(...PINNED_ANCHORS);
  if (!anchor) return null;
  const box = document.getElementById('ghx-dashboard') ?? h('div', { id: 'ghx-dashboard' });
  if (box.nextElementSibling !== anchor) anchor.before(box);
  return box;
}

function pinnedSection() {
  const box = slot();
  if (!box) return;
  const pinned = load('pinned', []);
  const sig = JSON.stringify(pinned);
  const out = document.getElementById('ghx-pinned');
  if (out?.dataset.sig === sig && out.parentElement === box) return;
  if (!pinned.length) return out?.remove();

  const unpin = p => () => {
    save('pinned', load('pinned', []).filter(x => pinKey(x.repo, x.file) !== pinKey(p.repo, p.file)));
    pinnedSection();
  };
  const rows = pinned.map(p => h('div', { className: 'ghx-row' },
    h('a', { className: 'ghx-pin-link', href: workflowUrl(p) },
      icon('play', 'ghx-pin-icon'),
      h('span', { className: 'ghx-strong', textContent: p.name }),
      h('span', { className: 'ghx-muted ghx-ellipsis', textContent: p.repo })),
    h('a', { className: 'Button Button--secondary Button--small', href: workflowUrl(p) + RUN_HASH },
      h('span', { className: 'Button-content' }, h('span', { className: 'Button-label', textContent: 'Run' }))),
    Object.assign(button('', 'x', 'Button--invisible Button--small Button--iconOnly', unpin(p)), { ariaLabel: 'Unpin' })));

  const el = h('section', { id: 'ghx-pinned', className: 'ghx-section' },
    h('h2', { className: 'ghx-section-title', textContent: 'Pinned workflows' }),
    h('div', { className: 'ghx-box' }, ...rows));
  el.dataset.sig = sig;
  if (out) out.replaceWith(el);
  else box.prepend(el);
}

function workflowPage(repoName, file) {
  const buttons = [...document.querySelectorAll('[data-component="PH_Actions"] button')];
  const run = buttons.find(b => b.textContent.trim() === 'Run workflow') ?? buttons.find(b => b.dataset.variant === 'primary');
  if (!run) return;

  if (location.hash === RUN_HASH) {
    history.replaceState(history.state, '', location.pathname + location.search);
    run.click();
  }

  const key = pinKey(repoName, file);
  const isPinned = load('pinned', []).some(p => pinKey(p.repo, p.file) === key);
  const existing = document.getElementById('ghx-pin');
  if (existing?.dataset.pinned === String(isPinned) && existing.nextElementSibling === run) return;
  existing?.remove();

  const toggle = () => {
    const pinned = load('pinned', []).filter(p => pinKey(p.repo, p.file) !== key);
    if (!isPinned) {
      const name = document.querySelector('[data-component="PH_Title"]')?.textContent.trim() || file;
      pinned.push({ repo: repoName, file, name });
    }
    save('pinned', pinned);
    workflowPage(repoName, file);
  };
  const btn = button(isPinned ? 'Unpin' : 'Pin', 'pin', 'Button--secondary Button--medium', toggle);
  btn.id = 'ghx-pin';
  btn.dataset.pinned = isPinned;
  run.before(btn);
}

let queued = 0;
new MutationObserver(() => {
  queued ||= requestAnimationFrame(() => {
    queued = 0;
    try { render(); } catch (e) { console.warn('[ghx]', e); }
  });
}).observe(document.documentElement, { childList: true, subtree: true });
render();

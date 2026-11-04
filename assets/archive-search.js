/* Public index only. No network, tracking or private metadata. */
(() => {
  'use strict';
  const records = JSON.parse(document.getElementById('archive-index').textContent);
  const input = document.getElementById('archive-query');
  const form = document.getElementById('archive-search-form');
  const results = document.getElementById('search-results');
  const browse = document.getElementById('category-browse');
  const status = document.getElementById('search-status');
  const categoryBox = document.getElementById('category-filters');
  const tagBox = document.getElementById('tag-filters');
  const categories = [['all', 'All'], ['career', 'Career'], ['projects', 'Projects'], ['study', 'Study'], ['growth', 'Experiences & Growth'], ['writing', 'Reading & Writing']];
  const validSections = new Set(categories.map(([id]) => id));
  const allTags = [...new Set(records.flatMap(r => r.tags))].sort((a,b) => a.localeCompare(b));
  let category = 'all';
  let tag = '';
  function node(type, text, className) {
    const el = document.createElement(type);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  const categoryButtons = categories.map(([id, label]) => {
    const button = node('button', label);
    button.type = 'button';
    button.addEventListener('click', () => { category = id; render(); });
    categoryBox.append(button);
    return [id, button];
  });
  const label = node('span', 'TECHNOLOGIES', 'eyebrow');
  tagBox.append(label);
  const select = node('select');
  select.id = 'archive-tag';
  select.setAttribute('aria-label', '기술 태그 선택');
  const first = node('option', 'All technologies'); first.value = ''; select.append(first);
  for (const t of allTags) { const opt = node('option', t); opt.value = t; select.append(opt); }
  select.addEventListener('change', () => { tag = select.value; render(); });
  tagBox.append(select);
  function readURL() {
    const params = new URLSearchParams(location.search);
    input.value = (params.get('q') || '').slice(0,200);
    category = validSections.has(params.get('category')) ? params.get('category') : 'all';
    tag = allTags.includes(params.get('tag')) ? params.get('tag') : '';
    render(false);
  }
  function render(updateURL = true) {
    const q = input.value.trim().normalize('NFKC').toLocaleLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    select.value = tag;
    for (const [id, button] of categoryButtons) button.setAttribute('aria-pressed', String(id === category));
    const active = Boolean(q || tag || category !== 'all');
    browse.hidden = active;
    results.hidden = !active;
    results.replaceChildren();
    if (!active) { status.textContent = ''; }
    else {
      const matched = records.filter(r => {
        const haystack = [r.title,r.summary,...r.tags].join(' ').normalize('NFKC').toLocaleLowerCase();
        return (category === 'all' || r.section === category) && (!tag || r.tags.includes(tag)) && terms.every(t => haystack.includes(t));
      });
      status.textContent = `공개 기록 ${matched.length}개` + (tag ? ` · ${tag}` : '');
      if (!matched.length) {
        results.append(node('h2', '검색 결과가 없습니다.'), node('p', '검색어나 필터를 바꿔 보세요. 작성 중인 기록은 검색에 포함하지 않습니다.', 'search-empty'));
      } else {
        for (const r of matched) {
          const article = node('article', undefined, 'archive-row search-result');
          const body = node('div');
          const title = node('h2');
          const a = node('a', r.title); a.href = r.path; title.append(a);
          body.append(node('p', r.trail, 'result-trail'),title,node('p',r.summary));
          const tags = node('div',undefined,'record-tags');
          for (const t of r.tags) {
            const button = node('button',t); button.type = 'button';
            button.addEventListener('click', () => { tag = t; render(); }); tags.append(button);
          }
          body.append(tags); article.append(body,node('span','↗')); results.append(article);
        }
      }
    }
    if (updateURL) {
      const params = new URLSearchParams();
      if (q) params.set('q',input.value.trim());
      if (category !== 'all') params.set('category',category);
      if (tag) params.set('tag',tag);
      history.replaceState(null,'',location.pathname + (params.size ? '?' + params.toString() : '') + location.hash);
    }
  }
  input.addEventListener('input', () => render());
  form.addEventListener('submit', e => { e.preventDefault(); render(); });
  document.getElementById('search-clear').addEventListener('click', () => { input.value=''; category='all'; tag=''; render(); input.focus(); });
  window.addEventListener('popstate',readURL);
  readURL();
})();

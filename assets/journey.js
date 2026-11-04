(() => {
  const root = document.querySelector('#journey');
  if (!root) return;
  const cards = [...root.querySelectorAll('.journey-card')];
  const years = [...root.querySelectorAll('.journey-year')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const setOpen = (card, open) => {
    card.querySelector('.journey-toggle').setAttribute('aria-expanded', String(open));
    card.querySelector('.journey-detail').hidden = !open;
  };
  cards.forEach(card => {
    setOpen(card, false);
    const button = card.querySelector('.journey-toggle');
    let closeTimer;
    button.addEventListener('click', () => {
      card.dataset.pinned = String(card.dataset.pinned !== 'true');
      setOpen(card, card.dataset.pinned === 'true');
    });
    card.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      clearTimeout(closeTimer);
      setOpen(card, true);
    });
    card.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'mouse') return;
      closeTimer = setTimeout(() => {
        if (card.dataset.pinned !== 'true' && !card.contains(document.activeElement)) setOpen(card, false);
      }, 450);
    });
    card.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!card.contains(document.activeElement) && !card.matches(':hover') && card.dataset.pinned !== 'true') setOpen(card, false);
      }, 0);
    });
  });
  let scheduled = false;
  const updateProgress = () => {
    scheduled = false;
    const timeline = root.querySelector('.journey-timeline');
    const bounds = timeline.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight * .45 - bounds.top) / bounds.height));
    root.style.setProperty('--journey-progress', String(progress));
    const visible = years.filter(year => !year.hidden);
    const active = visible.reduce((best, year) => Math.abs(year.getBoundingClientRect().top - innerHeight * .3) < Math.abs(best.getBoundingClientRect().top - innerHeight * .3) ? year : best, visible[0]);
    years.forEach(year => year.classList.toggle('is-active', year === active));
  };
  const schedule = () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); }
  };
  root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    root.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    cards.forEach(card => { card.hidden = filter !== 'All' && card.dataset.type !== filter; });
    years.forEach(year => { year.hidden = ![...year.querySelectorAll('.journey-card')].some(card => !card.hidden); });
    root.querySelector('.journey-status').textContent = `${filter === 'All' ? '전체 경험' : filter} ${cards.filter(card => !card.hidden).length}개`;
    // Filtering should immediately expose results, including previously unrevealed cards.
    cards.filter(card => !card.hidden).forEach(card => card.classList.add('is-revealed'));
    schedule();
  }));
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), { threshold: .05 });
    cards.forEach((card, index) => { card.classList.add('will-reveal'); card.style.setProperty('--reveal-delay', `${index % 3 * 45}ms`); observer.observe(card); });
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(root);
  updateProgress();
})();

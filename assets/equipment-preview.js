/* Product references: hover, keyboard focus and touch all use the same preview. */
(() => {
  const items = [...document.querySelectorAll('.equipment-item')];
  let active = null;
  let closeTimer;
  let suppressHoverUntil = 0;
  let pinned = false;
  let restoringFocus = false;
  function close() {
    clearTimeout(closeTimer);
    if (!active) return;
    active.querySelector('.equipment-preview').hidden = true;
    active.querySelector('.equipment-trigger').setAttribute('aria-expanded', 'false');
    active = null;
    pinned = false;
  }
  function position() {
    if (!active) return;
    const button = active.querySelector('.equipment-trigger');
    const preview = active.querySelector('.equipment-preview');
    const viewportWidth = document.documentElement.clientWidth;
    preview.style.maxWidth = `${viewportWidth - 24}px`;
    const anchor = button.getBoundingClientRect();
    const bounds = preview.getBoundingClientRect();
    const gap = 12;
    let left = anchor.right + gap;
    if (left + bounds.width > viewportWidth - gap) left = anchor.left - bounds.width - gap;
    left = Math.max(gap, Math.min(left, viewportWidth - bounds.width - gap));
    let top = anchor.top;
    if (viewportWidth < 600) top = anchor.bottom + gap;
    if (top + bounds.height > innerHeight - gap) top = anchor.top - bounds.height - gap;
    top = Math.max(gap, Math.min(top, innerHeight - bounds.height - gap));
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
  }
  function open(item) {
    clearTimeout(closeTimer);
    if (active !== item) close();
    active = item;
    const image = item.querySelector('img[data-src]');
    if (image) { image.src = image.dataset.src; image.removeAttribute('data-src'); image.addEventListener('load', position, { once: true }); }
    item.querySelector('.equipment-preview').hidden = false;
    item.querySelector('.equipment-trigger').setAttribute('aria-expanded', 'true');
    position();
  }
  for (const item of items) {
    const button = item.querySelector('.equipment-trigger');
    const preview = item.querySelector('.equipment-preview');
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'equipment-dismiss';
    dismiss.setAttribute('aria-label', `${button.textContent.replace('▧', '').trim()} 이미지 닫기`);
    dismiss.textContent = '×';
    preview.append(dismiss);
    item.addEventListener('pointerenter', event => {
      clearTimeout(closeTimer);
      if (event.pointerType === 'mouse' && !pinned && performance.now() >= suppressHoverUntil) open(item);
    });
    item.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' && active === item && !pinned && !item.contains(document.activeElement)) {
        closeTimer = setTimeout(() => { if (active === item && !pinned) close(); }, 180);
      }
    });
    button.addEventListener('focus', () => { if (!restoringFocus && performance.now() >= suppressHoverUntil) open(item); });
    item.addEventListener('focusout', event => {
      if (active === item && !pinned && !item.contains(event.relatedTarget)) close();
    });
    button.addEventListener('click', () => {
      if (active === item && pinned) { suppressHoverUntil = performance.now() + 250; close(); }
      else { open(item); pinned = true; }
    });
    dismiss.addEventListener('click', () => {
      suppressHoverUntil = performance.now() + 250;
      close();
      restoringFocus = true;
      button.focus({ preventScroll: true });
      restoringFocus = false;
    });
  }
  document.addEventListener('pointerdown', event => {
    if (active && !active.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !active) return;
    const button = active.querySelector('.equipment-trigger');
    suppressHoverUntil = performance.now() + 250;
    close();
    restoringFocus = true;
    button.focus({ preventScroll: true });
    restoringFocus = false;
  });
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, { passive: true, capture: true });
})();

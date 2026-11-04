/* Follow the reading position without changing the URL or adding history entries. */
(() => {
  const links = Array.from(document.querySelectorAll('.report-toc-groups a[href^="#"]'));
  const entries = links.map(link => ({
    link,
    section: document.getElementById(link.hash.slice(1)),
  })).filter(entry => entry.section);
  if (!entries.length) return;
  const header = document.querySelector('.site-header');
  let active = null;
  let frame = 0;
  let navigationTarget = null;
  let settleTimer = 0;

  function highlight(entry) {
    if (entry === active) return;
    active = entry;
    for (const link of links) {
      if (link === entry?.link) {
        link.setAttribute('aria-current', 'location');
        const group = link.closest('.report-toc-group');
        if (group) group.open = true;
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }

  function updateReadingPosition() {
    frame = 0;
    if (navigationTarget) return;
    const headerBottom = Math.max(0, header?.getBoundingClientRect().bottom || 0);
    const readingLine = Math.max(headerBottom + 48, Math.min(window.innerHeight * 0.25, headerBottom + 160));
    let current = null;
    for (const entry of entries) {
      // A chapter heading belongs to its first subsection, including direct links.
      const chapter = entry.section.closest('.report-chapter');
      const first = chapter?.querySelector('.report-section') === entry.section;
      const start = (first ? chapter : entry.section).getBoundingClientRect().top;
      if (start <= readingLine) current = entry;
      else break;
    }
    // A short final section may never reach the reading line before page end.
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      current = entries[entries.length - 1];
    }
    highlight(current);
  }

  function scheduleUpdate() {
    if (!frame) frame = window.requestAnimationFrame(updateReadingPosition);
  }

  function finishNavigation() {
    window.clearTimeout(settleTimer);
    navigationTarget = null;
    scheduleUpdate();
  }

  function waitForScrollToSettle() {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(finishNavigation, 160);
  }

  function revealHash() {
    const entry = entries.find(item => item.link.hash === window.location.hash);
    if (!entry) {
      finishNavigation();
      return;
    }
    navigationTarget = entry;
    highlight(entry);
    waitForScrollToSettle();
  }

  for (const entry of entries) {
    entry.link.addEventListener('click', () => {
      navigationTarget = entry;
      highlight(entry);
      waitForScrollToSettle();
    });
  }
  window.addEventListener('scroll', () => {
    if (navigationTarget) waitForScrollToSettle();
    scheduleUpdate();
  }, { passive: true });
  window.addEventListener('scrollend', finishNavigation);
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('hashchange', revealHash);
  window.addEventListener('load', scheduleUpdate, { once: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(document.querySelector('.technical-body'));
  }
  revealHash();
  scheduleUpdate();
})();

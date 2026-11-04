(() => {
  const nav = document.querySelector('.case-toc');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
  const activate = id => links.forEach(link => {
    if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  links.forEach(link => link.addEventListener('click', () => activate(link.hash.slice(1))));
  let scheduled = false;
  const update = () => {
    scheduled = false;
    let current = sections[0];
    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= Math.max(240, innerHeight * .35)) current = section;
    });
    if (current) activate(current.id);
  };
  const schedule = () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  activate(location.hash.slice(1) || sections[0]?.id);
})();

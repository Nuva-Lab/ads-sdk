(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('[data-theme-toggle]');
  const announcement = document.querySelector('[data-announcement]');
  const themeKey = 'nuva-sdk-docs-theme';

  function setTheme(theme) {
    root.dataset.theme = theme;
    const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    themeButton.setAttribute('aria-label', label);
    themeButton.setAttribute('title', label);
  }
  try {
    const saved = localStorage.getItem(themeKey);
    if (saved === 'dark' || saved === 'light') setTheme(saved);
  } catch {
    // The page remains usable when local preferences cannot be stored.
  }
  themeButton.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(theme);
    try { localStorage.setItem(themeKey, theme); } catch { /* Per-page theme still applies. */ }
  });

  async function copy(button, text, label) {
    const caption = button.querySelector('span');
    const original = caption.textContent;
    try {
      await navigator.clipboard.writeText(text);
      caption.textContent = ' copied';
      announcement.textContent = `${label} copied`;
    } catch {
      caption.textContent = 'Copy failed';
      announcement.textContent = 'Clipboard access failed. Select the text and copy it manually.';
    }
    setTimeout(() => { caption.textContent = original; }, 1800);
  }
  document.querySelectorAll('[data-copy-code]').forEach(button => {
    button.addEventListener('click', () => copy(button, button.closest('.code-block').querySelector('code').textContent, 'Code'));
  });
  function inlineMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.classList.contains('heading-link')) return '';
    const text = [...node.childNodes].map(inlineMarkdown).join('');
    if (node.tagName === 'CODE') return `\`${text}\``;
    if (node.tagName === 'A') return `[${text}](${node.href})`;
    if (node.tagName === 'STRONG') return `**${text}**`;
    if (node.tagName === 'BR') return '\n';
    return text;
  }
  function blockMarkdown(node) {
    if (node.matches('h2,h3')) return `${'#'.repeat(Number(node.tagName.slice(1)))} ${inlineMarkdown(node)}`;
    if (node.classList.contains('code-block')) {
      const code = node.querySelector('pre code');
      const language = [...code.classList].find(name => name.startsWith('language-')).slice(9);
      return `\`\`\`${language}\n${code.textContent}\n\`\`\``;
    }
    if (node.classList.contains('table')) {
      const rows = [...node.querySelectorAll('tr')].map(row => [...row.children].map(cell => inlineMarkdown(cell).replaceAll('|', '\\|').replaceAll('\n', ' ')));
      rows.splice(1, 0, rows[0].map(() => '---'));
      return rows.map(cells => `| ${cells.join(' | ')} |`).join('\n');
    }
    return inlineMarkdown(node);
  }
  document.querySelector('[data-copy-page]').addEventListener('click', event => {
    const text = [`# ${document.querySelector('h1').textContent}`, ...[...document.querySelectorAll('article > section')].flatMap(section => [...section.children].map(blockMarkdown))].join('\n\n');
    copy(event.currentTarget, text, 'Page');
  });

  const sections = [...document.querySelectorAll('article > section')];
  const tocLinks = [...document.querySelectorAll('.page-toc nav a')];
  let scheduled = false;
  function updateToc() {
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 145) current = section;
    }
    tocLinks.forEach(link => {
      if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateToc); }
  }, { passive: true });
  window.addEventListener('resize', updateToc);
  updateToc();

  const menuButton = document.querySelector('.menu-toggle');
  function closeMenu() {
    root.removeAttribute('data-nav-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
  }
  menuButton.addEventListener('click', () => {
    const open = root.toggleAttribute('data-nav-open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  document.querySelectorAll('.docs-sidebar a').forEach(link => link.addEventListener('click', closeMenu));

  const dialog = document.querySelector('.search-dialog');
  const input = document.querySelector('.search-input');
  const results = document.querySelector('.search-results');
  const count = document.querySelector('.search-count');
  const searchIndex = sections.map(section => {
    const content = section.cloneNode(true);
    content.querySelectorAll('.line-numbers, .code-toolbar, .heading-link').forEach(node => node.remove());
    return { id: section.id, title: section.querySelector('h2').textContent.trim(), text: content.textContent.replace(/\s+/g, ' ').trim() };
  });
  function search() {
    const term = input.value.trim().toLocaleLowerCase();
    const matches = searchIndex.filter(item => item.text.toLocaleLowerCase().includes(term));
    results.replaceChildren();
    count.textContent = matches.length ? `${matches.length} sections` : 'No matching content.';
    matches.forEach(item => {
      const link = document.createElement('a');
      link.href = `#${item.id}`;
      const heading = document.createElement('strong');
      heading.textContent = item.title;
      const summary = document.createElement('small');
      const start = Math.max(0, item.text.toLocaleLowerCase().indexOf(term) - 22);
      summary.textContent = `${start ? '…' : ''}${item.text.slice(start, start + 115)}${item.text.length > start + 115 ? '…' : ''}`;
      link.append(heading, summary);
      link.addEventListener('click', () => { dialog.close(); document.getElementById(item.id).querySelector('h2').setAttribute('tabindex', '-1'); document.getElementById(item.id).querySelector('h2').focus({ preventScroll: true }); });
      results.append(link);
    });
  }
  function openSearch() {
    closeMenu();
    dialog.showModal();
    search();
    input.focus();
  }
  document.querySelector('[data-search-open]').addEventListener('click', openSearch);
  input.addEventListener('input', search);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) dialog.close(); else openSearch();
    }
    if (event.key === 'Escape' && root.hasAttribute('data-nav-open')) { closeMenu(); menuButton.focus(); }
  });
})();

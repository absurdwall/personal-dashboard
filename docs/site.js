(() => {
  const key = 'personal-dashboard-site-language';
  let saved;
  try { saved = localStorage.getItem(key); } catch {}
  const requested = new URL(location.href).searchParams.get('lang');
  let language = requested === 'en' || requested === 'zh' ? requested : saved === 'en' ? 'en' : 'zh';
  function render() {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-language]').forEach(element => { element.hidden = element.dataset.language !== language; });
    document.querySelectorAll('[data-language-toggle]').forEach(button => {
      button.textContent = language === 'en' ? '中文' : 'English';
      button.setAttribute('aria-label', language === 'en' ? '切换为中文' : 'Switch to English');
    });
    document.querySelectorAll('a[href]').forEach(link => {
      const url = new URL(link.getAttribute('href'), location.href);
      if (url.origin === location.origin && /\.html$/.test(url.pathname)) {
        url.searchParams.set('lang', language);
        if (url.hash === '#codex' || url.hash === '#codex-en') url.hash = language === 'en' ? '#codex-en' : '#codex';
        link.setAttribute('href', url.pathname + url.search + url.hash);
      }
    });
    try { localStorage.setItem(key, language); } catch {}
    if (location.hash === '#codex' || location.hash === '#codex-en') {
      const url = new URL(location.href);
      url.hash = language === 'en' ? '#codex-en' : '#codex';
      history.replaceState(null, '', url);
      const anchor = document.getElementById(language === 'en' ? 'codex-en' : 'codex');
      if (anchor) requestAnimationFrame(() => anchor.scrollIntoView({behavior:'instant'}));
    }
  }
  document.querySelectorAll('[data-language-toggle]').forEach(button => button.addEventListener('click', () => {
    language = language === 'en' ? 'zh' : 'en';
    const url = new URL(location.href); url.searchParams.set('lang', language); history.replaceState(null, '', url);
    render();
  }));
  render();
})();

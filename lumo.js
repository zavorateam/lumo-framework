(function () {
  'use strict';

  window.LumoBackgrounds = window.LumoBackgrounds || {};

  const app = document.getElementById('app');
  const statusEl = document.getElementById('lumo-status');
  let currentBgInstances = []; // {name, instance, wrapper}
  let currentComponents = []; // {name, instance, el}

  function status(msg, show = true, timeout = 2200) {
    if (!statusEl) return;
    if (!show) { statusEl.style.display = 'none'; return; }
    statusEl.textContent = msg;
    statusEl.style.display = 'block';
    clearTimeout(statusEl._t);
    statusEl._t = setTimeout(() => statusEl.style.display = 'none', timeout);
  }

  function absoluteURL(base, path) {
    try {
      return new URL(path, base).toString();
    } catch (e) { return path; }
  }

  function splitZtmf(text) {
    const metaMatch = text.match(/<meta>([\s\S]*?)<\/meta>/i);
    const bodyMatch = text.match(/<body>([\s\S]*?)<\/body>/i);
    return {
      metaRaw: metaMatch ? metaMatch[1].trim() : '',
      bodyRaw: bodyMatch ? bodyMatch[1].trim() : ''
    };
  }

  function parseMetaKVs(metaRaw) {
    const kv = {};
    const re = /([a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"/g;
    let m;
    while ((m = re.exec(metaRaw)) !== null) kv[m[1]] = m[2];
    const re2 = /([a-zA-Z0-9_-]+)\s*=\s*([^\s"'\n\r]+)/g;
    while ((m = re2.exec(metaRaw)) !== null) if (!kv.hasOwnProperty(m[1])) kv[m[1]] = m[2];
    return kv;
  }

  function extractInlineStyle(metaRaw) {
    const m = metaRaw.match(/style\s*\{([\s\S]*?)\}\s*$/i) || metaRaw.match(/style\s*\{([\s\S]*?)\}/i);
    if (!m) return null;
    const content = m[1].replace(/^\s*<style[^>]*>/i, '').replace(/<\/style>\s*$/i, '');
    return content.trim();
  }

  // --- NEW: enhanced cont parser (header separated from links) ---
  // возвращает упорядоченный список токенов изнутри cont{ ... }
  function parseContInnerOrdered(inner) {
    const tokens = [];
    let i = 0;
    while (i < inner.length) {
      // пропускаем пробельные символы
      if (/\s/.test(inner[i])) { i++; continue; }

      // <br>
      if (inner.slice(i, i + 4).toLowerCase() === '<br>') {
        tokens.push({ type: 'br' });
        i += 4;
        continue;
      }

      // блок вида name[ ... ]
      const blockMatch = inner.slice(i).match(/^([a-zA-Z0-9_-]+)\s*\[/);
      if (blockMatch) {
        const name = blockMatch[1];
        let depth = 0;
        let j = i + blockMatch[0].length; // позиция после '['

        // ищем соответствующую ']' с учётом вложенностей
        while (j < inner.length) {
          if (inner[j] === '[') depth++;
          else if (inner[j] === ']') {
            if (depth === 0) break;
            depth--;
          }
          j++;
        }

        const content = inner.slice(i + blockMatch[0].length, j).trim();
        tokens.push({ type: 'block', name, html: content });
        i = j + 1;
        if (inner[i] === ',') i++; // пропустить запятую-разделитель
        continue;
      }

      // иначе — "сырая" html-строка до следующей запятой на том же уровне
      // проще: ищем ближайшую запятую, но не внутри скобок (наш кейс обычно простой)
      let nextCommaIdx = -1;
      for (let k = i; k < inner.length; k++) {
        if (inner[k] === ',') { nextCommaIdx = k; break; }
        if (inner[k] === '[') {
          // если встретили '[', пропустим до закрытия (защита)
          let depth = 0, kk = k + 1;
          while (kk < inner.length) {
            if (inner[kk] === '[') depth++;
            else if (inner[kk] === ']') {
              if (depth === 0) { k = kk; break; }
              depth--;
            }
            kk++;
          }
        }
      }
      if (nextCommaIdx === -1) {
        tokens.push({ type: 'raw', html: inner.slice(i).trim() });
        break;
      } else {
        tokens.push({ type: 'raw', html: inner.slice(i, nextCommaIdx).trim() });
        i = nextCommaIdx + 1;
      }
    }
    return tokens;
  }


  // processBody: теперь создаёт header и grid-блоки **в порядке токенов**,
  // каждый header -> отдельный .cont-header-*, каждый grid/column -> отдельный .cont-links cont-grid/column
  function processBody(bodyRaw) {
    let componentsSpec = null;
    const compMatch = bodyRaw.match(/components\s*=\s*([\s\S]*)$/i);
    if (compMatch) { componentsSpec = compMatch[1].trim(); bodyRaw = bodyRaw.slice(0, compMatch.index).trim(); }

    const contRe = /cont\s*\{\s*([\s\S]*?)\s*\}/i;
    const contMatch = bodyRaw.match(contRe);

    if (contMatch) {
      const inner = contMatch[1];
      const tokens = parseContInnerOrdered(inner);

      let htmlFinal = '<div class="cont">';

      for (const t of tokens) {
        if (!t) continue;

        if (t.type === 'br') {
          htmlFinal += '<br>';
          continue;
        }

        if (t.type === 'raw') {
          // сырой HTML — вставляем как есть (например <h6> или простые span'ы)
          htmlFinal += t.html || '';
          continue;
        }

        if (t.type === 'block') {
          const n = (t.name || '').toLowerCase();

          if (n === 'center' || n === 'left' || n === 'right') {
            // отдельный header-контейнер для каждого блока
            htmlFinal += `<div class="cont-header-${n}">${t.html || ''}</div><br>`;
            continue;
          }

          if (n === 'grid' || n === 'column') {
            // отдельный блок ссылок для каждого encountered grid/column
            const cls = n === 'grid' ? 'cont-links cont-grid' : 'cont-links cont-column';
            htmlFinal += `<div class="${cls}">${t.html || ''}</div>`;
            continue;
          }

          // неизвестный блок — оборачиваем в div с именем блока
          htmlFinal += `<div class="${t.name}">${t.html || ''}</div>`;
        }
      }

      htmlFinal += '</div>'; // закрываем .cont
      bodyRaw = bodyRaw.replace(contRe, htmlFinal);
    }

    // Generic fallback for other blocks
    const blockRe = /([a-zA-Z0-9_-]+)\s*\{\s*([\s\S]*?)\s*\}/g;
    let html = bodyRaw.replace(blockRe, (full, name, inner) => `<div class="${name}">${inner ? inner.trim() : ''}</div>`);

    html = `<div class="lumo-body">${html}</div>`;
    return { html, componentsSpec };
  }

  function injectInlineStyle(cssText, id = 'lumo-inline-style') {
    if (!cssText) return;
    let s = document.getElementById(id);
    if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s); }
    s.textContent = cssText;
  }

  function loadStylesheet(href) {
    if (!href) return;
    const abs = absoluteURL(location.href, href);
    if ([...document.styleSheets].some(ss => ss.href && ss.href === abs)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = abs; document.head.appendChild(link);
  }

  function setFavicon(href) {
    if (!href) return;
    const abs = absoluteURL(location.href, href);
    let link = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
    if (link) link.href = abs;
    else { link = document.createElement('link'); link.rel = 'icon'; link.href = abs; document.head.appendChild(link); }
  }

  function loadBgScriptIfNeeded(name, baseUrl) {
    return new Promise((resolve) => {
      if (!name) return resolve();
      if (window.LumoBackgrounds && window.LumoBackgrounds[name]) return resolve();
      const scriptUrl = absoluteURL(baseUrl, `./bg/${name}.js`);
      if (document.querySelector(`script[data-lumo-bg="${name}"]`)) {
        const poll = setInterval(() => { if (window.LumoBackgrounds && window.LumoBackgrounds[name]) { clearInterval(poll); resolve(); } }, 80);
        setTimeout(() => { clearInterval(poll); resolve(); }, 5000);
        return;
      }
      const s = document.createElement('script');
      s.src = scriptUrl; s.defer = true; s.setAttribute('data-lumo-bg', name);
      s.onload = () => {
        const poll = setInterval(() => { if (window.LumoBackgrounds && window.LumoBackgrounds[name]) { clearInterval(poll); resolve(); } }, 60);
        setTimeout(() => { clearInterval(poll); resolve(); }, 5000);
      };
      s.onerror = () => { console.warn('Lumo: failed to load bg script', scriptUrl); resolve(); };
      document.body.appendChild(s);
    });
  }

  // --- Theme component (rewritten & improved) ---
  // Обновлённый LumoTheme — показывает один символ (☀️ / 🌙) и обновляет его динамически
  class LumoTheme {
    constructor(position = 'bottom-right') {
      this.position = position || 'bottom-right';
      this.switchEl = null;
      this.themeKey = 'lumo-theme';
      this.current = localStorage.getItem(this.themeKey) || 'light';
      this._onClick = this.toggle.bind(this);
    }

    // утилита иконки по теме
    _iconFor(theme) {
      return theme === 'dark' ? '🌙' : '☀️';
    }

    // утилита подписи
    _titleFor(theme) {
      return theme === 'dark' ? 'Тёмная тема' : 'Светлая тема';
    }

    mount() {
      const btn = document.createElement('button');
      btn.className = 'lumo-theme-switch';
      btn.setAttribute('aria-label', 'Toggle theme');
      // теперь только один символ, без лишних span'ов
      btn.textContent = this._iconFor(this.current);
      btn.title = this._titleFor(this.current);

      // position class (существующие классы .lumo-theme-pos-*)
      const posClass = `lumo-theme-pos-${this.position.replace(/\s+/g,'-').toLowerCase()}`;
      btn.classList.add(posClass);

      document.body.appendChild(btn);
      this.switchEl = btn;
      this.applyTheme(this.current);

      btn.addEventListener('click', this._onClick);
    }

    toggle() {
      this.current = this.current === 'light' ? 'dark' : 'light';
      this.applyTheme(this.current);
      // обновляем визуально кнопку
      if (this.switchEl) {
        this.switchEl.textContent = this._iconFor(this.current);
        this.switchEl.title = this._titleFor(this.current);
      }
      localStorage.setItem(this.themeKey, this.current);
    }

    applyTheme(theme) {
      document.body.dataset.theme = theme;
      if (theme === 'light') {
        document.documentElement.style.setProperty('--bg-color', '#ffffff');
        document.documentElement.style.setProperty('--text-color', 'rgba(18,18,18,1)');
        document.documentElement.style.setProperty('--header-color', 'rgba(133, 133, 133, 1)');
      } else {
        document.documentElement.style.setProperty('--bg-color', 'rgba(18,18,18,1)');
        document.documentElement.style.setProperty('--text-color', 'rgba(230, 230, 230, 1)');
        document.documentElement.style.setProperty('--header-color', 'rgba(230, 230, 230, 1)');
      }
      document.documentElement.classList.toggle('lumo-dark', theme === 'dark');

      // Если фон (например cubic) использует CSS-переменные, можем задать их здесь (опционально)
      // document.documentElement.style.setProperty('--cubic-top', theme === 'dark' ? '#787880' : '#dcdbe6');
    }

    destroy() {
      if (this.switchEl) {
        this.switchEl.removeEventListener('click', this._onClick);
        if (this.switchEl.parentNode) this.switchEl.parentNode.removeChild(this.switchEl);
        this.switchEl = null;
      }
      return Promise.resolve();
    }
  }

  // destroy backgrounds
  async function destroyAllBackgroundInstances() {
    for (const it of currentBgInstances) {
      try { if (it.instance && typeof it.instance.destroy === 'function') await it.instance.destroy(); } catch (e) { console.warn(e); }
      try { if (it.wrapper && it.wrapper.parentNode) it.wrapper.parentNode.removeChild(it.wrapper); } catch (e) {}
    }
    currentBgInstances = [];
    // destroy components
    for (const c of currentComponents) {
      try { if (c.instance && typeof c.instance.destroy === 'function') await c.instance.destroy(); }
      catch (e) { console.warn('component destroy err', e); }
      try { if (c.el && c.el.parentNode) c.el.parentNode.removeChild(c.el); } catch (e) {}
    }
    currentComponents = [];
  }

  function parseComponentsSpec(spec) {
    if (!spec) return [];
    const parts = [];
    let depth = 0, cur = '', i = 0;
    while (i < spec.length) {
      const ch = spec[i];
      if (ch === '{') { depth++; cur += ch; }
      else if (ch === '}') { depth--; cur += ch; }
      else if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
      else cur += ch;
      i++;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts.map(p => {
      const m = p.match(/^([a-zA-Z0-9_-]+)\s*(\{([\s\S]*)\})?$/i);
      if (!m) return null;
      return { name: m[1], inner: m[3] ? m[3].trim() : null };
    }).filter(Boolean);
  }

  async function renderParsed({ meta, inlineStyle, html, componentsSpec }, baseUrl) {
    // meta.type handling
    if (meta.type) {
      const t = String(meta.type).toLowerCase();
      if (t === 'html') {
        // redirect if URL provided
        const redirect = meta.href || meta.url || meta.link;
        if (redirect) {
          const dest = absoluteURL(baseUrl, redirect);
          window.location.href = dest;
          return;
        } else {
          console.warn('Lumo: meta.type=html but no href/url/link provided');
        }
      }
      // other: 'main' -> proceed; 'other' -> load but skip bg init (handled later)
    }

    if (meta.title) document.title = meta.title;
    if (meta.icon) setFavicon(absoluteURL(baseUrl, meta.icon));
    if (meta.style) meta.style.split(',').map(s => s.trim()).forEach(s => loadStylesheet(absoluteURL(baseUrl, s)));
    if (inlineStyle) injectInlineStyle(inlineStyle);
    if (meta.rmb_menu !== undefined) {
      const val = String(meta.rmb_menu).toLowerCase();
      const shouldDisable = (val === 'false' || val === '0' || val === 'no' || val === 'off');
      if (shouldDisable) installDisableContextMenu();
    }

    app.innerHTML = html;

    // components
    // components
    const components = parseComponentsSpec(componentsSpec || '');
    // destroy previous instances
    await destroyAllBackgroundInstances();

    for (const comp of components) {
      if (!comp) continue;

      // --- BACK button component ---
      if (comp.name === 'back') {
        // comp.inner format: "position, target"  e.g. "bottom-right, index.ztmf"
        const raw = (comp.inner || '').trim();
        const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
        const pos = parts[0] || 'bottom-right';
        const target = parts[1] || 'index.ztmf';

        const btn = document.createElement('button');
        btn.className = 'lumo-back-button';
        btn.setAttribute('aria-label', 'Back');
        btn.textContent = '⮜'; // стрелка назад (можно заменить)
        btn.title = 'Назад';

        // position class reuse of theme position classes
        const posClass = `lumo-theme-pos-${pos.replace(/\s+/g, '-').toLowerCase()}`;
        btn.classList.add(posClass);

        // If theme button is in the same position, shift this button left (so it appears to the left of theme)
        // approximate offset: theme width(46) + margin(12) + spacing(12) => 70px
        const offsetPx = 70;
        const p = pos.toLowerCase();
        if (p.endsWith('-right') || p === 'right') {
          // move left from the right edge
          btn.style.right = (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--lumo-back-right-offset') || offsetPx) + 'px');
        } else if (p.endsWith('-left') || p === 'left') {
          btn.style.right = (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--lumo-back-left-offset') || offsetPx) + 'px');
        } else if (p === 'top' || p === 'bottom' || p === 'center') {
          // for center/top/bottom place a bit left
          // compute left as calc(50% - offset)
          btn.style.left = 'calc(50% - 70px)';
        }

        // click handler uses referrer/history fallback to explicit target
        const onClickBack = (ev) => {
          ev.preventDefault();
          // if there is a meaningful referrer (and not the same page) try history.back()
          // fallback: go to explicit target
          window.location.href = absoluteURL(baseUrl, target);
        };

        btn.addEventListener('click', onClickBack);
        document.body.appendChild(btn);

        // add to currentComponents so destroyAllBackgroundInstances will remove it
        currentComponents.push({
          name: 'back',
          instance: {
            destroy: async () => {
              try { btn.removeEventListener('click', onClickBack); } catch (e) {}
              try { if (btn.parentNode) btn.parentNode.removeChild(btn); } catch (e) {}
            }
          },
          el: btn
        });

        continue;
      }

      // --- THEME component (existing) ---
      if (comp.name === 'theme') {
        // comp.inner can be a position string like bottom-right
        const pos = (comp.inner || 'bottom-right').trim();
        const el = document.createElement('div'); // placeholder wrapper (easier for destroy)
        document.body.appendChild(el);
        const themeInstance = new LumoTheme(pos);
        themeInstance.mount();
        currentComponents.push({ name: 'theme', instance: themeInstance, el });
        continue;
      }

      // --- BG component (existing) ---
      if (comp.name === 'bg' && comp.inner) {
        // create wrapper for bg nodes
        const wrapper = document.createElement('div');
        wrapper.className = 'lumo-bg-wrapper';
        wrapper.style.position = 'fixed';
        wrapper.style.inset = '0';
        wrapper.style.zIndex = '-1';
        wrapper.style.pointerEvents = 'none';
        wrapper.innerHTML = comp.inner;
        document.body.appendChild(wrapper);

        const canvases = wrapper.querySelectorAll('canvas[bg]');
        for (const c of canvases) {
          const bgName = c.getAttribute('bg');
          if (!c.width) c.width = window.innerWidth;
          if (!c.height) c.height = window.innerHeight;
          await loadBgScriptIfNeeded(bgName, baseUrl);
          const BgClass = window.LumoBackgrounds && window.LumoBackgrounds[bgName];
          if (typeof BgClass === 'function') {
            try {
              const instance = new BgClass(c, { baseUrl, meta });
              currentBgInstances.push({ name: bgName, instance, wrapper });
            } catch (err) { console.error('Lumo: bg init error', bgName, err); }
          } else {
            console.warn('Lumo: bg not found after load', bgName);
          }
        }
        continue;
      }

      // --- other components fallback (existing) ---
      if (comp.inner) {
        const container = document.createElement('div');
        container.className = `lumo-comp-${comp.name}`;
        container.innerHTML = comp.inner;
        app.appendChild(container);
        currentComponents.push({ name: comp.name, instance: null, el: container });
      }
    }


    // ensure link interception
    attachZtmfLinkHandler(baseUrl, meta);
  }

  function attachZtmfLinkHandler(baseUrl, meta = {}) {
    document.removeEventListener('click', ztmfClickHandler);
    document.addEventListener('click', ztmfClickHandler);

    function isLocalZtmf(href) {
      return href && href.split('?')[0].split('#')[0].toLowerCase().endsWith('.ztmf');
    }
    function resolve(href) { return absoluteURL(baseUrl, href); }
    function ztmfClickHandler(e) {
      const a = e.target.closest && e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      if (isLocalZtmf(href)) {
        e.preventDefault();
        const url = resolve(href);
        loadZtmf(url, true).catch(err => { console.error(err); status('Ошибка загрузки ' + href); });
      } else {
        // external link: if meta.type === 'main' we allow, else default browser
      }
    }
  }

  function baseFromUrl(url) {
    try {
      const u = new URL(url, location.href);
      u.pathname = u.pathname.replace(/\/[^/]*$/, '/');
      return u.toString();
    } catch (e) { return './'; }
  }

  async function loadZtmf(url, pushState = true) {
    status('Загружаю ' + url);
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) { status('Ошибка сети: ' + resp.status, true); throw new Error('Fetch error ' + resp.status); }
    const text = await resp.text();
    const { metaRaw, bodyRaw } = splitZtmf(text);
    const meta = parseMetaKVs(metaRaw);
    const inlineStyle = extractInlineStyle(metaRaw);
    const { html, componentsSpec } = processBody(bodyRaw);
    const baseUrl = baseFromUrl(url);
    await renderParsed({ meta, inlineStyle, html, componentsSpec }, baseUrl);
    status('Загружено: ' + (meta.title || url));
    // if (pushState) { try { history.pushState({ lumo: url }, meta.title || '', url); } catch (e) {} }
  }

  function installDisableContextMenu() {
    if (window.__lumo_rmb_disabled) return;
    function disableContext(e) { e.preventDefault(); return false; }
    document.addEventListener('contextmenu', disableContext, true);
    const observer = new MutationObserver(() => {});
    observer.observe(document.body, { childList: true, subtree: true });
    window.__lumo_rmb_disabled = true;
  }

  window.addEventListener('popstate', (ev) => {
    const state = ev.state;
    if (state && state.lumo) loadZtmf(state.lumo, false).catch(e => console.error(e));
    else if (window.LUMO_START) loadZtmf(window.LUMO_START, false).catch(()=>{});
  });

  window.addEventListener('load', () => {
    const start = window.LUMO_START || './index.ztmf';
    const loc = location.href;
    if (loc.toLowerCase().endsWith('.ztmf')) {
      loadZtmf(loc, false).catch(err => { console.warn('initial load failed', err); loadZtmf(start, false).catch(()=>{}); });
    } else {
      loadZtmf(start, false).catch(err => console.error('startup load failed', err));
    }
  });

  window.Lumo = {
    load: loadZtmf,
    destroyBackgrounds: destroyAllBackgroundInstances,
    status
  };

})();


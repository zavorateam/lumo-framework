export class LumoTheme {
  constructor(switchEl) {
    this.switchEl = switchEl;
    this.themeKey = 'lumo-theme';
    this.current = localStorage.getItem(this.themeKey) || 'light';
  }

  mount() {
    this.applyTheme(this.current);
    this.switchEl.addEventListener('click', () => this.toggle());
  }

  toggle() {
    this.current = this.current === 'light' ? 'dark' : 'light';
    this.applyTheme(this.current);
    localStorage.setItem(this.themeKey, this.current);
  }

  applyTheme(theme) {
    document.body.dataset.theme = theme;
    document.documentElement.style.setProperty('--bg-color', theme === 'light' ? '#ffffff' : '#111111');
    document.documentElement.style.setProperty('--text-color', theme === 'light' ? '#111111' : '#f0f0f0');
  }
}

import { LumoTheme } from './lumo-theme.js';
import { LumoComponents } from './lumo-components.js';
import { LumoBackground } from './lumo-bg.js';

class LumoCore {
  constructor() {
    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  init() {
    this.pageType = document.body.dataset.page || 'other';
    this.bgType = document.body.dataset.bg || null;

    // Вставляем фон и theme-switcher внутрь app
    this.app = document.querySelector('.app');
    if (!this.app) return console.warn('Lumo: div.app не найден.');

    // фон
    this.bgContainer = document.createElement('div');
    this.bgContainer.className = 'lumo-bg';
    this.app.prepend(this.bgContainer);

    // переключатель темы
    this.themeSwitch = document.createElement('div');
    this.themeSwitch.className = 'theme-toggle';
    this.themeSwitch.textContent = '🌓';
    this.app.appendChild(this.themeSwitch);

    // Инициализация
    this.initTheme();
    this.initBackground();
    this.loadComponents();
  }

  initTheme() {
    this.theme = new LumoTheme(this.themeSwitch);
    this.theme.mount();
  }

  initBackground() {
    console.log('Lumo bgType:', this.bgType); // ← вот это
    this.bg = new LumoBackground(this.bgType);
    this.bg.mount(this.bgContainer);
  }

  loadComponents() {
    this.components = new LumoComponents(this.pageType);
    this.components.mount();
  }
}

new LumoCore();

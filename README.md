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

    this.buildStructure();
    this.initTheme();
    this.initBackground();
    this.loadComponents();
  }

  buildStructure() {
    const app = document.querySelector('.app');
    if (!app) {
      const el = document.createElement('div');
      el.className = 'app';
      document.body.appendChild(el);
    }

    document.querySelector('.app').innerHTML = `
      <div class="lumo-bg"></div>
      <div class="lumo-main"></div>
      <div class="lumo-theme-switch"></div>
    `;
  }

  initTheme() {
    this.theme = new LumoTheme();
    this.theme.mount();
  }

  initBackground() {
    const bg = new LumoBackground(this.bgType, this.theme);
    bg.mount();
  }

  loadComponents() {
    const comp = new LumoComponents(this.pageType);
    comp.mount();
  }
}

new LumoCore();

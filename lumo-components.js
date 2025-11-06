export class LumoComponents {
  constructor(pageType) {
    this.pageType = pageType;
  }

  mount() {
    // Здесь подключаем только нужные компоненты, если они есть в DOM
    if (this.pageType === 'main') {
      this.addMainComponents();
    } else if (this.pageType === 'manual') {
      this.addManualComponents();
    } else {
      this.addOtherComponents();
    }
  }

  addMainComponents() {
    const mainSection = document.querySelector('.section.main');
    if (!mainSection) return;
    mainSection.innerHTML += `
      <div class="main-buttons">
        <span class="btn"><a href="project-manual.html">Проекты</a></span>
        <span class="btn"><a href="about.html">О сайте</a></span>
      </div>
    `;
  }

  addManualComponents() {
    const mainSection = document.querySelector('.section.main');
    if (!mainSection) return;
    mainSection.innerHTML += `
      <button class="back" onclick="history.back()">← Назад</button>
      <h1>Project Manual</h1>
      <section class="manual-content">
        <p>Описание проекта...</p>
      </section>
    `;
  }

  addOtherComponents() {
    const mainSection = document.querySelector('.section.main');
    if (!mainSection) return;
    mainSection.innerHTML += `
      <p>Дополнительный контент для других страниц.</p>
    `;
  }
}

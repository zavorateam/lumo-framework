# Lumo Framework v1.0

**Lumo** — это легковесный JavaScript-фреймворк для создания SPA (Single Page Applications) на основе статических файлов `.ztmf`. Он обеспечивает бесшовную навигацию, глобальное управление темами, поддержку динамических фонов и компонентную систему без использования сложных сборщиков.

-----

## 1\. Быстрый старт

### Структура `index.html`

Для работы Lumo требуется базовый HTML-файл, который подключает скрипт и содержит контейнеры для приложения.

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Lumo App</title>
    <script src="https://zavorateam.github.io/lumo-framework/lumo.js" type="module" defer></script>
    <style>
        body { margin: 0; font-family: sans-serif; transition: background 0.3s; }
        /* Lumo использует CSS переменные для темизации */
    </style>
</head>
<body>
    <div id="app"></div>
    
    <div id="lumo-status" style="display:none; position:fixed; bottom:10px; left:10px; background:#000; color:#fff; padding:5px; z-index:9999;"></div>
    <script>
        window.LUMO_START = 'home.ztmf'; 
    </script>
</body>
</html>
```

Так же для обработки логики некоторых страниц (если в вашей странице должен быть js-код) вы должны вынести скрипт в отдельный файл и подключить его сразу после подключения lumo. Скрипт должен иметь обработчик вещателей от lumo. 
Пример скрипта:
```js
async function fetchAndPopulateCountries() {
//основная логика вашего скрипта
}

// Слушатель события из lumo.js
document.addEventListener('lumo:contentRendered', (e) => {
    // Проверяем, что это наш ZTMF-файл (например, по названию или URL)
    const isCountriesPage = e.detail.url.endsWith('country.ztmf') || e.detail.pageName === 'Список стран';
    
    if (isCountriesPage) {
        // Запускаем логику загрузки только для этой страницы
        fetchAndPopulateCountries();
    }
});
```
-----

## 2\. Формат файлов `.ztmf`

Файлы ZTMF (Zavora Team Markup File) — это текстовые файлы, разделенные на две секции: **Meta** и **Body**.

### Структура файла

```text
<meta>
title = "Моя Страница"
icon = "./favicon.ico"
style = "css/style.css"
rmb_menu = False
type = "blocky"  
style {
  <style>
  .my-class { color: red; }
  </style>
}
</meta>
<body>
...контент...
components = { theme, back, bg }
</body>
```

### Секция `<meta>`

Поддерживает пары `ключ = "значение"` и встроенные блоки.

| Ключ | Описание |
| :--- | :--- |
| `title` | Заголовок вкладки браузера. |
| `icon` | Путь к фавиконке. |
| `style` | Ссылка на внешний CSS файл (можно несколько через запятую). |
| `type` | Тип парсера: `main` (главная страница) или `blocky` (страница с информацией и карточками). Если `html`, делает редирект. |
| `rmb_menu` | Если False, отключает контекстное меню (ПКМ) на странице. |
| `style { ... }` | Блок для написания CSS стилей прямо внутри файла. |

Примечание:
- Не важно, задано ли rmb_menu: True или не задано вовсе, если ключ rmb_menu со значением False не найден, контекстное меню будет включено.
- В стили {} можно вставить секцию стилей (<style></style>), фреймворк поймёт что вы хотите.
-----

## 3\. Синтаксис контента (Парсеры)

Lumo поддерживает два режима разметки контента, определяемых в `<meta>`.

### А. Стандартный режим main (Cont Parser)
Ориентирован на блоки `cont { ... }`.

**Синтаксис:**

```text
cont {
    // Простой текст
    Привет мир <br>
    
    // Блоки: имя_класса[содержимое]
    header[Заголовок]
    
    // Вложенность поддерживается
    card[
        title[Карточка]
        text[Описание...]
    ]
    
    // Специальные блоки (будут иметь встроенные стили/классы)
    center[Текст по центру]
    grid[Элементы сеткой]
    column[Элементы колонкой]
}
```

  * Все, что внутри `cont {}`, оборачивается в `<div class="cont">`.
  * `name[text]` превращается в `<div class="name">text</div>`.

### Б. Режим Blocky (`type = "blocky"`)

Более строгий, рекурсивный синтаксис, похожий на CSS/SCSS. Активируется `type="blocky"` в мета-секцию.

**Синтаксис:**

```text
container {
    header { Добро пожаловать }
    main-content {
        sidebar { Меню }
        article { Текст статьи... }
    }
}
```

  * `имя { контент }` превращается в `<div class="имя">контент</div>`.
  * Поддерживает также квадратные скобки `имя [ контент ]`.
  * Весь контент автоматически оборачивается в `.app > .container`.

-----

## 4\. Компонентная система

В конце `<body>` можно (и нужно) объявлять используемые компоненты через директиву:
`components = { comp1, comp2, ... }`

### Встроенные компоненты

#### 1\. `theme` (Переключатель темы)

Добавляет кнопку переключения темной/светлой темы. И её логику

  * **Использование:** `theme` или `theme { top-right }`
  * **Позиции:** `top-left`, `top-right`, `bottom-left`, `bottom-right`.
  * **CSS переменные:** Управляет `--bg-color`, `--text-color`, `--header-color`.

#### 2\. `back` (Кнопка "Назад")

Умная кнопка возврата. Пытается использовать `history.back()`, если это невозможно — переходит по указанной ссылке.

  * **Использование:** `back { bottom-right, index.html?file=index.ztmf }`
  * **Параметры:** `{ позиция, файл_резервного_перехода }`.

  - обратите внимание, чтобы перейти на какую-то ни было страницу, нужно указывать не просто *.ztmf, а ваш начальный html файл (из-за SPA логики), вот так: index.html?file=*.ztmf

#### 3\. `bg` (Управление фоном)

Мощный компонент для статических или динамических фонов (Canvas/WebGL).

**Вариант А: Простой цвет/CSS**

```text
components = { 
  bg { color: #333 }
}
// или
components = {
  bg { background: linear-gradient(to right, red, blue) }
}
// или
components = {
  bg { color: var(--bg-color) }
}
```

**Вариант Б: HTML/Canvas и скрипты**
Позволяет вставить HTML (например, `<canvas>`) и подключить JS-скрипт из папки `/bg/`.

```text
components = {
  bg { 
    <canvas bg="cubic"></canvas> 
  }
}
```

Lumo автоматически:

1.  Найдет файл `bg/cubic.js`.
2.  Загрузит его.
3.  Инициализирует класс, зарегистрированный в `window.LumoBackgrounds['cubic']`.

### Создание JS-скрипта для фона (например `bg/stars.js`)

Скрипт должен зарегистрировать класс в глобальном объекте:

```javascript
// bg/stars.js
(function() {
  class StarsBackground {
    constructor(canvas, options) {
      this.ctx = canvas.getContext('2d');
      // Инициализация анимации...
    }
    destroy() {
      // Очистка таймеров, слушателей событий...
      // Lumo вызовет это при уходе со страницы
    }
  }
  
  // Регистрация
  window.LumoBackgrounds = window.LumoBackgrounds || {};
  window.LumoBackgrounds['stars'] = StarsBackground;
})();
```

-----

## 5\. Роутинг и SPA

Lumo автоматически перехватывает клики по ссылкам `<a href="page.ztmf">`.

1.  **Загрузка:** Контент загружается через `fetch`.
2.  **History API:** URL в браузере меняется на `index.html?file=page.ztmf`. Это позволяет безопасно перезагружать страницу (F5), так как сервер вернет `index.html`, а JS снова подгрузит нужный файл.
3.  **Относительные пути:** Поддерживается автоматическая коррекция путей для ресурсов (картинок/скриптов) относительно текущего ZTMF файла. (но работает странно почему-то)

-----

## 6\. JavaScript API (`window.Lumo`)

Фреймворк предоставляет глобальный объект `Lumo` для управления извне:

  * **`Lumo.load(url, pushState)`**: Загружает ZTMF файл по URL.
      * `url` (String): путь к файлу.
      * `pushState` (Bool): добавлять ли запись в историю браузера.
  * **`Lumo.status(msg, show, timeout)`**: Показывает/скрывает сообщение в статус-баре.
  * **`Lumo.destroyBackgrounds()`**: Принудительно уничтожает текущие фоновые экземпляры.

### События

При завершении рендеринга страницы срабатывает событие:

```javascript
document.addEventListener('lumo:contentRendered', (e) => {
    console.log('Загружена страница:', e.detail.pageName);
    console.log('Метаданные:', e.detail.meta);
});
```

-----

## 7\. Пример полной страницы (`hello.ztmf`)

```text
<meta>
title = "Привет Lumo"
type = "blocky"
style {
  .welcome-text { font-size: 24px; color: var(--text-color); }
}
</meta>

<body>
cont {
    center[
        welcome-text[Добро пожаловать в Lumo Framework]
        <br>
        Этот текст отцентрирован.
    ],
      grid[
        <span class="btn"><a href="./pr1.html">Проект 1</a>
        <span class="btn"><a href="https://figma.com/pr2">Проект 2</a>
        <span class="btn"><a href="./index.html?file=pr3.ztmf">Проект 3</a>
    ]
    <a href="./index.html?file=about.ztmf">О нас</a>
}
components = { 
    theme {top-right},
    back {bottom-left, index.html?file=index.ztmf },
    bg { color: var(--bg-color) }
}
</body>
```

## Документация будет дополнятся, вопросы можно задать в issues

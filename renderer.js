// renderer.js
window.SubsRenderer = {
  container: null, topDiv: null, bottomDiv: null,
  animationFrameId: null, fullscreenWatcher: null,
  
  // Переменные для защиты от DOM-Thrashing (лишних перерисовок интерфейса)
  lastTopText: null,
  lastBottomText: null,
  
  // Базовые стили для текста. Каждая строчка будет обернута в этот стиль 
  // для создания эффекта красивой черной подложки, как у Netflix.
  spanStyle: `
    display: inline-block; 
    color: #fff; 
    background-color: rgba(0, 0, 0, 0.83);
    border-radius: 0.2em; 
    margin: 0.1em; 
    padding: 0.1em 0.3em;
    font-family: 'PT Sans', sans-serif; 
    font-weight: 400; 
    line-height: 1.2;
    text-align: center; 
    box-sizing: border-box; 
    user-select: none;
  `,
  
  currentPrefs: {},

  init(videoElement) {
    if (this.container) this.container.remove();
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.fullscreenWatcher) clearInterval(this.fullscreenWatcher);

    this.lastTopText = null;
    this.lastBottomText = null;

    this.container = document.createElement('div');
    this.container.id = 'dual-sub-container';
    
    // Вырываем наш контейнер из структуры плеера и вешаем его фиксированно поверх всего экрана.
    // Это гарантирует, что чужие CSS (скрытие переполнения, сетки) не сломают нам верстку.
    // Используем максимально возможное значение z-index 2147483647.
    this.container.style.cssText = `
      position: fixed; 
      pointer-events: none; 
      z-index: 2147483647 !important; 
      box-sizing: border-box; 
      overflow: hidden; 
      display: block;
    `;

    this.topDiv = document.createElement('div');
    this.topDiv.style.cssText = `position: absolute; width: 100%; text-align: center;`;
    
    this.bottomDiv = document.createElement('div');
    this.bottomDiv.style.cssText = `position: absolute; width: 100%; text-align: center;`;

    this.container.appendChild(this.topDiv);
    this.container.appendChild(this.bottomDiv);
    document.body.appendChild(this.container);

    // Хакаем Fullscreen режим.
    // Часто чужие плееры при переходе в полноэкранный режим создают изолированный верхний слой,
    // закрывая собой наш слой в body. Поэтому каждые 300 мс мы проверяем, не открыт ли фуллскрин,
    // и если да — физически переносим наш DOM-узел внутрь этого полноэкранного элемента.
    this.fullscreenWatcher = setInterval(() => {
      const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
      
      if (fsElement) {
        if (this.container.parentElement !== fsElement) fsElement.appendChild(this.container);
      } else {
        if (this.container.parentElement !== document.body) document.body.appendChild(this.container);
      }
    }, 300);

    // Отслеживание координат видеоплеера.
    // Поскольку мы вырвали субтитры из плеера в body, нам нужно заставить их двигаться вместе с видео,
    // если пользователь скроллит страницу.
    let prev = { top: -1, left: -1, width: -1, height: -1 };

    const trackVideoPosition = () => {
      if (!videoElement) return;
      const rect = videoElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        if (this.container.style.display !== 'none') this.container.style.display = 'none';
      } else {
        if (this.container.style.display !== 'block') this.container.style.display = 'block';
        
        // Магия оптимизации: меняем CSS-координаты только в том случае, если видео реально сдвинулось.
        // Запись в DOM (style.top) — очень дорогая операция. Благодаря этому "if", 
        // скрипт потребляет 0% процессора, когда страница находится в покое.
        if (prev.top !== rect.top || prev.left !== rect.left || prev.width !== rect.width || prev.height !== rect.height) {
          this.container.style.top = rect.top + 'px';
          this.container.style.left = rect.left + 'px';
          this.container.style.width = rect.width + 'px';
          this.container.style.height = rect.height + 'px';
          prev = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
        }
      }
      
      // requestAnimationFrame синхронизируется с частотой обновления монитора (обычно 60 FPS)
      this.animationFrameId = requestAnimationFrame(trackVideoPosition);
    };

    trackVideoPosition();
  },

  // Функция рендера строк. Каждая строка разбивается и оборачивается в <span>
  renderLines(div, text) {
    if (!text) {
      div.innerHTML = '';
      return;
    }
    const fontSize = (this.currentPrefs.fontSize || 24) + 'px';
    const lines = text.split('\n');
    
    div.innerHTML = lines.map(line => 
      `<span style="${this.spanStyle} font-size: ${fontSize};">${line}</span>`
    ).join('<br>');
  },

  updateText(topText, bottomText) {
    // Проверяем, изменился ли текст субтитра по сравнению с прошлым вызовом.
    // Субтитр висит на экране по несколько секунд. Без этой проверки мы бы заставляли 
    // браузер удалять и создавать HTML-разметку десятки раз в секунду.
    if (this.topDiv && this.lastTopText !== topText) {
      this.renderLines(this.topDiv, topText);
      this.lastTopText = topText;
    }
    if (this.bottomDiv && this.lastBottomText !== bottomText) {
      this.renderLines(this.bottomDiv, bottomText);
      this.lastBottomText = bottomText;
    }
  },

  applySettings(prefs) {
    if (!this.topDiv || !prefs) return;
    this.currentPrefs = prefs; 
    
    this.topDiv.style.top = (prefs.topOffset || 5) + '%';
    this.bottomDiv.style.bottom = (prefs.bottomOffset || 10) + '%';
    
    // Если пользователь поменял шрифт в настройках, принудительно перерисовываем 
    // текущий текст, чтобы изменения были видны мгновенно.
    if (this.lastTopText) this.renderLines(this.topDiv, this.lastTopText);
    if (this.lastBottomText) this.renderLines(this.bottomDiv, this.lastBottomText);
  }
};

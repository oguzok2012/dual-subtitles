// renderer.js
window.SubsRenderer = {
  container: null, topDiv: null, bottomDiv: null,
  animationFrameId: null, fullscreenWatcher: null,
  
  // Сохраняем стиль, чтобы применять его к каждой отдельной строчке
  spanStyle: `
    display: inline-block; color: #fff; background-color: rgba(0, 0, 0, 0.83);
    border-radius: 0.2em; margin: 0.1em; padding: 0.1em 0.3em;
    font-family: 'PT Sans', sans-serif; font-weight: 400; line-height: 1.2;
    text-align: center; box-sizing: border-box; user-select: none;
  `,
  
  currentPrefs: {},

  init(videoElement) {
    if (this.container) this.container.remove();
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.fullscreenWatcher) clearInterval(this.fullscreenWatcher);

    this.container = document.createElement('div');
    this.container.id = 'dual-sub-container';
    
    // Слой субтитров висит неподвижно поверх всего
    this.container.style.cssText = `
      position: fixed; pointer-events: none; z-index: 2147483647; 
      box-sizing: border-box; overflow: hidden; display: block;
    `;

    this.topDiv = document.createElement('div');
    this.topDiv.style.cssText = `position: absolute; width: 100%; text-align: center;`;
    
    this.bottomDiv = document.createElement('div');
    this.bottomDiv.style.cssText = `position: absolute; width: 100%; text-align: center;`;

    this.container.appendChild(this.topDiv);
    this.container.appendChild(this.bottomDiv);
    document.body.appendChild(this.container);

    // ==========================================
    // 1. РАДАР FULLSCREEN (Решение твоей проблемы)
    // ==========================================
    this.fullscreenWatcher = setInterval(() => {
      const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
      
      if (fsElement) {
        if (this.container.parentElement !== fsElement) fsElement.appendChild(this.container);
      } else {
        if (this.container.parentElement !== document.body) document.body.appendChild(this.container);
      }
    }, 500);

    // ==========================================
    // 2. ОТСЛЕЖИВАНИЕ КООРДИНАТ ВИДЕО (Без нагрузки на ПК)
    // ==========================================
    let prev = { top: -1, left: -1, width: -1, height: -1 };

    const trackVideoPosition = () => {
      if (!videoElement) return;
      const rect = videoElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        if (this.container.style.display !== 'none') this.container.style.display = 'none';
      } else {
        if (this.container.style.display !== 'block') this.container.style.display = 'block';
        
        // Меняем позицию только если видео сдвинулось (0% нагрузки на CPU)
        if (prev.top !== rect.top || prev.left !== rect.left || prev.width !== rect.width || prev.height !== rect.height) {
          this.container.style.top = rect.top + 'px';
          this.container.style.left = rect.left + 'px';
          this.container.style.width = rect.width + 'px';
          this.container.style.height = rect.height + 'px';
          prev = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
        }
      }
      this.animationFrameId = requestAnimationFrame(trackVideoPosition);
    };

    trackVideoPosition();
  },

  // Отрисовка: каждая строчка в своем прямоугольнике!
  renderLines(div, text) {
    if (!text) {
      div.innerHTML = '';
      return;
    }
    const fontSize = (this.currentPrefs.fontSize || 24) + 'px';
    const lines = text.split('\n');
    
    // Генерируем HTML, где каждая строчка обернута в свой <span>, а между ними <br>
    div.innerHTML = lines.map(line => 
      `<span style="${this.spanStyle} font-size: ${fontSize};">${line}</span>`
    ).join('<br>');
  },

  updateText(topText, bottomText) {
    if (this.topDiv) this.renderLines(this.topDiv, topText);
    if (this.bottomDiv) this.renderLines(this.bottomDiv, bottomText);
  },

  applySettings(prefs) {
    if (!this.topDiv || !prefs) return;
    this.currentPrefs = prefs; // Сохраняем настройки для функции renderLines
    
    this.topDiv.style.top = (prefs.topOffset || 5) + '%';
    this.bottomDiv.style.bottom = (prefs.bottomOffset || 10) + '%';
  }
};

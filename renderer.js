window.SubsRenderer = {
  container: null, topDiv: null, bottomDiv: null, topTextSpan: null, bottomTextSpan: null,

  init(videoElement) {
    if (this.container) this.container.remove();

    console.log("[DualSub] Инициализация UI поверх видео...");

    this.container = document.createElement('div');
    this.container.id = 'dual-sub-container';
    
    // Идеальный оверлей на 100% размера родителя (без математики)
    this.container.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 2147483647; /* Максимальный слой поверх всего */
      box-sizing: border-box; overflow: hidden;
    `;

    // Стили с родного сайта Flowplayer
    const spanStyle = `
      display: inline-block; color: #fff;
      background-color: rgba(0, 0, 0, 0.8);
      border-radius: 0.2em; margin: 0.1em; padding: 0.1em 0.3em;
      font-family: 'PT Sans', sans-serif; font-weight: 400; line-height: 1.2;
      text-align: center; box-sizing: border-box; user-select: none;
      transition: all 0.2s ease;
    `;

    this.topDiv = document.createElement('div');
    this.topDiv.style.cssText = `position: absolute; width: 100%; text-align: center;`;
    this.topTextSpan = document.createElement('span');
    this.topTextSpan.style.cssText = spanStyle;
    this.topDiv.appendChild(this.topTextSpan);
    
    this.bottomDiv = document.createElement('div');
    this.bottomDiv.style.cssText = `position: absolute; width: 100%; text-align: center;`;
    this.bottomTextSpan = document.createElement('span');
    this.bottomTextSpan.style.cssText = spanStyle;
    this.bottomDiv.appendChild(this.bottomTextSpan);

    this.container.appendChild(this.topDiv);
    this.container.appendChild(this.bottomDiv);

    // Родитель видео становится якорем для нашего контейнера
    videoElement.parentNode.style.position = 'relative';
    videoElement.parentNode.insertBefore(this.container, videoElement.nextSibling);
  },

  updateText(topText, bottomText) {
    if (this.topTextSpan) {
      this.topTextSpan.innerHTML = topText;
      this.topTextSpan.style.display = topText ? 'inline-block' : 'none';
    }
    if (this.bottomTextSpan) {
      this.bottomTextSpan.innerHTML = bottomText;
      this.bottomTextSpan.style.display = bottomText ? 'inline-block' : 'none';
    }
  },

  applySettings(prefs) {
    if (!this.topDiv || !prefs) return;
    
    let fontSize = (prefs.fontSize || 24) + 'px';
    this.topTextSpan.style.fontSize = fontSize;
    this.bottomTextSpan.style.fontSize = fontSize;

    this.topDiv.style.top = (prefs.topOffset || 5) + '%';
    this.bottomDiv.style.bottom = (prefs.bottomOffset || 10) + '%';
    
    console.log("[DualSub] Применены стили:", prefs);
  }
};

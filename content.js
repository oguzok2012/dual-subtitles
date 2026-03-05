let videoElement = null;
let topSubsData = [];
let bottomSubsData = [];
let topDiv, bottomDiv, container;

// Слушаем сообщение от background.js
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "DUAL_SUBS_READY") {
    
    videoElement = document.querySelector('video');
    if (!videoElement) return; // Если в этом фрейме нет видео - игнорируем

    topSubsData = event.data.topSubs;
    bottomSubsData = event.data.bottomSubs;

    setupUI();
    
    // Прячем стандартные сабы
    for (let i = 0; i < videoElement.textTracks.length; i++) {
      videoElement.textTracks[i].mode = 'hidden';
    }
  }
});

function setupUI() {
  if (document.getElementById('dual-sub-container')) {
    document.getElementById('dual-sub-container').remove();
  }

  container = document.createElement('div');
  container.id = 'dual-sub-container';
  container.style.cssText = `
    position: absolute; 
    pointer-events: none; /* Пропускаем клики сквозь текст */
    z-index: 2147483647;  /* Максимальный слой */
    display: flex; flex-direction: column; justify-content: space-between;
    background: transparent;
  `;

  const textStyle = `
    text-align: center; color: #FFF; font-size: 26px; font-family: sans-serif;
    font-weight: bold; padding: 10px 20px; line-height: 1.2;
    text-shadow: 0px 0px 6px #000, 2px 2px 4px #000, -2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000;
  `;

  topDiv = document.createElement('div');
  topDiv.style.cssText = textStyle + "margin-top: 10px;";
  
  bottomDiv = document.createElement('div');
  bottomDiv.style.cssText = textStyle + "margin-bottom: 60px;"; // Отступ от полосы управления плеером

  container.appendChild(topDiv);
  container.appendChild(bottomDiv);

  // Добавляем в самый корень, чтобы не сломать верстку плеера
  document.body.appendChild(container);

  // Запускаем синхронизацию времени и позиции
  videoElement.addEventListener('timeupdate', syncSubsText);
  setInterval(updateContainerPosition, 100); // 10 раз в секунду выравниваем сабы по видео
  window.addEventListener('resize', updateContainerPosition);
}

// Эта функция заставляет контейнер летать точно поверх видео, где бы оно ни было
function updateContainerPosition() {
  if (!videoElement || !container) return;
  const rect = videoElement.getBoundingClientRect();
  
  // Если видео свернуто (ширина 0) - прячем
  if (rect.width === 0) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'flex';
  container.style.left = (rect.left + window.scrollX) + 'px';
  container.style.top = (rect.top + window.scrollY) + 'px';
  container.style.width = rect.width + 'px';
  container.style.height = rect.height + 'px';
}

function syncSubsText() {
  if (!videoElement) return;
  const now = videoElement.currentTime;

  const currentTop = topSubsData.find(s => now >= s.start && now <= s.end);
  topDiv.innerHTML = currentTop ? currentTop.text : "";

  const currentBottom = bottomSubsData.find(s => now >= s.start && now <= s.end);
  bottomDiv.innerHTML = currentBottom ? currentBottom.text : "";
}

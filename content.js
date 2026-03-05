// content.js
let videoElement = null;
let topData = [];
let bottomData = [];
let currentPrefs = {}; // Глобальное хранилище настроек для этого фрейма

console.log("[DualSub] Content-скрипт готов.");

window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "DUAL_SUBS_READY") {
    
    videoElement = document.querySelector('video');
    if (!videoElement) return;

    topData = event.data.topSubs;
    bottomData = event.data.bottomSubs;
    currentPrefs = event.data.prefs || {};

    window.SubsRenderer.init(videoElement);
    window.SubsRenderer.applySettings(currentPrefs);
    
    Array.from(videoElement.textTracks).forEach(track => track.mode = 'hidden');

    videoElement.removeEventListener('timeupdate', syncText);
    videoElement.addEventListener('timeupdate', syncText);
  }
  
  if (event.data && event.data.type === "UPDATE_SETTINGS") {
    currentPrefs = event.data.prefs; // Обновляем настройки таймингов
    if (window.SubsRenderer) {
      window.SubsRenderer.applySettings(currentPrefs);
      syncText(); // Принудительно перерисовываем текст, чтобы задержка применилась сразу!
    }
  }
});

function syncText() {
  if (!videoElement) return;
  const now = videoElement.currentTime;
  
  // МАТЕМАТИКА ТАЙМИНГОВ: Вычитаем задержку (миллисекунды переводим в секунды)
  // Если delay = 1000 (задержка 1 сек), мы ищем субтитр для (now - 1) секунды.
  const topNow = now - ((currentPrefs.topDelay || 0) / 1000);
  const bottomNow = now - ((currentPrefs.bottomDelay || 0) / 1000);
  
  const currentTop = topData.find(s => topNow >= s.start && topNow <= s.end);
  const currentBottom = bottomData.find(s => bottomNow >= s.start && bottomNow <= s.end);

  window.SubsRenderer.updateText(
    currentTop ? currentTop.text : "",
    currentBottom ? currentBottom.text : ""
  );
}

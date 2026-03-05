let videoElement = null;
let topData = [];
let bottomData = [];

console.log("[DualSub] Content-скрипт загружен. Ждем команду...");

window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "DUAL_SUBS_READY") {
    console.log("[DualSub] Получена команда на рендер! Массивы:", event.data);
    
    videoElement = document.querySelector('video');
    if (!videoElement) {
      console.log("[DualSub] Видео не найдено в этом фрейме.");
      return;
    }

    topData = event.data.topSubs;
    bottomData = event.data.bottomSubs;

    window.SubsRenderer.init(videoElement);
    window.SubsRenderer.applySettings(event.data.prefs);
    
    // Прячем родные сабы
    Array.from(videoElement.textTracks).forEach(track => track.mode = 'hidden');

    videoElement.removeEventListener('timeupdate', syncText);
    videoElement.addEventListener('timeupdate', syncText);
  }
  
  if (event.data && event.data.type === "UPDATE_SETTINGS") {
    if (window.SubsRenderer) {
      window.SubsRenderer.applySettings(event.data.prefs);
    }
  }
});

function syncText() {
  if (!videoElement) return;
  const now = videoElement.currentTime;
  
  const currentTop = topData.find(s => now >= s.start && now <= s.end);
  const currentBottom = bottomData.find(s => now >= s.start && now <= s.end);

  window.SubsRenderer.updateText(
    currentTop ? currentTop.text : "",
    currentBottom ? currentBottom.text : ""
  );
}

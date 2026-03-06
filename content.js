// content.js
(function() {
  let videoElement = null;
  let topData = [];
  let bottomData = [];
  let currentPrefs = {};
  
  // Создаем "курсоры" для массивов субтитров.
  // Они нужны, чтобы не искать текущий субтитр с самого начала массива 60 раз в секунду.
  // Сохраняя индекс последнего показанного субтитра, мы делаем поиск моментальным O(1).
  let topIndex = 0;
  let bottomIndex = 0;

  console.log("[DualSub] Content-скрипт готов.");

  // Функция очистки жизненно необходима для SPA-сайтов (как Netflix или Кинопоиск).
  // При переходе на новую серию страница не перезагружается. Если не удалить старый
  // слушатель с прошлого видеоплеера, он останется висеть в памяти навсегда (утечка памяти).
  function cleanup() {
    if (videoElement) {
      videoElement.removeEventListener('timeupdate', syncText);
    }
    topIndex = 0;
    bottomIndex = 0;
  }

  // Слушаем сообщения из других контекстов расширения
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "DUAL_SUBS_READY") {
      cleanup(); 
      
      videoElement = document.querySelector('video');
      if (!videoElement) return;

      // Парсим текст субтитров прямо здесь, на стороне клиента.
      // Это разгружает фоновый скрипт и канал сообщений.
      topData = window.parseVTT(event.data.topRaw);
      bottomData = window.parseVTT(event.data.bottomRaw);
      currentPrefs = event.data.prefs || {};

      window.SubsRenderer.init(videoElement);
      window.SubsRenderer.applySettings(currentPrefs);
      
      // Подписываемся на обновление времени в плеере
      videoElement.addEventListener('timeupdate', syncText);
    }
    
    // Обработка изменения настроек "на лету" (без перезагрузки субтитров)
    if (event.data && event.data.type === "UPDATE_SETTINGS") {
      currentPrefs = event.data.prefs; 
      if (window.SubsRenderer) {
        window.SubsRenderer.applySettings(currentPrefs);
        syncText(); // Сразу пересчитываем позицию и размер
      }
    }
  });

  // Умный поиск текущего субтитра по времени
  function getSubText(data, now, indexRef) {
    if (!data || data.length === 0) return { text: "", newIndex: 0 };
    
    let currentIndex = indexRef;
    let currentSub = data[currentIndex];

    // Быстрая проверка: находится ли текущее время видео всё ещё внутри старого субтитра?
    // В 99% случаев ответ будет "да", и мы просто вернем кэшированный результат, 
    // сэкономив ресурсы процессора. Тяжелый поиск запускается только при перемотке видео.
    if (!currentSub || now < currentSub.start || now > currentSub.end) {
      currentIndex = data.findIndex(s => now >= s.start && now <= s.end);
      currentSub = currentIndex !== -1 ? data[currentIndex] : null;
    }
    
    return { 
      text: currentSub ? currentSub.text : "", 
      newIndex: currentIndex !== -1 ? currentIndex : indexRef 
    };
  }

  // Главная функция синхронизации (вызывается 4-60 раз в секунду)
  function syncText() {
    if (!videoElement) return;
    const now = videoElement.currentTime;
    
    // Математика задержки субтитров: если задержка положительная, мы просто 
    // "отматываем" время для поиска назад. Переводим миллисекунды из настроек в секунды.
    const topNow = now - ((currentPrefs.topDelay || 0) / 1000);
    const bottomNow = now - ((currentPrefs.bottomDelay || 0) / 1000);
    
    const topResult = getSubText(topData, topNow, topIndex);
    topIndex = topResult.newIndex; // Обновляем курсор для следующего кадра

    const bottomResult = getSubText(bottomData, bottomNow, bottomIndex);
    bottomIndex = bottomResult.newIndex;

    window.SubsRenderer.updateText(topResult.text, bottomResult.text);
  }
})();

// Слушаем все завершенные сетевые запросы
chrome.webRequest.onCompleted.addListener(
  function(details) {
    // Проверяем, есть ли в ссылке .vtt или .srt
    // Часто ссылки выглядят как file.vtt?token=123, поэтому проверяем через includes
    if (details.url.includes('.vtt') || details.url.includes('.srt')) {
      
      const tabId = details.tabId;
      if (tabId < 0) return; // Игнорируем фоновые запросы браузера

      // Достаем из хранилища уже пойманные субтитры для этой вкладки
      chrome.storage.local.get([tabId.toString()], function(result) {
        let subs = result[tabId.toString()] || [];
        
        // Добавляем новую ссылку, если её еще нет в массиве (чтобы избежать дублей)
        if (!subs.includes(details.url)) {
          subs.push(details.url);
          
          // Сохраняем обратно
          let dataToSave = {};
          dataToSave[tabId.toString()] = subs;
          chrome.storage.local.set(dataToSave);
          
          console.log("Пойманы субтитры:", details.url);
        }
      });
    }
  },
  { urls: ["<all_urls>"] } // Фильтр: слушаем все сайты
);

// Очищаем память, когда вкладка закрывается
chrome.tabs.onRemoved.addListener(function(tabId) {
  chrome.storage.local.remove(tabId.toString());
});


// --- НОВАЯ ЧАСТЬ: Скачивание и Парсинг ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FETCH_AND_APPLY") {
    
    // Функция для скачивания и парсинга одного файла VTT
    async function processSub(url) {
      if (!url) return [];
      try {
        let response = await fetch(url);
        let text = await response.text();
        return parseVTT(text);
      } catch (e) {
        console.error("Ошибка скачивания сабов:", e);
        return [];
      }
    }

    // Скачиваем оба файла параллельно
    Promise.all([
      processSub(request.topUrl),
      processSub(request.bottomUrl)
    ]).then(([topData, bottomData]) => {
      
      // Отправляем готовые массивы с текстом на страницу (в content.js)
      chrome.tabs.sendMessage(request.tabId, {
        action: "RENDER_SUBS",
        topSubs: topData,
        bottomSubs: bottomData
      });
    });
  }
});

// Простой конвертер времени VTT в секунды
function timeToSeconds(timeStr) {
  let parts = timeStr.replace(',', '.').split(':');
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  } else {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  }
}

// Парсер VTT файла
function parseVTT(data) {
  let subs = [];
  // Разбиваем текст на блоки (пустые строки)
  let blocks = data.split(/(?:\r?\n){2,}/); 
  
  blocks.forEach(block => {
    let lines = block.split(/\r?\n/);
    let timeLine = lines.find(l => l.includes('-->')); // Ищем строку со временем
    
    if (timeLine) {
      let times = timeLine.split('-->');
      let start = timeToSeconds(times[0].trim());
      let end = timeToSeconds(times[1].trim());
      
      // Все строки после времени - это текст субтитра
      let textIndex = lines.indexOf(timeLine) + 1;
      let text = lines.slice(textIndex).join('<br>');
      
      // Очищаем от HTML-тегов, которые иногда пихают в VTT (например <i>)
      text = text.replace(/<[^>]+>/g, '');
      
      subs.push({ start, end, text });
    }
  });
  return subs;
}

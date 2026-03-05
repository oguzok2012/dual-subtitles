import { parseVTT } from './parser.js';

// Очистка старых субтитров при смене серии/страницы
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) { 
    chrome.storage.local.remove(details.tabId.toString());
  }
});

// Перехват ссылок на субтитры
chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (details.url.includes('.vtt') || details.url.includes('.srt')) {
      const tabId = details.tabId;
      if (tabId < 0) return;

      chrome.storage.local.get([tabId.toString()], function(result) {
        let subs = result[tabId.toString()] || [];
        if (!subs.includes(details.url)) {
          subs.push(details.url);
          chrome.storage.local.set({ [tabId.toString()]: subs });
        }
      });
    }
  },
  { urls: ["<all_urls>"] }
);

// Обработка команды "Применить"
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FETCH_AND_APPLY") {
    
    async function processSub(url) {
      if (!url || url === "none") return [];
      try {
        let response = await fetch(url);
        let text = await response.text();
        return parseVTT(text);
      } catch (e) { return []; }
    }

    Promise.all([
      processSub(request.topUrl),
      processSub(request.bottomUrl)
    ]).then(([topData, bottomData]) => {
      
      // ВОТ ТА САМАЯ ПРАВКА: Мы передаем request.prefs (настройки из UI) в функцию
      chrome.scripting.executeScript({
        target: { tabId: request.tabId, allFrames: true },
        func: (top, bottom, prefsObj) => {
          // Отправляем сообщение внутри фрейма
          window.postMessage({ 
            type: "DUAL_SUBS_READY", 
            topSubs: top, 
            bottomSubs: bottom,
            prefs: prefsObj // Передали настройки
          }, "*");
        },
        args: [topData, bottomData, request.prefs] // Пробросили аргумент
      });
      
      sendResponse({ status: "ok" });
    });
    return true; 
  }
});

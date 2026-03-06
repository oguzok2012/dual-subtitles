// background.js

// Когда пользователь переходит на новую страницу или обновляет вкладку (смена серии),
// мы удаляем старые ссылки на субтитры, чтобы они не копились.
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) { 
    chrome.storage.local.remove(details.tabId.toString());
  }
});

// Глобальный сниффер сетевого трафика браузера.
// Он проверяет каждый пролетающий запрос, и если это файл субтитров, сохраняет его URL.
chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (details.url.includes('.vtt') || details.url.includes('.srt')) {
      const tabId = details.tabId;
      if (tabId < 0) return;

      chrome.storage.local.get([tabId.toString()], function(result) {
        // Здесь мы используем словарь (объект) вместо массива. 
        // В JavaScript нет встроенных мьютексов для работы с БД браузера. 
        // Если прилетят два запроса одновременно, добавление в массив вызовет состояние гонки 
        // и один файл затрет другой. Атомарная запись по ключу в словарь решает эту проблему.
        let subsDict = result[tabId.toString()] || {};
        if (!subsDict[details.url]) {
          subsDict[details.url] = true; 
          chrome.storage.local.set({ [tabId.toString()]: subsDict });
        }
      });
    }
  },
  { urls: ["<all_urls>"] }
);

// Слушатель сообщений от интерфейса (попапа).
// Срабатывает, когда пользователь нажимает кнопку "Применить".
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FETCH_AND_APPLY") {
    
    // Скачиваем файл субтитров. Поскольку код выполняется в фоновом скрипте 
    // с правами <all_urls>, браузер автоматически отключает CORS-ограничения, 
    // что позволяет нам скачивать файлы с любых пиратских балансеров и CDN.
    async function fetchSub(url) {
      if (!url || url === "none") return "";
      try {
        let response = await fetch(url);
        // Возвращаем только сырой текст. Если распарсить субтитры здесь и превратить их 
        // в огромный массив объектов, передача этих данных в content.js забьет 
        // канал связи браузера и вызовет фризы интерфейса. Текст передается моментально.
        return await response.text(); 
      } catch (e) { return ""; }
    }

    // Ждем скачивания обеих дорожек (верхней и нижней) параллельно
    Promise.all([
      fetchSub(request.topUrl),
      fetchSub(request.bottomUrl)
    ]).then(([topRawText, bottomRawText]) => {
      
      // Внедряем микро-функцию прямо во все iframe на странице с видео.
      // Эта функция отправляет сырой текст субтитров в наш content.js, 
      // который уже ждет их внутри плеера.
      chrome.scripting.executeScript({
        target: { tabId: request.tabId, allFrames: true },
        func: (topText, bottomText, prefsObj) => {
          window.postMessage({ 
            type: "DUAL_SUBS_READY", 
            topRaw: topText, 
            bottomRaw: bottomText,
            prefs: prefsObj
          }, "*");
        },
        args: [topRawText, bottomRawText, request.prefs]
      });
      
      sendResponse({ status: "ok" });
    });
    
    // Возвращаем true, чтобы Service Worker браузера не уснул (не выгрузился из памяти),
    // пока мы асинхронно скачиваем файлы через fetch. Это требование Manifest V3.
    return true; 
  }
});

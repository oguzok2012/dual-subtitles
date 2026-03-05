document.addEventListener('DOMContentLoaded', () => {
  const topSelect = document.getElementById('topSubs');
  const bottomSelect = document.getElementById('bottomSubs');
  const applyBtn = document.getElementById('applyBtn');
  const openTabBtn = document.getElementById('openTabBtn');
  const autoRemember = document.getElementById('autoRemember');

  const fontSize = document.getElementById('fontSize');
  const topOffset = document.getElementById('topOffset');
  const bottomOffset = document.getElementById('bottomOffset');

  const updateLabels = () => {
    document.getElementById('sizeVal').innerText = fontSize.value;
    document.getElementById('topVal').innerText = topOffset.value;
    document.getElementById('botVal').innerText = bottomOffset.value;
  };
  [fontSize, topOffset, bottomOffset].forEach(el => el.addEventListener('input', updateLabels));

  const urlParams = new URLSearchParams(window.location.search);
  let targetTabId = urlParams.get('tabId');

  // Если tabId нет в ссылке, ищем активную вкладку (И фильтруем служебные страницы Chrome)
  if (targetTabId) {
    initUI(parseInt(targetTabId));
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      let tab = tabs[0];
      if (!tab) return;
      
      // ФИКС ОШИБКИ: Запрещаем работать на страницах настроек и в самом расширении
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.warn("Вы открыли настройки расширения как активную вкладку без привязки к фильму.");
        document.body.innerHTML = "<h3 style='padding:20px; text-align:center;'>Откройте вкладку с фильмом и нажмите на иконку расширения там.</h3>";
        return;
      }
      initUI(tab.id);
    });
  }

  function initUI(tabId) {
    openTabBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: `ui.html?tabId=${tabId}` });
    });

    chrome.storage.local.get([tabId.toString(), 'userPrefs'], function(result) {
      const subs = result[tabId.toString()] || [];
      const prefs = result.userPrefs || { topLang: 'ru', bottomLang: 'none', fontSize: 24, topOffset: 5, bottomOffset: 10 };

      fontSize.value = prefs.fontSize || 24;
      topOffset.value = prefs.topOffset || 5;
      bottomOffset.value = prefs.bottomOffset || 10;
      updateLabels();

      subs.forEach((url, index) => {
        let name = url.split('/').pop().split('?')[0];
        let optionText = `Дорожка ${index + 1} (${name})`;
        topSelect.add(new Option(optionText, url));
        bottomSelect.add(new Option(optionText, url));
      });

      if (subs.length > 0) {
        let autoTop = subs.find(url => url.includes(prefs.topLang));
        if (autoTop) topSelect.value = autoTop;
        if (prefs.bottomLang !== 'none') {
          let autoBot = subs.find(url => url.includes(prefs.bottomLang));
          if (autoBot) bottomSelect.value = autoBot;
        }
      }

      const saveAndSendStyles = () => {
        let currentPrefs = { fontSize: fontSize.value, topOffset: topOffset.value, bottomOffset: bottomOffset.value };
        chrome.storage.local.set({ userPrefs: { ...prefs, ...currentPrefs } });
        
        // Отправляем стили только в реальную вкладку с фильмом
        chrome.scripting.executeScript({
          target: { tabId: tabId, allFrames: true },
          func: (p) => window.postMessage({ type: "UPDATE_SETTINGS", prefs: p }, "*"),
          args: [currentPrefs]
        }).catch(err => console.error("Ошибка передачи стилей:", err));
      };

      [fontSize, topOffset, bottomOffset].forEach(el => el.addEventListener('change', saveAndSendStyles));

      applyBtn.addEventListener('click', () => {
        const topUrl = topSelect.value;
        const bottomUrl = bottomSelect.value;
        let currentPrefs = {
          topLang: topUrl.includes('ru') ? 'ru' : 'en',
          bottomLang: bottomUrl.includes('en') ? 'en' : 'none',
          fontSize: fontSize.value,
          topOffset: topOffset.value,
          bottomOffset: bottomOffset.value
        };

        if (autoRemember.checked) chrome.storage.local.set({ userPrefs: currentPrefs });

        applyBtn.innerText = "Применяем...";
        chrome.runtime.sendMessage({ action: "FETCH_AND_APPLY", topUrl, bottomUrl, tabId, prefs: currentPrefs }, () => {
          applyBtn.innerText = "Готово!";
          setTimeout(() => applyBtn.innerText = "Применить к плееру", 1500);
        });
      });
    });
  }
});

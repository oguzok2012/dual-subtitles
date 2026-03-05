document.addEventListener('DOMContentLoaded', () => {
  const topSelect = document.getElementById('topSubs');
  const bottomSelect = document.getElementById('bottomSubs');
  const applyBtn = document.getElementById('applyBtn');

  // Запрашиваем пойманные ссылки
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const currentTabId = tabs[0].id.toString();

    chrome.storage.local.get([currentTabId], function(result) {
      const subs = result[currentTabId] || [];
      subs.forEach((url, index) => {
        let shortName = `Дорожка ${index + 1} (${url.split('/').pop().split('?')[0]})`;
        topSelect.add(new Option(shortName, url));
        bottomSelect.add(new Option(shortName, url));
      });
    });
  });

  // Кнопка применить
  applyBtn.addEventListener('click', () => {
    applyBtn.innerText = "Загружаем...";

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.runtime.sendMessage({
        action: "FETCH_AND_APPLY",
        topUrl: topSelect.value,
        bottomUrl: bottomSelect.value,
        tabId: tabs[0].id
      }, response => {
        applyBtn.innerText = "Применить и показать";
      });
    });
  });
});

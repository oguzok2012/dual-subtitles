// parser.js

// Оборачиваем код в анонимную самовызывающуюся функцию (IIFE).
// Это нужно для того, чтобы внутренние переменные парсера не стали глобальными 
// и не сломали логику на сайтах, где уже есть свои переменные с такими же именами.
(function() {
  // Вспомогательная функция для перевода времени вида 00:01:23.450 в секунды
  function timeToSeconds(timeStr) {
    let parts = timeStr.replace(',', '.').split(':');
    if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
    } else {
      return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    }
  }

  // Привязываем основную функцию к window, чтобы она стала доступна в content.js
  window.parseVTT = function(data) {
    if (!data) return [];
    let subs = [];
    
    // Разбиваем весь текст файла на блоки по двойному переносу строки
    let blocks = data.split(/(?:\r?\n){2,}/); 
    
    blocks.forEach(block => {
      let lines = block.split(/\r?\n/);
      // Ищем строку с таймингами по характерной стрелочке из стандарта VTT
      let timeLine = lines.find(l => l.includes('-->')); 
      
      if (timeLine) {
        let times = timeLine.split('-->');
        let start = timeToSeconds(times[0].trim());
        let end = timeToSeconds(times[1].trim());
        
        let textIndex = lines.indexOf(timeLine) + 1;
        let rawLines = lines.slice(textIndex);
        
        // Очищаем строки от любых HTML-тегов (например, <i>, <b> или <font>).
        // Если этого не сделать, они могут сломать нашу кастомную CSS-верстку.
        let cleanedLines = rawLines.map(line => line.replace(/<[^>]+>/g, '').trim());
        let text = cleanedLines.join('\n');
        
        subs.push({ start, end, text });
      }
    });
    return subs;
  };
})();

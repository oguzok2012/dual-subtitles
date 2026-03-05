// parser.js
function timeToSeconds(timeStr) {
  let parts = timeStr.replace(',', '.').split(':');
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  } else {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  }
}

export function parseVTT(data) {
  let subs = [];
  let blocks = data.split(/(?:\r?\n){2,}/); 
  
  blocks.forEach(block => {
    let lines = block.split(/\r?\n/);
    let timeLine = lines.find(l => l.includes('-->')); 
    if (timeLine) {
      let times = timeLine.split('-->');
      let start = timeToSeconds(times[0].trim());
      let end = timeToSeconds(times[1].trim());
      
      let textIndex = lines.indexOf(timeLine) + 1;
      let rawLines = lines.slice(textIndex);
      
      // Сначала очищаем каждую строку от тегов <i>, <b> и тд.
      let cleanedLines = rawLines.map(line => line.replace(/<[^>]+>/g, '').trim());
      
      // Склеиваем через спецсимвол \n (перенос строки)
      let text = cleanedLines.join('\n');
      
      
      subs.push({ start, end, text });
    }
  });
  return subs;
}

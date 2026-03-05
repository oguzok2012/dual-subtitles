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
      
      let text = lines.slice(textIndex).join('<br>').replace(/<[^>]+>/g, '');
      
      // НОВОЕ: Умный перенос строк (Паттерн: знак препинания + буква без пробела)
      text = text.replace(/([.,!?-])([a-zA-Zа-яА-ЯёЁ])/g, '$1<br>$2');
      
      subs.push({ start, end, text });
    }
  });
  return subs;
}

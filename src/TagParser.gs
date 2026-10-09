/** Shared by Google Apps Script and the GitHub Pages iPhone test. */
function parseTagText_(raw) {
  const upper = String(raw || '').toUpperCase().replace(/\u00a0/g, ' ');
  const model = tagNumber_(upper, 'model');
  const serial = tagNumber_(upper, 'serial');
  const type = /CLOTHES\s+DRYER|\bDRYER\b/.test(upper) ? 'Dryer' :
    /\bWASHER\b/.test(upper) ? 'Washer' :
    /\bREFRIGERATOR\b/.test(upper) ? 'Refrigerator' : '';
  const brand = /SAMSUNG/.test(upper) ? 'Samsung' :
    /FRIGIDAIRE/.test(upper) ? 'Frigidaire' :
    /WHIRLPOOL/.test(upper) ? 'Whirlpool' :
    /LG ELECTRONICS|\bLG\b/.test(upper) ? 'LG' : '';
  return { type, brand, model, serial, raw: String(raw || '') };
}
function tagNumber_(text, kind) {
  const normalized = String(text || '').toUpperCase()
    .replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ')
    .replace(/[\u2010-\u2015]/g, '-');
  const modelLabel = 'MODEL(?:[ \\t]*(?:NUMBER|NO\\.?|CODE))?|MOD\\.?';
  const serialLabel = 'SERIAL(?:[ \\t]*(?:NUMBER|NO\\.?))?|S[ \\t]*/[ \\t]*N|S\\.?N\\.?|SER\\.?[ \\t]*(?:NUMBER|NO\\.?)';
  const labels = new RegExp('\\b(?:' + (kind === 'model' ? modelLabel : serialLabel) +
    ')(?=[\\s:#=.\\-]|$)[ \\t]*[:#=.\\-]*[ \\t]*', 'g');
  const nextLabel = new RegExp('\\b(?:' + modelLabel + '|' + serialLabel +
    '|TYPE|MFG|DATE|VOLTAGE|VOLTS|HZ|AMPS|MADE|PRODUCT)\\b');
  let match;
  while ((match = labels.exec(normalized))) {
    const line = normalized.slice(labels.lastIndex).trimStart().split('\n')[0];
    const valueText = line.split(nextLabel)[0].trim().replace(/[ \t]*([/\-])[ \t]*/g, '$1');
    const valueMatch = valueText.match(/^[A-Z0-9][A-Z0-9/\-]*(?:[ \t]+[A-Z0-9][A-Z0-9/\-]*)*/);
    if (!valueMatch) continue;
    const parts = valueMatch[0].split(/[ \t]+/);
    const numberParts = [];
    for (const part of parts) {
      if (/^(?:V|VAC|VOLT|W|WATTS|A|AMP|HZ|KW)$/.test(part)) break;
      numberParts.push(part);
    }
    const value = numberParts.join('');
    if (value.length >= 6 && /\d/.test(value)) return value;
  }
  return '';
}

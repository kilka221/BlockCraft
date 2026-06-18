const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldFuncRegex = /function splitTextIntoLines\(text: string, maxCharsPerLine: number = 28\): string\[\] \{[\s\S]*?return lines;\n\}/;

const newFunc = `function splitTextIntoLines(text: string, maxCharsPerLine: number = 28): string[] {
  const lines: string[] = [];
  let currentLine = '';
  
  // More intelligent tokenization for code: separates variables, numbers, operators, Strings
  const tokens = text.match(/[\\wА-Яа-я]+|["'].*?["']|[^\\w\\sА-Яа-я"']+|\\s+/g) || [text];
  
  for (const token of tokens) {
    if (token.match(/^\\s+$/)) {
      if (currentLine.length > 0 && !currentLine.endsWith(' ')) {
          currentLine += ' ';
      }
      continue;
    }
    
    // Check if we need to wrap
    if (currentLine.length + token.length > maxCharsPerLine) {
        if (currentLine.trim().length > 0) {
            lines.push(currentLine.trim());
            currentLine = '';
        }
        if (token.length > maxCharsPerLine) {
            let wStr = token;
            while (wStr.length > maxCharsPerLine) {
                lines.push(wStr.slice(0, maxCharsPerLine));
                wStr = wStr.slice(maxCharsPerLine);
            }
            currentLine = wStr;
        } else {
            currentLine = token;
        }
    } else {
        currentLine += token;
    }
  }
  if (currentLine.trim()) {
      lines.push(currentLine.trim());
  }
  return lines;
}`;

code = code.replace(oldFuncRegex, newFunc);
fs.writeFileSync('src/App.tsx', code);
console.log('replaced split text');

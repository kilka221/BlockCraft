const code = `import ui
import data_manager

def add_records(data):
    count = ui.get_int("Сколько записей вы хотите добавить?", min_val=1)
    x = {
        'a': 1,
        'b': 2
    }
    z = 3
    if count is None: return
    if x:
        pass
`;
let cleanedCode = code.replace(/"""[\s\S]*?"""/g, (match) => { return match.replace(/[^\n]/g, ''); });
cleanedCode = cleanedCode.replace(/'''[\s\S]*?'''/g, (match) => { return match.replace(/[^\n]/g, ''); });
let inString = false;
let stringChar = '';
let processedCode = '';

for (let j = 0; j < cleanedCode.length; j++) {
    let char = cleanedCode[j];
    if (inString) {
        if (char === '\\') {
            processedCode += char + cleanedCode[j+1];
            j++;
            continue;
        }
        if (char === stringChar) {
            inString = false;
        }
        processedCode += char;
    } else {
        if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
            processedCode += char;
        } else if (char === '#') {
            while (j < cleanedCode.length && cleanedCode[j] !== '\n') j++;
            processedCode += '\n';
        } else {
            processedCode += char;
        }
    }
}
let rawLogicalLines = [];
let currentLogicalLine = '';
let currentLogicalLineIndex = undefined;
let pCount = 0, bCount = 0, cCount = 0;

let processedLines = processedCode.split('\n');
for (let idx = 0; idx < processedLines.length; idx++) {
    let r = processedLines[idx];
    let match = r.match(/^(\s*)(if\s+.*|elif\s+.*|else|while\s+.*|for\s+.*|case\s+.*|match\s+.*|def\s+.*)$/);
    let inlineStatements = [];
    let inStr = false;
    let strChar = '';
    let isKeywordLine = !!r.trim().match(/^(if|elif|else|while|for|case|match|def)\b/);
    
    for (let j = 0; j < r.length; j++) {
        let char = r[j];
        if (inStr) {
            if (char === '\\') j++;
            else if (char === strChar) inStr = false;
        } else {
            if (char === '"' || char === "'") {
                inStr = true;
                strChar = char;
            } else if (char === ':' && isKeywordLine) {
                let rest = r.substring(j + 1).trim();
                if (rest !== '') {
                    let indentMatch = r.match(/^(\s*)/);
                    let baseIndent = indentMatch ? indentMatch[1] : '';
                    inlineStatements.push(r.substring(0, j + 1));
                    inlineStatements.push(baseIndent + '    ' + rest);
                    r = ''; 
                    break;
                }
            }
        }
    }
    
    if (inlineStatements.length > 0) {
        for (let stmt of inlineStatements) {
            rawLogicalLines.push({ text: stmt, origIndex: idx });
        }
        continue;
    }

    let noStrCodePart = '';
    inStr = false;
    for (let j = 0; j < r.length; j++) {
        let char = r[j];
        if (inStr) {
            if (char === '\\') j++;
            else if (char === strChar) inStr = false;
        } else {
            if (char === '"' || char === "'") {
                inStr = true;
                strChar = char;
            } else {
                noStrCodePart += char;
            }
        }
    }

    for (let char of noStrCodePart) {
        if (char === '(') pCount++; else if (char === ')') pCount--;
        if (char === '[') bCount++; else if (char === ']') bCount--;
        if (char === '{') cCount++; else if (char === '}') cCount--;
    }

    if (pCount > 0 || bCount > 0 || cCount > 0 || r.endsWith('\\')) {
        currentLogicalLine += (currentLogicalLine ? '\n' : '') + r.replace(/\\$/, '');
        if (currentLogicalLineIndex === undefined) currentLogicalLineIndex = idx;
    } else {
        currentLogicalLine += (currentLogicalLine ? '\n' : '') + r;
        rawLogicalLines.push({ text: currentLogicalLine, origIndex: currentLogicalLineIndex !== undefined ? currentLogicalLineIndex : idx });
        currentLogicalLine = '';
        currentLogicalLineIndex = undefined;
    }
}
if (currentLogicalLine) {
    rawLogicalLines.push({ text: currentLogicalLine, origIndex: currentLogicalLineIndex !== undefined ? currentLogicalLineIndex : processedLines.length - 1 });
}
console.log("Original lines:", code.split('\n').length);
console.log("Raw logical line indices maps to:");
for(let item of rawLogicalLines) {
    console.log(item.origIndex, ":", JSON.stringify(item.text));
}

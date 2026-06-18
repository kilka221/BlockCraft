import { readFileSync } from "fs";

function mathify(text: string) { return text; }

function getIndent(line: string) {
    const match = line.match(/^(\s*)/);
    const prefix = match ? match[1] : '';
    return prefix.replace(/\t/g, '    ').length;
}

function isCodeLine(line: string) {
    return line.trim() !== '' && !line.trim().startsWith('#');
}

export function parsePythonSourceWhole(code: string) {
    let lines: string[] = [];
    let currentLogicalLine = '';
    let pCount = 0, bCount = 0, cCount = 0;
    
    // Strip comments, being careful about # inside strings
    let inString = false;
    let stringChar = '';
    let processedCode = '';
    
    for (let j = 0; j < code.length; j++) {
        let char = code[j];
        if (inString) {
            if (char === '\\') {
                processedCode += char + code[j+1];
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
            } else if (char === '#') {
                while (j < code.length && code[j] !== '\n') j++;
                if (j < code.length) processedCode += '\n';
                continue;
            }
            processedCode += char;
        }
    }
    
    let rawLines = processedCode.split('\n');
    let inlineStatements: string[] = [];
    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i];
        if (!isCodeLine(line)) continue;
        
        // Handle inline multiple statements
        let r = line;
        while (r.includes(':')) {
            let j = r.indexOf(':');
            let before = r.substring(0, j).trim();
            let after = r.substring(j + 1).trim();
            if (before.startsWith('def') || before.startsWith('if') || before.startsWith('elif') || before.startsWith('else') || before.startsWith('for') || before.startsWith('while') || before.startsWith('try') || before.startsWith('except') || before.startsWith('finally') || before.startsWith('with') || before.startsWith('class') || before.startsWith('match') || before.startsWith('case')) {
                break;
            } else {
                let insideQuotes = false, sq = '', bCnt=0, pCnt=0, cCnt=0;
                let colonValid = true;
                for (let k = 0; k < j; k++) {
                    if (r[k] === '"' || r[k] === "'") {
                        if (!insideQuotes) { insideQuotes = true; sq = r[k]; }
                        else if (sq === r[k]) insideQuotes = false;
                    }
                    if (!insideQuotes) {
                         if (r[k] === '[') bCnt++; else if (r[k] === ']') bCnt--;
                         if (r[k] === '(') pCnt++; else if (r[k] === ')') pCnt--;
                         if (r[k] === '{') cCnt++; else if (r[k] === '}') cCnt--;
                    }
                }
                if (insideQuotes || bCnt>0 || pCnt>0 || cCnt>0) {
                     // colon inside something else
                     r = r.substring(0, j) + '___COLON___' + r.substring(j+1);
                     continue; // keep replacing ___COLON___ later
                } else {
                    let rest = r.substring(j + 1).trim();
                    if (rest !== '') {
                        let indentMatch = r.match(/^(\s*)/);
                        let baseIndent = indentMatch ? indentMatch[1] : '';
                        inlineStatements.push(r.substring(0, j + 1));
                        inlineStatements.push(baseIndent + '    ' + rest);
                        r = ''; // clear rest so we don't process it below
                    } else {
                        break;
                    }
                }
            }
        }
        if (r !== '') {
            inlineStatements.push(r.replace(/___COLON___/g, ':'));
        }
    }
    
    
    for (let i = 0; i < inlineStatements.length; i++) {
        let line = inlineStatements[i];
        
        let inStr2 = false; let sc = '';
        let bC = 0, pC = 0, cC = 0;
        let lastChar = '';
        for (let j = 0; j < line.length; j++) {
            let char = line[j];
            if (inStr2) {
                if (char === '\\') { j++; continue; }
                if (char === sc) inStr2 = false;
            } else {
                if (char === '"' || char === "'") { inStr2 = true; sc = char; }
                else if (char === '[') bC++; else if (char === ']') bC--;
                else if (char === '(') pC++; else if (char === ')') pC--;
                else if (char === '{') cC++; else if (char === '}') cC--;
            }
            if (char.trim() !== '') lastChar = char;
        }

        if (currentLogicalLine === '') currentLogicalLine = line;
        else currentLogicalLine += ' ' + line.trim();

        pCount += pC; bCount += bC; cC += cC;

        if (pCount === 0 && bCount === 0 && cC === 0 && lastChar !== '\\' && !line.trim().endsWith(',')) {
            lines.push(currentLogicalLine);
            currentLogicalLine = '';
            pCount = 0; bCount = 0; cC = 0;
        }
    }
    if (currentLogicalLine !== '') lines.push(currentLogicalLine);

    let idCounter = 1;

    function parseLinesAsBlock(myLines: string[], expectedIndent: number) {
        let i = 0;
        
        function getNext(startIndex: number) {
            for (let j = startIndex; j < myLines.length; j++) {
                if (isCodeLine(myLines[j])) return { index: j, text: myLines[j], indent: getIndent(myLines[j]) };
            }
            return null;
        }

        function getNextIndent(startIndex: number) {
            const res = getNext(startIndex);
            return res ? res.indent : 9999;
        }

        function parseBlockInternal(expIndent: number): any[] {
            let statements: any[] = [];
            while (i < myLines.length) {
                let line = myLines[i];
                if (!isCodeLine(line)) {
                    i++; continue;
                }
                let indent = getIndent(line);
                if (indent < expIndent) break;
                
                let text = line.trim();
                text = text.replace(/:$/, '');
                
                if (text.startsWith('match ')) {
                    let matchVar = text.substring(6).trim();
                    i++;
                    let matchIndent = getNextIndent(i);
                    let matchCases: {condition: string, block: any[]}[] = [];
                    let defaultBlock: any[] = [];
                    
                    while (i < myLines.length) {
                        const skipCheck = getNext(i);
                        if (!skipCheck || skipCheck.indent < matchIndent) break;
                        
                        let peekText = skipCheck.text.trim().replace(/:$/, '');
                        if (peekText.startsWith('case ') && skipCheck.indent === matchIndent) {
                            let caseVal = peekText.substring(5).trim();
                            i = skipCheck.index + 1;
                            let caseBlock = parseBlockInternal(getNextIndent(i));
                            
                            if (caseVal === '_') {
                                defaultBlock = caseBlock;
                            } else {
                                let condStr = caseVal.split('|').map(v => v.trim()).join(', ');
                                matchCases.push({ condition: condStr, block: caseBlock });
                            }
                        } else {
                            i++;
                        }
                    }
                    
                    statements.push({ type: 'match', id: `node-${idCounter++}`, condition: matchVar, cases: matchCases, defaultBlock });
                }
                else {
                    statements.push({ text: text });
                    i++;
                }
            }
            return statements;
        }
        
        return parseBlockInternal(expectedIndent);
    }

    return parseLinesAsBlock(lines, 0);
}

const code = `
match choice:
        case 1:
            val = ui.get_string("Новое название"); item['name'] = val if val else item['name']
        case 2:
            val = ui.get_string("Новый материал"); item['material'] = val if val else item['material']
        case 3:
            val = ui.get_float("Новая длина", min_val=0.001); item['length'] = val if val else item['length']
        case 4:
            val = ui.get_float("Новая ширина", min_val=0.001); item['width'] = val if val else item['width']
        case 5:
            val = ui.get_float("Новая высота", min_val=0.001); item['height'] = val if val else item['height']
        case 6:
            val = ui.get_float("Новый уд. вес", min_val=0.1); item['specific_weight'] = val if val else item['specific_weight']
        case 7:
            val = ui.get_int("Новое кол-во", min_val=0); item['quantity'] = val if val is not None else item['quantity']
        case _:
            ui.print_error("Неверный пункт."); return
`;

console.log(JSON.stringify(parsePythonSourceWhole(code), null, 2));

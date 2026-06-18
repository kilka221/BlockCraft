import { mathify, cleanIoArgs, consolidateBlocks, isSubprogramCall } from './mathify';

export function parseCppSourceWhole(code: string) {
    let cleanCode = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    let pos = 0;
    let idCounter = 1;

    let functions: {name: string, ast: any[]}[] = [];
    let mainBody: any[] = [];

    function skipWhitespace() {
        while(pos < cleanCode.length && /\s/.test(cleanCode[pos])) pos++;
    }

    function matchWord(word: string) {
        skipWhitespace();
        if (cleanCode.startsWith(word, pos)) {
            let nextChar = cleanCode[pos + word.length];
            if (!nextChar || !/[a-zA-Z0-9_]/.test(nextChar)) {
                pos += word.length;
                return true;
            }
        }
        return false;
    }

    function readCondition() {
        skipWhitespace();
        if (cleanCode[pos] !== '(') return '';
        pos++;
        let pCount = 1;
        let start = pos;
        while(pos < cleanCode.length && pCount > 0) {
            if (cleanCode[pos] === '(') pCount++;
            else if (cleanCode[pos] === ')') pCount--;
            pos++;
        }
        return cleanCode.substring(start, pos - 1).trim();
    }

    function readBlockOrStatement(): any[] {
        skipWhitespace();
        if (cleanCode[pos] === '{') {
            pos++;
            let blockStr = readUntilMatchingBrace();
            return parseBlock(blockStr);
        } else {
            // single statement
            let stmtStr = readUntil([';', '}'], true);
            if (cleanCode[pos] === ';') pos++;
            return parseBlock(stmtStr + ';');
        }
    }

    function readUntilMatchingBrace() {
        let bCount = 1;
        let start = pos;
        while(pos < cleanCode.length && bCount > 0) {
            if (cleanCode[pos] === '{') bCount++;
            else if (cleanCode[pos] === '}') bCount--;
            pos++;
        }
        return cleanCode.substring(start, pos - 1);
    }
    
    function readUntil(chars: string[], skipParen = false) {
        let start = pos;
        let pCount = 0;
        while(pos < cleanCode.length) {
            let c = cleanCode[pos];
            if (skipParen) {
                if (c === '(') pCount++;
                else if (c === ')') pCount--;
            }
            if (pCount === 0 && chars.includes(c)) break;
            pos++;
        }
        return cleanCode.substring(start, pos);
    }

    function parseBlock(blockCode: string): any[] {
        let stmts: any[] = [];
        let localPos = 0;

        function lSkipWhitespace() {
            while(localPos < blockCode.length && /\s/.test(blockCode[localPos])) localPos++;
        }
        function lMatchWord(word: string) {
            lSkipWhitespace();
            if (blockCode.startsWith(word, localPos)) {
                let nextChar = blockCode[localPos + word.length];
                if (!nextChar || !/[a-zA-Z0-9_]/.test(nextChar)) {
                    localPos += word.length;
                    return true;
                }
            }
            return false;
        }

        while(localPos < blockCode.length) {
            lSkipWhitespace();
            if (localPos >= blockCode.length) break;

            if (lMatchWord('if')) {
                // read condition
                lSkipWhitespace();
                if (blockCode[localPos] === '(') {
                    localPos++;
                    let pCount = 1;
                    let start = localPos;
                    while(localPos < blockCode.length && pCount > 0) {
                        if (blockCode[localPos] === '(') pCount++;
                        else if (blockCode[localPos] === ')') pCount--;
                        localPos++;
                    }
                    let condition = blockCode.substring(start, localPos - 1).trim();
                    condition = mathify(condition);
                    let trueBlockStr = readBlockOrStmtLocal();
                    let trueBlock = parseBlock(trueBlockStr);
                    let falseBlock: any[] = [];
                    if (lMatchWord('else')) {
                        let falseBlockStr = readBlockOrStmtLocal();
                        falseBlock = parseBlock(falseBlockStr);
                    }
                    stmts.push({ type: 'if', id: `node-${idCounter++}`, condition, trueBlock, falseBlock });
                }
            } else if (lMatchWord('while')) {
                lSkipWhitespace();
                if (blockCode[localPos] === '(') {
                    localPos++;
                    let pCount = 1;
                    let start = localPos;
                    while(localPos < blockCode.length && pCount > 0) {
                        if (blockCode[localPos] === '(') pCount++;
                        else if (blockCode[localPos] === ')') pCount--;
                        localPos++;
                    }
                    let condition = blockCode.substring(start, localPos - 1).trim();
                    condition = mathify(condition);
                    let bodyStr = readBlockOrStmtLocal();
                    let body = parseBlock(bodyStr);
                    stmts.push({ type: 'while', id: `node-${idCounter++}`, condition, body });
                }
            } else if (lMatchWord('for')) {
                lSkipWhitespace();
                if (blockCode[localPos] === '(') {
                    localPos++;
                    let pCount = 1;
                    let start = localPos;
                    while(localPos < blockCode.length && pCount > 0) {
                        if (blockCode[localPos] === '(') pCount++;
                        else if (blockCode[localPos] === ')') pCount--;
                        localPos++;
                    }
                    let forConds = blockCode.substring(start, localPos - 1).trim();
                    let bodyStr = readBlockOrStmtLocal();
                    
                    let parts = forConds.split(';');
                    if (parts.length === 3) {
                        let init = parts[0].trim();
                        let cond = parts[1].trim();
                        let inc = parts[2].trim();
                        
                        let initMatch = init.match(/(?:int|float|double|size_t)?\s*([a-zA-Z0-9_]+)\s*=\s*(.*)/);
                        if (initMatch) {
                            let iterVar = initMatch[1];
                            let startVal = initMatch[2];
                            
                            let condMatch = cond.match(new RegExp(`${iterVar}\\s*(<|<=|>|>=)\\s*(.*)`));
                            let stepMatch = inc.match(new RegExp(`${iterVar}\\s*(\\+\\+|\\-\\-)|(\\+\\+|\\-\\-)\\s*${iterVar}|${iterVar}\\s*\\+=\\s*(.*)|${iterVar}\\s*\\-=\\s*(.*)`));
                            
                            if (condMatch && stepMatch) {
                                let bound = condMatch[2].trim();
                                let step = "1";
                                if (stepMatch[1] === '--' || stepMatch[2] === '--') step = "-1";
                                else if (stepMatch[3]) step = stepMatch[3].trim();
                                else if (stepMatch[4]) step = "-" + stepMatch[4].trim();
                                
                                if (condMatch[1] === '<') bound = `${bound} - 1`;
                                else if (condMatch[1] === '>') bound = `${bound} + 1`;
                                
                                let conditionStr = `${iterVar} = ${mathify(startVal)}(${mathify(step)})${mathify(bound)}`;
                                let body = parseBlock(bodyStr);
                                stmts.push({ type: 'for', id: `node-${idCounter++}`, condition: conditionStr, body });
                                continue;
                            }
                        }
                        
                        // Transform into while loop equivalent if not typical GOST for
                        if (init) {
                            let node = createStatementNode(init);
                            if (node) stmts.push(node);
                        }
                        let body = parseBlock(bodyStr);
                        if (inc) {
                            let node = createStatementNode(inc);
                            if (node) body.push(node);
                        }
                        stmts.push({ type: 'while', id: `node-${idCounter++}`, condition: mathify(cond), body });
                    } else {
                        // fallback
                        let body = parseBlock(bodyStr);
                        stmts.push({ type: 'while', id: `node-${idCounter++}`, condition: mathify(forConds), body });
                    }
                }
            } else if (lMatchWord('switch')) {
                lSkipWhitespace();
                if (blockCode[localPos] === '(') {
                    localPos++;
                    let pCount = 1;
                    let start = localPos;
                    while(localPos < blockCode.length && pCount > 0) {
                        if (blockCode[localPos] === '(') pCount++;
                        else if (blockCode[localPos] === ')') pCount--;
                        localPos++;
                    }
                    let switchVar = blockCode.substring(start, localPos - 1).trim();
                    lSkipWhitespace();
                    if (blockCode[localPos] === '{') {
                        localPos++;
                        let bCount = 1;
                        let switchBodyStart = localPos;
                        while(localPos < blockCode.length && bCount > 0) {
                            if (blockCode[localPos] === '{') bCount++;
                            else if (blockCode[localPos] === '}') bCount--;
                            localPos++;
                        }
                        let switchBody = blockCode.substring(switchBodyStart, localPos - 1);
                        
                        let cases: { condition: string, block: any[] }[] = [];
                        let defaultBlock: any[] = [];
                        let caseRegex = /(?:case\s+([^:]+):|default\s*:)/g;
                        
                        let lastIdx = 0;
                        let lastCond: string | null = null;
                        
                        let matchVal;
                        while ((matchVal = caseRegex.exec(switchBody)) !== null) {
                            if (lastCond !== null) {
                                let blockStr = switchBody.substring(lastIdx, matchVal.index).trim();
                                blockStr = blockStr.replace(/break\s*;$/, '').trim(); 
                                let blockObj = parseBlock(blockStr);
                                if (lastCond === 'default') defaultBlock = blockObj;
                                else cases.push({ condition: lastCond, block: blockObj });
                            }
                            lastCond = matchVal[1] ? matchVal[1].trim() : 'default';
                            lastIdx = matchVal.index + matchVal[0].length;
                        }
                        if (lastCond !== null) {
                            let blockStr = switchBody.substring(lastIdx).trim();
                            blockStr = blockStr.replace(/break\s*;$/, '').trim();
                            let blockObj = parseBlock(blockStr);
                            if (lastCond === 'default') defaultBlock = blockObj;
                            else cases.push({ condition: lastCond, block: blockObj });
                        }
                        
                        stmts.push({ type: 'match', id: `node-${idCounter++}`, condition: switchVar, cases, defaultBlock });
                    }
                }
            } else {
                // Parse generic statement until ;
                let start = localPos;
                let bCount = 0;
                let pCount = 0;
                while(localPos < blockCode.length) {
                    let c = blockCode[localPos];
                    if (c === '{') bCount++;
                    else if (c === '}') bCount--;
                    else if (c === '(') pCount++;
                    else if (c === ')') pCount--;
                    else if (c === ';' && bCount === 0 && pCount === 0) {
                        break;
                    }
                    localPos++;
                }
                let stmtText = blockCode.substring(start, localPos).trim();
                if (blockCode[localPos] === ';') localPos++;
                if (stmtText) {
                    let node = createStatementNode(stmtText);
                    if (node) stmts.push(node);
                }
            }
        }
        return stmts;

        function readBlockOrStmtLocal() {
            lSkipWhitespace();
            if (blockCode[localPos] === '{') {
                localPos++;
                let bCount = 1;
                let start = localPos;
                while(localPos < blockCode.length && bCount > 0) {
                    if (blockCode[localPos] === '{') bCount++;
                    else if (blockCode[localPos] === '}') bCount--;
                    localPos++;
                }
                return blockCode.substring(start, localPos - 1);
            } else {
                let start = localPos;
                if (blockCode.startsWith('if', localPos) || blockCode.startsWith('for', localPos) || blockCode.startsWith('while', localPos)) {
                    // special case for if/for/while without braces
                    // read word
                    let pCount = 0;
                    let bCount = 0;
                    let hasOpenedParen = false;
                    while(localPos < blockCode.length) {
                        let c = blockCode[localPos];
                        if (c === '(') { pCount++; hasOpenedParen = true; localPos++; }
                        else if (c === ')') { pCount--; localPos++; }
                        else if (c === '{') { bCount++; localPos++; }
                        else if (c === '}') { 
                             bCount--; 
                             localPos++;
                             if (bCount === 0) { 
                                 // Look ahead for 'else' to tie it to the same statement
                                 let p = localPos;
                                 while(p < blockCode.length && /\s/.test(blockCode[p])) p++;
                                 if (blockCode.startsWith('else', p)) {
                                     // continue
                                 } else {
                                     break; 
                                 }
                             }
                        }
                        else if (c === ';' && pCount === 0 && bCount === 0) {
                             localPos++;
                             let p = localPos;
                             while(p < blockCode.length && /\s/.test(blockCode[p])) p++;
                             if (blockCode.startsWith('else', p)) {
                                 // continue
                             } else {
                                 break;
                             }
                        }
                        else {
                             localPos++;
                        }
                    }
                    return blockCode.substring(start, localPos);
                } else {
                    let bCount = 0;
                    let pCount = 0;
                    while(localPos < blockCode.length) {
                        let c = blockCode[localPos];
                        if (c === '{') bCount++;
                        else if (c === '}') bCount--;
                        else if (c === '(') pCount++;
                        else if (c === ')') pCount--;
                        else if (c === ';' && bCount === 0 && pCount === 0) {
                            localPos++;
                            break;
                        }
                        localPos++;
                    }
                    return blockCode.substring(start, localPos);
                }
            }
        }
    }

    function createStatementNode(text: string) {
        if (text.startsWith('setlocale')) return null;

        let kind: 'process'|'io'|'subprogram'|'end' = 'process';
        let displayText = text;
        
        if (text.startsWith('union ') || text.startsWith('struct ') || text.startsWith('class ')) {
            kind = 'subprogram';
            displayText = text.replace(/\{[\s\S]*?\}/g, '').replace(/;/g, '').trim(); // Simplify the display text
        } else if (/cin\s*>>/.test(text) || /scanf\s*\(/.test(text)) {
            kind = 'io';
            let vars = text.replace(/cin\s*>>/, '').replace(/;/g, '').trim();
            displayText = `Ввод:\n${vars.replace(/>>/g, ',')}`;
        } else if (/cout\s*<</.test(text) || /printf\s*\(/.test(text)) {
            kind = 'io';
            let args = text.replace(/cout\s*<</, '').replace(/;/g, '').trim();
            // drop strings and endl
            args = args.replace(/"(.*?)"/g, '').replace(/<<\s*endl\b/g, '').replace(/endl\b/g, '').replace(/<</g, ',');
            args = cleanIoArgs(args);
            // replace double commas
            args = args.replace(/,(?:\s*,)+/g, ',').replace(/^[\s,]+|[\s,]+$/g, '');
            if (!args) {
                return null;
            } else {
                displayText = `Вывод:\n${mathify(args)}`;
            }
        } else if (text.startsWith('return ') || text === 'return') {
            kind = 'end';
            let ret = text.substring(6).trim();
            displayText = ret ? `Выход из п/п (${ret})` : `Выход из п/п`;
        } else if (/^[^=()]+\s*\(.*?\)$/.test(text) || /^[^=]+\s*=\s*[^=()]+\s*\(.*?\)$/.test(text)) {
            let chck = text.replace(/^[a-zA-Z0-9_.,\s]+\s*=\s*/, '');
            if (!chck.startsWith('if') && !chck.startsWith('while') && !chck.startsWith('for')) {
                let funcNameMatch = chck.match(/^([a-zA-Z0-9_.:~>-]+)/);
                let funcName = funcNameMatch ? funcNameMatch[1] : '';
                if (funcName && isSubprogramCall(funcName)) {
                    kind = 'subprogram';
                } else {
                    kind = 'process';
                }
            }
            displayText = mathify(text);
        } else {
            displayText = mathify(text);
        }

        return { type: 'stmt', id: `node-${idCounter++}`, text: displayText, kind };
    }

    // Top-level parser
    while(pos < cleanCode.length) {
        skipWhitespace();
        if (pos >= cleanCode.length) break;

        if (cleanCode.startsWith('#', pos) || cleanCode.startsWith('using ', pos)) {
            // skip preprocessor directives
            readUntil(['\n']);
            pos++;
            continue;
        }

        // read function signature
        let start = pos;
        let sig = readUntil(['{', ';']);
        if (cleanCode[pos] === ';') {
            // declaration, skip
            pos++;
            continue;
        } else if (cleanCode[pos] === '{') {
            pos++;
            let blockStr = readUntilMatchingBrace();
            let sigTrim = sig.trim();
            // try to parse name
            let match = sigTrim.match(/([a-zA-Z0-9_]+)\s*\(/);
            let fnName = match ? match[1] : 'Unknown';
            let ast = parseBlock(blockStr);
            if (fnName === 'main') {
                mainBody = ast;
            } else {
                functions.push({ name: fnName, ast });
            }
        }
    }

    mainBody = consolidateBlocks(mainBody);
    for (let f of functions) {
        f.ast = consolidateBlocks(f.ast);
    }

    return { main: mainBody, functions };
}

export function mathify(text: string): string {
    let res = text;
    
    // Support ui.get_yes_no simplification
    if (res.includes('get_yes_no')) {
        let strVal = '';
        const match = res.match(/get_yes_no\s*\(\s*(?:f?["'])(.*?)(?:["'])\s*\)/i);
        if (match) {
            strVal = match[1];
        } else {
            const altMatch = res.match(/get_yes_no\s*\((.*?)\)/i);
            if (altMatch) strVal = altMatch[1];
        }
        
        if (strVal) {
            let cleanStr = strVal.replace(/\{.*?\}/g, '').trim();
            cleanStr = cleanStr.replace(/['"“”]+/g, '').replace(/\s+/g, ' ').trim();
            
            const lower = cleanStr.toLowerCase();
            if (lower.includes('удалить')) {
                return 'Удалить заготовку?';
            }
            if (lower.includes('добавить')) {
                return 'Добавить заготовку?';
            }
            if (lower.includes('очистить')) {
                return 'Очистить базу данных?';
            }
            if (lower.includes('выход') || lower.includes('выйти')) {
                return 'Выйти?';
            }
            if (lower.includes('изменить') || lower.includes('редактировать')) {
                return 'Изменить заготовку?';
            }
            
            cleanStr = cleanStr.replace(/^[вВ]ы точно хотите\s+/, '');
            cleanStr = cleanStr.replace(/^[вВ]ы действительно хотите\s+/, '');
            cleanStr = cleanStr.replace(/^[хХ]отите\s+/, '');
            if (cleanStr.length > 0) {
                if (!cleanStr.endsWith('?')) cleanStr += '?';
                return cleanStr.charAt(0).toUpperCase() + cleanStr.slice(1);
            }
        }
        return 'Подтвердить действие?';
    }

    res = res.replace(/\*\*/g, '^');
    res = res.replace(/!=/g, '≠');
    res = res.replace(/<=/g, '≤');
    res = res.replace(/>=/g, '≥');
    res = res.replace(/==/g, '=');
    
    // Logical mappings
    res = res.replace(/&&/g, ' и ');
    res = res.replace(/\|\|/g, ' или ');
    res = res.replace(/\band\b/g, ' и ');
    res = res.replace(/\bor\b/g, ' или ');
    res = res.replace(/\bis not\b/g, '≠');
    res = res.replace(/\bis\b/g, '=');
    res = res.replace(/\bnot\b/g, 'не ');
    
    // Functions
    res = res.replace(/(?:math\.)?sqrt\((.*?)\)/g, '√($1)');
    res = res.replace(/len\((.*?)\)/g, 'Len($1)');

    return res;
}

export function cleanIoArgs(args: string): string {
    if (args.includes('for ') && args.includes(' in ')) {
        return args;
    }
    
    // Remove end=... and sep=... arguments first
    let argsClean = args.replace(/\b(end|sep)\s*=\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^,)]+)/gi, '');
    argsClean = argsClean.replace(/,\s*,/g, ',').replace(/^\s*,/, '').replace(/,\s*$/, '').trim();

    let extracted: string[] = [];
    
    // Extract variables from python f-strings like f"hello {name:.2f}"
    const fStringRegex = /f(["'])(.*?)\1/gi;
    let match;
    while ((match = fStringRegex.exec(argsClean)) !== null) {
        const inner = match[2];
        const braceRegex = /\{([^}]+)\}/g;
        let bMatch;
        while ((bMatch = braceRegex.exec(inner)) !== null) {
            let varName = bMatch[1].split(':')[0].trim();
            extracted.push(varName);
        }
    }

    let cleaned = argsClean;
    // Remove triple string literals
    cleaned = cleaned.replace(/f?'''[\s\S]*?'''/gi, '');
    cleaned = cleaned.replace(/f?"""[\s\S]*?"""/gi, '');
    // Remove all normal string literals
    cleaned = cleaned.replace(/f?(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/gi, '');
    
    // Clean up left behind empty parameters
    let parts = cleaned.split(',').map(s => s.trim()).filter(s => s !== '');
    parts.push(...extracted);
    
    if (parts.length === 0) {
        // Only strings were present, user wants to completely skip these prints
        return '';
    }
    
    return parts.join(', ');
}

export function consolidateBlocks(nodes: any[]): any[] {
    let res: any[] = [];
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        if (node.type === 'if') {
            node.trueBlock = consolidateBlocks(node.trueBlock);
            node.falseBlock = consolidateBlocks(node.falseBlock);
            res.push(node);
        } else if (node.type === 'match') {
            for (let j = 0; j < node.cases.length; j++) {
                node.cases[j].block = consolidateBlocks(node.cases[j].block);
            }
            if (node.defaultBlock) {
                node.defaultBlock = consolidateBlocks(node.defaultBlock);
            }
            res.push(node);
        } else if (node.type === 'while' || node.type === 'for' || node.type === 'with') {
            node.body = consolidateBlocks(node.body);
            res.push(node);
        } else if (node.type === 'stmt') {
            // merge connected IOs
            if (node.kind === 'io') {
                if (node.text.startsWith('Ввод') || node.text.startsWith('Вывод')) {
                    let ioType = node.text.startsWith('Ввод') ? 'Ввод' : 'Вывод';
                    let vars = [node.text.replace(/^.*?:\s*/, '').replace(/^(Ввод данных|Вывод данных)$/, '').trim()];
                    
                    while (i + 1 < nodes.length) {
                        let next = nodes[i+1];
                        if (next.type === 'stmt' && next.kind === 'io' && (next.text.startsWith('Ввод') || next.text.startsWith('Вывод'))) {
                            let nextIoType = next.text.startsWith('Ввод') ? 'Ввод' : 'Вывод';
                            if (nextIoType === ioType) {
                                let nextVars = next.text.replace(/^.*?:\s*/, '').replace(/^(Ввод данных|Вывод данных)$/, '').trim();
                                if (nextVars) vars.push(nextVars);
                                i++; // consume
                            } else {
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                    vars = vars.filter(v => v);
                    if (vars.length > 0) {
                        node.text = `${ioType}: ${vars.join(', ')}`;
                        res.push(node);
                    } else {
                        node.text = `${ioType} данных`;
                        res.push(node);
                    }
                } else {
                    res.push(node);
                }
            } else {
                res.push(node);
            }
        }
    }
    return res;
}

export function isSubprogramCall(funcName: string, userDeclaredFunctions?: Set<string>): boolean {
    let trimmedName = funcName.trim();
    let hasDot = trimmedName.includes('.');
    
    let name = trimmedName;
    if (name.includes('::')) {
        name = name.split('::').pop() || name;
    }
    if (name.includes('.')) {
        name = name.split('.').pop() || name;
    }
    if (name.includes('->')) {
        name = name.split('->').pop() || name;
    }
    name = name.trim();

    // Builtins, types, and mathematical operations that should be process of variable assignment
    const NOT_SUBPROGRAMS = new Set([
        'int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple', 'len', 'range', 
        'abs', 'round', 'min', 'max', 'sum', 'any', 'all', 'super', 'object', 'type', 'id', 
        'zip', 'enumerate', 'map', 'filter', 'sorted', 'chr', 'ord', 'hex', 'oct', 'bin', 
        'pow', 'sqrt', 'sin', 'cos', 'tan', 'log', 'log10', 'exp', 'double', 'char', 'string',
        'vector', 'fabs', 'ceil', 'floor', 'size', 'length', 'push_back', 'pop_back', 'insert',
        'erase', 'begin', 'end', 'clear', 'empty', 'print', 'input'
    ]);

    const BUILTIN_PYTHON_METHODS = new Set([
        'append', 'extend', 'insert', 'remove', 'pop', 'clear', 'index', 'count', 'sort', 'reverse', 'copy',
        'get', 'items', 'keys', 'values', 'update', 'setdefault',
        'split', 'join', 'strip', 'lstrip', 'rstrip', 'replace', 'find', 'rfind', 'startswith', 'endswith', 'lower', 'upper', 'title', 'format', 'isdigit', 'isalpha', 'isalnum',
        'add', 'discard', 'union', 'intersection', 'difference',
        'write', 'read', 'readline', 'readlines', 'close', 'open'
    ]);

    if (NOT_SUBPROGRAMS.has(name) || BUILTIN_PYTHON_METHODS.has(name)) {
        return false;
    }

    if (userDeclaredFunctions && userDeclaredFunctions.has(name)) {
        return true;
    }

    if (hasDot) {
        return true;
    }

    return true;
}


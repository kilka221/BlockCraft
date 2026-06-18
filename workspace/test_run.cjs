const fs = require('fs');

function test() {
    let source = fs.readFileSync('src/App.tsx', 'utf8');
    
    // Extracted logic from App.tsx
    let code = `
def crafting_analysis(data):
    recipes = {
        "Деревянный ящик": {"Доска": 4, "Брус": 2},
        "Поддон (Палета)": {"Брус": 3, "Доска": 5},
        "Стеллаж": {"Уголок": 4, "Полка": 4}
    }
    
    print("Справочник доступных изделий:")
    for product, reqs in recipes.items():
        req_str = ", ".join([f"{k} ({v} шт.)" for k, v in reqs.items()])
        print(f" - {product}: {req_str}")
        
    print("\\nАнализ вашего склада:")
    for product, reqs in recipes.items():
        max_can_build = float('inf')
        missing_items = []
        
        for req_name, req_qty in reqs.items():
            total_in_stock = sum(item['quantity'] for item in data if req_name.lower() in item['name'].lower())

            if total_in_stock == 0:
                missing_items.append(req_name)
                max_can_build = 0
            else:
                possible = total_in_stock // req_qty
                if possible < max_can_build:
                    max_can_build = possible

        if max_can_build > 0:
            print(f" [+] {product}: можно собрать {max_can_build} шт.")
        else:
            print(f" [-] {product}: собрать нельзя (не хватает: {', '.join(missing_items)})")
        
    print("===================================")
`;

    function mathify(text) { return text.replace(/==/g, '=').replace(/\*\*/g, '^'); }
    function cleanIoArgs(args) { return args.trim() ? "CLEAN" : ""; } // dummy

    let lines = [];
    let currentLogicalLine = '';
    let pCount = 0, bCount = 0, cCount = 0;
    
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
                processedCode += char;
            } else if (char === '#') {
                while (j < code.length && code[j] !== '\n') j++;
                processedCode += '\n';
            } else {
                processedCode += char;
            }
        }
    }

    for (let r of processedCode.split('\n')) {
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
                    inStr = true; strChar = char;
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
                for (let char of stmt) {
                    if (char === '(') pCount++; else if (char === ')') pCount--;
                    if (char === '[') bCount++; else if (char === ']') bCount--;
                    if (char === '{') cCount++; else if (char === '}') cCount--;
                }
                if (currentLogicalLine === '') currentLogicalLine = stmt;
                else currentLogicalLine += ' ' + stmt.trim();
                
                if (pCount <= 0 && bCount <= 0 && cCount <= 0) {
                    pCount = bCount = cCount = 0;
                    lines.push(currentLogicalLine);
                    currentLogicalLine = '';
                }
            }
        } else {
            if (r !== '') {
                for (let char of r) {
                    if (char === '(') pCount++; else if (char === ')') pCount--;
                    if (char === '[') bCount++; else if (char === ']') bCount--;
                    if (char === '{') cCount++; else if (char === '}') cCount--;
                }
                if (currentLogicalLine === '') currentLogicalLine = r;
                else currentLogicalLine += ' ' + r.trim();
                
                if (pCount <= 0 && bCount <= 0 && cCount <= 0) {
                    pCount = bCount = cCount = 0;
                    lines.push(currentLogicalLine);
                    currentLogicalLine = '';
                }
            }
        }
    }
    if (currentLogicalLine !== '') lines.push(currentLogicalLine);

    function getIndent(line) {
        const match = line.match(/^(\s*)/);
        const prefix = match ? match[1] : '';
        return prefix.replace(/\t/g, '    ').length;
    }
    function isCodeLine(line) {
        return line.trim() !== '' && !line.trim().startsWith('#');
    }

    let functionsAst = [];
    let i = 0;
    while (i < lines.length) {
        let line = lines[i];
        if (!isCodeLine(line)) { i++; continue; }
        
        if (line.trim().startsWith('def ')) {
            let match = line.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
            let name = match ? match[1] : 'Function';
            let indent = getIndent(line);
            let funcLines = [];
            i++;
            while (i < lines.length && (getIndent(lines[i]) > indent || !isCodeLine(lines[i]))) {
                funcLines.push(lines[i]);
                i++;
            }
            // Add console layout to view exactly what lines were passed
            console.log("Lines for function", name, funcLines.map(l => l));
        } else i++;
    }
}

test();

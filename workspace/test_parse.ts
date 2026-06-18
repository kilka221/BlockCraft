import fs from 'fs';

// Mock getIndent and parse logic based on App.tsx
function parseSnippet(code: string) {
    let pCount = 0, bCount = 0, cCount = 0;
    let lines: string[] = [];
    let currentLogicalLine = '';
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
            } else {
                processedCode += char;
            }
        }
    }

    for (let r of processedCode.split('\n')) {
        let codePart = r;
        for (let char of codePart) {
            if (char === '(') pCount++; else if (char === ')') pCount--;
            if (char === '[') bCount++; else if (char === ']') bCount--;
            if (char === '{') cCount++; else if (char === '}') cCount--;
        }
        
        if (currentLogicalLine === '') {
            currentLogicalLine = r;
        } else {
            currentLogicalLine += ' ' + r.trim();
        }
        
        if (pCount <= 0 && bCount <= 0 && cCount <= 0) {
            pCount = bCount = cCount = 0;
            lines.push(currentLogicalLine);
            currentLogicalLine = '';
        }
    }
    if (currentLogicalLine !== '') lines.push(currentLogicalLine);
    
    return lines;
}

const snippet = `
def crafting_analysis(data):
    print("\\n===================================")
    print("=== РАСЧЕТ СБОРКИ ИЗДЕЛИЙ ===")
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

console.log(parseSnippet(snippet).join('\n'));

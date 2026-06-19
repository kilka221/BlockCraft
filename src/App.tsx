import React, { useState, useMemo } from 'react';
import { Play, Code, Layout, ArrowRight, Maximize, Minimize } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism.css';

export type ASTNode = 
  | { type: 'stmt', id: string, text: string, kind: 'process'|'io'|'subprogram'|'end', width?: number, leftW?: number, rightW?: number, lineIndex?: number }
  | { type: 'if', id: string, condition: string, trueBlock: ASTNode[], falseBlock: ASTNode[], width?: number, leftW?: number, rightW?: number, lineIndex?: number }
  | { type: 'while', id: string, condition: string, body: ASTNode[], width?: number, leftW?: number, rightW?: number, lineIndex?: number }
  | { type: 'for', id: string, condition: string, body: ASTNode[], width?: number, leftW?: number, rightW?: number, lineIndex?: number }
  | { type: 'match', id: string, condition: string, cases: { condition: string, block: ASTNode[] }[], defaultBlock?: ASTNode[], width?: number, leftW?: number, rightW?: number, lineIndex?: number };

interface FlowNode { id: string; type: string; text: string; x: number; y: number; height?: number; hidden?: boolean; lineIndex?: number; }
interface FlowEdge { id?: string; points?: {x: number, y: number}[]; segments?: {startX: number, startY: number, endX: number, endY: number}[]; label?: string; noArrow?: boolean; labelPos?: {x: number, y: number}; hidden?: boolean; }

const DEFAULT_CODE = `import ui
import data_manager

def add_records(data):
    count = ui.get_int("\
Сколько записей вы хотите добавить?", min_val=1)
    if count is None: return

    for i in range(count):
        print(f"\
=== Ввод данных для заготовки #{i + 1} ===")

        name = ui.get_string("Название заготовки")
        if name is None: return

        material = ui.get_string("Материал")
        if material is None: return

        length = ui.get_float("Длина (в метрах)", min_val=0.001)
        if length is None: return

        width = ui.get_float("Ширина (в метрах)", min_val=0.001)
        if width is None: return

        height = ui.get_float("Высота (в метрах)", min_val=0.001)
        if height is None: return

        specific_weight = ui.get_float("Удельный вес (кг/м³)", min_val=0.1)
        if specific_weight is None: return

        quantity = ui.get_int("Количество на складе (шт)", min_val=0)
        if quantity is None: return

        weight = data_manager.calculate_weight(length, width, height, specific_weight)

        new_record = {
            'id': data_manager.get_next_id(data),
            'name': name,
            'material': material,
            'length': length,
            'width': width,
            'height': height,
            'specific_weight': specific_weight,
            'weight': weight,
            'quantity': quantity
        }
        data.append(new_record)
        ui.print_message("Запись успешно добавлена!")

def edit_record(data):
    ui.display_table(data)
    if not data: return

    target_id = ui.get_int("\
Введите ID записи для редактирования", min_val=1)
    if target_id is None: return

    item = next((row for row in data if row['id'] == target_id), None)
    if not item:
        ui.print_error("Запись с таким ID не найдена.")
        return

    print("\
Какое поле вы хотите изменить?")
    print("1. Название\
2. Материал\
3. Длину\
4. Ширину")
    print("5. Высоту\
6. Удельный вес\
7. Количество")

    choice = ui.get_int("Ваш выбор", min_val=1)
    if choice is None: return

    match choice:
        case 1:
            item['name'] = ui.get_string("Новое название")
        case 2:
            item['material'] = ui.get_string("Новый материал")
        case 3:
            item['length'] = ui.get_float("Новая длина", min_val=0.001)
        case 4:
            item['width'] = ui.get_float("Новая ширина", min_val=0.001)
        case 5:
            item['height'] = ui.get_float("Новая высота", min_val=0.001)
        case 6:
            item['specific_weight'] = ui.get_float("Новый уд. вес", min_val=0.1)
        case 7:
            item['quantity'] = ui.get_int("Новое кол-во", min_val=0)
        case _:
            ui.print_error("Неверный пункт.")
            return

    ui.print_message("Запись успешно обновлена.")

def delete_record(data):
    ui.display_table(data)
    if not data: return

    target_id = ui.get_int("\
Введите ID записи для удаления", min_val=1)
    if target_id is None: return

    for i, item in enumerate(data):
        if item['id'] == target_id:
            deleted = data.pop(i)
            ui.print_message(f"Заготовка '{deleted['name']}' (ID: {target_id}) удалена.")
            return

    ui.print_error("Запись с таким ID не найдена.")

def data_management_menu(data):
    while True:
        print("\
===================================")
        print("=== УПРАВЛЕНИЕ ДАННЫМИ ===")
        print("1. Добавить записи")
        print("2. Редактировать запись")
        print("3. Удалить запись")
        print("0. Вернуться в главное меню")
        print("===================================")

        choice = ui.get_int("Выберите действие", allow_cancel=True)

        match choice:
            case 1:
                add_records(data)
            case 2:
                edit_record(data)
            case 3:
                delete_record(data)
            case 0:
                break
            case _:
                ui.print_error("Неверный выбор.")

def search_and_sort_menu(data):
    if not data:
        ui.print_error("База данных пуста.")
        return

    while True:
        print("\
===================================")
        print("=== ПОИСК И ФИЛЬТРАЦИЯ ===")
        print("1. Поиск по ID, названию или материалу")
        print("2. Фильтрация деталей по материалу")
        print("3. Сортировать по количеству (по убыванию)")
        print("4. Сортировать по массе 1 шт (по убыванию)")
        print("0. Вернуться в главное меню")
        print("===================================")

        choice = ui.get_int("Выберите действие", allow_cancel=True)

        match choice:
            case 1:
                query = ui.get_string("Введите ID или ключевое слово")
                if query:
                    res = [item for item in data if (query.isdigit() and int(query) == item['id']) or query.lower() in item['name'].lower() or query.lower() in item['material'].lower()]
                    if res:
                        ui.display_table(res)
                    else:
                        ui.print_message("Ничего не найдено.")
            case 2:
                mat = ui.get_string("Введите материал для фильтрации")
                if mat:
                    res = [item for item in data if mat.lower() in item['material'].lower()]
                    if res:
                        ui.display_table(res)
                    else:
                        ui.print_message("Детали из такого материала не найдены.")
            case 3:
                sorted_data = sorted(data, key=lambda x: x['quantity'], reverse=True)
                ui.display_table(sorted_data)
            case 4:
                sorted_data = sorted(data, key=lambda x: x['weight'], reverse=True)
                ui.display_table(sorted_data)
            case 0:
                break
            case _:
                ui.print_error("Неверный выбор.")

def process_variant_task(data):
    if not data:
        ui.print_error("База данных пуста.")
        return

    target_name = ui.get_string("\
Название заготовки для транспортировки")
    if target_name is None: return

    max_capacity = ui.get_float("Максимальная грузоподъемность транспорта (кг)", min_val=0.1)
    if max_capacity is None: return

    success, report = data_manager.check_transportation(data, target_name, max_capacity)
    print("\
=== Отчет логистики ===")
    print(report)
    print("===================================")

def crafting_analysis(data):
    print("\
===================================")
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

    print("\
Анализ вашего склада:")
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

def main():
    print("Система складского учета заготовок v3.0")
    db = data_manager.load_data()

    while True:
        print("\
===================================")
        print("=== ГЛАВНОЕ МЕНЮ ===")
        print("1. Просмотр всех записей")
        print("2. Управление данными (Добавить/Изменить/Удалить)")
        print("3. Поиск и фильтрация")
        print("4. Анализ транспортировки")
        print("5. Расчет сборки изделий")
        print("6. Сохранить и выйти")
        print("===================================")

        choice = ui.get_int("Выберите действие (1-6)", allow_cancel=False)

        match choice:
            case 1:
                ui.display_table(db)
            case 2:
                data_management_menu(db)
            case 3:
                search_and_sort_menu(db)
            case 4:
                process_variant_task(db)
            case 5:
                crafting_analysis(db)
            case 6:
                data_manager.save_data(db)
                ui.print_message("Данные сохранены. Работа завершена.")
                break
            case _:
                ui.print_error("Такого пункта меню нет. Попробуйте снова.")

if __name__ == "__main__":
    main()
`;

const DEFAULT_CPP_CODE = "";

interface LogicalLine {
    text: string;
    origIndex: number;
}

function preprocessPythonLines(inputLines: LogicalLine[]): LogicalLine[] {
    function getLineIndent(ln: string) {
        const match = ln.match(/^(\s*)/);
        const prefix = match ? match[1] : '';
        return prefix.replace(/\t/g, '    ').length;
    }

    let outputLines: LogicalLine[] = [];
    let i = 0;
    while (i < inputLines.length) {
        let logical = inputLines[i];
        let line = logical.text;
        let trimmed = line.trim();
        let cleanTrimmed = trimmed.replace(/\s*:\s*$/, '');
        
        if (cleanTrimmed === 'try') {
            let tryIndent = getLineIndent(line);
            i++;
            
            let tryBlockLines: LogicalLine[] = [];
            let firstInnerIndent = -1;
            
            while (i < inputLines.length) {
                let innerLogical = inputLines[i];
                let innerLine = innerLogical.text;
                if (innerLine.trim() === '') {
                    tryBlockLines.push(innerLogical);
                    i++;
                    continue;
                }
                let innerIndent = getLineIndent(innerLine);
                if (innerIndent > tryIndent) {
                    if (firstInnerIndent === -1) {
                        firstInnerIndent = innerIndent;
                    }
                    let shift = firstInnerIndent - tryIndent;
                    let text = innerLine;
                    if (shift > 0) {
                        let newIndent = Math.max(0, innerIndent - shift);
                        text = ' '.repeat(newIndent) + innerLine.trim();
                    }
                    tryBlockLines.push({ text, origIndex: innerLogical.origIndex });
                    i++;
                } else {
                    break;
                }
            }
            
            let processedTryBlock = preprocessPythonLines(tryBlockLines);
            outputLines.push(...processedTryBlock);
            
            while (i < inputLines.length) {
                let peekLogical = inputLines[i];
                let peekLine = peekLogical.text;
                let peekTrimmed = peekLine.trim();
                let peekIndent = getLineIndent(peekLine);
                
                if (peekTrimmed === '') {
                    i++;
                    continue;
                }
                
                let cleanPeek = peekTrimmed.replace(/\s*:\s*$/, '');
                if (peekIndent === tryIndent && (
                    cleanPeek.startsWith('except') || 
                    cleanPeek.startsWith('finally') || 
                    cleanPeek === 'else'
                )) {
                    i++;
                    while (i < inputLines.length) {
                        let innerPeekLogical = inputLines[i];
                        let innerPeek = innerPeekLogical.text;
                        if (innerPeek.trim() === '') {
                            i++;
                            continue;
                        }
                        if (getLineIndent(innerPeek) > tryIndent) {
                            i++;
                        } else {
                            break;
                        }
                    }
                } else {
                    break;
                }
            }
        } else {
            outputLines.push(logical);
            i++;
        }
    }
    return outputLines;
}

export function parsePythonSourceWhole(code: string) {
    let cleanedCode = code.replace(/"""[\s\S]*?"""/g, (match) => {
        return match.split('\n').map(() => '').join('\n');
    });
    cleanedCode = cleanedCode.replace(/'''[\s\S]*?'''/g, (match) => {
        return match.split('\n').map(() => '').join('\n');
    });

    let rawLogicalLines: LogicalLine[] = [];
    let currentLogicalLine = '';
    let currentLogicalLineIndex: number | undefined = undefined;
    let pCount = 0, bCount = 0, cCount = 0;
    
    // Strip comments, being careful about # inside strings
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
                // skip until newline
                while (j < cleanedCode.length && cleanedCode[j] !== '\n') {
                    j++;
                }
                processedCode += '\n';
            } else {
                processedCode += char;
            }
        }
    }

    let processedLines = processedCode.split('\n');
    for (let idx = 0; idx < processedLines.length; idx++) {
        let r = processedLines[idx];
        // Find if line has a block keyword followed by colon and then more stuff
        let match = r.match(/^(\s*)(if\s+.*|elif\s+.*|else|while\s+.*|for\s+.*|case\s+.*|match\s+.*|def\s+.*)$/);
        // We will just do a simple char-by-char split on colons outside strings
        let inlineStatements: string[] = [];
        let inStr = false;
        let strChar = '';
        let lastSplit = 0;
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
                    // Check if there is something after colon
                    let rest = r.substring(j + 1).trim();
                    if (rest !== '') {
                        let indentMatch = r.match(/^(\s*)/);
                        let baseIndent = indentMatch ? indentMatch[1] : '';
                        inlineStatements.push(r.substring(0, j + 1));
                        inlineStatements.push(baseIndent + '    ' + rest);
                        r = ''; // clear rest so we don't process it below
                        break;
                    }
                }
            }
        }
        
        if (inlineStatements.length > 0) {
            for (let stmt of inlineStatements) {
                if (stmt.trim() !== '') {
                    rawLogicalLines.push({ text: stmt, origIndex: idx });
                }
            }
            continue;
        }

        let codePart = r;
        
        let noStrCodePart = '';
        let inTempStr = false;
        let tempStrChar = '';
        for (let j = 0; j < codePart.length; j++) {
            let char = codePart[j];
            if (inTempStr) {
                if (char === '\\') j++;
                else if (char === tempStrChar) inTempStr = false;
            } else {
                if (char === '"' || char === "'") {
                    inTempStr = true;
                    tempStrChar = char;
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
        
        if (currentLogicalLine === '') {
            currentLogicalLine = r;
            currentLogicalLineIndex = idx;
        } else {
            currentLogicalLine += ' ' + r.trim();
        }
        
        if (pCount <= 0 && bCount <= 0 && cCount <= 0) {
            // Reset negative counts just in case
            pCount = bCount = cCount = 0;
            rawLogicalLines.push({ text: currentLogicalLine, origIndex: currentLogicalLineIndex !== undefined ? currentLogicalLineIndex : idx });
            currentLogicalLine = '';
            currentLogicalLineIndex = undefined;
        }
    }
    if (currentLogicalLine !== '') {
        rawLogicalLines.push({ text: currentLogicalLine, origIndex: currentLogicalLineIndex !== undefined ? currentLogicalLineIndex : processedLines.length - 1 });
    }

    let processedLogicalLines = preprocessPythonLines(rawLogicalLines);
    let lines = processedLogicalLines.map(l => l.text);
    let logicalLineIndices = processedLogicalLines.map(l => l.origIndex);

    let functionsAst: {name: string, ast: ASTNode[]}[] = [];
    
    function getIndent(line: string) {
        const match = line.match(/^(\s*)/);
        const prefix = match ? match[1] : '';
        return prefix.replace(/\t/g, '    ').length;
    }

    function isCodeLine(line: string) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) return false;
        
        const normalized = trimmed.replace(/^[frFR]/, '');
        if ((normalized.startsWith('"""') && normalized.endsWith('"""')) ||
            (normalized.startsWith("'''") && normalized.endsWith("'''")) ||
            (normalized.startsWith('"') && normalized.endsWith('"')) ||
            (normalized.startsWith("'") && normalized.endsWith("'"))) {
            return false;
        }
        return true;
    }

    let i = 0;
    let mainCodeLines: {line: string, index: number}[] = [];
    let idCounter = 1;

    function parseLinesAsBlock(myLines: string[], expectedIndent: number, currentFuncName?: string, myLinesIndices?: number[]) {
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

        function parseElifsAndElse(baseIndent: number): ASTNode[] {
            const peekLine = getNext(i);
            if (!peekLine || peekLine.indent !== baseIndent) return [];
            
            let text = peekLine.text.trim();
            if (text.startsWith('else:')) {
                i = peekLine.index + 1;
                return parseBlockInternal(getNextIndent(i));
            } else if (text.startsWith('elif ')) {
                let condition = text.substring(5).replace(/:$/, '').trim();
                let matchingIndex = myLinesIndices ? myLinesIndices[peekLine.index] : undefined;
                i = peekLine.index + 1;
                let trueBlock = parseBlockInternal(getNextIndent(i));
                let falseBlock = parseElifsAndElse(baseIndent);
                return [{ type: 'if', id: `node-${idCounter++}`, condition, trueBlock, falseBlock, lineIndex: matchingIndex }];
            }
            return [];
        }

        function parseBlockInternal(expIndent: number): ASTNode[] {
            let statements: ASTNode[] = [];
            while (i < myLines.length) {
                let line = myLines[i];
                if (!isCodeLine(line)) {
                    i++; continue;
                }
                let indent = getIndent(line);
                if (indent < expIndent) break;
                
                let text = line.trim();
                text = text.replace(/:$/, '');
                
                if (text === 'else' || text === 'else:') {
                    i++; continue; 
                }
                
                if (text.startsWith('import ') || text.startsWith('from ')) {
                    i++; continue;
                }
                
                let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                console.log("Block line: ", text, matchingIndex);

                if (text.startsWith('if ')) {
                    let condition = text.substring(3).trim();
                    condition = mathify(condition);
                    let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                    i++;
                    let trueBlock = parseBlockInternal(getNextIndent(i));
                    let falseBlock = parseElifsAndElse(indent);
                    statements.push({ type: 'if', id: `node-${idCounter++}`, condition, trueBlock, falseBlock, lineIndex: matchingIndex });
                } 
                else if (text.startsWith('while ') || text.startsWith('for ')) {
                    let isFor = text.startsWith('for ');
                    let condition = isFor ? text.substring(4).trim() : text.substring(6).trim();
                    
                    if (isFor) {
                        let rangeMatch = condition.match(/([a-zA-Z0-9_]+)\s+in\s+range\((.*?)\)/);
                        let enumMatch = condition.match(/^([a-zA-Z0-9_,\s]+)\s+in\s+enumerate\((.*?)\)$/);
                        let inMatch = condition.match(/^([a-zA-Z0-9_,\s]+)\s+in\s+(.*?)$/);
                        
                        if (rangeMatch) {
                            let args = rangeMatch[2].split(',').map(s => s.trim());
                            if (args.length === 1) condition = `${rangeMatch[1]} = 0(1)${mathify(args[0])}`;
                            else if (args.length === 2) condition = `${rangeMatch[1]} = ${mathify(args[0])}(1)${mathify(args[1])}`;
                            else if (args.length === 3) condition = `${rangeMatch[1]} = ${mathify(args[0])}(${mathify(args[2])})${mathify(args[1])}`;
                        } else if (enumMatch) {
                            condition = `Для каждого ${enumMatch[1].trim()} в ${mathify(enumMatch[2].trim())} с нумерацией`;
                        } else if (inMatch) {
                            condition = `Для каждого ${inMatch[1].trim()} в ${mathify(inMatch[2].trim())}`;
                        } else {
                            condition = mathify(condition);
                        }
                    } else {
                        condition = mathify(condition);
                    }
                    
                    let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                    i++;
                    let body = parseBlockInternal(getNextIndent(i));
                    if (isFor) {
                        statements.push({ type: 'for', id: `node-${idCounter++}`, condition, body, lineIndex: matchingIndex });
                    } else {
                        statements.push({ type: 'while', id: `node-${idCounter++}`, condition, body, lineIndex: matchingIndex });
                    }
                }
                else if (text.startsWith('match ')) {
                    let matchVar = text.substring(6).trim().replace(/:$/, '');
                    let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                    i++;
                    let matchIndent = getNextIndent(i);
                    let matchCases: {condition: string, block: ASTNode[]}[] = [];
                    let defaultBlock: ASTNode[] = [];
                    
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
                    
                    statements.push({ type: 'match', id: `node-${idCounter++}`, condition: matchVar, cases: matchCases, defaultBlock, lineIndex: matchingIndex });
                }
                else {
                    let kind: 'process' | 'io' | 'subprogram' | 'end' = 'process';
                    let displayText = text;

                    if (text.includes('open(')) {
                        const openMatch = text.match(/open\s*\(\s*([^,\s)]+)/);
                        let filename = openMatch ? openMatch[1].trim() : 'файл';
                        filename = filename.replace(/^['"]|['"]$/g, '');
                        
                        const isWrite = /mode\s*=\s*['"][wa]/.test(text) || /['"][wa]['"]/.test(text);
                        if (isWrite) {
                            kind = 'io';
                            displayText = `Открыть файл ${filename} для записи`;
                        } else {
                            kind = 'process';
                            displayText = `Открыть файл ${filename} для чтения`;
                        }
                    } else if (text.includes('.write(') || text.includes('writer.writerow') || text.includes('writer.writerows')) {
                        kind = 'io';
                        displayText = `Запись в файл`;
                        const writeMatch = text.match(/\.write\s*\((.*?)\)/);
                        if (writeMatch) {
                            displayText = `Записать в файл: ${mathify(writeMatch[1].trim())}`;
                        }
                    } else if (text.includes('.read(') || text.includes('.readline(') || text.includes('.readlines(') || text.includes('csv.reader(') || text.includes('json.load(')) {
                        kind = 'io';
                        if (text.includes('csv.reader(')) {
                            displayText = `Чтение CSV данных`;
                        } else if (text.includes('json.load(')) {
                            displayText = `Чтение JSON данных`;
                        } else {
                            displayText = `Чтение данных из файла`;
                        }
                    } else if (/input\s*\(/.test(text)) {
                        kind = 'io';
                        let match = text.match(/^([a-zA-Z0-9_]+)\s*=\s*(?:[a-zA-Z0-9_]*\s*\(\s*)?input/);
                        if (match) {
                             displayText = `Ввод:\n${match[1]}`;
                        } else {
                             displayText = `Ввод данных`;
                        }
                    } else if (/print\s*\(/.test(text)) {
                        kind = 'io';
                        let match = text.match(/^print\s*\((.*?)\)$/);
                        if (match) {
                             if (match[1].trim() === '') {
                                 i++; continue;
                             }
                             let argsCleaned = cleanIoArgs(match[1]);
                             if (!argsCleaned) { i++; continue; }
                             displayText = `Вывод: ${mathify(argsCleaned)}`;
                        } else {
                             displayText = `Вывод данных`;
                        }
                    } else if (text.startsWith('return ') || text === 'return') {
                        let retVal = text.substring(6).trim();
                        let isComplex = retVal !== '' && (retVal.includes('for') || retVal.includes('max(') || retVal.includes('sum(') || retVal.includes('any(') || retVal.includes('all(') || retVal.includes('len(') || retVal.length > 20);
                        if (isComplex && currentFuncName) {
                            let processText = '';
                            if (currentFuncName === 'get_next_id') {
                                processText = 'Присвоить next_id значение: максимальный id из всех элементов data, увеличенный на 1';
                            } else {
                                processText = `Присвоить возвращаемое значение: ${translatePythonLine(retVal)}`;
                            }
                            let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                            statements.push({ type: 'stmt', id: `node-${idCounter++}`, text: processText, kind: 'process', lineIndex: matchingIndex });
                            
                            kind = 'end';
                            displayText = 'return';
                        } else {
                            kind = 'end';
                            if (retVal) {
                                displayText = `Возврат: ${retVal}`;
                            } else {
                                displayText = `Возврат`;
                            }
                        }
                    } else {
                        // First see if it's a comprehension / generator we can translate
                        let translatedRightObj = translatePythonLine(text);
                        let isTranslated = translatedRightObj !== text;
                        let textContainsEq = text.includes('=');
                        let leftSide = '';
                        let rightSide = text;
                        if (textContainsEq) {
                            let parts = text.split('=');
                            leftSide = parts[0].trim();
                            rightSide = parts.slice(1).join('=').trim();
                        }
                        
                        let wholeLineTranslated = isTranslated;
                        if (!isTranslated) {
                            translatedRightObj = translatePythonLine(rightSide);
                            isTranslated = translatedRightObj !== rightSide;
                        }

                        if (isTranslated) {
                            if (wholeLineTranslated) {
                                displayText = mathify(translatedRightObj);
                            } else if (textContainsEq) {
                                displayText = `${leftSide} = ${mathify(translatedRightObj)}`;
                            } else {
                                displayText = mathify(translatedRightObj);
                            }
                        } else if (/^[^=()]+\s*\(.*?\)$/.test(text) || /^[^=]+\s*=\s*[^=()]+\s*\(.*?\)$/.test(text)) {
                            let matchArg = text.match(/^([^=]+=\s*)?([^=()]+)\s*\((.*?)\)$/);
                            let prefix = '';
                            let funcName = '';
                            let args = '';
                            if (matchArg) {
                                prefix = matchArg[1] || '';
                                funcName = matchArg[2].trim();
                                args = matchArg[3];
                            }
                            
                            if (matchArg && isSubprogramCall(funcName)) {
                                kind = 'subprogram';
                                let cleanedArgs = cleanIoArgs(args);
                                displayText = mathify(`${prefix}${funcName}(${cleanedArgs})`);
                            } else {
                                kind = 'process';
                                if (matchArg) {
                                    let cleanedArgs = cleanIoArgs(args);
                                    displayText = mathify(`${prefix}${funcName}(${cleanedArgs})`);
                                } else {
                                    displayText = mathify(text);
                                }
                            }
                        } else if (textContainsEq) {
                            let left = leftSide;
                            let right = rightSide;
                            if (left && right) {
                                if (right === '[]' || right === 'list()') {
                                    displayText = `Создание пустого списка\n${left}`;
                                } else if (right === '{}' || right === 'dict()') {
                                    displayText = `Создание пустого словаря\n${left}`;
                                } else if (right === 'set()') {
                                    displayText = `Создание пустого множества\n${left}`;
                                } else if (right === '""' || right === "''" || right === 'str()') {
                                    displayText = `Создание пустой строки\n${left}`;
                                } else if ((right.startsWith('{') && right.endsWith('}')) && right.length > 20) {
                                    displayText = `Заполнение словаря ${left}`;
                                } else if (right.startsWith('[') && right.endsWith(']') && right.length > 20) {
                                    displayText = `Заполнение списка ${left}`;
                                } else {
                                    right = right.replace(/\[(.*?)\]/g, (match, inner) => {
                                        let items = inner.split(',').map((s: string) => s.trim());
                                        if (items.length > 4) {
                                             return `[${items[0]}, ${items[1]}, ..., ${items[items.length-1]}]`;
                                        }
                                        return match;
                                    });
                                    displayText = `${left} = ${mathify(right)}`;
                                }
                            } else {
                                displayText = mathify(text);
                            }
                        } else {
                            displayText = mathify(text);
                        }
                    }

                    let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                    if (text === 'pass' || text === 'continue' || text === 'break') {
                        statements.push({ type: 'stmt', id: `node-${idCounter++}`, text, kind: 'process', lineIndex: matchingIndex });
                    } else {
                        statements.push({ type: 'stmt', id: `node-${idCounter++}`, text: displayText, kind, lineIndex: matchingIndex });
                    }
                    i++;
                }
            }
            return statements;
        }
        
        return parseBlockInternal(expectedIndent);
    }

    while (i < lines.length) {
        let line = lines[i];
        if (!isCodeLine(line)) { i++; continue; }
        
        let indent = getIndent(line);
        if (indent === 0 && line.trim().startsWith('def ')) {
            let funcNameMatch = line.trim().match(/def\s+([a-zA-Z0-9_]+)\s*\((.*?)\)/);
            let funcName = funcNameMatch ? `${funcNameMatch[1]}(${funcNameMatch[2]})` : 'func';
            
            let funcLines = [];
            let funcLinesIndices = [];
            i++;
            while (i < lines.length) {
                if (!isCodeLine(lines[i])) {
                    funcLines.push(lines[i]);
                    funcLinesIndices.push(logicalLineIndices[i]);
                    i++;
                    continue;
                }
                if (getIndent(lines[i]) === 0) break;
                funcLines.push(lines[i]);
                funcLinesIndices.push(logicalLineIndices[i]);
                i++;
            }
            
            let firstCode = funcLines.find(l => isCodeLine(l));
            let expectedIdent = firstCode ? getIndent(firstCode) : 4;
            let funcSimpleName = funcNameMatch ? funcNameMatch[1] : 'func';
            let ast = parseLinesAsBlock(funcLines, expectedIdent, funcSimpleName, funcLinesIndices);
            functionsAst.push({ name: funcName, ast });
        } else {
            mainCodeLines.push({line, index: logicalLineIndices[i]});
            i++;
        }
    }
    
    let mainAst = mainCodeLines.length > 0 ? parseLinesAsBlock(mainCodeLines.map(v=>v.line), 0, undefined, mainCodeLines.map(v=>v.index)) : [];
    
    mainAst = consolidateBlocks(mainAst);
    for (let f of functionsAst) {
        f.ast = consolidateBlocks(f.ast);
    }
    
    return { main: mainAst, functions: functionsAst };
}

function orthogonalRoute(p1: {x:number, y:number}, p2: {x:number, y:number}) {
    if (Math.abs(p1.x - p2.x) < 1 && Math.abs(p1.y - p2.y) < 1) return [p1, p2];
    if (Math.abs(p1.x - p2.x) < 1) return [p1, p2];
    if (Math.abs(p1.y - p2.y) < 1) return [p1, p2];
    let midY = Math.max(p1.y, p2.y) - 20;
    if (p1.y < p2.y - 40) midY = (p1.y + p2.y) / 2;
    return [p1, {x: p1.x, y: midY}, {x: p2.x, y: midY}, p2];
}

import { parseCppSourceWhole } from './parseCpp';
import { mathify, cleanIoArgs, consolidateBlocks, isSubprogramCall } from './mathify';
import { translatePythonLine } from './translate';

export function buildGraphs(code: string, language: string, activeOverrides: any = {}) {
    const parsed = language === 'cpp' ? parseCppSourceWhole(code) : parsePythonSourceWhole(code);
    let graphs = [];
    let idx = 0;
    if (parsed.main.length > 0) {
        graphs.push(buildGraphForAst(parsed.main, 'Main', true, activeOverrides[idx] || {}));
        idx++;
    }
    for (let f of parsed.functions) {
        graphs.push(buildGraphForAst(f.ast, f.name, false, activeOverrides[idx] || {}));
        idx++;
    }
    return graphs;
}

function buildGraphForAst(ast: ASTNode[], title: string, isMain: boolean, graphOverrides: any = {}) {
    const NODE_WIDTH = 220;
    const X_SEP = 60;
    const Y_MARGIN = 20;
    const cleanTitle = isMain ? '' : title.split('(')[0].trim();

    function getASTNodeHeight(node: ASTNode | undefined): number {
        if (!node) return 64;
        let t = node.type === 'stmt' ? node.text : node.condition;
        
        if (graphOverrides?.nodes?.[node.id]?.text !== undefined) {
             t = graphOverrides.nodes[node.id].text;
        } else {
            if (node.type === 'stmt' && node.kind === 'end') {
                if (isMain) t = 'Конец';
                else {
                    t = `Выход из п/п\n${cleanTitle}`;
                }
            }
        }
        let shapeType = node.type === 'stmt' ? node.kind : (node.type === 'while' ? 'decision' : (node.type === 'for' ? 'loop' : 'decision'));
        return getNodeHeight(t, shapeType);
    }
    
    function yStep(n1: ASTNode | undefined, n2: ASTNode | undefined) {
        return getASTNodeHeight(n1)/2 + Y_MARGIN + getASTNodeHeight(n2)/2;
    }

    function blockTerminates(nodes: ASTNode[]): boolean {
        for (let node of nodes) {
            if (node.type === 'stmt' && (node.kind === 'end' || node.text === 'continue' || node.text === 'break')) {
                return true;
            }
            if (node.type === 'if') {
                if (blockTerminates(node.trueBlock) && blockTerminates(node.falseBlock)) {
                    return true;
                }
            }
        }
        return false;
    }

    function computeWidthsMulti(nodes: ASTNode[]) {
        for (let node of nodes) {
            if (node.type === 'stmt') {
                node.leftW = NODE_WIDTH/2;
                node.rightW = NODE_WIDTH/2;
                node.width = NODE_WIDTH + X_SEP;
            } else if (node.type === 'if') {
                computeWidthsMulti(node.trueBlock);
                computeWidthsMulti(node.falseBlock);
                let trueLeftW = 0, trueRightW = 0;
                let falseLeftW = 0, falseRightW = 0;
                if (node.trueBlock.length > 0) {
                    trueLeftW = Math.max(...node.trueBlock.map(n => n.leftW!));
                    trueRightW = Math.max(...node.trueBlock.map(n => n.rightW!));
                }
                if (node.falseBlock.length > 0) {
                    falseLeftW = Math.max(...node.falseBlock.map(n => n.leftW!));
                    falseRightW = Math.max(...node.falseBlock.map(n => n.rightW!));
                }
                let margin = 15;
                let trueShift = trueLeftW + margin;
                let falseShift = falseRightW + margin;
                
                let trueTerm = blockTerminates(node.trueBlock);
                let falseTerm = blockTerminates(node.falseBlock);

                if (!trueTerm && !falseTerm) {
                    let shift = Math.max(trueLeftW + margin, falseRightW + margin);
                    trueShift = shift;
                    falseShift = shift;
                } else {
                    if (trueTerm) {
                        trueShift = trueLeftW + 45;
                    }
                    if (falseTerm) {
                        falseShift = falseRightW + 45;
                    }
                }
                
                (node as any).trueShift = trueShift;
                (node as any).falseShift = falseShift;
                
                node.leftW = Math.max(NODE_WIDTH/2, falseShift + falseLeftW);
                node.rightW = Math.max(NODE_WIDTH/2, trueShift + trueRightW);
                node.width = node.leftW + node.rightW;
            } else if (node.type === 'while' || node.type === 'for') {
                computeWidthsMulti(node.body);
                let bodyLeftW = 0;
                let bodyRightW = 0;
                if (node.body.length > 0) {
                    bodyLeftW = Math.max(...node.body.map(n => n.leftW!));
                    bodyRightW = Math.max(...node.body.map(n => n.rightW!));
                }
                node.leftW = Math.max(NODE_WIDTH/2 + X_SEP, bodyLeftW + X_SEP);
                node.rightW = Math.max(NODE_WIDTH/2 + X_SEP, bodyRightW + X_SEP);
                node.width = node.leftW + node.rightW;
            } else if (node.type === 'match') {
                let currentPos = 0;
                let casesPositions: number[] = [];
                let branchWidths: {left: number, right: number}[] = [];
                
                for (let i = 0; i < node.cases.length; i++) {
                    const c = node.cases[i];
                    computeWidthsMulti(c.block);
                    let cLeft = c.block.length > 0 ? Math.max(...c.block.map(n => n.leftW!)) : NODE_WIDTH/2;
                    let cRight = c.block.length > 0 ? Math.max(...c.block.map(n => n.rightW!)) : NODE_WIDTH/2;
                    branchWidths.push({left: cLeft, right: cRight});
                }
                
                let defaultLeft = NODE_WIDTH/2;
                let defaultRight = NODE_WIDTH/2;
                if (node.defaultBlock && node.defaultBlock.length > 0) {
                    computeWidthsMulti(node.defaultBlock);
                    defaultLeft = Math.max(...node.defaultBlock.map(n => n.leftW!));
                    defaultRight = Math.max(...node.defaultBlock.map(n => n.rightW!));
                }
                
                // Calculate total width of all branches laid out side by side
                let totalWidth = 0;
                for (let i = 0; i < branchWidths.length; i++) {
                    totalWidth += (i > 0 ? X_SEP : 0) + branchWidths[i].left + branchWidths[i].right;
                }
                totalWidth += X_SEP + defaultLeft + defaultRight;
                
                let startX = -totalWidth / 2; // Center around 0
                let currentX = startX;
                
                let casesShifts: number[] = [];
                for (let i = 0; i < branchWidths.length; i++) {
                    casesShifts.push(currentX + branchWidths[i].left);
                    currentX += branchWidths[i].left + branchWidths[i].right + X_SEP;
                }
                let defaultShift = currentX + defaultLeft;
                
                let minShift = casesShifts.length > 0 ? casesShifts[0] - branchWidths[0].left : defaultShift - defaultLeft;
                let maxShift = defaultShift + defaultRight;
                
                (node as any).casesShifts = casesShifts;
                (node as any).defaultShift = defaultShift;
                
                node.leftW = Math.max(NODE_WIDTH/2 + X_SEP, -minShift);
                node.rightW = Math.max(NODE_WIDTH/2 + X_SEP, maxShift);
                node.width = node.leftW + node.rightW;
            }
        }
    }
    
    computeWidthsMulti(ast);

    let allNodes: FlowNode[] = [];
    let allEdges: FlowEdge[] = [];
    
    let jumpCounter = 'A'.charCodeAt(0);
    let globalColumnStartY = 60;
    let usedReturnX: number[] = [];

    function estimateHeight(nodes: ASTNode[]): number {
        let h = 0;
        for (let n of nodes) {
            let nodeH = getASTNodeHeight(n);
            if (n.type === 'if') {
                 h += nodeH + 20 + Math.max(estimateHeight(n.trueBlock), estimateHeight(n.falseBlock)) + 40;
            } else if (n.type === 'while' || n.type === 'for') {
                 h += nodeH + 20 + estimateHeight(n.body) + 60;
            } else if (n.type === 'match') {
                 let maxC = 0;
                 if (n.cases) {
                     for (let c of n.cases) maxC = Math.max(maxC, estimateHeight(c.block));
                 }
                 if (n.defaultBlock) maxC = Math.max(maxC, estimateHeight(n.defaultBlock));
                 h += nodeH + 20 + maxC + 80;
            } else {
                 h += nodeH + 20;
            }
        }
        return h;
    }

    function layout(nodes: ASTNode[], cx: number, cy: number, incomingPoints: {x:number, y:number, from?:any, label?:string, labelPos?: {x:number,y:number}, limitX?: number}[], isRoot: boolean = false, loopBreaks: any[] = [], loopContinues: any[] = []): { endPoints: {x:number, y:number, from?:any, label?:string, labelPos?: {x:number,y:number}, limitX?: number}[], finalY: number, endCx: number } {
        let currentY = cy;
        let inPts = incomingPoints;
        let maxReachedY = cy;
        
        const PAGE_LAYOUT_H = 1200;
        
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const h = getASTNodeHeight(node);
            const nextNode = i + 1 < nodes.length ? nodes[i+1] : undefined;
            const nextH = nextNode ? getASTNodeHeight(nextNode) : 0;

            let pageIndex = Math.floor(currentY / PAGE_LAYOUT_H);
            let pageRemaining = (pageIndex + 1) * PAGE_LAYOUT_H - currentY;
            
            let forcedPushNext = false;
            // To ensure every page has at least 2 blocks ("на одной странице должно быть минимум 2 блока"),
            // when we are at the second-to-last node of a sequence, if the very last node will not fit
            // on the current page, we proactively push this second-to-last node to the next page now.
            if (i === nodes.length - 2 && nextNode) {
                let nodeBottom = currentY + h/2;
                let nextNodeTopY = nodeBottom + Y_MARGIN;
                let nextNodePageRemaining = (pageIndex + 1) * PAGE_LAYOUT_H - nextNodeTopY;
                if (nextNodeTopY >= (pageIndex + 1) * PAGE_LAYOUT_H || nextH > nextNodePageRemaining - 60) {
                    currentY = (pageIndex + 1) * PAGE_LAYOUT_H + 60 + h/2;
                    pageIndex = Math.floor(currentY / PAGE_LAYOUT_H);
                    pageRemaining = (pageIndex + 1) * PAGE_LAYOUT_H - currentY;
                    forcedPushNext = true;
                }
            }

            if (!forcedPushNext) {
                // if even the node shape itself doesn't fit, push it to next page
                if (h > pageRemaining - 60) {
                    currentY = (pageIndex + 1) * PAGE_LAYOUT_H + 60 + h/2;
                    pageIndex = Math.floor(currentY / PAGE_LAYOUT_H);
                    pageRemaining = (pageIndex + 1) * PAGE_LAYOUT_H - currentY;
                } else {
                    let pageIndex_top = Math.floor((currentY - h/2) / PAGE_LAYOUT_H);
                    if (pageIndex !== pageIndex_top) {
                        currentY = pageIndex * PAGE_LAYOUT_H + 60 + h/2;
                        pageIndex = Math.floor(currentY / PAGE_LAYOUT_H);
                        pageRemaining = (pageIndex + 1) * PAGE_LAYOUT_H - currentY;
                    }
                }
            }
            
            // if the block as a whole doesn't fit and it's large, consider pushing it completely to the next page
            const isComplex = ['if', 'while', 'for', 'match'].includes(node.type);
            if (isComplex) {
                let estH = estimateHeight([node]);
                // If it doesn't fit, but we are near the bottom of the page (e.g. less than 450px left), 
                // OR it's a huge block but we'd rather it starts clean.
                if (estH > pageRemaining && pageRemaining < 450) {
                    currentY = (pageIndex + 1) * PAGE_LAYOUT_H + 60 + h/2;
                }
            }

            maxReachedY = Math.max(maxReachedY, currentY);

            if (inPts.length > 0) {
                const targetPoint = { x: cx, y: currentY - h/2 };
                const mergeY = targetPoint.y - 20;

                let incomingLabel: string | undefined = undefined;
                let incomingLabelPos: { x: number, y: number } | undefined = undefined;
                let hasZeroLengthForLabel = false;

                for (const p of inPts) {
                    if (p.label) {
                        incomingLabel = p.label;
                        incomingLabelPos = p.labelPos;
                        if (p.from && Math.abs(p.from.y - mergeY) < 1) {
                            hasZeroLengthForLabel = true;
                        }
                    }
                    if (p.from) {
                        const px = (p as any).limitX || p.x;
                        allEdges.push({ 
                            points: [p.from, {x: px, y: p.from.y}, {x: px, y: mergeY}, {x: cx, y: mergeY}], 
                            label: p.label, 
                            labelPos: p.labelPos,
                            noArrow: true 
                        });
                    } else {
                        if (Math.abs(p.x - cx) < 1) {
                            allEdges.push({ points: [p, {x: cx, y: mergeY}], noArrow: true });
                        } else {
                            allEdges.push({ points: [p, {x: p.x, y: mergeY}, {x: cx, y: mergeY}], noArrow: true });
                        }
                    }
                }
                
                allEdges.push({ 
                    points: [{x: cx, y: mergeY}, targetPoint],
                    label: hasZeroLengthForLabel ? incomingLabel : undefined,
                    labelPos: hasZeroLengthForLabel ? (incomingLabelPos || { x: cx + 12, y: mergeY + 12 }) : undefined
                });
                inPts = [];
            }
            
            if (node.type === 'stmt') {
                let adjustedText = node.text;
                if (node.kind === 'end') {
                    if (isMain) {
                        adjustedText = 'Конец';
                    } else {
                        adjustedText = `Выход из п/п\n${cleanTitle}`;
                    }
                }
                allNodes.push({ id: node.id, type: node.kind, text: adjustedText, x: cx, y: currentY, height: h, lineIndex: node.lineIndex });
                if (node.kind === 'end' || node.text === 'continue' || node.text === 'break') {
                    if (node.text === 'continue') {
                        loopContinues.push({ x: cx, y: currentY + h/2 });
                    } else if (node.text === 'break') {
                        loopBreaks.push({ x: cx, y: currentY + h/2 });
                    }
                    inPts = [];
                } else {
                    inPts = [{ x: cx, y: currentY + h/2 }];
                }
                currentY += h/2 + Y_MARGIN + nextH/2;
                maxReachedY = Math.max(maxReachedY, currentY);
            } else if (node.type === 'if') {
                allNodes.push({ id: node.id, type: 'decision', text: node.condition, x: cx, y: currentY, height: h, lineIndex: node.lineIndex });
                
                const trueShift = (node as any).trueShift || (NODE_WIDTH/2 + X_SEP/2);
                const falseShift = (node as any).falseShift || (NODE_WIDTH/2 + X_SEP/2);
                const trueCx = cx + trueShift;
                const falseCx = cx - falseShift;
                
                const rightOut = { x: cx + NODE_WIDTH/2, y: currentY };
                const leftOut = { x: cx - NODE_WIDTH/2, y: currentY };
                const bottomOut = { x: cx, y: currentY + h/2 };
                
                let trueEnds: any[], falseEnds: any[];
                let localMax = currentY;
                
                let trueTerminates = false;
                let falseTerminates = false;
                let tFinalY = currentY;
                let fFinalY = currentY;
                
                if (node.trueBlock.length > 0) {
                    let firstTrueY = currentY + h/2 + Y_MARGIN + getASTNodeHeight(node.trueBlock[0])/2;
                    let isSingleTerm = (blockTerminates(node.trueBlock) && node.trueBlock.length === 1);
                    if (isSingleTerm && node.falseBlock.length === 0) {
                        firstTrueY = currentY + h/2 + Y_MARGIN + getASTNodeHeight(node.trueBlock[0])/2;
                    }
                    const tRes = layout(node.trueBlock, trueCx, firstTrueY, [{ x: trueCx, y: currentY, from: rightOut, label: 'Да', labelPos: {x: rightOut.x + 10, y: rightOut.y - 10} }], false, loopBreaks, loopContinues);
                    trueEnds = tRes.endPoints;
                    if (trueEnds.length === 0) trueTerminates = true;
                    tFinalY = tRes.finalY;
                    if (isSingleTerm && node.falseBlock.length === 0) {
                        tFinalY = firstTrueY + getASTNodeHeight(node.trueBlock[0])/2 + Y_MARGIN;
                    }
                    localMax = Math.max(localMax, tFinalY);
                } else {
                    trueEnds = [{x: trueCx, y: currentY, from: rightOut, label: 'Да', labelPos: {x: rightOut.x + 10, y: rightOut.y - 10}}];
                }
                
                if (node.falseBlock.length > 0) {
                    let firstFalseY = currentY + h/2 + Y_MARGIN + getASTNodeHeight(node.falseBlock[0])/2;
                    let isSingleTerm = (blockTerminates(node.falseBlock) && node.falseBlock.length === 1);
                    if (isSingleTerm && node.trueBlock.length === 0) {
                        firstFalseY = currentY + h/2 + Y_MARGIN + getASTNodeHeight(node.falseBlock[0])/2;
                    }
                    const fRes = layout(node.falseBlock, falseCx, firstFalseY, [{ x: falseCx, y: currentY, from: leftOut, label: 'Нет', labelPos: {x: leftOut.x - 25, y: leftOut.y - 10} }], false, loopBreaks, loopContinues);
                    falseEnds = fRes.endPoints;
                    if (falseEnds.length === 0) falseTerminates = true;
                    fFinalY = fRes.finalY;
                    if (isSingleTerm && node.trueBlock.length === 0) {
                        fFinalY = firstFalseY + getASTNodeHeight(node.falseBlock[0])/2 + Y_MARGIN;
                    }
                    localMax = Math.max(localMax, fFinalY);
                } else {
                    falseEnds = [{x: falseCx, y: currentY, from: leftOut, label: 'Нет', labelPos: {x: leftOut.x - 25, y: leftOut.y - 10}}];
                }
                
                if (trueTerminates && node.falseBlock.length === 0) {
                    falseEnds = [{ 
                        x: cx, y: currentY + h/2, 
                        from: bottomOut, 
                        label: 'Нет', 
                        labelPos: {x: bottomOut.x + 15, y: bottomOut.y + 15},
                        limitX: cx
                    }];
                } else if (falseTerminates && node.trueBlock.length === 0) {
                    trueEnds = [{ 
                        x: cx, y: currentY + h/2, 
                        from: bottomOut, 
                        label: 'Да', 
                        labelPos: {x: bottomOut.x + 15, y: bottomOut.y + 15},
                        limitX: cx
                    }];
                }
                
                let mergeMax = currentY + h/2;
                if (node.trueBlock.length > 0) mergeMax = Math.max(mergeMax, tFinalY);
                if (node.falseBlock.length > 0) mergeMax = Math.max(mergeMax, fFinalY);
                let commonY = mergeMax + Y_MARGIN;
                
                if (trueTerminates && falseTerminates) {
                    inPts = [];
                } else if (trueTerminates && !falseTerminates) {
                    let outPts = [];
                    for (let pt of falseEnds) {
                        let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                        if (pt.from) {
                            let px = (pt as any).limitX || pt.x;
                            allEdges.push({ 
                                points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}], 
                                ...extra, noArrow: true
                            });
                            outPts.push({x: px, y: commonY});
                        } else {
                            allEdges.push({ points: [pt, {x: pt.x, y: commonY}], ...extra, noArrow: true });
                            outPts.push({x: pt.x, y: commonY});
                        }
                    }
                    inPts = outPts;
                } else if (!trueTerminates && falseTerminates) {
                    let outPts = [];
                    for (let pt of trueEnds) {
                        let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                        if (pt.from) {
                            let px = (pt as any).limitX || pt.x;
                            allEdges.push({ 
                                points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}], 
                                ...extra, noArrow: true
                            });
                            outPts.push({x: px, y: commonY});
                        } else {
                            allEdges.push({ points: [pt, {x: pt.x, y: commonY}], ...extra, noArrow: true });
                            outPts.push({x: pt.x, y: commonY});
                        }
                    }
                    inPts = outPts;
                } else {
                    for (let pt of trueEnds) {
                         let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                         if (pt.from) {
                             let px = (pt as any).limitX || pt.x;
                             allEdges.push({ 
                                  points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}, {x: cx, y: commonY}], 
                                  ...extra
                             });
                         } else {
                             allEdges.push({ points: [pt, {x: pt.x, y: commonY}, {x: cx, y: commonY}], ...extra });
                         }
                    }
                    for (let pt of falseEnds) {
                         let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                         if (pt.from) {
                             let px = (pt as any).limitX || pt.x;
                             allEdges.push({ 
                                  points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}, {x: cx, y: commonY}], 
                                  ...extra
                             });
                         } else {
                             allEdges.push({ points: [pt, {x: pt.x, y: commonY}, {x: cx, y: commonY}], ...extra });
                         }
                    }
                    inPts = [{x: cx, y: commonY, label: '', skipTopVertical: true } as any];
                }
                
                currentY = commonY + Y_MARGIN + (nextH || 0)/2;
                maxReachedY = Math.max(maxReachedY, currentY);
            } else if (node.type === 'match') {
                allNodes.push({ id: node.id, type: 'decision', text: node.condition, x: cx, y: currentY, height: h, lineIndex: node.lineIndex });
                
                const casesShifts = (node as any).casesShifts as number[];
                const defaultShift = (node as any).defaultShift as number;
                
                let commonY = currentY;
                let branchEnds: any[] = [];
                let matchBreaks: any[] = [];
                let matchContinues: any[] = [];
                
                // Track where the horizontal line connects to branches
                let horizontalLineY = currentY + h/2; // this horizontal line doesn't work well directly if we need to draw it exactly below. The diagram shows: 
                // decision -> horizontal bar -> branches down
                // The switch has one down out, then a horiz line, then down to cases
                
                let lineY = currentY + h/2 + 15;
                allEdges.push({ points: [{x: cx, y: currentY + h/2}, {x: cx, y: lineY}], noArrow: true });
                
                let minBranchCx = casesShifts.length > 0 ? cx + casesShifts[0] : cx + defaultShift;
                let maxBranchCx = cx + defaultShift;
                allEdges.push({ points: [{x: minBranchCx, y: lineY}, {x: maxBranchCx, y: lineY}], noArrow: true });
                
                for (let i = 0; i < node.cases.length; i++) {
                    const c = node.cases[i];
                    const shift = casesShifts[i];
                    const branchCx = cx + shift; 
                    
                    let outP = {x: branchCx, y: lineY + 30};
                    
                    allEdges.push({ 
                        points: [{x: branchCx, y: lineY}, {x: branchCx, y: outP.y}],
                        label: c.condition,
                        labelPos: {x: branchCx, y: lineY - 6},
                        noArrow: true 
                    });
                    
                    if (c.block.length > 0) {
                        let firstBlockY = outP.y + getASTNodeHeight(c.block[0])/2;
                        let bRes = layout(c.block, branchCx, firstBlockY, [{x: branchCx, y: outP.y, from: {x: branchCx, y: lineY}}], false, matchBreaks, matchContinues);
                        branchEnds.push(...bRes.endPoints);
                        if (bRes.endPoints.length > 0) {
                            commonY = Math.max(commonY, bRes.finalY);
                        }
                    } else {
                        branchEnds.push({x: branchCx, y: outP.y, from: {x: branchCx, y: lineY}});
                    }
                }
                
                // Add default branch
                const defBranchCx = cx + defaultShift;
                let defOutP = {x: defBranchCx, y: lineY + 30};
                allEdges.push({ 
                    points: [{x: defBranchCx, y: lineY}, {x: defBranchCx, y: defOutP.y}],
                    label: 'Иначе',
                    labelPos: {x: defBranchCx, y: lineY - 6},
                    noArrow: true 
                });
                
                if (node.defaultBlock && node.defaultBlock.length > 0) {
                    let firstBlockY = defOutP.y + getASTNodeHeight(node.defaultBlock[0])/2;
                    let bRes = layout(node.defaultBlock, defBranchCx, firstBlockY, [{x: defBranchCx, y: defOutP.y, from: {x: defBranchCx, y: lineY}}], false, matchBreaks, matchContinues);
                    branchEnds.push(...bRes.endPoints);
                    if (bRes.endPoints.length > 0) {
                        commonY = Math.max(commonY, bRes.finalY);
                    }
                } else {
                    branchEnds.push({x: defBranchCx, y: defOutP.y, from: {x: defBranchCx, y: lineY}});
                }

                branchEnds.push(...matchBreaks.map(brk => {
                    return { ...brk, from: brk };
                }));
                branchEnds.push(...matchContinues.map(cont => {
                    return { ...cont, from: cont };
                }));

                commonY += 15;
                
                let minEndCx = cx;
                let maxEndCx = cx;
                
                for (let pt of branchEnds) {
                    let px = pt.limitX || pt.x;
                    minEndCx = Math.min(minEndCx, px);
                    maxEndCx = Math.max(maxEndCx, px);
                    
                    let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                    if (pt.from) {
                        allEdges.push({ 
                            points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}],
                            ...extra,
                            noArrow: true
                        });
                    } else {
                        allEdges.push({ points: [pt, {x: pt.x, y: commonY}], noArrow: true });
                    }
                }
                
                if (minEndCx < maxEndCx) {
                    allEdges.push({ points: [{x: minEndCx, y: commonY}, {x: maxEndCx, y: commonY}], noArrow: true});
                }
                
                maxReachedY = Math.max(maxReachedY, commonY);
                currentY = commonY + 15 + (nextH || 0)/2;
                inPts = [{x: cx, y: commonY, label: '', skipTopVertical: true, from: {x: cx, y: commonY} } as any];
                
            } else if (node.type === 'while') {
                const shapeType = 'decision';
                allNodes.push({ id: node.id, type: shapeType, text: node.condition, x: cx, y: currentY, height: h, lineIndex: node.lineIndex });
                
                const bodyIn = {x: cx, y: currentY + h/2};
                
                let bodyEnds;
                let localMax = currentY;
                let actEndCx = cx;
                let bBreaks: any[] = [];
                let bContinues: any[] = [];
                if (node.body.length > 0) {
                    const firstBodyY = currentY + h/2 + Y_MARGIN + getASTNodeHeight(node.body[0])/2;
                    const bRes = layout(node.body, cx, firstBodyY, [{ x: cx, y: currentY + h/2, from: bodyIn, label: 'Да', labelPos: {x: cx + 15, y: currentY + h/2 + Y_MARGIN/2} }], true, bBreaks, bContinues);
                    bodyEnds = bRes.endPoints;
                    localMax = Math.max(localMax, bRes.finalY);
                    actEndCx = bRes.endCx;
                } else {
                    bodyEnds = [{x: cx, y: currentY + h/2 + Y_MARGIN, from: bodyIn, label: 'Да', labelPos: {x: cx + 15, y: currentY + h/2 + Y_MARGIN} }];
                }
                
                bodyEnds.push(...bContinues.map(c => ({...c, from: c, isContinue: true})));
                
                let endsInLastCol = bodyEnds.filter(p => !p.isContinue && Math.abs(p.x - actEndCx) < NODE_WIDTH * 2);
                let actualBodyMaxY = currentY;
                if (endsInLastCol.length > 0) {
                     actualBodyMaxY = Math.max(...endsInLastCol.map(p => p.y || 0));
                } else if (bodyEnds.filter(p => !p.isContinue).length > 0) {
                     actualBodyMaxY = Math.max(...bodyEnds.filter(p => !p.isContinue).map(p => p.y || 0));
                } else if (node.body.length > 0) {
                     actualBodyMaxY = localMax;
                }
                const mergeY = actualBodyMaxY + X_SEP/2;
                
                let rightCorridor = cx + Math.max(node.rightW || NODE_WIDTH, NODE_WIDTH * 2) - X_SEP/2 + 20;

                for (let p of bodyEnds) {
                    if (p.isContinue) {
                         allEdges.push({ 
                             points: [p.from, {x: rightCorridor, y: p.from.y}, {x: rightCorridor, y: mergeY}, {x: actEndCx, y: mergeY}], 
                             noArrow: true 
                         });
                    } else if (p.from) {
                         const px = (p as any).limitX || p.x;
                         let lblObj = {};
                         if (p.label) {
                             if (p.from && p.from.x > cx) {
                                  lblObj = {label: p.label, labelPos: {x: p.from.x + 15, y: p.from.y - 10}};
                             } else {
                                  lblObj = {label: p.label, labelPos: {x: cx + 12, y: currentY + h/2 + 10}};
                             }
                         }
                         allEdges.push({ 
                             points: [p.from, {x: px, y: p.from.y}, {x: px, y: mergeY}, {x: actEndCx, y: mergeY}], 
                             ...lblObj, 
                             noArrow: true 
                         });
                    } else {
                         if (Math.abs(p.x - actEndCx) < 1) {
                             allEdges.push({ points: [p, {x: actEndCx, y: mergeY}], noArrow: true });
                         } else {
                             allEdges.push({ points: [p, {x: p.x, y: mergeY}, {x: actEndCx, y: mergeY}], noArrow: true });
                         }
                    }
                }
                
                let returnX = cx - node.leftW! + X_SEP/2;
                while (usedReturnX.some(usedX => Math.abs(usedX - returnX) < 45)) {
                    returnX -= 50;
                }
                usedReturnX.push(returnX);
                
                allEdges.push({ 
                    points: [
                        {x: actEndCx, y: mergeY},
                        {x: returnX, y: mergeY}, 
                        {x: returnX, y: currentY - h/2 - Y_MARGIN/2}, 
                        {x: cx, y: currentY - h/2 - Y_MARGIN/2}
                    ]
                });
                
                let localMaxYInCx = currentY;
                let cxNodes = allNodes.filter(n => Math.abs(n.x - cx) < NODE_WIDTH && n.y > currentY);
                let lastNodeInCx: any = node;
                if (cxNodes.length > 0) {
                     localMaxYInCx = Math.max(...cxNodes.map(n => n.y));
                     lastNodeInCx = cxNodes.find(n => n.y === localMaxYInCx) || node;
                }
                let nextY = localMaxYInCx + getASTNodeHeight(lastNodeInCx)/2 + Y_MARGIN + nextH/2;
                if (Math.abs(actEndCx - cx) <= 10) {
                     nextY = Math.max(nextY, mergeY + X_SEP);
                }
                const rightOut = {x: cx + NODE_WIDTH/2, y: currentY};
                let falsePathLimit = cx + node.rightW! - X_SEP/2;
                
                inPts = [{
                    x: cx, 
                    y: nextY, 
                    from: rightOut, 
                    label: 'Нет',
                    labelPos: {x: rightOut.x + 10, y: rightOut.y - 10},
                    limitX: falsePathLimit
                } as any];

                let breakY = mergeY + 15;
                for (let brk of bBreaks) {
                    allEdges.push({
                        points: [brk, {x: brk.x, y: breakY}, {x: falsePathLimit, y: breakY}, {x: falsePathLimit, y: nextY}],
                        noArrow: true
                    });
                    inPts.push({
                        x: cx,
                        y: nextY,
                        from: {x: falsePathLimit, y: nextY},
                        limitX: falsePathLimit
                    } as any);
                }
                
                currentY = nextY + X_SEP;
                maxReachedY = Math.max(maxReachedY, currentY);
            } else if (node.type === 'for') {
                allNodes.push({ id: node.id, type: 'loop_begin', text: node.condition, x: cx, y: currentY, height: h, lineIndex: node.lineIndex });
                
                let outPts = [{ x: cx, y: currentY + h/2 }];
                
                let bBreaks: any[] = [];
                let bContinues: any[] = [];
                let bRes;
                if (node.body.length > 0) {
                    let firstBodyY = currentY + h/2 + Y_MARGIN + getASTNodeHeight(node.body[0])/2;
                    bRes = layout(node.body, cx, firstBodyY, outPts.map(p => ({ x: cx, y: currentY + h/2, from: p })), true, bBreaks, bContinues);
                    outPts = bRes.endPoints;
                    
                    let actualBodyMaxY = currentY;
                    let endsInLastCol = outPts.filter(p => Math.abs(p.x - cx) < NODE_WIDTH * 2);
                    if (endsInLastCol.length > 0) {
                         actualBodyMaxY = Math.max(...endsInLastCol.map(p => p.y || 0));
                    } else if (outPts.length > 0) {
                         actualBodyMaxY = Math.max(...outPts.map(p => p.y || 0));
                    } else if (bRes) {
                         actualBodyMaxY = bRes.finalY;
                    }
                    currentY = actualBodyMaxY;
                } else {
                    currentY += h/2 + Y_MARGIN;
                }
                
                let mergeY = currentY + Y_MARGIN;
                
                let rightCorridor = cx + Math.max(node.rightW || NODE_WIDTH, NODE_WIDTH * 2) - X_SEP/2 + 20;
                let contY = currentY + 15;
                for (let c of bContinues) {
                    allEdges.push({
                        points: [c, {x: rightCorridor, y: c.y}, {x: rightCorridor, y: contY}, {x: cx, y: contY}],
                        noArrow: true
                    });
                    outPts.push({
                        x: cx,
                        y: contY,
                        from: {x: cx, y: contY},
                        limitX: cx
                    } as any);
                }
                
                let endText = "Конец цикла\n" + node.condition;
                let endH = getNodeHeight(endText, 'loop_end');
                // Calculate next valid position for end element based on incoming lines
                let endY = mergeY + 15 + endH/2;
                
                for (let p of outPts) {
                    if ((p as any).from) {
                        const px = (p as any).limitX || p.x;
                        allEdges.push({ 
                            points: [(p as any).from, {x: px, y: (p as any).from.y}, {x: px, y: endY + endH/2 + 15}], 
                            noArrow: true 
                        });
                        inPts.push({ x: cx, y: endY + endH/2 + 15, from: {x: px, y: endY + endH/2 + 15}, limitX: px } as any);
                    } else {
                        if (Math.abs(p.x - cx) >= 1) {
                            allEdges.push({ points: [p, {x: p.x, y: endY + endH/2 + 15}], noArrow: true });
                            inPts.push({ x: cx, y: endY + endH/2 + 15, from: {x: p.x, y: endY + endH/2 + 15}, limitX: p.x } as any);
                        } else {
                            // Straight down? Not possible for false branch anyway
                            allEdges.push({ points: [p, {x: cx, y: endY + endH/2 + 15}], noArrow: true });
                            inPts.push({ x: cx, y: endY + endH/2 + 15 });
                        }
                    }
                }
                
                allNodes.push({ id: node.id + '_end', type: 'loop_end', text: endText, x: cx, y: endY, height: endH });
                
                inPts = [{ x: cx, y: endY + endH/2 }];
                
                let breakPathLimit = cx + Math.max(node.rightW || NODE_WIDTH, NODE_WIDTH * 2) - X_SEP/2 + 40;
                let bBrkY = mergeY + 15;
                for (let brk of bBreaks) {
                    allEdges.push({
                        points: [brk, {x: breakPathLimit, y: brk.y}, {x: breakPathLimit, y: endY + endH/2 + 15}],
                        noArrow: true
                    });
                    inPts.push({
                        x: cx,
                        y: endY + endH/2 + 15,
                        from: {x: breakPathLimit, y: endY + endH/2 + 15},
                        limitX: breakPathLimit
                    } as any);
                }
                
                currentY = endY + endH/2 + 15;
                if (nextH) {
                     currentY += nextH/2;
                }
                maxReachedY = Math.max(maxReachedY, currentY);
            }
        }
        
        return { endPoints: inPts, finalY: currentY, endCx: cx };
    }
    
    let rootW = NODE_WIDTH;
    if (ast.length > 0) rootW = Math.max(...ast.map(n => n.width || NODE_WIDTH));
    
    const rootCx = Math.max(200, rootW) / 2 + 50;
    const startY = 60;
    const startH = 64;
    
    let startText = isMain ? 'Начало' : `Вход в п/п ${cleanTitle}`;
    allNodes.push({ id: 'start', type: 'start', text: startText, x: rootCx, y: startY, height: startH });
    let rootInPts = [{ x: rootCx, y: startY + startH/2 }];
    
    let res = layout(ast, rootCx, startY + startH/2 + Y_MARGIN + getASTNodeHeight(ast[0])/2, rootInPts, true);
    
    let endCx = res.endCx;


    let overlappingNodes = allNodes.filter(n => Math.abs(n.x - endCx) < NODE_WIDTH);
    
    let endPtsY = res.endPoints.filter(p => Math.abs(p.x - endCx) < NODE_WIDTH * 2).map(p => p.y);
    let maxYOfEnds = endPtsY.length > 0 ? Math.max(...endPtsY) : res.finalY;
    
    let localColMaxY = startY;
    let localColNode: any = null;
    if (overlappingNodes.length > 0) {
        localColMaxY = Math.max(...overlappingNodes.map(n => n.y));
        localColNode = overlappingNodes.find(n => n.y === localColMaxY);
    }
    let localColBottom = localColNode ? localColMaxY + getASTNodeHeight(localColNode)/2 : startY;

    let finalY = Math.max(maxYOfEnds, localColBottom, res.finalY) + 32;

    if (res.endPoints.length > 0) {
        let endText = isMain ? 'Конец' : `Выход из п/п
${cleanTitle}`;
        allNodes.push({ id: 'end', type: 'end', text: endText, x: endCx, y: finalY, height: 64 });
        
        const targetPoint = {x: endCx, y: finalY - 64/2};
        const mergeY = targetPoint.y - 20;
        for (let p of res.endPoints) {
            if (p.from) {
                 const px = (p as any).limitX || p.x;
                 let extra = p.label ? {label: p.label, labelPos: p.labelPos || {x: Math.min(p.from.x, px) + Math.abs(px - p.from.x)/2, y: p.from.y - 10}} : {};
                 allEdges.push({ 
                     points: [p.from, {x: px, y: p.from.y}, {x: px, y: mergeY}, {x: endCx, y: mergeY}], 
                     ...extra,
                     noArrow: true 
                 });
                 allEdges.push({ points: [{x: endCx, y: mergeY}, targetPoint] });
            } else {
                 if (Math.abs(p.x - endCx) < 1) {
                     allEdges.push({ points: [p, targetPoint] });
                 } else {
                     allEdges.push({ points: [p, {x: p.x, y: mergeY}, {x: endCx, y: mergeY}], noArrow: true });
                     allEdges.push({ points: [{x: endCx, y: mergeY}, targetPoint] });
                 }
            }
        }
    }


    let minX = 0;
    if (allNodes.length > 0) {
        minX = Math.min(...allNodes.map(n => n.x - NODE_WIDTH/2), ...allEdges.flatMap(e => e.points ? e.points.map(p => p.x) : []));
    }
    let shiftX = 0;
    if (minX < 50) {
        shiftX = 50 - minX;
        for (let n of allNodes) n.x += shiftX;
        for (let e of allEdges) {
            if (e.points) e.points.forEach(p => p.x += shiftX);
            if (e.labelPos) e.labelPos.x += shiftX;
        }
    }
    
    let allEdgesFinal = allEdges.map((e, idx) => {
        let cleanedPoints = e.points ? e.points.filter((p, i, arr) => {
            if (i === 0) return true;
            return Math.abs(p.x - arr[i-1].x) > 1 || Math.abs(p.y - arr[i-1].y) > 1;
        }) : [];
        let segments = [];
        for (let i = 1; i < cleanedPoints.length; i++) {
             segments.push({
                  startX: cleanedPoints[i-1].x,
                  startY: cleanedPoints[i-1].y,
                  endX: cleanedPoints[i].x,
                  endY: cleanedPoints[i].y
             });
        }
        return { ...e, id: `e-${idx}`, segments };
    });

    if (graphOverrides) {
        let nodeShifts = new Map<string, {dx: number, dy: number, origNode: any}>();
        allNodes.forEach(n => {
            let ov = graphOverrides?.nodes?.[n.id];
            if (ov && (ov.dx || ov.dy)) {
                nodeShifts.set(n.id, { dx: ov.dx || 0, dy: ov.dy || 0, origNode: {...n} });
            }
        });
        
        allEdgesFinal.forEach(e => {
            let ov = graphOverrides?.edges?.[e.id!];
            if (ov?.segments && e.segments) {
                Object.keys(ov.segments).forEach(k => {
                    let idx = parseInt(k);
                    let segIdx = idx - 1;
                    if (segIdx >= 0 && segIdx < e.segments!.length) {
                         let seg = ov.segments[idx];
                         e.segments![segIdx].startX += (seg.startDx || 0);
                         e.segments![segIdx].startY += (seg.startDy || 0);
                         e.segments![segIdx].endX += (seg.endDx || 0);
                         e.segments![segIdx].endY += (seg.endDy || 0);
                    }
                });
            }
        });

        allNodes = allNodes.map((n) => {
            let ov = graphOverrides?.nodes?.[n.id];
            if (ov) {
                return { ...n, x: n.x + (ov.dx || 0), y: n.y + (ov.dy || 0), hidden: ov.hidden, text: ov.text !== undefined ? ov.text : n.text };
            }
            return n;
        }).filter(n => !n.hidden);
        
        allEdgesFinal = allEdgesFinal.filter(e => {
            return !graphOverrides?.edges?.[e.id]?.hidden;
        });
    }


    let finalWidth = 600;
    if (allNodes.length > 0) finalWidth = Math.max(...allNodes.map(n => n.x)) + NODE_WIDTH/2 + 100;
    
    let actualMaxY = finalY;
    if (allNodes.length > 0) actualMaxY = Math.max(actualMaxY, ...allNodes.map(n => n.y), res.finalY);

    const PAGE_H = 1200;
    let pages: {nodes: FlowNode[], edges: FlowEdge[], width: number, height: number}[] = [];
    
    let shouldSplit = actualMaxY > PAGE_H + 50;
    
    if (!shouldSplit) {
        let minX = Math.min(...allNodes.map(n => n.x - NODE_WIDTH/2));
        let maxX = Math.max(...allNodes.map(n => n.x + NODE_WIDTH/2));
        allEdgesFinal.forEach(e => {
            if (e.segments) {
                e.segments.forEach(seg => {
                    minX = Math.min(minX, seg.startX, seg.endX);
                    maxX = Math.max(maxX, seg.startX, seg.endX);
                });
            }
        });
        let diagramWidth = maxX - minX;
        let pageCanvasWidth = Math.max(diagramWidth + 200, 800);
        let diagramCenter = (minX + maxX) / 2;
        let pageCenter = pageCanvasWidth / 2;
        let dx = pageCenter - diagramCenter;
        
        allNodes.forEach(n => n.x += dx);
        allEdgesFinal.forEach(e => {
            if (e.segments) {
                e.segments.forEach(seg => {
                    seg.startX += dx;
                    seg.endX += dx;
                });
            }
            if (e.labelPos) {
                e.labelPos.x += dx;
            }
        });
        pages.push({ nodes: allNodes, edges: allEdgesFinal, width: pageCanvasWidth, height: actualMaxY + 100 });
    } else {
        let maxNodeY = Math.max(...allNodes.map(n => n.y), ...allEdgesFinal.flatMap(e => e.segments ? e.segments.map(s => Math.max(s.startY, s.endY)) : []));
        let maxS = Math.floor(maxNodeY / PAGE_H);
        
        let jumpCounter = 65;
        let jumpMap = new Map<string, string>();

        for (let s = 0; s <= maxS; s++) {
            let yMin = s * PAGE_H;
            let yMax = (s+1) * PAGE_H;
            
            let pageNodesList = allNodes.filter(n => n.y >= yMin && n.y < yMax);

            let minGapLocalY = PAGE_H;
            let maxBottomLocalY = 50;

            pageNodesList.forEach(n => {
                let localY = n.y - yMin;
                let top = localY - (n.height || 64) / 2;
                let bottom = localY + (n.height || 64) / 2;
                if (top < minGapLocalY) minGapLocalY = top;
                if (bottom > maxBottomLocalY) maxBottomLocalY = bottom;
            });

            allEdgesFinal.forEach(e => {
                if (e.segments) {
                    e.segments.forEach(seg => {
                        let sy = seg.startY;
                        let ey = seg.endY;

                        // To calculate minGap, we want to know if there's any visible line starting high up
                        let segMaxY = Math.max(sy, ey);
                        let segMinY = Math.min(sy, ey);
                        if (segMaxY >= yMin && segMinY < yMax) {
                            let topY = Math.max(segMinY, yMin);
                            let localTopY = topY - yMin;
                            if (localTopY < minGapLocalY) minGapLocalY = localTopY;
                        }

                        // For maxBottom, only use points that actually terminate INSIDE the page
                        if (sy >= yMin && sy < yMax) {
                            let localSy = sy - yMin;
                            if (localSy > maxBottomLocalY) maxBottomLocalY = localSy;
                        }
                        if (ey >= yMin && ey < yMax) {
                            let localEy = ey - yMin;
                            if (localEy > maxBottomLocalY) maxBottomLocalY = localEy;
                        }
                    });
                }
            });

            if (minGapLocalY === PAGE_H) minGapLocalY = 0;
            
            let SHIFT = (s > 0) ? -minGapLocalY + 100 : 0;
            
            let sNodes = pageNodesList.map(n => ({...n, y: n.y - yMin + SHIFT}));
            
            let localContentMaxY = maxBottomLocalY + SHIFT;
            let jumpOutY = localContentMaxY + 50;

            let sEdges: FlowEdge[] = [];

            allEdgesFinal.forEach(e => {
                let newSegments: any[] = [];
                let eInS = false;
                let hasJumpOut = false;
                if (e.segments) {
                    e.segments.forEach(seg => {
                        let segMinY = Math.min(seg.startY, seg.endY);
                        let segMaxY = Math.max(seg.startY, seg.endY);
                        
                        if (segMaxY < yMin || segMinY > yMax) return; 
                        
                        let sy = seg.startY;
                        let ey = seg.endY;
                        
                        let isDownward = sy <= ey;
                        
                        let clipSy = sy - yMin + SHIFT;
                        let clipEy = ey - yMin + SHIFT;
                        
                        if (isDownward) {
                            if (sy <= yMin && ey >= yMin) { 
                               clipSy = 60; 
                               let k = `in_${Math.round(seg.startX)}_${s-1}_${s}`;
                               if (!jumpMap.has(k)) { jumpMap.set(k, String.fromCharCode(jumpCounter++)); }
                               sNodes.push({ id: `jump_in_${k}`, type: 'circle', text: jumpMap.get(k)!, x: seg.startX, y: clipSy - 20, height: 40 });
                            }
                            if (ey >= yMax && sy <= yMax) { 
                               clipEy = jumpOutY - 20; 
                               let k = `in_${Math.round(seg.startX)}_${s}_${s+1}`;
                               if (!jumpMap.has(k)) { jumpMap.set(k, String.fromCharCode(jumpCounter++)); }
                               sNodes.push({ id: `jump_out_${k}`, type: 'circle', text: jumpMap.get(k)!, x: seg.endX, y: clipEy + 20, height: 40 });
                               hasJumpOut = true;
                            }
                        } else {
                            if (sy >= yMax && ey <= yMax) { 
                               clipSy = jumpOutY - 20; 
                               let k = `up_${Math.round(seg.startX)}_${s+1}_${s}`;
                               if (!jumpMap.has(k)) { jumpMap.set(k, String.fromCharCode(jumpCounter++)); }
                               sNodes.push({ id: `jump_in_up_${k}`, type: 'circle', text: jumpMap.get(k)!, x: seg.startX, y: clipSy + 20, height: 40 });
                            }
                            if (ey <= yMin && sy >= yMin) { 
                               clipEy = 60; 
                               let k = `up_${Math.round(seg.startX)}_${s}_${s-1}`;
                               if (!jumpMap.has(k)) { jumpMap.set(k, String.fromCharCode(jumpCounter++)); }
                               sNodes.push({ id: `jump_out_up_${k}`, type: 'circle', text: jumpMap.get(k)!, x: seg.endX, y: clipEy - 20, height: 40 });
                               hasJumpOut = true;
                            }
                        }
                        
                        if (Math.abs(clipSy - clipEy) > 0.1 || Math.abs(seg.startX - seg.endX) > 0.1) {
                            newSegments.push({
                                startX: seg.startX,
                                startY: clipSy,
                                endX: seg.endX,
                                endY: clipEy
                            });
                        }
                        eInS = true;
                    });
                }
                
                if (eInS && newSegments.length > 0) {
                    let labelPos;
                    if (e.labelPos && e.labelPos.y >= yMin && e.labelPos.y < yMax) {
                         labelPos = { x: e.labelPos.x, y: e.labelPos.y - yMin + SHIFT };
                    }
                    sEdges.push({ ...e, segments: newSegments, labelPos, noArrow: hasJumpOut ? false : e.noArrow });
                }
            });
            
            let uniqueNodes = new Map();
            sNodes.forEach(n => {
                uniqueNodes.set(n.id + n.type + n.x + n.y, n);
            });
            sNodes = Array.from(uniqueNodes.values());

            let minX = 999999;
            let maxX = -999999;
            if (sNodes.length > 0) {
                minX = Math.min(...sNodes.map(n => n.x - NODE_WIDTH/2));
                maxX = Math.max(...sNodes.map(n => n.x + NODE_WIDTH/2));
            }
            sEdges.forEach(e => {
                if (e.segments) {
                    e.segments.forEach(seg => {
                        minX = Math.min(minX, seg.startX, seg.endX);
                        maxX = Math.max(maxX, seg.startX, seg.endX);
                    });
                }
            });
            
            if (minX !== 999999 && maxX !== -999999) {
                let diagramWidth = maxX - minX;
                let pageCanvasWidth = Math.max(diagramWidth + 200, 800);
                let diagramCenter = (minX + maxX) / 2;
                let pageCenter = pageCanvasWidth / 2;
                let dx = pageCenter - diagramCenter;
                
                sNodes.forEach(n => n.x += dx);
                sEdges.forEach(e => {
                    if (e.segments) {
                        e.segments.forEach(seg => {
                            seg.startX += dx;
                            seg.endX += dx;
                        });
                    }
                    if (e.labelPos) {
                        e.labelPos.x += dx;
                    }
                });

                let pgMaxY = 100;
                sNodes.forEach(n => pgMaxY = Math.max(pgMaxY, n.y + (n.height||64)/2 + 40));
                sEdges.forEach(e => {
                    if (e.segments) {
                        e.segments.forEach(seg => {
                            pgMaxY = Math.max(pgMaxY, seg.startY + 40, seg.endY + 40);
                        });
                    }
                });

                pages.push({ nodes: sNodes, edges: sEdges, width: pageCanvasWidth, height: pgMaxY });
            } else {
                pages.push({ nodes: sNodes, edges: sEdges, width: 800, height: 100 });
            }
        }
    }
    return { pages, title };}
function EdgePolyline({ edge, theme = 'light' }: { edge: FlowEdge; theme?: string; key?: React.Key }) {
    if (!edge.segments || edge.segments.length === 0) return null;
    
    let pathData = '';
    edge.segments.forEach((seg, i) => {
         if (i === 0) {
             pathData += `M ${seg.startX} ${seg.startY} L ${seg.endX} ${seg.endY}`;
         } else {
             let prev = edge.segments![i-1];
             if (Math.abs(prev.endX - seg.startX) < 0.1 && Math.abs(prev.endY - seg.startY) < 0.1) {
                 pathData += ` L ${seg.endX} ${seg.endY}`;
             } else {
                 pathData += ` M ${seg.startX} ${seg.startY} L ${seg.endX} ${seg.endY}`;
             }
         }
    });
    
    let labelPoint = edge.labelPos ? edge.labelPos : null;
    let labelStr = edge.label ? edge.label.toUpperCase() : '';
    if (edge.label && edge.segments.length > 0 && !labelPoint) {
        let first = edge.segments[0];
        if (Math.abs(first.startX - first.endX) > 10) { 
            labelPoint = { x: first.startX + Math.sign(first.endX - first.startX) * 20, y: first.startY - 6 };
        } else {
            labelPoint = { x: first.startX + 12, y: first.startY + Math.sign(first.endY - first.startY) * 20 };
        }
    }

    return (
        <g>
            <path d={pathData} fill="none" stroke={theme === 'dark' ? '#d4d4d8' : '#18181b'} strokeWidth="1.5" markerEnd={edge.noArrow ? undefined : `url(#arrowhead-${theme})`} strokeLinejoin="round" />
            {labelPoint && labelStr && (
                <text x={labelPoint.x} y={labelPoint.y} fontSize="13" fontWeight="bold" fill={theme === 'dark' ? '#d4d4d8' : '#18181b'} textAnchor="middle" className="uppercase tracking-wider">
                    {labelStr}
                </text>
            )}
        </g>
    );
}

function splitTextIntoLines(text: string, maxCharsPerLine: number = 28): string[] {
  const lines: string[] = [];
  let currentLine = '';
  
  // More intelligent tokenization for code: separates variables, numbers, operators, Strings
  const tokens = text.match(/[\wА-Яа-я]+|["'].*?["']|[^\w\sА-Яа-я"']+|\s+/g) || [text];
  
  for (const token of tokens) {
    if (token.match(/^\s+$/)) {
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
}

function getNodeLines(text: string, type?: string): string[] {
    if (!text) return [];
    let maxC = 24;
    if (type === 'decision') maxC = 26;
    else if (type === 'loop' || type === 'loop_begin' || type === 'loop_end') maxC = 20;
    else if (type === 'io') maxC = 22;

    return text.split('\n').flatMap(l => splitTextIntoLines(l.trim(), maxC));
}

function getNodeHeight(text: string, type?: string): number {
    if (!text) return 64;
    const lines = getNodeLines(text, type);
    return Math.max(64, lines.length * 18.5 + 24);
}

function GostShape({ node, highlighted = false, fontFamily = 'monospace', theme = 'light' }: { node: FlowNode; highlighted?: boolean; fontFamily?: string; theme?: string; key?: React.Key }) {
  const WIDTH = 220;
  const HEIGHT = node.height || (node.type === 'circle' ? 64 : getNodeHeight(node.text, node.type));
  const cx = node.x;
  const cy = node.y;
  const x = cx - WIDTH / 2;
  const y = cy - HEIGHT / 2;

  const fill = theme === 'dark' 
      ? (highlighted ? "#713f12" : "#27272a") 
      : (highlighted ? "#fef9c3" : "white");
  const stroke = theme === 'dark'
      ? (highlighted ? "#eab308" : "#d4d4d8")
      : (highlighted ? "#eab308" : "#18181b");
  const textColor = theme === 'dark' ? "#f4f4f5" : "#18181b";
  const strokeWidth = highlighted ? "2.5" : "1.5";

  let shapeElement;

  switch (node.type) {
    case 'start':
    case 'end':
      shapeElement = <rect x={x} y={y} width={WIDTH} height={HEIGHT} rx={HEIGHT/2} ry={HEIGHT/2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    case 'circle':
      const r = 20;
      shapeElement = <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    case 'process':
      shapeElement = <rect x={x} y={y} width={WIDTH} height={HEIGHT} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    case 'io':
      const skew = 18;
      shapeElement = <polygon points={`${x+skew},${y} ${x+WIDTH},${y} ${x+WIDTH-skew},${y+HEIGHT} ${x},${y+HEIGHT}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    case 'decision':
      shapeElement = <polygon points={`${cx},${y} ${x+WIDTH},${cy} ${cx},${y+HEIGHT} ${x},${cy}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    case 'loop':
      const hexTip = 26;
      shapeElement = <polygon points={`${x+hexTip},${y} ${x+WIDTH-hexTip},${y} ${x+WIDTH},${cy} ${x+WIDTH-hexTip},${y+HEIGHT} ${x+hexTip},${y+HEIGHT} ${x},${cy}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    case 'loop_begin':
      const cl = 20;
      shapeElement = <polygon points={`${x+cl},${y} ${x+WIDTH-cl},${y} ${x+WIDTH},${y+cl} ${x+WIDTH},${y+HEIGHT} ${x},${y+HEIGHT} ${x},${y+cl}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    case 'loop_end':
      const ce = 20;
      shapeElement = <polygon points={`${x},${y} ${x+WIDTH},${y} ${x+WIDTH},${y+HEIGHT-ce} ${x+WIDTH-ce},${y+HEIGHT} ${x+ce},${y+HEIGHT} ${x},${y+HEIGHT-ce}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    case 'subprogram':
      shapeElement = (
        <g>
           <rect x={x} y={y} width={WIDTH} height={HEIGHT} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
           <line x1={x + 15} y1={y} x2={x + 15} y2={y + HEIGHT} stroke={stroke} strokeWidth={strokeWidth} />
           <line x1={x + WIDTH - 15} y1={y} x2={x + WIDTH - 15} y2={y + HEIGHT} stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
      break;
    default:
      shapeElement = <rect x={x} y={y} width={WIDTH} height={HEIGHT} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }

  const textLines = node.type === 'circle' ? [node.text] : getNodeLines(node.text, node.type);
  return (
    <g>
      {shapeElement}
      <text 
        x={cx} 
        y={cy} 
        fontSize={node.type === 'circle' ? "18" : "15"} 
        fontWeight={node.type === 'circle' ? "bold" : "600"} 
        fontFamily={fontFamily}
        fill={textColor} 
        textAnchor="middle" 
        dominantBaseline="central"
      >
        {textLines.map((line, i, arr) => (
          <tspan 
            key={i} 
            x={cx} 
            dy={i === 0 ? `-${(arr.length - 1) * 0.65}em` : "1.3em"}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export default function App() {
  const [code, setCode] = useState(() => {
     const c = localStorage.getItem('blockcraft_code');
     return c !== null ? c : "";
  });
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light'|'dark'>(() => (localStorage.getItem('blockcraft_theme') as 'light'|'dark') || 'light');
  const [fontFamily, setFontFamily] = useState<string>(() => localStorage.getItem('blockcraft_font') || 'Inter, sans-serif');

  const handleNodeClick = (node: any) => {
      if (highlightedNodeId === node.id) {
          setHighlightedNodeId(null);
          setHoveredLineIndex(null);
          return;
      }
      
      if (node.id) {
          setHighlightedNodeId(node.id);
      }
      if (node.lineIndex !== undefined && node.lineIndex !== null) {
          setHoveredLineIndex(node.lineIndex);
          
          setTimeout(() => {
              const textarea = document.querySelector('.npm__react-simple-code-editor__textarea') as HTMLTextAreaElement;
              if (textarea) {
                  const lines = code.split('\n');
                  let startChar = 0;
                  for (let i = 0; i < node.lineIndex; i++) {
                      if (lines[i] !== undefined) {
                          startChar += lines[i].length + 1;
                      }
                  }
                  let endChar = startChar + (lines[node.lineIndex]?.length || 0);
                  
                  textarea.focus();
                  textarea.setSelectionRange(startChar, endChar);
                  
                  const scroller = document.getElementById('code-editor-scroller');
                  if (scroller) {
                      const lineHeight = 21.125;
                      const scrollerHeight = scroller.clientHeight;
                      const targetScrollTop = Math.max(0, (node.lineIndex * lineHeight) - (scrollerHeight / 2) + 20);
                      scroller.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                  }
              }
          }, 50);
      }
  };

  const [language, setLanguage] = useState(() => localStorage.getItem('blockcraft_language') || 'python');
  const [leftWidth, setLeftWidth] = useState(480);
  const [showSidebar, setShowSidebar] = useState(true);
  const [viewMode, setViewMode] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [tabPages, setTabPages] = useState<Record<number, number>>({});
  const activePage = tabPages[activeTab] || 0;
  const setActivePage = (p: number | ((prev: number) => number), overrideTabIdx?: number) => {
      setTabPages(prev => {
          const targetTab = overrideTabIdx !== undefined ? overrideTabIdx : activeTab;
          const prevVal = prev[targetTab] || 0;
          const newVal = typeof p === 'function' ? (p as Function)(prevVal) : p;
          return { ...prev, [targetTab]: newVal };
      });
  };
  const [scale, setScale] = useState(1);
  const isDragging = React.useRef(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [overrides, setOverrides] = useState<Record<number, any>>(() => {
    try { return JSON.parse(localStorage.getItem('blockcraft_overrides') || '{}'); } catch { return {}; }
  });
  const overridesRef = React.useRef(overrides);
  React.useEffect(() => { 
      overridesRef.current = overrides;
      localStorage.setItem('blockcraft_overrides', JSON.stringify(overrides));
  }, [overrides]);
  
  const [history, setHistory] = useState<Record<number, any>[]>(() => {
    try { return JSON.parse(localStorage.getItem('blockcraft_history') || '[{}]'); } catch { return [{}]; }
  });
  const [historyIndex, setHistoryIndex] = useState(() => {
    const saved = localStorage.getItem('blockcraft_historyIndex');
    return saved ? parseInt(saved, 10) : 0;
  });

  React.useEffect(() => { localStorage.setItem('blockcraft_history', JSON.stringify(history)); }, [history]);
  React.useEffect(() => { localStorage.setItem('blockcraft_historyIndex', historyIndex.toString()); }, [historyIndex]);
  React.useEffect(() => { localStorage.setItem('blockcraft_code', code); }, [code]);
  React.useEffect(() => { localStorage.setItem('blockcraft_language', language); }, [language]);
  React.useEffect(() => { localStorage.setItem('blockcraft_theme', theme); }, [theme]);
  React.useEffect(() => { localStorage.setItem('blockcraft_font', fontFamily); }, [fontFamily]);

  const pushHistory = (newOverrides: Record<number, any>) => {
      setOverrides(newOverrides);
      setHistory(prev => {
          const next = prev.slice(0, historyIndex + 1);
          next.push(JSON.parse(JSON.stringify(newOverrides)));
          return next;
      });
      setHistoryIndex(prev => prev + 1);
  };

  const [selectedElement, setSelectedElement] = useState<{type: 'node' | 'edge', id: string, segment?: number} | null>(null);
  const [editingNode, setEditingNode] = useState<{id: string, text: string} | null>(null);
  const [dragState, setDragState] = useState<{id: string, type: 'node' | 'edge', segment?: number, dragEnd?: 'start' | 'end', startX: number, startY: number, startDx: number, startDy: number, moved?: boolean, isVertical?: boolean} | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                // Redo
                if (historyIndex < history.length - 1) {
                    setOverrides(history[historyIndex + 1]);
                    setHistoryIndex(historyIndex + 1);
                }
            } else {
                // Undo
                if (historyIndex > 0) {
                    setOverrides(history[historyIndex - 1]);
                    setHistoryIndex(historyIndex - 1);
                }
            }
            return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (editingNode) return;
            if (selectedElement) {
                const next = JSON.parse(JSON.stringify(overridesRef.current));
                if (!next[activeTab]) next[activeTab] = { nodes: {}, edges: {} };
                const graphOv = next[activeTab];
                if (selectedElement.type === 'node') {
                    if (!graphOv.nodes) graphOv.nodes = {};
                    if (!graphOv.nodes[selectedElement.id]) graphOv.nodes[selectedElement.id] = {};
                    graphOv.nodes[selectedElement.id].hidden = true;
                } else if (selectedElement.type === 'edge') {
                    if (!graphOv.edges) graphOv.edges = {};
                    if (!graphOv.edges[selectedElement.id]) graphOv.edges[selectedElement.id] = {};
                    graphOv.edges[selectedElement.id].hidden = true;
                }
                pushHistory(next);
                setSelectedElement(null);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, activeTab, editingNode, history, historyIndex]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setLeftWidth(Math.max(200, Math.min(e.clientX, window.innerWidth - 200)));
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  const graphs = useMemo(() => {
      try {
          return buildGraphs(code, language, overrides);
      } catch (e) {
          console.error(e);
          return [];
      }
  }, [code, language, overrides]);

  const findGraphAndNodeByLine = (lineIdx: number) => {
      for (let gIdx = 0; gIdx < graphs.length; gIdx++) {
          const g = graphs[gIdx];
          for (let pIdx = 0; pIdx < g.pages.length; pIdx++) {
              const p = g.pages[pIdx];
              const matchNode = p.nodes.find(n => n.lineIndex === lineIdx);
              if (matchNode) {
                  return { graphIdx: gIdx, pageIdx: pIdx, nodeId: matchNode.id };
              }
          }
      }
      return null;
  };

  React.useEffect(() => {
    if (activeTab >= graphs.length) {
       setActiveTab(Math.max(0, graphs.length - 1));
       setActivePage(0);
    }
  }, [graphs.length, activeTab]);

  const activeGraph = graphs[activeTab] || null;
  const activeGraphPage = activeGraph ? (activeGraph.pages[activePage] || activeGraph.pages[0] || null) : null;

  React.useEffect(() => {
      const textarea = document.querySelector('.npm__react-simple-code-editor__textarea') as HTMLTextAreaElement;
      if (!textarea) return;

      const onSelectionChange = () => {
          if (document.activeElement !== textarea) return;
          const selectionStart = textarea.selectionStart;
          if (selectionStart !== undefined) {
              const textBefore = textarea.value.substring(0, selectionStart);
              const currentLineIdx = textBefore.split('\n').length - 1;
              setHoveredLineIndex(currentLineIdx);
              const res = findGraphAndNodeByLine(currentLineIdx);
              if (res) {
                  setActiveTab(res.graphIdx);
                  setActivePage(res.pageIdx, res.graphIdx);
                  setHighlightedNodeId(res.nodeId);
              }
          }
      };

      textarea.addEventListener('keyup', onSelectionChange);
      textarea.addEventListener('click', onSelectionChange);
      textarea.addEventListener('focus', onSelectionChange);
      textarea.addEventListener('select', onSelectionChange);

      return () => {
          textarea.removeEventListener('keyup', onSelectionChange);
          textarea.removeEventListener('click', onSelectionChange);
          textarea.removeEventListener('focus', onSelectionChange);
          textarea.removeEventListener('select', onSelectionChange);
      };
  }, [code, graphs]);

  const totalWidth = graphs.reduce((sum, g) => sum + (g.pages.length > 0 ? g.pages[0].width : 800) + 40, 0) || 800;
  const maxHeight = Math.max(...graphs.map(g => g.pages.length > 0 ? g.pages[0].height : 800), 800);

const downloadSvg = (svgId: string, title: string) => {
    const svgElement = document.getElementById(svgId) as any as SVGSVGElement | null;
    if (!svgElement) return;
    
    let svgBBox;
    try {
        svgBBox = svgElement.getBBox();
    } catch (e) {
        svgBBox = { x: 0, y: 0, width: 800, height: 800 };
    }
    
    const padding = 80;
    const w = Math.ceil(svgBBox.width + padding * 2);
    const h = Math.ceil(svgBBox.height + padding * 2);
    
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // Inject correct dimensions for proper cropped download
    source = source.replace(/\bwidth="[^"]+"/, '');
    source = source.replace(/\bheight="[^"]+"/, '');
    source = source.replace(/\bviewBox="[^"]+"/, ''); 
    source = source.replace(/^<svg/, `<svg viewBox="${svgBBox.x - padding} ${svgBBox.y - padding} ${w} ${h}" width="${w}" height="${h}" `);
    
    // Add white background specifically for SVG download if needed, or leave it transparent
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const a = document.createElement("a");
    a.href = url;
    a.download = title.replace(/\s+/g, '_') + '.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

const downloadPng = (svgId: string, title: string) => {
    const svgElement = document.getElementById(svgId) as any as SVGSVGElement | null;
    if (!svgElement) return;
    
    let svgBBox;
    try {
        svgBBox = svgElement.getBBox();
    } catch (e) {
        svgBBox = { x: 0, y: 0, width: 800, height: 800 };
    }
    
    const padding = 80;
    const w = Math.ceil(svgBBox.width + padding * 2);
    const h = Math.ceil(svgBBox.height + padding * 2);
    
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // Inject correct dimensions for proper cropped download
    source = source.replace(/\bwidth="[^"]+"/, '');
    source = source.replace(/\bheight="[^"]+"/, '');
    source = source.replace(/\bviewBox="[^"]+"/, ''); 
    source = source.replace(/^<svg/, `<svg viewBox="${svgBBox.x - padding} ${svgBBox.y - padding} ${w} ${h}" width="${w}" height="${h}" `);
    
    const canvas = document.createElement("canvas");
    const scale = 2;
    
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.scale(scale, scale);
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        
        const a = document.createElement("a");
        a.download = `${title}.png`;
        a.href = canvas.toDataURL("image/png", 1.0);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    img.src = url;
}; // end downloadPng

const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

const downloadDrawio = (title: string, fontFamily: string) => {
    if (!activeGraphPage) return;
    
    let fontName = fontFamily.split(',')[0].replace(/['"]/g, '').trim();

    let xml = `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="AIStudio" version="21.6.8" type="device">\n`;
    xml += `  <diagram id="diag-${Math.random().toString(36).substring(2, 9)}" name="Page-1">\n`;
    xml += `    <mxGraphModel dx="1200" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">\n`;
    xml += `      <root>\n`;
    xml += `        <mxCell id="0" />\n`;
    xml += `        <mxCell id="1" parent="0" />\n`;

    const getPointsFromSegments = (segments: any[]) => {
        if (!segments || segments.length === 0) return [];
        const pts: {x: number, y: number}[] = [];
        pts.push({ x: segments[0].startX, y: segments[0].startY });
        segments.forEach(seg => {
            const last = pts[pts.length - 1];
            if (Math.abs(last.x - seg.startX) > 0.1 || Math.abs(last.y - seg.startY) > 0.1) {
                pts.push({ x: seg.startX, y: seg.startY });
            }
            pts.push({ x: seg.endX, y: seg.endY });
        });
        return pts;
    };

    const findClosestNode = (pt: {x: number; y: number}) => {
        let closestNode = null;
        let minDist = 999999;
        activeGraphPage.nodes.forEach(node => {
            const width = node.type === 'circle' ? 40 : 220;
            const height = node.type === 'circle' ? 40 : (node.height || getNodeHeight(node.text, node.type));
            const ports = [
                { x: node.x, y: node.y },
                { x: node.x, y: node.y - height / 2 },
                { x: node.x, y: node.y + height / 2 },
                { x: node.x - width / 2, y: node.y },
                { x: node.x + width / 2, y: node.y }
            ];
            ports.forEach(port => {
                const dx = pt.x - port.x;
                const dy = pt.y - port.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    closestNode = node;
                }
            });
        });
        return minDist <= 10 ? closestNode : null;
    };

    // 1. Add Nodes
    activeGraphPage.nodes.forEach(node => {
        const width = node.type === 'circle' ? 40 : 220;
        const height = node.type === 'circle' ? 40 : (node.height || getNodeHeight(node.text, node.type));
        const xMin = node.x - width / 2;
        const yMin = node.y - height / 2;

        let style = `rounded=0;whiteSpace=wrap;html=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        if (node.type === 'start' || node.type === 'end') {
            style = `rounded=1;whiteSpace=wrap;html=1;arcSize=50;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;align=center;fontWeight=bold;fontFamily=${fontName};`;
        } else if (node.type === 'circle') {
            style = `ellipse;whiteSpace=wrap;html=1;aspect=fixed;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'io') {
            style = `shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'decision') {
            style = `rhombus;whiteSpace=wrap;html=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'loop_begin') {
            style = `shape=polygon;points=[[0.1,0],[0.9,0],[1,0.25],[1,1],[0,1],[0,0.25]];whiteSpace=wrap;html=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'loop_end') {
            style = `shape=polygon;points=[[0,0],[1,0],[1,0.75],[0.9,1],[0.1,1],[0,0.75]];whiteSpace=wrap;html=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'loop') {
            style = `shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'subprogram') {
            style = `shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        }

        xml += `        <mxCell id="${node.id}" value="${escapeXml(node.text)}" style="${style}" vertex="1" parent="1">\n`;
        xml += `          <mxGeometry x="${xMin}" y="${yMin}" width="${width}" height="${height}" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
    });

    // 2. Add Edges and Labels
    activeGraphPage.edges.forEach((edge, i) => {
        const edgeId = edge.id || `edge-${i}`;
        const points = getPointsFromSegments(edge.segments || []);
        if (points.length < 2) return;

        const startPt = points[0];
        const endPt = points[points.length - 1];

        const sourceNode = findClosestNode(startPt);
        const targetNode = findClosestNode(endPt);

        let style = `html=1;strokeColor=#18181b;strokeWidth=1.5;fontSize=11;fontFamily=${fontName};rounded=0;`;
        if (edge.noArrow) {
            style += "endArrow=none;";
        } else {
            style += "endArrow=classic;";
        }

        let sourceAttr = "";
        let targetAttr = "";

        if (sourceNode) {
            sourceAttr = ` source="${sourceNode.id}"`;
            const sw = sourceNode.type === 'circle' ? 40 : 220;
            const sh = sourceNode.type === 'circle' ? 40 : (sourceNode.height || getNodeHeight(sourceNode.text, sourceNode.type));
            const dxLeft = Math.abs(startPt.x - (sourceNode.x - sw/2));
            const dxRight = Math.abs(startPt.x - (sourceNode.x + sw/2));
            const dyTop = Math.abs(startPt.y - (sourceNode.y - sh/2));
            const dyBottom = Math.abs(startPt.y - (sourceNode.y + sh/2));
            const minDist = Math.min(dxLeft, dxRight, dyTop, dyBottom);
            if (minDist === dyBottom) {
                style += "exitX=0.5;exitY=1;exitDx=0;exitDy=0;";
            } else if (minDist === dyTop) {
                style += "exitX=0.5;exitY=0;exitDx=0;exitDy=0;";
            } else if (minDist === dxLeft) {
                style += "exitX=0;exitY=0.5;exitDx=0;exitDy=0;";
            } else if (minDist === dxRight) {
                style += "exitX=1;exitY=0.5;exitDx=0;exitDy=0;";
            }
        }

        if (targetNode) {
            targetAttr = ` target="${targetNode.id}"`;
            const tw = targetNode.type === 'circle' ? 40 : 220;
            const th = targetNode.type === 'circle' ? 40 : (targetNode.height || getNodeHeight(targetNode.text, targetNode.type));
            const dxLeft = Math.abs(endPt.x - (targetNode.x - tw/2));
            const dxRight = Math.abs(endPt.x - (targetNode.x + tw/2));
            const dyTop = Math.abs(endPt.y - (targetNode.y - th/2));
            const dyBottom = Math.abs(endPt.y - (targetNode.y + th/2));
            const minDist = Math.min(dxLeft, dxRight, dyTop, dyBottom);
            if (minDist === dyTop) {
                style += "entryX=0.5;entryY=0;entryDx=0;entryDy=0;";
            } else if (minDist === dyBottom) {
                style += "entryX=0.5;entryY=1;entryDx=0;entryDy=0;";
            } else if (minDist === dxLeft) {
                style += "entryX=0;entryY=0.5;entryDx=0;entryDy=0;";
            } else if (minDist === dxRight) {
                style += "entryX=1;entryY=0.5;entryDx=0;entryDy=0;";
            }
        }

        xml += `        <mxCell id="${edgeId}" value="" style="${style}" edge="1" parent="1"${sourceAttr}${targetAttr}>\n`;
        xml += `          <mxGeometry relative="1" as="geometry">\n`;
        if (!sourceNode) {
            xml += `            <mxPoint as="sourcePoint" x="${startPt.x}" y="${startPt.y}" />\n`;
        }
        if (!targetNode) {
            xml += `            <mxPoint as="targetPoint" x="${endPt.x}" y="${endPt.y}" />\n`;
        }
        
        if (points.length > 2) {
            xml += `            <Array as="points">\n`;
            points.slice(1, -1).forEach(pt => {
                xml += `              <mxPoint x="${pt.x}" y="${pt.y}" />\n`;
            });
            xml += `            </Array>\n`;
        }
        
        xml += `          </mxGeometry>\n`;
        xml += `        </mxCell>\n`;

        // If edge carries a label, place it as an absolute transparent borderless vertex cell in draw.io for perfect clean representation
        if (edge.label && edge.labelPos) {
            const labelText = edge.label;
            const lx = edge.labelPos.x - 20;
            const ly = edge.labelPos.y - 12;
            const styleLabel = `text;html=1;align=center;verticalAlign=middle;resizable=0;points=[];autosize=1;strokeColor=none;fillColor=none;fontFamily=${fontName};fontSize=12;fontColor=#18181b;`;
            xml += `        <mxCell id="${edgeId}-label" value="${escapeXml(labelText)}" style="${styleLabel}" vertex="1" parent="1">\n`;
            xml += `          <mxGeometry x="${lx}" y="${ly}" width="40" height="24" as="geometry" />\n`;
            xml += `        </mxCell>\n`;
        }
    });

    xml += `      </root>\n`;
    xml += `    </mxGraphModel>\n`;
    xml += `  </diagram>\n`;
    xml += `</mxfile>\n`;

    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = title.replace(/\s+/g, '_') + '.drawio';
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

    return (
    <div className={`w-full h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="w-full h-screen bg-zinc-50 dark:bg-[#1C1C1F] flex flex-col font-sans overflow-hidden transition-colors duration-300">
      {!viewMode && (
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#232328] flex items-center justify-between px-6 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-lg shadow-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-white dark:text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white uppercase">
              GOST.Flow <span className="text-zinc-400 dark:text-zinc-600 font-medium">v2.0</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Theme:</span>
              <button 
                onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
                className="bg-zinc-100 dark:bg-zinc-800 border-none rounded text-xs px-2 py-1 font-semibold text-zinc-700 dark:text-zinc-300 outline-none hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              >
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </button>
              <div className="hidden md:block w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1"></div>
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Font:</span>
              <select 
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="bg-zinc-100 dark:bg-zinc-800 border-none rounded text-xs px-2 py-1 font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
              >
                <option value="monospace">Monospace</option>
                <option value="Inter, sans-serif">Sans-serif (Inter)</option>
                <option value="Times New Roman, serif">Serif (Times)</option>
              </select>
            </div>
          </div>
        </header>
      )}

      <main className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
        {showSidebar && !viewMode && (
          <>
            <section className="w-full md:w-auto border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-[#1C1C1F] flex flex-col shrink-0 relative z-20 shadow-[1px_0_10px_rgba(0,0,0,0.03)] dark:shadow-[1px_0_10px_rgba(0,0,0,0.2)] transition-colors duration-300"
                     style={{ width: leftWidth }}>
              <div className="px-4 py-3 bg-white dark:bg-[#232328] border-b border-zinc-200 dark:border-zinc-800/80 flex justify-between items-center shadow-sm z-10 transition-colors duration-300">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
                    Source Code Editor
                    <select className="ml-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                            value={language} onChange={(e) => {
                                const newLang = e.target.value;
                                setLanguage(newLang);
                            }}>
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                    </select>
                </span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowSidebar(false)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 p-1" title="Hide Editor">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                    </button>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </div>
              </div>
              <div id="code-editor-scroller" className="flex-grow overflow-auto bg-[#fafafa] dark:bg-[#18181A] relative transition-colors duration-300">
                <div 
                    className="w-full min-h-full p-4 flex flex-row items-start cursor-text"
                    onClick={(e) => {
                        // Only focus if clicking the empty space or container, not the editor itself or line numbers
                        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('flex-grow')) {
                            const textarea = document.querySelector('#code-editor-scroller textarea') as HTMLTextAreaElement;
                            if (textarea) {
                                textarea.focus();
                                // Move cursor to the end
                                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                            }
                        }
                    }}
                >
                    <style>{`
                        .npm__react-simple-code-editor__textarea { outline: none !important; white-space: pre !important; }
                        pre { white-space: pre !important; }
                    `}</style>
                    <div className="flex select-none font-mono text-[13px] leading-relaxed text-right text-zinc-400 dark:text-zinc-500 border-r border-zinc-200/60 dark:border-zinc-800/80 pr-2 mr-3 flex-col shrink-0 transition-colors duration-300" style={{ minWidth: '2.5rem', lineHeight: '1.625' }}>
                        {code.split('\n').map((_, idx) => {
                            const isHighlighted = hoveredLineIndex === idx;
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => {
                                        setHoveredLineIndex(idx);
                                        const res = findGraphAndNodeByLine(idx);
                                        if (res) {
                                            setActiveTab(res.graphIdx);
                                            setActivePage(res.pageIdx, res.graphIdx);
                                            setHighlightedNodeId(res.nodeId);
                                        }
                                    }}
                                    className={`cursor-pointer px-1 transition-colors rounded ${isHighlighted ? 'bg-yellow-200 dark:bg-yellow-900/40 font-bold text-yellow-800 dark:text-yellow-500' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-400'}`}>
                                    {idx + 1}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex-grow w-0 relative overflow-x-auto">
                        <Editor
                            value={code}
                            onValueChange={code => setCode(code)}
                            highlight={code => {
                                const grammar = language === 'cpp' ? Prism.languages.cpp : Prism.languages.python;
                                return grammar ? Prism.highlight(code, grammar, language) : code;
                            }}
                            padding={0}
                            className="font-mono text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-300 transition-colors duration-300"
                            style={{
                                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                minHeight: '100%',
                                whiteSpace: 'pre',
                            }}
                        />
                    </div>
                </div>
              </div>
            </section>
            
            <div className="w-1 cursor-col-resize hover:bg-emerald-500/50 bg-transparent shrink-0 z-30 transition-colors hidden md:block"
                 onMouseDown={(e) => {
                     isDragging.current = true;
                     document.body.style.cursor = 'col-resize';
                     e.preventDefault();
                 }} />
          </>
        )}

        <section className="flex-grow bg-[#eef2f6] dark:bg-[#121214] relative flex flex-col items-center overflow-hidden transition-colors duration-300">
          {!viewMode && (
            <div className="w-full bg-white dark:bg-[#232328] border-b border-zinc-200 dark:border-zinc-800/80 z-20 flex px-4 pt-4 shadow-sm flex-col shrink-0 overflow-visible transition-colors duration-300">
              <div className="flex flex-wrap gap-y-1">
                  {graphs.map((graph, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveTab(idx)}
                      className={`px-4 py-2 text-xs font-semibold rounded-t-lg border border-b-0 transition-colors mr-1 ${activeTab === idx ? 'bg-[#eef2f6] dark:bg-[#121214] border-zinc-300 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 shadow-[0_2px_0_0_#eef2f6] dark:shadow-[0_2px_0_0_#121214]' : 'bg-zinc-50 dark:bg-[#1C1C1F] border-zinc-200 dark:border-zinc-800/80 text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#28282B]'}`}
                      style={activeTab === idx ? { transform: 'translateY(1px)' }  : {}}
                    >
                      {graph.title}
                    </button>
                  ))}
              </div>

            </div>
          )}
          <div className="w-full sticky top-0 z-30 shrink-0 shadow-sm border-b border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-[#232328]/90 backdrop-blur transition-colors duration-300">
              {activeGraph && activeGraph.pages.length > 1 && (
                  <div className="w-full px-4 py-2 flex items-center justify-center gap-2 border-t border-zinc-200 dark:border-zinc-800/80 shadow-[inset_0_2px_4px_-2px_rgba(0,0,0,0.05)] dark:shadow-none transition-colors duration-300">
                     <button
                        onClick={() => setActivePage(p => Math.max(0, p - 1))}
                        disabled={activePage === 0}
                        className="px-3 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800 transition-colors"
                     >
                        ← Пред. страница
                     </button>
                     <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 transition-colors">
                        Страница {activePage + 1} из {activeGraph.pages.length}
                     </span>
                     <button
                        onClick={() => setActivePage(p => Math.min(activeGraph.pages.length - 1, p + 1))}
                        disabled={activePage === activeGraph.pages.length - 1}
                        className="px-3 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800 transition-colors"
                     >
                        След. страница →
                     </button>
                  </div>
              )}
          </div>


          {!showSidebar && !viewMode && (
            <div className="absolute top-24 left-6 z-20">
              <button 
                className="flex items-center gap-2 bg-white/90 dark:bg-[#232328]/90 backdrop-blur px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700/80 shadow-sm hover:bg-zinc-50 dark:hover:bg-[#2E2E33] text-zinc-600 dark:text-zinc-300 text-sm font-medium transition-colors"
                onClick={() => setShowSidebar(true)}
              >
                <Code className="w-4 h-4" />
                <span>Показать редактор</span>
              </button>
            </div>
          )}

          <div className="absolute top-24 right-4 z-50 flex flex-col gap-2">
            <button 
              onClick={() => setViewMode(!viewMode)}
              className="flex items-center justify-center p-2 bg-white/90 dark:bg-[#232328]/90 backdrop-blur rounded-lg border border-zinc-300 dark:border-zinc-700/80 shadow-sm hover:bg-zinc-50 dark:hover:bg-[#2E2E33] text-zinc-600 dark:text-zinc-300 transition-colors"
              title={viewMode ? "Выйти из режима просмотра" : "Режим просмотра"}
            >
              {viewMode ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => {
                  let name = activeGraph?.title || 'graph';
                  if (activeGraph && activeGraph.pages.length > 1) {
                      name += `_стр_${activePage + 1}`;
                  }
                  downloadSvg(`graph-svg-${activeTab}`, name);
              }}
              className="flex items-center gap-2 justify-center px-3 py-2 bg-white/90 dark:bg-[#232328]/90 backdrop-blur rounded-lg border border-zinc-300 dark:border-zinc-700/80 shadow-sm hover:bg-zinc-50 dark:hover:bg-[#2E2E33] text-zinc-600 dark:text-zinc-300 font-medium text-xs transition-colors"
              title="Скачать SVG"
            >
              <Code className="w-4 h-4" />
              SVG
            </button>
            <button 
              onClick={() => {
                  let name = activeGraph?.title || 'graph';
                  if (activeGraph && activeGraph.pages.length > 1) {
                      name += `_стр_${activePage + 1}`;
                  }
                  downloadPng(`graph-svg-${activeTab}`, name);
              }}
              className="flex items-center gap-2 justify-center px-3 py-2 bg-white/90 dark:bg-[#232328]/90 backdrop-blur rounded-lg border border-zinc-300 dark:border-zinc-700/80 shadow-sm hover:bg-zinc-50 dark:hover:bg-[#2E2E33] text-zinc-600 dark:text-zinc-300 font-medium text-xs transition-colors"
              title="Скачать PNG"
            >
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              PNG
            </button>
            <button 
              onClick={() => {
                  let name = activeGraph?.title || 'graph';
                  if (activeGraph && activeGraph.pages.length > 1) {
                      name += `_стр_${activePage + 1}`;
                  }
                  downloadDrawio(name, fontFamily);
              }}
              className="flex items-center gap-2 justify-center px-3 py-2 bg-white/90 dark:bg-[#232328]/90 backdrop-blur rounded-lg border border-zinc-300 dark:border-zinc-700/80 shadow-sm hover:bg-zinc-50 dark:hover:bg-[#2E2E33] text-zinc-600 dark:text-zinc-300 font-medium text-xs transition-colors"
              title="Экспорт в draw.io (.drawio)"
            >
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span>Draw.io XML</span>
            </button>
            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1"></div>
            <button 
              onClick={() => {
                  setOverrides({});
                  setHistory([{}]);
                  setHistoryIndex(0);
                  localStorage.removeItem('blockcraft_overrides');
                  localStorage.removeItem('blockcraft_history');
                  localStorage.removeItem('blockcraft_historyIndex');
              }}
              className="flex items-center gap-2 justify-center px-3 py-2 bg-white/90 dark:bg-[#232328]/90 backdrop-blur rounded-lg border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-xs transition-colors"
              title="Сбросить все перемещения узлов (решает баг с наложением при вставке нового кода)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              <span>Сбросить кэш позиций</span>
            </button>
          </div>

          

          <div className="flex-1 w-full h-full overflow-y-auto relative z-10 p-4 shrink-0 flex flex-col items-center justify-start">
              {activeGraph && activeGraphPage && (
                <>
                  <svg 
                    id={`graph-svg-${activeTab}`}
                    width={activeGraphPage.width} 
                    height={activeGraphPage.height} 
                    viewBox={`0 0 ${activeGraphPage.width} ${activeGraphPage.height}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="filter drop-shadow-md shadow-lg shadow-zinc-200/50 dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] overflow-visible bg-white dark:bg-[#1E1E24] border border-zinc-100 dark:border-zinc-800/80 p-6 rounded-lg my-4 transition-colors duration-300"

                  >
                    <defs>
                      <marker id="arrowhead-light" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="#18181b" />
                      </marker>
                      <marker id="arrowhead-dark" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="#d4d4d8" />
                      </marker>
                    </defs>

                    {activeGraphPage.edges.map((edge, i) => (
                        <g 
                           key={edge.id || `edge-${i}`} 
                           opacity={selectedElement?.type === 'edge' && selectedElement.id === edge.id ? 0.5 : 1}
                           className="group"
                        >
                           <EdgePolyline edge={edge} theme={theme} />
                           {edge.segments?.map((seg, idx) => {
                                // use 1-indexed to match data structure
                                let segmentKey = idx + 1;
                                
                                let startCircle = { x: seg.startX, y: seg.startY };
                                let endCircle = { x: seg.endX, y: seg.endY };
                                
                                return (
                                   <g key={segmentKey}>
                                       <line 
                                           x1={seg.startX} y1={seg.startY}
                                           x2={seg.endX} y2={seg.endY}
                                           stroke="transparent"
                                           strokeWidth="20"
                                           className="pointer-events-auto outline-none cursor-pointer"
                                           onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setSelectedElement({ type: 'edge', id: edge.id!, segment: segmentKey });
                                           }}
                                       />
                                   </g>
                               );
                           })}
                        </g>
                    ))}

                    {activeGraphPage.nodes.map((node) => (
                      <g 
                        key={node.id} 
                        className={`cursor-pointer ${selectedElement?.type === 'node' && selectedElement.id === node.id ? 'opacity-70' : 'opacity-100'} transition-opacity`}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedElement({ type: 'node', id: node.id });
                            setDragState({
                                id: node.id,
                                type: 'node',
                                startX: e.pageX,
                                startY: e.pageY,
                                startDx: overrides[activeTab]?.nodes?.[node.id]?.dx || 0,
                                startDy: overrides[activeTab]?.nodes?.[node.id]?.dy || 0
                            });
                            handleNodeClick(node);
                        }}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingNode({ id: node.id, text: node.text });
                        }}
                      >
                        <GostShape 
                          node={node} 
                          highlighted={highlightedNodeId === node.id || (node.lineIndex !== undefined && node.lineIndex !== null && node.lineIndex === hoveredLineIndex)} 
                          fontFamily={fontFamily}
                          theme={theme}
                        />
                      </g>
                    ))}
                  </svg>
                  
                  {editingNode && (
                     <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-sm">
                         <div className="bg-white p-4 rounded-xl shadow-xl flex flex-col gap-3 min-w-[300px]"
                              onClick={e => e.stopPropagation()}>
                             <div className="flex justify-between items-center">
                                 <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-500">Edit Node Text</h3>
                                 <button onClick={() => setEditingNode(null)} className="text-zinc-400 hover:text-zinc-600 rounded p-1">
                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                 </button>
                             </div>
                             <textarea 
                                 className="w-full h-32 p-3 border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                                 autoFocus
                                 value={editingNode.text}
                                 onChange={(e) => setEditingNode({ ...editingNode, text: e.target.value })}
                                 onKeyDown={(e) => {
                                     if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                         const next = JSON.parse(JSON.stringify(overridesRef.current));
                                         if (!next[activeTab]) next[activeTab] = { nodes: {}, edges: {} };
                                         if (!next[activeTab].nodes) next[activeTab].nodes = {};
                                         if (!next[activeTab].nodes[editingNode.id]) next[activeTab].nodes[editingNode.id] = {};
                                         next[activeTab].nodes[editingNode.id].text = editingNode.text;
                                         pushHistory(next);
                                         setEditingNode(null);
                                     }
                                 }}
                             />
                             <div className="flex justify-between items-center text-xs text-zinc-400">
                                <span>Press <kbd className="bg-zinc-100 px-1 rounded">Cmd+Enter</kbd> to save</span>
                                <button className="bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-800"
                                        onClick={() => {
                                            const next = JSON.parse(JSON.stringify(overridesRef.current));
                                            if (!next[activeTab]) next[activeTab] = { nodes: {}, edges: {} };
                                            if (!next[activeTab].nodes) next[activeTab].nodes = {};
                                            if (!next[activeTab].nodes[editingNode.id]) next[activeTab].nodes[editingNode.id] = {};
                                            next[activeTab].nodes[editingNode.id].text = editingNode.text;
                                            pushHistory(next);
                                            setEditingNode(null);
                                        }}>
                                    Save
                                </button>
                             </div>
                         </div>
                     </div>
                  )}
                </>
              )}

              {graphs.length === 0 && (
                  <div className="flex w-full h-full items-center justify-center text-zinc-400">
                      Введите код, чтобы построить блок-схему
                  </div>
              )}
            </div>
        </section>
      </main>

      {!viewMode && (
        <footer className="h-8 border-t border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#232328] flex items-center px-6 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium shrink-0 justify-between relative z-30 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> <span className="hidden sm:inline">AST Parser Connected</span></span>
            <span className="hidden sm:inline h-3 w-[1px] bg-zinc-200 dark:bg-zinc-700"></span>
            <span className="hidden sm:inline">Format: SVG/Vector</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Python 3.x Dialect</span>
            <span>UTF-8</span>
          </div>
        </footer>
      )}
    </div>
    </div>
  );
}

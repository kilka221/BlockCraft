export function translatePythonLine(line: string): string {
    const original = line;
    try {
        const cleanLine = line.trim();

        // 1. row.get pattern for dictionaries
        const matchDictGet = cleanLine.match(/^([a-zA-Z0-9_]+)\[['"]([a-zA-Z0-9_]+)['"]\]\s*=\s*(int|float)?\s*\(?\s*\1\.get\(\s*['"]\2['"]\s*,\s*(.*?)\s*\)\s*\)?$/);
        if (matchDictGet) {
            const dictVar = matchDictGet[1];
            const key = matchDictGet[2];
            const cast = matchDictGet[3];
            const defaultVal = matchDictGet[4];
            const castStr = cast === 'int' ? 'целое значение' : cast === 'float' ? 'вещественное значение' : 'значение';
            return `Присвоить полю ${key} словаря ${dictVar} ${castStr}:\nесли ключ ${key} уже существует – взять его значение,\nиначе взять ${defaultVal}`;
        }

        // 2. dict type cast pattern: row['width'] = float(row['width'])
        const matchTypeCast = cleanLine.match(/^([a-zA-Z0-9_]+)\[['"]([a-zA-Z0-9_]+)['"]\]\s*=\s*(float|int)\(\s*\1\[['"]\2['"]\]\s*\)$/);
        if (matchTypeCast) {
            const field = matchTypeCast[2];
            const typeCast = matchTypeCast[3];
            if (typeCast === 'float') {
                return `Приведение значения поля ${field} к вещественному типу (float)`;
            } else {
                return `Приведение значения поля ${field} к целочисленному типу (int)`;
            }
        }

        // 2b. simple variable type cast: x = float(x)
        const matchVarTypeCast = cleanLine.match(/^([a-zA-Z0-9_]+)\s*=\s*(float|int)\(\s*\1\s*\)$/);
        if (matchVarTypeCast) {
            const varName = matchVarTypeCast[1];
            const typeCast = matchVarTypeCast[2];
            if (typeCast === 'float') {
                return `Приведение значения переменной ${varName} к вещественному типу (float)`;
            } else {
                return `Приведение значения переменной ${varName} к целочисленному типу (int)`;
            }
        }

        // 3. Custom writer / reader / append logic
        if (cleanLine === 'writer.writeheader()') {
            return 'Записать заголовки полей в CSV файл';
        }
        if (cleanLine.startsWith('writer.writerows(')) {
            const inside = cleanLine.match(/writer\.writerows\((.*?)\)/);
            return `Записать строки ${inside ? inside[1] : 'данных'} в CSV файл`;
        }
        if (cleanLine.startsWith('writer.writerow(')) {
            const inside = cleanLine.match(/writer\.writerow\((.*?)\)/);
            return `Записать строку ${inside ? inside[1] : 'данных'} в CSV файл`;
        }
        if (cleanLine.includes('.append(')) {
            const matchAppend = cleanLine.match(/^([a-zA-Z0-9_.]+)\.append\((.*?)\)$/);
            if (matchAppend) {
                return `Добавить ${matchAppend[2]} в список ${matchAppend[1]}`;
            }
        }
        if (cleanLine.startsWith('round(') || cleanLine.match(/^round\((.*?),\s*([0-9]+)\)$/)) {
            const matchRound = cleanLine.match(/^round\((.*?),\s*([0-9]+)\)$/);
            if (matchRound) {
                return `${matchRound[1]}, округлённое до ${matchRound[2]} знаков после запятой`;
            }
        }

        let right = cleanLine;
        
        // Strip assignment prefix if present, e.g. "total_in_stock = "
        const mAssign = cleanLine.match(/^([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
        if (mAssign) {
            right = mAssign[2].trim();
        }

        const translateCond = (c: string): string => {
            let res = c.trim();
            
            // Translate file existence checks
            res = res.replace(/not\s+os\.path\.exists\((.*?)\)/g, "файл $1 не существует");
            res = res.replace(/os\.path\.exists\((.*?)\)/g, "файл $1 существует");
            
            // If complex 'or' condition, split and translate in recursion
            if (res.includes(' or ')) {
                let parts = res.split(' or ').map(p => translateCond(p));
                parts = parts.map(p => p.includes(' и ') ? `(${p})` : p);
                return parts.join(' или ');
            }

            // Global replace 'in' with item['name'] specifically
            res = res.replace(/([a-zA-Z0-9_().]+)\.lower\(\)\s+in\s+([a-zA-Z0-9_]+)\[['"]name['"]\]\.lower\(\)/g, "имя элемента содержит $1 (без учёта регистра)");
            res = res.replace(/([a-zA-Z0-9_().]+)\s+in\s+([a-zA-Z0-9_]+)\[['"]name['"]\]/g, "имя элемента содержит $1");

            // Global replace generic in
            res = res.replace(/([a-zA-Z0-9_().]+)\.lower\(\)\s+in\s+([a-zA-Z0-9_().]+)\.lower\(\)/g, "$1 содержится в $2 (без учёта регистра)");
            res = res.replace(/([a-zA-Z0-9_().]+)\s+in\s+([a-zA-Z0-9_().]+)/g, "$1 содержится в $2");

            // Subscript translations for name/id/title
            res = res.replace(/\b[a-zA-Z0-9_]+\[['"]name['"]\]/g, "имя элемента");
            res = res.replace(/\b[a-zA-Z0-9_]+\[['"]id['"]\]/g, "id элемента");
            res = res.replace(/\b[a-zA-Z0-9_]+\[['"]title['"]\]/g, "название элемента");

            // Clean functions
            res = res.replace(/\.lower\(\)/g, ' без учёта регистра');
            res = res.replace(/\.isdigit\(\)/g, ' является числом');

            // Boolean statuses
            res = res.replace(/\b([a-zA-Z0-9_]+\.(?:is_[a-zA-Z0-9_]+|done|loaded|active|selected))\b/g, "$1 истинно");
            res = res.replace(/\b(_\.(?:is_available|active|selected|done|loaded))\b/g, "$1 истинно");

            // Relational/logical operators (do None checks FIRST to prevent "not" conflicts)
            res = res.replace(/\bis\s+not\s+None\b/g, 'не равно None');
            res = res.replace(/\bis\s+None\b/g, 'равно None');
            
            res = res.replace(/\band\b/g, 'и');
            res = res.replace(/\bor\b/g, 'или');
            res = res.replace(/\bnot\b/g, 'не');
            res = res.replace(/==/g, 'равно');
            res = res.replace(/!=/g, 'не равно');
            res = res.replace(/>=/g, 'не меньше');
            res = res.replace(/<=/g, 'не больше');
            res = res.replace(/>/g, 'больше');
            res = res.replace(/</g, 'меньше');
            res = res.replace(/=/g, 'равно');

            return res.replace(/\s+/g, ' ').trim();
        };

        const hasUnbalancedBrackets = (s: string): boolean => {
            let p = 0, b = 0, c = 0;
            for (const char of s) {
                if (char === '(') p++; else if (char === ')') p--;
                if (char === '[') b++; else if (char === ']') b--;
                if (char === '{') c++; else if (char === '}') c--;
                if (p < 0 || b < 0 || c < 0) return true;
            }
            return p !== 0 || b !== 0 || c !== 0;
        };

        const parseComp = (inner: string) => {
            const m = inner.match(/^(.*?)\s+for\s+(.*?)\s+in\s+(.*?)(?:\s+if\s+(.*))?$/);
            if (m) {
                const expr = m[1].trim();
                const v = m[2].trim();
                const iter = m[3].trim();
                const cond = m[4] ? m[4].trim() : null;
                if (expr === '' || hasUnbalancedBrackets(expr) || hasUnbalancedBrackets(v) || hasUnbalancedBrackets(iter) || (cond && hasUnbalancedBrackets(cond))) {
                    return null;
                }
                return { expr, v, iter, cond };
            }
            return null;
        };

        const cleanOuterBrackets = (s: string): string => {
            let str = s.trim();
            if (str.startsWith('[') && str.endsWith(']')) {
                return str.substring(1, str.length - 1).trim();
            }
            return str;
        };

        // 1. sum, any, all, min, max
        const mFunc = right.match(/^(sum|any|all|min|max)\((.*)\)$/);
        if (mFunc) {
            const func = mFunc[1];
            const arg = cleanOuterBrackets(mFunc[2]);
            const cp = parseComp(arg);
            if (cp) {
                if (func === 'sum') {
                    let res = `Подсчитать сумму ${cp.expr} для ${cp.v} из ${cp.iter}`;
                    if (cp.cond) res += `, где ${translateCond(cp.cond)}`;
                    return res;
                } else if (func === 'any') {
                    const condText = translateCond(cp.expr);
                    let res = `Проверить, есть ли хотя бы один ${cp.v} в ${cp.iter}, такой что ${condText}`;
                    if (cp.cond) res += ` и ${translateCond(cp.cond)}`;
                    return res;
                } else if (func === 'all') {
                    const condText = translateCond(cp.expr);
                    let res = `Проверить, все ли ${cp.v} в ${cp.iter} удовлетворяют условию ${condText}`;
                    if (cp.cond) res += `, где ${translateCond(cp.cond)}`;
                    return res;
                } else if (func === 'min' || func === 'max') {
                    const op = func === 'min' ? 'минимум' : 'максимум';
                    let res = `Найти ${op} ${cp.expr} среди ${cp.v} из ${cp.iter}`;
                    if (cp.cond) res += `, где ${translateCond(cp.cond)}`;
                    return res;
                }
            }
        }

        // 1b. next(comprehension, default)
        const mNext = right.match(/^next\(\s*(?:\(\s*(.*?)\s*\)|(.*?))\s*(?:,\s*(.*?))?\s*\)$/);
        if (mNext) {
            const inner = (mNext[1] || mNext[2] || "").trim();
            const defaultVal = mNext[3] ? mNext[3].trim() : null;
            const cp = parseComp(inner);
            if (cp) {
                let coll = cp.iter;
                if (coll.endsWith('.values()')) {
                    coll = `значений ${coll.replace(/\.values\(\)$/, '')}`;
                } else if (coll.endsWith('.keys()')) {
                    coll = `ключей ${coll.replace(/\.keys\(\)$/, '')}`;
                } else if (coll.endsWith('.items()')) {
                    coll = `пар (ключ, значение) из ${coll.replace(/\.items\(\)$/, '')}`;
                }

                let exprText = cp.expr;
                exprText = exprText.replace(/\b[a-zA-Z0-9_]+\[['"]name['"]\]/g, "имя элемента");
                exprText = exprText.replace(/\b[a-zA-Z0-9_]+\[['"]id['"]\]/g, "id элемента");
                exprText = exprText.replace(/\b[a-zA-Z0-9_]+\[['"]title['"]\]/g, "название элемента");

                let res = "";
                if (cp.expr === cp.v) {
                    res = `Найти первый элемент из ${coll}`;
                } else {
                    res = `Найти "${exprText}" первого элемента из ${coll}`;
                }
                
                if (cp.cond) {
                    res += `, где ${translateCond(cp.cond)}`;
                }
                
                if (defaultVal !== null) {
                    res += ` (иначе ${defaultVal})`;
                }
                return res;
            }
        }

        // 2. len(list comprehension)
        const mLen = right.match(/^len\(\s*\[(.*?)\]\s*\)$/);
        if (mLen) {
            const cp = parseComp(mLen[1]);
            if (cp) {
                let res = `Подсчитать количество ${cp.v} в ${cp.iter}`;
                if (cp.cond) res += `, где ${translateCond(cp.cond)}`;
                return res;
            }
        }

        // 3. sep.join(...)
        const mJoin = right.match(/^(?:'([^']*)'|"([^"]*)")\.join\((.*)\)$/);
        if (mJoin) {
            const sep = mJoin[1] !== undefined ? mJoin[1] : mJoin[2];
            let innerArg = mJoin[3].trim();
            if (innerArg.startsWith('[') && innerArg.endsWith(']')) {
                innerArg = innerArg.substring(1, innerArg.length - 1).trim();
            }
            let isSorted = false;
            const sMatch = innerArg.match(/^sorted\((.*)\)$/);
            if (sMatch) {
                innerArg = sMatch[1].trim();
                isSorted = true;
                if (innerArg.startsWith('[') && innerArg.endsWith(']')) {
                    innerArg = innerArg.substring(1, innerArg.length - 1).trim();
                }
            }
            const cp = parseComp(innerArg);
            if (cp) {
                let res = `Сформировать строку из `;
                if (isSorted) {
                    res += `отсортированных ${cp.expr}`;
                } else {
                    res += `${cp.expr}`;
                }
                if (sep !== undefined) res += `, разделённых '${sep}'`;
                else res += `, соединённых подряд`;
                res += `, для ${cp.v} из ${cp.iter}`;
                if (cp.cond) res += `, где ${translateCond(cp.cond)}`;
                return res;
            }
        }

        // 4. sorted
        const mSorted = right.match(/^sorted\((.*?),\s*key\s*=\s*(.*?)(?:,\s*reverse\s*=\s*(True|False))?\)$/);
        if (mSorted) {
            const iter = mSorted[1].trim();
            let keyStr = mSorted[2].trim();
            const isReverse = mSorted[3] === 'True';
            const direction = isReverse ? 'убыванию' : 'возрастанию';
            if (keyStr.startsWith('lambda ')) {
                const lamMatch = keyStr.match(/^lambda\s+[^:]+:\s*(.*)$/);
                if (lamMatch) keyStr = lamMatch[1].trim();
            }
            return `Получить отсортированный список ${iter} по ключу ${keyStr} (по ${direction})`;
        }

        // 5. list/set/dict comprehensions
        const mList = right.match(/^\[(.*?)\]$/);
        if (mList) {
            const dMatch = mList[1].match(/^(.*?)\s+for\s+(.*?)\s+in\s+(.*?)\s+for\s+(.*?)\s+in\s+(.*?)$/);
            if (dMatch) {
                return `Создать список ${dMatch[1].trim()} из ${dMatch[3].trim()} с двойным циклом`; 
            }
            const cp = parseComp(mList[1]);
            if (cp) {
                let res = `Создать список ${cp.expr} из ${cp.iter}`;
                if (cp.cond) res += `, где ${translateCond(cp.cond)}`;
                return res;
            }
        }

        const mSet = right.match(/^\{(.*?)\}$/);
        if (mSet) {
            const inner = mSet[1].trim();
            if (inner.includes(':') && inner.includes('[') && inner.includes('for')) {
                return `Сформировать словарь с вложенными списками`;
            }
            const firstForIndex = inner.indexOf(' for ');
            if (firstForIndex !== -1) {
                const prefix = inner.substring(0, firstForIndex).trim();
                if (prefix.includes(':')) {
                    const colonIdx = prefix.indexOf(':');
                    const keyExpr = prefix.substring(0, colonIdx).trim();
                    const valExpr = prefix.substring(colonIdx + 1).trim();
                    const rest = inner.substring(firstForIndex).trim();
                    const cpRest = rest.match(/^for\s+(.*?)\s+in\s+(.*?)(?:\s+if\s+(.*))?$/);
                    if (cpRest) {
                        const v = cpRest[1].trim();
                        const iter = cpRest[2].trim();
                        const cond = cpRest[3] ? cpRest[3].trim() : null;
                        if (!hasUnbalancedBrackets(keyExpr) && !hasUnbalancedBrackets(valExpr) && !hasUnbalancedBrackets(v) && !hasUnbalancedBrackets(iter) && (!cond || !hasUnbalancedBrackets(cond))) {
                            let res = `Создать словарь с ключами ${keyExpr} и значениями ${valExpr} из ${iter}`;
                            if (cond) res += `, где ${translateCond(cond)}`;
                            return res;
                        }
                    }
                }
            } else {
                const cp = parseComp(inner);
                if (cp) {
                    let res = `Создать множество ${cp.expr} из ${cp.iter}`;
                    if (cp.cond) res += `, где ${translateCond(cp.cond)}`;
                    return res;
                }
            }
        }

        // 6. map and filter inside list()
        const mMapFilter = right.match(/^list\(map\(\s*lambda\s+([a-zA-Z0-9_]+)\s*:\s*(.*?)\s*,\s*filter\(\s*lambda\s+([a-zA-Z0-9_]+)\s*:\s*(.*?)\s*,\s*(.*?)\s*\)\s*\)\)$/);
        if (mMapFilter) {
            const mapExpr = mMapFilter[2].trim().replace(/\*\*/g, '');
            const filterCond = mMapFilter[4].trim();
            const iter = mMapFilter[5].trim();
            const condText = filterCond === 'x%2==0' || filterCond === 'x % 2 == 0' ? 'чётным числам' : translateCond(filterCond);
            return `Создать список, применив ${mapExpr} к ${condText} из ${iter}`;
        }

        const mMap = right.match(/^list\(map\((.*?),\s*(.*?)\)\)$/);
        if (mMap) {
            const func = mMap[1].trim();
            const iter = mMap[2].trim();
            if (func.startsWith('lambda ')) {
                const lamMatch = func.match(/^lambda\s+([a-zA-Z0-9_, ]+):\s*(.*)$/);
                if (lamMatch) {
                    const v = lamMatch[1].trim();
                    const expr = lamMatch[2].trim();
                    if (expr.startsWith('(') && expr.endsWith(')')) {
                        return `Создать список, применив функцию к ${iter}`;
                    } else if (expr.includes('**') || expr.includes('*')) {
                        return `Создать список, применив функцию к ${iter}`;
                    } else {
                        return `Создать список ${expr}, применив функцию к ${iter}`;
                    }
                }
            } else {
                return `Создать список, применив ${func} к каждому элементу ${iter}`;
            }
        }

        const mFilter = right.match(/^list\(filter\((.*?),\s*(.*?)\)\)$/);
        if (mFilter) {
            const func = mFilter[1].trim();
            const iter = mFilter[2].trim();
            if (func === 'None') {
                return `Создать список из ${iter}, исключая falsy значения`;
            }
            if (func.startsWith('lambda ')) {
                const lamMatch = func.match(/^lambda\s+([a-zA-Z0-9_, ]+):\s*(.*)$/);
                if (lamMatch) {
                    const cond = lamMatch[2].trim();
                    return `Создать список из ${iter}, где ${translateCond(cond)}`;
                }
            }
        }

        const mSortedFilter = right.match(/^sorted\(filter\(lambda\s+([a-zA-Z0-9_]+):\s*(.*?),\s*(.*?)\)\)$/);
        if (mSortedFilter) {
            const v = mSortedFilter[1].trim();
            const cond = mSortedFilter[2].trim();
            const iter = mSortedFilter[3].trim();
            const condText = cond === 'x%2==0' || cond === 'x % 2 == 0' ? 'чисел' : iter;
            return `Получить отсортированный список чисел из ${iter}, где ${v}%2==0`;
        }

        return original;
    } catch (e) {
        return original;
    }
}

// Inline test logs to verify patterns behavior
console.log(translatePythonLine("total = sum(item['price'] for item in cart)"));
console.log(translatePythonLine("total = sum(item['quantity'] for item in data if req_name.lower() in item['name'].lower())"));
console.log(translatePythonLine("has_admin = any(user.role == 'admin' for user in users)"));
console.log(translatePythonLine("all_valid = all(item.is_valid for item in data if item is not None)"));
console.log(translatePythonLine("sorted_by_weight = sorted(data, key=lambda x: x['weight'], reverse=True)"));
console.log(translatePythonLine("count = len([x for x in numbers if x % 2 == 0])"));
console.log(translatePythonLine("names_str = \", \".join(user.name for user in users)"));
console.log(translatePythonLine("req_str = \", \".join(f\"{k}: {v}\" for k, v in reqs.items())"));
console.log(translatePythonLine("data_list = list(map(lambda x: x**2, filter(lambda x: x%2==0, numbers)))"));
console.log(translatePythonLine("res = [item for item in data if query.isdigit() and int(query) == item['id'] or query.lower() in item['name'].lower()]"));
console.log(translatePythonLine("item = next((row for row in data if row['id'] == target_id), None)"));
console.log(translatePythonLine("item = next((row for row in data if row['id'] = target_id), None)"));
console.log(translatePythonLine("item = next(row for row in data if row['id'] == target_id)"));
console.log(translatePythonLine("name = next((row['name'] for row in data if row['id'] == target_id), 'Default name')"));

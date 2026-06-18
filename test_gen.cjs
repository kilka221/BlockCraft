"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var content = fs.readFileSync('src/App.tsx', 'utf-8');
var pStart = content.indexOf('export function parsePythonSourceWhole');
var pEnd = content.indexOf('export function parseCppSourceWhole');
var pFunc = content.slice(pStart, pEnd).replace('export function ', 'function ');
// Remove type annotations simplistically
pFunc = pFunc.replace(/:\s*ASTNode\[\]/g, '')
    .replace(/:\s*number\[\]/g, '')
    .replace(/:\s*number/g, '')
    .replace(/:\s*string/g, '')
    .replace(/:\s*any\[\]/g, '')
    .replace(/:\s*any/g, '')
    .replace(/:\s*boolean/g, '');
var script = "\nlet idCounter = 1;\nfunction mathify(t) { return t; }\nfunction cleanIoArgs(argsStr) { return argsStr ? argsStr.replace(/[\"']/g, '') : ''; }\nfunction processAssignment(text) { return text.trim(); }\nfunction consolidateBlocks(nodes) {\n    let result = [];\n    let currentBlock = null;\n    for (let node of nodes) {\n        if (node.type === 'process') {\n            if (!currentBlock) {\n                currentBlock = { type: 'process', id: 'node-' + (idCounter++), text: node.text };\n            } else {\n                currentBlock.text += '\\n' + node.text;\n            }\n        } else {\n            if (currentBlock) { result.push(currentBlock); currentBlock = null; }\n            result.push(node);\n        }\n    }\n    if (currentBlock) result.push(currentBlock);\n    return result;\n}\n\n".concat(pFunc, "\n\nconst code = `def edit_record(data):\n    ui.display_table(data)\n    if not data: return\n    choice = ui.get_int(\"\u0412\u0430\u0448 \u0432\u044B\u0431\u043E\u0440\", min_val=1)\n    if choice is None: return\n\n    match choice:\n        case 1:\n            val = ui.get_string(\"\u041D\u043E\u0432\u043E\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435\"); item['name'] = val if val else item['name']\n        case 2:\n            val = ui.get_string(\"\u041D\u043E\u0432\u044B\u0439 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\"); item['material'] = val if val else item['material']\n        case 3:\n            val = ui.get_float(\"\u041D\u043E\u0432\u0430\u044F \u0434\u043B\u0438\u043D\u0430\", min_val=0.001)\n            if val:\n                item['length'] = val\n        case _:\n            ui.print_error(\"\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u0443\u043D\u043A\u0442.\"); return\n\n    ui.print_message(\"\u0417\u0430\u043F\u0438\u0441\u044C \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0430.\")`;\n\ntry {\n    console.log(JSON.stringify(parsePythonSourceWhole(code), null, 2));\n} catch (e) {\n    console.error(e);\n}\n");
fs.writeFileSync('test_run.js', script);

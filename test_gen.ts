import * as fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');
const pStart = content.indexOf('export function parsePythonSourceWhole');
const pEnd = content.indexOf('export function parseCppSourceWhole');
let pFunc = content.slice(pStart, pEnd).replace('export function ', 'function ');

// Remove type annotations simplistically
pFunc = pFunc.replace(/:\s*ASTNode\[\]/g, '')
             .replace(/:\s*number\[\]/g, '')
             .replace(/:\s*number/g, '')
             .replace(/:\s*string/g, '')
             .replace(/:\s*any\[\]/g, '')
             .replace(/:\s*any/g, '')
             .replace(/:\s*boolean/g, '');

let script = `
let idCounter = 1;
function mathify(t) { return t; }
function cleanIoArgs(argsStr) { return argsStr ? argsStr.replace(/["']/g, '') : ''; }
function processAssignment(text) { return text.trim(); }
function consolidateBlocks(nodes) {
    let result = [];
    let currentBlock = null;
    for (let node of nodes) {
        if (node.type === 'process') {
            if (!currentBlock) {
                currentBlock = { type: 'process', id: 'node-' + (idCounter++), text: node.text };
            } else {
                currentBlock.text += '\\n' + node.text;
            }
        } else {
            if (currentBlock) { result.push(currentBlock); currentBlock = null; }
            result.push(node);
        }
    }
    if (currentBlock) result.push(currentBlock);
    return result;
}

${pFunc}

const code = \`def edit_record(data):
    ui.display_table(data)
    if not data: return
    choice = ui.get_int("Ваш выбор", min_val=1)
    if choice is None: return

    match choice:
        case 1:
            val = ui.get_string("Новое название"); item['name'] = val if val else item['name']
        case 2:
            val = ui.get_string("Новый материал"); item['material'] = val if val else item['material']
        case 3:
            val = ui.get_float("Новая длина", min_val=0.001)
            if val:
                item['length'] = val
        case _:
            ui.print_error("Неверный пункт."); return

    ui.print_message("Запись успешно обновлена.")\`;

try {
    console.log(JSON.stringify(parsePythonSourceWhole(code), null, 2));
} catch (e) {
    console.error(e);
}
`;
fs.writeFileSync('test_run.js', script);

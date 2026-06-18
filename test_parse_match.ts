import * as fs from 'fs';

const appCode = fs.readFileSync('src/App.tsx', 'utf-8');

const parsePythonStart = appCode.indexOf('export function parsePythonSourceWhole');
const parsePythonEnd = appCode.indexOf('export function parseCppSourceWhole');

let fnCode = appCode.substring(parsePythonStart, parsePythonEnd);

fnCode = fnCode.replace('export function parsePythonSourceWhole', 'function parsePythonSourceWhole');

let script = `
let idCounter = 1;

function mathify(text: string) { return text; }

function cleanIoArgs(argsStr: string) {
    if (!argsStr) return '';
    return argsStr.replace(/["']/g, ''); 
}

function processAssignment(text: string) {
    return text.trim();
}

function consolidateBlocks(nodes: any[]) {
    let result: any[] = [];
    let currentBlock: any = null;
    
    for (let node of nodes) {
        if (node.type === 'process') {
            if (!currentBlock) {
                currentBlock = { type: 'process', id: 'node-' + (idCounter++), text: node.text };
            } else {
                currentBlock.text += '\\n' + node.text;
            }
        } else {
            if (currentBlock) {
                result.push(currentBlock);
                currentBlock = null;
            }
            result.push(node);
        }
    }
    
    if (currentBlock) {
        result.push(currentBlock);
    }
    
    return result;
}

const X_SEP = 50;
const Y_SEP = 40;
const Y_MARGIN = 20;

` + fnCode + `

const pythonCode = \`
match choice:
        case 1:
            val = ui.get_string("Новое название")
            item['name'] = val if val else item['name']
        case 2:
            val = ui.get_string("Новый материал")
            item['material'] = val if val else item['material']
        case 3:
            val = ui.get_float("Новая длина", min_val=0.001)
            item['length'] = val if val else item['length']
        case 4:
            val = ui.get_float("Новая ширина", min_val=0.001)
            item['width'] = val if val else item['width']
        case 5:
            val = ui.get_float("Новая высота", min_val=0.001)
            item['height'] = val if val else item['height']
        case 6:
            val = ui.get_float("Новый уд. вес", min_val=0.1)
            item['specific_weight'] = val if val else item['specific_weight']
        case 7:
            val = ui.get_int("Новое кол-во", min_val=0)
            item['quantity'] = val if val is not None else item['quantity']
        case _:
            ui.print_error("Неверный пункт.")
            return

    if choice in [3, 4, 5, 6]:
        pass
\`;

console.log(JSON.stringify(parsePythonSourceWhole(pythonCode), null, 2));
`;

fs.writeFileSync('temp_runner.ts', script);

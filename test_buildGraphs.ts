import { buildGraphs } from './src/App.tsx';
import * as fs from 'fs';

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

try {
    const graphs = buildGraphs(code, 'python');
    fs.writeFileSync('graph_output.json', JSON.stringify(graphs, null, 2));
    console.log("Success! Output written to graph_output.json");
    console.log("Has NaN?", JSON.stringify(graphs).includes('null')); // JSON.stringify converts NaN to null
} catch (e) {
    console.error("Error in buildGraphs:", e);
}

import { translatePythonLine } from './translate';
import { mathify } from './mathify';

let text1 = "sum(item['quantity'] for item in data if req_name.lower() in item['name'].lower())";
let trans = translatePythonLine(text1);
console.log("trans:", trans);
console.log("mathify:", mathify(trans));

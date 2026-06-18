import { readFileSync } from 'fs';

let code = readFileSync('test_code.py', 'utf8');

// I will just mock parser locally
function testRegex() {
    let r = `print("=== РАСЧЕТ СБОРКИ ИЗДЕЛИЙ ===")`
    if (/input\s*\(/.test(r)) console.log("io");
    if (r.startsWith('print(') || r.startsWith('print ')) console.log("print");
}
testRegex();

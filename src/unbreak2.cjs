const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/processedCode \+\= '\n';/g, "processedCode += '\\\\n';");
code = code.replace(/endText = "Конец цикла\n" \+ node\.condition;/g, 'endText = "Конец цикла\\\\n" + node.condition;');

fs.writeFileSync('src/App.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix the \n strings
code = code.replace(/split\('\\\\n'\)/g, "split('\\n')");
code = code.replace(/!== '\\\\n'/g, "!== '\\n'");
code = code.replace(/processedCode \+= '\\\\n';/g, "processedCode += '\\n';");
code = code.replace(/"Конец цикла\\\\n"/g, '"Конец цикла\\n"');

fs.writeFileSync('src/App.tsx', code);

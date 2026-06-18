const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/let outP = \\{x: branchCx, y: lineY \+ 50\\};/g, "let outP = {x: branchCx, y: lineY + 90};");
code = code.replace(/let defOutP = \\{x: defBranchCx, y: lineY \+ 50\\};/g, "let defOutP = {x: defBranchCx, y: lineY + 90};");

fs.writeFileSync('src/App.tsx', code);

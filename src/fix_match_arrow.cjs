const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/\{x: branchCx, y: lineY \+ 30\}/g, '{x: branchCx, y: lineY + 50}');
code = code.replace(/\{x: cx \+ defaultShift, y: lineY \+ 30\}/g, '{x: cx + defaultShift, y: lineY + 50}');
code = code.replace(/labelPos: \{x: branchCx \+ 8, y: lineY \+ 12\}/g, 'labelPos: {x: branchCx + 8, y: lineY + 20}');
code = code.replace(/labelPos: \{x: cx \+ defaultShift \+ 8, y: lineY \+ 12\}/g, 'labelPos: {x: cx + defaultShift + 8, y: lineY + 20}');

fs.writeFileSync('src/App.tsx', code);

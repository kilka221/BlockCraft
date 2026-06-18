const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("let fixedSy = Math.max(0, Math.min(PAGE_H, clipSy - yMin));", "let fixedSy = Math.max(0, Math.min(PAGE_H, clipSy));");
code = code.replace("let fixedEy = Math.max(0, Math.min(PAGE_H, clipEy - yMin));", "let fixedEy = Math.max(0, Math.min(PAGE_H, clipEy));");

fs.writeFileSync('src/App.tsx', code);

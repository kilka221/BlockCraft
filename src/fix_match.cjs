const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

let matchRegex = /let lineY = currentY \+ h\/2 \+ Y_MARGIN\/2;([\s\S]*?)let minBranchCx/m;
let matchReplace = `let lineY = currentY + h/2 + 25;
                allEdges.push({ points: [{x: cx, y: currentY + h/2}, {x: cx, y: lineY}], noArrow: true });
                
                let minBranchCx`;
code = code.replace(matchRegex, matchReplace);

let branchRegex = /let outP = \{x: branchCx, y: lineY \+ Y_MARGIN\/2\};\s*allEdges\.push\(\{\s*points: \[\{x: branchCx, y: lineY\}, \{x: branchCx, y: outP\.y\}\],\s*label: c\.condition,\s*labelPos: \{x: branchCx \+ 5, y: lineY - 10\},\s*noArrow: true\s*\}\);/g;

let branchReplace = `let outP = {x: branchCx, y: lineY + 30};
                    
                    allEdges.push({ 
                        points: [{x: branchCx, y: lineY}, {x: branchCx, y: outP.y}],
                        label: c.condition,
                        labelPos: {x: branchCx + 8, y: lineY + 12},
                        noArrow: true 
                    });`;

code = code.replace(branchRegex, branchReplace);

// Default block arrow
let defBlockRegex = /let defOutP = \{x: cx \+ defaultShift, y: lineY \+ Y_MARGIN\/2\};\s*allEdges\.push\(\{\s*points: \[\{x: cx \+ defaultShift, y: lineY\}, \{x: cx \+ defaultShift, y: defOutP\.y\}\],\s*label: 'Иначе',\s*labelPos: \{x: cx \+ defaultShift \+ 5, y: lineY - 10\},\s*noArrow: true\s*\}\);/g;

let defBlockReplace = `let defOutP = {x: cx + defaultShift, y: lineY + 30};
                    allEdges.push({ 
                        points: [{x: cx + defaultShift, y: lineY}, {x: cx + defaultShift, y: defOutP.y}],
                        label: 'ИНАЧЕ',
                        labelPos: {x: cx + defaultShift + 8, y: lineY + 12},
                        noArrow: true 
                    });`;

code = code.replace(defBlockRegex, defBlockReplace);

// Also top absolute controls positioning to avoid overlapping with tabs
code = code.replace(/className="absolute top-4 right-4 z-50 flex flex-col gap-2"/g, 'className="absolute top-24 right-4 z-50 flex flex-col gap-2"');
code = code.replace(/className="absolute top-16 left-6 z-20"/g, 'className="absolute top-24 left-6 z-20"');

fs.writeFileSync('src/App.tsx', code);

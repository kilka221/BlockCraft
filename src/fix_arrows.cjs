const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// For TRUE branches
let trueEndsRegex = /for \(let pt of trueEnds\) \{([\s\S]*?)\}/;
let trueEndsBody = `
                     let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                     if (pt.from) {
                         let px = pt.limitX || pt.x;
                         allEdges.push({ 
                              points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}, {x: cx, y: commonY}], 
                              ...extra
                         });
                     } else {
                         allEdges.push({ points: [pt, {x: pt.x, y: commonY}, {x: cx, y: commonY}] });
                     }
`;
code = code.replace(trueEndsRegex, `for (let pt of trueEnds) {${trueEndsBody}}`);

// For FALSE branches
let falseEndsRegex = /for \(let pt of falseEnds\) \{([\s\S]*?)\}/;
let falseEndsBody = `
                     let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                     if (pt.from) {
                         let px = pt.limitX || pt.x;
                         allEdges.push({ 
                              points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}, {x: cx, y: commonY}], 
                              ...extra
                         });
                     } else {
                         allEdges.push({ points: [pt, {x: pt.x, y: commonY}, {x: cx, y: commonY}] });
                     }
`;
code = code.replace(falseEndsRegex, `for (let pt of falseEnds) {${falseEndsBody}}`);

// For branchEnds in match
let branchEndsRegex = /for \(let pt of branchEnds\) \{([\s\S]*?)if \(minEndCx < maxEndCx\)/;
let branchEndsBody = `
                    let px = pt.limitX || pt.x;
                    minEndCx = Math.min(minEndCx, px);
                    maxEndCx = Math.max(maxEndCx, px);
                    
                    let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                    if (pt.from) {
                        allEdges.push({ 
                            points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}],
                            ...extra
                        });
                    } else {
                        allEdges.push({ points: [pt, {x: pt.x, y: commonY}] });
                    }
                }
                
`;
code = code.replace(branchEndsRegex, `for (let pt of branchEnds) {${branchEndsBody}    if (minEndCx < maxEndCx)`);

fs.writeFileSync('src/App.tsx', code);
console.log('arrow fix applied');

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

let startIndex = code.indexOf("            } else if (node.type === 'if') {");
let endIndex = code.indexOf("            } else if (node.type === 'match') {");

if (startIndex !== -1 && endIndex !== -1) {
    let before = code.substring(0, startIndex);
    let after = code.substring(endIndex);
    
    let block = code.substring(startIndex, endIndex);

    // Replace the commonY logic!
    let lines = block.split('\n');
    let commonYIdx = lines.findIndex(l => l.includes('let commonY = Math.max(localMax'));
    
    if (commonYIdx !== -1) {
        let newEndLogic = `                let commonY = Math.max(localMax, currentY + h/2) + Y_MARGIN;
                
                // If one terminates, we DO NOT MERGE them. The remaining branch becomes the direct output.
                if (trueTerminates && falseTerminates) {
                    inPts = [];
                } else if (trueTerminates && !falseTerminates) {
                    // False branch survives. It does not merge horizontally!
                    let outPts = [];
                    for (let pt of falseEnds) {
                        let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                        if (pt.from) {
                            let px = (pt as any).limitX || pt.x;
                            // Just draw straight down without horizontal bend
                            allEdges.push({ 
                                points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}], 
                                ...extra
                            });
                            outPts.push({x: px, y: commonY});
                        } else {
                            allEdges.push({ points: [pt, {x: pt.x, y: commonY}], ...extra });
                            outPts.push({x: pt.x, y: commonY});
                        }
                    }
                    inPts = outPts;
                } else if (!trueTerminates && falseTerminates) {
                    // True branch survives.
                    let outPts = [];
                    for (let pt of trueEnds) {
                        let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                        if (pt.from) {
                            let px = (pt as any).limitX || pt.x;
                            allEdges.push({ 
                                points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}], 
                                ...extra
                            });
                            outPts.push({x: px, y: commonY});
                        } else {
                            allEdges.push({ points: [pt, {x: pt.x, y: commonY}], ...extra });
                            outPts.push({x: pt.x, y: commonY});
                        }
                    }
                    inPts = outPts;
                } else {
                    // BOTH survive. We EXECUTED THE MERGE ALGORITHM! (WITH ARROWS)
                    for (let pt of trueEnds) {
                         let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                         if (pt.from) {
                             let px = (pt as any).limitX || pt.x;
                             allEdges.push({ 
                                  points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}, {x: cx, y: commonY}], 
                                  ...extra
                             });
                         } else {
                             allEdges.push({ points: [pt, {x: pt.x, y: commonY}, {x: cx, y: commonY}] });
                         }
                    }
                    for (let pt of falseEnds) {
                         let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                         if (pt.from) {
                             let px = (pt as any).limitX || pt.x;
                             allEdges.push({ 
                                  points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}, {x: cx, y: commonY}], 
                                  ...extra
                             });
                         } else {
                             allEdges.push({ points: [pt, {x: pt.x, y: commonY}, {x: cx, y: commonY}] });
                         }
                    }
                    inPts = [{x: cx, y: commonY, label: '', skipTopVertical: true } as any];
                }
                
                currentY = commonY + Y_MARGIN + (nextH || 0)/2;
                maxReachedY = Math.max(maxReachedY, currentY);
`;
        let beforeEnd = lines.slice(0, commonYIdx).join('\n');
        fs.writeFileSync('src/App.tsx', before + beforeEnd + "\n" + newEndLogic + after);
        console.log("If block rewritten.");
    } else {
        console.log("commonY not found");
    }
} else {
    console.log("startIndex or endIndex not found");
}

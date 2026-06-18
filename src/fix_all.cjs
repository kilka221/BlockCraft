const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Pagination Overlap
code = code.replace(/let SHIFT = \(s > 0\) \? 80 : 0;/g, "let SHIFT = (s > 0) ? 120 : 0;");
code = code.replace(/sNodes.push\(\{ id: \`jump_in_\$\{k\}\`, type: 'circle', text: jumpMap.get\(k\)\!, x: seg.startX, y: 20, height: 40 \}\);/g, 
    "sNodes.push({ id: `jump_in_${k}`, type: 'circle', text: jumpMap.get(k)!, x: seg.startX, y: 40, height: 40 });");
code = code.replace(/sNodes.push\(\{ id: \`jump_out_up_\$\{k\}\`, type: 'circle', text: jumpMap.get\(k\)\!, x: seg.endX, y: 20, height: 40 \}\);/g, 
    "sNodes.push({ id: `jump_out_up_${k}`, type: 'circle', text: jumpMap.get(k)!, x: seg.endX, y: 40, height: 40 });");

code = code.replace(/clipSy = 40;/g, "clipSy = 60;");
code = code.replace(/clipEy = 40;/g, "clipEy = 60;");

// 2. Remove dragging container logic
const divStart = "className={`flex-1 w-full h-full relative z-10 p-4 pt-16 pb-16 flex items-center justify-center";
let idx = code.indexOf(divStart);
if (idx !== -1) {
    let before = code.substring(0, code.lastIndexOf('<div', idx));
    let after = code.indexOf('{activeGraph && activeGraphPage && (', idx);
    code = before + `<div className="flex-1 w-full h-full overflow-y-auto relative z-10 p-4 shrink-0 flex flex-col items-center justify-start">\n              ` + code.substring(after);
}

// 3. Remove dragging from node and edge
code = code.replace(/onMouseDown=\\{\\(e\\) => \\{[\\s\\S]*?setSelectedElement[\\s\\S]*?setDragState[\\s\\S]*?\\}\\}/, "onClick={(e) => { e.stopPropagation(); setSelectedElement({ type: 'node', id: node.id }); }}");
code = code.replace(/onMouseDown=\\{\\(e\\) => \\{\\s*e\\.stopPropagation\\(\\);\\s*setSelectedElement[^}]+\\}\\}/, "onClick={(e) => { e.stopPropagation(); setSelectedElement({ type: 'edge', id: edge.id!, segment: segmentKey }); }}");

// 4. Update IF merging block
let ifBlock = `                    for (let pt of trueEnds) {
                         let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                         if (pt.from) {
                             let px = (pt as any).limitX || pt.x;
                             allEdges.push({ 
                                  points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}, {x: cx, y: commonY}], 
                                  ...extra
                             });
                         } else {
                             allEdges.push({ points: [pt, {x: pt.x, y: commonY}, {x: cx, y: commonY}], ...extra });
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
                             allEdges.push({ points: [pt, {x: pt.x, y: commonY}, {x: cx, y: commonY}], ...extra });
                         }
                    }`;

let newIfBlock = `                    for (let pt of trueEnds) {
                         let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                         if (pt.from) {
                             let px = (pt as any).limitX || pt.x;
                             allEdges.push({ 
                                  points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}, {x: cx, y: commonY}], 
                                  ...extra, noArrow: true
                             });
                         } else {
                             allEdges.push({ points: [pt, {x: pt.x, y: commonY}, {x: cx, y: commonY}], ...extra, noArrow: true });
                         }
                    }
                    for (let pt of falseEnds) {
                         let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                         if (pt.from) {
                             let px = (pt as any).limitX || pt.x;
                             allEdges.push({ 
                                  points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}, {x: cx, y: commonY}], 
                                  ...extra, noArrow: true
                             });
                         } else {
                             allEdges.push({ points: [pt, {x: pt.x, y: commonY}, {x: cx, y: commonY}], ...extra, noArrow: true });
                         }
                    }`;

code = code.replace(ifBlock, newIfBlock);

fs.writeFileSync('src/App.tsx', code);

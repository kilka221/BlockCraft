const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

let startIndex = code.indexOf('    const PAGE_H = 1200;');
let endIndex = code.indexOf('    return { pages, title };');

if (startIndex !== -1 && endIndex !== -1) {
    let before = code.substring(0, startIndex);
    let after = code.substring(endIndex + 29);

    let newCode = `    const PAGE_H = 1200;
    let pages: {nodes: FlowNode[], edges: FlowEdge[], width: number, height: number}[] = [];
    
    if (actualMaxY <= PAGE_H + 50) {
        pages.push({ nodes: allNodes, edges: allEdgesFinal, width: Math.max(finalWidth, 600), height: actualMaxY + 100 });
    } else {
        let maxNodeY = Math.max(...allNodes.map(n => n.y), ...allEdgesFinal.flatMap(e => e.segments ? e.segments.map(s => Math.max(s.startY, s.endY)) : []));
        let maxS = Math.floor(maxNodeY / PAGE_H);
        
        let jumpCounter = 65;
        let jumpMap = new Map<string, string>();

        for (let s = 0; s <= maxS; s++) {
            let sNodes = allNodes.filter(n => n.y >= s * PAGE_H && n.y < (s+1) * PAGE_H).map(n => ({...n, y: n.y - s * PAGE_H}));
            let sEdges: FlowEdge[] = [];
            
            let yMin = s * PAGE_H;
            let yMax = (s+1) * PAGE_H;

            allEdgesFinal.forEach(e => {
                let newSegments: any[] = [];
                let eInS = false;
                if (e.segments) {
                    e.segments.forEach(seg => {
                        let segMinY = Math.min(seg.startY, seg.endY);
                        let segMaxY = Math.max(seg.startY, seg.endY);
                        
                        if (segMaxY < yMin || segMinY > yMax) return; 
                        
                        let sy = seg.startY;
                        let ey = seg.endY;
                        
                        let isDownward = sy <= ey;
                        
                        let clipSy = sy;
                        let clipEy = ey;
                        
                        if (isDownward) {
                            if (sy <= yMin && ey >= yMin) { 
                               clipSy = yMin + 40; 
                               let k = \`\${seg.startX}_\${s-1}_\${s}\`;
                               if (!jumpMap.has(k)) { jumpMap.set(k, String.fromCharCode(jumpCounter++)); }
                               sNodes.push({ id: \`jump_in_\${k}\`, type: 'circle', text: jumpMap.get(k)!, x: seg.startX, y: 20, height: 40 });
                            }
                            if (ey >= yMax && sy <= yMax) { 
                               clipEy = yMax - 40; 
                               let k = \`\${seg.startX}_\${s}_\${s+1}\`;
                               if (!jumpMap.has(k)) { jumpMap.set(k, String.fromCharCode(jumpCounter++)); }
                               sNodes.push({ id: \`jump_out_\${k}\`, type: 'circle', text: jumpMap.get(k)!, x: seg.endX, y: PAGE_H - 20, height: 40 });
                            }
                        } else {
                            if (sy >= yMax && ey <= yMax) { 
                               clipSy = yMax - 40; 
                               let k = \`up_\${seg.startX}_\${s+1}_\${s}\`;
                               if (!jumpMap.has(k)) { jumpMap.set(k, String.fromCharCode(jumpCounter++)); }
                               sNodes.push({ id: \`jump_in_up_\${k}\`, type: 'circle', text: jumpMap.get(k)!, x: seg.startX, y: PAGE_H - 20, height: 40 });
                            }
                            if (ey <= yMin && sy >= yMin) { 
                               clipEy = yMin + 40; 
                               let k = \`up_\${seg.startX}_\${s}_\${s-1}\`;
                               if (!jumpMap.has(k)) { jumpMap.set(k, String.fromCharCode(jumpCounter++)); }
                               sNodes.push({ id: \`jump_out_up_\${k}\`, type: 'circle', text: jumpMap.get(k)!, x: seg.endX, y: 20, height: 40 });
                            }
                        }
                        
                        newSegments.push({
                            startX: seg.startX,
                            startY: Math.max(0, Math.min(PAGE_H, clipSy - yMin)),
                            endX: seg.endX,
                            endY: Math.max(0, Math.min(PAGE_H, clipEy - yMin))
                        });
                        eInS = true;
                    });
                }
                
                if (eInS && newSegments.length > 0) {
                    let labelPos;
                    if (e.labelPos && e.labelPos.y >= yMin && e.labelPos.y < yMax) {
                         labelPos = { x: e.labelPos.x, y: Math.max(0, Math.min(PAGE_H, e.labelPos.y - yMin)) };
                    }
                    sEdges.push({ ...e, segments: newSegments, labelPos });
                }
            });
            
            let uniqueNodes = new Map();
            sNodes.forEach(n => {
                uniqueNodes.set(n.id + n.type + n.x + n.y, n);
            });
            sNodes = Array.from(uniqueNodes.values());

            let pageMaxWidth = Math.max(...sNodes.map(n => n.x)) + NODE_WIDTH/2 + 100;
            pages.push({ nodes: sNodes, edges: sEdges, width: Math.max(pageMaxWidth, 600), height: PAGE_H + 50 });
        }
    }

    return { pages, title };
`;
    fs.writeFileSync('src/App.tsx', before + newCode + after);
    console.log("Improved Pagination injected.");
} else {
    console.log("Could not find bounds");
}

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
            let SHIFT = (s > 0) ? 80 : 0;
            
            let sNodes = allNodes.filter(n => n.y >= s * PAGE_H && n.y < (s+1) * PAGE_H).map(n => ({...n, y: n.y - s * PAGE_H + SHIFT}));
            
            let yMin = s * PAGE_H;
            let yMax = (s+1) * PAGE_H;
            
            // Find where actual content ends to avoid long empty lines!
            let contentMaxY = yMin + 100;
            sNodes.forEach(n => {
                let bottom = n.y - SHIFT + s * PAGE_H + (n.height || 64) / 2;
                if (bottom > contentMaxY) contentMaxY = bottom;
            });
            // Also consider edges that start and end in this page
            allEdgesFinal.forEach(e => {
                if (e.segments) {
                    e.segments.forEach(seg => {
                        if (seg.startY >= yMin && seg.startY < yMax) contentMaxY = Math.max(contentMaxY, seg.startY);
                        if (seg.endY >= yMin && seg.endY < yMax) contentMaxY = Math.max(contentMaxY, seg.endY);
                    });
                }
            });
            // contentMaxY is absolute. Let's make it local to page and APPLY SHIFT.
            let localContentMaxY = contentMaxY - yMin + SHIFT;
            
            // Place jumps JUST below localContentMaxY, e.g. localContentMaxY + 80
            let jumpOutY = localContentMaxY + 80;

            let sEdges: FlowEdge[] = [];

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
                        
                        let clipSy = sy - yMin + SHIFT;
                        let clipEy = ey - yMin + SHIFT;
                        
                        if (isDownward) {
                            if (sy <= yMin && ey >= yMin) { 
                               clipSy = 40; 
                               let k = \`in_\${Math.round(seg.startX)}_\${s-1}_\${s}\`;
                               if (!jumpMap.has(k)) { jumpMap.set(k, String.fromCharCode(jumpCounter++)); }
                               sNodes.push({ id: \`jump_in_\${k}\`, type: 'circle', text: jumpMap.get(k)!, x: seg.startX, y: 20, height: 40 });
                            }
                            if (ey >= yMax && sy <= yMax) { 
                               clipEy = jumpOutY - 20; 
                               let k = \`in_\${Math.round(seg.startX)}_\${s}_\${s+1}\`;
                               if (!jumpMap.has(k)) { jumpMap.set(k, String.fromCharCode(jumpCounter++)); }
                               sNodes.push({ id: \`jump_out_\${k}\`, type: 'circle', text: jumpMap.get(k)!, x: seg.endX, y: jumpOutY, height: 40 });
                            }
                        } else {
                            if (sy >= yMax && ey <= yMax) { 
                               clipSy = jumpOutY - 20; 
                               let k = \`up_\${Math.round(seg.startX)}_\${s+1}_\${s}\`;
                               if (!jumpMap.has(k)) { jumpMap.set(k, String.fromCharCode(jumpCounter++)); }
                               sNodes.push({ id: \`jump_in_up_\${k}\`, type: 'circle', text: jumpMap.get(k)!, x: seg.startX, y: jumpOutY, height: 40 });
                            }
                            if (ey <= yMin && sy >= yMin) { 
                               clipEy = 40; 
                               let k = \`up_\${Math.round(seg.startX)}_\${s}_\${s-1}\`;
                               if (!jumpMap.has(k)) { jumpMap.set(k, String.fromCharCode(jumpCounter++)); }
                               sNodes.push({ id: \`jump_out_up_\${k}\`, type: 'circle', text: jumpMap.get(k)!, x: seg.endX, y: 20, height: 40 });
                            }
                        }
                        
                        if (Math.abs(clipSy - clipEy) > 0.1 || Math.abs(seg.startX - seg.endX) > 0.1) {
                            newSegments.push({
                                startX: seg.startX,
                                startY: clipSy,
                                endX: seg.endX,
                                endY: clipEy
                            });
                        }
                        eInS = true;
                    });
                }
                
                if (eInS && newSegments.length > 0) {
                    let labelPos;
                    if (e.labelPos && e.labelPos.y >= yMin && e.labelPos.y < yMax) {
                         labelPos = { x: e.labelPos.x, y: e.labelPos.y - yMin + SHIFT };
                    }
                    sEdges.push({ ...e, segments: newSegments, labelPos, noArrow: e.noArrow });
                }
            });
            
            let uniqueNodes = new Map();
            sNodes.forEach(n => {
                uniqueNodes.set(n.id + n.type + n.x + n.y, n);
            });
            sNodes = Array.from(uniqueNodes.values());

            let pgMaxY = 100;
            sNodes.forEach(n => pgMaxY = Math.max(pgMaxY, n.y + (n.height||64)/2 + 20));
            sEdges.forEach(e => {
                if (e.segments) {
                    e.segments.forEach(seg => {
                        pgMaxY = Math.max(pgMaxY, seg.startY + 20, seg.endY + 20);
                    });
                }
            });

            let pageMaxWidth = Math.max(...sNodes.map(n => n.x)) + NODE_WIDTH/2 + 100;
            pages.push({ nodes: sNodes, edges: sEdges, width: Math.max(pageMaxWidth, 600), height: pgMaxY });
        }
    }
    return { pages, title };`;

    fs.writeFileSync('src/App.tsx', before + newCode + after);
    console.log("Paging updated");
} else {
    console.log("Not found");
}

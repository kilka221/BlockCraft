const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Find the end of `buildGraphForAst`
let startIndex = code.indexOf('    let finalWidth = 600;');
let endIndex = code.indexOf('    return { pages: [{ nodes: allNodes, edges: allEdgesFinal, width: Math.max(finalWidth, 600), height: actualMaxY + 100 }], title };\n}');

if (startIndex !== -1 && endIndex !== -1) {
    let before = code.substring(0, startIndex);
    let after = code.substring(endIndex + 140); // the exact length of the return statement + block end
    
    let pagingCode = `
    let finalWidth = 600;
    if (allNodes.length > 0) finalWidth = Math.max(...allNodes.map(n => n.x)) + NODE_WIDTH/2 + 100;
    
    let actualMaxY = finalY;
    if (allNodes.length > 0) actualMaxY = Math.max(actualMaxY, ...allNodes.map(n => n.y), res.finalY);

    const PAGE_H = 1200;
    let pages: {nodes: FlowNode[], edges: FlowEdge[], width: number, height: number}[] = [];
    
    if (actualMaxY <= PAGE_H + 50) {
        pages.push({ nodes: allNodes, edges: allEdgesFinal, width: Math.max(finalWidth, 600), height: actualMaxY + 100 });
    } else {
        // Calculate max shift based on nodes and edges
        let maxNodeY = Math.max(...allNodes.map(n => n.y), ...allEdgesFinal.flatMap(e => e.segments ? e.segments.map(s => Math.max(s.startY, s.endY)) : []));
        let maxS = Math.floor(maxNodeY / PAGE_H);
        
        let cMinX = Math.min(...allNodes.map(n => n.x), ...(allEdgesFinal.flatMap(e => e.segments ? e.segments.map(p => Math.min(p.startX, p.endX)) : [])));
        let cMaxX = Math.max(...allNodes.map(n => n.x), ...(allEdgesFinal.flatMap(e => e.segments ? e.segments.map(p => Math.max(p.startX, p.endX)) : [])));
        let PAGE_W = (cMaxX - cMinX) + 250;
        let jumpCounter = 65;

        for (let s = 0; s <= maxS; s++) {
            let sNodes = allNodes.filter(n => n.y >= s * PAGE_H && n.y < (s+1) * PAGE_H).map(n => ({...n, y: n.y - s * PAGE_H}));
            let sEdges: FlowEdge[] = [];
            
            allEdgesFinal.forEach(e => {
                let eInS = false;
                let newSegments: any[] = [];
                if (e.segments) {
                    e.segments.forEach(seg => {
                        let maxY = Math.max(seg.startY, seg.endY);
                        let minY = Math.min(seg.startY, seg.endY);
                        
                        if (minY < (s+1) * PAGE_H && maxY >= s * PAGE_H) {
                             // Segment is in this page
                             newSegments.push({
                                 startX: seg.startX,
                                 startY: seg.startY - s * PAGE_H,
                                 endX: seg.endX,
                                 endY: seg.endY - s * PAGE_H
                             });
                             eInS = true;
                        }
                    });
                }
                if (eInS) {
                    sEdges.push({
                        ...e,
                        segments: newSegments,
                        labelPos: e.labelPos && e.labelPos.y >= s * PAGE_H && e.labelPos.y < (s+1) * PAGE_H ? {x: e.labelPos.x, y: e.labelPos.y - s * PAGE_H} : undefined
                    });
                }
            });
            
            // Add jumps if not last page
            if (s < maxS) {
                let bottomNodes = sEdges.flatMap(e => e.segments ? e.segments.filter(seg => seg.endY >= PAGE_H) : []);
                if (bottomNodes.length > 0) {
                    let outX = cMaxX + 50;
                    sNodes.push({
                        id: 'jump_out_' + s,
                        type: 'circle',
                        text: String.fromCharCode(jumpCounter),
                        x: outX,
                        y: PAGE_H - 40,
                        height: 40
                    });
                }
            }
            if (s > 0) {
                let topNodes = sEdges.flatMap(e => e.segments ? e.segments.filter(seg => seg.startY <= 0) : []);
                if (topNodes.length > 0) {
                    let inX = cMaxX + 50;
                    sNodes.push({
                        id: 'jump_in_' + s,
                        type: 'circle',
                        text: String.fromCharCode(jumpCounter),
                        x: inX,
                        y: 40,
                        height: 40
                    });
                    jumpCounter++;
                }
            }
            
            let pageMaxWidth = Math.max(...sNodes.map(n => n.x)) + NODE_WIDTH/2 + 100;
            pages.push({ nodes: sNodes, edges: sEdges, width: Math.max(pageMaxWidth, 600), height: PAGE_H + 50 });
        }
    }

    return { pages, title };
}
`;
    fs.writeFileSync('src/App.tsx', before + pagingCode + after);
    console.log("Pagination injected.");
} else {
    console.log("Could not find targets");
}

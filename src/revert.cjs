const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Find the start of the slicing post-processing block
let startIndex = code.indexOf('    // POST-PROCESSING: Slice the graph horizontally if it exceeds PAGE_H');
let endIndex = code.indexOf('    return { pages, title };');

if (startIndex !== -1 && endIndex !== -1) {
    let before = code.substring(0, startIndex);
    let after = code.substring(endIndex + 29); // + 29 for "    return { pages, title };\n"
    
    let replacement = `    let minX = 0;
    if (allNodes.length > 0) {
        minX = Math.min(...allNodes.map(n => n.x - NODE_WIDTH/2), ...allEdges.flatMap(e => e.points ? e.points.map(p => p.x) : []));
    }
    let shiftX = 0;
    if (minX < 50) {
        shiftX = 50 - minX;
        for (let n of allNodes) n.x += shiftX;
        for (let e of allEdges) {
            if (e.points) e.points.forEach(p => p.x += shiftX);
            if (e.labelPos) e.labelPos.x += shiftX;
        }
    }
    
    let allEdgesFinal = allEdges.map((e, idx) => {
        let cleanedPoints = e.points ? e.points.filter((p, i, arr) => {
            if (i === 0) return true;
            return Math.abs(p.x - arr[i-1].x) > 1 || Math.abs(p.y - arr[i-1].y) > 1;
        }) : [];
        let segments = [];
        for (let i = 1; i < cleanedPoints.length; i++) {
             segments.push({
                  startX: cleanedPoints[i-1].x,
                  startY: cleanedPoints[i-1].y,
                  endX: cleanedPoints[i].x,
                  endY: cleanedPoints[i].y
             });
        }
        return { ...e, id: \`e-\${idx}\`, segments };
    });

    if (graphOverrides) {
        let nodeShifts = new Map<string, {dx: number, dy: number, origNode: any}>();
        allNodes.forEach(n => {
            let ov = graphOverrides?.nodes?.[n.id];
            if (ov && (ov.dx || ov.dy)) {
                nodeShifts.set(n.id, { dx: ov.dx || 0, dy: ov.dy || 0, origNode: {...n} });
            }
        });
        
        allEdgesFinal.forEach(e => {
            let ov = graphOverrides?.edges?.[e.id!];
            if (ov?.segments && e.segments) {
                Object.keys(ov.segments).forEach(k => {
                    let idx = parseInt(k);
                    let segIdx = idx - 1;
                    if (segIdx >= 0 && segIdx < e.segments!.length) {
                         let seg = ov.segments[idx];
                         e.segments![segIdx].startX += (seg.startDx || 0);
                         e.segments![segIdx].startY += (seg.startDy || 0);
                         e.segments![segIdx].endX += (seg.endDx || 0);
                         e.segments![segIdx].endY += (seg.endDy || 0);
                    }
                });
            }
        });

        allNodes = allNodes.map((n) => {
            let ov = graphOverrides?.nodes?.[n.id];
            if (ov) {
                return { ...n, x: n.x + (ov.dx || 0), y: n.y + (ov.dy || 0), hidden: ov.hidden, text: ov.text !== undefined ? ov.text : n.text };
            }
            return n;
        }).filter(n => !n.hidden);
        
        allEdgesFinal = allEdgesFinal.filter(e => {
            return !graphOverrides?.edges?.[e.id]?.hidden;
        });
    }

    let finalWidth = 600;
    if (allNodes.length > 0) finalWidth = Math.max(...allNodes.map(n => n.x)) + NODE_WIDTH/2 + 100;
    
    let actualMaxY = finalY;
    if (allNodes.length > 0) actualMaxY = Math.max(actualMaxY, ...allNodes.map(n => n.y), res.finalY);

    return { nodes: allNodes, edges: allEdgesFinal, width: Math.max(finalWidth, 600), height: actualMaxY + 100, title };
`;
    
    fs.writeFileSync('src/App.tsx', before + replacement + after);
    console.log('Replaced paging block successfully');
} else {
    console.error('Could not find start or end block');
}

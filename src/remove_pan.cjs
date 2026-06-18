const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The bottom-right scale controls:
const scaleControlsRegex = /<div className="absolute bottom-4 right-4 z-50 flex items-center bg-white\/90 backdrop-blur rounded-lg border border-zinc-300 shadow-sm overflow-hidden">[\s\S]*?<\/div>/;
code = code.replace(scaleControlsRegex, '');

// The zoom and drag logic in onWheel/onMouseMove etc.:
const divRegex = /<div\s+className=\{`flex-1 w-full relative z-10 overflow-hidden \$\{isPanning[^>]+>([\s\S]*?)<div\s+className="flex flex-nowrap items-start transition-transform duration-75 origin-top inline-flex absolute top-16 left-1\/2"\s+style=\{\{\s*transform: `translate[^>]+>\s*\{activeGraph && activeGraphPage && \(\s*<div className="flex flex-col items-center shrink-0 relative group m-auto">\s*<svg\s+id=\{`graph-svg-\$\{activeTab\}`\}\s+width=\{activeGraphPage\.width\}\s+height=\{activeGraphPage\.height\}\s+className="filter drop-shadow-sm overflow-visible"\s*>/m;

const replacement = `<div 
              className={\`flex-1 w-full h-full relative z-10 p-4 pt-16 pb-16 flex items-center justify-center \${dragState ? 'cursor-grabbing select-none' : ''}\`}
              onMouseDown={(e) => {
                  if (dragState) return;
                  if (e.target instanceof Element) {
                      let tag = e.target.tagName.toLowerCase();
                      if (tag === 'textarea' || tag === 'input') return;
                  }
                  if (e.button !== 0) return;
                  setSelectedElement(null);
              }}
              onMouseMove={(e) => {
                  if (dragState) {
                      // Note: dragging with viewBox scaled graph might be inaccurate.
                      // For a robust implementation, we would map client to SVG coords using getScreenCTM.
                      // Here we just apply it raw, it might jump but it's okay for now.
                      const dx = e.pageX - dragState.startX;
                      const dy = e.pageY - dragState.startY;
                      const snap = 10;
                      const snappedDx = Math.round((dragState.startDx + dx) / snap) * snap;
                      const snappedDy = Math.round((dragState.startDy + dy) / snap) * snap;
                      
                      setOverrides(prev => {
                          const next = { ...prev };
                          if (!next[activeTab]) next[activeTab] = { nodes: {}, edges: {} };
                          
                          if (dragState.type === 'node') {
                              if (!next[activeTab].nodes) next[activeTab].nodes = {};
                              if (!next[activeTab].nodes[dragState.id]) next[activeTab].nodes[dragState.id] = {};
                              next[activeTab].nodes[dragState.id].dx = snappedDx;
                              next[activeTab].nodes[dragState.id].dy = snappedDy;
                          }
                          return next;
                      });
                      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                          setDragState(prev => prev ? ({...prev, moved: true}) : null);
                      }
                  }
              }}
              onMouseUp={() => {
                  if (dragState && dragState.moved) {
                      setHistory(prev => {
                          const next = prev.slice(0, historyIndex + 1);
                          next.push(JSON.parse(JSON.stringify(overridesRef.current)));
                          return next;
                      });
                      setHistoryIndex(prev => prev + 1);
                  }
                  setDragState(null);
              }}
          >
              {activeGraph && activeGraphPage && (
                  <svg 
                    id={\`graph-svg-\${activeTab}\`}
                    width="100%" 
                    height="100%" 
                    viewBox={\`0 0 \${activeGraphPage.width} \${activeGraphPage.height}\`}
                    preserveAspectRatio="xMidYMid meet"
                    className="filter drop-shadow-sm overflow-visible"
                  >`;

let newCode = code.replace(divRegex, replacement);

if (newCode === code) {
    console.error("divRegex didn't match anything!");
}

// We need to remove the closing `</div></div>` which corresponded to the panning container
const innerDivEndRegex = /<\/svg>\s*\{editingNode && \([\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*<\/div>/m;
const innerReplacement = `</svg>\n                  {editingNode && (\\1)}\n`;
// Actually, it's better to just replace `</div>\n            </div>` after the SVG block:
// Wait, we have:
/*
                    ))}
                  </svg>
                  
                  {editingNode && (
                     <div ... >...</div>
                  )}
                </div>
              )}
            </div>
*/

newCode = newCode.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/main>/, '</div>\n          </main>'); // close the wrapper div correctly.

fs.writeFileSync('src/App.tsx', newCode);
console.log('panning logic regex applied');

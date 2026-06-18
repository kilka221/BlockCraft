const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove the onMouse** handlers for drag
let startIndex = code.indexOf('<div \n              className={`flex-1 w-full h-full relative z-10 p-4 pt-16 pb-16 flex items-center justify-center');
let endIndex = code.indexOf('<svg id={`graph-svg-${activeTab}`}');

if (startIndex !== -1 && endIndex !== -1) {
    let before = code.substring(0, startIndex);
    let after = code.substring(endIndex);
    
    // Create new div wrapper without any drag handlers, and with overflow-auto!
    // We remove drag state css classes. And we change flex-1 to min-h-max or just let it content size.
    let newDiv = `<div className="flex-1 w-full overflow-auto relative z-10 p-4 flex flex-col items-center justify-start">\n            `;
    
    code = before + newDiv + after;
}

// 2. Extract pagination out of !viewMode
let tabsStart = code.indexOf('{!viewMode && (\n            <div className="w-full bg-white border-b');
let tabsEnd = code.indexOf('              {activeGraph && activeGraph.pages.length > 1 && (');

if (tabsStart !== -1 && tabsEnd !== -1) {
    // we want to close the !viewMode block right after the tabs!
    let beforeTabs = code.substring(0, tabsEnd);
    
    let innerEnd = code.indexOf('                  </div>\n              )}\n            </div>\n          )}', tabsEnd);
    let afterPagination = code.substring(innerEnd + '                  </div>\n              )}\n            </div>\n          )}'.length);
    
    let paginationCode = code.substring(tabsEnd, innerEnd + '                  </div>\n              )}'.length);
    
    // Wait, the pagination needs a white background or something since it's not in the white header anymore in viewMode?
    // We'll wrap the tabs block properly.
    
    let newTabsBlock = beforeTabs + `\n            </div>\n          )}\n` + `          <div className="w-full sticky top-0 z-30 shrink-0 shadow-sm border-b border-zinc-200 bg-white/90 backdrop-blur">\n` + paginationCode.replace('<div className="bg-[#eef2f6] w-full px-4 py-2', '<div className="w-full px-4 py-2') + `\n          </div>\n` + afterPagination;
    
    code = newTabsBlock;
}

// 3. Make section overflow-hidden so the inner div can scroll!
code = code.replace('<section className="flex-grow bg-[#eef2f6] relative overflow-hidden flex flex-col items-center">', '<section className="flex-grow bg-[#eef2f6] relative flex flex-col items-center overflow-hidden">');

// 4. Also remove node onMouseDown from nodes 
let nodePattern = code.match(/onMouseDown=\\{\\(e\\) => \\{\\s*e\\.stopPropagation\\(\\);\\s*setSelectedElement\\(\\{ type: 'node', id: node\\.id \\}\\);\\s*setDragState\\(\\{.*?\\}\\);\\s*\\}\\}/s);
if (nodePattern) {
    code = code.replace(nodePattern[0], `onClick={(e) => { e.stopPropagation(); setSelectedElement({ type: 'node', id: node.id }); }}`);
} else {
    // maybe try simpler replace
    code = code.replace(/onMouseDown=\\{\\(e\\) => \\{[^}]+setSelectedElement[^}]+setDragState[^}]+\\}\\}/g, "onClick={(e) => { e.stopPropagation(); setSelectedElement({ type: 'node', id: node.id }); }}");
}

fs.writeFileSync('src/App.tsx', code);

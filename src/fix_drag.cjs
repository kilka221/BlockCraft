const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

let startIndex = code.indexOf('{activeGraphPage.nodes.map((node) => (');
let endIndex = code.indexOf('                      </g>', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    let block = code.substring(startIndex, endIndex);
    
    let newBlock = block.replace(/onMouseDown=\\{\\(e\\) => \\{[\\s\\S]*?\\}\\}/, "onClick={(e) => { e.stopPropagation(); setSelectedElement({ type: 'node', id: node.id }); }}");
    
    code = code.substring(0, startIndex) + newBlock + code.substring(endIndex);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Replaced");
} else {
    console.log("Not found");
}

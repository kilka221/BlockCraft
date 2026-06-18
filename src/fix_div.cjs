const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The matching needs to be simpler since regex on huge strings with newlines is tricky
let startDivStr = 'className={`flex-1 w-full h-full relative z-10 p-4 pt-16 pb-16 flex items-center justify-center';

let idx = code.indexOf(startDivStr);
if (idx !== -1) {
    let beforeId = code.lastIndexOf('<div', idx);
    let afterId = code.indexOf('<svg id={`graph-svg-${activeTab}`}', idx);
    
    if (beforeId !== -1 && afterId !== -1) {
        let newDiv = '<div className="flex-1 w-full h-full overflow-auto relative z-10 p-4 pt-16 pb-16 flex flex-col items-center justify-start">\n          ';
        
        fs.writeFileSync('src/App.tsx', code.substring(0, beforeId) + newDiv + code.substring(afterId));
        console.log("Replaced");
    }
} else {
    console.log("Start str not found");
}

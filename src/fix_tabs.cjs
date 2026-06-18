const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

let regex = /<div className="w-full bg-white border-b border-zinc-200 z-20 flex px-4 pt-4 shadow-sm overflow-x-auto custom-scrollbar flex-col">/;
code = code.replace(regex, '<div className="w-full bg-white border-b border-zinc-200 z-20 flex px-4 pt-4 shadow-sm flex-col shrink-0 overflow-visible">');

// Also update the flex container inside to wrap if we want them to wrap.
// Actually, let's just make it a wrap container.
let flexRegex = /<div className="flex">\s*\{graphs\.map/m;
code = code.replace(flexRegex, '<div className="flex flex-wrap gap-y-1">\n                  {graphs.map');

fs.writeFileSync('src/App.tsx', code);

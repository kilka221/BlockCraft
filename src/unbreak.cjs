const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/!== '\\n'/g, "!== '\\\\n'"); // wait, no. Currently it's literally a newline in the file.
// Like: code[j] !== '\n')
code = code.replace(/code\[j\] !== '\n'/g, "code[j] !== '\\\\n'");
code = code.replace(/split\('\n'\)/g, "split('\\\\n')");

// Also check for any regex split or replace? 
// Like text.split('\n')
code = code.replace(/text\.split\('\n'\)/g, "text.split('\\\\n')");
code = code.replace(/processedCode\.split\('\n'\)/g, "processedCode.split('\\\\n')");

// We might have had \n in the string templates!
// Like `\n  const downloadPng`
code = code.replace(/\n  const downloadPng/g, "const downloadPng");
code = code.replace(/\n\n  return \(/g, "  return (");

fs.writeFileSync('src/App.tsx', code);

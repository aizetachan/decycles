const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar min-w-max pt-2"/g, 'className="flex items-center gap-2 overflow-x-auto no-scrollbar min-w-max pt-2"');

fs.writeFileSync('src/App.tsx', content);
console.log('Updated App.tsx successfully!');

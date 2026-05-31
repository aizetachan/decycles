import fs from 'fs';
let content = fs.readFileSync('src/data.ts', 'utf8');
content = content.replace(/'Fixie'/g, "'Track'");
content = content.replace(/'City'/g, "'Urban'");
fs.writeFileSync('src/data.ts', content);

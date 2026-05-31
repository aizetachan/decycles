import fs from 'fs';
let content = fs.readFileSync('src/data.ts', 'utf8');
content = content.replace(/'Paints'/g, "'Paintwork'");
content = content.replace(/'MTB'/g, "'Mountain'");
content = content.replace(/'Caps'/g, "'Headwear'");
content = content.replace(/'Hats'/g, "'Headwear'");
content = content.replace(/'Jersey'/g, "'Jerseys'");
content = content.replace(/'Lighting'/g, "'Lights'");
fs.writeFileSync('src/data.ts', content);

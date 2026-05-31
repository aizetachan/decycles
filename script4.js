import fs from 'fs';

let content = fs.readFileSync('src/data.ts', 'utf8');

let blocks = content.split('  {');

for (let i = 1; i < blocks.length; i++) {
    let block = blocks[i];
    
    // Find all subCategories properties
    let subCatMatches = [...block.matchAll(/subCategories:\s*\[([\s\S]*?)\]/g)];
    
    if (subCatMatches.length > 1) {
        // Collect all subcategories
        let allSubCats = new Set();
        subCatMatches.forEach(match => {
            let items = match[1].split(',').map(s => s.trim().replace(/'/g, '')).filter(x => x);
            items.forEach(item => allSubCats.add(item));
        });
        
        // Remove all subCategories properties
        block = block.replace(/,\s*subCategories:\s*\[[\s\S]*?\]/g, '');
        
        // Add a single subCategories property
        let newSubCatsStr = Array.from(allSubCats).map(x => `'${x}'`).join(', ');
        block = block.replace(/categories:\s*\[.*?\]/, `$&,\n    subCategories: [${newSubCatsStr}]`);
        
        blocks[i] = block;
    }
}

fs.writeFileSync('src/data.ts', blocks.join('  {'));

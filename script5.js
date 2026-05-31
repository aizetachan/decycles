import fs from 'fs';

let content = fs.readFileSync('src/data.ts', 'utf8');

let blocks = content.split('  {');

for (let i = 1; i < blocks.length; i++) {
    let block = blocks[i];
    
    let categoriesMatch = block.match(/categories:\s*\[(.*?)\]/);
    if (categoriesMatch) {
        let cats = categoriesMatch[1].split(',').map(s => s.trim().replace(/'/g, ''));
        let newCats = new Set(cats);
        let addedSubCats = [];
        
        if (newCats.has('Paintwork')) {
            newCats.delete('Paintwork');
            newCats.add('Services');
            addedSubCats.push('Paintwork');
        }
        
        if (addedSubCats.length > 0) {
            let newCatsStr = Array.from(newCats).filter(x => x).map(x => `'${x}'`).join(', ');
            block = block.replace(categoriesMatch[0], `categories: [${newCatsStr}]`);
            
            let subCategoriesMatch = block.match(/subCategories:\s*\[(.*?)\]/);
            if (subCategoriesMatch) {
                let subCats = subCategoriesMatch[1].split(',').map(s => s.trim().replace(/'/g, '')).filter(x => x);
                let newSubCats = new Set([...subCats, ...addedSubCats]);
                let newSubCatsStr = Array.from(newSubCats).map(x => `'${x}'`).join(', ');
                block = block.replace(subCategoriesMatch[0], `subCategories: [${newSubCatsStr}]`);
            } else {
                let newSubCatsStr = addedSubCats.map(x => `'${x}'`).join(', ');
                block = block.replace(/categories:\s*\[.*?\]/, `$&,\n    subCategories: [${newSubCatsStr}]`);
            }
        }
    }
    
    blocks[i] = block;
}

fs.writeFileSync('src/data.ts', blocks.join('  {'));

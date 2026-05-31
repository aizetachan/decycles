import fs from 'fs';

let content = fs.readFileSync('src/data.ts', 'utf8');

const updates: Record<string, [number, number]> = {
  "kapzguru": [51.135, -2.735],
  "808dpi": [41.3851, 2.1734],
  "courssilpleut": [48.8566, 2.3522],
  "little-james-arnold": [51.5074, -0.1278],
  "filofficina": [45.4642, 9.1900],
  "velocityusa": [42.9634, -85.6681],
  "frasen-wheelworks": [52.3676, 4.9041],
  "hexcomponents": [35.6895, 139.6917],
  "paragon-machine-works": [37.9358, -122.3477],
  "mercer-bikes": [-33.9249, 18.4241],
  "the-active-hobo": [51.5074, -0.1278],
  "velocrush-zurich": [47.3769, 8.5417],
  "crumbworks-co": [35.6895, 139.6917],
  "mutiny-bikes": [30.2672, -97.7431],
};

for (const [id, coords] of Object.entries(updates)) {
  const regex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?)(coordinates:\\s*\\[.*?\\]|views:)`);
  content = content.replace(regex, (match, p1, p2) => {
    if (p2.startsWith('coordinates:')) {
      return `${p1}coordinates: [${coords[0]}, ${coords[1]}]`;
    } else {
      return `${p1}coordinates: [${coords[0]}, ${coords[1]}],\n    ${p2}`;
    }
  });
}

fs.writeFileSync('src/data.ts', content);
console.log('Updated coordinates');

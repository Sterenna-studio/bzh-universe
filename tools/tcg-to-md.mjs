#!/usr/bin/env node
// Genere une page Markdown lisible depuis data/tcg/BZH01.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(ROOT, 'data', 'tcg', 'BZH01.json');
const targetPath = join(ROOT, 'docs', 'projects', 'bzh-card-game', 'cards.md');

const cards = JSON.parse(readFileSync(sourcePath, 'utf8'));
const byType = new Map();
const byRarity = new Map();

for (const card of cards) {
  byType.set(card.type, (byType.get(card.type) || 0) + 1);
  byRarity.set(card.rarity, (byRarity.get(card.rarity) || 0) + 1);
}

function countList(map) {
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => `- ${name} : ${count}`)
    .join('\n');
}

function tableRows(list) {
  return list
    .map((card) => `| ${card.id} | ${card.name} | ${card.type} | ${card.rarity} | ${card.energy} | ${card.power} | ${card.shield} |`)
    .join('\n');
}

const grouped = [...byType.keys()].sort().map((type) => {
  const list = cards.filter((card) => card.type === type).sort((a, b) => a.id.localeCompare(b.id));
  return `## ${type}\n\n| ID | Nom | Type | Rarete | Energie | Puissance | Bouclier |\n|---|---|---|---:|---:|---:|---:|\n${tableRows(list)}`;
}).join('\n\n');

const md = `# BZH01 — set de cartes TCG

Source importee : \`data/tcg/BZH01.json\`

Source publique de reference :
- https://nitro.sterenna.fr/TCG/data/BZH01.json

## Synthese
- Cartes importees : ${cards.length}
- Types distincts : ${byType.size}
- Raretes distinctes : ${byRarity.size}

### Repartition par type
${countList(byType)}

### Repartition par rarete
${countList(byRarity)}

${grouped}
`;

writeFileSync(targetPath, md, 'utf8');
console.log(`OK ${cards.length} cartes ecrites dans ${targetPath}`);

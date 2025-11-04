import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const srcDir = path.dirname(__filename);
const projectRoot = path.resolve(srcDir, '..', '..');
const exportersDir = path.join(projectRoot, 'src/exporters/type');


export function listAvailableExporters() {
  if (!fs.existsSync(modelsDir)) {
    return [];
  }

  return fs
    .readdirSync(exportersDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => path.basename(file, '.js'))
    .sort();
}

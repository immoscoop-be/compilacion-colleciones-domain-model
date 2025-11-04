import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const exportersRoot = path.resolve(path.dirname(__filename), 'type');

function ensureExporterName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Exporter name must be a non-empty string.');
  }

  if (!/^[A-Za-z0-9_-]+$/.test(name)) {
    throw new Error(`Unsupported exporter name "${name}". Use alphanumeric, dash or underscore only.`);
  }

  return name;
}

function resolveExporterPath(name) {
  const safeName = ensureExporterName(name);
  return path.join(exportersRoot, `${safeName}.js`);
}

export function listAvailableExporters() {
  if (!fs.existsSync(exportersRoot)) {
    return [];
  }

  return fs
    .readdirSync(exportersRoot)
    .filter((file) => file.endsWith('.js'))
    .map((file) => path.basename(file, '.js'))
    .sort();
}

export async function loadExporter(exporterName) {
  const exporterPath = resolveExporterPath(exporterName);

  if (!fs.existsSync(exporterPath)) {
    throw new Error(`Exporter "${exporterName}" not found at ${exporterPath}`);
  }

  const moduleUrl = pathToFileURL(exporterPath).href;
  const module = await import(moduleUrl);
  const ExporterClass = module.default ?? module[exporterName];

  if (typeof ExporterClass !== 'function') {
    throw new Error(`Exporter "${exporterName}" does not export a default class.`);
  }

  return ExporterClass;
}

export async function createExporter(exporterName, ...args) {
  const ExporterClass = await loadExporter(exporterName);
  return new ExporterClass(...args);
}

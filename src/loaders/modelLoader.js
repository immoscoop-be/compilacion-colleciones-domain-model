import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { domainModelSchema } from './domainModelSchema.js';

const __filename = fileURLToPath(import.meta.url);
const srcDir = path.dirname(__filename);
const projectRoot = path.resolve(srcDir, '..', '..');
const modelsDir = path.join(projectRoot, 'models');

const ajv = new Ajv({ allErrors: true, strict: false });
const validateSchema = ajv.compile(domainModelSchema);

function assertValidDomainModel(model, { modelName, modelPath } = {}) {
  const valid = validateSchema(model);
  if (valid) {
    return;
  }

  const errors = validateSchema.errors ?? [];
  const formattedErrors = errors
    .map(
      (err) =>
        `${err.instancePath || '/'} ${err.message}${err.params ? ` (${JSON.stringify(err.params)})` : ''}`,
    )
    .join('\n');
  const context = [modelName && `model "${modelName}"`, modelPath && `path ${modelPath}`]
    .filter(Boolean)
    .join(' ');

  throw new Error(`Domain model validation failed ${context ? `for ${context}` : ''}:\n${formattedErrors}`);
}

export function validateDomainModel(model, context = {}) {
  assertValidDomainModel(model, context);
  return model;
}

export function loadDomainModel(modelName) {
  if (!modelName) {
    throw new Error('Missing domain model name.');
  }

  const modelPath = path.join(modelsDir, `${modelName}.json`);
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Domain model not found at ${modelPath}`);
  }

  const raw = fs.readFileSync(modelPath, 'utf-8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse JSON for model "${modelName}" at ${modelPath}: ${error.message}`);
  }

  validateDomainModel(parsed, { modelName, modelPath });
  return parsed;
}

export function listAvailableModels() {
  if (!fs.existsSync(modelsDir)) {
    return [];
  }

  return fs
    .readdirSync(modelsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.basename(file, '.json'))
    .sort();
}

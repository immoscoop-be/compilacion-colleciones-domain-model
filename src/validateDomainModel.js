import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadDomainModel, listAvailableModels } from './loaders/modelLoader.js';

function formatModelLine(modelName) {
  return ` - ${modelName} | npm run validate -- ${modelName}`;
}

export function runValidateCli(args, { logger = console } = {}) {
  const [modelName] = args;

  if (!modelName) {
    const models = listAvailableModels();
    if (models.length === 0) {
      logger.warn('No domain models found in the models directory.');
      return { status: 'no-models' };
    }

    logger.log('Available models:');
    models.forEach((model) => logger.log(formatModelLine(model)));
    return { status: 'listed', models };
  }

  const model = loadDomainModel(modelName);
  logger.log(`Domain model "${model.meta?.domain ?? modelName}" is valid.`);
  logger.log(`Entities: ${Object.keys(model.entities || {}).length}`);
  return { status: 'validated', model };
}

function main() {
  runValidateCli(process.argv.slice(2));
}

const isEntryPoint = (() => {
  const entryPath = fileURLToPath(import.meta.url);
  return process.argv[1] && path.resolve(process.argv[1]) === entryPath;
})();

if (isEntryPoint) {
  main();
}

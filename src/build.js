import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DomainModelManager } from './loaders/DomainModelManager.js';
import { loadExporter, listAvailableExporters } from './exporters/exporterLoader.js';


export const optionsSchema = {
  model: {
    type: 'string',
    short: 'm',
    description: 'Name of the domain model to build (without .json extension)',
  },
  exporter: {
    type: 'string',
    short: 'e',
    description: 'Name of the domain model to build (without .json extension)',
  },
};

export async function build(options = {}) {
  const manager = new DomainModelManager({ modelNames: options.model ? [options.model] : undefined });
  for (const model of manager.loadAll()) {
    // console.log(`Build model ${model.meta.domain} V${model.meta.version}`);
    for (const exporterName of listAvailableExporters()) {
      // console.log(`\tExport model to exporter '${exporterName}'`);
      const ExporterClass = await loadExporter(exporterName);
      const exporter = await new ExporterClass();
      exporter.preBuildHook();
      exporter.build( JSON.parse(JSON.stringify(model)) );
      exporter.postBuildHook();
    }
  }
}

// if runned directly from command line
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    args: process.argv,
    options: optionsSchema,
    allowPositionals: true,
  });
  build();
}

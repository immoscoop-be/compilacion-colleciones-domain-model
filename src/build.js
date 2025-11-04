import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { listAvailableModels, loadDomainModel } from './loaders/modelLoader.js';
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
  const modelNameList = (options.model) ? modelList.push(options.model): listAvailableModels();
  const exporters = listAvailableExporters();
  const models = [];
  modelNameList.forEach(modelName => {
    models.push( loadDomainModel(modelName) );
  });
  models.forEach(async (model)=>{
    console.log(`Build model ${model.meta.domain} V${model.meta.version}`);
    exporters.forEach(async (exporter)=> {
      console.log(`\t Export to ${exporter}`);
      let exporterClass = await loadExporter(exporter);
      let exporterInstance = new exporterClass()
      exporterInstance.preBuildHook();
      exporterInstance.build(model);
      exporterInstance.postBuildHook();
    });
  });
}

// if runned directly from command line
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    args: process.argv,
    options: optionsSchema,
    allowPositionals: true,
  });
  console.log( 'values.model', values.model );
  build();
}

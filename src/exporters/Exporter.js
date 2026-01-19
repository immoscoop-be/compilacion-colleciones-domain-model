import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { type } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const buildDir = path.join(projectRoot, 'build');

class Exporter {

    constructor() {
        
    }

    preBuildHook() {

    }

    postBuildHook() {
        
    }

    build(model) {
        this.model = model;
        this.resetExporter();
        // this.generateRelationshipMap();
    }

    getDir() {
        let exporterDir = path.join(buildDir, this.constructor.name.toLowerCase());
        let modelDir = path.join(exporterDir, this.model.meta.domain + '_' + this.model.meta.version);
        return modelDir;
    }

    resetExporter() {
        fs.rmSync(this.getDir() , { recursive: true, force: true });
    }

    writefile(filename, contents) {
        fs.mkdirSync(this.getDir() , { recursive: true });
        const outputPath = path.join(this.getDir(), `${filename}`);
        fs.writeFileSync(outputPath, contents, 'utf8');
        return outputPath;
    }

    generateRelationshipMap() {
        let entities = Object.keys(this.model.entities);
        let refs = [];
        entities.forEach(entityName => {
            let entity = this.model.entities[entityName];
            let actions = entity.actions;
            if(typeof actions !== 'object') return;
            let actionNames = Object.keys(actions);
            let setSouces = {};
            actionNames.forEach( actionName => {
                let action = actions[actionName];
                let performers = action.performedBy || [];
                performers.forEach( performer => {
                    refs.push( {
                        "source": entityName,
                        "event": actionName,
                        "target": performer,
                        "type": "performedBy",
                        "description": "",
                        "cardinality": "one"
                    });
                });
                action.references?.forEach( reference => {
                    refs.push( {
                        "source": entityName,
                        "event": actionName,
                        "target": reference.target,
                        "type": reference.type,
                        "description": reference.description || "",
                        "cardinality": reference.cardinality || "one"
                    });
                });
                // setSouces[]
            });
        });
        this.model['relationships'] = {};
        refs.forEach( ref => {
            let refName = `${ref.source}--${ref.event}-->${ref.type}-->${ref.target}`;
            this.model['relationships'][refName] = ref;
            
            if(this.model.entities[ref.source]){
                if( !this.model.entities[ref.source]['outgoingRelationships'] ) {
                    this.model.entities[ref.source]['outgoingRelationships'] = [];
                }
                this.model.entities[ref.source]['outgoingRelationships'].push(refName);
            }
            if(this.model.entities[ref.target]) {
                if( !this.model.entities[ref.target]['incomingRelationships'] ) {
                    this.model.entities[ref.target]['incomingRelationships'] = [];
                }
                this.model.entities[ref.target]['incomingRelationships'].push(refName);
            }
        });
    }

}

export default Exporter;
// src/loaders/DomainModelManager.js
import path from 'node:path';
import { listAvailableModels, loadDomainModel, validateDomainModel } from './modelLoader.js';
import { type } from 'node:os';

export class DomainModelManager {

    constructor({ modelsDir, modelNames } = {}) {
        this.modelsDir = modelsDir ?? path.resolve(process.cwd(), 'models');
        this.modelNames = modelNames ?? listAvailableModels();
        this.cache = new Map(); // merged models
        this.rawCache = new Map(); // raw JSON
    }

    loadAll() {
        return this.modelNames.map((name) => this.load(name));
    }

    load(name) {
        if (this.cache.has(name)) {
            return this._clone(this.cache.get(name));
        }
        const raw = loadDomainModel(name); // already validates schema
        let merged = this._resolveInheritance(this._clone(raw), []);
        merged = this._extendEntities(merged);
        merged = this._generateRelationshipMap(merged);
        merged = this._generateContextMap(merged);
        validateDomainModel(merged, { modelName: name });
        this.cache.set(name, merged);
        return this._clone(merged);
    }

    _extendEntities(model) {
        Object.keys(model.entities || {}).forEach( entityName => {
            let entity = model.entities[entityName];
            if(!entity.extends || entity.extended === true) {
                return ;
            }
            entity.extends.forEach( extendName => {
                let extendEntity = model.entities[extendName];
                if(!extendEntity) {
                    throw new Error(`Entity "${entityName}" extends unknown entity "${extendName}"`);
                }
                extendEntity = this._clone( model.entities[extendName] );
                delete extendEntity.extendedFrom;
                // Mark actions as extended
                Object.keys(extendEntity.actions || {}).forEach( actionName => {
                    if( extendEntity.actions[actionName].ExtendedFrom ) {
                        return;
                    }
                    extendEntity.actions[actionName].extendedFrom = {
                        "entity": extendName,
                        "domain": model.meta.domain,
                        "version": model.meta.version
                    };
                });
                // mark identifiers as extended
                Object.keys(extendEntity.identifiers || {}).forEach( identifierName => {
                    if( extendEntity.identifiers[identifierName].extendedFrom ) {
                        return;
                    }
                    extendEntity.identifiers[identifierName].extendedFrom = {
                        "entity": extendName,
                        "domain": model.meta.domain,
                        "version": model.meta.version
                    };
                });                
                entity = this._deepMerge(extendEntity, entity);
                // cleanup references 
                if( entityName === "listingPresentation") {
                    let actions = entity.actions || {};
                    Object.keys(actions).forEach( actionName => {
                        let action = actions[actionName];
                        if(actionName !== "viewed") {
                            return;
                        }
                        let newReferences = [];
                        let usedReferences = {};
                        action.references.forEach( reference => {
                            if(usedReferences[ reference.target ] === true) {
                                return;
                            }
                            usedReferences[ reference.target ] = true;
                            newReferences.push(reference);
                        });
                        action.references = newReferences;
                    });
                }
            });
            entity.extended = true;
            model.entities[entityName] = entity;
        });
        return model;
    }

    _resolveInheritance(model, ancestors) {
        const extendsList = Array.isArray(model.extends) ? model.extends : (model.extends ? [model.extends] : []);
        if (extendsList.length === 0) return model;
        
        ancestors = (Array.isArray(ancestors)) ? ancestors : [];
        
        extendsList.map((extend) => {
            let extendModel = this._clone(this.load(extend));
            model = this._merge(model, extendModel);
        });
        return model;
    }

    _merge(base, extend) {
        // entities
        let entities = Object.keys(extend.entities || {});
        entities.forEach( entityName => {
            if(!base.entities) base.entities = {};
            if(!base.entities[entityName]) {
                base.entities[entityName] = this._clone(extend.entities[entityName]);
            } else {
                let extendEntity = this._clone( extend.entities[entityName] );
                base.entities[entityName] = this._deepMerge(base.entities[entityName], extendEntity);
            }
            if( !base.entities[entityName].extendedFrom ) {
                base.entities[entityName].extendedFrom = {
                    "domain": extend.meta.domain,
                    "version": extend.meta.version,
                };
            }
        });
        // actors
        let actors = extend.actors || [];
        if(!base.actors) base.actors = [];
        actors.forEach( actorName => {
            if(!base.actors.includes(actorName)) {
                base.actors.push(actorName);
            }
        });
        // contexts
        let contexts = Object.keys(extend.contexts || {});
        contexts.forEach( contextName => {
            if(!base.contexts) base.contexts = {};
            if(!base.contexts[contextName]) {
                base.contexts[contextName] = extend.contexts[contextName];
            } else {
                base.contexts[contextName] = this._deepMerge(base.contexts[contextName], extend.contexts[contextName]);
            }
            if( !base.contexts[contextName].extendedFrom ) {
                base.contexts[contextName].extendedFrom = {
                    "domain": extend.meta.domain,
                    "version": extend.meta.version
                };
            }
        });
        return base;
    }

    _deepMerge(base, override) {
        if (Array.isArray(base) || Array.isArray(override)) {
            const merged = [...(base || []), ...(override || [])];
            if (merged.length > 0 && merged.every((item) => this._isReferenceItem(item))) {
                return this._dedupeReferences(merged);
            }
            return [...new Set(merged)];
        }
        if (this._isPlain(base) && this._isPlain(override)) {
            const keys = new Set([...Object.keys(base || {}), ...Object.keys(override || {})]);
            const out = {};
            for (const key of keys) {
                out[key] = this._deepMerge(base?.[key], override?.[key]);
            }
            return out;
        }
        return override ?? base; // primitives or override wins
    }

    _isPlain(obj) {
        return obj && typeof obj === 'object' && !Array.isArray(obj);
    }

    _isReferenceItem(item) {
        return this._isPlain(item)
            && typeof item.type === 'string'
            && typeof item.target === 'string'
            && typeof item.cardinality === 'string';
    }

    _dedupeReferences(items) {
        const seen = new Set();
        const out = [];
        items.forEach((item) => {
            const key = `${item.type}|${item.target}|${item.cardinality}`;
            if (seen.has(key)) return;
            seen.add(key);
            out.push(item);
        });
        return out;
    }

    _clone(obj) {
        if (typeof structuredClone === 'function') {
            return structuredClone(obj);
        }
        return JSON.parse(JSON.stringify(obj));
    }

    _generateRelationshipMap(model) {
        let entities = Object.keys(model.entities);
        let refs = [];
        model.relationships = {};
        entities.forEach(entityName => {
            let entity = model.entities[entityName];
            entity.incomingRelationships = [];
            entity.outgoingRelationships = [];
            let actions = entity.actions;
            if(typeof actions !== 'object') return;
            let actionNames = Object.keys(actions);
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
                
            });
        });
        model['relationships'] = {};
        refs.forEach( ref => {
            let refName = `${ref.source}--${ref.event}-->${ref.type}-->${ref.target}`;
            model['relationships'][refName] = ref;
            
            if(model.entities[ref.source]){
                if( !model.entities[ref.source]['outgoingRelationships'] ) {
                    model.entities[ref.source]['outgoingRelationships'] = [];
                }
                model.entities[ref.source]['outgoingRelationships'].push(refName);
            }
            if(model.entities[ref.target]) {
                if( !model.entities[ref.target]['incomingRelationships'] ) {
                    model.entities[ref.target]['incomingRelationships'] = [];
                }
                model.entities[ref.target]['incomingRelationships'].push(refName);
            }
        });
        return model;
    }

    _generateContextMap(model) {
        let entities = Object.keys(model.entities || {});
        entities.forEach(entityName => {
            let entity = model.entities[entityName];
            let actions = entity.actions;
            if(typeof actions !== 'object') return;
            let actionNames = Object.keys(actions);
            actionNames.forEach( actionName => {
                let action = actions[actionName];
                let contexts = [];
                if(action.requiredContext && action.requiredContext.length > 0 ) {
                    contexts = contexts.concat( action.requiredContext );
                }
                if(action.optionalContext && action.optionalContext.length > 0 ) {
                    contexts = contexts.concat( action.optionalContext );
                }
                contexts.forEach( contextName => {
                    if(typeof model.contexts !== 'object' || !model.contexts[contextName]) {
                        let msg = `Action "${actionName}" of entity "${entityName}" references unknown context "${contextName}"`;
                        throw new Error(msg);
                    }
                    model.contexts[contextName].usedBy = model.contexts[contextName].usedBy || {};
                    let useKey = entityName + '::' + actionName;
                    if( !Object.keys( model.contexts[contextName].usedBy ).includes( useKey ) ) { 
                        model.contexts[contextName].usedBy[ useKey ] = {
                            "entity": entityName,
                            "action": actionName
                        };
                    }
                });
            });
        });
        // let contexts = Object.keys(model.contexts || {});
        return model;
    }
}

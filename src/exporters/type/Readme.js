import Exporter from '../Exporter.js';

class Readme extends Exporter {
    constructor() {
        super();
    }

    build(model) {
        super.build(model);
        this.pages = {};
        
        this.addPage('overview', `Domain model '${this.model.meta.domain}'`);
        this.addParagraph('overview',  this.model.meta.description );
        this.addKeyValue('overview', 'Version', this.model.meta.version);
        this.addKeyValue('overview', 'Generated on', new Date().toISOString() );
        // full description
        if(this.model.meta.extendedDescription) {
            this.addHeading('overview', 1, 'Extended Description');
            this.addPage(
                'extendedDescription', 
                `Domain model '${this.model.meta.domain}'; Full JSON`,
                [ {page: 'overview', text: `Back to '${this.model.meta.domain}' domain overview `} ]
            );
            this.addMarkdown('extendedDescription', this.model.meta.extendedDescription);
            this.addParagraph('overview', '- ' + this.getPageLink('extendedDescription', 'Extended Description') + ' ');
        }
        // extends
        if(Array.isArray(this.model.extends) && this.model.extends.length > 0) {
            this.addHeading('overview', 1, 'Extends');
            this.model.extends.forEach( extendedDomain => {
                this.addParagraph('overview', `- ${extendedDomain} `);
            });
        }
        // entities
        this.buildEntityPages();
        // contexts
        this.buildContextPages();
        // actors
        this.addHeading('overview', 1, 'Actors');
        let actors = this.model.actors;
        actors.sort((a, b) => a.localeCompare(b));
        actors.forEach( actorName => {
            let pageName = 'entity_' + actorName
            this.addParagraph('overview', 
                '- ' + this.getPageLink(pageName, actorName) + ' '
            );
        });
        // full json
        this.addPage(
            'fullJson', 
            `Domain model '${this.model.meta.domain}'; Full JSON`,
            [ {page: 'overview', text: `Back to '${this.model.meta.domain}' domain overview `} ]
        );
        let modelCopy = JSON.parse( JSON.stringify(this.model) );
        if(modelCopy.meta.extendedDescription) {
            delete modelCopy.meta.extendedDescription;
        }
        this.addJson('fullJson', modelCopy);
        this.addHeading('overview', 1, 'Full JSON Model');
        this.addParagraph('overview', '- ' + this.getPageLink('fullJson', 'Full JSON') + ' ');
        // FINISH HIIIM
        this.writeAllFiles();
    }

    writeAllFiles() {
        for(const pageName in this.pages) {
            const fileContent = this.pages[pageName].join('\n');
            this.writefile(pageName + '.md', fileContent);
        }
    }

    buildEntityPages() {
        let entities = Object.keys(this.model.entities);
        entities.sort((a, b) => a.localeCompare(b));
        this.addHeading('overview', 1, 'Entities');
        let entityList = {};
        entities.forEach( entityName => {
            let page = this.buildEntityPage(this.model.entities[entityName], entityName);
            let extendedFrom = this.model.entities[entityName].extendedFrom;
            let domainKey = extendedFrom ? `${extendedFrom.domain}@${extendedFrom.version}` : 'local';
            if(!entityList[domainKey]) {
                entityList[domainKey] = {
                    extendedFrom: extendedFrom,
                    entities: []
                };
            }
            entityList[domainKey].entities.push( {
                name: entityName,
                page: page,
                description: this.model.entities[entityName].description
            } );
        });
        entityList['local']?.entities?.forEach( entityInfo => {
            this.addParagraph('overview', 
                '- ' + this.getPageLink(entityInfo.page, entityInfo.name) + ': ' + entityInfo.description
            );
        });
        if(entityList['local']?.entities?.length === undefined || entityList['local']?.entities?.length < 1) {
            this.addParagraph('overview', this.italic('No local entities defined.'));
        }
        delete entityList['local'];
        let domains = Object.keys(entityList);
        domains.sort((a, b) => a.localeCompare(b));
        domains.forEach( domainKey => {
        // for(const domainKey in entityList) {
            let domainInfo = entityList[domainKey];
            this.addHeading('overview', 3, `Extended from domain ${domainInfo.extendedFrom.domain} (${domainInfo.extendedFrom.version})`);
            domainInfo.entities.forEach( entityInfo => {
                this.addParagraph('overview', 
                    '- ' + this.getPageLink(entityInfo.page, entityInfo.name) + ': ' + entityInfo.description
                );
            });
        });

    }

    buildEntityPage(entity, entityName) {
        let pageName = this.addPage(
            'entity_' + entityName, 
            `Entity: ${entityName}`,
            [ {page: 'overview', text: `Back to '${this.model.meta.domain}' domain overview `} ]
        );
        this.addParagraph(pageName, entity.description);
        
        // extends
        if(entity.extends && entity.extends.length > 0 ) {
            this.addHeading(pageName, 1, 'Extends');
            let extendedEntities = [];
            entity.extends.forEach( extendedEntityName => {
                extendedEntities.push( this.getPageLink('entity_' + extendedEntityName, extendedEntityName) );
            });
            this.addParagraph(pageName, '- ' + extendedEntities.join('\n- '));
        }

        // extededFrom
        if(entity.extendedFrom) {
            this.addHeading(pageName, 1, 'Extended from');
            this.addParagraph(pageName, 
                `This entity is extended from domain ` +
                `**${entity.extendedFrom.domain}** version **${entity.extendedFrom.version}**.`
            );
        }

        // identifiers
        this.addHeading(pageName, 1, 'Identifiers');
        let identifiers = Object.keys(entity.identifiers);
        identifiers.sort((a, b) => a.localeCompare(b));
        let rows = [];
        identifiers.forEach( identifierName => {
            let identifier = entity.identifiers[identifierName];
            let extendedFrom = (identifier.extendedFrom) ? `${identifier.extendedFrom.domain}, ${identifier.extendedFrom.version}, ${identifier.extendedFrom.entity}` : '-';
            rows.push( [
                this.bold(identifierName),
                (identifier.type?identifier.type:'-'),
                (identifier.required===true?'Yes':'No'),
                (identifier.description?identifier.description:'-'),
                extendedFrom
            ] );
        });
        this.addTable(pageName, ['Identifier', 'Type', 'Required', 'Description', 'Extended From'], rows );

        // actions
        this.addHeading(pageName, 1, 'Actions');
        if(entity.actions && Object.keys(entity.actions).length > 0 ) {
            let actions = Object.keys(entity.actions);
            actions.sort((a, b) => a.localeCompare(b));
            actions.forEach( actionName => {
                let action = entity.actions[actionName];
                let extendedFrom = (action.extendedFrom) ? `${action.extendedFrom.domain}, ${action.extendedFrom.version}, ${action.extendedFrom.entity}` : null;
                if(extendedFrom) {
                    this.addKeyValue(pageName, 'Extended from', extendedFrom);
                }
                this.addHeading(pageName, 2, `${actionName}`);
                this.addParagraph(pageName, action.description);
                // performedBy
                if(action.performedBy && action.performedBy.length > 0 ) {
                    let performedActors = [];
                    action.performedBy.forEach( actorName => {
                        performedActors.push( this.getPageLink('entity_' + actorName, actorName));
                    });
                    this.addKeyValue(pageName, 'Performed by', performedActors.join(', '));
                } else {
                    this.addParagraph(pageName, this.italic('(This action is not performed by an actor.)'));
                }
                // references
                if(action.references && action.references.length > 0 ) {
                    this.addParagraph(pageName, this.bold('References:'));
                    action.references.forEach( reference => {
                        let targetLink = this.getPageLink('entity_' + reference.target, reference.target);
                        this.addParagraph(pageName, 
                            `  (${reference.type}, ${reference.cardinality}) to ${targetLink}` +
                            (reference.description?`: ${reference.description}`:'')
                        );
                    });
                    let refRows = [];
                }
                // requiredContext
                if(action.requiredContext && action.requiredContext.length > 0 ) {
                    let requiredContextPrint = [];
                    action.requiredContext.forEach( contextName => {
                        requiredContextPrint.push(this.getPageLink('context_' + contextName, contextName));
                    });
                    this.addKeyValue(pageName, 'Required context', requiredContextPrint.join(', '));
                }
                // optionalContext
                if(action.optionalContext && action.optionalContext.length > 0 ) {
                    let optionalContextPrint = [];
                    action.optionalContext.forEach( contextName => {
                        optionalContextPrint.push(this.getPageLink('context_' + contextName, contextName));
                    });
                    this.addKeyValue(pageName, 'Optional context', optionalContextPrint.join(', '));
                }
            });
        } else {
            this.addParagraph(pageName, this.italic('This entity has no actions.'));
        }

        // relationships
        this.addHeading(pageName, 1, 'Relationships');
        this.addHeading(pageName, 2, 'Incoming relationships');
        if(entity.incomingRelationships && entity.incomingRelationships.length > 0 ) {
            entity.incomingRelationships.forEach( relName => {
                let rel = this.model.relationships[relName];
                let from = this.getPageLink('entity_' + rel.source, rel.source);
                this.addParagraph(pageName,
                    `- From **${from}** via action **${rel.event}** (${rel.type} ${rel.cardinality})` +
                    (rel.description?`: ${rel.description}`:'')
                );
            });
        } else {
            this.addParagraph(pageName, this.italic('This entity has no incoming relationships.'));
        }
        this.addHeading(pageName, 2, 'Outgoing relationships');
        if(entity.outgoingRelationships && entity.outgoingRelationships.length > 0 ) {
            entity.outgoingRelationships.forEach( relName => {
                let rel = this.model.relationships[relName];
                let to = this.getPageLink('entity_' + rel.target, rel.target);
                this.addParagraph(pageName, 
                    `- to **${to}** via action **${rel.event}** (${rel.type}  ${rel.cardinality})` +
                    (rel.description?`: ${rel.description}`:'')
                );
            });
        } else {
            this.addParagraph(pageName, this.italic('This entity has no incoming relationships.'));
        }
        // adjectives
        this.addHeading(pageName, 1, 'Adjectives');
        if(entity.adjectives && Object.keys(entity.adjectives).length > 0 ) {
            let adjectives = Object.keys(entity.adjectives);
            adjectives.sort((a, b) => a.localeCompare(b));
            let rows = [];
            adjectives.forEach( adjectiveName => {
                let adjective = entity.adjectives[adjectiveName];
                
                rows.push( [
                    this.bold(adjectiveName),
                    (adjective.description?adjective.description:'-'),
                ] );
            });
            this.addTable(pageName, ['Adjective', 'Description'], rows );
        } else {
            this.addParagraph(pageName, this.italic('This entity has no adjectives.'));
        }

        return pageName;
    }

    buildContextPages() {
        let contexts = Object.keys(this.model.contexts);
        if(contexts.length === 0) {
            return;
        }
        contexts.sort((a, b) => a.localeCompare(b));
        this.addHeading('overview', 1, 'Contexts');
        contexts.forEach( contextName => {
            let page = this.buildContextPage(this.model.contexts[contextName], contextName);
            this.addParagraph('overview', 
                '- '+ 
                this.getPageLink(page, contextName) + ': ' + this.model.contexts[contextName].description
            );
        });
    }

    buildContextPage(context, contextName) {
        let pageName = this.addPage(
            'context_' + contextName, 
            `Context: ${contextName}`,
            [ {page: 'overview', text: `Back to '${this.model.meta.domain}' domain overview `} ]
        );
        this.addKeyValue(pageName, 'Description', context.description);
        this.addKeyValue(pageName, 'Type', context.type);
        if(context.type === 'enum' && Array.isArray(context.values)) {
            context.values.sort((a, b) => a.localeCompare(b));
            this.addKeyValue(pageName, 'Values', context.values.join(', '));
        }
        this.addHeading(pageName, 1, 'Used by actions');
        let usedBy = Object.keys(context.usedBy || {});
        if(usedBy.length === 0) {
            this.addParagraph(pageName, this.italic('This context is not used by any action.'));
            return pageName;
        }
        usedBy.sort((a, b) => a.localeCompare(b));
        usedBy.forEach( entityName => {
            let usage = context.usedBy[entityName];
            let entityPage = this.getPageLink('entity_' + usage.entity, usage.entity);
            this.addParagraph(pageName, 
                `- Entity ${entityPage}, Action **${usage.action}**`
            );
        });
            
        
        return pageName;
    }

    // md helpers
    addPage(pageName, title, breadcrumbs) {
        title = title || pageName;
        this.pages[pageName] = [];
        this.pages[pageName].push( `# ${title}` );
        if( Array.isArray(breadcrumbs) ) {
            let breadcrumbText = breadcrumbs.map( bc => {
                return this.getPageLink(bc.page, bc.text);
            }).join(' / ');
            this.addParagraph(pageName, '< ' + breadcrumbText);
            this.addHr(pageName);
        }
        return pageName;
    }

    addHeading(pageName, level, text) {
        level = level + 1;
        let paddingTop = 6-(level>6?0:level);
        this.pages[pageName].push( "\n".repeat(paddingTop) + '#'.repeat(level) + ' ' + text  );
    }

    addHr(pageName) {
        this.pages[pageName].push( '\n---\n' );
    }

    addParagraph(pageName, text) {
        if(Array.isArray(text)) {
            let nText = []
            text.forEach( t => {
                this.addParagraph(pageName, t);
            });
            return;
        }
        this.pages[pageName].push( text + '  ');
        return;
    }

    addTable(pageName, headers, rows) {
        let md = '\n';
        if(headers && headers.length > 0) {
            md += '| ' + headers.join(' | ') + ' |\n';
            md += '| ' + headers.map( h => '---' ).join(' | ') + ' |\n';
        }
        rows.forEach( row => {
            md += '| ' + row.join(' | ') + ' |\n';
        });
        this.pages[pageName].push( md );
        return;
    }

    addKeyValue(pageName, key, value) {
        this.addParagraph(pageName, `**${key}:** ${value}` );
    }

    addJson(pageName, obj) {
        let jsonString = JSON.stringify(obj, null, 2);
        this.pages[pageName].push( '```json\n' + jsonString + '\n```' );
    }

    addMarkdown(pageName, markdownText) {
        const normalized = markdownText.replace(/\\n/g, '\n');
        this.pages[pageName].push( normalized );
    }

    getPageLink(pageName, text) {
        text = text || pageName;
        return `[${text}](./${pageName}.md)`;
    }

    bold(text) {
        return `**${text}**`;
    }

    italic(text) {
        return `*${text}*`;
    }

}

export default Readme;
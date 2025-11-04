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

        this.buildEntityPages();

        this.addHeading('overview', 1, 'Actors');
        let actors = this.model.actors;
        actors.sort((a, b) => a.localeCompare(b));
        actors.forEach( actorName => {
            let pageName = 'entity_' + actorName
            this.addParagraph('overview', 
                '- ' + this.getPageLink(pageName, actorName) + ' '
            );
        });

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
        entities.forEach( entityName => {
            let page = this.buildEntityPage(this.model.entities[entityName], entityName);
            this.addParagraph('overview', 
                '- '+ 
                this.getPageLink(page, entityName) + ': ' + 
                this.model.entities[entityName].description
            );
            // this.setupEntity(entity, entityName);
        });
    }

    buildEntityPage(entity, entityName) {
        let pageName = this.addPage(
            'entity_' + entityName, 
            `Entity: ${entityName}`,
            [ {page: 'overview', text: `Back to '${this.model.meta.domain}' domain overview `} ]
        );
        this.addParagraph(pageName, entity.description);
        
        // identifiers
        this.addHeading(pageName, 1, 'Identifiers');
        let identifiers = Object.keys(entity.identifiers);
        identifiers.sort((a, b) => a.localeCompare(b));
        let rows = [];
        identifiers.forEach( identifierName => {
            let identifier = entity.identifiers[identifierName];
            rows.push( [
                this.bold(identifierName),
                (identifier.type?identifier.type:'-'),
                (identifier.required===true?'Yes':'No'),
                (identifier.description?identifier.description:'-')
            ] );
        });
        this.addTable(pageName, ['Identifier', 'Type', 'Required', 'Description'], rows );

        // actions
        this.addHeading(pageName, 1, 'Actions');
        if(entity.actions && Object.keys(entity.actions).length > 0 ) {
            let actions = Object.keys(entity.actions);
            actions.sort((a, b) => a.localeCompare(b));
            actions.forEach( actionName => {
                let action = entity.actions[actionName];
                this.addHeading(pageName, 2, `${actionName}`);
                this.addParagraph(pageName, action.description);
                // performedBy
                if(action.performedBy && action.performedBy.length > 0 ) {
                    this.addKeyValue(pageName, 'Performed by', action.performedBy.join(', '));
                }
                // requiredContext
                if(action.requiredContext && action.requiredContext.length > 0 ) {
                    this.addKeyValue(pageName, 'Required context', action.requiredContext.join(', '));
                }
                // optionalContext
                if(action.optionalContext && action.optionalContext.length > 0 ) {
                    this.addKeyValue(pageName, 'Optional context', action.optionalContext.join(', '));
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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Exporter from '../Exporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const modelsDir = path.join(projectRoot, 'models');
const docsDir = path.join(projectRoot, 'node_modules', '@compilacion', 'colleciones-clientos', 'docs');
const agentInstructionsPath = path.join(projectRoot, 'assets', 'llm', 'agentInstructions.md');

class Llm extends Exporter {
    constructor() {
        super();
    }

    resetExporter() {
        fs.mkdirSync(path.join(projectRoot, 'build', 'llm'), { recursive: true });
    }

    writefile(filename, contents) {
        const outputPath = path.join(
            projectRoot,
            'build',
            'llm',
            `${this.model.meta.domain}_${this.model.meta.version}.md`,
        );
        fs.writeFileSync(outputPath, contents, 'utf8');
        return outputPath;
    }

    build(model) {
        super.build(model);
        const content = this.buildModelDocument();
        this.writefile(null, content);
    }

    buildModelDocument() {
        const lines = [];
        const model = this.model;
        const generatedAt = new Date().toISOString();
        const entities = this.sortedKeys(model.entities);
        const contexts = this.sortedKeys(model.contexts || {});
        const relationships = this.sortedKeys(model.relationships || {});
        const actors = [...(model.actors || [])].sort((a, b) => a.localeCompare(b));

        lines.push(`# Model: ${model.meta.domain}`);
        lines.push('');
        lines.push('## Model Metadata');
        lines.push(`- Domain: \`${model.meta.domain}\``);
        lines.push(`- Version: \`${model.meta.version}\``);
        lines.push(`- Description: ${model.meta.description || 'No description provided.'}`);
        lines.push(`- Extends: ${this.formatInlineList(model.extends)}`);
        lines.push(`- Generated at: \`${generatedAt}\``);
        lines.push('');

        lines.push(this.buildDomainInheritanceSection().trim());
        lines.push('');

        lines.push(this.readAgentInstructions().trim());
        lines.push('');

        lines.push('## Colleciones Foundation');
        lines.push('');
        lines.push(`This domain model is based on **Colleciones**, the semantic event modeling approach that structures tracked behavior as explicit combinations of entity, action, actor, identifiers, context, and references.`);
        lines.push(`The local domain model in \`${model.meta.domain}\` applies that Colleciones foundation to a specific business or delivery domain, so entities, actions, relationships, and contexts in this document should be interpreted as domain-specific semantic building blocks on top of Colleciones.`);
        lines.push('');
        lines.push('### Why This Matters');
        lines.push('- The model is not just a list of event names; it is a semantic vocabulary.');
        lines.push('- Entities define what exists in the domain.');
        lines.push('- Actions define what can happen to those entities.');
        lines.push('- Actors, identifiers, contexts, and references explain who caused an action and under which conditions it happened.');
        lines.push('- Relationships emerge from those actions and references and can be used for graph-style reasoning.');
        lines.push('');

        const upstreamDocs = this.buildCollecionesDocumentationSection();
        if (upstreamDocs) {
            lines.push('## Colleciones Documentation');
            lines.push('');
            lines.push('The following Markdown sections are imported from the upstream Colleciones documentation and included here as supporting reference material.');
            lines.push('');
            lines.push(upstreamDocs.trim());
            lines.push('');
        }

        lines.push('## Domain Summary');
        lines.push(`- Entities: ${entities.length}`);
        lines.push(`- Actors: ${actors.length}`);
        lines.push(`- Contexts: ${contexts.length}`);
        lines.push(`- Relationships: ${relationships.length}`);
        lines.push('');

        if (model.meta.extendedDescription) {
            lines.push('## Extended Description');
            lines.push('');
            lines.push(this.unescapeStoredMarkdown(model.meta.extendedDescription).trim());
            lines.push('');
        }

        lines.push('## Entities Overview');
        if (entities.length === 0) {
            lines.push('- None');
        } else {
            entities.forEach((entityName) => {
                const entity = model.entities[entityName];
                const extendsText = entity.extends?.length ? `; extends ${entity.extends.map((name) => `\`${name}\``).join(', ')}` : '';
                lines.push(`- \`${entityName}\`: ${entity.description || 'No description provided.'}${extendsText}`);
            });
        }
        lines.push('');

        lines.push('## Actors');
        if (actors.length === 0) {
            lines.push('- None');
        } else {
            actors.forEach((actor) => lines.push(`- \`${actor}\``));
        }
        lines.push('');

        lines.push('## Contexts Overview');
        if (contexts.length === 0) {
            lines.push('- None');
        } else {
            contexts.forEach((contextName) => {
                const context = model.contexts[contextName];
                const typeText = context.type ? ` (${context.type})` : '';
                lines.push(`- \`${contextName}\`${typeText}: ${context.description || 'No description provided.'}`);
            });
        }
        lines.push('');

        lines.push('## Relationships Overview');
        if (relationships.length === 0) {
            lines.push('- None');
        } else {
            relationships.forEach((relationshipName) => {
                const relationship = model.relationships[relationshipName];
                lines.push(`- \`${relationship.source} --${relationship.event}/${relationship.type}:${relationship.cardinality}--> ${relationship.target}\``);
            });
        }
        lines.push('');

        lines.push('## Entity Details');
        lines.push('');
        if (entities.length === 0) {
            lines.push('No entities defined.');
            lines.push('');
        } else {
            entities.forEach((entityName) => {
                lines.push(this.buildEntitySection(entityName, model.entities[entityName]));
            });
        }

        lines.push('## Context Details');
        lines.push('');
        if (contexts.length === 0) {
            lines.push('No contexts defined.');
            lines.push('');
        } else {
            contexts.forEach((contextName) => {
                lines.push(this.buildContextSection(contextName, model.contexts[contextName]));
            });
        }

        lines.push('## Relationship Details');
        lines.push('');
        if (relationships.length === 0) {
            lines.push('No relationships defined.');
            lines.push('');
        } else {
            relationships.forEach((relationshipName) => {
                lines.push(this.buildRelationshipSection(relationshipName, model.relationships[relationshipName]));
            });
        }

        return lines.join('\n');
    }

    buildDomainInheritanceSection() {
        const lines = [];
        const summary = this.getDomainInheritanceSummary(this.model.meta.domain);

        lines.push('## Domain Inheritance');
        lines.push('');
        lines.push(`- Direct parents: ${this.formatInlineList(summary.directParents)}`);
        lines.push(`- Full inheritance chain: ${summary.chain.length > 0 ? summary.chain.map((name) => `\`${name}\``).join(' -> ') : 'None'}`);
        lines.push('');
        lines.push('### Inheritance Tree');

        if (summary.treeLines.length === 0) {
            lines.push('- No parent domains');
        } else {
            summary.treeLines.forEach((line) => {
                lines.push(`- ${line}`);
            });
        }

        return lines.join('\n');
    }

    readAgentInstructions() {
        if (!fs.existsSync(agentInstructionsPath)) {
            return '## Agent Instructions\n';
        }
        return fs.readFileSync(agentInstructionsPath, 'utf8');
    }

    getDomainInheritanceSummary(domainName) {
        const chain = [];
        const visited = new Set();
        const directParents = this.getDirectParentDomains(domainName);
        const walkChain = (name) => {
            const parents = this.getDirectParentDomains(name);
            parents.forEach((parent) => {
                if (visited.has(parent)) {
                    return;
                }
                visited.add(parent);
                chain.push(parent);
                walkChain(parent);
            });
        };

        walkChain(domainName);

        return {
            directParents,
            chain,
            treeLines: this.buildInheritanceTreeLines(domainName),
        };
    }

    buildInheritanceTreeLines(domainName, prefix = '', visited = new Set()) {
        const parents = this.getDirectParentDomains(domainName);
        if (parents.length === 0) {
            return [];
        }

        const lines = [];

        parents.forEach((parent, index) => {
            const isLast = index === parents.length - 1;
            const branch = `${prefix}${isLast ? '└─ ' : '├─ '}\`${parent}\``;
            lines.push(branch);

            const nextPrefix = `${prefix}${isLast ? '   ' : '│  '}`;
            const visitKey = `${domainName}->${parent}`;
            if (visited.has(visitKey)) {
                return;
            }
            visited.add(visitKey);
            const childLines = this.buildInheritanceTreeLines(parent, nextPrefix, visited);
            childLines.forEach((line) => lines.push(line));
        });

        return lines;
    }

    getDirectParentDomains(domainName) {
        const rawModel = this.readRawModel(domainName);
        const extendsList = rawModel?.extends;
        if (Array.isArray(extendsList)) {
            return [...extendsList];
        }
        if (typeof extendsList === 'string' && extendsList.length > 0) {
            return [extendsList];
        }
        return [];
    }

    readRawModel(domainName) {
        const modelPath = path.join(modelsDir, `${domainName}.json`);
        if (!fs.existsSync(modelPath)) {
            return null;
        }
        return JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    }

    buildCollecionesDocumentationSection() {
        const files = this.listDocumentationFiles();
        if (files.length === 0) {
            return '';
        }

        const blocks = [];
        files.forEach((filePath) => {
            const relativePath = path.relative(docsDir, filePath);
            const raw = fs.readFileSync(filePath, 'utf8').trim();
            if (!raw) {
                return;
            }
            blocks.push(`### Source: ${relativePath}`);
            blocks.push('');
            blocks.push(this.downgradeMarkdownHeadings(raw, 1));
            blocks.push('');
        });

        return blocks.join('\n');
    }

    listDocumentationFiles(currentDir = docsDir) {
        if (!fs.existsSync(currentDir)) {
            return [];
        }

        const entries = fs.readdirSync(currentDir, { withFileTypes: true })
            .sort((a, b) => a.name.localeCompare(b.name));
        const files = [];

        entries.forEach((entry) => {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                files.push(...this.listDocumentationFiles(fullPath));
                return;
            }
            if (entry.isFile() && entry.name.endsWith('.md')) {
                files.push(fullPath);
            }
        });

        return files.sort((a, b) => {
            const relA = path.relative(docsDir, a);
            const relB = path.relative(docsDir, b);
            if (relA === 'concept.md') return -1;
            if (relB === 'concept.md') return 1;
            return relA.localeCompare(relB);
        });
    }

    downgradeMarkdownHeadings(markdown, levelOffset = 1) {
        return String(markdown || '').replace(/^(#{1,6})(\s+)/gm, (_, hashes, spacing) => {
            const downgradedLevel = Math.min(hashes.length + levelOffset, 6);
            return `${'#'.repeat(downgradedLevel)}${spacing}`;
        });
    }

    buildEntitySection(entityName, entity) {
        const lines = [];
        const identifiers = this.sortedKeys(entity.identifiers || {});
        const actions = this.sortedKeys(entity.actions || {});
        const adjectives = this.sortedKeys(entity.adjectives || {});
        const incomingRelationships = [...(entity.incomingRelationships || [])].sort((a, b) => a.localeCompare(b));
        const outgoingRelationships = [...(entity.outgoingRelationships || [])].sort((a, b) => a.localeCompare(b));

        lines.push(`### Entity: ${entityName}`);
        lines.push('');
        lines.push(`- Description: ${entity.description || 'No description provided.'}`);
        lines.push(`- Extends: ${this.formatInlineList(entity.extends)}`);
        lines.push(`- Extended from: ${this.formatExtendedFrom(entity.extendedFrom)}`);
        lines.push('');

        lines.push('#### Identifiers');
        if (identifiers.length === 0) {
            lines.push('- None');
        } else {
            identifiers.forEach((identifierName) => {
                const identifier = entity.identifiers[identifierName];
                lines.push(`- \`${identifierName}\`: type=\`${identifier.type || '-'}\`, required=\`${identifier.required === true}\`, description=${identifier.description || 'No description provided.'}, extended_from=${this.formatExtendedFrom(identifier.extendedFrom)}`);
            });
        }
        lines.push('');

        lines.push('#### Actions');
        if (actions.length === 0) {
            lines.push('- None');
        } else {
            actions.forEach((actionName) => {
                const action = entity.actions[actionName];
                lines.push(`##### Action: ${actionName}`);
                lines.push(`- Description: ${action.description || 'No description provided.'}`);
                lines.push(`- Extended from: ${this.formatExtendedFrom(action.extendedFrom)}`);
                lines.push(`- Performed by: ${this.formatInlineList(action.performedBy)}`);
                lines.push(`- Required context: ${this.formatInlineList(action.requiredContext)}`);
                lines.push(`- Optional context: ${this.formatInlineList(action.optionalContext)}`);
                if (Array.isArray(action.references) && action.references.length > 0) {
                    lines.push('- References:');
                    action.references.forEach((reference) => {
                        lines.push(`  - target=\`${reference.target}\`, type=\`${reference.type}\`, cardinality=\`${reference.cardinality || 'one'}\`, description=${reference.description || 'No description provided.'}`);
                    });
                } else {
                    lines.push('- References: None');
                }
            });
        }
        lines.push('');

        lines.push('#### Adjectives');
        if (adjectives.length === 0) {
            lines.push('- None');
        } else {
            adjectives.forEach((adjectiveName) => {
                const adjective = entity.adjectives[adjectiveName];
                lines.push(`- \`${adjectiveName}\`: ${adjective.description || 'No description provided.'}`);
            });
        }
        lines.push('');

        lines.push('#### Relationships');
        lines.push(`- Incoming: ${incomingRelationships.length === 0 ? 'None' : ''}`);
        incomingRelationships.forEach((relationshipName) => {
            const relationship = this.model.relationships[relationshipName];
            lines.push(`  - \`${relationship.source} --${relationship.event}/${relationship.type}:${relationship.cardinality}--> ${relationship.target}\`${relationship.description ? `: ${relationship.description}` : ''}`);
        });
        lines.push(`- Outgoing: ${outgoingRelationships.length === 0 ? 'None' : ''}`);
        outgoingRelationships.forEach((relationshipName) => {
            const relationship = this.model.relationships[relationshipName];
            lines.push(`  - \`${relationship.source} --${relationship.event}/${relationship.type}:${relationship.cardinality}--> ${relationship.target}\`${relationship.description ? `: ${relationship.description}` : ''}`);
        });
        lines.push('');

        return lines.join('\n');
    }

    buildContextSection(contextName, context) {
        const lines = [];
        const usedBy = this.sortedKeys(context.usedBy || {});

        lines.push(`### Context: ${contextName}`);
        lines.push('');
        lines.push(`- Description: ${context.description || 'No description provided.'}`);
        lines.push(`- Type: \`${context.type || '-'}\``);
        lines.push(`- Extended from: ${this.formatExtendedFrom(context.extendedFrom)}`);
        if (context.type === 'enum' && Array.isArray(context.values)) {
            lines.push(`- Values: ${context.values.map((value) => `\`${value}\``).join(', ')}`);
        }
        lines.push('- Used by:');
        if (usedBy.length === 0) {
            lines.push('  - None');
        } else {
            usedBy.forEach((useKey) => {
                const usage = context.usedBy[useKey];
                lines.push(`  - entity=\`${usage.entity}\`, action=\`${usage.action}\``);
            });
        }
        lines.push('');

        return lines.join('\n');
    }

    buildRelationshipSection(relationshipName, relationship) {
        const lines = [];
        lines.push(`### Relationship: ${relationshipName}`);
        lines.push('');
        lines.push(`- Source entity: \`${relationship.source}\``);
        lines.push(`- Action: \`${relationship.event}\``);
        lines.push(`- Target entity: \`${relationship.target}\``);
        lines.push(`- Type: \`${relationship.type}\``);
        lines.push(`- Cardinality: \`${relationship.cardinality}\``);
        lines.push(`- Description: ${relationship.description || 'No description provided.'}`);
        lines.push('');
        return lines.join('\n');
    }

    sortedKeys(obj) {
        return Object.keys(obj || {}).sort((a, b) => a.localeCompare(b));
    }

    formatInlineList(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return 'None';
        }
        return items.map((item) => `\`${item}\``).join(', ');
    }

    formatExtendedFrom(extendedFrom) {
        if (!extendedFrom) {
            return 'None';
        }
        const parts = [extendedFrom.domain, extendedFrom.version, extendedFrom.entity].filter(Boolean);
        return parts.map((part) => `\`${part}\``).join(', ');
    }

    unescapeStoredMarkdown(text) {
        return String(text || '').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
    }
}

export default Llm;

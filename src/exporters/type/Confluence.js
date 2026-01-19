import Exporter from '../Exporter.js';
import MarkdownIt from 'markdown-it';

class Confluence extends Exporter {
    constructor() {
        super();
        this.pages = {};
        this.pageTitles = {};
        this.generatedPages = {};
        this.md = new MarkdownIt({ html: true, breaks: true });
        this.enabled = String(process.env.CONFLUENCE_ENABLED || '').toLowerCase() === 'true';
        this.baseUrl = (process.env.CONFLUENCE_BASE_URL || 'https://immoscoop.atlassian.net').replace(/\/+$/, '');
        this.spaceKey = process.env.CONFLUENCE_SPACE_KEY || 'DATA';
        this.parentPageId = process.env.CONFLUENCE_PARENT_PAGE_ID || '1102413825';
        this.email = process.env.CONFLUENCE_EMAIL;
        this.apiToken = process.env.CONFLUENCE_API_TOKEN;
    }

    resetExporter() {
        // No filesystem output for this exporter.
    }

    writefile() {
        // No filesystem output for this exporter.
    }

    build(model) {
        super.build(model);
        this.pages = {};
        this.pageTitles = {};
        this.generatedPages = {};

        this.addPage('overview', `Domain model '${this.model.meta.domain}'`);
        this.addParagraph('overview', this.model.meta.description);
        this.addKeyValue('overview', 'Version', this.model.meta.version);
        this.addKeyValue('overview', 'Generated on', new Date().toISOString());

        if (this.model.meta.extendedDescription) {
            this.addHeading('overview', 1, 'Extended Description');
            this.addPage(
                'extendedDescription',
                `Domain model '${this.model.meta.domain}'; Full JSON`,
                [ { page: 'overview', text: `Back to '${this.model.meta.domain}' domain overview ` } ]
            );
            this.addMarkdown('extendedDescription', this.model.meta.extendedDescription);
            this.addParagraph('overview', '- ' + this.getPageLink('extendedDescription', 'Extended Description') + ' ');
        }

        if (Array.isArray(this.model.extends) && this.model.extends.length > 0) {
            this.addHeading('overview', 1, 'Extends');
            this.model.extends.forEach(extendedDomain => {
                this.addParagraph('overview', `- ${extendedDomain} `);
            });
        }

        this.buildEntityPages();
        this.buildContextPages();

        this.addHeading('overview', 1, 'Actors');
        let actors = this.model.actors;
        actors.sort((a, b) => a.localeCompare(b));
        actors.forEach(actorName => {
            let pageName = 'entity_' + actorName;
            this.addParagraph('overview',
                '- ' + this.getPageLink(pageName, actorName) + ' '
            );
        });

        this.addPage(
            'fullJson',
            `Domain model '${this.model.meta.domain}'; Full JSON`,
            [ { page: 'overview', text: `Back to '${this.model.meta.domain}' domain overview ` } ]
        );
        let modelCopy = JSON.parse(JSON.stringify(this.model));
        if (modelCopy.meta.extendedDescription) {
            delete modelCopy.meta.extendedDescription;
        }
        this.addJson('fullJson', modelCopy);
        this.addHeading('overview', 1, 'Full JSON Model');
        this.addParagraph('overview', '- ' + this.getPageLink('fullJson', 'Full JSON') + ' ');

        this.writeAllFiles();
    }

    async postBuildHook() {
        if (!this.enabled) {
            // console.log('\tConfluence exporter skipped (set CONFLUENCE_ENABLED=true).');
            return;
        }
        await this.publish();
    }

    writeAllFiles() {
        for (const pageName in this.pages) {
            this.generatedPages[pageName] = this.pages[pageName].join('\n');
        }
    }

    buildEntityPages() {
        let entities = Object.keys(this.model.entities);
        entities.sort((a, b) => a.localeCompare(b));
        this.addHeading('overview', 1, 'Entities');
        let entityList = {};
        entities.forEach(entityName => {
            let page = this.buildEntityPage(this.model.entities[entityName], entityName);
            let extendedFrom = this.model.entities[entityName].extendedFrom;
            let domainKey = extendedFrom ? `${extendedFrom.domain}@${extendedFrom.version}` : 'local';
            if (!entityList[domainKey]) {
                entityList[domainKey] = {
                    extendedFrom: extendedFrom,
                    entities: []
                };
            }
            entityList[domainKey].entities.push({
                name: entityName,
                page: page,
                description: this.model.entities[entityName].description
            });
        });
        entityList['local']?.entities?.forEach(entityInfo => {
            this.addParagraph('overview',
                '- ' + this.getPageLink(entityInfo.page, entityInfo.name) + ': ' + entityInfo.description
            );
        });
        if (entityList['local']?.entities?.length === undefined || entityList['local']?.entities?.length < 1) {
            this.addParagraph('overview', this.italic('No local entities defined.'));
        }
        delete entityList['local'];
        let domains = Object.keys(entityList);
        domains.sort((a, b) => a.localeCompare(b));
        domains.forEach(domainKey => {
            let domainInfo = entityList[domainKey];
            this.addHeading('overview', 3, `Extended from domain ${domainInfo.extendedFrom.domain} (${domainInfo.extendedFrom.version})`);
            domainInfo.entities.forEach(entityInfo => {
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
            [ { page: 'overview', text: `Back to '${this.model.meta.domain}' domain overview ` } ]
        );
        this.addParagraph(pageName, entity.description);

        if (entity.extends && entity.extends.length > 0) {
            this.addHeading(pageName, 1, 'Extends');
            let extendedEntities = [];
            entity.extends.forEach(extendedEntityName => {
                extendedEntities.push(this.getPageLink('entity_' + extendedEntityName, extendedEntityName));
            });
            this.addParagraph(pageName, '- ' + extendedEntities.join('\n- '));
        }

        if (entity.extendedFrom) {
            this.addHeading(pageName, 1, 'Extended from');
            this.addParagraph(pageName,
                `This entity is extended from domain ` +
                `**${entity.extendedFrom.domain}** version **${entity.extendedFrom.version}**.`
            );
        }

        this.addHeading(pageName, 1, 'Identifiers');
        let identifiers = Object.keys(entity.identifiers);
        identifiers.sort((a, b) => a.localeCompare(b));
        let rows = [];
        identifiers.forEach(identifierName => {
            let identifier = entity.identifiers[identifierName];
            let extendedFrom = (identifier.extendedFrom) ? `${identifier.extendedFrom.domain}, ${identifier.extendedFrom.version}, ${identifier.extendedFrom.entity}` : '-';
            rows.push([
                this.bold(identifierName),
                (identifier.type ? identifier.type : '-'),
                (identifier.required === true ? 'Yes' : 'No'),
                (identifier.description ? identifier.description : '-'),
                extendedFrom
            ]);
        });
        this.addTable(pageName, ['Identifier', 'Type', 'Required', 'Description', 'Extended From'], rows);

        this.addHeading(pageName, 1, 'Actions');
        if (entity.actions && Object.keys(entity.actions).length > 0) {
            let actions = Object.keys(entity.actions);
            actions.sort((a, b) => a.localeCompare(b));
            actions.forEach(actionName => {
                let action = entity.actions[actionName];
                let extendedFrom = (action.extendedFrom) ? `${action.extendedFrom.domain}, ${action.extendedFrom.version}, ${action.extendedFrom.entity}` : null;
                if (extendedFrom) {
                    this.addKeyValue(pageName, 'Extended from', extendedFrom);
                }
                this.addHeading(pageName, 2, `${actionName}`);
                this.addParagraph(pageName, action.description);
                if (action.performedBy && action.performedBy.length > 0) {
                    let performedActors = [];
                    action.performedBy.forEach(actorName => {
                        performedActors.push(this.getPageLink('entity_' + actorName, actorName));
                    });
                    this.addKeyValue(pageName, 'Performed by', performedActors.join(', '));
                } else {
                    this.addParagraph(pageName, this.italic('(This action is not performed by an actor.)'));
                }
                if (action.requiredContext && action.requiredContext.length > 0) {
                    let requiredContextPrint = [];
                    action.requiredContext.forEach(contextName => {
                        requiredContextPrint.push(this.getPageLink('context_' + contextName, contextName));
                    });
                    this.addKeyValue(pageName, 'Required context', requiredContextPrint.join(', '));
                }
                if (action.optionalContext && action.optionalContext.length > 0) {
                    let optionalContextPrint = [];
                    action.optionalContext.forEach(contextName => {
                        optionalContextPrint.push(this.getPageLink('context_' + contextName, contextName));
                    });
                    this.addKeyValue(pageName, 'Optional context', optionalContextPrint.join(', '));
                }
            });
        } else {
            this.addParagraph(pageName, this.italic('This entity has no actions.'));
        }

        this.addHeading(pageName, 1, 'Relationships');
        this.addHeading(pageName, 2, 'Incoming relationships');
        if (entity.incomingRelationships && entity.incomingRelationships.length > 0) {
            entity.incomingRelationships.forEach(relName => {
                let rel = this.model.relationships[relName];
                let from = this.getPageLink('entity_' + rel.source, rel.source);
                this.addParagraph(pageName,
                    `- From **${from}** via action **${rel.event}** (${rel.type} ${rel.cardinality})` +
                    (rel.description ? `: ${rel.description}` : '')
                );
            });
        } else {
            this.addParagraph(pageName, this.italic('This entity has no incoming relationships.'));
        }
        this.addHeading(pageName, 2, 'Outgoing relationships');
        if (entity.outgoingRelationships && entity.outgoingRelationships.length > 0) {
            entity.outgoingRelationships.forEach(relName => {
                let rel = this.model.relationships[relName];
                let to = this.getPageLink('entity_' + rel.target, rel.target);
                this.addParagraph(pageName,
                    `- to **${to}** via action **${rel.event}** (${rel.type}  ${rel.cardinality})` +
                    (rel.description ? `: ${rel.description}` : '')
                );
            });
        } else {
            this.addParagraph(pageName, this.italic('This entity has no incoming relationships.'));
        }
        this.addHeading(pageName, 1, 'Adjectives');
        if (entity.adjectives && Object.keys(entity.adjectives).length > 0) {
            let adjectives = Object.keys(entity.adjectives);
            adjectives.sort((a, b) => a.localeCompare(b));
            let rows = [];
            adjectives.forEach(adjectiveName => {
                let adjective = entity.adjectives[adjectiveName];

                rows.push([
                    this.bold(adjectiveName),
                    (adjective.description ? adjective.description : '-'),
                ]);
            });
            this.addTable(pageName, ['Adjective', 'Description'], rows);
        } else {
            this.addParagraph(pageName, this.italic('This entity has no adjectives.'));
        }

        return pageName;
    }

    buildContextPages() {
        let contexts = Object.keys(this.model.contexts);
        if (contexts.length === 0) {
            return;
        }
        contexts.sort((a, b) => a.localeCompare(b));
        this.addHeading('overview', 1, 'Contexts');
        contexts.forEach(contextName => {
            let page = this.buildContextPage(this.model.contexts[contextName], contextName);
            this.addParagraph('overview',
                '- ' +
                this.getPageLink(page, contextName) + ': ' + this.model.contexts[contextName].description
            );
        });
    }

    buildContextPage(context, contextName) {
        let pageName = this.addPage(
            'context_' + contextName,
            `Context: ${contextName}`,
            [ { page: 'overview', text: `Back to '${this.model.meta.domain}' domain overview ` } ]
        );
        this.addKeyValue(pageName, 'Description', context.description);
        this.addKeyValue(pageName, 'Type', context.type);
        if (context.type === 'enum' && Array.isArray(context.values)) {
            context.values.sort((a, b) => a.localeCompare(b));
            this.addKeyValue(pageName, 'Values', context.values.join(', '));
        }
        this.addHeading(pageName, 1, 'Used by actions');
        let usedBy = Object.keys(context.usedBy || {});
        if (usedBy.length === 0) {
            this.addParagraph(pageName, this.italic('This context is not used by any action.'));
            return pageName;
        }
        usedBy.sort((a, b) => a.localeCompare(b));
        usedBy.forEach(entityName => {
            let usage = context.usedBy[entityName];
            let entityPage = this.getPageLink('entity_' + usage.entity, usage.entity);
            this.addParagraph(pageName,
                `- Entity ${entityPage}, Action **${usage.action}**`
            );
        });


        return pageName;
    }

    addPage(pageName, title, breadcrumbs) {
        title = title || pageName;
        this.pageTitles[pageName] = title;
        this.pages[pageName] = [];
        this.pages[pageName].push(`# ${title}`);
        if (Array.isArray(breadcrumbs)) {
            let breadcrumbText = breadcrumbs.map(bc => {
                return this.getPageLink(bc.page, bc.text);
            }).join(' / ');
            this.addParagraph(pageName, '< ' + breadcrumbText);
            this.addHr(pageName);
        }
        return pageName;
    }

    addHeading(pageName, level, text) {
        level = level + 1;
        let paddingTop = 6 - (level > 6 ? 0 : level);
        this.pages[pageName].push("\n".repeat(paddingTop) + '#'.repeat(level) + ' ' + text);
    }

    addHr(pageName) {
        this.pages[pageName].push('\n---\n');
    }

    addParagraph(pageName, text) {
        if (Array.isArray(text)) {
            text.forEach(t => {
                this.addParagraph(pageName, t);
            });
            return;
        }
        this.pages[pageName].push(text + '  ');
        return;
    }

    addTable(pageName, headers, rows) {
        let md = '\n';
        if (headers && headers.length > 0) {
            md += '| ' + headers.join(' | ') + ' |\n';
            md += '| ' + headers.map(h => '---').join(' | ') + ' |\n';
        }
        rows.forEach(row => {
            md += '| ' + row.join(' | ') + ' |\n';
        });
        this.pages[pageName].push(md);
        return;
    }

    addKeyValue(pageName, key, value) {
        this.addParagraph(pageName, `**${key}:** ${value}`);
    }

    addJson(pageName, obj) {
        let jsonString = JSON.stringify(obj, null, 2);
        this.pages[pageName].push('```json\n' + jsonString + '\n```');
    }

    addMarkdown(pageName, markdownText) {
        const normalized = markdownText.replace(/\\n/g, '\n');
        this.pages[pageName].push(normalized);
    }

    getPageLink(pageName, text) {
        const title = this.pageTitles[pageName] || text || pageName;
        return this.confluenceLink(title, text || title);
    }

    confluenceLink(title, text) {
        const safeTitle = this.escapeXml(title);
        const linkText = text || title;
        return `<ac:link><ri:page ri:content-title="${safeTitle}"/><ac:plain-text-link-body><![CDATA[${linkText}]]></ac:plain-text-link-body></ac:link>`;
    }

    escapeXml(value) {
        return String(value).replace(/[<>&'\"]/g, (char) => {
            switch (char) {
                case '<':
                    return '&lt;';
                case '>':
                    return '&gt;';
                case '&':
                    return '&amp;';
                case '\'':
                    return '&apos;';
                case '"':
                    return '&quot;';
                default:
                    return char;
            }
        });
    }

    ensureConfig() {
        const missing = [];
        if (!this.email) {
            missing.push('CONFLUENCE_EMAIL');
        }
        if (!this.apiToken) {
            missing.push('CONFLUENCE_API_TOKEN');
        }
        if (!this.spaceKey) {
            missing.push('CONFLUENCE_SPACE_KEY');
        }
        if (!this.parentPageId) {
            missing.push('CONFLUENCE_PARENT_PAGE_ID');
        }
        if (!this.baseUrl) {
            missing.push('CONFLUENCE_BASE_URL');
        }
        if (missing.length > 0) {
            throw new Error(`Missing Confluence config: ${missing.join(', ')}`);
        }
    }

    getAuthHeader() {
        const token = Buffer.from(`${this.email}:${this.apiToken}`, 'utf8').toString('base64');
        return `Basic ${token}`;
    }

    async request(path, { method = 'GET', query, body } = {}) {
        const base = `${this.baseUrl}/wiki/rest/api`;
        const url = new URL(path.startsWith('http') ? path : `${base}${path}`);
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined && value !== null) {
                    url.searchParams.set(key, value);
                }
            }
        }
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': this.getAuthHeader(),
        };
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Confluence API ${method} ${url} failed: ${response.status} ${response.statusText} - ${text}`);
        }
        if (response.status === 204) {
            return null;
        }
        return response.json();
    }

    async findPageByTitleUnderParent(title, parentId) {
        const data = await this.request('/content', {
            query: {
                spaceKey: this.spaceKey,
                title,
                expand: 'version,ancestors',
            },
        });
        return data.results.find((page) => (page.ancestors || []).some((a) => String(a.id) === String(parentId))) || null;
    }

    async createPage(parentId, title, storageValue) {
        const payload = {
            type: 'page',
            title,
            space: { key: this.spaceKey },
            ancestors: [{ id: parentId }],
            body: {
                storage: {
                    value: storageValue,
                    representation: 'storage',
                },
            },
        };
        const data = await this.request('/content', { method: 'POST', body: payload });
        return data.id;
    }

    async updatePage(existing, title, storageValue) {
        const payload = {
            id: existing.id,
            type: 'page',
            title,
            version: { number: existing.version.number + 1 },
            body: {
                storage: {
                    value: storageValue,
                    representation: 'storage',
                },
            },
        };
        const data = await this.request(`/content/${existing.id}`, { method: 'PUT', body: payload });
        return data.id;
    }

    async upsertPage(parentId, title, storageValue) {
        const existing = await this.findPageByTitleUnderParent(title, parentId);
        if (existing) {
            return this.updatePage(existing, title, storageValue);
        }
        return this.createPage(parentId, title, storageValue);
    }

    async listChildPages(parentId) {
        const results = [];
        let start = 0;
        const limit = 50;
        while (true) {
            const data = await this.request(`/content/${parentId}/child/page`, {
                query: { start, limit },
            });
            results.push(...data.results);
            if (data.total !== undefined && results.length >= data.total) {
                break;
            }
            if (!data._links || !data._links.next) {
                break;
            }
            if (data.size < limit) {
                break;
            }
            start += limit;
        }
        return results;
    }

    async deletePage(pageId) {
        await this.request(`/content/${pageId}`, { method: 'DELETE' });
    }

    async cleanupChildren(parentId, desiredTitles) {
        const children = await this.listChildPages(parentId);
        for (const child of children) {
            if (!desiredTitles.has(child.title)) {
                await this.deletePage(child.id);
            }
        }
    }

    renderStorage(markdown) {
        return this.md.render(markdown);
    }

    buildRootMarkdown() {
        this.pageTitles.entities_index = 'Entities';
        this.pageTitles.contexts_index = 'Contexts';
        const lines = [
            `# ${this.domainTitle}`,
            `**Version:** ${this.model.meta.version}`,
            `**Generated on:** ${new Date().toISOString()}`,
            '',
            `- ${this.getPageLink('overview', 'Overview')}`,
            `- ${this.getPageLink('entities_index', 'Entities')}`,
        ];
        if (Object.keys(this.model.contexts || {}).length > 0) {
            lines.push(`- ${this.getPageLink('contexts_index', 'Contexts')}`);
        }
        return lines.join('\n');
    }

    buildEntitiesIndexMarkdown() {
        const entities = Object.keys(this.model.entities || {});
        entities.sort((a, b) => a.localeCompare(b));
        const lines = ['# Entities', ''];
        if (entities.length === 0) {
            lines.push('*No entities defined.*');
            return lines.join('\n');
        }
        entities.forEach((entityName) => {
            const description = this.model.entities[entityName]?.description || '';
            const link = this.getPageLink(`entity_${entityName}`, entityName);
            lines.push(`- ${link}${description ? `: ${description}` : ''}`);
        });
        return lines.join('\n');
    }

    buildContextsIndexMarkdown() {
        const contexts = Object.keys(this.model.contexts || {});
        contexts.sort((a, b) => a.localeCompare(b));
        const lines = ['# Contexts', ''];
        if (contexts.length === 0) {
            lines.push('*No contexts defined.*');
            return lines.join('\n');
        }
        contexts.forEach((contextName) => {
            const description = this.model.contexts[contextName]?.description || '';
            const link = this.getPageLink(`context_${contextName}`, contextName);
            lines.push(`- ${link}${description ? `: ${description}` : ''}`);
        });
        return lines.join('\n');
    }

    async publish() {
        this.ensureConfig();
        this.domainTitle = `Domain model '${this.model.meta.domain}'`;
        this.pageTitles.domain_root = this.domainTitle;

        const rootBody = this.renderStorage(this.buildRootMarkdown());
        const rootId = await this.upsertPage(this.parentPageId, this.domainTitle, rootBody);

        const overviewBody = this.renderStorage(this.generatedPages.overview || '');
        const overviewId = await this.upsertPage(rootId, this.pageTitles.overview, overviewBody);

        const entitiesIndexBody = this.renderStorage(this.buildEntitiesIndexMarkdown());
        const entitiesIndexId = await this.upsertPage(rootId, this.pageTitles.entities_index, entitiesIndexBody);

        let contextsIndexId = null;
        const hasContexts = Object.keys(this.model.contexts || {}).length > 0;
        if (hasContexts) {
            const contextsIndexBody = this.renderStorage(this.buildContextsIndexMarkdown());
            contextsIndexId = await this.upsertPage(rootId, this.pageTitles.contexts_index, contextsIndexBody);
        }

        if (this.generatedPages.extendedDescription) {
            const body = this.renderStorage(this.generatedPages.extendedDescription);
            await this.upsertPage(overviewId, this.pageTitles.extendedDescription, body);
        }

        if (this.generatedPages.fullJson) {
            const body = this.renderStorage(this.generatedPages.fullJson);
            await this.upsertPage(overviewId, this.pageTitles.fullJson, body);
        }

        const entityPageNames = Object.keys(this.generatedPages)
            .filter((name) => name.startsWith('entity_'))
            .sort((a, b) => (this.pageTitles[a] || a).localeCompare(this.pageTitles[b] || b));

        for (const pageName of entityPageNames) {
            const body = this.renderStorage(this.generatedPages[pageName]);
            await this.upsertPage(entitiesIndexId, this.pageTitles[pageName], body);
        }

        if (hasContexts && contextsIndexId) {
            const contextPageNames = Object.keys(this.generatedPages)
                .filter((name) => name.startsWith('context_'))
                .sort((a, b) => (this.pageTitles[a] || a).localeCompare(this.pageTitles[b] || b));
            for (const pageName of contextPageNames) {
                const body = this.renderStorage(this.generatedPages[pageName]);
                await this.upsertPage(contextsIndexId, this.pageTitles[pageName], body);
            }
        }

        const rootChildren = new Set([this.pageTitles.overview, this.pageTitles.entities_index]);
        if (hasContexts) {
            rootChildren.add(this.pageTitles.contexts_index);
        }
        await this.cleanupChildren(rootId, rootChildren);

        const overviewChildren = new Set();
        if (this.generatedPages.extendedDescription) {
            overviewChildren.add(this.pageTitles.extendedDescription);
        }
        if (this.generatedPages.fullJson) {
            overviewChildren.add(this.pageTitles.fullJson);
        }
        await this.cleanupChildren(overviewId, overviewChildren);

        const entityTitles = new Set(entityPageNames.map((pageName) => this.pageTitles[pageName]));
        await this.cleanupChildren(entitiesIndexId, entityTitles);

        if (hasContexts && contextsIndexId) {
            const contextPageNames = Object.keys(this.generatedPages).filter((name) => name.startsWith('context_'));
            const contextTitles = new Set(contextPageNames.map((pageName) => this.pageTitles[pageName]));
            await this.cleanupChildren(contextsIndexId, contextTitles);
        }
    }

    bold(text) {
        return `**${text}**`;
    }

    italic(text) {
        return `*${text}*`;
    }
}

export default Confluence;

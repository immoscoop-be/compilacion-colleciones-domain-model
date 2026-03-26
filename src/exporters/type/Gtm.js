import Exporter from '../Exporter.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import GtmTagTemplate from '../../utils/GtmTagTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FILTERS_OPERATORS = ['==', '===', '!=', '!==', '>', '>=', '<', '<='];

class Gtm extends Exporter {
    constructor() {
        super();
    }

    build(model) {
        super.build(model);
        this.tagTemplates = [];
        let entities = Object.keys(this.model.entities);
        this.tagWebpermissions = readFileSync(join(__dirname, '../../../assets/gtm/tag_webpermissions.tpl'), 'utf8');
        entities.forEach(entityName => {
            let entity = this.model.entities[entityName];
            let actions = entity.actions;
            if (!actions || Object.keys(actions).length === 0) {
                return;
            }
            let actionNames = Object.keys(actions);
            actionNames.forEach(actionName => {
                let action = actions[actionName];
                this.buildTagTemplate(entityName, entity, actionName, action);
            });
        });
    }

    buildTagTemplate(entityName, entity, actionName, action) {
        let fileName = `Colleciones_Event__${entityName}_${actionName}.tpl`;
        /*
        touchpoint
        snoozed
        surfaceIsRelatedp
        
        if ((entityName == "touchpoint" && actionName == "snoozed") == false) {
            return;
        }
        console.log(this.model.meta.domain);
        console.log(`Building GTM tag template for event '${actionName}' on entity '${entityName}'`);
        */
        this.tagTemplate = new GtmTagTemplate();
        this.tagTemplate.setWebPermissions( this.tagWebpermissions );
        this.entityName = entityName;
        this.entity = entity;
        this.actionName = actionName;
        this.action = action;
        this.tagTemplate.setId(`${entityName}_${actionName}`);
        this.tagTemplate.setDisplayName(`Colleciones Event - ${this.model.meta.domain} - ${entityName} - ${actionName}`);
        this.tagTemplate.setDescription(action.description || `Tag template for action '${actionName}' on entity '${entityName}'`);
        this.tagTemplate.setVersion(1);
        this.gtmJs = ``;
        this.gtmJs += `let o = {};\n`;
        this.gtmJs += `o.entity = '${entityName}';\n`;
        this.gtmJs += `o.action = '${actionName}';\n`;
        this.setupIntroduction();
        this.setupIdentifiers();
        this.setupActors();
        this.setupAdjectives();
        this.setupContext();
        this.setupRelations();
        this.setupCollections();
        this.setupTrackerInit();
        this.writeScript();
        this.writefile(fileName, this.tagTemplate.getFile());
    }

    setupIntroduction() {
        this.tagTemplate.addLabel(`This tag describes the event '${this.actionName}' on the entity '${this.entityName}'.`);
        if (this.entity.description) {
            this.tagTemplate.addLabel(`The entity '${this.entityName}' is described as: ${this.entity.description} `);
        }
        if (this.action.description) {
            this.tagTemplate.addLabel(`The event '${this.actionName}' is described as: ${this.action.description} `);
        }
    }

    setupIdentifiers() {
        if (!this.entity.identifiers || Object.keys(this.entity.identifiers).length < 1) return;
        let identifiersGroup = this.tagTemplate.addGroup('IdentifiersGroup', `Identifiers for the entity '${this.entityName}'`);
        identifiersGroup.setColapsable(false);
        identifiersGroup.addItem(this.tagTemplate.getLabel(`
            In order to properly understand which '${this.entityName}'-entity underwent the action '${this.actionName}' it should be identfied.
            This section provides the opportunity to assign the different '${this.entityName}'-entity identifiers.
        `));
        let identifiersName = Object.keys(this.entity.identifiers);
        this.gtmJs += `\n// Identifiers data \n`;
        this.gtmJs += `o.identifiers = [];\n`;
        identifiersName.forEach(identifierName => {
            let identifier = this.entity.identifiers[identifierName];
            let ti = this.tagTemplate.getTextInput(identifierName, `Identifier ${identifierName}${(identifier.required) ? '*' : ''}`);
            this.gtmJs += `o.identifiers.push({"${identifierName}": data.${ti.getName()}});\n`;
            if (identifier.required) {
                ti.setRequired();
            }
            identifiersGroup.addItem(ti.getObject());
            if (identifier.description) {
                ti.setHelp(`${identifier.description}`);
            }
        });
    }

    setupActors() {
        if (!this.action.performedBy || this.action.performedBy.length < 1) return;
        let group = this.tagTemplate.addGroup('ActorsGroup', `Actor preformed the event '${this.actionName}'`);
        group.setColapsable(false);
        group.addItem(this.tagTemplate.getLabel(`This section describes which actor has executed the action and how it is identified. `));
        let dd = this.tagTemplate.getDropDown('actor', `Which actor preformed the action '${this.actionName}' on the '${this.entityName}'-entity? `);
        group.addItem(dd);
        this.gtmJs += `\n// actor data \n`;
        this.gtmJs += `o.actor = {};\n`;
        this.gtmJs += `o.actor.entity = data.${dd.getName()};\n`;
        this.gtmJs += `o.actor.identifiers = {};\n`;
        this.action.performedBy.forEach((actor) => {
            let itemName = dd.addItem(actor, actor);
            let actorEntity = this.model.entities[actor]
            if (!actorEntity?.identifiers) {
                return;
            }
            let actorIdentifiersLabel = this.tagTemplate.getLabel(`When a '${this.entityName}'-entity is '${this.actionName}' by a '${actor}' it can be identified with:`);
            actorIdentifiersLabel.addCondition(this.tagTemplate.createCondition(dd.getName(), itemName));
            group.addItem(actorIdentifiersLabel);
            let identifiersName = Object.keys(actorEntity.identifiers);
            this.gtmJs += `o.actor.identifiers.${actor} = {};\n`;
            this.gtmJs += `if(data.${dd.getName()} == "${actor}") {\n`;
            identifiersName.forEach(identifierName => {
                let identifier = actorEntity.identifiers[identifierName];
                let identifierInput = this.tagTemplate.getTextInput('actor' + actor + '_identifier_' + identifierName, identifierName);
                this.gtmJs += `\to.actor.identifiers.${actor}.${identifierName} = data.${identifierInput.getName()};\n`;
                if (identifier.description) {
                    identifierInput.setHelp(identifier.description);
                }
                identifierInput.addCondition(this.tagTemplate.createCondition(dd.getName(), itemName));
                group.addItem(identifierInput);
            });
            this.gtmJs += `}\n`;
        });
    }

    setupContext() {
        if (this.action.requiredContext === undefined && this.action.optionalContext === undefined ) return;  
        if (this.action.requiredContext?.length < 1 && this.action.optionalContext?.length < 1) return;
        let group = this.tagTemplate.addGroup('ContextGroup', `Context of the event`);
        group.setColapsable(false);
        group.addItem(this.tagTemplate.getLabel(`This section describes the context in which the event occured`));
        this.gtmJs += `\n// context data \n`;
        this.gtmJs += `o.context = {};\n`;
        let setupContext = (contextName, required) => {
            let context = this.model['contexts'][contextName];
            if (!context) return;
            let label = `${contextName}:`;
            if (context.type == 'enum') {
                if (context.values?.length < 1) return;
                let dd = this.tagTemplate.getDropDown('context_' + contextName, label);
                dd.allowMacrosInSelect();
                context.values.forEach((e) => {
                    dd.addItem(e, e);
                });
                this.gtmJs += `o.context.${contextName} = data.${dd.getName()};\n`;
                group.addItem(dd);
            } else {
                let tt = this.tagTemplate.getTextInput('context_' + contextName, label)
                group.addItem(tt);
                this.gtmJs += `o.context.${contextName} = data.${tt.getName()};\n`;
            }
        };
        if (this.action.requiredContext) {
            this.action.requiredContext.forEach((context) => { setupContext(context, true) });
        }
        if (this.action.optionalContext) {
            this.action.optionalContext.forEach((context) => { setupContext(context, false) });
        }
    }

    setupAdjectives() {
        if (!this.entity.adjectives || Object.keys(this.entity.adjectives).length < 1) return;
        let group = this.tagTemplate.addGroup('AdjectivesGroup', `Adjectives of the enity ${this.entityName}`);
        group.setColapsable(false);
        group.addItem(this.tagTemplate.getLabel(`This section describes which adjectives can be assigned to the entity when the event occured`));
        this.gtmJs += `\n// adjectives data \n`;
        this.gtmJs += `o.adjectives = {};\n`;
        Object.keys(this.entity.adjectives).forEach((adjectiveName) => {
            let adjective = this.entity.adjectives[adjectiveName];
            let label = `${adjectiveName}:${(adjective.description) ? ` ${adjective.description}` : ''}`;
            let dd = this.tagTemplate.getDropDown(adjectiveName, label);
            this.gtmJs += `o.adjectives.${adjectiveName} = (data.${dd.getName()});\n`;
            dd.addItem('false', false);
            dd.addItem('true', true);
            dd.allowMacrosInSelect();
            group.addItem(dd);
        });
    }

    setupRelations() {
        let relations = this.action.references?.filter(item => item.cardinality == 'one');
        if (!relations || relations.length < 1) return;
        let group = this.tagTemplate.addGroup('RelationsGroup', `Relations`);
        group.setColapsable(false);
        group.addItem(this.tagTemplate.getLabel(`This section describes which relationships the event has towards other entitites. `));
        this.gtmJs += `\n// relations data \n`;
        this.gtmJs += `o.relations = {};\n`;
        relations.forEach((r) => {
            let identifiers = this.model.entities[r.target]?.identifiers;
            if (!identifiers || Object.keys(identifiers).length < 1) return;
            let cb = this.tagTemplate.getCheckBox(r.target + 'IsRelatedp', `This event relates to the '${r.target}' entity`);
            group.addItem(cb);
            let condition = this.tagTemplate.createCondition(cb.getName(), true);
            let lbl = this.tagTemplate.getLabel(`The '${r.target}'-entity is identified by;`);
            lbl.addCondition(condition);
            group.addItem(lbl);
            this.gtmJs += `if(data.${cb.getName()}) {\n`;
            this.gtmJs += `\to.relations.${r.target} = {};\n`;
            Object.keys(identifiers).forEach((identifierName) => {
                let ti = this.tagTemplate.getTextInput('relations_' + identifierName, `${identifierName}`);
                ti.addCondition(condition);
                group.addItem(ti);
                this.gtmJs += `\to.relations.${r.target}.${identifierName} = data.${ti.getName()};\n`;
            });
            this.gtmJs += `}\n`;
        });
    }

    setupCollections() {
        let collections = this.action.references?.filter(item => item.cardinality == 'many');
        if (!collections || collections.length < 1) return;
        let group = this.tagTemplate.addGroup('CollectionsGroup', `Collections`);
        group.setColapsable(false);
        group.addItem(this.tagTemplate.getLabel(`An event can relate to a collection of entities (eg.: a list-displayed refers to multiple items in that list)`));
        this.gtmJs += `\n// Collection data \n`;
        this.gtmJs += `o.collections = {};`;
        collections.forEach((collection) => {
            this.setupCollection(group, collection);
        });
    }

    setupCollection(collectionGroup, collection) {
        let identifiers = this.model.entities[collection.target]?.identifiers;
        if (!identifiers || Object.keys(identifiers).length < 1) return;
        // checkbox
        let cb = this.tagTemplate.getCheckBox(collection.target + 'IsCollection', `This event relates to the '${collection.target}' entity collection`);
        collectionGroup.addItem(cb);
        let condition = this.tagTemplate.createCondition(cb.getName(), true);
        // setupType
        // the field in which the user decides how the collection is gathered
        let gatheringMethod = this.tagTemplate.getDropDown(collection.target + 'GatheringMethod', `Collection gathering method`);
        gatheringMethod.addItem('evaluated', 'Evaluated javascript array');
        gatheringMethod.addItem('paramTable', 'Manual entry (param table)');
        gatheringMethod.addCondition(condition);
        collectionGroup.addItem(gatheringMethod);
        // gatheringMethod: 
        let evaluatedCondition = this.tagTemplate.createCondition(gatheringMethod.getName(), 'evaluated');
        // evaluated
        //      when the user selects 'evaluated' we show these fields; describing which identifier to use, where to find the array, path to identifiers in each item, and a filter
        // evaluated / IdentifierField: 
        //     the identifier to use
        let evaluatedIdentifierField = this.tagTemplate.getDropDown(collection.target + 'EvaluatedIdentifierField', 'Identifier');
        evaluatedIdentifierField.addCondition( evaluatedCondition);
        Object.keys(identifiers).forEach((identifierName) => {
            evaluatedIdentifierField.addItem(identifierName, identifierName);
        });
        collectionGroup.addItem(evaluatedIdentifierField);
        // evaluated / itemsField
        //      the javascript array of items
        let itemsField = this.tagTemplate.getTextInput(collection.target + 'EvaluatedItemsField', `Javascript array of items`);
        itemsField.addCondition(evaluatedCondition);
        itemsField.setHelp(`A javascript expression that evaluates to an array of items. Each item should be or a string or an object containing the identifiers for the '${collection.target}'-entity.`);
        collectionGroup.addItem(itemsField);
        // evaluated / path
        //      path to identifiers-value in each item
        let path = this.tagTemplate.getTextInput(collection.target + 'EvaluatedPath', `Path to items in array`);
        path.addCondition(evaluatedCondition);
        path.setHelp(`If the javascript expression is an array of objects, specify the path to the identifiers in each object. For example, if each item is {id: {sku: '12345'}}, and 'sku' is the identifier, the path would be 'id.sku'. If each item is a string or directly the identifier, leave this blank.`);
        collectionGroup.addItem(path);
        // evaluated / filter / group
        //      filter to apply on the array of items
        let filterGroup = this.tagTemplate.getGroup(collection.target + 'EvaluatedFilterGroup', `Filter for '${collection.target}'-items`);
        filterGroup.setColapsable(true);
        collectionGroup.addItem(filterGroup);
        filterGroup.addCondition(evaluatedCondition);
        // evaluated / filter / group / filter.path
        //      the path to the field to filter on
        let filterPath = this.tagTemplate.getTextInput(collection.target + 'EvaluatedFilterPath', `Path to field to filter on`);
        filterPath.setHelp(`The path to the field in each item on which the filter should be applied. For example, if each item is {category: {name: 'shoes'}}, and you want to filter on the category name, the path would be 'category.name'.`);
        filterGroup.addItem(filterPath);
        // evaluated / filter / group / filter.operator
        //      the operator to use in the filter
        let filterOperator = this.tagTemplate.getDropDown(collection.target + 'EvaluatedFilterOperator', `Filter operator`);
        FILTERS_OPERATORS.forEach((op) => {
            filterOperator.addItem(op, op);
        });
        filterGroup.addItem(filterOperator);
        // evaluated / filter / group / filter.value
        //      the value to compare to in the filter
        let filterValue = this.tagTemplate.getTextInput(collection.target + 'EvaluatedFilterValue', `Filter value`);
        filterValue.setHelp(`The value to compare the field value to, using the selected operator.`);
        filterGroup.addItem(filterValue);
        // paramTable
        let pt = this.tagTemplate.getParamTable(collection.target + 'ParamTable', `${collection.target}-items`);
        pt.addCondition(this.tagTemplate.createCondition(gatheringMethod.getName(), 'paramTable'));
        collectionGroup.addItem(pt);
        let fieldIdentifierType = this.tagTemplate.getDropDown(collection.target + 'ParamTableItemsField', 'Identifier');
        Object.keys(identifiers).forEach((identifierName) => {
            fieldIdentifierType.addItem(identifierName, identifierName);
        });
        pt.addColumn(collection.target + 'ParamTableIdentifierNameColumn', 'Identifier type', fieldIdentifierType.getObject(), true);
        let fieldIdentifierValue = this.tagTemplate.getTextInput(collection.target + 'IdentifierValueParamTable', 'Identifier value');
        pt.addColumn(collection.target + 'ParamTableIdentifierValueColumn', 'Identifier value', fieldIdentifierValue.getObject(), false);
        // gtm
        let gtm = '';
        gtm += `\n` + `if(data.${cb.getName()} ) {`;
        gtm += `\n\t` + `o.collections.${collection.target} = {};`;
        gtm += `\n\t` + `if(data.${gatheringMethod.getName()} == "paramTable") {`;
        gtm += `\n\t\t` + `o.collections.${collection.target}.type = "PARAMTABLE";`;
        gtm += `\n\t\t` + `o.collections.${collection.target}.table = data.${pt.getName()};`;
        gtm += `\n\t` + `} else if(data.${gatheringMethod.getName()} == "evaluated") {`;
        gtm += `\n\t\t` + `o.collections.${collection.target}.type = "EVALUATED";`;
        gtm += `\n\t\t` + `o.collections.${collection.target}.identifierField = data.${evaluatedIdentifierField.getName()};`;
        gtm += `\n\t\t` + `o.collections.${collection.target}.itemsField = data.${itemsField.getName()};`;
        gtm += `\n\t\t` + `o.collections.${collection.target}.path = data.${path.getName()};`;
        gtm += `\n\t\t` + `o.collections.${collection.target}.filter = {`;
        gtm += `\n\t\t\t` + `path: data.${filterPath.getName()},`;
        gtm += `\n\t\t\t` + `operator: data.${filterOperator.getName()},`;
        gtm += `\n\t\t\t` + `value: data.${filterValue.getName()}`;
        gtm += `\n\t\t` + `};`;
        gtm += `\n\t` + `}`;
        gtm += `\n` + `}`;
        this.gtmJs += gtm + '\n';
    }

    setupTrackerInit() {
        let group = this.tagTemplate.addGroup('trackerInitGroup', `Tracker initialisation`);
        group.setColapsable(false);
        let lbl = this.tagTemplate.getLabel('The tracker variable is a variable Colleciones Clientes Variable required to pass the event.')
        group.addItem(lbl);
        let dd = this.tagTemplate.getDropDown('trackerVariable', `Settings variable`);
        dd.allowMacrosInSelect();
        group.addItem(dd);
        // let cb = this.tagTemplate.getCheckBox('trackerVariable', `Settings variable`);
        // 
    }

    writeAllFiles() {
        // for(const pageName in this.pages) {
        //     const fileContent = this.pages[pageName].join('\n');
        //     this.writefile(pageName, fileContent);
        // }
    }

    buildTagTemplates() {
    }

    postBuildHook() {
        super.postBuildHook();
        this.buildTagCollecionesConfigVariable();
    }

    buildTagCollecionesConfigVariable() {
        let configVariableFile = new GtmTagTemplate();
        configVariableFile.setId(`${this.model.meta.domain}__Configuration_variable`);
        configVariableFile.setDisplayName(`Colleciones - ${this.model.meta.domain} - Configuration variable`);
        configVariableFile.setDescription(`Colleciones configuration variable`);
        configVariableFile.setVersion(1);
        configVariableFile.setType('MACRO');
        
        // app name
        let appNameField = configVariableFile.addTextInput('appName', `Application Name`);
        appNameField.setHelp(`The name of your application, used for contextual tagging and tracking.`);
        appNameField.setRequired();
        appNameField.setLengthValidation(2, 50);
        
        // tracker name
        let trackerNameField = configVariableFile.addTextInput('trackerName', `Tracker Name`);
        trackerNameField.setHelp(`A logical name assigned to this tracker instance, used internally.`);
        trackerNameField.setRequired();
        trackerNameField.setLengthValidation(2, 50);
       
        // Endpoint
        let endpointField = configVariableFile.addTextInput('endpoint', `Collector Endpoint`);
        endpointField.setHelp(`The URL where tracking events will be sent. Typically ends with /collect.`);
        endpointField.setRequired();
        endpointField.setLengthValidation(7, 2500);

        // javascript tracker code
        let jsTrackerGroup = configVariableFile.addGroup('jsTrackerGroup', `Javascript Tracker Options`);
        jsTrackerGroup.setColapsable(false);
        let jsLibSource = configVariableFile.getDropDown('jsLibSource', 'Source');
        jsLibSource.addItem('UNPKG', 'UNPKG');
        jsLibSource.addItem('SELF', 'Self-hosted');
        jsLibSource.addItem('NOLOAD', 'Do not load');
        jsTrackerGroup.addItem(jsLibSource);
        let jsLibSource_selfHostedUrl = configVariableFile.getTextInput('jsLibSourc_selfHostedUrl', `Url of self hosted JS lib`);
        jsLibSource_selfHostedUrl.addCondition(configVariableFile.createCondition( jsLibSource.getName(), 'SELF' ));
        jsTrackerGroup.addItem(jsLibSource_selfHostedUrl);
        
        // batchingSettings
        let batchingSettingsGroup = configVariableFile.addGroup('batchingSettings', `Batch settings`);
        batchingSettingsGroup.setColapsable(false);
        let flushIntervalField = configVariableFile.getTextInput('flushInterval', `Flush Interval (ms)`);
        flushIntervalField.setHelp(`The number of milliseconds between automatic attempts to flush buffered events. If set to 0, events will be flushed immediately.`);
        flushIntervalField.setRequired();
        flushIntervalField.setDefaultValue(0);
        flushIntervalField.setNonNegativeNumberValidation();
        batchingSettingsGroup.addItem( flushIntervalField );
        let flushSizeField = configVariableFile.getTextInput('flushSize', `Flush Size`);
        flushSizeField.setHelp(`The number of events to accumulate before triggering an automatic flush.`);
        flushSizeField.setRequired();
        flushSizeField.setDefaultValue(5);
        flushSizeField.setPositiveNumberValidation();
        batchingSettingsGroup.addItem( flushSizeField );
        
        // script
        let script = `return {
            type: 'compilacionCollecionesClientosGtmVariable_configuracion',
            endpoint: data.${endpointField.getName()},
            flushInterval: data.${flushIntervalField.getName()},
            flushSize: data.${flushSizeField.getName()},
            trackerName: data.${trackerNameField.getName()},
            appName: data.${appNameField.getName()},
            jsLibSource: data.${jsLibSource.getName()},
            jsLibSource_selfHostedUrl: data.${jsLibSource_selfHostedUrl.getName()}
        };`;
        configVariableFile.setScript(script);

        // write
        this.writefile(`Colleciones_ConfigVar.tpl`, configVariableFile.getFile());
    }

    writeScript() {
        let codeSuffix = readFileSync(join(__dirname, '../../../assets/gtm/codeSuffix.js'), 'utf8');
        let gtm = '';
        gtm = `var log = require('logToConsole');\n`;
        gtm = `var callInWindow = require('callInWindow');\n`;
        gtm = `var copyFromWindow = require('copyFromWindow');\n`;
        gtm = `var createQueue = require('createQueue');\n`;
        gtm = `var injectScript = require('injectScript');\n`;
        gtm = `var log = require('logToConsole');\n`;
        gtm = `var setInWindow = require('setInWindow');\n`;
        gtm += this.gtmJs;
        // gtm += codeSuffix;
        gtm += "\n";
        // gtm += "log('o =', o);"
        this.tagTemplate.setScript(gtm);
        
    }

}

export default Gtm;
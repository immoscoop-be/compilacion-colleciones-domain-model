function sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9 ]+/g, '').replace(/\s+/g, '_');
}

export default class GtmTagTemplate {

    constructor(name) {
        this.name = name;
        this.script = "// code goes here";
        this.info = {
            "type": "TAG",
            "id": "",
            "version": 1,
            "securityGroups": [],
            "displayName": "test",
            "brand": {
                "id": "brand_dummy",
                "displayName": ""
            },
            "description": "test",
            "containerContexts": [
                "WEB"
            ]
        };
        this.parameters = [];
        this.setWebPermissions(`[
  {
    "instance": {
      "key": {
        "publicId": "logging",
        "versionId": "1"
      },
      "param": [
        {
          "key": "environments",
          "value": {
            "type": 1,
            "string": "debug"
          }
        }
      ]
    },
    "isRequired": true
  }
]`);
    }

    getFile() {
        let content = '';
        content += this.buildInfoSection();
        content += '\n\n';
        content += this.buildParametersSection();
        content += '\n\n';
        content += this.buildTemplateScriptSection();
        content += '\n\n';
        content += this.buildWebPermissionsSection();
        content += '\n\n';
        content += this.buildTestsSection();
        content += '\n\n';
        content += this.buildNotesSection();
        return content;
    }

    setScript(script) {
        this.script = script;
    }

    getFileName() {
    }

    setId(id) {
        this.info.id = id;
    }

    setWebPermissions(permissions) {
        this.permissions = permissions;
    }

    setDisplayName(name) {
        this.info.displayName = name;
    }

    setDescription(description) {
        this.info.description = description;
    }

    setVersion(version) {
        this.info.version = version;
    }

    setType(type) {
        this.info.type = type;
    }

    getLabel(label) {
        let sanitizedName = sanitizeName(label);
        let o = {
            "type": "LABEL",
            "name": sanitizedName,
            "displayName": label,
            "enablingConditions": []
        };
        return {
            getName: () => {
                return sanitizedName;
            },
            getObject: () => {
                return o;
            },
            addCondition: (condition) => {
                o.enablingConditions.push(condition);
            }
        }
    }

    addLabel(label) {
        let lb = this.getLabel(label);
        this.parameters.push(lb.getObject());
        return lb;
    }

    getTextInput(name, displayName) {
        let nameSanitized = sanitizeName(name);
        let o = {
            "type": "TEXT",
            "name": nameSanitized,
            "displayName": displayName,
            "simpleValueType": true,
            "valueValidators": [],
            "enablingConditions": []
        };
        return {
            getName: () => {
                return nameSanitized;
            },
            getObject: () => {
                return o
            },
            setRequired: () => {
                o.valueValidators.push({ "type": "NON_EMPTY" });
            },
            setHelp: (help) => {
                o.help = help;
            },
            addCondition: (condition) => {
                o.enablingConditions.push(condition);
            },
            setLengthValidation: (minLength, maxLength) => {
                o.valueValidators.push({ "type": "STRING_LENGTH", "args": [minLength, maxLength] });
            },
            setPositiveNumberValidation: () => {
                o.valueValidators.push({ "type": "POSITIVE_NUMBER" });
            },
            setNonNegativeNumberValidation: () => {
                o.valueValidators.push({ "type": "NON_NEGATIVE_NUMBER" });
            },
            setDefaultValue: (value) => {
                o.defaultValue = value
            }
        };
    }

    addTextInput(name, displayName, help, required, condition) {
        let ti = this.getTextInput(name, displayName, help, required, condition);
        this.parameters.push(ti.getObject());
        return ti;
    }

    getDropDown(name, displayName) {
        let nameSanitized = sanitizeName(name);
        let o = {
            "type": "SELECT",
            "name": nameSanitized,
            "displayName": displayName,
            "macrosInSelect": false,
            "selectItems": [],
            "enablingConditions": [],
        };
        return {
            getName: () => {
                return nameSanitized;
            },
            addItem: (itemName, itemDisplayName) => {
                itemName = sanitizeName(itemName);
                o.selectItems.push({ "value": itemName, "displayValue": itemDisplayName });
                return itemName;
            },
            allowMacrosInSelect: () => {
                o.macrosInSelect = true;
            },
            getObject: () => {
                return o;
            },
            addCondition: (condition) => {
                o.enablingConditions.push(condition);
            }
        };
    }

    addDropDown(name, displayName) {
        let dd = this.getDropDown(name, displayName);
        this.parameters.push(dd.getObject());
        return dd;
    }

    getGroup(name, displayName) {
        let nameSanitized = sanitizeName(name);
        let o = {
            "type": "GROUP",
            "name": nameSanitized,
            "displayName": displayName,
            "groupStyle": "NO_ZIPPY",
            "subParams": [],
            "enablingConditions": []
        };
        return {
            getName: () => {
                return nameSanitized;
            },
            addItem: (item) => {
                if (typeof item == 'object' && item.getObject) {
                    o.subParams.push(item.getObject());
                    return;
                }
                o.subParams.push(item);
            },
            getObject: () => {
                return o;
            },
            setColapsable(openned = true) {
                o.groupStyle = (openned) ? 'ZIPPY_OPEN' : 'ZIPPY_CLOSED'
            },
            addCondition: (condition) => {
                o.enablingConditions.push(condition);
            },
        };
    }

    addGroup(name, displayName) {
        let dd = this.getGroup(name, displayName);
        this.parameters.push(dd.getObject());
        return dd;
    }

    getCheckBox(name, displayName) {
        let nameSanitized = sanitizeName(name);
        var o = {
            "type": "CHECKBOX",
            "name": name,
            "checkboxText": displayName,
            "simpleValueType": true,
            "enablingConditions": []
        };
        return {
            getObject: () => {
                return o;
            },
            getName: () => {
                return nameSanitized;
            },
            addCondition: (condition) => {
                o.enablingConditions.push(condition);
            }
        }
    }

    addCheckBox(name, displayName) {
        let cb = this.getCheckBox(name, displayName);
        this.parameters.push(cb.getObject());
        return cb;
    }

    getParamTable(name, displayName) {
        let nameSanitized = sanitizeName(name);
        let o = {
            "type": "PARAM_TABLE",
            "name": nameSanitized,
            "displayName": displayName,
            "paramTableColumns": [],
            "enablingConditions": []
        };
        return {
            getObject: () => {
                return o;
            },
            getName: () => {
                return nameSanitized;
            },
            addColumn: (columnName, columnDisplayName, field, isUnique = false) => {
                let columnNameSanitized = sanitizeName(columnName);
                let oColumn = {
                    "param": field,
                    "isUnique": isUnique
                };
                o.paramTableColumns.push(oColumn);
                return {
                    getName: () => {
                        return columnNameSanitized;
                    }
                }
            },
            addCondition: (condition) => {
                o.enablingConditions.push(condition);
            }
        }
    }

    setParamTable(name, displayName) {
        let pt = this.getParamTable(name, displayName);
        this.parameters.push(pt.getObject());
        return pt;
    }

    createCondition(param, value, operator = "EQUALS") {
        return {
            "paramName": param,
            "paramValue": value,
            "type": operator
        };
    }

    // sections
    // INFO
    buildInfoSection() {
        let text = "";
        text += "___INFO___\n\n";
        text += JSON.stringify(this.info, null, 4) + "\n";
        return text;
    }

    // params
    buildParametersSection() {
        let content = "";
        content += "___TEMPLATE_PARAMETERS___\n\n";
        content += JSON.stringify(this.parameters, null, 4) + "\n";
        return content;
    }

    // js sandbox
    buildTemplateScriptSection() {
        let content = "";
        content += "___SANDBOXED_JS_FOR_WEB_TEMPLATE___\n\n";
        content += this.script;
        if (this.info.type == "TAG") {
            content += "\n\ndata.gtmOnSuccess();";
        }
        return content;
    }

    // web permissions
    buildWebPermissionsSection() {
        let content = "";
        content += "___WEB_PERMISSIONS___\n\n";
        content += this.permissions;
        return content;
    }

    // tests
    buildTestsSection() {
        let content = "";
        content += "___TESTS___\n\n";
        content += "scenarios: []";
        return content;
    }

    // notes
    buildNotesSection() {
        let content = "";
        content += "___NOTES___\n\n";
        const formatted = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
        content += `Created on ${formatted}`;
        return content;
    }

}
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fileSystem = require("fs-extra");
const path = require("path");
var Prompt = require("prompt-base");
const consoleOutput_1 = require("./consoleOutput");
process.env["NODE_CONFIG_DIR"] = path.join(__dirname, "..", "config");
const mergedConfiguration = require("config");
function modifyResources(options) {
    return __awaiter(this, void 0, void 0, function* () {
        if ("namespace" in options) {
            let dir;
            if ("delete" in options && options.delete) {
                dir = null;
            }
            else {
                try {
                    dir = yield requestPath();
                }
                catch (e) {
                    consoleOutput_1.logError("Aborting");
                }
            }
            saveConfig(options.namespace, dir);
        }
        else {
            consoleOutput_1.logError("No namespace given!");
        }
    });
}
exports.modifyResources = modifyResources;
function requestPath() {
    const question = new Prompt({
        name: "directory",
        message: "Absolute path to resource directory (abort with blank input): "
    });
    return new Promise((resolve, reject) => {
        question.ask((answer) => {
            if (answer.trim()) {
                resolve(path.normalize(answer));
            }
            else {
                reject();
            }
        });
    });
}
function saveConfig(namespace, dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const configPath = path.join(__dirname, "..", "config", "local.json");
        let configuration;
        try {
            configuration = yield fileSystem.readJson(configPath);
        }
        catch (e) {
            configuration = {};
        }
        if (!("resourceMap" in configuration)) {
            configuration.resourceMap = {};
            mergedConfiguration.resourceMap = {};
        }
        if (dir == undefined) {
            if (namespace in configuration.resourceMap) {
                consoleOutput_1.logWarning(`Mapping for namespace ${namespace} deleted`);
                delete configuration.resourceMap[namespace];
                delete mergedConfiguration.resourceMap[namespace];
            }
        }
        else {
            configuration.resourceMap[namespace] = dir;
            mergedConfiguration.resourceMap[namespace] = dir;
        }
        yield fileSystem.writeJson(configPath, configuration);
        configToConsole(mergedConfiguration);
    });
}
function displayResources() {
    configToConsole(mergedConfiguration);
}
exports.displayResources = displayResources;
function configToConsole(configuration) {
    if ("resourceMap" in configuration &&
        Object.keys(configuration.resourceMap).length) {
        consoleOutput_1.logSuccess("Current global resources configuration");
        Object.keys(configuration.resourceMap).forEach(key => console.log(`${key}: ${configuration.resourceMap[key]}`));
    }
    else {
        consoleOutput_1.logWarning("No resources configured yet");
    }
    consoleOutput_1.logNewline();
    process.exit();
}

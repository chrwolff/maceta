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
const opn = require("opn");
const directoryTree = require("directory-tree");
const PromptRadio = require("prompt-radio");
const ConfirmPrompt = require("prompt-confirm");
const readlineUi = require("readline-ui").create();
const path = require("path");
process.env["NODE_CONFIG_DIR"] = path.join(__dirname, "..", "config");
const configFile = require("config");
const consoleOutput_1 = require("./consoleOutput");
const maceta_api_1 = require("maceta-api");
function startServer(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const basePath = process.cwd();
        consoleOutput_1.logSuccess(`Using ${basePath} as application path`);
        let projectConfig = {
            componentPath: null,
            oDataPath: configFile.has("oDataPath") ? configFile.get("oDataPath") : null,
            shellConfiguration: false,
            localLibraryPath: configFile.has("ui5LibraryPath")
                ? configFile.get("ui5LibraryPath")
                : null,
            hostname: configFile.get("hostname"),
            port: configFile.get("port")
        };
        Object.keys(options).forEach(key => (projectConfig[key] = options[key]));
        const macetaConfiguration = yield getMacetaConfig(basePath);
        if ("ui5LibraryPath" in macetaConfiguration) {
            projectConfig.localLibraryPath = macetaConfiguration.ui5LibraryPath;
        }
        if (projectConfig.localLibraryPath == undefined) {
            consoleOutput_1.logError("No UI5 library path is configured!");
        }
        let shellId = null;
        let indexHtmlPath;
        if ("shell" in macetaConfiguration) {
            shellId = yield getShellId(macetaConfiguration.shell);
            projectConfig.shellConfiguration = true;
        }
        else {
            indexHtmlPath = yield getIndexHtmlPath(basePath);
            if (indexHtmlPath === null) {
                consoleOutput_1.logWarning("No index.html found");
                consoleOutput_1.logSuccess("Using default shell configuration");
                projectConfig.shellConfiguration = true;
            }
            else {
                projectConfig.basePath = indexHtmlPath;
            }
        }
        projectConfig.componentPath = yield getManifestDir(basePath);
        if ("oDataPath" in macetaConfiguration) {
            projectConfig.oDataPath = macetaConfiguration.oDataPath;
        }
        else {
            const oDataPath = yield getOdataDir(basePath);
            if (oDataPath != undefined) {
                projectConfig.oDataPath = oDataPath;
            }
        }
        // return input control from any prompt to the console
        readlineUi.close();
        // start the server
        try {
            const server = yield maceta_api_1.createServer(projectConfig);
            if (configFile.has("resourceMap")) {
                const fileResources = configFile.get("resourceMap");
                Object.keys(fileResources).forEach(key => server.createResourcePath({
                    namespace: key,
                    path: fileResources[key]
                }));
            }
            if ("shell" in macetaConfiguration) {
                const configs = macetaConfiguration.shell;
                Object.keys(configs).forEach(key => {
                    if (key !== "default") {
                        server.createShellConfigurationKey(key);
                    }
                    if ("languages" in configs[key]) {
                        server.setShellLanguages(configs[key].languages);
                    }
                    if ("resourceMap" in configs[key]) {
                        let rsPath = configs[key].resourcePath;
                        Object.keys(rsPath).forEach(namespace => server.createResourcePath({
                            namespace,
                            path: rsPath[namespace]
                            //shellConfigurationKey: key,
                            //sapServer: true
                        }));
                    }
                });
                if (shellId != undefined) {
                    server.setShellConfigurationKey(shellId);
                }
            }
            let url = yield server.start();
            if ("shell" in macetaConfiguration) {
                consoleOutput_1.logSuccess(`Shell embedded mode started: ${url}\n`);
            }
            else {
                url = `${url}index.html`;
                consoleOutput_1.logSuccess(`Server running at: ${url}\n`);
            }
            opn(url);
        }
        catch (e) {
            consoleOutput_1.logError(e);
        }
    });
}
exports.startServer = startServer;
function getMacetaConfig(applicationDir) {
    return __awaiter(this, void 0, void 0, function* () {
        let directories = directoryTree(applicationDir, {
            extensions: /\.json/,
            exclude: /node_modules/
        });
        let foundDirectories = [];
        searchMacetaConfig(directories);
        function searchMacetaConfig(dirObject) {
            if ("children" in dirObject) {
                if (dirObject.children.reduce((hasFile, entry) => hasFile || entry.name === "maceta.config.json", false)) {
                    foundDirectories.push(dirObject.path);
                }
                dirObject.children.forEach(entry => searchMacetaConfig(entry));
            }
        }
        let selectedDirectory;
        try {
            selectedDirectory = yield getMacetaDirectoryChoice(foundDirectories);
        }
        catch (error) {
            consoleOutput_1.logError(`${error}`);
        }
        if (selectedDirectory == undefined) {
            return {};
        }
        try {
            return yield fileSystem.readJson(path.join(selectedDirectory, "maceta.config.json"));
        }
        catch (e) {
            consoleOutput_1.logError(`${e}`);
        }
    });
}
function getMacetaDirectoryChoice(directories) {
    if (directories.length === 0) {
        consoleOutput_1.logWarning("No maceta.config.json found");
        return null;
    }
    else if (directories.length === 1) {
        consoleOutput_1.logSuccess(`Using maceta.config.json from ${directories[0]}`);
        return directories[0];
    }
    else {
        consoleOutput_1.logNewline();
        let prompt = new PromptRadio({
            name: "macetaConfigDir",
            message: "Select the maceta configuration directory\n(Select with the spacebar, continue with enter)",
            choices: directories,
            ui: readlineUi
        });
        return new Promise((resolve, reject) => {
            prompt.ask(selected => {
                if (selected) {
                    resolve(selected);
                }
                else {
                    reject("No directory selected!");
                }
            });
        });
    }
}
function createShellConfigPrompt() {
    consoleOutput_1.logNewline();
    let prompt = new ConfirmPrompt({
        name: "createShellConfigPrompt",
        message: "Do you want to create a temporary default shell configuration?",
        ui: readlineUi
    });
    return new Promise((resolve, reject) => {
        prompt.ask(selected => {
            if (typeof selected === "boolean") {
                resolve(selected);
            }
            else {
                reject("Nothing selected!");
            }
        });
    });
}
// read the shellConfig.json. if there are more options besides default
// then prompt for a choice.
function getShellId(shellConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        if ("default" in shellConfig) {
            let configKeys = Object.keys(shellConfig);
            if (configKeys.length === 1) {
                return configKeys[0];
            }
            else {
                try {
                    return yield shellConfigIdPrompt(configKeys);
                }
                catch (error) {
                    consoleOutput_1.logError(error);
                }
            }
        }
        else {
            consoleOutput_1.logError("shell configuration contains no 'default' key!");
        }
    });
}
function shellConfigIdPrompt(configKeys) {
    consoleOutput_1.logNewline();
    let prompt = new PromptRadio({
        name: "shellConfiguration",
        message: "Select a shell configuration key\n(Select with the spacebar, continue with enter)",
        default: "default",
        choices: configKeys,
        ui: readlineUi
    });
    return new Promise((resolve, reject) => {
        prompt.ask(selected => {
            if (selected) {
                resolve(selected);
            }
            else {
                reject("No configuration selected!");
            }
        });
    });
}
// look for all manifest.json files. if there is more than one, then prompt
// for a choice.
function getManifestDir(applicationDir) {
    return __awaiter(this, void 0, void 0, function* () {
        let directories = directoryTree(applicationDir, {
            extensions: /\.json/,
            exclude: /node_modules/
        });
        let foundDirectories = [];
        searchManifest(directories);
        function searchManifest(dirObject) {
            if ("children" in dirObject) {
                if (dirObject.children.reduce((hasManifest, entry) => hasManifest || entry.name === "manifest.json", false)) {
                    foundDirectories.push(dirObject.path);
                }
                dirObject.children.forEach(entry => searchManifest(entry));
            }
        }
        try {
            return yield getManifestDirectoryChoice(foundDirectories);
        }
        catch (error) {
            consoleOutput_1.logError(`${error}`);
        }
    });
}
function getManifestDirectoryChoice(directories) {
    if (directories.length === 0) {
        throw new Error("No manifest.json found!");
    }
    else if (directories.length === 1) {
        consoleOutput_1.logSuccess(`Manifest folder found: ${directories[0]}`);
        return directories[0];
    }
    else {
        consoleOutput_1.logNewline();
        let prompt = new PromptRadio({
            name: "manifestDir",
            message: "Select the app directory\n(Select with the spacebar, continue with enter)",
            choices: directories,
            ui: readlineUi
        });
        return new Promise((resolve, reject) => {
            prompt.ask(selected => {
                if (selected) {
                    resolve(selected);
                }
                else {
                    reject("No directory selected!");
                }
            });
        });
    }
}
function getOdataDir(applicationDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const oDataPath = path.join(applicationDir, "odata");
        const exists = yield fileSystem.pathExists(oDataPath);
        if (exists) {
            consoleOutput_1.logSuccess(`OData folder found: ${oDataPath}`);
            return oDataPath;
        }
        else {
            return null;
        }
    });
}
function getIndexHtmlPath(applicationDir) {
    return __awaiter(this, void 0, void 0, function* () {
        let directories = directoryTree(applicationDir, {
            extensions: /\.html/,
            exclude: /node_modules/
        });
        let foundDirectories = [];
        search(directories);
        function search(dirObject) {
            if ("children" in dirObject) {
                if (dirObject.children.reduce((found, entry) => found || entry.name === "index.html", false)) {
                    foundDirectories.push(dirObject.path);
                }
                dirObject.children.forEach(entry => search(entry));
            }
        }
        try {
            return yield getIndexHtmlDirectoryChoice(foundDirectories);
        }
        catch (error) {
            consoleOutput_1.logError(`${error}`);
        }
    });
}
function getIndexHtmlDirectoryChoice(directories) {
    if (directories.length === 0) {
        return null;
    }
    else if (directories.length === 1) {
        consoleOutput_1.logSuccess(`index.html found in: ${directories[0]}`);
        return directories[0];
    }
    else {
        consoleOutput_1.logNewline();
        let prompt = new PromptRadio({
            name: "indexDir",
            message: "Select the index.html directory\n(Select with the spacebar, continue with enter)",
            choices: directories,
            ui: readlineUi
        });
        return new Promise((resolve, reject) => {
            prompt.ask(selected => {
                if (selected) {
                    resolve(selected);
                }
                else {
                    reject("No directory selected!");
                }
            });
        });
    }
}
//# sourceMappingURL=startServer.js.map
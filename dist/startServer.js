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
const directoryTree = require("directory-tree");
const PromptRadio = require("prompt-radio");
const ReadlineUi = require("readline-ui");
const path = require("path");
const core_1 = require("@nestjs/core");
const index_1 = require("./api/index");
const consoleOutput_1 = require("./consoleOutput");
process.env["NODE_CONFIG_DIR"] = path.join(__dirname, "..", "config");
const configFile = require("config");
function startServer(cliOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const { options, resources } = yield getConfiguration(cliOptions);
        try {
            const server = yield core_1.NestFactory.create(index_1.ServerModule);
            let serverConfiguration = server.get(index_1.ServerConfiguration);
            serverConfiguration.setOptions(options, resources);
            serverConfiguration.checkAndSeal();
            yield server.listenAsync(serverConfiguration.port, serverConfiguration.hostname);
            consoleOutput_1.logSuccess(`${serverConfiguration.hostname}:${serverConfiguration.port}`);
            consoleOutput_1.logSuccess("Server started");
        }
        catch (e) {
            consoleOutput_1.logError(e);
        }
    });
}
exports.startServer = startServer;
function getConfiguration(cliOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const basePath = process.cwd();
        consoleOutput_1.logSuccess(`Using ${basePath} as application path`);
        let projectConfig = {
            basePath,
            componentPath: null,
            oDataPath: configFile.has("oDataPath") ? configFile.get("oDataPath") : null,
            shellEmbedded: false,
            ui5LibraryPath: configFile.has("ui5LibraryPath")
                ? configFile.get("ui5LibraryPath")
                : null,
            hostname: configFile.get("hostname"),
            port: configFile.get("port")
        };
        Object.keys(cliOptions).forEach(key => (projectConfig[key] = cliOptions[key]));
        const readlineUi = ReadlineUi.create();
        const macetaConfiguration = yield getMacetaConfig(basePath);
        if ("ui5LibraryPath" in macetaConfiguration) {
            projectConfig.ui5LibraryPath = getAbolutePath(basePath, macetaConfiguration.ui5LibraryPath);
        }
        if (projectConfig.ui5LibraryPath == undefined) {
            consoleOutput_1.logError("No UI5 library path is configured!");
        }
        let shellId = null;
        let indexHtmlPath;
        if ("shell" in macetaConfiguration) {
            shellId = yield getShellId(macetaConfiguration.shell);
            projectConfig.shellEmbedded = true;
        }
        else {
            indexHtmlPath = yield getIndexHtmlPath(basePath);
            if (indexHtmlPath === null) {
                consoleOutput_1.logWarning("No index.html found");
                consoleOutput_1.logSuccess("Using default shell configuration");
                projectConfig.shellEmbedded = true;
            }
            else {
                projectConfig.basePath = indexHtmlPath;
            }
        }
        projectConfig.componentPath = yield getManifestDir(basePath);
        if ("oDataPath" in macetaConfiguration) {
            projectConfig.oDataPath = getAbolutePath(basePath, macetaConfiguration.oDataPath);
        }
        else {
            const oDataPath = yield getOdataDir(basePath);
            if (oDataPath != undefined) {
                projectConfig.oDataPath = oDataPath;
            }
        }
        let resourcesObject = {};
        if (configFile.has("resourceMap")) {
            const fileResources = configFile.get("resourceMap");
            Object.keys(fileResources).forEach(namespace => {
                resourcesObject[namespace] = {
                    namespace,
                    path: fileResources[namespace]
                };
            });
        }
        if ("shell" in macetaConfiguration) {
            const configs = macetaConfiguration.shell;
            Object.keys(configs).forEach(shellConfigurationKey => {
                if ("resourceMap" in configs[shellConfigurationKey]) {
                    let rsPath = configs[shellConfigurationKey].resourceMap;
                    Object.keys(rsPath).forEach(namespace => {
                        resourcesObject[namespace] = {
                            namespace,
                            path: rsPath[namespace],
                            shellConfigurationKey
                        };
                    });
                }
            });
        }
        const resources = Object.keys(resourcesObject).map(key => resourcesObject[key]);
        return { options: projectConfig, resources };
        function getAbolutePath(rootDir, filePath) {
            if (path.isAbsolute(filePath)) {
                return filePath;
            }
            return path.join(rootDir, filePath);
        }
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
                    choices: directories
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
                let manifestDirectories = [];
                for (let dir of foundDirectories) {
                    try {
                        let manifest = yield fileSystem.readJson(path.join(dir, "manifest.json"));
                        if ("sap.app" in manifest &&
                            "type" in manifest["sap.app"] &&
                            manifest["sap.app"].type === "application") {
                            manifestDirectories.push(dir);
                        }
                    }
                    catch (e) { }
                }
                try {
                    return yield getManifestDirectoryChoice(manifestDirectories);
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
    });
}

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const validator = require("validator");
const fileSystem = require("fs-extra");
const path = require("path");
const directoryTree = require("directory-tree");
const PromptRadio = require("prompt-radio");
const readlineUi = require("readline-ui");
const configurationBase_1 = require("./configurationBase");
const common_1 = require("@nestjs/common");
const logger_1 = require("../logger");
var Exceptions;
(function (Exceptions) {
    Exceptions["PORT_WRONG"] = "Port not configured correctly";
    Exceptions["HOSTNAME_WRONG"] = "Hostname not configured correctly";
    Exceptions["LIBRARY_WRONG"] = "UI5 library path not configured correctly";
    Exceptions["IS_SEALED"] = "Configuration cannot be changed after first get";
})(Exceptions = exports.Exceptions || (exports.Exceptions = {}));
let ServerConfiguration = class ServerConfiguration extends configurationBase_1.ConfigurationBase {
    constructor(config, logger) {
        super(config);
        this.logger = logger;
        this.isChecked = false;
        this.options = {
            hostname: this.config.has("hostname")
                ? this.config.get("hostname")
                : null,
            port: this.config.has("port") ? this.config.get("port") : null,
            ui5LibraryPath: this.config.has("ui5LibraryPath")
                ? this.config.get("ui5LibraryPath")
                : null,
        };
        this.resourceMap = {};
    }
    get hostname() {
        this.checkAndSeal();
        return this.options.hostname;
    }
    get port() {
        this.checkAndSeal();
        return this.options.port;
    }
    get ui5LibraryPath() {
        this.checkAndSeal();
        return configurationBase_1.ConfigurationBase.getAbsoluteNormalizedPath(this.options.ui5LibraryPath);
    }
    setOptions(options) {
        if (this.isChecked) {
            throw new Error(Exceptions.IS_SEALED);
        }
        this.options = Object.assign(this.options, options);
    }
    checkAndSeal() {
        if (this.isChecked) {
            return;
        }
        this.isChecked = true;
        if (this.options.port === null || this.options.port <= 0) {
            throw new Error(Exceptions.PORT_WRONG);
        }
        if (this.options.hostname === null ||
            !validator.isURL(this.options.hostname, {
                require_valid_protocol: false,
                require_tld: false,
            })) {
            throw new Error(Exceptions.HOSTNAME_WRONG);
        }
        if (this.options.ui5LibraryPath === null ||
            !configurationBase_1.ConfigurationBase.pathExists(this.options.ui5LibraryPath)) {
            throw new Error(Exceptions.LIBRARY_WRONG);
        }
    }
    determineLocaleConfiguration(withInteraction = false) {
        return __awaiter(this, void 0, void 0, function* () {
            this.readlineUi = readlineUi.create();
            const localConfiguration = yield this.getLocalConfiguration(withInteraction);
            const manifestProperties = yield this.getManifestDir(withInteraction);
            this.readlineUi.close();
        });
    }
    getLocalConfiguration(withInteraction) {
        return __awaiter(this, void 0, void 0, function* () {
            const directories = directoryTree(configurationBase_1.ConfigurationBase.basePath, {
                extensions: /\.json/,
                exclude: /node_modules/,
            });
            const foundDirectories = [];
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
            if (foundDirectories.length === 0) {
                this.logger.warn("No maceta.config.json found");
            }
            else if (foundDirectories.length === 1) {
                this.logger.log(`Using maceta.config.json from ${foundDirectories[0]}`);
                selectedDirectory = foundDirectories[0];
            }
            else if (withInteraction) {
                try {
                    selectedDirectory = yield this.getMacetaDirectoryChoice(foundDirectories);
                }
                catch (error) {
                    this.logger.warn("No directory selected!");
                }
            }
            if (!selectedDirectory) {
                return {};
            }
            try {
                const fileContent = yield fileSystem.readJson(path.join(selectedDirectory, "maceta.config.json"));
                const localConfiguration = Object.assign({}, fileContent);
                return localConfiguration;
            }
            catch (error) {
                this.logger.error(error);
            }
        });
    }
    getMacetaDirectoryChoice(directories) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.logger.newLine();
                const prompt = new PromptRadio({
                    name: "macetaConfigDir",
                    message: "Select the maceta configuration directory\n(Select with the spacebar, continue with enter)",
                    choices: directories,
                    ui: this.readlineUi,
                });
                prompt.ask(selected => {
                    if (selected) {
                        resolve(selected);
                    }
                    else {
                        reject();
                    }
                });
            });
        });
    }
    getManifestDir(withInteraction) {
        return __awaiter(this, void 0, void 0, function* () {
            const directories = directoryTree(configurationBase_1.ConfigurationBase.basePath, {
                extensions: /\.json/,
                exclude: /node_modules/,
            });
            const foundDirectories = [];
            searchManifest(directories);
            function searchManifest(dirObject) {
                if ("children" in dirObject) {
                    if (dirObject.children.reduce((hasManifest, entry) => hasManifest || entry.name === "manifest.json", false)) {
                        foundDirectories.push(dirObject.path);
                    }
                    dirObject.children.forEach(entry => searchManifest(entry));
                }
            }
            let manifestObjects = yield Promise.all(foundDirectories.map((directory) => __awaiter(this, void 0, void 0, function* () {
                const manifest = yield fileSystem.readJson(path.join(directory, "manifest.json"));
                const rawManifest = {
                    directory,
                    manifest,
                };
                return rawManifest;
            })));
            manifestObjects = manifestObjects.filter(entry => "sap.app" in entry.manifest &&
                "type" in entry.manifest["sap.app"] &&
                entry.manifest["sap.app"].type === "application");
            const manifestPropertiesList = manifestObjects.map(entry => {
                let componentId;
                let libraries;
                if ("sap.app" in entry.manifest && "id" in entry.manifest["sap.app"]) {
                    componentId = entry.manifest["sap.app"].id;
                }
                if ("sap.ui5" in entry.manifest &&
                    "dependencies" in entry.manifest["sap.ui5"] &&
                    "libs" in entry.manifest["sap.ui5"].dependencies) {
                    libraries = Object.keys(entry.manifest["sap.ui5"].dependencies.libs);
                    libraries = libraries.filter(lib => lib.split(".")[0] !== "sap");
                }
                const manifestProperties = {
                    componentId,
                    libraries,
                    directory: entry.directory,
                };
                return manifestProperties;
            });
            if (manifestPropertiesList.length === 1) {
                this.logger.log(`Manifest folder found: ${manifestPropertiesList[0].directory}`);
                return manifestPropertiesList[0];
            }
            else if (manifestPropertiesList.length > 1 && withInteraction) {
                try {
                    return yield this.getManifestDirectoryChoice(manifestPropertiesList);
                }
                catch (error) {
                    this.logger.error("No manifest selected!");
                }
            }
            else {
                this.logger.error("No manifest found!");
            }
        });
    }
    getManifestDirectoryChoice(manifestPropertiesList) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.logger.newLine();
                const prompt = new PromptRadio({
                    name: "manifestDir",
                    message: "Select the app directory\n(Select with the spacebar, continue with enter)",
                    choices: manifestPropertiesList.map(entry => entry.directory),
                    ui: this.readlineUi,
                });
                prompt.ask(selected => {
                    if (selected) {
                        resolve(selected);
                    }
                    else {
                        reject();
                    }
                });
            });
        });
    }
};
ServerConfiguration = __decorate([
    common_1.Injectable(),
    __param(0, common_1.Inject(configurationBase_1.CONFIG_INJECT)),
    __metadata("design:paramtypes", [Object, logger_1.Logger])
], ServerConfiguration);
exports.ServerConfiguration = ServerConfiguration;

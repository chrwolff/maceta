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
Object.defineProperty(exports, "__esModule", { value: true });
const validator = require("validator");
const fileSystem = require("fs-extra");
const path = require("path");
const common_1 = require("@nestjs/common");
const DEFAULT = "default";
var Exceptions;
(function (Exceptions) {
    Exceptions["BASE_PATH_WRONG"] = "Base path not configured correctly";
    Exceptions["COMPONENT_PATH_WRONG"] = "Component path not configured correctly";
    Exceptions["ODATA_PATH_WRONG"] = "OData path not configured correctly";
    Exceptions["PORT_WRONG"] = "Port not configured correctly";
    Exceptions["HOSTNAME_WRONG"] = "Hostname not configured correctly";
    Exceptions["LIBRARY_WRONG"] = "UI5 library path not configured correctly";
    Exceptions["IS_SEALED"] = "Configuration cannot be changed after first get";
    Exceptions["MANIFEST_NO_ID"] = "Manifest contains no id";
    Exceptions["NOT_CHECKED_YET"] = "Configuration is not checked and sealed yet";
})(Exceptions = exports.Exceptions || (exports.Exceptions = {}));
let ServerConfiguration = class ServerConfiguration {
    constructor() {
        this.resources = [];
        this.shellConfig = null;
        this.isChecked = false;
        this.configuration = {
            ui5LibraryPath: "",
            basePath: "",
            componentPath: "",
            hostname: "localhost",
            port: 3000,
            shellEmbedded: false,
            resourceMap: new Map()
        };
    }
    get hostname() {
        this.checkAndSeal();
        return this.configuration.hostname;
    }
    get port() {
        this.checkAndSeal();
        return this.configuration.port;
    }
    get ui5LibraryPath() {
        this.checkAndSeal();
        return this.configuration.ui5LibraryPath;
    }
    get basePath() {
        this.checkAndSeal();
        return this.configuration.basePath;
    }
    get componentPath() {
        this.checkAndSeal();
        return this.configuration.componentPath;
    }
    get shellConfiguration() {
        this.checkAndSeal();
        return this.shellConfig;
    }
    get resourceMap() {
        this.checkAndSeal();
        return this.configuration.resourceMap;
    }
    get oDataPath() {
        this.checkAndSeal();
        return this.configuration.oDataPath;
    }
    get browserUrl() {
        if (!this.isChecked) {
            throw new Error(Exceptions.NOT_CHECKED_YET);
        }
        let url = `http://${this.configuration.hostname}:${this.configuration.port}/`;
        if (this.configuration.shellEmbedded) {
            url = `${url}shell?sap-ushell-config=standalone&local-ushell-config=${this.configuration.shellId}`;
            if (this.configuration.language) {
                url = `${url}&sap-language=${this.configuration.language}`;
            }
            url = `${url}#Shell-runStandaloneApp`;
        }
        else {
            url = `${url}/index.html`;
        }
        return url;
    }
    setOptions(options, resources) {
        if (this.isChecked) {
            throw new Error(Exceptions.IS_SEALED);
        }
        this.configuration = Object.assign(this.configuration, options);
        if (resources) {
            this.resources = resources.map(resource => {
                if (!resource.shellConfigurationKey) {
                    resource.shellConfigurationKey = DEFAULT;
                }
                resource.sapServer = Boolean(resource.sapServer);
                return resource;
            });
        }
        else {
            this.resources = [];
        }
    }
    checkAndSeal() {
        if (this.isChecked) {
            return;
        }
        this.isChecked = true;
        if (!path.isAbsolute(this.configuration.basePath) ||
            !this.pathExists(this.configuration.basePath)) {
            throw new Error(Exceptions.BASE_PATH_WRONG);
        }
        if (this.configuration.port <= 0) {
            throw new Error(Exceptions.PORT_WRONG);
        }
        if (!validator.isURL(this.configuration.hostname, {
            require_valid_protocol: false,
            require_tld: false
        })) {
            throw new Error(Exceptions.HOSTNAME_WRONG);
        }
        if (!this.pathExists(this.configuration.ui5LibraryPath)) {
            throw new Error(Exceptions.LIBRARY_WRONG);
        }
        this.configuration.ui5LibraryPath = this.getAbsoluteNormalizedPath(this.configuration.ui5LibraryPath);
        if (!this.pathExists(this.configuration.componentPath)) {
            throw new Error(Exceptions.COMPONENT_PATH_WRONG);
        }
        this.configuration.componentPath = this.getAbsoluteNormalizedPath(this.configuration.componentPath);
        if (this.configuration.oDataPath) {
            if (!this.pathExists(this.configuration.oDataPath)) {
                throw new Error(Exceptions.ODATA_PATH_WRONG);
            }
            this.configuration.oDataPath = this.getAbsoluteNormalizedPath(this.configuration.oDataPath);
        }
        let componentId;
        let nonSapNamespaces;
        const manifestPath = path.join(this.configuration.componentPath, "manifest.json");
        const manifest = fileSystem.readJSONSync(manifestPath);
        if ("sap.app" in manifest && "id" in manifest["sap.app"]) {
            componentId = manifest["sap.app"].id;
        }
        else {
            throw Error(Exceptions.MANIFEST_NO_ID);
        }
        if ("sap.ui5" in manifest &&
            "dependencies" in manifest["sap.ui5"] &&
            "libs" in manifest["sap.ui5"].dependencies) {
            nonSapNamespaces = Object.keys(manifest["sap.ui5"].dependencies.libs).filter((lib) => lib.split(".")[0] !== "sap");
        }
        this.resources = this.resources.filter(resource => nonSapNamespaces.includes(resource.namespace));
        this.configuration.shellEmbedded = this.resources.reduce((value, resource) => value ||
            (resource.shellConfigurationKey !== DEFAULT || resource.sapServer), this.configuration.shellEmbedded);
        if (this.configuration.shellEmbedded) {
            this.configuration.shellId = DEFAULT;
            this.shellConfig = {
                default: {
                    app: {
                        languages: [],
                        ui5ComponentName: componentId
                    },
                    resourcePath: {}
                }
            };
        }
        this.configuration.resourceMap.set(componentId, this.configuration.componentPath);
        this.resources.forEach(resource => this.createResourcePath(resource));
    }
    createResourcePath(resource) {
        if (!resource.sapServer) {
            this.configuration.resourceMap.set(resource.namespace, this.getAbsoluteNormalizedPath(resource.path));
        }
        if (this.shellConfig) {
            if (!(resource.shellConfigurationKey in this.shellConfig)) {
                this.shellConfig[resource.shellConfigurationKey] = {
                    resourcePath: {}
                };
            }
            let pathObject;
            if (resource.sapServer) {
                pathObject = {
                    path: resource.path,
                    file: false
                };
            }
            else {
                pathObject = {
                    file: true
                };
            }
            this.shellConfig[resource.shellConfigurationKey].resourcePath[resource.namespace] = pathObject;
        }
    }
    getAbsoluteNormalizedPath(filePath) {
        let absolutePath;
        if (path.isAbsolute(filePath)) {
            absolutePath = filePath;
        }
        else {
            absolutePath = path.join(this.configuration.basePath, filePath);
        }
        return path.normalize(absolutePath);
    }
    pathExists(filePath) {
        try {
            const absolutePath = this.getAbsoluteNormalizedPath(filePath);
            const stats = fileSystem.statSync(absolutePath);
            return stats.isDirectory();
        }
        catch (e) {
            return false;
        }
    }
};
ServerConfiguration = __decorate([
    common_1.Injectable(),
    __metadata("design:paramtypes", [])
], ServerConfiguration);
exports.ServerConfiguration = ServerConfiguration;

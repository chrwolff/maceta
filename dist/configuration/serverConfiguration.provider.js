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
Object.defineProperty(exports, "__esModule", { value: true });
const validator = require("validator");
const configurationBase_1 = require("./configurationBase");
const common_1 = require("@nestjs/common");
var Exceptions;
(function (Exceptions) {
    Exceptions["PORT_WRONG"] = "Port not configured correctly";
    Exceptions["HOSTNAME_WRONG"] = "Hostname not configured correctly";
    Exceptions["LIBRARY_WRONG"] = "UI5 library path not configured correctly";
    Exceptions["IS_SEALED"] = "Configuration cannot be changed after first get";
})(Exceptions = exports.Exceptions || (exports.Exceptions = {}));
let ServerConfiguration = class ServerConfiguration extends configurationBase_1.ConfigurationBase {
    constructor(config) {
        super(config);
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
        return configurationBase_1.ConfigurationBase.getAbolutePath(this.options.ui5LibraryPath);
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
};
ServerConfiguration = __decorate([
    common_1.Injectable(),
    __param(0, common_1.Inject(configurationBase_1.CONFIG_INJECT)),
    __metadata("design:paramtypes", [Object])
], ServerConfiguration);
exports.ServerConfiguration = ServerConfiguration;

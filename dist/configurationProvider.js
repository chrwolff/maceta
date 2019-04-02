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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
var ConfigurationProvider_1;
const path = require("path");
const fileSystem = require("fs-extra");
const common_1 = require("@nestjs/common");
const CONFIG_PATH = path.join(__dirname, "..", "config");
process.env.NODE_CONFIG_DIR = CONFIG_PATH;
const config = require("config");
let mergedConfiguration = config.util.toObject();
let ConfigurationProvider = ConfigurationProvider_1 = class ConfigurationProvider {
    constructor() {
        common_1.Logger.log("Constructor", ConfigurationProvider_1.name);
        this.localHostname = config.get("hostname");
        this.localPort = config.get("port");
        this.localLibraryPath = "C:/workspace/ui5-lib/sapui5-sdk-1.63.1";
        this.resourceMap = {};
    }
    static saveConfig(configuration) {
        return __awaiter(this, void 0, void 0, function* () {
            const configPath = path.join(CONFIG_PATH, "local.json");
            mergedConfiguration = config.util.extendDeep(mergedConfiguration, configuration);
            const localConfiguration = config.util.diffDeep(mergedConfiguration, configuration);
            yield fileSystem.writeJson(configPath, localConfiguration);
            ConfigurationProvider_1.displayConfiguration();
        });
    }
    static displayConfiguration() {
        common_1.Logger.log("\nCurrent global maceta configuration");
        Object.keys(mergedConfiguration)
            .filter(key => key !== "resourceMap")
            .forEach(key => console.log(`${key}: ${mergedConfiguration[key]}`));
    }
};
ConfigurationProvider = ConfigurationProvider_1 = __decorate([
    common_1.Injectable(),
    __metadata("design:paramtypes", [])
], ConfigurationProvider);
exports.ConfigurationProvider = ConfigurationProvider;

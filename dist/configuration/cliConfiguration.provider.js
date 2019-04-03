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
const path = require("path");
const fileSystem = require("fs-extra");
const configurationBase_1 = require("./configurationBase");
const common_1 = require("@nestjs/common");
const logger_1 = require("../logger");
let CliConfiguration = class CliConfiguration extends configurationBase_1.ConfigurationBase {
    constructor(config, logger) {
        super(config);
        this.logger = logger;
    }
    saveOptions(options) {
        return __awaiter(this, void 0, void 0, function* () {
            this.mergedConfiguration = this.config.util.extendDeep(this.mergedConfiguration, options);
            const configPath = path.join(configurationBase_1.CONFIG_PATH, "local.json");
            yield fileSystem.writeJson(configPath, this.mergedConfiguration);
        });
    }
    displayConfiguration() {
        this.logger.log("Current global maceta configuration");
        Object.keys(this.mergedConfiguration)
            .filter(key => key !== "resourceMap")
            .forEach(key => this.logger.log(`${key}: ${this.mergedConfiguration[key]}`));
        this.logger.newLine();
    }
};
CliConfiguration = __decorate([
    common_1.Injectable(),
    __param(0, common_1.Inject(configurationBase_1.CONFIG_INJECT)),
    __metadata("design:paramtypes", [Object, logger_1.Logger])
], CliConfiguration);
exports.CliConfiguration = CliConfiguration;

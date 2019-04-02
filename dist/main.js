#!/usr/bin/env node
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
const core_1 = require("@nestjs/core");
const serverModule_1 = require("./serverModule/serverModule");
const configurationProvider_1 = require("./configurationProvider");
const common_1 = require("@nestjs/common");
(() => __awaiter(this, void 0, void 0, function* () {
    const app = yield core_1.NestFactory.create(serverModule_1.ServerModule);
    const configuration = app.get(configurationProvider_1.ConfigurationProvider);
    common_1.Logger.log(`Server starting at ${configuration.localHostname}:${configuration.localPort}`);
    try {
        yield app.listenAsync(configuration.localPort, configuration.localHostname);
    }
    catch (e) {
        common_1.Logger.error(e);
    }
}))();

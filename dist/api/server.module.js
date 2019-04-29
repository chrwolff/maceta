"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const sapRouter_controller_1 = require("./sapRouter.controller");
const serverConfiguration_provider_1 = require("./serverConfiguration.provider");
const fileRouter_controller_1 = require("./fileRouter.controller");
const common_2 = require("@nestjs/common");
const odataRouter_controller_1 = require("./odataRouter.controller");
let ServerModule = class ServerModule {
};
ServerModule = __decorate([
    common_1.Module({
        controllers: [sapRouter_controller_1.SapRouter, fileRouter_controller_1.FileRouter, odataRouter_controller_1.ODataRouter],
        providers: [serverConfiguration_provider_1.ServerConfiguration, common_2.Logger]
    })
], ServerModule);
exports.ServerModule = ServerModule;

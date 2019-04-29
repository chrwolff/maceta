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
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const serverConfiguration_provider_1 = require("./serverConfiguration.provider");
const directoryTree = require("directory-tree");
const ODATA_BASE_PATH = "/sap/opu/odata/";
let ODataRouter = class ODataRouter {
    constructor(adapterHost, configuration, logger) {
        this.adapterHost = adapterHost;
        this.configuration = configuration;
        this.logger = logger;
    }
    onModuleInit() {
        if (!this.configuration.oDataPath) {
            return;
        }
        const metadataFiles = directoryTree(this.configuration.oDataPath, {
            extensions: /\.js/
        });
        metadataFiles.children
            .filter(child => child.name === "service.js")
            .forEach(child => {
            let service = require(child.path);
            if ("Server" in service) {
                let serverArray = Array.isArray(service.Server)
                    ? service.Server
                    : [service.Server];
                serverArray
                    .filter(server => "create" in server &&
                    typeof server.create === "function" &&
                    "namespace" in server &&
                    typeof server.namespace === "string")
                    .forEach(server => {
                    let namespace = server.namespace.split(".").join("/");
                    let odataPath = `${ODATA_BASE_PATH}${namespace}`;
                    this.adapterHost.httpAdapter.use(odataPath, server.create());
                });
            }
        });
    }
};
ODataRouter = __decorate([
    common_1.Controller(),
    __metadata("design:paramtypes", [core_1.HttpAdapterHost,
        serverConfiguration_provider_1.ServerConfiguration,
        common_1.Logger])
], ODataRouter);
exports.ODataRouter = ODataRouter;

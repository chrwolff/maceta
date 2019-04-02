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
var SapRouter_1;
const url = require("url");
const path = require("path");
const fileSystem = require("fs-extra");
const mime = require("mime");
const common_1 = require("@nestjs/common");
const configurationProvider_1 = require("../configurationProvider");
const CACHE_TIME = 24 * 60 * 60;
let SapRouter = SapRouter_1 = class SapRouter {
    constructor(configuration) {
        this.configuration = configuration;
    }
    getLibrary(req, res) {
        let fullPath = url.parse(req.url).pathname;
        common_1.Logger.log(`File request: ${fullPath}`, SapRouter_1.name);
        fullPath = path.join(this.configuration.localLibraryPath, fullPath
            .split("/")
            .slice(5)
            .join("/"));
        fileSystem.readFile(fullPath, (err, data) => {
            if (err) {
                res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR);
                res.end(`Error getting the file: ${err}.`);
            }
            else {
                const extension = path.parse(fullPath).ext;
                const mimeType = mime.getType(extension);
                res.setHeader("Content-type", mimeType);
                res.setHeader("Cache-Control", `max-age=${CACHE_TIME};must-revalidate`);
                res.send(data);
            }
        });
    }
    startUp(res) {
        const config = {
            firstName: "Fiori",
            lastName: "Maceta",
            fullName: "Fiori Maceta",
            id: "MACETA",
        };
        res.send(JSON.stringify(config));
    }
};
__decorate([
    common_1.Get("/sap/public/bc/ui5_ui5/*"),
    __param(0, common_1.Req()), __param(1, common_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SapRouter.prototype, "getLibrary", null);
__decorate([
    common_1.Get("/sap/bc/ui2/start_up"),
    __param(0, common_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SapRouter.prototype, "startUp", null);
SapRouter = SapRouter_1 = __decorate([
    common_1.Controller(),
    __metadata("design:paramtypes", [configurationProvider_1.ConfigurationProvider])
], SapRouter);
exports.SapRouter = SapRouter;

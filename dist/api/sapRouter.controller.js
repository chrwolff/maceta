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
const url = require("url");
const path = require("path");
const fileSystem = require("fs-extra");
const mime = require("mime");
const common_1 = require("@nestjs/common");
const serverConfiguration_provider_1 = require("./serverConfiguration.provider");
const common_2 = require("@nestjs/common");
const CACHE_TIME = 24 * 60 * 60;
let SapRouter = class SapRouter {
    constructor(configuration, logger) {
        this.configuration = configuration;
        this.logger = logger;
    }
    getLibrary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let fullPath = url.parse(req.url).pathname;
            this.logger.log(`File request: ${fullPath}`);
            fullPath = path.join(this.configuration.ui5LibraryPath, fullPath
                .split("/")
                .slice(5)
                .join("/"));
            try {
                const file = yield fileSystem.readFile(fullPath);
                const extension = path.parse(fullPath).ext;
                const mimeType = mime.getType(extension);
                res.setHeader("Content-type", mimeType);
                res.setHeader("Cache-Control", `max-age=${CACHE_TIME};must-revalidate`);
                res.send(file);
            }
            catch (error) {
                res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR);
                res.end(`Error getting the file: ${error}.`);
            }
        });
    }
    startUp(res) {
        const config = {
            firstName: "Fiori",
            lastName: "Maceta",
            fullName: "Fiori Maceta",
            id: "MACETA"
        };
        res.send(JSON.stringify(config));
    }
};
__decorate([
    common_1.Get("/sap/public/bc/ui5_ui5/*"),
    __param(0, common_1.Req()), __param(1, common_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SapRouter.prototype, "getLibrary", null);
__decorate([
    common_1.Get("/sap/bc/ui2/start_up"),
    __param(0, common_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SapRouter.prototype, "startUp", null);
SapRouter = __decorate([
    common_1.Controller(),
    __metadata("design:paramtypes", [serverConfiguration_provider_1.ServerConfiguration,
        common_2.Logger])
], SapRouter);
exports.SapRouter = SapRouter;

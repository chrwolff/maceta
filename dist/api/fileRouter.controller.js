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
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const serverConfiguration_provider_1 = require("./serverConfiguration.provider");
const mime = require("mime");
const url = require("url");
const path = require("path");
const fileSystem = require("fs-extra");
const babel = require("babel-core");
let FileRouter = class FileRouter {
    constructor(adapterHost, configuration, logger) {
        this.adapterHost = adapterHost;
        this.configuration = configuration;
        this.logger = logger;
    }
    shellConfig(res) {
        let mimeType = mime.getType("json");
        res.setHeader("Content-type", mimeType);
        res.send(JSON.stringify(this.configuration.shellConfiguration));
    }
    shell(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            let urlPath = url.parse(request.url).pathname;
            if (urlPath === "/shell") {
                urlPath = "/shell/shell.html";
            }
            let filePath = path.join(__dirname, "../..", urlPath);
            try {
                let data = yield fileSystem.readFile(filePath, "utf8");
                let ext = path.parse(filePath).ext;
                let mimeType = mime.getType(ext);
                response.setHeader("Content-type", mimeType);
                response.send(data);
            }
            catch (err) {
                response.statusCode = 500;
                response.end(`Error getting the file: ${err}.`);
            }
        });
    }
    onModuleInit() {
        let matchers = [];
        this.configuration.resourceMap.forEach((path, namespace) => {
            matchers.push({
                matchString: namespace.replace(/\./g, "/"),
                matchPath: path,
                splitIndex: namespace.split(".").length + 1
            });
        });
        matchers.sort((a, b) => {
            if (a.splitIndex < b.splitIndex) {
                return 1;
            }
            else if (a.splitIndex > b.splitIndex) {
                return -1;
            }
            return 0;
        });
        const matchRoute = (matchPath, splitIndex) => {
            return (req, res) => {
                let urlPath = url.parse(req.url).pathname;
                let splitPath = urlPath.split("/");
                let reqPath = matchPath + "/" + splitPath.slice(splitIndex).join("/");
                this.resolveFile(reqPath, res, urlPath);
            };
        };
        matchers.forEach(matcher => {
            this.adapterHost.httpAdapter.get("/" + matcher.matchString + "/*", matchRoute(matcher.matchPath, matcher.splitIndex));
        });
    }
    resolveFile(reqPath, res, urlPath, babelJit = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let fullPath = this.configuration.getAbsoluteNormalizedPath(reqPath);
            try {
                let data = yield fileSystem.readFile(fullPath);
                let ext = path.parse(fullPath).ext;
                let mimeType = mime.getType(ext);
                let content = data;
                res.setHeader("Content-type", mimeType);
                res.setHeader("Cache-Control", "no-store");
                if (babelJit && ext === ".js") {
                    let transpileObj = babel.transform(data, {
                        ast: false,
                        babelrc: false,
                        sourceMaps: "inline",
                        comments: false,
                        sourceFileName: urlPath,
                        minified: true,
                        presets: [path.join(__dirname, "../../babel-preset-env")],
                        plugins: [
                            path.join(__dirname, "../../babel-plugin-transform-object-rest-spread")
                        ]
                    });
                    content = transpileObj.code;
                }
                this.logger.log(`File request: ${fullPath}`);
                res.send(content);
            }
            catch (err) {
                this.logger.error(`File request: ${fullPath}`);
                res.statusCode = 500;
                res.end(`Error getting the file: ${err}.`);
            }
        });
    }
};
__decorate([
    common_1.Get("/shellConfig"),
    __param(0, common_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FileRouter.prototype, "shellConfig", null);
__decorate([
    common_1.Get("/shell*"),
    __param(0, common_1.Req()), __param(1, common_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FileRouter.prototype, "shell", null);
FileRouter = __decorate([
    common_1.Controller(),
    __metadata("design:paramtypes", [core_1.HttpAdapterHost,
        serverConfiguration_provider_1.ServerConfiguration,
        common_1.Logger])
], FileRouter);
exports.FileRouter = FileRouter;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fileSystem = require("fs-extra");
const common_1 = require("@nestjs/common");
exports.CONFIG_INJECT = "GLOBAL_CONFIGURATION";
exports.CONFIG_PATH = path.join(__dirname, "../..", "config");
class ConfigurationBase {
    constructor(config) {
        this.config = config;
        this.mergedConfiguration = config.util.toObject();
    }
    static getGlobalConfiguration(configPath) {
        if (!configPath) {
            configPath = exports.CONFIG_PATH;
        }
        if (!ConfigurationBase.pathExists(configPath)) {
            common_1.Logger.error(`Configuration path ${configPath} does not exist!`);
        }
        process.env.NODE_CONFIG_DIR = configPath;
        process.env.SUPPRESS_NO_CONFIG_WARNING = "true";
        const config = require("config");
        return {
            provide: exports.CONFIG_INJECT,
            useValue: config,
        };
    }
    static getAbsoluteNormalizedPath(filePath) {
        let absolutePath;
        if (path.isAbsolute(filePath)) {
            absolutePath = filePath;
        }
        else {
            absolutePath = path.join(ConfigurationBase.basePath, filePath);
        }
        return path.normalize(absolutePath);
    }
    static pathExists(filePath) {
        try {
            const absolutePath = ConfigurationBase.getAbsoluteNormalizedPath(filePath);
            const stats = fileSystem.statSync(absolutePath);
            return stats.isDirectory();
        }
        catch (e) {
            return false;
        }
    }
}
ConfigurationBase.basePath = process.cwd();
exports.ConfigurationBase = ConfigurationBase;

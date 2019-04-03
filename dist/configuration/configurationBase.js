"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fileSystem = require("fs-extra");
const common_1 = require("@nestjs/common");
exports.CONFIG_INJECT = "CONFIGURATION";
exports.CONFIG_PATH = path.join(__dirname, "../..", "config");
class ConfigurationBase {
    constructor(config) {
        this.config = config;
        this.mergedConfiguration = config.util.toObject();
    }
    static getPersistedConfiguration(configPath) {
        if (!configPath) {
            configPath = exports.CONFIG_PATH;
        }
        if (!ConfigurationBase.pathExists(configPath)) {
            common_1.Logger.error(`Configuration path ${configPath} does not exist!`);
        }
        process.env.NODE_CONFIG_DIR = configPath;
        process.env.SUPPRESS_NO_CONFIG_WARNING = "true";
        return {
            provide: exports.CONFIG_INJECT,
            useValue: require("config"),
        };
    }
    static getAbolutePath(filePath) {
        if (path.isAbsolute(filePath)) {
            return filePath;
        }
        return path.join(process.cwd(), filePath);
    }
    static pathExists(filePath) {
        try {
            const absolutePath = ConfigurationBase.getAbolutePath(filePath);
            const stats = fileSystem.statSync(absolutePath);
            return stats.isDirectory();
        }
        catch (e) {
            return false;
        }
    }
}
exports.ConfigurationBase = ConfigurationBase;

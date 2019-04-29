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
const fileSystem = require("fs-extra");
const path = require("path");
process.env["NODE_CONFIG_DIR"] = path.join(__dirname, "..", "config");
const mergedConfiguration = require("config");
function saveConfig(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const configPath = path.join(__dirname, "..", "config", "local.json");
        let configuration;
        try {
            configuration = yield fileSystem.readJson(configPath);
        }
        catch (e) {
            configuration = {};
        }
        Object.keys(options).forEach(key => {
            configuration[key] = options[key];
            mergedConfiguration[key] = options[key];
        });
        yield fileSystem.writeJson(configPath, configuration);
        configToConsole(mergedConfiguration);
    });
}
exports.saveConfig = saveConfig;
function displayConfig() {
    configToConsole(mergedConfiguration);
}
exports.displayConfig = displayConfig;
function configToConsole(configuration) {
    console.log("\nCurrent global maceta configuration");
    Object.keys(configuration)
        .filter(key => key !== "resourceMap")
        .forEach(key => console.log(`${key}: ${configuration[key]}`));
    console.log();
    process.exit();
}

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
const serverConfiguration_provider_1 = require("./configuration/serverConfiguration.provider");
const configuration_module_1 = require("./configuration/configuration.module");
const cliConfiguration_provider_1 = require("./configuration/cliConfiguration.provider");
const logger_1 = require("./logger");
const yargs = require("yargs");
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
}
const startConfigOptionTemplate = {
    ui5LibraryPath: {
        alias: "ui5",
        type: "string",
        desc: "Absolute path to UI5 library",
    },
    hostname: {
        alias: "h",
        type: "string",
        desc: "Hostname for the local server",
    },
    port: {
        alias: "p",
        type: "number",
        desc: "Port for the application",
    },
};
const resourceOptionTemplate = {
    namespace: {
        alias: "n",
        type: "string",
        desc: "Namespace that shall be configured",
    },
    delete: {
        alias: "d",
        type: "boolean",
        desc: "Delete configuration of the given namespace",
    },
};
(() => {
    const args = yargs
        .scriptName("maceta")
        .command(["start [option]", "s"], "Start maceta in current working directory", startConfigOptionTemplate)
        .command(["config [option]", "c"], "Set global configuration options", startConfigOptionTemplate)
        .command(["resource [options]", "r"], "Edit global resource mappings (namespaces)", resourceOptionTemplate)
        .demandCommand(1, 1)
        .hide("version")
        .help()
        .strict().argv;
    const command = args._[0];
    const options = {};
    Object.keys(args)
        .filter(key => key in startConfigOptionTemplate || key in resourceOptionTemplate)
        .forEach(key => (options[key] = args[key]));
    if (command.charAt(0) === "s") {
        startServer(options);
    }
    else if (command.charAt(0) === "c") {
        configure(options);
    }
    else if (command.charAt(0) === "r") {
        if (Object.keys(options).length) {
        }
        else {
        }
    }
})();
function configure(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const app = yield core_1.NestFactory.createApplicationContext(configuration_module_1.ConfigurationModule, {
            logger: false,
        });
        const configuration = app.get(cliConfiguration_provider_1.CliConfiguration);
        configuration.saveOptions(options);
        configuration.displayConfiguration();
    });
}
function startServer(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const app = yield core_1.NestFactory.create(serverModule_1.ServerModule, {
            logger: false,
        });
        const configuration = app.get(serverConfiguration_provider_1.ServerConfiguration);
        const logger = app.get(logger_1.Logger);
        try {
            configuration.setOptions(options);
            yield configuration.determineLocaleConfiguration();
            configuration.checkAndSeal();
            logger.log(`Server starting at ${configuration.hostname}:${configuration.port}`);
            yield app.listenAsync(configuration.port, configuration.hostname);
        }
        catch (error) {
            logger.error(error);
            process.exit();
        }
    });
}

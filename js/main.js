#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const startServer_1 = require("./startServer");
const handleConfig_1 = require("./handleConfig");
const handleResources_1 = require("./handleResources");
const startConfigOptionTemplate = {
    ui5LibraryPath: {
        alias: "ui5",
        type: "string",
        desc: "Absolute path to UI5 library"
    },
    hostname: {
        alias: "h",
        type: "string",
        desc: "Hostname for the local server"
    },
    port: {
        alias: "p",
        type: "number",
        desc: "Port for the application"
    }
};
const resourceOptionTemplate = {
    namespace: {
        alias: "n",
        type: "string",
        desc: "Namespace that shall be configured"
    },
    delete: {
        alias: "d",
        type: "boolean",
        desc: "Delete configuration of the given namespace"
    }
};
const args = require("yargs")
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
    startServer_1.startServer(options);
}
else if (command.charAt(0) === "c") {
    if (Object.keys(options).length) {
        handleConfig_1.saveConfig(options);
    }
    else {
        handleConfig_1.displayConfig();
    }
}
else if (command.charAt(0) === "r") {
    if (Object.keys(options).length) {
        handleResources_1.modifyResources(options);
    }
    else {
        handleResources_1.displayResources();
    }
}
//# sourceMappingURL=main.js.map
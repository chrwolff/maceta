#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const startServer_1 = require("./startServer");
const handleConfig_1 = require("./handleConfig");
const optionTemplate = {
    ui5LibraryPath: {
        alias: "ui5",
        type: "string"
    },
    port: {
        alias: "p",
        type: "number"
    },
    hostname: {
        alias: "h",
        type: "string"
    }
};
const args = require("yargs")
    .scriptName("maceta")
    .command(["run [option]", "r"], "Start maceta in current working directory", optionTemplate)
    .command(["config [option]", "c"], "Set global configuration options", optionTemplate)
    .demandCommand(1, 1)
    .hide("version")
    .help()
    .strict().argv;
const command = args._[0];
const options = {};
Object.keys(args)
    .filter(key => key in optionTemplate)
    .forEach(key => (options[key] = args[key]));
if (command.charAt(0) === "r") {
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
//# sourceMappingURL=main.js.map
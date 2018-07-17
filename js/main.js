#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const path = require("path");
const startServer_1 = require("./startServer");
process.env["NODE_CONFIG_DIR"] = path.join(__dirname, "..", "config");
const configFile = require("config");
// get arguments from CLI
const args = yargs.argv;
startServer_1.startServer(configFile);
//# sourceMappingURL=main.js.map
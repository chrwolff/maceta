#!/usr/bin/env node

const yargs = require("yargs");
const path = require("path");
import { startServer } from "./startServer";

process.env["NODE_CONFIG_DIR"] = path.join(__dirname, "..", "config");
const configFile = require("config");

// get arguments from CLI
const args = yargs.argv;

startServer(configFile);

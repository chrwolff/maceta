"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clc = require("cli-color");
class Logger {
    log(message) {
        Logger.write(message, clc.white);
    }
    error(message, trace) {
        Logger.write(message, clc.red);
    }
    warn(message) {
        Logger.write(message, clc.yellow);
    }
    debug(message) {
        Logger.write(message, clc.green);
    }
    verbose(message) {
        Logger.write(message, clc.magenta);
    }
    newLine() {
        process.stdout.write("\n");
    }
    static write(message, color) {
        process.stdout.write(color(`\n${message}`));
    }
}
exports.Logger = Logger;

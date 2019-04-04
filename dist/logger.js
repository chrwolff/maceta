"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clc = require("cli-color");
class Logger {
    log(message) {
        Logger.write(message, clc.white);
    }
    error(error, remark = "") {
        if (typeof error === "string") {
            Logger.write(error, clc.red);
        }
        else {
            Logger.write(error.message, clc.red);
            Logger.write(error.stack, clc.red);
        }
        if (remark) {
            Logger.write(remark, clc.red);
        }
        process.exit(0);
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

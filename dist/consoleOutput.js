"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ConsoleColors;
(function (ConsoleColors) {
    ConsoleColors["reset"] = "\u001B[0m";
    ConsoleColors["success"] = "\u001B[32m";
    ConsoleColors["error"] = "\u001B[31m";
    ConsoleColors["warning"] = "\u001B[33m";
    ConsoleColors["default"] = "\u001B[37m";
    ConsoleColors["emphasize"] = "\u001B[1m";
})(ConsoleColors || (ConsoleColors = {}));
function logNewline() {
    console.log("");
}
exports.logNewline = logNewline;
function logSuccess(text) {
    console.log(ConsoleColors.success, `\n${text}`, ConsoleColors.reset);
}
exports.logSuccess = logSuccess;
function logWarning(text) {
    console.log(ConsoleColors.warning, `\n${text}`, ConsoleColors.reset);
}
exports.logWarning = logWarning;
function logError(text) {
    console.log(ConsoleColors.error, `\n${text}`, ConsoleColors.reset);
    process.exit();
}
exports.logError = logError;

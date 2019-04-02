enum ConsoleColors {
  reset = "\x1b[0m",
  success = "\x1b[32m",
  error = "\x1b[31m",
  warning = "\x1b[33m",
  default = "\x1b[37m",
  emphasize = "\x1b[1m",
}

export function logNewline() {
  console.log("");
}

export function logSuccess(text: string) {
  console.log(ConsoleColors.success, `\n${text}`, ConsoleColors.reset);
}

export function logWarning(text: string) {
  console.log(ConsoleColors.warning, `\n${text}`, ConsoleColors.reset);
}

export function logError(text: string) {
  console.log(ConsoleColors.error, `\n${text}`, ConsoleColors.reset);
  process.exit();
}

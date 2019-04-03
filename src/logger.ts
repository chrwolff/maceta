import * as clc from "cli-color";
import { LoggerService } from "@nestjs/common";

export class Logger implements LoggerService {
  log(message: string) {
    Logger.write(message, clc.white);
  }

  error(message: string, trace: string) {
    Logger.write(message, clc.red);
  }

  warn(message: string) {
    Logger.write(message, clc.yellow);
  }

  debug(message: string) {
    Logger.write(message, clc.green);
  }

  verbose(message: string) {
    Logger.write(message, clc.magenta);
  }

  newLine() {
    process.stdout.write("\n");
  }

  private static write(message: string, color: (message: string) => string) {
    process.stdout.write(color(`\n${message}`));
  }
}

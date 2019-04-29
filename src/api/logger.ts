import * as clc from "cli-color";
import { LoggerService } from "@nestjs/common";

export class Logger implements LoggerService {
  log(message: string) {
    Logger.write(message, clc.white);
  }

  error(error: string | Error, remark: string = "") {
    if (typeof error === "string") {
      Logger.write(error, clc.red);
    } else {
      Logger.write(error.message, clc.red);
      Logger.write(error.stack, clc.red);
    }

    if (remark) {
      Logger.write(remark, clc.red);
    }
    process.exit(0);
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

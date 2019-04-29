import * as url from "url";
import * as path from "path";
import * as fileSystem from "fs-extra";
import * as mime from "mime";
import { Response } from "express";
import { Controller, Get, Req, Request, Res, HttpStatus } from "@nestjs/common";
import { ServerConfiguration } from "./serverConfiguration.provider";
import { Logger } from "@nestjs/common";

const CACHE_TIME = 24 * 60 * 60;

@Controller()
export class SapRouter {
  constructor(
    private configuration: ServerConfiguration,
    private logger: Logger
  ) {}

  @Get("/sap/public/bc/ui5_ui5/*")
  async getLibrary(@Req() req: Request, @Res() res: Response) {
    let fullPath = url.parse(req.url).pathname;

    this.logger.log(`File request: ${fullPath}`);

    fullPath = path.join(
      this.configuration.ui5LibraryPath,
      fullPath
        .split("/")
        .slice(5)
        .join("/")
    );

    try {
      const file = await fileSystem.readFile(fullPath);
      // if the file is found, set Content-type and send data
      const extension = path.parse(fullPath).ext;
      const mimeType = mime.getType(extension);
      res.setHeader("Content-type", mimeType);
      res.setHeader("Cache-Control", `max-age=${CACHE_TIME};must-revalidate`);
      res.send(file);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      res.end(`Error getting the file: ${error}.`);
    }
  }

  @Get("/sap/bc/ui2/start_up")
  startUp(@Res() res: Response) {
    const config = {
      firstName: "Fiori",
      lastName: "Maceta",
      fullName: "Fiori Maceta",
      id: "MACETA"
    };
    res.send(JSON.stringify(config));
  }
}

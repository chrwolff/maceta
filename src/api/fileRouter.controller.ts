import { Controller, Logger, Get, Res, Req } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { Response, RequestHandler, Request } from "express";
import { ServerConfiguration } from "./serverConfiguration.provider";
import * as mime from "mime";
import * as url from "url";
import * as path from "path";
import * as fileSystem from "fs-extra";
import * as babel from "babel-core";

@Controller()
export class FileRouter {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private configuration: ServerConfiguration,
    private logger: Logger
  ) {}

  // this route is used by the shell index.html
  @Get("/shellConfig")
  shellConfig(@Res() res: Response) {
    let mimeType = mime.getType("json");
    res.setHeader("Content-type", mimeType);
    res.send(JSON.stringify(this.configuration.shellConfiguration));
  }

  // requests to "/shell/*" send back files from the shell folder
  @Get("/shell*")
  async shell(@Req() request: Request, @Res() response: Response) {
    let urlPath = url.parse(request.url).pathname;
    if (urlPath === "/shell") {
      urlPath = "/shell/shell.html";
    }
    let filePath = path.join(__dirname, "../..", urlPath);
    try {
      let data = await fileSystem.readFile(filePath, "utf8");
      let ext = path.parse(filePath).ext;
      let mimeType = mime.getType(ext);
      response.setHeader("Content-type", mimeType);
      response.send(data);
    } catch (err) {
      response.statusCode = 500;
      response.end(`Error getting the file: ${err}.`);
    }
  }

  onModuleInit() {
    // mapping of resource paths to server routes and file system paths.
    // step 1: create an array of routes together with their number of seperators
    interface Matcher {
      matchString: string;
      matchPath: string;
      splitIndex: number;
    }
    let matchers: Matcher[] = [];
    this.configuration.resourceMap.forEach((path, namespace) => {
      matchers.push({
        matchString: namespace.replace(/\./g, "/"),
        matchPath: path,
        splitIndex: namespace.split(".").length + 1
      });
    });

    // step 2: sort the routes by number of seperators. more specific routes to front
    matchers.sort((a, b) => {
      if (a.splitIndex < b.splitIndex) {
        return 1;
      } else if (a.splitIndex > b.splitIndex) {
        return -1;
      }
      return 0;
    });

    const matchRoute = (
      matchPath: string,
      splitIndex: number
    ): RequestHandler => {
      return (req: Request, res: Response) => {
        let urlPath = url.parse(req.url).pathname;
        let splitPath = urlPath.split("/");
        let reqPath = matchPath + "/" + splitPath.slice(splitIndex).join("/");
        this.resolveFile(reqPath, res, urlPath);
      };
    };

    // step 3: connect routes and file paths
    matchers.forEach(matcher => {
      this.adapterHost.httpAdapter.get(
        "/" + matcher.matchString + "/*",
        matchRoute(matcher.matchPath, matcher.splitIndex)
      );
    });
  }

  private async resolveFile(
    reqPath: string,
    res: Response,
    urlPath: string,
    babelJit = false
  ) {
    let fullPath = this.configuration.getAbsoluteNormalizedPath(reqPath);

    try {
      let data = await fileSystem.readFile(fullPath);
      let ext = path.parse(fullPath).ext;
      let mimeType = mime.getType(ext);
      let content = data;
      // if the file is found, set Content-type and send data
      res.setHeader("Content-type", mimeType);
      res.setHeader("Cache-Control", "no-store");
      if (babelJit && ext === ".js") {
        let transpileObj = babel.transform(data, {
          ast: false,
          babelrc: false,
          sourceMaps: "inline",
          comments: false,
          sourceFileName: urlPath,
          minified: true,
          presets: [path.join(__dirname, "../../babel-preset-env")],
          plugins: [
            path.join(
              __dirname,
              "../../babel-plugin-transform-object-rest-spread"
            )
          ]
        });
        content = transpileObj.code;
      }
      this.logger.log(`File request: ${fullPath}`);
      res.send(content);
    } catch (err) {
      this.logger.error(`File request: ${fullPath}`);
      res.statusCode = 500;
      res.end(`Error getting the file: ${err}.`);
    }
  }
}

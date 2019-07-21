import * as path from "path";
import { Test, TestingModule } from "@nestjs/testing";
import {
  ServerConfiguration,
  ConfigurationOptions,
  Exceptions,
} from "./serverConfiguration.provider";
import { Logger } from "./logger";

describe("ServerConfiguration", () => {
  let configurationProvider: ServerConfiguration;
  let options: ConfigurationOptions;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [ServerConfiguration, Logger],
    }).compile();

    configurationProvider = app.get<ServerConfiguration>(ServerConfiguration);

    options = {
      ui5LibraryPath: ".",
      basePath: process.cwd(),
      componentPath: "./testApp/app/",
      port: 3000,
      hostname: "localhost",
      shellEmbedded: false,
    };
  });

  it("without configuration should throw", () => {
    expect(configurationProvider.checkAndSeal).toThrow();
  });

  it("with relative base path should throw", () => {
    options.basePath = ".";
    configurationProvider.setOptions(options);
    expect(() => configurationProvider.checkAndSeal()).toThrowError(
      Exceptions.BASE_PATH_WRONG,
    );
  });

  it("with invalid base path should throw", () => {
    options.basePath = path.join(process.cwd(), "äöü");
    configurationProvider.setOptions(options);
    expect(() => configurationProvider.checkAndSeal()).toThrowError(
      Exceptions.BASE_PATH_WRONG,
    );
  });

  it("with wrong port configuration should throw", () => {
    options.port = -1000;
    configurationProvider.setOptions(options);
    expect(() => configurationProvider.checkAndSeal()).toThrowError(
      Exceptions.PORT_WRONG,
    );
  });

  it("with wrong hostname configuration should throw", () => {
    options.hostname = "#äbcd";
    configurationProvider.setOptions(options);
    expect(() => configurationProvider.checkAndSeal()).toThrowError(
      Exceptions.HOSTNAME_WRONG,
    );
  });

  it("with wrong library path configuration should throw", () => {
    options.ui5LibraryPath = "./noFolder";
    configurationProvider.setOptions(options);
    expect(() => configurationProvider.checkAndSeal()).toThrowError(
      Exceptions.LIBRARY_WRONG,
    );
  });

  it("with wrong component path should throw", () => {
    options.componentPath = "./noFolder";
    configurationProvider.setOptions(options);
    expect(() => configurationProvider.checkAndSeal()).toThrowError(
      Exceptions.COMPONENT_PATH_WRONG,
    );
  });

  it("with wrong OData path should throw", () => {
    options.oDataPath = "./noFolder";
    configurationProvider.setOptions(options);
    expect(() => configurationProvider.checkAndSeal()).toThrowError(
      Exceptions.ODATA_PATH_WRONG,
    );
  });

  it("with correct configuration should return values", () => {
    configurationProvider.setOptions(options);
    expect(configurationProvider.hostname).toBe(options.hostname);
    expect(configurationProvider.port).toBe(options.port);
    expect(configurationProvider.ui5LibraryPath).toBe(
      path.join(process.cwd(), options.ui5LibraryPath),
    );
    expect(configurationProvider.componentPath).toBe(
      path.join(process.cwd(), options.componentPath),
    );
    expect(configurationProvider.basePath).toBe(
      path.join(options.basePath),
    );
  });

  it("with correct configuration should be immutable after first get", () => {
    configurationProvider.setOptions(options);
    configurationProvider.checkAndSeal();
    expect(() => configurationProvider.setOptions(options)).toThrowError(
      Exceptions.IS_SEALED,
    );
  });
});

import * as path from "path";
import { Test, TestingModule } from "@nestjs/testing";
import {
  ServerConfiguration,
  Exceptions,
} from "./serverConfiguration.provider";
import { ConfigurationBase } from "./configurationBase";
import { Logger } from "../logger";

const PersistedConfiguration = ConfigurationBase.getGlobalConfiguration("./");

describe("ServerConfiguration", () => {
  let configurationProvider: ServerConfiguration;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [ServerConfiguration, PersistedConfiguration, Logger],
    }).compile();

    configurationProvider = app.get<ServerConfiguration>(ServerConfiguration);
  });

  it("without configuration should throw", () => {
    expect(configurationProvider.checkAndSeal).toThrow();
  });

  it("without port configuration should throw", () => {
    configurationProvider.setOptions({
      hostname: "localhost",
      ui5LibraryPath: "test",
    });
    expect(() => configurationProvider.port).toThrowError(
      Exceptions.PORT_WRONG,
    );
  });

  it("with wrong port configuration should throw", () => {
    configurationProvider.setOptions({
      hostname: "localhost",
      ui5LibraryPath: "test",
      port: -1000,
    });
    expect(() => configurationProvider.port).toThrowError(
      Exceptions.PORT_WRONG,
    );
  });

  it("without hostname configuration should throw", () => {
    configurationProvider.setOptions({
      port: 3000,
      ui5LibraryPath: "test",
    });
    expect(() => configurationProvider.hostname).toThrowError(
      Exceptions.HOSTNAME_WRONG,
    );
  });

  it("with wrong hostname configuration should throw", () => {
    configurationProvider.setOptions({
      port: 3000,
      ui5LibraryPath: "test",
      hostname: "#äbcd",
    });
    expect(() => configurationProvider.hostname).toThrowError(
      Exceptions.HOSTNAME_WRONG,
    );
  });

  it("without library path configuration should throw", () => {
    configurationProvider.setOptions({
      port: 3000,
      hostname: "localhost",
    });
    expect(() => configurationProvider.hostname).toThrowError(
      Exceptions.LIBRARY_WRONG,
    );
  });

  it("with wrong library path configuration should throw", () => {
    configurationProvider.setOptions({
      port: 3000,
      ui5LibraryPath: "./noFolder",
      hostname: "localhost",
    });
    expect(() => configurationProvider.hostname).toThrowError(
      Exceptions.LIBRARY_WRONG,
    );
  });

  it("with correct configuration should return values", () => {
    const options = {
      port: 3000,
      ui5LibraryPath: "./",
      hostname: "localhost",
    };
    configurationProvider.setOptions(options);
    expect(configurationProvider.hostname).toBe(options.hostname);
    expect(configurationProvider.port).toBe(options.port);
    expect(configurationProvider.ui5LibraryPath).toBe(
      path.join(process.cwd(), options.ui5LibraryPath),
    );
  });

  it("with correct configuration should be immutable after first get", () => {
    const options = {
      port: 3000,
      ui5LibraryPath: "./",
      hostname: "localhost",
    };
    configurationProvider.setOptions(options);
    configurationProvider.checkAndSeal();
    expect(() => configurationProvider.setOptions(options)).toThrowError(
      Exceptions.IS_SEALED,
    );
  });
});

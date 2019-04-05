import { IConfig } from "config";
import { Provider } from "@nestjs/common";
export declare const CONFIG_INJECT = "GLOBAL_CONFIGURATION";
export declare const CONFIG_PATH: string;
export interface Options {
    readonly hostname?: string;
    readonly port?: number;
    readonly ui5LibraryPath?: string;
}
export interface LocalConfiguration {
    readonly ui5LibraryPath?: string;
}
export declare class ConfigurationBase {
    protected config: IConfig;
    protected mergedConfiguration: object;
    protected static basePath: string;
    constructor(config: IConfig);
    static getGlobalConfiguration(configPath?: string): Provider;
    protected static getAbsoluteNormalizedPath(filePath: string): string;
    protected static pathExists(filePath: string): boolean;
}

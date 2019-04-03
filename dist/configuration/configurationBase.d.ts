import { IConfig } from "config";
import { Provider } from "@nestjs/common";
export declare const CONFIG_INJECT = "CONFIGURATION";
export declare const CONFIG_PATH: string;
export interface Options {
    readonly hostname?: string;
    readonly port?: number;
    readonly ui5LibraryPath?: string;
}
export declare class ConfigurationBase {
    protected config: IConfig;
    protected mergedConfiguration: object;
    constructor(config: IConfig);
    static getPersistedConfiguration(configPath?: string): Provider;
    protected static getAbolutePath(filePath: string): string;
    protected static pathExists(filePath: string): boolean;
}

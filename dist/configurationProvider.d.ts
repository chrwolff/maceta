export declare class ConfigurationProvider {
    readonly localLibraryPath: string;
    readonly localHostname: string;
    readonly localPort: number;
    readonly resourceMap: {
        [key: string]: string;
    };
    constructor();
    static saveConfig(configuration: any): Promise<void>;
    static displayConfiguration(): void;
}

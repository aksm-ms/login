import * as path from 'path';

import Utils from './Utilities/Utils';
import PowerShellToolRunner from './Utilities/PowerShellToolRunner';
import ScriptBuilder from './Utilities/ScriptBuilder';
import Constants from './Constants';

export class ServicePrincipalLogin implements IAzurePowerShellSession {
    static readonly environment: string = Constants.AzureCloud;
    static readonly scopeLevel: string = Constants.Subscription;
    static readonly scheme: string = Constants.ServicePrincipal;
    servicePrincipalId: string;
    servicePrincipalKey: string;
    tenantId: string;
    subscriptionId: string;

    constructor(servicePrincipalId: string, servicePrincipalKey: string, tenantId: string, subscriptionId: string) {
        this.servicePrincipalId = servicePrincipalId;
        this.servicePrincipalKey = servicePrincipalKey;
        this.tenantId = tenantId;
        this.subscriptionId = subscriptionId;
    }

    async initialize() {
        Utils.setPSModuleBasePath();
        // const azLatestModulePath: string = await Utils.getLatestModulePath(Constants.moduleName);
        const azLatestModulePath = "C:\\Modules\\az_1.0.0";
        // Utils.setPSModulePath(`${Constants.prefix}${azLatestVersion}`);
        Utils.setPSModulePath(`${azLatestModulePath}`);
    }

    async login() {
        let output: string = "";
        const options: any = {
            listeners: {
                stdout: (data: Buffer) => {
                    output += data.toString();
                }
            }
        };
        const args: any = {
            servicePrincipalId: this.servicePrincipalId,
            servicePrincipalKey: this.servicePrincipalKey,
            subscriptionId: this.subscriptionId,
            environment: ServicePrincipalLogin.environment,
            scopeLevel: ServicePrincipalLogin.scopeLevel
        }
        const script: string = new ScriptBuilder().getAzPSLoginScript(ServicePrincipalLogin.scheme, this.tenantId, args);
        await PowerShellToolRunner.init();
        await PowerShellToolRunner.executePowerShellScriptBlock(script, options);
        const result: any = JSON.parse(output.trim());
        if (!(Constants.Success in result)) {
            throw new Error(`Azure PowerShell login failed with error: ${result[Constants.Error]}`);
        }
        console.log(`Azure PowerShell session successfully initialized`);
    }

}
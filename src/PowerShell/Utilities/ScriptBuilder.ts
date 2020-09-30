import * as core from '@actions/core';

import Constants from "../Constants";

export default class ScriptBuilder {
    script: string = "";

    getAzPSLoginScript(scheme: string, tenantId: string, args: any): string {
        let command = `Measure-Command {Clear-AzContext -Scope Process} | Select-Object -Property TotalSeconds;
             Measure-Command {Clear-AzContext -Scope CurrentUser -Force -ErrorAction SilentlyContinue} | Select-Object -Property TotalSeconds;`;
        if (scheme === Constants.ServicePrincipal) {
            command += `Measure-Command {Connect-AzAccount -ServicePrincipal -Tenant '${tenantId}' -Credential \
            (New-Object System.Management.Automation.PSCredential('${args.servicePrincipalId}',(ConvertTo-SecureString '${args.servicePrincipalKey.replace("'", "''")}' -AsPlainText -Force))) \
                -Environment '${args.environment}}' | Select-Object -Property TotalSeconds;`;
            if (args.scopeLevel === Constants.Subscription) {
                command += `Measure-Command {Set-AzContext -SubscriptionId '${args.subscriptionId}' -TenantId '${tenantId}}' | Select-Object -Property TotalSeconds;`;
            }
        }
        this.script += `try {
            $ErrorActionPreference = "Stop"
            $WarningPreference = "SilentlyContinue"
            $output = @{}
            ${command}
            $output['${Constants.Success}'] = "true"
        }
        catch {
            $output['${Constants.Error}'] = $_.exception.Message
        }
        return ConvertTo-Json $output`;
        core.debug(`Azure PowerShell Login Script: ${this.script}`);
        return this.script;
    }

    getLatestModulePathScript(moduleName: string): string {
        const command: string = `Get-Module -Name ${moduleName} -ListAvailable | Sort-Object Version -Descending | Select-Object -First 1`;
        this.script += `try {
            $ErrorActionPreference = "Stop"
            $WarningPreference = "SilentlyContinue"
            $output = @{}
            $data = ${command}
            $output['${Constants.AzVersion}'] = $data.Version.ToString()
            $output['${Constants.AzVersionPath}'] = $data.Path
            $output['${Constants.Success}'] = "true"
        }
        catch {
            $output['${Constants.Error}'] = $_.exception.Message
        }
        return ConvertTo-Json $output`;
        core.debug(`GetLatestModuleScript: ${this.script}`);
        return this.script;
    }

}

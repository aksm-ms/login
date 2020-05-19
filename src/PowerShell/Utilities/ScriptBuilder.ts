import * as core from '@actions/core';

import Constants from "../Constants";

export default class ScriptBuilder {
    script: string = "";

    getAzPSLoginScript(scheme: string, tenantId: string, args: any): string {
        let command = `Clear-AzContext -Scope Process;
             Clear-AzContext -Scope CurrentUser -Force -ErrorAction SilentlyContinue;`;
        if (scheme === Constants.ServicePrincipal) {
            command += `Connect-AzAccount -ServicePrincipal -Tenant ${tenantId} -Credential \
            (New-Object System.Management.Automation.PSCredential('${args.servicePrincipalId}',(ConvertTo-SecureString ${args.servicePrincipalKey} -AsPlainText -Force))) \
                -Environment ${args.environment} -Debug 5>&1`;
            // command += `Connect-AzAccount -ServicePrincipal -Tenant ${tenantId} -Credential \
            // (New-Object System.Management.Automation.PSCredential('${args.servicePrincipalId}',(ConvertTo-SecureString ${args.servicePrincipalKey} -AsPlainText -Force))) \
            //     -Environment ${args.environment} | out-null;`;
            if (args.scopeLevel === Constants.Subscription) {
                command += `Set-AzContext -SubscriptionId ${args.subscriptionId} -TenantId ${tenantId} | out-null;`;
            }
        }
        this.script += `try {
            $DebugPreference = "Continue"
            $curr = [system.diagnostics.stopwatch]::startNew()
            $ErrorActionPreference = "Stop"
            $WarningPreference = "SilentlyContinue"
            $output = @{}
            ${command} 
            $output['${Constants.Success}'] = "true"
            $output['secs'] = $curr.Elapsed.TotalSeconds.ToString()
        }
        catch {
            $output['${Constants.Error}'] = $_.exception.Message
        }
        return ConvertTo-Json $output`;
        core.debug(`Azure PowerShell Login Script: ${this.script}`);
        return this.script;
    }

    getLatestModuleScript(moduleName: string): string {
        const command: string = `Get-Module -Name ${moduleName} -ListAvailable | Sort-Object Version -Descending | Select-Object -First 1`;
        this.script += `try {
            $curr = [system.diagnostics.stopwatch]::startNew()
            $ErrorActionPreference = "Stop"
            $WarningPreference = "SilentlyContinue"
            $output = @{}
            $data = ${command}
            $output['${Constants.AzVersion}'] = $data.Version.ToString()
            $output['${Constants.Success}'] = "true"
            $output['secs'] = $curr.Elapsed.TotalSeconds.ToString()
        }
        catch {
            $output['${Constants.Error}'] = $_.exception.Message
        }
        return ConvertTo-Json $output`;
        core.debug(`GetLatestModuleScript: ${this.script}`);
        return this.script;
    }
}

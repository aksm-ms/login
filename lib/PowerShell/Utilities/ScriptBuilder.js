"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const Constants_1 = __importDefault(require("../Constants"));
class ScriptBuilder {
    constructor() {
        this.script = "";
    }
    getAzPSLoginScript(scheme, tenantId, args) {
        let command = `Clear-AzContext -Scope Process;
             Clear-AzContext -Scope CurrentUser -Force -ErrorAction SilentlyContinue;`;
        if (scheme === Constants_1.default.ServicePrincipal) {
            // command += `Connect-AzAccount -ServicePrincipal -Tenant ${tenantId} -Credential \
            // (New-Object System.Management.Automation.PSCredential('${args.servicePrincipalId}',(ConvertTo-SecureString ${args.servicePrincipalKey} -AsPlainText -Force))) \
            //     -Environment ${args.environment} -Debug 5>&1;`;
            command += `Connect-AzAccount -ServicePrincipal -Tenant ${tenantId} -Credential \
            (New-Object System.Management.Automation.PSCredential('${args.servicePrincipalId}',(ConvertTo-SecureString ${args.servicePrincipalKey} -AsPlainText -Force))) \
                -Environment ${args.environment} | out-null;`;
            if (args.scopeLevel === Constants_1.default.Subscription) {
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
        }
        catch {
            $output['${Constants_1.default.Error}'] = $_.exception.Message
        }
        return ConvertTo-Json $output`;
        core.debug(`Azure PowerShell Login Script: ${this.script}`);
        return this.script;
    }
    getLatestModuleScript(moduleName) {
        const command = `Get-Module -Name ${moduleName} -ListAvailable | Sort-Object Version -Descending | Select-Object -First 1`;
        this.script += `try {
            $curr = [system.diagnostics.stopwatch]::startNew()
            $ErrorActionPreference = "Stop"
            $WarningPreference = "SilentlyContinue"
            $output = @{}
            $data = ${command}
            $output['${Constants_1.default.AzVersion}'] = $data.Version.ToString()
            $output['${Constants_1.default.Success}'] = "true"
            $output['secs'] = $curr.Elapsed.TotalSeconds.ToString()
        }
        catch {
            $output['${Constants_1.default.Error}'] = $_.exception.Message
        }
        return ConvertTo-Json $output`;
        core.debug(`GetLatestModuleScript: ${this.script}`);
        return this.script;
    }
}
exports.default = ScriptBuilder;

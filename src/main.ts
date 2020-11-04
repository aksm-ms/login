import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';

import { FormatType, SecretParser } from 'actions-secret-parser';
import { ServicePrincipalLogin } from './PowerShell/ServicePrincipalLogin';

var azPath: string;
var prefix = !!process.env.AZURE_HTTP_USER_AGENT ? `${process.env.AZURE_HTTP_USER_AGENT}` : "";
var azPSHostEnv = !!process.env.AZUREPS_HOST_ENVIRONMENT ? `${process.env.AZUREPS_HOST_ENVIRONMENT}` : "";

async function main() {
    try {
        // Set user agent variable
        var isAzCLISuccess = false;
        let usrAgentRepo = `${process.env.GITHUB_REPOSITORY}`;
        let actionName = 'AzureLogin';
        let userAgentString = (!!prefix ? `${prefix}+` : '') + `GITHUBACTIONS/${actionName}@v1_${usrAgentRepo}`;
        let azurePSHostEnv = (!!azPSHostEnv ? `${azPSHostEnv}+` : '') + `GITHUBACTIONS/${actionName}@v1_${usrAgentRepo}`;
        core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString);
        core.exportVariable('AZUREPS_HOST_ENVIRONMENT', azurePSHostEnv);

        azPath = await io.which("az", true);
        let output: string = "";
        const options: any = {
            listeners: {
                stdout: (data: Buffer) => {
                    output += data.toString();
                }
            }
        };
        await executeAzCliCommand("--version", true, options);
        core.debug(`az cli version used:\n${output}`);
    
        let creds = core.getInput('creds', { required: true });
        let secrets = new SecretParser(creds, FormatType.JSON);
        let servicePrincipalId = secrets.getSecret("$.clientId", false);
        let servicePrincipalKey = secrets.getSecret("$.clientSecret", true);
        let tenantId = secrets.getSecret("$.tenantId", false);
        let subscriptionId = secrets.getSecret("$.subscriptionId", false);
        const enableAzPSSession = core.getInput('enable-AzPSSession').toLowerCase() === "true";
        const allowNoSubscriptionsLogin = core.getInput('allow-no-subscriptions').toLowerCase() === "true";
        if (!servicePrincipalId || !servicePrincipalKey || !tenantId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret and tenantId are supplied.");
        }

        if (!subscriptionId && !allowNoSubscriptionsLogin) {
            throw new Error("Not all values are present in the creds object. Ensure subscriptionId is supplied.");
        }

        // Attempting Az cli login
        if (allowNoSubscriptionsLogin) {
            await executeAzCliCommand(`login --allow-no-subscriptions --service-principal -u "${servicePrincipalId}" -p "${servicePrincipalKey}" --tenant "${tenantId}"`, true);
        }
        else {
            let output2: string = "";
            let error2: string = "";
            const options2: any = {
                listeners: {
                    stdout: (data: Buffer) => {
                        output2 += data.toString();
                    },
                    stderr: (data: Buffer) => {
                        error2 += data.toString();
                  }
                }
            };
            let params = [
                "-u", servicePrincipalId,
                "-p", servicePrincipalKey,
                "--tenant", tenantId,
            ];
            await executeAzCliCommand(`login --service-principal`, true, options2, params);
            console.log(`after az login with SP: stdout:\n ${output2}; stderr:\n ${error2}`);


            let output3: string = "";
            let error3: string = "";
            const options3: any = {
                listeners: {
                    stdout: (data: Buffer) => {
                        output3 += data.toString();
                    },
                    stderr: (data: Buffer) => {
                        error3 += data.toString();
                  }
                }
            };
            params = [
                "--subscription", subscriptionId
            ];
            await executeAzCliCommand(`account set`, true, options3, params);
            console.log(`after az login with SP: stdout:\n ${output3}; stderr:\n ${error3}`);
        }
        isAzCLISuccess = true;
        if (enableAzPSSession) {
            // Attempting Az PS login
            console.log(`Running Azure PS Login`);
            const spnlogin: ServicePrincipalLogin = new ServicePrincipalLogin(servicePrincipalId, servicePrincipalKey, tenantId, subscriptionId, allowNoSubscriptionsLogin);
            await spnlogin.initialize();
            await spnlogin.login();
        }
        console.log("Login successful.");    
    } catch (error) {
        if (!isAzCLISuccess) {
            core.error("Az CLI Login failed. Please check the credentials. For more information refer https://aka.ms/create-secrets-for-GitHub-workflows");
        } else {
            core.error(`Azure PowerShell Login failed. Please check the credentials. For more information refer https://aka.ms/create-secrets-for-GitHub-workflows"`);
        }
        core.setFailed(error);
    } finally {
        // Reset AZURE_HTTP_USER_AGENT
        core.exportVariable('AZURE_HTTP_USER_AGENT', prefix);
        core.exportVariable('AZUREPS_HOST_ENVIRONMENT', azPSHostEnv);
    }
}

async function executeAzCliCommand(command: string, silent?: boolean, options: any = {}, params: any = []) {
    options.silent = !!silent;
    try {
        await exec.exec(`"${azPath}"`, params,  options); 
    }
    catch(error) {
        console.error(`in executeAzCliCommand: in catch: ${error}`);
        throw new Error(error);
    }
}

main();
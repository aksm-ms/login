import * as core from '@actions/core';
import * as crypto from "crypto";
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import { execSync, IExecSyncResult, IExecSyncOptions } from './utility';

import { FormatType, SecretParser } from 'actions-secret-parser';

var azPath: string;
var prefix = !!process.env.AZURE_HTTP_USER_AGENT ? `${process.env.AZURE_HTTP_USER_AGENT}` : "";

async function main() {
    try{
        // Set user agent varable
        let usrAgentRepo = crypto.createHash('sha256').update(`${process.env.GITHUB_REPOSITORY}`).digest('hex');
        let actionName = 'AzureLogin';
        let userAgentString = (!!prefix ? `${prefix}+` : '') + `GITHUBACTIONS_${actionName}_${usrAgentRepo}`;
        core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString);

        azPath = await io.which("az", true);
        await executeAzCliCommand("--version");

        /* let creds = core.getInput('creds', { required: true });
        let secrets = new SecretParser(creds, FormatType.JSON);
        let servicePrincipalId = secrets.getSecret("$.clientId", false);
        let servicePrincipalKey = secrets.getSecret("$.clientSecret", true);
        let tenantId = secrets.getSecret("$.tenantId", false);
        let subscriptionId = secrets.getSecret("$.subscriptionId", false); */
        let servicePrincipalId = '586a5f0f-3720-42b2-82ef-d4479d53a0a5'
        let servicePrincipalKey = '/gk+ZqLp7E2PDrzuTvRg0Zju67ExLgAZ0wJisZaV6OM='
        let tenantId = '72f988bf-86f1-41af-91ab-2d7cd011db47'
        let subscriptionId = 'c94bda7a-0577-4374-9c53-0e46a9fb0f70'
        if (!servicePrincipalId || !servicePrincipalKey || !tenantId || !subscriptionId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret, tenantId and subscriptionId are supplied.");
        }

        await executeAzCliCommand(`login --service-principal -u "${servicePrincipalId}" -p "${servicePrincipalKey}" --tenant "${tenantId}"`);
        await executeAzCliCommand(`account set --subscription "${subscriptionId}"`);

        execSync("powershell", "Get-Module -Name Az.Accounts -ListAvailable");


        console.log("Login successful.");    
    } catch (error) {
        core.error("Login failed. Please check the credentials. For more information refer https://aka.ms/create-secrets-for-GitHub-workflows");
        core.setFailed(error);
    } finally {
        // Reset AZURE_HTTP_USER_AGENT
        core.exportVariable('AZURE_HTTP_USER_AGENT', prefix);
    }
}

async function executeAzCliCommand(command: string) {
    try {
        await exec.exec(`"${azPath}" ${command}`, [],  {}); 
    }
    catch(error) {
        throw new Error(error);
    }
}


main();
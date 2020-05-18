import * as core from '@actions/core';
import * as crypto from "crypto";
import * as exec from '@actions/exec';
import * as io from '@actions/io';

import { FormatType, SecretParser } from 'actions-secret-parser';
import { ServicePrincipalLogin } from './PowerShell/ServicePrincipalLogin';

var azPath: string;
var prefix = !!process.env.AZURE_HTTP_USER_AGENT ? `${process.env.AZURE_HTTP_USER_AGENT}` : "";
var azPSHostEnv = !!process.env.AZUREPS_HOST_ENVIRONMENT ? `${process.env.AZUREPS_HOST_ENVIRONMENT}` : "";

var timeTaken;

async function main() {
    try {
        // Set user agent variable
        let a = Date.now();
        console.log(`setting env vars`);
        var isAzCLISuccess = false;
        let usrAgentRepo = crypto.createHash('sha256').update(`${process.env.GITHUB_REPOSITORY}`).digest('hex');
        let actionName = 'AzureLogin';
        let userAgentString = (!!prefix ? `${prefix}+` : '') + `GITHUBACTIONS/${actionName}@v1_${usrAgentRepo}`;
        let azurePSHostEnv = (!!azPSHostEnv ? `${azPSHostEnv}+` : '') + `GITHUBACTIONS/${actionName}@v1_${usrAgentRepo}`;
        core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString);
        core.exportVariable('AZUREPS_HOST_ENVIRONMENT', azurePSHostEnv);
        let b = Date.now();
        timeTaken = b - a;
        console.log(`setting env vars done: timetaken: ${Math.floor(timeTaken / 1000)}`);

        console.log(`set az path and get version`);
        let c = Date.now();
        azPath = await io.which("az", true);
        await executeAzCliCommand("--version");
        let d = Date.now();
        timeTaken = d - c;
        console.log(`set az path and get version: timetaken: ${Math.floor(timeTaken / 1000)}`);

        console.log(`getting inputs`);
        let x = Date.now();
        let creds = core.getInput('creds', { required: true });
        let secrets = new SecretParser(creds, FormatType.JSON);
        let servicePrincipalId = secrets.getSecret("$.clientId", false);
        let servicePrincipalKey = secrets.getSecret("$.clientSecret", true);
        let tenantId = secrets.getSecret("$.tenantId", false);
        let subscriptionId = secrets.getSecret("$.subscriptionId", false);
        const enableAzPSSession = core.getInput('enable-AzPSSession').toLowerCase() === "true";
        if (!servicePrincipalId || !servicePrincipalKey || !tenantId || !subscriptionId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret, tenantId and subscriptionId are supplied.");
        }
        let y = Date.now();
        timeTaken = y - x;
        console.log(`getting inputs done: timetaken: ${Math.floor(timeTaken / 1000)}`);
        // Attempting Az cli login
        console.log(` az cli start`);
        let s = Date.now();
        await executeAzCliCommand(`login --service-principal -u "${servicePrincipalId}" -p "${servicePrincipalKey}" --tenant "${tenantId}"`, true);
        await executeAzCliCommand(`account set --subscription "${subscriptionId}"`, true);
        isAzCLISuccess = true;
        let e = Date.now();
        timeTaken = e - s;
        console.log(`az cli end: timetaken: ${Math.floor(timeTaken / 1000)}`);
        if (enableAzPSSession) {
            // Attempting Az PS login
            console.log(`Running Azure PS Login`);
            let s2 = Date.now();
            const spnlogin: ServicePrincipalLogin = new ServicePrincipalLogin(servicePrincipalId, servicePrincipalKey, tenantId, subscriptionId);
            await spnlogin.initialize();
            await spnlogin.login();
            let e2 = Date.now();
            timeTaken = e2 - s2;
            console.log(`ps login done: timetaken: ${Math.floor(timeTaken / 1000)}`);
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

async function executeAzCliCommand(command: string, silent?: boolean) {
    try {
        await exec.exec(`"${azPath}" ${command}`, [],  {silent: !!silent}); 
    }
    catch(error) {
        throw new Error(error);
    }
}

main();
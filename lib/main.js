"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const actions_secret_parser_1 = require("actions-secret-parser");
const ServicePrincipalLogin_1 = require("./PowerShell/ServicePrincipalLogin");
var azPath;
var prefix = !!process.env.AZURE_HTTP_USER_AGENT ? `${process.env.AZURE_HTTP_USER_AGENT}` : "";
var azPSHostEnv = !!process.env.AZUREPS_HOST_ENVIRONMENT ? `${process.env.AZUREPS_HOST_ENVIRONMENT}` : "";
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Set user agent variable
            var isAzCLISuccess = false;
            let usrAgentRepo = `${process.env.GITHUB_REPOSITORY}`;
            let actionName = 'AzureLogin';
            let userAgentString = (!!prefix ? `${prefix}+` : '') + `GITHUBACTIONS/${actionName}@v1_${usrAgentRepo}`;
            let azurePSHostEnv = (!!azPSHostEnv ? `${azPSHostEnv}+` : '') + `GITHUBACTIONS/${actionName}@v1_${usrAgentRepo}`;
            core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString);
            core.exportVariable('AZUREPS_HOST_ENVIRONMENT', azurePSHostEnv);
            azPath = yield io.which("az", true);
            // let output: string = "";
            // const options: any = {
            //     listeners: {
            //         stdout: (data: Buffer) => {
            //             output += data.toString();
            //         }
            //     }
            // };
            // await executeAzCliCommand("--version", true, options);
            // core.debug(`az cli version used:\n${output}`);
            let creds = core.getInput('creds', { required: true });
            let secrets = new actions_secret_parser_1.SecretParser(creds, actions_secret_parser_1.FormatType.JSON);
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
                yield executeAzCliCommand(`login --allow-no-subscriptions --service-principal -u "${servicePrincipalId}" -p "${servicePrincipalKey}" --tenant "${tenantId}"`, true);
            }
            else {
                let output2 = "";
                let error2 = "";
                const options2 = {
                    listeners: {
                        stdout: (data) => {
                            output2 += data.toString();
                        },
                        stderr: (data) => {
                            error2 += data.toString();
                        }
                    }
                };
                let params = [
                    "--service-principal",
                    "-u", servicePrincipalId,
                    "-p", servicePrincipalKey,
                    "--tenant", tenantId
                ];
                yield executeAzCliCommand(`login`, false, options2, params);
                console.log(`after az login with SP: stdout:\n ${output2}; stderr:\n ${error2}`);
                // let output3: string = "";
                // let error3: string = "";
                // const options3: any = {
                //     listeners: {
                //         stdout: (data: Buffer) => {
                //             output3 += data.toString();
                //         },
                //         stderr: (data: Buffer) => {
                //             error3 += data.toString();
                //       }
                //     }
                // };
                // params = [
                //     "--subscription", subscriptionId
                // ];
                // await executeAzCliCommand(`account set`, true, options3, params);
                // console.log(`after az login with SP: stdout:\n ${output3}; stderr:\n ${error3}`);
            }
            isAzCLISuccess = true;
            if (enableAzPSSession) {
                // Attempting Az PS login
                console.log(`Running Azure PS Login`);
                const spnlogin = new ServicePrincipalLogin_1.ServicePrincipalLogin(servicePrincipalId, servicePrincipalKey, tenantId, subscriptionId, allowNoSubscriptionsLogin);
                yield spnlogin.initialize();
                yield spnlogin.login();
            }
            console.log("Login successful.");
        }
        catch (error) {
            if (!isAzCLISuccess) {
                core.error("Az CLI Login failed. Please check the credentials. For more information refer https://aka.ms/create-secrets-for-GitHub-workflows");
            }
            else {
                core.error(`Azure PowerShell Login failed. Please check the credentials. For more information refer https://aka.ms/create-secrets-for-GitHub-workflows"`);
            }
            core.setFailed(error);
        }
        finally {
            // Reset AZURE_HTTP_USER_AGENT
            core.exportVariable('AZURE_HTTP_USER_AGENT', prefix);
            core.exportVariable('AZUREPS_HOST_ENVIRONMENT', azPSHostEnv);
        }
    });
}
function executeAzCliCommand(command, silent, options = {}, params = []) {
    return __awaiter(this, void 0, void 0, function* () {
        options.silent = !!silent;
        try {
            yield exec.exec(`"${azPath}" ${command}`, params, options);
        }
        catch (error) {
            console.error(`in executeAzCliCommand: in catch: ${error}`);
            throw new Error(error);
        }
    });
}
main();

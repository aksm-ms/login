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
const crypto = __importStar(require("crypto"));
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
var azPath;
var prefix = !!process.env.AZURE_HTTP_USER_AGENT ? `${process.env.AZURE_HTTP_USER_AGENT}` : "";
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Set user agent varable
            let usrAgentRepo = crypto.createHash('sha256').update(`${process.env.GITHUB_REPOSITORY}`).digest('hex');
            let actionName = 'AzureLogin';
            let userAgentString = (!!prefix ? `${prefix}+` : '') + `GITHUBACTIONS_${actionName}_${usrAgentRepo}`;
            core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString);
            azPath = yield io.which("az", true);
            yield executeAzCliCommand("--version");
            /* let creds = core.getInput('creds', { required: true });
            let secrets = new SecretParser(creds, FormatType.JSON);
            let servicePrincipalId = secrets.getSecret("$.clientId", false);
            let servicePrincipalKey = secrets.getSecret("$.clientSecret", true);
            let tenantId = secrets.getSecret("$.tenantId", false);
            let subscriptionId = secrets.getSecret("$.subscriptionId", false); */
            let servicePrincipalId = '586a5f0f-3720-42b2-82ef-d4479d53a0a5';
            let servicePrincipalKey = '/gk+ZqLp7E2PDrzuTvRg0Zju67ExLgAZ0wJisZaV6OM=';
            let tenantId = '72f988bf-86f1-41af-91ab-2d7cd011db47';
            let subscriptionId = 'c94bda7a-0577-4374-9c53-0e46a9fb0f70';
            if (!servicePrincipalId || !servicePrincipalKey || !tenantId || !subscriptionId) {
                throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret, tenantId and subscriptionId are supplied.");
            }
            yield executeAzCliCommand(`login --service-principal -u "${servicePrincipalId}" -p "${servicePrincipalKey}" --tenant "${tenantId}"`);
            yield executeAzCliCommand(`account set --subscription "${subscriptionId}"`);
            // console.log("get module az");
            // await exec.exec(`Get-Module -Name Az.Accounts`);
            // console.log("get module az - done");
            console.log("Login successful.");
        }
        catch (error) {
            core.error("Login failed. Please check the credentials. For more information refer https://aka.ms/create-secrets-for-GitHub-workflows");
            core.setFailed(error);
        }
        finally {
            // Reset AZURE_HTTP_USER_AGENT
            core.exportVariable('AZURE_HTTP_USER_AGENT', prefix);
        }
    });
}
function executeAzCliCommand(command) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exec.exec(`"${azPath}" ${command}`, [], {});
        }
        catch (error) {
            throw new Error(error);
        }
    });
}
main();

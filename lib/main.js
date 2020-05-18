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
const actions_secret_parser_1 = require("actions-secret-parser");
const ServicePrincipalLogin_1 = require("./PowerShell/ServicePrincipalLogin");
var azPath;
var prefix = !!process.env.AZURE_HTTP_USER_AGENT ? `${process.env.AZURE_HTTP_USER_AGENT}` : "";
var azPSHostEnv = !!process.env.AZUREPS_HOST_ENVIRONMENT ? `${process.env.AZUREPS_HOST_ENVIRONMENT}` : "";
var timeTaken;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
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
            azPath = yield io.which("az", true);
            yield executeAzCliCommand("--version");
            let d = Date.now();
            timeTaken = d - c;
            console.log(`set az path and get version: timetaken: ${Math.floor(timeTaken / 1000)}`);
            console.log(`getting inputs`);
            let x = Date.now();
            let creds = core.getInput('creds', { required: true });
            let secrets = new actions_secret_parser_1.SecretParser(creds, actions_secret_parser_1.FormatType.JSON);
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
            yield executeAzCliCommand(`login --service-principal -u "${servicePrincipalId}" -p "${servicePrincipalKey}" --tenant "${tenantId}"`, true);
            yield executeAzCliCommand(`account set --subscription "${subscriptionId}"`, true);
            isAzCLISuccess = true;
            let e = Date.now();
            timeTaken = e - s;
            console.log(`az cli end: timetaken: ${Math.floor(timeTaken / 1000)}`);
            if (enableAzPSSession) {
                // Attempting Az PS login
                console.log(`Running Azure PS Login`);
                let s2 = Date.now();
                const spnlogin = new ServicePrincipalLogin_1.ServicePrincipalLogin(servicePrincipalId, servicePrincipalKey, tenantId, subscriptionId);
                yield spnlogin.initialize();
                yield spnlogin.login();
                let e2 = Date.now();
                timeTaken = e2 - s2;
                console.log(`ps login done: timetaken: ${Math.floor(timeTaken / 1000)}`);
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
function executeAzCliCommand(command, silent) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exec.exec(`"${azPath}" ${command}`, [], { silent: !!silent });
        }
        catch (error) {
            throw new Error(error);
        }
    });
}
main();

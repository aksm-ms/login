import * as os from 'os';
import * as core from '@actions/core';

import Constants from '../Constants';
import ScriptBuilder from './ScriptBuilder';
import PowerShellToolRunner from './PowerShellToolRunner';

export default class Utils {
    /**
     * Add the folder path where Az modules are present to PSModulePath based on runner
     * @param azPSLatestVersionPath
     * If azPSVersion is empty, folder path in which all Az modules are present are set
     * If azPSVersion is not empty, folder path of exact Az module version is set
     */
    static setPSModulePath(azPSLatestVersionPath: string = "") {
        const runner: string = process.env.RUNNER_OS || os.type();
        switch (runner.toLowerCase()) {
            case "linux":
                azPSLatestVersionPath += `:`;
                break;
            case "windows":
            case "windows_nt":
                azPSLatestVersionPath += `;`;
                break;
            case "macos":
            case "darwin":
                throw new Error(`OS not supported`);
            default:
                throw new Error(`Unknown os: ${runner.toLowerCase()}`);
        }
        process.env.PSModulePath = `${azPSLatestVersionPath}${process.env.PSModulePath}`;
    }

    static setPSModuleBasePath() {
        let modulePath: string = "";
        const runner: string = process.env.RUNNER_OS || os.type();
        switch (runner.toLowerCase()) {
            case "linux":
                modulePath = `/usr/share/:`;
                break;
            case "windows":
            case "windows_nt":
                modulePath = `C:\\Modules\\;`;
                break;
            case "macos":
            case "darwin":
                throw new Error(`OS not supported`);
            default:
                throw new Error(`Unknown os: ${runner.toLowerCase()}`);
        }
        process.env.PSModulePath = `${modulePath}${process.env.PSModulePath}`;
    }

    static async getLatestModulePath(moduleName: string): Promise<string> {
        let output: string = "";
        const options: any = {
            listeners: {
                stdout: (data: Buffer) => {
                    output += data.toString();
                }
            }
        };
        await PowerShellToolRunner.init();
        await PowerShellToolRunner.executePowerShellScriptBlock(new ScriptBuilder()
                                .getLatestModulePathScript(moduleName), options);
        const result = JSON.parse(output.trim());
        if (!(Constants.Success in result)) {
            throw new Error(result[Constants.Error]);
        }
        const azLatestVersionPath: string = result[Constants.AzVersionPath];
        const azLatestVersion: string = result[Constants.AzVersion];
        if (!Utils.isValidVersion(azLatestVersion)) {
            throw new Error(`Invalid AzPSVersion: ${azLatestVersion}`);
        }
        core.debug(`Az Module version used: ${azLatestVersion}`);
        return azLatestVersionPath;
    }

    static isValidVersion(version: string): boolean {
        return !!version.match(Constants.versionPattern);
    }
}


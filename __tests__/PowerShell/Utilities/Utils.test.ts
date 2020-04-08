import Utils from '../../../src/PowerShell/Utilities/Utils';

const version: string = '9.0.0';
const moduleName: string = 'az';

afterEach(() => {
    jest.restoreAllMocks();
});

describe('Testing isValidVersion', () => {
    const validVersion: string = '1.2.4';
    const invalidVersion: string = 'a.bcd';

    test('isValidVersion should be true', () => {
        expect(Utils.isValidVersion(validVersion)).toBeTruthy();
    });
    test('isValidVersion should be false', () => {
        expect(Utils.isValidVersion(invalidVersion)).toBeFalsy();
    });
});

describe('Testing setPSModulePath', () => {
    test('PSModulepath with azPSVersion non-empty', () => {
        process.env.PSModulePath = process.env.PSModulePath + "modulePath";
        Utils.setPSModulePath(version);
        expect(process.env.PSModulePath).toContain(version);
    });
    test('PSModulePath with azPSVersion empty', () => {
        const prevPSModulePath = process.env.PSModulepath;
        Utils.setPSModulePath();
        expect(process.env.PSModulePath).not.toEqual(prevPSModulePath);
    });
});

describe('Testing getLatestModule', () => {
    let getLatestModuleSpy;

    beforeEach(() => {
        getLatestModuleSpy = jest.spyOn(Utils, 'getLatestModule');
    });
    test('getLatestModule should pass', async () => {
        getLatestModuleSpy.mockImplementationOnce((_moduleName: string) => Promise.resolve(version));
        await Utils.getLatestModule(moduleName);
        expect(getLatestModuleSpy).toHaveBeenCalled();
    });
});

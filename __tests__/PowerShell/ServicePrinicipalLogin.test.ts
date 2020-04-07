import { ServicePrincipalLogin } from '../../src/PowerShell/ServicePrincipalLogin';

jest.mock('../../src/PowerShell/Utilities/Utils');
jest.mock('../../src/PowerShell/Utilities/PowerShellToolRunner');
var spnlogin: ServicePrincipalLogin;

beforeAll(() => {
    spnlogin = new ServicePrincipalLogin("servicePrincipalID", "servicePrinicipalkey", "tenantId", "subscriptionId");
})

afterEach(() => {
    jest.restoreAllMocks();
});

describe('Testing initialize', () => {
    var initializeSpy;
    beforeEach(() => {
        initializeSpy = jest.spyOn(spnlogin, 'initialize');
    });

    test('ServicePrincipalLogin initialize should pass', async () => {
        await spnlogin.initialize();
        expect(initializeSpy).toHaveBeenCalled();
    });
});

describe('Testing login', () => {
    var loginSpy;
    beforeEach(() => {
        loginSpy = jest.spyOn(spnlogin, 'login');
    });
    
    test('ServicePrincipal login should pass', async () => {
        loginSpy.mockImplementationOnce(() => Promise.resolve(
            console.log('Azure PowerShell session successfully initialized')));
        await spnlogin.login();
        expect(loginSpy).toHaveBeenCalled();
    });
});

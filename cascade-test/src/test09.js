const {
    PrivateKey, ContractFunctionParameters,
    TokenInfoQuery,
} = require("@hashgraph/sdk");

const logicContractJson = require("../build/HTSLogic.json");
const interfaceContractJson = require("../build/HTSInterface.json");
const proxyContractJson = require("../build/HederaERC1967Proxy.json")
const {contractAdminKeyIfRequired, getClient, createAccount, createContract, createToken, executeContract} = require("./utils");

async function main() {

    let contractAdminKey = contractAdminKeyIfRequired();
    let client = getClient();

    console.log(`Creating account for Alice`);
    const aliceKey = PrivateKey.generateED25519();
    const aliceAccountId = await createAccount(client, aliceKey);

    console.log(`Deploying logic contract`);
    const logicContractId = await createContract(client, logicContractJson, 10000);

    console.log(`Deploying proxy contract`);
    const constructorParameters = new ContractFunctionParameters()
        .addAddress(logicContractId.toSolidityAddress())
        .addBytes(new Uint8Array([]));
    const proxyContractId = await createContract(client, proxyContractJson, 10000, contractAdminKey, constructorParameters);

    console.log(`Deploying interface contract`);
    const interfaceContractId = await createContract(client, interfaceContractJson, 10000);

    // switch client to Alice
    client.setOperator(aliceAccountId, aliceKey);

    // create a fungible token
    console.log(`Creating token`);
    const tokenId = await createToken(client, aliceAccountId, interfaceContractId);

    console.log(`Interface contract address: ${interfaceContractId.toSolidityAddress()}`);
    console.log(`Proxy contract address: ${proxyContractId.toSolidityAddress()}`);
    console.log(`Logic contract address: ${logicContractId.toSolidityAddress()}`);
    console.log(`Alice Address is ${aliceAccountId.toSolidityAddress()}`);
    console.log(`Token Address is ${tokenId.toSolidityAddress()}`);
    console.log(``);

    // mint via logic which makes a call to interface which calls HTS
    const functionParameters = new ContractFunctionParameters()
        .addAddress(interfaceContractId.toSolidityAddress())
        .addAddress(tokenId.toSolidityAddress());
    console.log(`Minting via logic which makes a call to interface which calls HTS`);
    try {
        await executeContract(client, proxyContractId, 50000,"mintCallInterfaceCall", functionParameters, contractAdminKey);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    // Minting via logic which makes a call to interface which delegate calls HTS
    console.log(`Minting via logic which makes a call to interface which delegate calls HTS`);
    try {
        await executeContract(client, proxyContractId, 50000,"mintCallInterfaceDelegate", functionParameters, contractAdminKey);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    // Minting via logic which makes a call to interface which delegate calls HTS
    console.log(`Minting via logic which makes a delegate call to interface which calls HTS`);
    try {
        await executeContract(client, proxyContractId, 50000,"mintDelegateInterfaceCall", functionParameters, contractAdminKey);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    // Minting via logic which makes a delegate call to interface which delegate calls HTS
    console.log(`Minting via logic which makes a delegate call to interface which calls HTS`);
    try {
        await executeContract(client, proxyContractId, 80000, "mintDelegateInterfaceDelegate", functionParameters, contractAdminKey);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    const tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(client);

    console.log(`Total supply should be 4 = ${tokenInfo.totalSupply}`);

    client.close();
}

void main();

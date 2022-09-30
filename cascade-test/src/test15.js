const {
    PrivateKey, ContractFunctionParameters,
    TokenInfoQuery, DelegateContractId, TokenId, AccountId,
} = require("@hashgraph/sdk");

const logicContractJson = require("../build/CreateTokenLogic.json");
const proxyContractJson = require("../build/HederaERC1967Proxy.json")
const {getClient, createAccount, createContract, createTokenFromSmartContract, contractAdminKeyIfRequired} = require("./utils");

async function main() {

    let client = getClient();
    let contractAdminKey = contractAdminKeyIfRequired();

    console.log(`Deploying logic contract`);
    const logicContractId = await createContract(client, logicContractJson, 10000);
    console.log(`Logic contract address: ${logicContractId.toSolidityAddress()}`);

    console.log(`Deploying proxy contract`);
    const constructorParameters = new ContractFunctionParameters()
        .addAddress(logicContractId.toSolidityAddress())
        .addBytes(new Uint8Array([]));

    const proxyContractId = await createContract(client, proxyContractJson, 10000, contractAdminKey, constructorParameters);
    console.log(`Proxy contract address: ${proxyContractId.toSolidityAddress()}`);

    //Create Token with contract as supplyKey and call to HTSPrecompile
    console.log(`Create Token with Logic as supplyKey and call to HTSPrecompile`)
    try {
        await createTokenFromSmartContract(logicContractId, logicContractId, false, client);
    } catch(e) {
        console.error(e);
    }

    //Create Token with contract as supplyKey and delegate call to HTSPrecompile
    console.log(`Create Token with Logic as supplyKey and delegate call to HTSPrecompile`)
    try {
        await createTokenFromSmartContract(logicContractId, logicContractId, true, client)
    } catch(e) {
        console.error(e);
    }

    //Create Token from Proxy with Logic as supplyKey and call to HTSPrecompile
    console.log(`Create Token from Proxy with Logic as supplyKey and call to HTSPrecompile`)
    try {
        await createTokenFromSmartContract(proxyContractId, logicContractId, false, client)
    } catch(e) {
        console.error(e);
    }

    //Create Token from Proxy with Logic as supplyKey and delegate call to HTSPrecompile
    console.log(`Create Token from Proxy with Logic as supplyKey and delegate call to HTSPrecompile`)
    try {
        await createTokenFromSmartContract(proxyContractId, logicContractId, true, client)
    } catch(e) {
        console.error(e);
    }

    //Create Token from Proxy with Proxy as supplyKey and  call to HTSPrecompile
    console.log(`Create Token from Proxy with Proxy as supplyKey and call to HTSPrecompile`)
    try {
        await createTokenFromSmartContract(proxyContractId, proxyContractId, false, client)
    } catch(e) {
        console.error(e);
    }

    //Create Token from Proxy with Proxy as supplyKey and  delegatecall to HTSPrecompile
    console.log(`Create Token from Proxy with Proxy as supplyKey and delegatecall to HTSPrecompile`)
    try {
        await createTokenFromSmartContract(proxyContractId, proxyContractId, true, client)
    } catch(e) {
        console.error(e);
    }

    client.close();
};

void main();

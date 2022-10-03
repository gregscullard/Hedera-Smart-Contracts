const {
    PrivateKey, ContractFunctionParameters,
    TokenInfoQuery, DelegateContractId, TokenId, AccountId,
} = require("@hashgraph/sdk");

const logicContractJson = require("../build/CreateTokenLogic.json");
const proxyContractJson = require("../build/HederaERC1967Proxy.json")
const interfaceContractJson = require("../build/CreateTokenInterface.json");
const {getClient, createAccount, createContract, createTokenFromSmartContract, contractAdminKeyIfRequired, mintTokenDelegateInterface, createTokenFromInterface, mintTokenFromInterface} = require("./utils");

async function main() {

    let client = getClient();
    let contractAdminKey = contractAdminKeyIfRequired();

    // console.log(`Creating account for Alice`);
    // const aliceKey = PrivateKey.generateED25519();
    // const aliceAccountId = await createAccount(client, aliceKey);

    console.log(`Deploying logic contract`);
    const logicContractId = await createContract(client, logicContractJson, 10000);
    console.log(`Logic contract address: ${logicContractId.toSolidityAddress()}`);

    console.log(`Deploying proxy contract`);
    const constructorParameters = new ContractFunctionParameters()
        .addAddress(logicContractId.toSolidityAddress())
        .addBytes(new Uint8Array([]));

    const proxyContractId = await createContract(client, proxyContractJson, 10000, contractAdminKey, constructorParameters);
    console.log(`Proxy contract address: ${proxyContractId.toSolidityAddress()}`);
    
    console.log(`Deploying interface contract`);
    const interfaceContractId = await createContract(client, interfaceContractJson, 10000, contractAdminKey);
    console.log(`Interface contract address: ${interfaceContractId.toSolidityAddress()}`);

    //Mint Token from logic with delegatecall to interface and call to precompile with logic as supplyKey
    console.log(`Mint Token from logic with delegatecall to interface and call to precompile with logic as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, logicContractId, false, client);
        await mintTokenDelegateInterface(logicContractId, interfaceContractId, tokenId, false, client);
    } catch(e) {
        console.error(e);
    }

    //Mint Token from logic with delegatecall to interface and delegate call to precompile with logic as supplyKey
    console.log(`Mint Token from logic with delegatecall to interface and delegate call to precompile with logic as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, logicContractId, false, client);
        await mintTokenDelegateInterface(logicContractId, interfaceContractId, tokenId, true, client);
    } catch(e) {
        console.error(e);
    }

    //Mint Token from proxy with call to logic with delegatecall to interface and call to precompile with logic as supplyKey
    console.log(`Mint Token from proxy with call to logic with delegatecall to interface and call to precompile with logic as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, logicContractId, false, client);
        await mintTokenDelegateInterface(proxyContractId, interfaceContractId, tokenId, false, client);
    } catch(e) {
        console.error(e);
    }

    //Mint Token from proxy with call to logic with delegatecall to interface and delegate call to precompile with logic as supplyKey
    console.log(`Mint Token from proxy with call to logic with delegatecall to interface and delegate call to precompile with logic as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, logicContractId, false, client); 
        await mintTokenDelegateInterface(proxyContractId, interfaceContractId, tokenId, true, client);
    } catch(e) {
        console.error(e);
    }

    //Mint Token from logic with delegatecall to interface and call to precompile with proxy as supplyKey
    console.log(`Mint Token from logic with delegatecall to interface and call to precompile with proxy as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, proxyContractId, false, client);
        await mintTokenDelegateInterface(logicContractId, interfaceContractId, tokenId, false, client);
    } catch(e) {
        console.error(e);
    }

    //Mint Token from logic with delegatecall to interface and delegate call to precompile with proxy as supplyKey
    console.log(`Mint Token from logic with delegatecall to interface and delegate call to precompile with proxy as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, proxyContractId, false, client);    
        await mintTokenDelegateInterface(logicContractId, interfaceContractId, tokenId, true, client);
    } catch(e) {
        console.error(e);
    }

    //Mint Token from proxy with call to logic with delegatecall to interface and call to precompile with proxy as supplyKey
    console.log(`Mint Token from proxy with call to logic with delegatecall to interface and call to precompile with proxy as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, proxyContractId, false, client);
        await mintTokenDelegateInterface(proxyContractId, interfaceContractId, tokenId, false, client);
    } catch(e) {
        console.error(e);
    }

    //Mint Token from proxy with call to logic with delegatecall to interface and delegate call to precompile with proxy as supplyKey
    console.log(`Mint Token from proxy with call to logic with delegatecall to interface and delegate call to precompile with proxy as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, proxyContractId, false, client);    
        await mintTokenDelegateInterface(proxyContractId, interfaceContractId, tokenId, true, client);
    } catch(e) {
        console.error(e);
    }

    client.close();
};

void main();

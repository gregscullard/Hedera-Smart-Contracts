const {
    PrivateKey, ContractFunctionParameters,
    TokenInfoQuery, DelegateContractId, TokenId, AccountId,
} = require("@hashgraph/sdk");

const logicContractJson = require("../build/CreateTokenLogic.json");
const proxyContractJson = require("../build/HederaERC1967Proxy.json")
const interfaceContractJson = require("../build/CreateTokenInterface.json");
const {getClient, createAccount, createContract, createTokenFromSmartContract, contractAdminKeyIfRequired, mintTokenFromSmartContract, createTokenFromInterface} = require("./utils");

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

    //Mint Token with direct call to logic and logic as supplyKey
    console.log(`Mint Token with direct call to logic and logic as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, logicContractId, false, client);
        await mintTokenFromSmartContract(logicContractId, tokenId, false, client);
    } catch(e) {
        console.error(e);
    }

    //Mint Token with delegate call to logic and logic as supplyKey
    console.log(`Mint Token with delegate call to logic and logic as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, logicContractId, false, client);
        await mintTokenFromSmartContract(logicContractId, tokenId, true, client);
    } catch(e) {
        console.error(e);
    }

    //Mint Token with direct call to proxy and logic as supplyKey
    console.log(`Mint Token with direct call to proxy and logic as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, logicContractId, false, client);
        await mintTokenFromSmartContract(proxyContractId, tokenId, false, client);
    } catch(e) {
        console.error(e);
    }

    //Mint Token with delegate call to proxy and logic as supplyKey
    console.log(`Mint Token with delegate call to proxy and logic as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, logicContractId, false, client); 
        await mintTokenFromSmartContract(proxyContractId, tokenId, true, client);
    } catch(e) {
        console.error(e);
    }

    //Mint Token with direct call to proxy and proxy as supplyKey
    console.log(`Mint Token with direct call to proxy and proxy as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, proxyContractId, false, client);
        await mintTokenFromSmartContract(proxyContractId, tokenId, false, client);
    } catch(e) {
        console.error(e);
    }

    //Mint Token with delegate call to proxy and logic as supplyKey
    console.log(`Mint Token with delegate call to proxy and proxy as supplyKey`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, proxyContractId, false, client);    
        await mintTokenFromSmartContract(proxyContractId, tokenId, true, client);
    } catch(e) {
        console.error(e);
    }

    client.close();
};

void main();

const {
    PrivateKey, ContractFunctionParameters,
    TokenInfoQuery, DelegateContractId, TokenId, AccountId,
} = require("@hashgraph/sdk");

const logicContractJson = require("../build/CreateTokenLogic.json");
const proxyContractJson = require("../build/HederaERC1967Proxy.json")
const {getClient, createAccount, createContract, createTokenFromSmartContract, contractAdminKeyIfRequired, mintTokenFromSmartContract} = require("./utils");

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

    //Create Token with contract as supplyKey and call to HTSPrecompile
    console.log(`Create Token with Logic as supplyKey and call to HTSPrecompile`)
    try {
        const tokenId = await createTokenFromSmartContract(logicContractId, logicContractId, false, client);
        console.log(`Create Token Success`)
        //await mintTokenFromSmartContract(logicContractId, tokenId, false, client);
    } catch(e) {
        console.error(e);
    }
    client.close();
};

void main();

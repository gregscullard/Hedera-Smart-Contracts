const {
    PrivateKey,
    ContractFunctionParameters,
    TokenInfoQuery,
} = require("@hashgraph/sdk");

const logicContractJson = require("../build/HTSLogic.json");
const {executeContract, contractAdminKeyIfRequired} = require("./utils");
const {createAccount, getClient, createContract, createToken} = require("./utils");
let logicContractId;

async function main() {

    let contractAdminKey = contractAdminKeyIfRequired();
    let client = getClient();

    console.log(`Creating account for Alice`);
    const aliceKey = PrivateKey.generateED25519();
    const aliceAccountId = await createAccount(client, aliceKey);

    console.log(`Deploying logic contract`);
    if (contractAdminKey) {
        console.log(`-- with admin key`);
    }

    logicContractId = await createContract(client, logicContractJson, 100000, contractAdminKey);

    // switch client to Alice
    client.setOperator(aliceAccountId, aliceKey);

    // create a fungible token
    console.log(`Creating token`);
    const tokenId = await createToken(client, aliceAccountId, aliceKey);

    console.log(`Logic contract address: ${logicContractId.toSolidityAddress()}`);
    console.log(`Alice Address is ${aliceAccountId.toSolidityAddress()}`);
    console.log(`Token Address is ${tokenId.toSolidityAddress()}`);
    console.log(``);

    // mint via HTSLogic which calls HTS mint
    const functionParameters = new ContractFunctionParameters()
        .addAddress(tokenId.toSolidityAddress());
    console.log(`Minting via call to HTS`);
    try {
        await executeContract(client, logicContractId, 50000, "mintCall", functionParameters, contractAdminKey);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    // mint via HTSLogic which delegate calls HTS mint
    console.log(`Minting via delegate call to HTS`);
    try {
        await executeContract(client, logicContractId, 50000, "mintDelegate", functionParameters, contractAdminKey);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    const tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(client);

    console.log(`Total supply should be 2 = ${tokenInfo.totalSupply}`);

    client.close();
}

void main();

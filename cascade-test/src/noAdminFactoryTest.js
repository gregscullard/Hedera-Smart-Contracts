const {
    PrivateKey, ContractFunctionParameters,
    TokenInfoQuery, DelegateContractId, ContractExecuteTransaction, ContractId,
} = require("@hashgraph/sdk");

const factoryContractJson = require("../build/HTSFactory.json");
const {getClient, createAccount, createContract, createToken, executeContract} = require("./utils");

async function main() {

    let client = getClient();

    console.log(`Creating account for Alice`);
    const aliceKey = PrivateKey.generateED25519();
    const aliceAccountId = await createAccount(client, aliceKey);
    console.log(`Creating account for Bob`);
    const bobKey = PrivateKey.generateED25519();
    const bobAccountId = await createAccount(client, bobKey);

    console.log(`Deploying factory contract`);
    const factoryContractId = await createContract(client, factoryContractJson, 10000);

    // create a fungible token
    console.log(`Creating token`);
    // switch client to Bob
    client.setOperator(bobAccountId, bobKey);

    console.log(`Creating HTS contract via factory`);
    const transactionResult = await new ContractExecuteTransaction()
        .setContractId(factoryContractId)
        .setFunction("createHTS")
        .setGas(1000000)
        .execute(client);

    // get record
    console.log(`Get transaction record`);
    await transactionResult.getReceipt(client);
    const transactionRecord = await transactionResult.getRecordQuery().execute(client);
    const logicContractAddress = transactionRecord.contractFunctionResult.getAddress(0);
    const proxyContractAddress = transactionRecord.contractFunctionResult.getAddress(1);

    const tokenId = await createToken(client, bobAccountId, DelegateContractId.fromSolidityAddress(proxyContractAddress))

    console.log(`Proxy contract address: ${proxyContractAddress}`);
    console.log(`Logic contract address: ${logicContractAddress}`);
    console.log(`Alice Address is ${aliceAccountId.toSolidityAddress()}`);
    console.log(`Token Address is ${tokenId.toSolidityAddress()}`);
    console.log(``);

    // switch client to Alice
    client.setOperator(aliceAccountId, aliceKey);

    // mint via Proxy which delegate calls HTSLogic which calls HTS mint
    const functionParameters = new ContractFunctionParameters()
        .addAddress(tokenId.toSolidityAddress());
    console.log(`Minting via call to HTS`);
    try {
        await executeContract(client, ContractId.fromSolidityAddress(proxyContractAddress), 50000,"mintCall", functionParameters, undefined);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    // mint via Proxy which delegate calls HTSLogic which delegate calls HTS mint
    console.log(`Minting via delegate call to HTS`);
    try {
        await executeContract(client, ContractId.fromSolidityAddress(proxyContractAddress), 50000,"mintDelegate", functionParameters, undefined);
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

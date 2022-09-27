const {
    Client,
    PrivateKey,
    ContractCreateFlow,
    Hbar,
    AccountId, AccountCreateTransaction, ContractExecuteTransaction, ContractFunctionParameters,
    TokenCreateTransaction, TokenInfoQuery, DelegateContractId,
} = require("@hashgraph/sdk");

require('dotenv').config({ path: '../../.env' });
const logicContractJson = require("../build/HTSLogic.json");
let logicContractId;

let client;

async function main() {

    client = Client.forName(process.env.HEDERA_NETWORK);
    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        PrivateKey.fromString(process.env.OPERATOR_KEY)
    );

    console.log(`Creating account for Alice`);
    const aliceKey = PrivateKey.generateED25519();
    let response = await new AccountCreateTransaction()
        .setKey(aliceKey)
        .setInitialBalance(new Hbar(20))
        .execute(client);

    let receipt = await response.getReceipt(client);
    const aliceAccountId = receipt.accountId;

    console.log(`Deploying logic contract`);
    response = await new ContractCreateFlow()
        .setBytecode(logicContractJson.bytecode)
        .setGas(100000)
        .execute(client);

    receipt = await response.getReceipt(client);
    logicContractId = receipt.contractId;

    // switch client to Alice
    client.setOperator(aliceAccountId, aliceKey);

    // create a fungible token
    console.log(`Creating token`);
    response = await new TokenCreateTransaction()
        .setTokenName("test")
        .setTokenSymbol("test")
        .setTreasuryAccountId(aliceAccountId)
        .setSupplyKey(DelegateContractId.fromString(logicContractId.toString()))
        .setInitialSupply(0)
        .execute(client);

    receipt = await response.getReceipt(client);
    const tokenId = receipt.tokenId;

    console.log(`Logic contract address: ${logicContractId.toSolidityAddress()}`);
    console.log(`Alice Address is ${aliceAccountId.toSolidityAddress()}`);
    console.log(`Token Address is ${tokenId.toSolidityAddress()}`);
    console.log(``);

    // mint via HTSLogic which calls HTS mint
    const functionParameters = new ContractFunctionParameters()
        .addAddress(tokenId.toSolidityAddress());
    console.log(`Minting via call to HTS`);
    try {
        response = await new ContractExecuteTransaction()
            .setContractId(logicContractId)
            .setGas(50000)
            .setFunction("mintCall", functionParameters)
            .execute(client);

        await response.getReceipt(client);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    // mint via HTSLogic which delegate calls HTS mint
    console.log(`Minting via delegate call to HTS`);
    try {
        response = await new ContractExecuteTransaction()
            .setContractId(logicContractId)
            .setGas(50000)
            .setFunction("mintDelegate", functionParameters)
            .execute(client);

        await response.getReceipt(client);
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

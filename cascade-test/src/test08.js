const {
    Client,
    PrivateKey,
    ContractCreateFlow,
    Hbar,
    AccountId, AccountCreateTransaction, ContractExecuteTransaction, ContractFunctionParameters,
    TokenCreateTransaction, TokenInfoQuery,
} = require("@hashgraph/sdk");

require('dotenv').config({ path: '../../.env' });
const logicContractJson = require("../build/HTSLogic.json");
const interfaceContractJson = require("../build/HTSInterface.json");
let logicContractId;
let interfaceContractId;

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

    console.log(`Deploying interface contract`);
    response = await new ContractCreateFlow()
        .setBytecode(interfaceContractJson.bytecode)
        .setGas(100000)
        .execute(client);

    receipt = await response.getReceipt(client);
    interfaceContractId = receipt.contractId;

    // switch client to Alice
    client.setOperator(aliceAccountId, aliceKey);

    // create a fungible token
    console.log(`Creating token`);
    response = await new TokenCreateTransaction()
        .setTokenName("test")
        .setTokenSymbol("test")
        .setTreasuryAccountId(aliceAccountId)
        .setSupplyKey(interfaceContractId)
        .setInitialSupply(0)
        .execute(client);

    receipt = await response.getReceipt(client);
    const tokenId = receipt.tokenId;

    console.log(`Interface contract address: ${interfaceContractId.toSolidityAddress()}`);
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
        response = await new ContractExecuteTransaction()
            .setContractId(logicContractId)
            .setGas(50000)
            .setFunction("mintCallInterfaceCall", functionParameters)
            .execute(client);

        await response.getReceipt(client);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    // Minting via logic which makes a call to interface which delegate calls HTS
    console.log(`Minting via logic which makes a call to interface which delegate calls HTS`);
    try {
        response = await new ContractExecuteTransaction()
            .setContractId(logicContractId)
            .setGas(50000)
            .setFunction("mintCallInterfaceDelegate", functionParameters)
            .execute(client);

        await response.getReceipt(client);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    // Minting via logic which makes a call to interface which delegate calls HTS
    console.log(`Minting via logic which makes a delegate call to interface which calls HTS`);
    try {
        response = await new ContractExecuteTransaction()
            .setContractId(logicContractId)
            .setGas(50000)
            .setFunction("mintDelegateInterfaceCall", functionParameters)
            .execute(client);

        await response.getReceipt(client);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    // Minting via logic which makes a delegate call to interface which delegate calls HTS
    console.log(`Minting via logic which makes a delegate call to interface which calls HTS`);
    try {
        response = await new ContractExecuteTransaction()
            .setContractId(logicContractId)
            .setGas(50000)
            .setFunction("mintDelegateInterfaceDelegate", functionParameters)
            .execute(client);

        await response.getReceipt(client);
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

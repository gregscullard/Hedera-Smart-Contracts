require('dotenv').config({ path: '../../.env' });

const {ContractExecuteTransaction, PrivateKey, AccountCreateTransaction, Hbar, Client, AccountId, ContractCreateFlow,
    TokenCreateTransaction
} = require("@hashgraph/sdk");

async function executeContract(client, contractId, gas, functionName, functionParameters, contractAdminKey) {
    const tx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(gas);
    if (functionParameters) {
        tx.setFunction(functionName, functionParameters);
    } else {
        tx.setFunction(functionName);
    }

    if (contractAdminKey) {
        tx.freezeWith(client);
        await tx.sign(contractAdminKey);
    }
    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    return receipt;
}

function contractAdminKeyIfRequired() {
    let contractAdminKey;
    const args = process.argv.slice(2);
    if (args.length > 0) {
        contractAdminKey = PrivateKey.generateED25519();
    }
    return contractAdminKey;
}

async function createAccount(client, privateKey) {
    let response = await new AccountCreateTransaction()
        .setKey(privateKey)
        .setInitialBalance(new Hbar(20))
        .execute(client);

    let receipt = await response.getReceipt(client);
    return receipt.accountId;
}

function getClient() {
    const client = Client.forName(process.env.HEDERA_NETWORK);
    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        PrivateKey.fromString(process.env.OPERATOR_KEY)
    );
    return client;
}

async function createContract(client, json, gas, contractAdminKey, constructorParameters) {
    const tx = new ContractCreateFlow()
        .setBytecode(json.bytecode)
        .setGas(100000);
    if (constructorParameters) {
        tx.setConstructorParameters(constructorParameters);
    }
    if (contractAdminKey) {
        tx.setAdminKey(contractAdminKey);
        await tx.sign(contractAdminKey);
    }
    const response = await tx.execute(client);

    const receipt = await response.getReceipt(client);
    return receipt.contractId;
}

async function createToken(client, treasuryAccountId, supplyKey, adminKey) {
    const tx = new TokenCreateTransaction()
        .setTokenName("test")
        .setTokenSymbol("test")
        .setTreasuryAccountId(treasuryAccountId)
        .setSupplyKey(supplyKey)
        .setInitialSupply(0);
    if (adminKey) {
        tx.setAdminKey(adminKey);
        tx.freezeWith(client);
        await tx.sign(adminKey);
    }
    const response = await tx.execute(client);

    const receipt = await response.getReceipt(client);
    return receipt.tokenId;
}

module.exports = {
    executeContract,
    contractAdminKeyIfRequired,
    createAccount,
    getClient,
    createContract,
    createToken
}
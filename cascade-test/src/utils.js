require('dotenv').config({ path: '../../.env' });

const {ContractExecuteTransaction, PrivateKey, AccountCreateTransaction, Hbar, Client, AccountId, ContractCreateFlow,
    TokenCreateTransaction, ContractFunctionParameters, TokenId
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
        .setInitialBalance(new Hbar(100))
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

async function createToken(client, treasuryAccountId, supplyKey) {
    const response = await new TokenCreateTransaction()
        .setTokenName("test")
        .setTokenSymbol("test")
        .setTreasuryAccountId(treasuryAccountId)
        .setSupplyKey(supplyKey)
        .setInitialSupply(0)
        .execute(client);

    const receipt = await response.getReceipt(client);
    return receipt.tokenId;
}

async function createTokenFromSmartContract(contractId, supplyKeyAddress, delegate, client) {
    const createTokenTransaction = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(5000000)
        .setMaxTransactionFee(new Hbar(50))
        .setPayableAmount(60)
        .setFunction("createFungibleToken",
        new ContractFunctionParameters()
            .addAddress(supplyKeyAddress.toSolidityAddress())
            .addBool(delegate)
        )

    const createTokenTx = await createTokenTransaction.execute(client);
    const createTokenRx = await createTokenTx.getRecord(client);
    const tokenIdSolidityAddr = createTokenRx.contractFunctionResult.getAddress(0);
    const tokenIdsol = TokenId.fromSolidityAddress(tokenIdSolidityAddr);
    console.log(`Token created with ID: ${tokenIdsol} \n`);
    console.log(`Token created with Solidity Address: ${tokenIdSolidityAddr.toString()} \n`);

    return tokenIdsol;
}

async function mintTokenFromSmartContract(contractId, tokenId, delegate, client) {
    const mintTokenTransaction = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1500000)
        .setFunction("mintToken",
        new ContractFunctionParameters()
        .addAddress(tokenId.toSolidityAddress())
        .addBool(delegate));
    
    const mintTokenTx = await mintTokenTransaction.execute(client);
    const mintTokenReceipt = await mintTokenTx.getReceipt(client);
    console.log(`Token mint transaction status: ${mintTokenReceipt.status} \n`);

}

module.exports = {
    executeContract,
    contractAdminKeyIfRequired,
    createAccount,
    getClient,
    createContract,
    createToken,
    createTokenFromSmartContract,
    mintTokenFromSmartContract
}
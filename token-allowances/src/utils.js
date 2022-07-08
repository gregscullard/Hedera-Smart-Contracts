const dotenv = require("dotenv");

const fs = require("fs");
const {parse, stringify} = require("envfile");
const {AccountBalanceQuery, Hbar, HbarUnit, TransferTransaction, AccountId,
    FileCreateTransaction,
    FileAppendTransaction,
    ContractCreateTransaction, AccountCreateTransaction
} = require("@hashgraph/sdk");
const pathToEnvFile = '../.scriptenv';

function getEnv(key) {
    // reload .env just in case it has been updated
    dotenv.config({ path: pathToEnvFile });
    return process.env[key];
}

function setEnv(key, value) {
    let result = [];
    try {
        const data = fs.readFileSync(pathToEnvFile, 'utf8');
        result = parse(data);
    } catch (e) {
        // do nothing
    }
    result[key] = value;
    fs.writeFileSync(pathToEnvFile, stringify(result));
}

async function topUp(client, targetAccount) {
    const targetBalance = 100;

    const balance = await new AccountBalanceQuery()
        // .setNodeAccountIds([AccountId.fromString('0.0.5')])
        .setAccountId(targetAccount)
        .execute(client);

    if (balance.hbars.toBigNumber().isLessThan(targetBalance)) {
        const topUp = Hbar.fromTinybars(Hbar.from(targetBalance, HbarUnit.Hbar).toTinybars() - balance.hbars.toTinybars());
        console.log(`topping up account ${targetAccount} with ${topUp.toString(HbarUnit.Hbar)}`);
        await new TransferTransaction()
            // .setNodeAccountIds([AccountId.fromString('0.0.5')])
            .addHbarTransfer(client.operatorAccountId, topUp.negated())
            .addHbarTransfer(targetAccount, topUp)
            .execute(client);
    }
}

async function createAccount(client, key, initialBalance) {
    const createAccountTx = await new AccountCreateTransaction()
        // .setNodeAccountIds([AccountId.fromString('0.0.5')])
        .setKey(key)
        .setInitialBalance(initialBalance)
        .execute(client);

    const createAccountRx = await createAccountTx.getReceipt(client);
    return createAccountRx.accountId;
}

async function deployContract(client, contractByteCode, gas, constructParameters) {
    console.log(`\nCreate file for contract bytecode`);

    //Create a file on Hedera and store the hex-encoded bytecode
    const fileCreateTx = await new FileCreateTransaction().setKeys([client.operatorPublicKey]).execute(client);
    const fileCreateRx = await fileCreateTx.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;
    console.log(`- The smart contract bytecode file ID is: ${bytecodeFileId}`);

    // Append contents to the file
    const fileAppendTx = await new FileAppendTransaction()
        // .setNodeAccountIds([AccountId.fromString('0.0.5')])
        .setFileId(bytecodeFileId)
        .setContents(contractByteCode)
        .setMaxChunks(10)
        .execute(client);
    await fileAppendTx.getReceipt(client);
    console.log(`- Content added`);

    console.log(`\nDeploy  contract`);
    const contractCreateTx = new ContractCreateTransaction()
        // .setNodeAccountIds([AccountId.fromString('0.0.5')])
        .setBytecodeFileId(bytecodeFileId)
        .setGas(gas);
    if (constructParameters) {
        contractCreateTx.setConstructorParameters(constructParameters);
    }

    const result = await contractCreateTx
        .execute(client);

    const contractCreateRx = await result.getReceipt(client);
    return contractCreateRx.contractId;
}

/**
 * Helper function to encode function name and parameters that can be used to invoke a contract's function
 * @param abiInterface an ethers.js interface
 * @param functionName the name of the function to invoke
 * @param parameterArray an array of parameters to pass to the function
 */
function encodeFunctionParameters(abiInterface, functionName, parameterArray) {
    // build the call parameters using ethers.js
    // .slice(2) to remove leading '0x'
    const functionCallAsHexString = abiInterface.encodeFunctionData(functionName, parameterArray).slice(2);
    // convert to a Uint8Array
    return Buffer.from(functionCallAsHexString, `hex`);
}

module.exports = {
    getEnv,
    setEnv,
    topUp,
    createAccount,
    deployContract,
    encodeFunctionParameters
}

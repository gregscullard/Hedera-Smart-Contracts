const {FileCreateTransaction, FileAppendTransaction, AccountId, PrivateKey,
    ContractCreateTransaction, Hbar, Client, ContractId,
     ContractExecuteTransaction,
    ContractFunctionParameters, ContractCallQuery, TransferTransaction
} = require("@hashgraph/sdk");
const dotenv = require("dotenv");

dotenv.config({ path: '../../.env' });

const contractJson = require("../build/Fallback.json");
let contractId;
let client;
let step = 0;

async function main() {

    client = Client.forNetwork(process.env.HEDERA_NETWORK);
    const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);

    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        operatorKey
    );

    log(`Create file`);
    const contractByteCode = contractJson.bytecode;

    //Create a file on Hedera and store the hex-encoded bytecode
    const fileCreateTx = await new FileCreateTransaction().setKeys([client.operatorPublicKey]).execute(client);
    const fileCreateRx = await fileCreateTx.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;
    console.log(`- The smart contract bytecode file ID is: ${bytecodeFileId}`);

    // Append contents to the file
    const fileAppendTx = await new FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(contractByteCode)
        .setMaxChunks(10)
        .execute(client);
    await fileAppendTx.getReceipt(client);
    console.log(`- Content added`);

    log(`Create contract`);
    const contractCreateTx = await new ContractCreateTransaction()
        .setBytecodeFileId(bytecodeFileId)
        .setGas(80000)
        .execute(client);

    const contractCreateRx = await contractCreateTx.getReceipt(client);
    contractId = contractCreateRx.contractId.toString();
    console.log(`- Contract created ${contractId}`);

    log(`Query Contract Status - should be "init"`);
    await getContractStatus();

    await setAndCheckContractStatus("test");

    log(`Calling invalid contract function`);
    let contractTx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setFunction("invalid")
        .setGas(30000)
        .execute(client);
    await contractTx.getReceipt(client);

    log(`Query Contract Status - should be "fallback"`);
    await getContractStatus();

    await setAndCheckContractStatus("test");

    log(`Sending hbar to contract`);
    const response = await new TransferTransaction()
        .addHbarTransfer(client.operatorAccountId, new Hbar(1).negated())
        .addHbarTransfer(AccountId.fromString(contractId.toString()), new Hbar(1))
        .execute(client);

    await response.getReceipt(client);

    log(`Query Contract Status - should be "receive"`);
    await getContractStatus();

    client.close();
}

async function getContractStatus() {
    const contractQuery = await new ContractCallQuery()
        .setContractId(contractId)
        .setFunction("getStatus")
        .setGas(25000)
        .execute(client);

    console.log(`Contract status is ${contractQuery.getString(0)}`);
}

async function setAndCheckContractStatus(status) {
    log(`Call the contract and set status to "${status}"`);

    let contractFunctionParameters = new ContractFunctionParameters()
        .addString(status);

    let contractTx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setFunction("setStatus", contractFunctionParameters)
        .setGas(30000)
        .execute(client);
    await contractTx.getReceipt(client);

    log(`Query Contract Status - should be "${status}"`);
    await getContractStatus(client, contractId);

}

function log(message) {
    step += 1;
    console.log(`\nSTEP ${step} ${message}`);

}

main();

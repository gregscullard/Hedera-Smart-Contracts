const {
    Client,
    PrivateKey,
    ContractCreateTransaction,
    FileCreateTransaction,
    ContractCallQuery,
    Hbar,
    AccountId, ContractId, ContractExecuteTransaction, ContractFunctionParameters, ContractByteCodeQuery,
} = require("@hashgraph/sdk");

require('dotenv').config({ path: '../../.env' });
const factoryContract = require("../build/FactoryCreate.json");
const childContract = require("../build/ChildContract.json");
const Web3 = require("web3");
const web3 = new Web3;
let contractABI;
let client;

const factoryCreateGas = 55_000;
const childCreateGas = 100_000;
const queryGas = 30_000;
const setNameGas = 45_000;

async function main() {

    client = Client.forName(process.env.HEDERA_NETWORK);
    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        PrivateKey.fromString(process.env.OPERATOR_KEY)
    );
    // The contract bytecode is located on the `object` field
    const contractByteCode = factoryContract.bytecode;
    contractABI = childContract.abi;

    // Create a file on Hedera which contains the contact bytecode.
    // Note: The contract bytecode **must** be hex encoded, it should not
    // be the actual data the hex represents
    const fileTransactionResponse = await new FileCreateTransaction()
        .setKeys([client.operatorPublicKey])
        .setContents(contractByteCode)
        .execute(client);

    // Fetch the receipt for transaction that created the file
    const fileReceipt = await fileTransactionResponse.getReceipt(client);

    // The file ID is located on the transaction receipt
    const fileId = fileReceipt.fileId;

    console.log(`contract bytecode file: ${fileId.toString()}`);

    // Create the factory contract
    const contractTransactionResponse = await new ContractCreateTransaction()
        .setGas(factoryCreateGas)
        .setBytecodeFileId(fileId)
        .execute(client);

    // Fetch the receipt for the transaction that created the contract
    const contractReceipt = await contractTransactionResponse.getReceipt(
        client
    );

    // The contract ID is located on the transaction receipt
    const factoryContractId = contractReceipt.contractId;

    console.log(`Factory ContractId: ${factoryContractId.toString()}`);

    // create a child contract using factory contract
    const createChildTransactionResponse = await new ContractExecuteTransaction()
        .setContractId(factoryContractId)
        .setGas(childCreateGas)
        .setFunction("createChild")
        .execute(client);

    let record = await createChildTransactionResponse.getRecord(client);

    const childContractAddress = record.contractFunctionResult.getAddress(0);
    const childContractId = ContractId.fromSolidityAddress(childContractAddress);
    console.log(`Child contract address: ${childContractAddress}`);
    console.log(`Child contract id: ${childContractId}`);

    // query the child contract
    let result = await queryContract(childContractId, "getName");
    console.log(`Child Contract name is : ${result['0']}`);

    // set the child contract name value
    const setChildTransactionResponse = await new ContractExecuteTransaction()
        .setContractId(childContractId)
        .setGas(setNameGas)
        .setFunction("setName", new ContractFunctionParameters().addString("new name"))
        .execute(client);

    await setChildTransactionResponse.getReceipt(client);

    // query the child contract
    result = await queryContract(childContractId, "getName");
    console.log(`Updated child Contract name is : ${result['0']}`);

    // query child contract bytecode
    const bytecode = await new ContractByteCodeQuery()
        .setContractId(childContractId)
        .execute(client);

    console.log(`Child bytecode size is ${bytecode.length}`);
    client.close();
}

async function queryContract(contractId, functionName) {
    const contractCall = await new ContractCallQuery()
        .setContractId(contractId)
        .setFunction(functionName)
        .setQueryPayment(new Hbar(2))
        .setGas(queryGas)
        .execute(client);

    const functionAbi = contractABI.find(func => func.name === functionName);
    const functionParameters = functionAbi.outputs;
    const resultHex = '0x'.concat(Buffer.from(contractCall.bytes).toString('hex'));
    const result = web3.eth.abi.decodeParameters(functionParameters, resultHex);
    return result;
}

void main();

const {
    Client,
    PrivateKey,
    ContractCreateTransaction,
    FileCreateTransaction,
    ContractCallQuery,
    Hbar,
    AccountId, ContractId,
} = require("@hashgraph/sdk");

require('dotenv').config({ path: '../../.env' });
const momContract = require("../build/MomContract.json");
const Web3 = require("web3");
const web3 = new Web3;
let contractABI;
let client;

async function main() {

    client = Client.forName(process.env.HEDERA_NETWORK);
    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        PrivateKey.fromString(process.env.OPERATOR_KEY)
    );
    // The contract bytecode is located on the `object` field
    const contractByteCode = momContract.bytecode;
    contractABI = momContract.abi;

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

    let constructParameters = web3.eth.abi.encodeParameters(
        ['string', 'uint', 'string', 'uint'],
        ['Alice', 50, 'Carol', 20]
    ).slice(2);
    // convert to a Uint8Array
    const constructorParametersAsUint8Array = Buffer.from(constructParameters, 'hex');

    // Create the contract
    const contractTransactionResponse = await new ContractCreateTransaction()
        // Set the parameters that should be passed to the contract constructor
        // In this case we are passing in a string with the value "hello from hedera!"
        // as the only parameter that is passed to the contract
        .setConstructorParameters(constructorParametersAsUint8Array)
        // Set gas to create the contract
        .setGas(1_000_000)
        // The contract bytecode must be set to the file ID containing the contract bytecode
        .setBytecodeFileId(fileId)
        // Set the admin key on the contract in case the contract should be deleted or
        // updated in the future
        .setAdminKey(client.operatorPublicKey)
        .execute(client);

    // Fetch the receipt for the transaction that created the contract
    const contractReceipt = await contractTransactionResponse.getReceipt(
        client
    );

    // The contract ID is located on the transaction receipt
    const momContractId = contractReceipt.contractId;

    console.log(`Mom ContractId: ${momContractId.toString()}`);

    // query name from mom contract
    let result = await queryContract(momContractId, "name", []);
    console.log(`Mum name is : ${result['0']}`);

    // query age from momContract
    result = await queryContract(momContractId, "age", []);
    console.log(`Mum age is : ${result['0']}`);

    // query daughter contract address from momContract
    result = await queryContract(momContractId, "daughter", []);
    const daughterContractAddress = result['0'];
    console.log(`Daughter contract address is : ${daughterContractAddress}`);

    // convert address to ContractId
    const daughterContractId = ContractId.fromEvmAddress(0, 0, daughterContractAddress);
    console.log(`Daughter ContractId is : ${daughterContractId.toString()}`);

    // query name from daughterContract
    result = await queryContract(daughterContractId, "name", []);
    console.log(`Daughter name is : ${result['0']}`);

    // query age from daughterContract
    result = await queryContract(daughterContractId, "age", []);
    console.log(`Daughter age is : ${result['0']}`);

    client.close();
}

async function queryContract(momContractId, functionName, parameters) {
    const functionCallAsUint8Array = encodeFunctionCall(functionName, parameters);

    const contractCall = await new ContractCallQuery()
        .setContractId(momContractId)
        .setFunctionParameters(functionCallAsUint8Array)
        .setQueryPayment(new Hbar(2))
        .setGas(100000)
        .execute(client);

    const functionAbi = contractABI.find(func => func.name === functionName);
    const functionParameters = functionAbi.outputs;
    const resultHex = '0x'.concat(Buffer.from(contractCall.bytes).toString('hex'));
    const result = web3.eth.abi.decodeParameters(functionParameters, resultHex);
    return result;
}

function encodeFunctionCall(functionName, parameters) {
    const functionAbi = contractABI.find(func => (func.name === functionName && func.type === "function"));
    const encodedParametersHex = web3.eth.abi.encodeFunctionCall(functionAbi, parameters).slice(2);
    return Buffer.from(encodedParametersHex, 'hex');
}

void main();

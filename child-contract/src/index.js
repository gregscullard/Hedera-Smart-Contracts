const {
    Client,
    PrivateKey,
    ContractCreateTransaction,
    ContractExecuteTransaction,
    FileCreateTransaction,
    ContractFunctionParameters,
    ContractCallQuery,
    Hbar,
    AccountId,
} = require("@hashgraph/sdk");

require('dotenv').config({ path: '../.env' });
const momContract = require("../build/MomContract.json");
const Web3 = require("web3");
const web3 = new Web3;

async function main() {

    let client = Client.forName(process.env.HEDERA_NETWORK);
    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        PrivateKey.fromString(process.env.OPERATOR_KEY)
    );
    // The contract bytecode is located on the `object` field
    const contractByteCode = momContract.bytecode;
    const contractABI = momContract.abi;

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
        ['MumName', 50, 'DaughterName', 20]
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
    const contractId = contractReceipt.contractId;

    console.log(`new contract ID: ${contractId.toString()}`);

    // query name, age and daughter (address)
    const functionCallAsUint8Array = encodeFunctionCall("name", []);

    // query the contract
    const contractCall = await new ContractCallQuery()
        .setContractId(contractId)
        .setFunctionParameters(functionCallAsUint8Array)
        .setQueryPayment(new Hbar(2))
        .setGas(100000)
        .execute(client);

    let results = decodeFunctionResult('name', contractCall.bytes);
    console.log(results);

}

function decodeFunctionResult(functionName, resultAsBytes) {
    const functionAbi = abi.find(func => func.name === functionName);
    const functionParameters = functionAbi.outputs;
    const resultHex = '0x'.concat(Buffer.from(resultAsBytes).toString('hex'));
    const result = web3.eth.abi.decodeParameters(functionParameters, resultHex);
    return result;
}

function encodeFunctionCall(functionName, parameters) {
    const functionAbi = abi.find(func => (func.name === functionName && func.type === "function"));
    const encodedParametersHex = web3.eth.abi.encodeFunctionCall(functionAbi, parameters).slice(2);
    return Buffer.from(encodedParametersHex, 'hex');
}

void main();

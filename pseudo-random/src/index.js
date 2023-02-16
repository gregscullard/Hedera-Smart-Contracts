const { FileCreateTransaction, FileAppendTransaction, AccountId, PrivateKey,
    ContractCreateTransaction, Client, ContractCallQuery, Hbar
} = require("@hashgraph/sdk");
const dotenv = require("dotenv");

dotenv.config({ path: '../../.env' });

const pseudoRandomContract = require("../build/PseudoRandom.json");
const {Interface} = require("@ethersproject/abi");
const contractByteCode = pseudoRandomContract.bytecode;
// Setup an ethers.js interface using the contract's abi
const abiInterface = new Interface(pseudoRandomContract.abi);
let client = Client.forNetwork(process.env.HEDERA_NETWORK);

async function main() {

    const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);

    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        operatorKey
    );

    //Create a file on Hedera and store the hex-encoded bytecode
    const fileCreateTx = await new FileCreateTransaction().setKeys([operatorKey]).execute(client);
    const fileCreateRx = await fileCreateTx.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;
    console.log(`The smart contract bytecode file ID is: ${bytecodeFileId}`);

    // Append contents to the file
    const fileAppendTx = await new FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(contractByteCode)
        .setMaxChunks(10)
        .execute(client);
    await fileAppendTx.getReceipt(client);
    console.log(`- File creation complete`);

    const contractCreateTx = await new ContractCreateTransaction()
        .setBytecodeFileId(bytecodeFileId)
        .setGas(100000)
        .execute(client);

    const contractCreateRx = await contractCreateTx.getReceipt(client);
    const contractId = contractCreateRx.contractId.toString();
    console.log(`Contract created ${contractId}`);

    // query the contract random number function 10 times
    let result = "";
    for (let i=0; i < 10; i++) {
        result += await queryRandomNumber(contractId, 2, 8);
        result += ',';
    }
    console.log(result);

    client.close();
}

async function queryRandomNumber(contractId, lo, hi) {
    // generate function call with function name and parameters
    const functionCallAsUint8Array = encodeFunctionParameters('getPseudorandomNumber', [lo, hi]);

    // query the contract
    const contractCall = await new ContractCallQuery()
        .setContractId(contractId)
        .setFunctionParameters(functionCallAsUint8Array)
        .setQueryPayment(new Hbar(2))
        .setGas(100000)
        .execute(client);

    let results = abiInterface.decodeFunctionResult('getPseudorandomNumber', contractCall.bytes);
    return results[0];
}

function encodeFunctionParameters(functionName, parameterArray) {
    // build the call parameters using ethers.js
    // .slice(2) to remove leading '0x'
    const functionCallAsHexString = abiInterface.encodeFunctionData(functionName, parameterArray).slice(2);
    // convert to a Uint8Array
    return Buffer.from(functionCallAsHexString, `hex`);
}

main();

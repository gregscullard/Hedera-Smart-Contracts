const {TokenCreateTransaction, FileCreateTransaction, FileAppendTransaction, AccountId, PrivateKey,
    ContractCreateTransaction, TokenType, TokenSupplyType, Hbar, Client, ContractId, AccountCreateTransaction, KeyList,
    ContractUpdateTransaction, ContractInfoQuery, ContractExecuteTransaction,
    ContractFunctionParameters, TokenUpdateTransaction, TokenInfoQuery, TokenAssociateTransaction, AccountBalanceQuery
} = require("@hashgraph/sdk");

const dotenv = require("dotenv");
dotenv.config({ path: '../../.env' });

const contractJson = require("../build/Payable.json");
const Web3 = require("web3");
const {hethers} = require("@hashgraph/hethers");
let bytecode;
let abi;
let client;
let operatorKey;
let contractId;
const web3 = new Web3;

async function main() {

    client = Client.forNetwork(process.env.HEDERA_NETWORK);

    operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
    abi = contractJson.abi;
    bytecode = contractJson.bytecode;

    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        operatorKey
    );

    await deployContract();
    // try setting the price using ether as a currency
    let price = web3.utils.toWei("10.1", "ether");
    console.log(`10.1 ether is ${price} wei`);
    await callSetPrice(price);
    // try purchasing using hbar
    // should fail
    await callPurchase(10.1);

    // now set the price using hbar
    price = hethers.utils.parseUnits("10.1").toString();
    console.log(`10.1 hbar is ${price} wei (tinybar)`);
    await callSetPrice(price);
    // try purchasing using hbar
    // should work
    await callPurchase(10.1);

    client.close();
}


async function callSetPrice(price) {
    console.log(`Calling setPrice with '${price}' parameter value`);

    // generate function call with function name and parameters
    const functionCallAsUint8Array = encodeFunctionCall("setPrice", [price]);

    // execute the transaction calling the set_message contract function
    const transaction = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setFunctionParameters(functionCallAsUint8Array)
        .setGas(100000)
        .execute(client);

    // get the receipt for the transaction
    await transaction.getReceipt(client);
}

async function callPurchase(price) {
    console.log(`Calling purchase with '${price}' parameter value`);

    // generate function call with function name and parameters
    const functionCallAsUint8Array = encodeFunctionCall("purchase", []);

    // execute the transaction calling the set_message contract function
    const transaction = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setFunctionParameters(functionCallAsUint8Array)
        .setPayableAmount(price)
        .setGas(100000)
        .execute(client);

    try {
        // get the receipt for the transaction
        await transaction.getReceipt(client);
        console.log("- success");
    } catch (error) {
        console.error(error.message);
    }
}

async function deployContract() {

    console.log(`\nDeploying Contract`);

    //Create a file on Hedera and store the hex-encoded bytecode
    const fileCreateTx = await new FileCreateTransaction().setKeys([operatorKey]).execute(client);
    const fileCreateRx = await fileCreateTx.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;
    console.log(`- The smart contract bytecode file ID is: ${bytecodeFileId}`);

    // Append contents to the file
    const fileAppendTx = await new FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(bytecode)
        .setMaxChunks(10)
        .execute(client);
    await fileAppendTx.getReceipt(client);
    console.log(`- Content added`);

    const contractCreateTx = await new ContractCreateTransaction()
        .setAdminKey(operatorKey)
        .setBytecodeFileId(bytecodeFileId)
        .setGas(100000)
        .execute(client);

    const contractCreateRx = await contractCreateTx.getReceipt(client);
    contractId = contractCreateRx.contractId.toString();
    console.log(`- Contract created ${contractId}`);
}

function encodeFunctionCall(functionName, parameters) {
    const functionAbi = abi.find(func => (func.name === functionName && func.type === "function"));
    const encodedParametersHex = web3.eth.abi.encodeFunctionCall(functionAbi, parameters).slice(2);
    return Buffer.from(encodedParametersHex, 'hex');
}

main();

const {
    Client,
    PrivateKey,
    ContractCreateFlow,
    ContractCallQuery,
    Hbar,
    AccountId, ContractFunctionParameters,
} = require("@hashgraph/sdk");

require('dotenv').config({ path: '../../.env' });
const logicContractJson = require("../build/Logic.json");
const msgSenderContractJson = require("../build/MsgSender.json");
const proxyContractJson = require("../build/HederaERC1967Proxy.json")
const Web3 = require("web3");
const web3 = new Web3;
let logicContractId;
let msgSenderContractId;
let proxyContractId;

let client;

async function main() {

    client = Client.forName(process.env.HEDERA_NETWORK);
    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        PrivateKey.fromString(process.env.OPERATOR_KEY)
    );

    console.log(`Deploying logic contract`);
    let response = await new ContractCreateFlow()
        .setBytecode(logicContractJson.bytecode)
        .setGas(100000)
        .execute(client);

    let receipt = await response.getReceipt(client);
    logicContractId = receipt.contractId;

    console.log(`Deploying proxy contract`);
    const constructorParameters = new ContractFunctionParameters()
        .addAddress(logicContractId.toSolidityAddress())
        .addBytes(new Uint8Array([]));

    response = await new ContractCreateFlow()
        .setBytecode(proxyContractJson.bytecode)
        .setConstructorParameters(constructorParameters)
        .setGas(100000)
        .execute(client);

    receipt = await response.getReceipt(client);
    proxyContractId = receipt.contractId;

    console.log(`Deploying msgSender contract`);
    response = await new ContractCreateFlow()
        .setBytecode(msgSenderContractJson.bytecode)
        .setGas(100000)
        .execute(client);

    receipt = await response.getReceipt(client);
    msgSenderContractId = receipt.contractId;

    console.log(`Proxy contract address: ${proxyContractId.toSolidityAddress()}`);
    console.log(`Logic contract address: ${logicContractId.toSolidityAddress()}`);
    console.log(`Sender contract address: ${msgSenderContractId.toSolidityAddress()}`);
    console.log(`Client address: ${client.operatorAccountId.toSolidityAddress()}`);
    console.log(``);

    // query sender seen by logic contract via proxy
    let result = await queryContract(proxyContractId, logicContractJson, "getOwnSender", undefined);
    console.log(`Logic contract sender is : ${compareAddress(result['0'])}`);

    // query sender seen by msgSender (call) via proxy
    let contractFunctionParameters = new ContractFunctionParameters()
        .addAddress(msgSenderContractId.toSolidityAddress());

    let contractTx = await new ContractCallQuery()
        .setContractId(proxyContractId)
        .setFunction("getSenderCall", contractFunctionParameters)
        .setGas(50000)
        .execute(client);

    let functionAbi = logicContractJson.abi.find(func => func.name === "getSenderCall");
    let functionParameters = functionAbi.outputs;
    let resultHex = '0x'.concat(Buffer.from(contractTx.bytes).toString('hex'));
    result = web3.eth.abi.decodeParameters(functionParameters, resultHex);
    console.log(`MsgSender contract sender (call) is : ${compareAddress(result['0'])}`);

    // query sender seen by msgSender (delegatecall) via proxy
    contractTx = await new ContractCallQuery()
        .setContractId(proxyContractId)
        .setFunction("getSenderDelegate", contractFunctionParameters)
        .setGas(50000)
        .execute(client);

    functionAbi = logicContractJson.abi.find(func => func.name === "getSenderDelegate");
    functionParameters = functionAbi.outputs;
    resultHex = '0x'.concat(Buffer.from(contractTx.bytes).toString('hex'));
    result = web3.eth.abi.decodeParameters(functionParameters, resultHex);
    console.log(`MsgSender contract sender (delegatecall) is : ${compareAddress(result['0'])}`);

    client.close();
}

function compareAddress(address) {
    address = address.toUpperCase();
    let result = "unknown";
    if (address.includes(logicContractId.toSolidityAddress().toUpperCase())) {
        result = "logic";
    } else if (address.includes(msgSenderContractId.toSolidityAddress().toUpperCase())) {
        result = "msgSender";
    } else if (address.includes(proxyContractId.toSolidityAddress().toUpperCase())) {
        result = "proxy";
    } else if (address.includes(client.operatorAccountId.toSolidityAddress().toUpperCase())) {
        result = "client";
    }
    return `${address} (${result})`;
}

async function queryContract(contractId, json, functionName, parameters) {
    // const functionCallAsUint8Array = encodeFunctionCall(json, functionName, parameters);

    let contractCall = new ContractCallQuery()
        .setContractId(contractId)
        .setQueryPayment(new Hbar(2))
        .setGas(30000);
    if (parameters) {
        contractCall.setFunction(functionName, parameters);
    } else {
        contractCall.setFunction(functionName);
    }

    contractCall = await contractCall.execute(client);

    const functionAbi = json.abi.find(func => func.name === functionName);
    const functionParameters = functionAbi.outputs;
    const resultHex = '0x'.concat(Buffer.from(contractCall.bytes).toString('hex'));
    const result = web3.eth.abi.decodeParameters(functionParameters, resultHex);
    return result;
}

function encodeFunctionCall(json, functionName, parameters) {
    const functionAbi = json.abi.find(func => (func.name === functionName && func.type === "function"));
    const encodedParametersHex = web3.eth.abi.encodeFunctionCall(functionAbi, parameters).slice(2);
    return Buffer.from(encodedParametersHex, 'hex');
}

void main();

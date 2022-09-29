const {
    ContractCallQuery,
    Hbar,
} = require("@hashgraph/sdk");

require('dotenv').config({ path: '../../.env' });
const logicContractJson = require("../build/Logic.json");
const msgSenderContractJson = require("../build/MsgSender.json");
const Web3 = require("web3");
const {getClient, createContract} = require("./utils");
const web3 = new Web3;

let client;
let logicContractId;
let msgSenderContractId;

async function main() {

    client = getClient();

    console.log(`Deploying logic contract`);
    logicContractId = await createContract(client, logicContractJson, 100000);

    console.log(`Deploying msgSender contract`);
    msgSenderContractId = await createContract(client, msgSenderContractJson, 100000);

    console.log(`Logic contract address: ${logicContractId.toSolidityAddress()}`);
    console.log(`Sender contract address: ${msgSenderContractId.toSolidityAddress()}`);
    console.log(`Client address: ${client.operatorAccountId.toSolidityAddress()}`);
    console.log(``);
    // query sender seen by logic contract
    let result = await queryContract(logicContractId, logicContractJson, "getOwnSender", []);
    console.log(`Logic contract sender is : ${compareAddress(result['0'])}`);

    const senderContractAddress = `0x${msgSenderContractId.toSolidityAddress()}`;

    // query sender seen by msgSender (call)
    result = await queryContract(logicContractId, logicContractJson, "getSenderCall", [senderContractAddress]);
    console.log(`MsgSender contract sender (call) is : ${compareAddress(result['0'])}`);

    // query sender seen by msgSender (delegatecall)
    result = await queryContract(logicContractId, logicContractJson, "getSenderDelegate", [senderContractAddress]);
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
    } else if (address.includes(client.operatorAccountId.toSolidityAddress().toUpperCase())) {
        result = "client";
    }
    return `${address} (${result})`;
}

async function queryContract(contractId, json, functionName, parameters) {
    const functionCallAsUint8Array = encodeFunctionCall(json, functionName, parameters);

    const contractCall = await new ContractCallQuery()
        .setContractId(contractId)
        .setFunctionParameters(functionCallAsUint8Array)
        .setQueryPayment(new Hbar(2))
        .setGas(30000)
        .execute(client);

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

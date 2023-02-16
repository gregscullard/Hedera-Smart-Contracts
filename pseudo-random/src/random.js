/*-
 *
 * Smart Contracts Libs Labs
 *
 * Copyright (C) 2019 - 2021 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {
    Client,
    PrivateKey,
    ContractCreateTransaction,
    FileCreateTransaction,
    AccountId, Hbar, ContractCallQuery,
} from "@hashgraph/sdk";

import { Interface } from "@ethersproject/abi";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({path : '../.env'});

let abi;
let bytecode;
let client = Client.forTestnet();
let abiInterface;

/**
 * Runs each step of the example one after the other
 */
async function main() {

    // solc --bin --pretty-json  --abi --overwrite -o . PseudoRandom.sol

    // Import the ABI and bytecode
    abi = JSON.parse(fs.readFileSync('../contracts/PseudoRandom.abi', 'utf8'));
    bytecode = fs.readFileSync('../contracts/PseudoRandom.bin', 'utf8');


    // Setup an ethers.js interface using the abi
    abiInterface = new Interface(abi);

    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        PrivateKey.fromString(process.env.OPERATOR_KEY)
    );

    client.setMaxTransactionFee(new Hbar(5));
    client.setMaxQueryPayment(new Hbar(5))

    // deploy the contract to Hedera from bytecode
    const contractId = await deployContract();
    // query the contract's get_message function
    let result = "";
    for (let i=0; i < 10; i++) {
        result += await queryRandomNumber(contractId, 2, 8);
        result += ',';
    }
    console.log(result);
}

/**
 * Deploys the contract to Hedera by first creating a file containing the bytecode, then creating a contract from the resulting
 * FileId, specifying a parameter value for the constructor and returning the resulting ContractId
 */
async function deployContract() {
    console.log(`\nDeploying the contract`);

    // Import the compiled contract

    // Create a file on Hedera which contains the contact bytecode.
    // Note: The contract bytecode **must** be hex encoded, it should not
    // be the actual data the hex represents
    const fileTransactionResponse = await new FileCreateTransaction()
        .setKeys([client.operatorPublicKey])
        .setContents(bytecode)
        .execute(client);

    // Fetch the receipt for transaction that created the file
    const fileReceipt = await fileTransactionResponse.getReceipt(client);

    // The file ID is located on the transaction receipt
    const fileId = fileReceipt.fileId;

    // Create the contract
    const contractTransactionResponse = await new ContractCreateTransaction()
        // Set gas to create the contract
        .setGas(100_000)
        // The contract bytecode must be set to the file ID containing the contract bytecode
        .setBytecodeFileId(fileId)
        .execute(client);

    // Fetch the receipt for the transaction that created the contract
    const contractReceipt = await contractTransactionResponse.getReceipt(client);

    // The contract ID is located on the transaction receipt
    const contractId = contractReceipt.contractId;

    console.log(`new contract ID: ${contractId.toString()}`);
    return contractId;
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
/**
 * Helper function to encode function name and parameters that can be used to invoke a contract's function
 * @param functionName the name of the function to invoke
 * @param parameterArray an array of parameters to pass to the function
 */
function encodeFunctionParameters(functionName, parameterArray) {
    // build the call parameters using ethers.js
    // .slice(2) to remove leading '0x'
    const functionCallAsHexString = abiInterface.encodeFunctionData(functionName, parameterArray).slice(2);
    // convert to a Uint8Array
    return Buffer.from(functionCallAsHexString, `hex`);
}

void main();

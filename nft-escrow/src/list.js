const {AccountId, PrivateKey,
    Client, ContractId,
    ContractExecuteTransaction,
    TokenId
} = require("@hashgraph/sdk");
const dotenv = require("dotenv");
const { Interface } = require("@ethersproject/abi");
const escrowContractJSON = require("../build/Escrow.json");
const {topUp , encodeFunctionParameters} = require("./utils");
const pathToEnvFile = '../.scriptenv';

dotenv.config({ path: '../../.env' });

const client = Client.forNetwork(process.env.HEDERA_NETWORK);

async function main() {

    const args = process.argv.slice(2);
    if (args.length == 0) {
        console.error("missing serial number input");
    } else {
        const serial = args[0];

        const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);

        client.setOperator(
            AccountId.fromString(process.env.OPERATOR_ID),
            operatorKey
        );

        dotenv.config({ path: pathToEnvFile });

        const aliceKey = PrivateKey.fromStringED25519(process.env.ESCROW_ALICE_KEY);
        const aliceAccount = AccountId.fromString(process.env.ESCROW_ALICE_ACCOUNT);
        const bobKey = PrivateKey.fromStringED25519(process.env.ESCROW_BOB_KEY);
        const bobAccount = AccountId.fromString(process.env.ESCROW_BOB_ACCOUNT);
        const escrowContractId = ContractId.fromString(process.env.ESCROW_CONTRACT_ID);
        const tokenId = TokenId.fromString(process.env.ESCROW_TOKEN_ID);

        console.log(`Alice account is ${aliceAccount.toString()} (${aliceAccount.toSolidityAddress()})`);
        console.log(`Bob account is ${bobAccount.toString()} (${bobAccount.toSolidityAddress()})`);
        console.log(`Contract Id ${escrowContractId.toString()} (${escrowContractId.toSolidityAddress()})`);
        console.log(`Token Id ${tokenId.toString()} (${tokenId.toSolidityAddress()})`);

        console.log(`\nTopping up accounts`);
        await topUp(client, aliceAccount);
        await topUp(client, bobAccount);

        // switch to alice to list the token
        console.log(`\nSwitching to Alice`);
        client.setOperator(aliceAccount, aliceKey);

        console.log(`\nCalling list on contract`);

        // Setup an ethers.js interface using the abi for the contract
        const abiInterface = new Interface(escrowContractJSON.abi);

        const functionCallAsUint8Array = encodeFunctionParameters(abiInterface,'list',  [tokenId.toSolidityAddress(), serial, 10]);

        const contractListTx = await new ContractExecuteTransaction()
            .setContractId(escrowContractId)
            .setFunctionParameters(functionCallAsUint8Array)
            .setGas(1000000)
            .execute(client);
        await contractListTx.getReceipt(client);

        client.close();
    }
}

main();

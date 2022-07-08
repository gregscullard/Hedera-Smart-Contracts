const {TokenCreateTransaction, AccountId, PrivateKey,
    Client, TokenAssociateTransaction, ContractExecuteTransaction, ContractCallQuery, Hbar, TokenId
} = require("@hashgraph/sdk");
const dotenv = require("dotenv");
const allowContractJSON = require("../build/Allowances.json");
const {setEnv, createAccount, deployContract, topUp} = require("./Utils");
const {Interface} = require("@ethersproject/abi");
const {encodeFunctionParameters} = require("./utils");

let abiInterface;
let client;
let allowContractId;
let tokenId;

async function main() {

    dotenv.config({ path: '../../.env' });

    client = Client.forNetwork(process.env.HEDERA_NETWORK);
    // const nodes = {"2.testnet.hedera.com:50211": new AccountId(5)};
    // client = Client.forNetwork(nodes);
    const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
    const operatorId = AccountId.fromString(process.env.OPERATOR_ID);


    client.setOperator(
        AccountId.fromString(operatorId),
        operatorKey
    );

    // local local env
    dotenv.config({ path: '../.scriptenv' });

    let bobAliceKey = process.env.ALLOW_BOB_ALICE_KEY;
    let aliceAccount = process.env.ALLOW_ALICE_ACCOUNT;
    let bobAccount = process.env.ALLOW_BOB_ACCOUNT;

    if (bobAliceKey) {
        // top up accounts
        bobAliceKey = PrivateKey.fromStringED25519(bobAliceKey);
        aliceAccount = AccountId.fromString(aliceAccount);
        bobAccount = AccountId.fromString(bobAccount);
        console.log(`\nTopping up accounts`);
        await topUp(client, aliceAccount);
        await topUp(client, bobAccount);
    } else {
        console.log(`\nCreate accounts for alice and bob`);
        // using the same key for both to make things easier
        bobAliceKey = PrivateKey.generateED25519();
        aliceAccount = await createAccount(client, bobAliceKey, 100);
        bobAccount = await createAccount(client, bobAliceKey, 100);

        // set .env with new accounts ids and keys
        setEnv("ALLOW_BOB_ALICE_KEY", bobAliceKey.toString());
        setEnv("ALLOW_ALICE_ACCOUNT", aliceAccount.toString());
        setEnv("ALLOW_BOB_ACCOUNT", bobAccount.toString());
    }

    console.log(`Alice account is ${aliceAccount.toString()} (${aliceAccount.toSolidityAddress()})`);
    console.log(`Bob account is ${bobAccount.toString()} (${bobAccount.toSolidityAddress()})`);

    allowContractId = await deployContract(client, allowContractJSON.bytecode, 100000, null);
    setEnv("ALLOW_CONTRACT_ID", allowContractId.toString());
    console.log(`- Contract Id ${allowContractId.toString()} (${allowContractId.toSolidityAddress()})`);

    // switch to alice to create and mint the token
    client.setOperator(aliceAccount, bobAliceKey);

    console.log(`\nCreating Fungible Token`);
    const tokenCreateTx = await new TokenCreateTransaction()
        // .setNodeAccountIds([AccountId.fromString('0.0.5')])
        .setTokenName("test")
        .setTokenSymbol("tst")
        .setSupplyKey(bobAliceKey)
        .setTreasuryAccountId(aliceAccount)
        .setInitialSupply(100)
        .execute(client);

    const tokenCreateRx = await tokenCreateTx.getReceipt(client);
    tokenId = tokenCreateRx.tokenId;
    console.log(`- Token Id ${tokenId} (${tokenId.toSolidityAddress()})`);
    // write tokenId to .env file
    setEnv("ALLOW_TOKEN_ID", tokenId.toString());

    // associate bob with the token
    const associateTx = await new TokenAssociateTransaction()
        // .setNodeAccountIds([AccountId.fromString('0.0.5')])
        .setTokenIds([tokenId])
        .setAccountId(bobAccount)
        .execute(client);

    await associateTx.getReceipt(client);

    // call the contract approveToken(address tokenAddress, address spender, uint256 amount) external returns (bool result) {
    abiInterface = new Interface(allowContractJSON.abi);
    let functionCallAsUint8Array = encodeFunctionParameters(abiInterface,'approveTokenDelegate',  [tokenId.toSolidityAddress(), bobAccount.toSolidityAddress(), 10]);

    const contractAllowTx = await new ContractExecuteTransaction()
        // .setNodeAccountIds([AccountId.fromString('0.0.5')])
        .setContractId(allowContractId)
        .setFunctionParameters(functionCallAsUint8Array)
        .setPayableAmount()
        .setGas(1000000)
        .execute(client);
    let record = await contractAllowTx.getRecord(client);

    console.log(`Allow transaction complete ${contractAllowTx.transactionId}`)

    // process the response from the call
    let results = abiInterface.decodeFunctionResult('approveTokenDelegate', record.contractFunctionResult.bytes);
    console.log(results);

    // now check the allowance using the contract
    await checkAllowance(aliceAccount, bobAccount);
    // await checkAllowance(aliceAccount, client.operatorAccountId);
    // await checkAllowance(bobAccount, aliceAccount);
    // await checkAllowance(bobAccount, client.operatorAccountId);
    await checkAllowance(aliceAccount, operatorId);
    await checkAllowance(operatorId, aliceAccount);

    // Querying fails for now
    // // query the contract
    // const contractCall = await new ContractCallQuery()
    //     .setContractId(allowContractId)
    //     .setFunctionParameters(functionCallAsUint8Array)
    //     .setQueryPayment(new Hbar(2))
    //     .setGas(100000)
    //     .execute(client);
    //
    // results = abiInterface.decodeFunctionResult('checkAllowance', contractCall.bytes);
    // console.log(results);

    client.close();
}

async function checkAllowance(owner, spender) {
    const functionCallAsUint8Array = encodeFunctionParameters(abiInterface,'checkAllowance',  [tokenId.toSolidityAddress(), owner.toSolidityAddress(), spender.toSolidityAddress()]);
    const contractQueryTx = await new ContractExecuteTransaction()
        // .setNodeAccountIds([AccountId.fromString('0.0.5')])
        .setContractId(allowContractId)
        .setFunctionParameters(functionCallAsUint8Array)
        .setGas(1000000)
        .execute(client);
    const record = await contractQueryTx.getRecord(client);

    console.log(`Query transaction complete ${contractQueryTx.transactionId}`)

    // process the response from the call
    const results = abiInterface.decodeFunctionResult('checkAllowance', record.contractFunctionResult.bytes);
    console.log(results);

}

main();

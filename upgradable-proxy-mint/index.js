const {TokenCreateTransaction, FileCreateTransaction, FileAppendTransaction, AccountId, PrivateKey,
    ContractCreateTransaction, TokenType, TokenSupplyType, Hbar, Client, ContractId, AccountCreateTransaction, KeyList,
    ContractUpdateTransaction, ContractInfoQuery, ContractExecuteTransaction,
    ContractFunctionParameters, TokenUpdateTransaction, TokenInfoQuery, TokenAssociateTransaction, ContractCallQuery,
    AccountBalanceQuery
} = require("@hashgraph/sdk");
const Web3 = require ("web3");
const dotenv = require("dotenv");
const web3 = new Web3('http://localhost:8545');

dotenv.config({ path: '../.env' });

const erc20Contract = require("./build/contracts/HederaERC20.json");
const proxyContract = require("./build/contracts/HederaERC1967Proxy.json");
const BigNumber = require("bignumber.js");

async function main() {

    let client = Client.forNetwork(process.env.HEDERA_NETWORK);

    const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);

    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        operatorKey
    );

    console.log(`\nCreate accounts`);
    const adminKey = PrivateKey.generateED25519();
    const aliceKey = PrivateKey.generateED25519();

    let createAccountTx = await new AccountCreateTransaction()
        .setKey(adminKey.publicKey)
        .setInitialBalance(100)
        .execute(client);

    let createAccountRx = await createAccountTx.getReceipt(client);
    const adminAccount = createAccountRx.accountId;
    console.log(`- Admin account is ${adminAccount.toString()}`);

    createAccountTx = await new AccountCreateTransaction()
        .setKey(aliceKey.publicKey)
        .setMaxAutomaticTokenAssociations(1)
        .setInitialBalance(100)
        .execute(client);

    createAccountRx = await createAccountTx.getReceipt(client);
    const aliceAccount = createAccountRx.accountId;
    console.log(`- Alice account is ${aliceAccount.toString()}`);

    // switch client to admin
    console.log(`\nSwitching operator to Admin`);
    client.setOperator(adminAccount, adminKey);

    client.setDefaultMaxTransactionFee(new Hbar(50));

    console.log(`\nDeploying ERC20 contract`);
    console.log(`- Create file`);
    const erc20bytecode = erc20Contract.bytecode;

    //Create a file on Hedera and store the hex-encoded bytecode
    let fileCreateTx = await new FileCreateTransaction().setKeys([adminKey]).execute(client);
    let fileCreateRx = await fileCreateTx.getReceipt(client);
    let bytecodeFileId = fileCreateRx.fileId;
    console.log(`- The bytecode file ID is: ${bytecodeFileId}`);

    // Append contents to the file
    let fileAppendTx = await new FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(erc20bytecode)
        .setMaxChunks(10)
        .execute(client);
    await fileAppendTx.getReceipt(client);
    console.log(`- Content added`);

    console.log(`- Create contract`);
    let contractCreateTx = await new ContractCreateTransaction()
        // .setAdminKey(adminKey)
        .setBytecodeFileId(bytecodeFileId)
        .setGas(100000)
        .execute(client);

    let contractCreateRx = await contractCreateTx.getReceipt(client);
    const erc20ContractId = contractCreateRx.contractId.toString();
    console.log(`- ERC20 Contract created ${erc20ContractId}`);

    console.log(`\nDeploying Proxy contract`);
    console.log(`- Create file`);
    const proxyBytecode = proxyContract.bytecode;

    //Create a file on Hedera and store the hex-encoded bytecode
    fileCreateTx = await new FileCreateTransaction().setKeys([adminKey]).execute(client);
    fileCreateRx = await fileCreateTx.getReceipt(client);
    bytecodeFileId = fileCreateRx.fileId;
    console.log(`- The bytecode file ID is: ${bytecodeFileId}`);

    // Append contents to the file
    fileAppendTx = await new FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(proxyBytecode)
        .setMaxChunks(10)
        .execute(client);
    await fileAppendTx.getReceipt(client);
    console.log(`- Content added`);

    console.log(`- Create contract`);
    const constructorParameters = new ContractFunctionParameters()
        .addAddress(ContractId.fromString(erc20ContractId).toSolidityAddress())
        .addBytes(new Uint8Array([]));

    contractCreateTx = await new ContractCreateTransaction()
        .setAdminKey(adminKey)
        .setBytecodeFileId(bytecodeFileId)
        .setConstructorParameters(constructorParameters)
        .setGas(100000)
        .execute(client);

    contractCreateRx = await contractCreateTx.getReceipt(client);
    const proxyContractId = contractCreateRx.contractId.toString();
    console.log(`- Proxy Contract created ${proxyContractId}`);

    console.log(`\nCreate token`);
    const tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName("test")
        .setTokenSymbol("tst")
        .setDecimals(0)
        .setInitialSupply(0)
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Infinite)
        .setSupplyKey(adminKey)
        .setTreasuryAccountId(adminAccount)
        .setAdminKey(adminKey)
        .execute(client);

    const tokenCreateRx = await tokenCreateTx.getReceipt(client);
    const tokenId = tokenCreateRx.tokenId;
    console.log(`- Token created ${tokenId}`);

    // associate proxy contract to token
    console.log(`\nAssociate proxy contract to token`);
    let associateTx = await new TokenAssociateTransaction()
        .setTokenIds([tokenId])
        .setAccountId(AccountId.fromString(proxyContractId))
        .execute(client);

    await associateTx.getReceipt(client);

    // associate ERC20 contract to token
    // console.log(`\nAssociate ERC20 contract to token`);
    // associateTx = await new TokenAssociateTransaction()
    //     .setTokenIds([tokenId])
    //     .setAccountId(AccountId.fromString(erc20ContractId))
    //     .execute(client);
    //
    // await associateTx.getReceipt(client);

    console.log(`\nSwitching operator to Alice`);
    client.setOperator(aliceAccount, aliceKey);

    console.log(`\nAssociate token to Alice`);
    associateTx = await new TokenAssociateTransaction()
        .setTokenIds([tokenId])
        .setAccountId(AccountId.fromString(aliceAccount))
        .execute(client);
    await associateTx.getReceipt(client);

    console.log(`\nSwitching operator to Admin`);
    client.setOperator(adminAccount, adminKey);

    console.log(`\nUpdate the token so that the proxy contract is the supply and treasury`);
    const tokenUpdateTx = await new TokenUpdateTransaction()
        .setTokenId(tokenId)
        .setSupplyKey(ContractId.fromString(proxyContractId))
        .setTreasuryAccountId(proxyContractId)
        .execute(client);

    await tokenUpdateTx.getReceipt(client);
    console.log(`- Token updated`);

    console.log(`\nToken Query to check admin and treasury are now proxy contract`);
    let tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(client);

    console.log(`admin key: ${tokenInfo.adminKey}`);
    console.log(`treasury account id: ${tokenInfo.treasuryAccountId}`);
    console.log(`total supply: ${tokenInfo.totalSupply}`);

    console.log(`\nUpdate Contract to unset admin key`);
    const contractUpdateTx = await new ContractUpdateTransaction()
        .setContractId(proxyContractId)
        .setAdminKey(new KeyList())
        .execute(client);
    await contractUpdateTx.getReceipt(client);

    console.log(`\nQuery Contract to verify admin key`);
    const contractInfo = await new ContractInfoQuery()
        .setContractId(proxyContractId)
        .execute(client);
    console.log(`- contract admin key is now ${contractInfo.adminKey}`);

    console.log(`\nCall the proxy contract to set the token id in the logic contract`);
    const tokenAddress = tokenId.toSolidityAddress();
    let contractFunctionParameters = new ContractFunctionParameters()
        .addAddress(tokenAddress);

    const contractTokenTx = await new ContractExecuteTransaction()
        .setContractId(proxyContractId)
        .setFunction("setTokenAddress", contractFunctionParameters)
        .setGas(500000)
        .execute(client);
    await contractTokenTx.getReceipt(client);

    console.log(`\nQuery token name`);
    let txResult = await new ContractExecuteTransaction()
        .setContractId(proxyContractId)
        .setFunction("name")
        .setGas(100000)
        .execute(client);
    let txRecord = await txResult.getRecord(client);
    console.log(`- token name is ${txRecord.contractFunctionResult.getString(0)}`);

    console.log(`\nMinting 1 (100) to Alice`);

    const amount = 100;
    contractFunctionParameters = new ContractFunctionParameters()
        .addAddress(aliceAccount.toSolidityAddress())
        .addUint256(new BigNumber(amount));

    // switch client to admin
    console.log(`\nSwitching operator to admin`);
    client.setOperator(adminAccount, adminKey);

    let contractMintTx = await new ContractExecuteTransaction()
        .setContractId(proxyContractId)
        .setFunction("mint2", contractFunctionParameters)
        .setGas(1000000)
        .execute(client);

    console.log(`TransactionId is : ${contractMintTx.transactionId.toString()}`);

    let record = await contractMintTx.getRecord(client);

    let result = decodeFunctionResult(erc20Contract.abi, "mint2", record.contractFunctionResult.asBytes());
    console.log(`result should be true`);
    console.log(result);

    console.log(`\nToken Query to check token supply`);
    tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(client);

    console.log(`token supply should be 100, it is: ${tokenInfo.totalSupply}`);

    // switch client to alice
    // note Alice should have no "authority" on the token, but the contract has
    console.log(`\nSwitching operator to Alice`);
    client.setOperator(aliceAccount, aliceKey);

    contractMintTx = await new ContractExecuteTransaction()
        .setContractId(proxyContractId)
        // .setContractId(ContractId.fromString("0.0.34952547"))
        .setFunction("mint2", contractFunctionParameters)
        .setGas(1000000)
        .execute(client);

    console.log(`TransactionId is : ${contractMintTx.transactionId.toString()}`);

    record = await contractMintTx.getRecord(client);

    result = decodeFunctionResult(erc20Contract.abi, "mint2", record.contractFunctionResult.asBytes());
    console.log(`result should be true`);
    console.log(result);

    console.log(`\nToken Query to check token supply`);
    tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(client);

    console.log(`token supply should be 200, it is: ${tokenInfo.totalSupply}`);

    console.log(`\nChecking Alice Balance`);

    const aliceBalance = await new AccountBalanceQuery()
        .setAccountId(aliceAccount)
        .execute(client);

    console.log(aliceBalance.tokens.get(tokenId.toString()));

    client.close();
}

function decodeFunctionResult(abi, functionName, resultAsBytes) {
    const functionAbi = abi.find(func => func.name === functionName);
    const functionParameters = functionAbi.outputs;
    const resultHex = '0x'.concat(Buffer.from(resultAsBytes).toString('hex'));
    const result = web3.eth.abi.decodeParameters(functionParameters, resultHex);
    return result;
}

main();


const {TokenCreateTransaction, FileCreateTransaction, FileAppendTransaction, AccountId, PrivateKey,
    ContractCreateTransaction, TokenType, TokenSupplyType, Hbar, Client, ContractId, AccountCreateTransaction, KeyList,
    ContractUpdateTransaction, ContractInfoQuery, ContractExecuteTransaction,
    ContractFunctionParameters, TokenUpdateTransaction, TokenInfoQuery, TokenAssociateTransaction, ContractCallQuery,
    AccountBalanceQuery, TransferTransaction, HbarUnit
} = require("@hashgraph/sdk");
const Web3 = require ("web3");
const dotenv = require("dotenv");
const web3 = new Web3('http://localhost:8545');
const abiDecoder = require("abi-decoder");

dotenv.config({ path: '../.env' });

const erc20ContractJson = require("./build/contracts/HederaERC20.json");
const proxyContractJson = require("./build/contracts/ERC1967Proxy.json");
const tokenManagementContractJson = require("./build/contracts/HTSTokenManagement.json");

let client;

async function main() {

    if (process.env.HEDERA_NETWORK === 'local') {
        client = Client.forNetwork({'127.0.0.1:50211': AccountId.fromString('0.0.3')});
    } else {
        client = Client.forNetwork(process.env.HEDERA_NETWORK);
    }

    const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);

    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        operatorKey
    );

    // reuse accounts if they exist in .env
    const adminAccountEnv = process.env.ADMIN_ACCOUNT;
    const adminKeyEnv = process.env.ADMIN_KEY;
    const aliceAccountEnv = process.env.ALICE_ACCOUNT;
    const aliceKeyEnv = process.env.ALICE_KEY;

    let adminKey;
    let aliceKey;
    let adminAccount;
    let aliceAccount;
    if (adminAccountEnv) {
        console.log(`\nRe-using accounts`);
        adminKey = PrivateKey.fromStringED25519(adminKeyEnv);
        adminAccount = AccountId.fromString(adminAccountEnv);
        aliceKey = PrivateKey.fromStringED25519(aliceKeyEnv);
        aliceAccount = AccountId.fromString(aliceAccountEnv);

        // top up existing accounts
        await topUp(adminAccount);
        await topUp(aliceAccount);
    } else {
        console.log(`\nCreating new accounts`);
        adminKey = PrivateKey.generateED25519();
        aliceKey = PrivateKey.generateED25519();

        let createAccountTx = await new AccountCreateTransaction()
            .setKey(adminKey.publicKey)
            .setInitialBalance(100)
            .execute(client);

        let createAccountRx = await createAccountTx.getReceipt(client);
        adminAccount = createAccountRx.accountId;

        createAccountTx = await new AccountCreateTransaction()
            .setKey(aliceKey.publicKey)
            .setInitialBalance(100)
            .execute(client);

        createAccountRx = await createAccountTx.getReceipt(client);
        aliceAccount = createAccountRx.accountId;
    }

    console.log(`- Admin account is ${adminAccount.toString()} (${adminAccount.toSolidityAddress()})`);
    console.log(`- Admin priv key ${adminKey.toStringRaw()}`);
    console.log(`- Admin pub key ${adminKey.publicKey.toStringRaw()}`);
    console.log(`- Alice account is ${aliceAccount.toString()} (${aliceAccount.toSolidityAddress()})`);
    console.log(`- Alice priv key ${aliceKey.toStringRaw()}`);
    console.log(`- Alice pub key ${aliceKey.publicKey.toStringRaw()}`);

    // switch client to admin
    console.log(`\nSwitching operator to Admin`);
    client.setOperator(adminAccount, adminKey);

    client.setDefaultMaxTransactionFee(new Hbar(50));

    let erc20ContractAdminKey = null;
    let proxyContractAdminKey = null;
    let tokenManagementAdminKey = null;

    // specify which contract should "own" the token
    // const contractOwningToken = "ERC20";
    // const contractOwningToken = "Proxy";
    const contractOwningToken = "Management";

    switch (contractOwningToken) {
        case 'ERC20':
            erc20ContractAdminKey = adminKey;
            break;
        case 'Proxy':
            proxyContractAdminKey = adminKey;
            break;
        case 'Management':
            tokenManagementAdminKey = adminKey;
            break;
        default:
            console.log(`Invalid contractOwningToken ${contractOwningToken}`);
            return;
    }

    console.log(`\nDeploying ERC20 contract`);
    const erc20ContractId = await deployContract(erc20ContractJson.bytecode, adminKey, null, erc20ContractAdminKey);
    console.log(`- ERC20 Contract created ${erc20ContractId} (${ContractId.fromString(erc20ContractId).toSolidityAddress()})`);

    console.log(`\nDeploying Proxy contract`);
    const constructorParameters = new ContractFunctionParameters()
        .addAddress(ContractId.fromString(erc20ContractId).toSolidityAddress())
        .addBytes(new Uint8Array([]));
    const proxyContractId = await deployContract(proxyContractJson.bytecode, adminKey, constructorParameters, proxyContractAdminKey);
    console.log(`- Proxy Contract created ${proxyContractId} (${ContractId.fromString(proxyContractId).toSolidityAddress()})`);

    console.log(`\nDeploying Token Management contract`);
    const tokenManagementContractId = await deployContract(tokenManagementContractJson.bytecode, adminKey, null, tokenManagementAdminKey);
    console.log(`- Token Management Contract created ${tokenManagementContractId} (${ContractId.fromString(tokenManagementContractId).toSolidityAddress()})`);

    // set the id of the contract that will own the token (Treasury + supplyKey)
    let tokenOwnerContractId = null;
    switch (contractOwningToken) {
        case 'ERC20':
            tokenOwnerContractId = erc20ContractId;
            break;
        case 'Proxy':
            tokenOwnerContractId = proxyContractId;
            break;
        case 'Management':
            tokenOwnerContractId = tokenManagementContractId;
            break;
        default:
            console.log(`Invalid contractOwningToken ${contractOwningToken}`);
            return;
    }

    const contractToInvoke = proxyContractId;
    // const contractToInvoke = erc20ContractId;

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

    console.log(`\nAssociate token owner contract to token`);
    let associateTx = await new TokenAssociateTransaction()
        .setTokenIds([tokenId])
        .setAccountId(AccountId.fromString(tokenOwnerContractId))
        .execute(client);

    await associateTx.getReceipt(client);

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

    console.log(`\nUpdate the token so that the token owner contract is the supply and treasury`);
    const tokenUpdateTx = await new TokenUpdateTransaction()
        .setTokenId(tokenId)
        .setSupplyKey(ContractId.fromString(tokenOwnerContractId))
        .setTreasuryAccountId(tokenOwnerContractId)
        .execute(client);

    await tokenUpdateTx.getReceipt(client);
    console.log(`- Token updated`);

    console.log(`\nToken Query to check admin and treasury are now the management contract`);
    let tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(client);

    console.log(`supply key: ${tokenInfo.supplyKey}`);
    console.log(`treasury account id: ${tokenInfo.treasuryAccountId}`);
    console.log(`total supply: ${tokenInfo.totalSupply}`);

    console.log(`\nUpdate Token Owner Contract to unset admin key`);
    const contractUpdateTx = await new ContractUpdateTransaction()
        .setContractId(tokenOwnerContractId)
        .setAdminKey(new KeyList())
        .execute(client);
    await contractUpdateTx.getReceipt(client);

    console.log(`\nQuery Token Owner Contract to verify admin key`);
    const contractInfo = await new ContractInfoQuery()
        .setContractId(tokenOwnerContractId)
        .execute(client);
    console.log(`- contract admin key is now ${contractInfo.adminKey}`);

    console.log(`\nCall the proxy contract to set the token id in the ERC20 contract`);
    let contractFunctionParameters = new ContractFunctionParameters()
        .addAddress(ContractId.fromString(tokenManagementContractId).toSolidityAddress())
        .addAddress(tokenId.toSolidityAddress());

    let contractTx = await new ContractExecuteTransaction()
        .setContractId(contractToInvoke)
        .setFunction("setTokenAddress", contractFunctionParameters)
        .setGas(500000)
        .execute(client);
    await contractTx.getReceipt(client);

    console.log(`\nCall the Token Management contract to set the ERC20 contract`);
    contractFunctionParameters = new ContractFunctionParameters()
        .addAddress(ContractId.fromString(erc20ContractId).toSolidityAddress());

    contractTx = await new ContractExecuteTransaction()
        .setContractId(tokenManagementContractId)
        .setFunction("setERC20Address", contractFunctionParameters)
        .setGas(500000)
        .execute(client);
    await contractTx.getReceipt(client);

    console.log(`\nMinting 1 (100) to Alice`);

    contractFunctionParameters = new ContractFunctionParameters()
        .addAddress(aliceAccount.toSolidityAddress())
        .addUint256(100);

    // switch client to admin
    console.log(`\nSwitching operator to admin`);
    client.setOperator(adminAccount, adminKey);

    let contractMintTx = await new ContractExecuteTransaction()
        .setContractId(contractToInvoke)
        .setFunction("mint", contractFunctionParameters)
        .setGas(1000000)
        .execute(client);

    console.log(`TransactionId is : ${contractMintTx.transactionId.toString()}`);

    let record = await contractMintTx.getRecord(client);

    console.log(`result should be true`);
    decodeFunctionResult(erc20ContractJson.abi, "mint", record.contractFunctionResult.asBytes());

    // show logs
    await showLogs(tokenManagementContractJson, record);
    await showLogs(erc20ContractJson, record);

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
        .setContractId(contractToInvoke)
        .setFunction("mint", contractFunctionParameters)
        .setGas(1000000)
        .execute(client);

    console.log(`TransactionId is : ${contractMintTx.transactionId.toString()}`);

    record = await contractMintTx.getRecord(client);

    console.log(`result should be true`);
    decodeFunctionResult(erc20ContractJson.abi, "mint", record.contractFunctionResult.asBytes());

    console.log(`\nToken Query to check token supply`);
    tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(client);

    console.log(`token supply should be 200, it is: ${tokenInfo.totalSupply}`);

    // show logs
    await showLogs(tokenManagementContractJson, record);
    await showLogs(erc20ContractJson, record);

    console.log(`\nChecking Alice Balance`);

    const aliceBalance = await new AccountBalanceQuery()
        .setAccountId(aliceAccount)
        .execute(client);

    console.log(aliceBalance.tokens.get(tokenId.toString()));

    client.close();
}

async function deployContract(bytecode, fileAdminKey, constructorParameters, contractAdminKey) {
    //Create a file on Hedera and store the hex-encoded bytecode
    const fileCreateTx = await new FileCreateTransaction().setKeys([fileAdminKey]).execute(client);
    const fileCreateRx = await fileCreateTx.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;

    // Append contents to the file
    const fileAppendTx = await new FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(bytecode)
        .setMaxChunks(10)
        .execute(client);
    await fileAppendTx.getReceipt(client);

    const contractCreateTx = new ContractCreateTransaction()
        .setBytecodeFileId(bytecodeFileId)
        .setGas(100000);

    if (contractAdminKey) {
        contractCreateTx.setAdminKey(contractAdminKey);
    }
    if (constructorParameters) {
        contractCreateTx.setConstructorParameters(constructorParameters);
    }

    const txResult = await contractCreateTx.execute(client);

    let contractCreateRx = await txResult.getReceipt(client);
    return contractCreateRx.contractId.toString();
}

async function topUp(targetAccount) {
    const targetBalance = 100;

    const balance = await new AccountBalanceQuery()
        .setAccountId(targetAccount)
        .execute(client);


    if (balance.hbars.toBigNumber().isLessThan(targetBalance)) {
        const topUp = Hbar.fromTinybars(Hbar.from(targetBalance, HbarUnit.Hbar).toTinybars() - balance.hbars.toTinybars());
        console.log(`topping up account ${targetAccount} with ${topUp.toString(HbarUnit.Hbar)}`);
        await new TransferTransaction()
            .addHbarTransfer(AccountId.fromString(process.env.OPERATOR_ID), topUp.negated())
            .addHbarTransfer(targetAccount, topUp)
            .execute(client);
    }
}

async function showLogs(tokenManagementContractJson, record) {
    abiDecoder.addABI(tokenManagementContractJson.abi);

    console.log(`\nGetting event(s) from record`);

    // the events from the function call are in record.contractFunctionResult.logs.data
    // let's parse the logs using abi-decoder
    // there may be several log entries

    const logs = []

    record.contractFunctionResult.logs.forEach(log => {
        const logJson = {
            data: "",
            topics: []
        }

        // convert the log.data (uint8Array) to a string
        logJson.data = '0x'.concat(Buffer.from(log.data).toString('hex'));

        // get topics from log
        log.topics.forEach(topic => {
            logJson.topics.push('0x'.concat(Buffer.from(topic).toString('hex')));
        });

        logs.push(logJson);
    });

    const events = abiDecoder.decodeLogs(logs);

    console.log(`\nRecord events`);
    for (let eventIndex=0; eventIndex < events.length; eventIndex++) {
        const event = events[eventIndex];
        console.log(`event ${event.name}`);
        for (let eventDataIndex=0; eventDataIndex < event.events.length; eventDataIndex++) {
            const eventData = event.events[eventDataIndex];
            console.log(`  ${eventData.name} : ${eventData.value}`);
        }
    };
}

function decodeFunctionResult(abi, functionName, resultAsBytes) {
    const functionAbi = abi.find(func => func.name === functionName);
    const functionParameters = functionAbi.outputs;
    const resultHex = '0x'.concat(Buffer.from(resultAsBytes).toString('hex'));
    const result = web3.eth.abi.decodeParameters(functionParameters, resultHex);

    console.log(result);

    // if (result[1]) {
    //     // try to interpret the second value in results if binary data
    //     if (result[1].startsWith('0x')) {
    //         const innerAbi = [
    //             {
    //                 "inputs": [
    //                     {
    //                         "internalType": "address",
    //                         "name": "token",
    //                         "type": "address"
    //                     },
    //                     {
    //                         "internalType": "uint64",
    //                         "name": "amount",
    //                         "type": "uint64"
    //                     },
    //                     {
    //                         "internalType": "bytes[]",
    //                         "name": "metadata",
    //                         "type": "bytes[]"
    //                     }
    //                 ],
    //                 "name": "mintToken",
    //                 "outputs": [
    //                     {
    //                         "internalType": "int256",
    //                         "name": "responseCode",
    //                         "type": "int256"
    //                     },
    //                     {
    //                         "internalType": "uint64",
    //                         "name": "newTotalSupply",
    //                         "type": "uint64"
    //                     },
    //                     {
    //                         "internalType": "int64[]",
    //                         "name": "serialNumbers",
    //                         "type": "int64[]"
    //                     }
    //                 ],
    //                 "stateMutability": "nonpayable",
    //                 "type": "function"
    //             },
    //         ];
    //         console.log(`==> inner result`);
    //         decodeFunctionResult(innerAbi, 'mintToken', result[1]);
    //     }
    // }

    return result;
}

main();

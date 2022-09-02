const {TokenCreateTransaction, FileCreateTransaction, FileAppendTransaction, AccountId, PrivateKey,
    ContractCreateTransaction, TokenType, TokenSupplyType, Hbar, Client, ContractId, AccountCreateTransaction, KeyList,
    ContractUpdateTransaction, ContractInfoQuery, ContractExecuteTransaction,
    ContractFunctionParameters, TokenUpdateTransaction, TokenInfoQuery, TokenAssociateTransaction, AccountBalanceQuery
} = require("@hashgraph/sdk");
const dotenv = require("dotenv");

dotenv.config({ path: '../../.env' });

const takeOverSupplyContract = require("../build/TakeOverSupply.json");

async function main() {

    let mintQuantity = 10;
    let step = 0;
    let client = Client.forNetwork(process.env.HEDERA_NETWORK);

    const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);

    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        operatorKey
    );

    step += 1;
    console.log(`\nSTEP ${step} - Create account(s)`);
    // admin key for the contract
    const adminKey = PrivateKey.generateED25519();
    // keys for the token
    const tokenAdminKey = PrivateKey.generateED25519();
    const supply1 = PrivateKey.generateED25519();
    const supply2 = PrivateKey.generateED25519();
    const supply3 = PrivateKey.generateED25519();

    // create a 2 of 3 threshold key to manage the supply of the token
    const tokenSupplyThresholdKey = new KeyList([supply1.publicKey, supply2.publicKey, supply3.publicKey]).setThreshold(2);

    let createAccountTx = await new AccountCreateTransaction()
        .setKey(adminKey.publicKey)
        .setInitialBalance(100)
        .execute(client);

    let createAccountRx = await createAccountTx.getReceipt(client);
    const treasuryAccount = createAccountRx.accountId;
    console.log(`- Treasury account is ${treasuryAccount.toString()}`);

    // switch client to admin
    client.setOperator(treasuryAccount, adminKey);
    client.setDefaultMaxTransactionFee(new Hbar(50));

    step += 1;
    console.log(`\nSTEP ${step} - Create token`);
    const tokenCreateTx = new TokenCreateTransaction()
        .setTokenName("test")
        .setTokenSymbol("tst")
        .setDecimals(0)
        .setInitialSupply(0)
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Infinite)
        // create the token with a key and account for treasury
        .setSupplyKey(tokenSupplyThresholdKey)
        .setTreasuryAccountId(treasuryAccount)
        .setAdminKey(tokenAdminKey.publicKey)
        .freezeWith(client);
    await tokenCreateTx.sign(supply1);
    await tokenCreateTx.sign(supply2);
    await tokenCreateTx.sign(tokenAdminKey);

    let response = await tokenCreateTx.execute(client);

    const tokenCreateRx = await response.getReceipt(client);
    const tokenId = tokenCreateRx.tokenId;
    console.log(`- Token created ${tokenId}`);

    step += 1;
    console.log(`\nSTEP ${step} - Create file`);

    const contractByteCode = takeOverSupplyContract.bytecode;

    //Create a file on Hedera and store the hex-encoded bytecode
    const fileCreateTx = await new FileCreateTransaction().setKeys([adminKey]).execute(client);
    const fileCreateRx = await fileCreateTx.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;
    console.log(`- The smart contract bytecode file ID is: ${bytecodeFileId}`);

    // Append contents to the file
    const fileAppendTx = await new FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(contractByteCode)
        .setMaxChunks(10)
        .execute(client);
    await fileAppendTx.getReceipt(client);
    console.log(`- Content added`);

    step += 1;
    console.log(`\nSTEP ${step} - Create contract`);
    const contractCreateTx = await new ContractCreateTransaction()
        .setAdminKey(adminKey)
        .setBytecodeFileId(bytecodeFileId)
        .setGas(100000)
        .execute(client);

    const contractCreateRx = await contractCreateTx.getReceipt(client);
    const contractId = contractCreateRx.contractId.toString();
    console.log(`- Contract created ${contractId}`);

    // only update the token if it was setup with a key and account
    step += 1;
    console.log(`\nSTEP ${step} - Update the token`);
    const tokenUpdateTx = new TokenUpdateTransaction()
        .setTokenId(tokenId)
        .setSupplyKey(ContractId.fromString(contractId))
        .freezeWith(client);
    await tokenUpdateTx.sign(supply1);
    await tokenUpdateTx.sign(supply2);
    await tokenUpdateTx.sign(tokenAdminKey);

    response = await tokenUpdateTx.execute(client);
    await response.getReceipt(client);
    console.log(`- Token updated`);

    step += 1;
    console.log(`\nSTEP ${step} - Update Contract`);
    const contractUpdateTx = await new ContractUpdateTransaction()
        .setContractId(contractId)
        .setAdminKey(new KeyList())
        .execute(client);
    await contractUpdateTx.getReceipt(client);
    console.log(`- contract updated`);

    step += 1;
    console.log(`\nSTEP ${step} - Query Contract`);
    const contractInfo = await new ContractInfoQuery()
        .setContractId(contractId)
        .execute(client);

    console.log(`- contract admin key is now ${contractInfo.adminKey}`);
    if (contractInfo.adminKey.toString() === contractId.toString()) {
        console.log(`- this matches the contractId as expected`);
    }

    step += 1;
    console.log(`\nSTEP ${step} - call the contract to set the token id`);

    let contractFunctionParameters = new ContractFunctionParameters()
        .addAddress(tokenId.toSolidityAddress());

    const contractTokenTx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setFunction("setToken", contractFunctionParameters)
        .setGas(500000)
        .execute(client);
    await contractTokenTx.getReceipt(client);

    step += 1;
    console.log(`\nSTEP ${step} - Token supply before mint (should be 0)`);
    let tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(client);

    console.log(`- Token supply before mint is ${tokenInfo.totalSupply}`);

    step += 1;
    console.log(`\nSTEP ${step} - minting ${mintQuantity} - expecting it to fail (collateral != 100%)`);

    contractFunctionParameters = new ContractFunctionParameters()
        .addUint64(10);

    try {
        let contractMintTx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setFunction("mint", contractFunctionParameters)
            .setGas(500000)
            .execute(client);
        await contractMintTx.getReceipt(client);
    } catch (e) {
        if (e.status.toString() === "CONTRACT_REVERT_EXECUTED") {
            console.log(`- Contract reverted as expected`);
        } else {
            throw (e);
        }
    }

    step += 1;
    console.log(`\nSTEP ${step} - Token supply after mint failure should be 0 due to under-collateralisation`);

    tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(client);

    console.log(`- Token supply after mint is ${tokenInfo.totalSupply}`);

    step += 1;
    console.log(`\nSTEP ${step} - Setting collateralisation to 100%`);
    contractFunctionParameters = new ContractFunctionParameters()
        .addUint8(100);

    const setCollateralisationTx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setFunction("setCollateralisation", contractFunctionParameters)
        .setGas(500000)
        .execute(client);
    await setCollateralisationTx.getReceipt(client);
    console.log(`- Collateralisation set to 100%`);

    step += 1;
    console.log(`\nSTEP ${step} - minting ${mintQuantity}, this should work since collateralisation is now 100%`);

    contractFunctionParameters = new ContractFunctionParameters()
        .addUint64(mintQuantity);

    let contractMintTx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setFunction("mint", contractFunctionParameters)
        .setGas(500000)
        .execute(client);
    await contractMintTx.getReceipt(client);

    step += 1;
    console.log(`\nSTEP ${step} - Token supply after mint should be ${mintQuantity}`);

    tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(client);

    console.log(`- Token supply after mint is ${tokenInfo.totalSupply}`);

    client.close();
}

main();

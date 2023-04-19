const {TokenCreateTransaction, FileCreateTransaction, FileAppendTransaction, AccountId, PrivateKey,
    ContractCreateTransaction, TokenType, TokenSupplyType, Hbar, Client, ContractId, AccountCreateTransaction, KeyList,
    TokenUpdateTransaction, TokenInfoQuery, TokenAssociateTransaction, ContractExecuteTransaction,
    ContractFunctionParameters
} = require("@hashgraph/sdk");
const dotenv = require("dotenv");

dotenv.config({ path: '../../.env' });

const dummyContract = require("../build/Dummy.json");

async function main() {

    let client = Client.forTestnet();

    const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);

    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        operatorKey
    );

    console.log(`\nCreate accounts`);
    const tokenAdminKey = PrivateKey.generateED25519();
    const fileAdminKey = PrivateKey.generateED25519();

    let createAccountTx = await new AccountCreateTransaction()
        .setKey(tokenAdminKey.publicKey)
        .setInitialBalance(100)
        .execute(client);

    let createAccountRx = await createAccountTx.getReceipt(client);
    const adminAccount = createAccountRx.accountId;
    console.log(`- Admin account is ${adminAccount.toString()}`);

    // switch client to admin
    client.setOperator(adminAccount, tokenAdminKey);
    client.setDefaultMaxTransactionFee(new Hbar(50));

    console.log(`\nCreate file`);
    const contractByteCode = dummyContract.bytecode;

    //Create a file on Hedera and store the hex-encoded bytecode
    const fileCreateTx = await new FileCreateTransaction()
        .setKeys([fileAdminKey])
        .freezeWith(client)
        .sign(fileAdminKey);
    const fileCreateRx = await fileCreateTx
        .execute(client);
    let receipt = await fileCreateRx.getReceipt(client);
    const bytecodeFileId = receipt.fileId;
    console.log(`- The smart contract bytecode file ID is: ${bytecodeFileId}`);

    // Append contents to the file
    const fileAppendTx = await new FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(contractByteCode)
        .setMaxChunks(10)
        .freezeWith(client)
        .sign(fileAdminKey);
    const fileAppendRx = await fileAppendTx
        .execute(client);
    await fileAppendRx.getReceipt(client);
    console.log(`- Content added`);

    console.log(`\nCreate contract`);
    const contractCreateRx = await new ContractCreateTransaction()
        .setBytecodeFileId(bytecodeFileId)
        .setGas(100_000)
        .execute(client);

    receipt = await contractCreateRx.getReceipt(client);
    const contractId = receipt.contractId.toString();
    console.log(`- Contract created ${contractId}`);

    console.log(`\nCreate token`);
    const tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName("test")
        .setTokenSymbol("tst")
        .setDecimals(0)
        .setInitialSupply(0)
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Infinite)
        // create the token with the admin key and admin accounts
        .setSupplyKey(tokenAdminKey)
        .setTreasuryAccountId(adminAccount)
        .setAdminKey(tokenAdminKey)
        .execute(client);

    const tokenCreateRx = await tokenCreateTx.getReceipt(client);
    const tokenId = tokenCreateRx.tokenId;
    console.log(`- Token created ${tokenId}`);

    // associate the contract to the token
    const contractAssociateTx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1_000_000)
        .setFunction("associateMe", new ContractFunctionParameters().addAddress(tokenId.toSolidityAddress()))
        .execute(client);

    await contractAssociateTx.getReceipt(client);

    console.log(`\nUpdate the token so that supply key is the contract`);
    try {
        const tokenUpdateTx = await new TokenUpdateTransaction()
            .setTokenId(tokenId)
            .setSupplyKey(ContractId.fromString(contractId))
            .freezeWith(client)
            .sign(tokenAdminKey);
        const tokenUpdateRx = await tokenUpdateTx
            .execute(client);
        await tokenUpdateRx.getReceipt(client);
        console.log(`- Token updated`);
    } catch (e) {
        console.error(e);
    }

    console.log(`\nUpdate the token so that treasury account is the contract`);
    try {
        const tokenUpdateTx = await new TokenUpdateTransaction()
            .setTokenId(tokenId)
            .setTreasuryAccountId(AccountId.fromString(contractId))
            .freezeWith(client)
            .sign(tokenAdminKey);
        const tokenUpdateRx = await tokenUpdateTx
            .execute(client);

        await tokenUpdateRx.getReceipt(client);
        console.log(`- Token updated`);
    } catch (e) {
        console.error(e);
    }

    console.log(`\nQuery token properties`);
    const tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(client);

    console.log(`Token supply key is ${tokenInfo.supplyKey.toString()}`);
    console.log(`   was ${tokenAdminKey.publicKey.toString()}`);
    console.log(`Token treasury account is ${tokenInfo.treasuryAccountId.toString()}`);
    console.log(`   was ${adminAccount.toString()}`);

    console.log("Done");

    client.close();
}

main();

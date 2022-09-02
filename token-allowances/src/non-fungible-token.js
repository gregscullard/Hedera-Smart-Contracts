const {TokenCreateTransaction, AccountId, PrivateKey,
    TokenType, Client, ContractId,
    TokenMintTransaction
} = require("@hashgraph/sdk");
const dotenv = require("dotenv");
const allowContractJSON = require("../build/Allowances.json");
const {setEnv, createAccount, deployContract, topUp} = require("./Utils");

async function main() {

    dotenv.config({ path: '../../.env' });
    const client = Client.forNetwork(process.env.HEDERA_NETWORK);
    const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);

    client.setOperator(
        AccountId.fromString(process.env.OPERATOR_ID),
        operatorKey
    );
    // local local env
    dotenv.config({ path: './.scriptenv' });

    let aliceKey = process.env.ALLOW_ALICE_KEY;
    let aliceAccount = process.env.ALLOW_ALICE_ACCOUNT;
    let bobKey = process.env.ALLOW_BOB_KEY;
    let bobAccount = process.env.ALLOW_BOB_ACCOUNT;

    if (aliceKey) {
        // top up accounts
        aliceAccount = AccountId.fromString(aliceAccount);
        aliceKey = PrivateKey.fromStringED25519(aliceKey);
        bobAccount = AccountId.fromString(bobAccount);
        bobKey = PrivateKey.fromStringED25519(bobKey);
        console.log(`\nTopping up accounts`);
        await topUp(client, aliceAccount);
        await topUp(client, bobAccount);
    } else {
        console.log(`\nCreate accounts for alice and bob`);
        aliceKey = PrivateKey.generateED25519();
        aliceAccount = await createAccount(client, aliceKey, 100);

        bobKey = PrivateKey.generateED25519();
        bobAccount = await createAccount(client, bobKey, 100);

        // set .env with new accounts ids and keys
        setEnv("ALLOW_ALICE_ACCOUNT", aliceAccount.toString());
        setEnv("ALLOW_ALICE_KEY", aliceKey.toString());
        setEnv("ALLOW_BOB_ACCOUNT", bobAccount.toString());
        setEnv("ALLOW_BOB_KEY", bobKey.toString());
    }

    console.log(`Alice account is ${aliceAccount.toString()} (${aliceAccount.toSolidityAddress()})`);
    console.log(`Bob account is ${bobAccount.toString()} (${bobAccount.toSolidityAddress()})`);

    const allowContractId = await deployContract(client, allowContractJSON.bytecode, 100000, null);
    setEnv("ALLOW_CONTRACT_ID", allowContractId.toString());
    console.log(`- Contract Id ${allowContractId.toString()} (${allowContractId.toSolidityAddress()})`);

    // switch to alice to create and mint the token
    console.log(`\nCreating NFT`);
    client.setOperator(aliceAccount, aliceKey);
    const tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName("test")
        .setTokenSymbol("tst")
        .setTokenType(TokenType.NonFungibleUnique)
        .setSupplyKey(aliceKey)
        .setTreasuryAccountId(aliceAccount)
        .execute(client);

    const tokenCreateRx = await tokenCreateTx.getReceipt(client);
    const tokenId = tokenCreateRx.tokenId;
    console.log(`- Token Id ${tokenId} (${tokenId.toSolidityAddress()})`);
    // write tokenId to .env file
    setEnv("ALLOW_NFT_TOKEN_ID", tokenId.toString());

    // mint 10 tokens
    console.log(`\nMinting 10 NFTs`);
    const metadata = [];
    for (let i=1; i <= 10; i++) {
        metadata.push(Buffer.from(i.toString()));
    }
    const tokenMintTx = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata(metadata)
        .execute(client);
    await tokenMintTx.getReceipt(client);

    client.close();
}

main();

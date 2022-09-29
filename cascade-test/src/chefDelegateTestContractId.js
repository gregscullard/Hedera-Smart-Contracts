const {
    PrivateKey, ContractFunctionParameters,
    TokenInfoQuery, DelegateContractId, ContractId,
} = require("@hashgraph/sdk");

const chefContractJson = require("../build/Chef.json");
const callChefContractJson = require("../build/CallChef.json");
const proxyContractJson = require("../build/HederaERC1967Proxy.json")
const {getClient, createAccount, createContract, createToken, executeContract} = require("./utils");

async function main() {

    // create a contract (chef)
    // - with an admin key
    // - which can mint a token using HTS

    // create a token
    // - with an admin key
    // - supply key is the contract key above

    // create a contract which calls chef (CallChef)
    // create a proxy contract for the above

    // call proxy to mint the token (callChef)

    let chefContractAdminKey = PrivateKey.generateED25519();
    let chefTokenAdminKey = PrivateKey.generateED25519();
    let client = getClient();

    console.log(`Creating account for Alice`);
    const aliceKey = PrivateKey.generateED25519();
    const aliceAccountId = await createAccount(client, aliceKey);

    console.log(`Deploying chef contract`);
    const chefContractId = await createContract(client, chefContractJson, 10000, chefContractAdminKey);

    console.log(`Deploying call chef contract`);
    const callChefContractId = await createContract(client, callChefContractJson, 10000);

    console.log(`Deploying proxy contract`);
    const constructorParameters = new ContractFunctionParameters()
        .addAddress(callChefContractId.toSolidityAddress())
        .addBytes(new Uint8Array([]));

    const proxyContractId = await createContract(client, proxyContractJson, 10000, undefined, constructorParameters);

    // switch client to Alice
    client.setOperator(aliceAccountId, aliceKey);

    // create a fungible token
    console.log(`Creating token`);
    const tokenId = await createToken(client, aliceAccountId, ContractId.fromString(chefContractId.toString()), chefTokenAdminKey);
    // const tokenId = await createToken(client, aliceAccountId, DelegateContractId.fromString(chefContractId.toString()), chefTokenAdminKey);

    console.log(`Chef contract address: ${chefContractId.toSolidityAddress()}`);
    console.log(`Proxy contract address: ${proxyContractId.toSolidityAddress()}`);
    console.log(`CallChef contract address: ${callChefContractId.toSolidityAddress()}`);
    console.log(`Alice Address is ${aliceAccountId.toSolidityAddress()}`);
    console.log(`Token Address is ${tokenId.toSolidityAddress()}`);
    console.log(``);

    // call the chef contract to mint
    let functionParameters = new ContractFunctionParameters()
        .addAddress(tokenId.toSolidityAddress());

    console.log(`Minting via Chef contract directly`);
    try {
        await executeContract(client, chefContractId, 90000,"updatePool", functionParameters);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    functionParameters = new ContractFunctionParameters()
        .addAddress(chefContractId.toSolidityAddress())
        .addAddress(tokenId.toSolidityAddress());

    console.log(`Minting via proxy contract to CallChef which invokes Chef`);
    try {
        await executeContract(client, proxyContractId, 90000,"callChef", functionParameters);
        console.log(`-- Minting was successful`);
    } catch (e) {
        console.error(e);
    }

    const tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(client);

    console.log(`Total supply should be 2 = ${tokenInfo.totalSupply}`);

    client.close();
}

void main();

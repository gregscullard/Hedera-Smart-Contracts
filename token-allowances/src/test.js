const {
    AccountId,
    PrivateKey,
} = require("@hashgraph/sdk");

const dotenv = require("dotenv");

dotenv.config();

const fs  = require("fs");
const { hethers }  = require("@hashgraph/hethers");

const signerId = AccountId.fromString("0.0.47634829");
const signerKey = PrivateKey.fromString("3030020100300706052b8104000a04220420a9658167f2b87aa75d5649e2f5e97793c95f574ef7505f67eea4ca156818f45f"); // TO WORK WITH HETHERS, IT MUST BE ECDSA KEY (FOR NOW)

const walletAddress = hethers.utils.getAddressFromAccount(signerId);

async function main() {
    console.log(`\n- STEP 1 ===================================`);

    const provider = new hethers.providers.HederaProvider(
        AccountId.fromString("0.0.5"), // AccountLike
        "2.testnet.hedera.com:50211", // string
        "https://testnet.mirrornode.hedera.com"// string
    );

    const eoaAccount = {
        account: signerId,
        privateKey: `0x${signerKey.toStringRaw()}` // Convert private key to short format using .toStringRaw()
    };

    const wallet = new hethers.Wallet(eoaAccount, provider);
    console.log(`\n- Wallet address: ${wallet.address}`);
    console.log(`\n- Wallet public key: ${wallet.publicKey}`);

    const balance = await wallet.getBalance(walletAddress);

    console.log(
        `\n- Wallet address balance: ${hethers.utils.formatHbar(
            balance.toString()
        )} hbar`
    );

    console.log(`\n- STEP 2 ===================================`);

    // Define the contract's properties
    const rawdata = fs.readFileSync("../build/Greeter.json");
    const greeterCompileFile = JSON.parse(rawdata);

    const abi = greeterCompileFile.abi;
    const bytecode = greeterCompileFile.bytecode;

    console.log(abi);
    console.log(bytecode);

    const factory = new hethers.ContractFactory(abi, bytecode, wallet);

    console.log(`\n- Created factory using bytecode`);

    // Deploy the contract
    const contract = await factory.deploy("Hello, world!", { gasLimit: 300000 });

    console.log(`\n- Created contract using arg and gas.`);

    const contractDeployTx = contract.deployTransaction;

    console.log(`\n- contractDeployTx-  ${contractDeployTx}`);

    const contractDeployWait = await contract.deployTransaction.wait();
    console.log(
        `\n- Contract deployment status: ${contractDeployWait.status.toString()}`
    );

    contractAddress = contract.address;
    console.log(`\n- Contract address: ${contractAddress}`);

    console.log(`\n- DONE ===================================`);
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

package org.web3j;

import com.hedera.hashgraph.sdk.*;
import io.github.cdimascio.dotenv.Dotenv;
import org.web3j.crypto.Credentials;
import org.web3j.generated.contracts.StatefulContract;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.StaticGasProvider;

import java.math.BigInteger;
import java.util.Objects;
import java.util.concurrent.TimeoutException;

public class StatefulApp {

   private static final String nodeUrl = Dotenv.load().get("WEB3J_NODE_URL");
   private static final String privateKey = Dotenv.load().get("WEB3J_PRIVATE_KEY");
   private static final String publicKey = Dotenv.load().get("WEB3J_PUBLIC_KEY");

   private static ContractId deployContract() throws ReceiptStatusException, PrecheckStatusException, TimeoutException {
       AccountId OPERATOR_ID = AccountId.fromString(Objects.requireNonNull(Dotenv.load().get("OPERATOR_ID")));
       PrivateKey OPERATOR_KEY = PrivateKey.fromString(Objects.requireNonNull(Dotenv.load().get("OPERATOR_KEY")));
       String HEDERA_NETWORK = Dotenv.load().get("HEDERA_NETWORK", "testnet");

       String byteCodeHex = StatefulContract.BINARY;

       Client client = Client.forName(HEDERA_NETWORK);

       // Defaults the operator account ID and key such that all generated transactions will be paid for
       // by this account and be signed by this key
       client.setOperator(OPERATOR_ID, OPERATOR_KEY);

       // default max fee for all transactions executed by this client
       client.setDefaultMaxTransactionFee(new Hbar(100));
       client.setDefaultMaxQueryPayment(new Hbar(10));

       // create the contract's bytecode file
       TransactionResponse fileTransactionResponse = new FileCreateTransaction()
               // Use the same key as the operator to "own" this file
               .setKeys(OPERATOR_KEY)
               .setContents(byteCodeHex)
               .execute(client);

       TransactionReceipt fileReceipt = fileTransactionResponse.getReceipt(client);
       FileId newFileId = Objects.requireNonNull(fileReceipt.fileId);

       System.out.println("contract bytecode file: " + newFileId);

       TransactionResponse contractTransactionResponse = new ContractCreateTransaction()
               .setBytecodeFileId(newFileId)
               .setGas(100_000)
               .setConstructorParameters(
                       new ContractFunctionParameters()
                               .addString("hello from hedera!"))
               .execute(client);


       TransactionReceipt contractReceipt = contractTransactionResponse.getReceipt(client);
       ContractId newContractId = Objects.requireNonNull(contractReceipt.contractId);

       System.out.println("new contract ID: " + newContractId);
       return newContractId;
   }

   public static void main(String[] args) throws Exception {
       Credentials credentials = Credentials.create(privateKey, publicKey);

       System.out.println("Private key in credentials: " + credentials.getEcKeyPair().getPrivateKey().toString());
       System.out.println("Public key in credentials: " + credentials.getEcKeyPair().getPublicKey().toString());
       System.out.println("Address in credentials: " + credentials.getAddress().toString());
       Web3j web3j = Web3j.build(new HttpService(nodeUrl));

       System.out.println("Deploying Stateful contract ...");
//       // deploy the contract using the SDK
//       // Deploying with Web3.j fails
       ContractId contractId = deployContract();
       String contractAddress = "0x".concat(contractId.toSolidityAddress());

//       String contractAddress = "0x0000000000000000000000000000000002f1b620";
       System.out.println("Contract address: " + contractAddress);
       // this fails
       BigInteger gasPrice = BigInteger.valueOf(20_000_000_000_000L);
       BigInteger gasLimit = BigInteger.valueOf(500_000L);
       StaticGasProvider staticGasProvider = new StaticGasProvider(gasPrice, gasLimit);
//       StatefulContract statefulContract = StatefulContract.deploy(web3j, credentials, staticGasProvider, "Hello Hedera").send();

       // wait 10s for propagation to mirror node so it's recognised by the JSON RPC relay
       System.out.println("Waiting 10s for propagation to mirror ...");
       Thread.sleep(10 * 1000);

       StatefulContract statefulContract = StatefulContract.load(contractAddress, web3j, credentials, staticGasProvider);
       System.out.println("Greeting method result: " + statefulContract.get_message().send());
   }
}


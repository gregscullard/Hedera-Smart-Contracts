# Payable

Shows how to set a price in a contract such that this price can later be used to compared to msg.value in a payable function

The steps are:
- Deploys a contract
- Sets a price value in the contract using ether -> wei
- Calls the contract with a price as a payable amount. The contract compares the price with the value paid and fails.
- Sets a price value in the contract using hbar -> wei (tinybar)
- Calls the contract with a price as a payable amount. The contract compares the price with the value paid and succeeds

## Setup environment

Please refer to the main [readme](../README.md)

## Installation

```shell
npm install
npm run build # to recompile the contracts (ignore warnings)
```

## Run

```shell
cd src
node index.js 
```

outputs (your own contract IDs and addresses will vary)

```shell
Deploying Contract
- The smart contract bytecode file ID is: 0.0.4426608
- Content added
- Contract created 0.0.4426609
10.1 ether is 10100000000000000000 wei
Calling setPrice with '10100000000000000000' parameter value
Calling purchase with '10.1' parameter value
receipt for transaction 0.0.1189@1682516191.106627309 contained error status CONTRACT_REVERT_EXECUTED
10.1 hbar is 1010000000 wei (tinybar)
Calling setPrice with '1010000000' parameter value
Calling purchase with '10.1' parameter value
```

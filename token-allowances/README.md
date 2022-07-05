# Manage token allowances via smart contracts

Shows how a contract can be used to manage fungible and non-fungible token allowances

## Setup environment

Please refer to the main [readme](../README.md)

## Installation

```shell
npm install
```

## Compile Contracts

```shell
npm run build # to recompile the contracts (ignore warnings)
```

## Run the script
```shell
cd src
node non-fungible-token.js 
```

will create accounts for Bob and Alice (initially with 100 hbar), deploy the contract and create a token with an initial balance of 100 (Alice is the treasury for the NFT)

_note: this will create a `../.scriptenv` file with the resulting accountIds and keys, contractId and tokenId. To fully reset the environment, delete the file._

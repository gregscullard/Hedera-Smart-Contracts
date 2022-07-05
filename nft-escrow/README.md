# NFT Escrow

Shows how a contract can be used to escrow an NFT with an asking price so that it can be purchased by a third party.

## Setup environment

Please refer to the main [readme](../README.md)

## Installation

```shell
npm install
```

## Initial contract deployment

```shell
npm run build # to recompile the contracts (ignore warnings)
cd src
node deployAndSetup.js 
```

will create accounts for Bob and Alice (initially with 100 hbar), deploy the contract and create an NFT with 10 tokens (Alice is the treasury for the NFT)

_note: this will create a `../.scriptenv` file with the resulting accountIds and keys, contractId and tokenId. To fully reset the environment, delete the file._

## List

Here Alice lists one of her NFTs, transferring ownership to the contract and setting an asking price

```shell
cd src
node list.js serial 
```

where `serial` is the serial of the NFT you want to list

# Hedera Smart Contracts

This is a collection of sample projects, tests and trials. Some are just experiments of my own, others are there to help community members solve particular challenges.

Note: These repositories are not necessarily maintained regularly and may not be fully up to date.

## Setup environment

```shell
cp .env.sample .env
nano .env # edit the OPERATOR_ID and OPERATOR_KEY to match your Hedera Account and Private Key
```

## Project list

### cascade-test

Tests different scenarios from Javascript where contracts call each other (with/without proxies) and how a token's supply key can be set to a contract depending on the contracts architecture.

### child-contract

Shows a contract `MomContract` creating another contract `DaughterContract` when `MomContract` is constructed.

The example also queries `MomContract` and `DaughterContract` to show the construction was successful

### contract fallback

Demonstrates the use of fallback and receive (some which don't work yet on Hedera SC)

### contract-mint-to

Demonstrates how to create a contract and a token, allocating the contract to be the token's treasury and supply key.
This enables the contract to mint and burn the token.

### nft-escrow

Shows how a contract can be used to escrow an NFT with an asking price so that it can be purchased by a third party.

### token-allowances

Shows how a contract can be used to manage fungible and non-fungible token allowances

### upgradable-proxy-mint

Demonstrates how to create an upgradable contract that manages a native token.


# Contract Mint to

Shows how a contract can act as the treasury and supply manager for a native HTS token through a proxy.

The steps are:
- Create two accounts (Admin and Alice)
- Create an ERC-20 contract
- Create a proxy contract with an admin key, setting the ERC20 contract as the "logic" contract
- Create a token with an accountId and key for treasury and supply
- Associate the proxy contract with the token
- Associate Alice with the token
- Update the token to use the proxy contract for treasury+supplyKey
- Update the proxy contract, setting its admin key to an empty keyList (which makes the contract’s admin key the contract itself - effectively removes the admin key)
- Set the tokenId in the contract (setToken)
 
- Any address can now call the contract to mint (mint2) without needing to sign the transaction with the admin or treasury key
- Mint2 mints the token (to the contract's account)

_note: mint2 is for testing purposes, mint is the "real" function to eventually call which will mint + transfer to an account_

_note: I didn’t put any msg.sender checks in the contract just to demonstrate it all works._

_note: associating the contract to the token prior to setting the contract to be the treasury may no longer be required in the future: https://github.com/hashgraph/hedera-services/issues/3008_

## Setup environment

Please refer to the main [readme](../README.md)

## Installation

```shell
cd upgradble-proxy-mint
npm install
truffle compile --all
```

## Run

```shell
node index.js 
```

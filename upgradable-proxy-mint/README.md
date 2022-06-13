# Contract Mint to

Shows how a contract can act as the treasury and supply manager for a native HTS token through a proxy.

The steps are:
- Create two accounts (Admin and Alice)
- Create an ERC-20 contract
- Create a proxy contract with an admin key, setting the ERC20 contract as the "logic" contract
- Create a management contract to interact with the precompiled token service contract
- Create a token with an accountId and key for treasury and supply
- Associate the proxy contract with the token
- Associate Alice with the token
- Update the token to use the proxy contract for treasury+supplyKey
- Update the proxy contract, setting its admin key to an empty keyList (which makes the contract’s admin key the contract itself - effectively removes the admin key)
- Set the tokenId in the contract (setToken)
 
_note: associating the contract to the token prior to setting the contract to be the treasury may no longer be required in the future: https://github.com/hashgraph/hedera-services/issues/3008_

## Setup environment

Please refer to the main [readme](../README.md)

in addition, to avoid repeating account creation, you may reuse accounts by adding them to `.env` after you created them the first time.

the script will top up these accounts from `operator` to ensure sufficient funds are available to run the script.

```text
ADMIN_ACCOUNT=0.0.
ADMIN_KEY=302...
ALICE_ACCOUNT=0.0.
ALICE_KEY=302...
```

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

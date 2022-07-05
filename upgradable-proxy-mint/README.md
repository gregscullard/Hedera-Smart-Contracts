# Contract Mint to

Shows how a contract can act as the treasury and supply manager for a native HTS token through a proxy.

The challenge with upgradable contracts is that the logic contract which may be updated can't "own" the token (be the treasury and supply key).

This solution shows how the end result can be achieved, a proxy contract is deployed along with a logic contract (`HederaERC20.sol`).
The logic contract calls another contract (`HTSTokenOwner.sol`) to manage the HTS token. When the solution is setup, the `HTSTokenOwner` contract acts as both the treasury for the token and the supply key meaning all mint/burn operations can be managed by the contract.
The logic contract can later be updated and be made to point at the existing `HTSTokenOwner` contract enabling logic upgrades to be performed.

The steps are:
- Create two accounts (Admin and Alice)
- Create an `ERC-20` contract (the logic contract)
- Create a `proxy` contract, setting the ERC20 contract as the "logic" contract
- Create a `token owner` contract to interact with the precompiled token service contract
- Create a token with the `admin` account and key for treasury and supply
- Associate the `token owner` contract with the token
- Associate Alice with the token
- Update the token to use the `token owner` contract for treasury and supplyKey
- Update the `token owner` contract, setting its admin key to an empty keyList (which makes the contract’s admin key the contract itself - effectively removes the admin key)
- Set the `tokenOwnerAddress` and `tokenAddress` in the ERC20 contract (setToken)
 
_note: associating the contract to the token prior to setting the contract to be the treasury may no longer be required in the future: https://github.com/hashgraph/hedera-services/issues/3008_

_note: the example doesn't check that the contract calling the `HTSTokenOwner` contract is the `ERC20 contract`, this should be implemented, as well as the means to update the `ERC20 contract` address in the `HTSTokenOwner` contract when it is upgraded.

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
node deployAndSetup.js 
```

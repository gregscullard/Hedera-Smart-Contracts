# Contract Mint to

Shows how a contract can act as the treasury and supply manager for a native HTS token.

The steps are:
- Create a contract with an admin key
- Create a token with an accountId and key for treasury and supply
- Associate the contract with the token
- Update the token to use the contract for treasury+supplyKey
- Update the contract, setting its admin key to an empty keyList (which makes the contract’s admin key the contract itself - effectively removes the admin key)
- Set the tokenId in the contract (setToken)
- Any address can now call the contract to mintTo without needing to sign the transaction with the admin or treasury key
- MintTo mints the token (to the contract's account) and then transfers the token to the specified address (alice)

_note: I didn’t put any msg.sender checks in the contract just to demonstrate it all works._

_note: associating the contract to the token prior to setting the contract to be the treasury may no longer be required in the future: https://github.com/hashgraph/hedera-services/issues/3008_
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
node test01.js 
```

outputs (your own contract IDs and addresses will vary)

```shell
contract bytecode file: 0.0.34739382
Mom contract ID: 0.0.34739383
Mum name is : Alice
Mum age is : 50
Daughter contract address is : 0x00000000000000000000000000000000021214b8
Daughter contract Id is : 0.0.00000000000000000000000000000000021214b8
Daughter name is : Carol
Daughter age is : 20
```

# Switch token supply to contract

Shows how after creating a native token, a contract can act as the supply manager for the token.

The steps are:
- Create a contract with an admin key
- Create a token with an admin key, treasury accountId and threshold key (2 of 3) for supply 
- Update the token to use the contract for supplyKey
- Update the contract, setting its admin key to an empty keyList (which makes the contract’s admin key the contract itself - effectively removes the admin key)
- Set the tokenId in the contract (setToken)
- By default the contract's collateralisation is 0
- Attempt to mint tokens via the contract
- Minting fails
- Set collateralisation to 100%
- Attempt to mint tokens via the contract
- Minting succeeds

_note: I didn’t put any msg.sender checks in the contract's mint function just to demonstrate it all works._

## Setup environment

Please refer to the main [readme](../README.md)

## Installation

```shell
npm install --force
npm run build # to recompile the contracts (ignore warnings)
```

## Run

```shell
cd src
node index.js 
```

outputs (your own contract IDs and addresses will vary)

```shell
STEP 1 - Create account(s)
- Treasury account is 0.0.48114696

STEP 2 - Create token
- Token created 0.0.48114697

STEP 3 - Create file
- The smart contract bytecode file ID is: 0.0.48114698
- Content added

STEP 4 - Create contract
- Contract created 0.0.48114700

STEP 5 - Update the token
- Token updated

STEP 6 - Update Contract
- contract updated

STEP 7 - Query Contract
- contract admin key is now 0.0.48114700
- this matches the contractId as expected

STEP 8 - call the contract to set the token id

STEP 9 - Token supply before mint (should be 0)
- Token supply before mint is 0

STEP 10 - minting 10 - expecting it to fail (collateral != 100%)
- Contract reverted as expected

STEP 11 - Token supply after mint failure should be 0 due to under-collateralisation
- Token supply after mint is 0

STEP 12 - Setting collateralisation to 100%
- Collateralisation set to 100%

STEP 13 - minting 10, this should work since collateralisation is now 100%

STEP 14 - Token supply after mint should be 10
- Token supply after mint is 10
```

# Child Contract

Shows a contract `MomContract` creating another contract `DaughterContract` when `MomContract` is constructed.

The example also queries `MomContract` and `DaughterContract` to show the construction was successful

## Installation

```shell
npm install
npm run build # to recompile the contracts
cp .env.sample .env
nano .env # edit the OPERATOR_ID and OPERATOR_KEY to match your Hedera Account and Private Key
```

## Run

```shell
cd src
node index.js 
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

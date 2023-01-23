## Setup

Note: Got this to work with Java 14

### Get a private/public key from https://portal.hedera.com

create `.env` file with your credentials

```shell
cp .env.sample .env
nano .env
```

set `WEB3J_PRIVATE_KEY=` and `WEB3J_PUBLIC_KEY=` according to the information from the portal.

also set `OPERATOR_ID` and `OPERATOR_KEY` to match your portal's ED25519 account (this is to create the contract using the SDK).

### Gradle

```shell
./gradlew assemble
```

### Generate Java wrappers

This will compile the `.sol` files present in the project and create java wrappers in `build/generated/sources/web3j/org.web3j.generated.contracts`

```shell
./gradlew generateContractWrappers
```

### Gradle build
```shell
./gradlew build
```

### Run

Run /src/main/java/StatefulApp.java

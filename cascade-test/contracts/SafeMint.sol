// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.10;

import "./Hip-206/HederaTokenService.sol";

contract SafeMint is HederaTokenService {

    function safeMintToken(address token, uint64 amount, bytes[] memory metadata) internal
    returns (int responseCode, uint64 newTotalSupply, int64[] memory serialNumbers) {

        (responseCode, newTotalSupply, serialNumbers) = HederaTokenService.mintToken(token, amount, metadata);

        require(responseCode == HederaResponseCodes.SUCCESS, "Safe mint failed!");
    }
}
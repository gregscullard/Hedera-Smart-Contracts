// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";

contract Dummy is HederaTokenService {
    function associateMe(address tokenId) public {
        int responseCode = HederaTokenService.associateToken(address(this), tokenId);
        require (responseCode == HederaResponseCodes.SUCCESS, "Failed to associate");
    }
}

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";

contract Escrow is HederaTokenService {

    function list(address tokenAddress, int64 serial, uint256 price) external {
        // associate contract with tokenId
        HederaTokenService.associateToken(address(this), tokenAddress);
        HederaTokenService.transferNFT(tokenAddress, msg.sender, address(this), serial);
    }
}

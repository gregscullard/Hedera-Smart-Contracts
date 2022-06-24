// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Escrow is HederaTokenService {

    function list(address tokenAddress, uint256 serial, uint256 price) external {
        // associate contract with tokenId
        HederaTokenService.associateToken(address(this), tokenAddress);
                ( bool success, ) = tokenAddress.delegatecall(
                    abi.encodeWithSelector(
                        IERC721.transferFrom.selector,
                        msg.sender,
                        address(this),
                        serial
                    )
                );

        if (!success) {
            // This error gets thrown
            revert("transfer failed!");
        }
    }
}

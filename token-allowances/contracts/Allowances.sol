// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Allowances is HederaTokenService {

    function approveTokenDelegate(address tokenAddress, address spender, uint256 amount) external returns (bool result) {
        ( bool success, ) = tokenAddress.delegatecall(
            abi.encodeWithSelector(
                IERC20.approve.selector,
                spender,
                amount
            )
        );
        return success;
    }

    function checkAllowance(address tokenAddress, address owner, address spender) external returns (uint256 amount) {
        return IERC20(tokenAddress).allowance(owner, spender);
    }
}

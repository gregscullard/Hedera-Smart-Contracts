// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import './Chef.sol';

contract CallChefDelegate {
    function callChef(Chef chef, address token) public {
        (bool success, ) = address(chef).delegatecall(
            abi.encodeWithSignature("updatePool(address)", token)
        );

        require(success);
    }
}
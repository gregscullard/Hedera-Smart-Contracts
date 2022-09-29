// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import './Chef.sol';

contract CallChef {
    function callChef(Chef chef, address token) public {
        chef.updatePool(token);
    }
}
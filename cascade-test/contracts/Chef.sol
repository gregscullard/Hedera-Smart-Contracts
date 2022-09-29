// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import './SafeMint.sol';

contract Chef is SafeMint {
    function updatePool(address token) public {
        safeMintToken(token, 1, new bytes[](0));
    }
}
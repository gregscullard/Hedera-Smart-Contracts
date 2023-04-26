// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;

contract Payable {

    uint256 price;

    function setPrice(uint256 _price) public {
        price = _price;
    }

    function purchase() public payable {
        require(msg.value == price, "Payment too low");
    }
}

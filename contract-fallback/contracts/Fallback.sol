// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;

contract Fallback {

    string status = "init";

    receive() external payable {
        // executes on calls to the contract with no data (calldata), such as calls made via send() or transfer().
        status = "receive";
    }

    fallback() external payable {
        // When no other function matches (not even the receive function). Optionally payable
        status = "fallback";
    }

    function getStatus() public view returns (string memory) {
        return status;
    }

    function setStatus(string memory value) external {
        status = value;
    }

}

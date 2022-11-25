// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
import "./HTSLogic.sol";
import "./HederaERC1967Proxy.sol";

contract HTSFactory {
    function createHTS() public returns (address logicAddress, address proxyAddress) {
        bytes memory data = new bytes(0);

        HTSLogic htsLogic = new HTSLogic();

        HederaERC1967Proxy proxy = new HederaERC1967Proxy(
            address(htsLogic), data
        );

        return (address(htsLogic), address(proxy));
    }
}

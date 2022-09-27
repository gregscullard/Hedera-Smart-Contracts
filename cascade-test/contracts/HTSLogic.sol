// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./hip-206/HederaTokenService.sol";
import "./HTSInterface.sol";

contract HTSLogic is HederaTokenService {

    function mintCall(address tokenAddress) external {
        (int256 responseCode, , ) = HederaTokenService
        .mintToken(tokenAddress, uint64(1), new bytes[](0));
        require(responseCode == HederaResponseCodes.SUCCESS, "Error");
    }

    function mintDelegate(address tokenAddress) external {
        (bool success, bytes memory result) = address(HederaTokenService.precompileAddress).delegatecall(
            abi.encodeWithSelector(
                IHederaTokenService.mintToken.selector,
                tokenAddress,
                1,
                new bytes[](0)
            )
        );
        require(success);
        (int256 responseCode, , ) = abi.decode(result, (int256, uint64, int64[]));
        require(responseCode == HederaResponseCodes.SUCCESS, "Error");
    }

    function mintCallInterfaceCall(HTSInterface interfaceAddress, address tokenAddress) external returns (int256) {
        return interfaceAddress.mintCall(tokenAddress);
    }

    function mintCallInterfaceDelegate(HTSInterface interfaceAddress, address tokenAddress) external returns (int256) {
        return interfaceAddress.mintDelegate(tokenAddress);
    }

    function mintDelegateInterfaceCall(HTSInterface interfaceAddress, address tokenAddress) external returns (int256) {
        (bool success, bytes memory result) = address(interfaceAddress).delegatecall(
            abi.encodeWithSignature("mintCall(address)", tokenAddress)
        );

        require(success);
        (int256 responseCode, , ) = abi.decode(result, (int256, uint64, int64[]));
//        require(responseCode == HederaResponseCodes.SUCCESS, "Error");
        return responseCode;
    }

    function mintDelegateInterfaceDelegate(HTSInterface interfaceAddress, address tokenAddress) external returns (int256) {
        (bool success, bytes memory result) = address(interfaceAddress).delegatecall(
            abi.encodeWithSignature("mintDelegate(address)", tokenAddress)
        );

        require(success);
        (int256 responseCode, , ) = abi.decode(result, (int256, uint64, int64[]));
//        require(responseCode == HederaResponseCodes.SUCCESS, "Error");
        return responseCode;
    }
}

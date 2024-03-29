// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./hip-206/HederaTokenService.sol";

contract HTSInterface is HederaTokenService {

    function mintCall(address tokenAddress) external {
        (int responseCode, , ) = HederaTokenService
        .mintToken(tokenAddress, uint64(1), new bytes[](0));
        require(responseCode == HederaResponseCodes.SUCCESS, "Error");
//        return responseCode;
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
        (int responseCode, , ) = abi.decode(result, (int, uint64, int64[]));
//        return responseCode;
        require(responseCode == HederaResponseCodes.SUCCESS, "Error");
    }
}

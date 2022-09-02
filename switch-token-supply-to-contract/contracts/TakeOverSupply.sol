// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";

abstract contract HederaToken {
    function name() public virtual view returns(string memory);
}

contract TakeOverSupply is HederaTokenService {

    address tokenAddress;
    uint8 collateralisation = 0;

    function setToken(address _tokenAddress) external {
        require (tokenAddress == address(0));
        tokenAddress = _tokenAddress;
    }

    function setCollateralisation(uint8 _collateralisation) external {
        collateralisation = _collateralisation;
    }

    function mint(uint64 quantity) external {
        require (collateralisation == 100);
        (int response, uint64 newTotalSupply, int64[] memory serialNumbers) = HederaTokenService.mintToken(tokenAddress, quantity, new bytes[](0));

        if (response != HederaResponseCodes.SUCCESS) {
            revert ("Mint Failed");
        }
    }
}

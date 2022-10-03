// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
pragma experimental ABIEncoderV2;

import "./hts-precompile/HederaTokenService.sol";
import "./hts-precompile/IHederaTokenService.sol";
import './hts-precompile/ExpiryHelper.sol';
import './hts-precompile/HederaResponseCodes.sol';

contract CreateTokenInterface is HederaTokenService, ExpiryHelper {

    using Bits for uint;

    function createFungibleToken(address supplyKeyAddress, bool delegate) external payable returns (address tokenAddress) {
        uint256 supplyKeyType;
        IHederaTokenService.KeyValue memory supplyKeyValue;

        supplyKeyType = supplyKeyType.setBit(4);
        if (delegate) {
            supplyKeyValue.contractId = supplyKeyAddress;
        } else {
            supplyKeyValue.delegatableContractId = supplyKeyAddress;
        }
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey(supplyKeyType, supplyKeyValue);

        IHederaTokenService.Expiry memory expiry;
        expiry.autoRenewAccount = address(this);
        expiry.autoRenewPeriod = 7000000;

        IHederaTokenService.HederaToken memory myToken;
        myToken.name = "TestToken";
        myToken.symbol = "TT";
        myToken.treasury = address(this);
        myToken.expiry = expiry;
        myToken.tokenKeys = keys;

        if (!delegate) {
        (int responseCode, address _token) = createFungibleToken(myToken, 1, 8);
            require(responseCode == HederaResponseCodes.SUCCESS, "Create token should be successful.");
            return _token;
        } else {
            (bool success, bytes memory result) = address(HederaTokenService.precompileAddress).delegatecall(
                abi.encodeWithSelector(IHederaTokenService.createFungibleToken.selector,  myToken, 1, 8, 2, new bytes[](0))
            );
            require(success);
            (int responseCode, , ) = abi.decode(result, (int, uint64, int64[]));
            require(responseCode == HederaResponseCodes.SUCCESS, "Error");
        }
    }

    function mintToken(address tokenAddress, bool delegate) external {
        if (!delegate) {
            (int responseCode, , ) = HederaTokenService.mintToken(tokenAddress, uint64(1), new bytes[](0));
            require(responseCode == HederaResponseCodes.SUCCESS, "Error");
        } else {
            (bool success, bytes memory result) = address(HederaTokenService.precompileAddress).delegatecall(
                abi.encodeWithSelector(IHederaTokenService.mintToken.selector, tokenAddress, 1, new bytes[](0))
            );
            require(success);
            (int responseCode, , ) = abi.decode(result, (int, uint64, int64[]));
            require(responseCode == HederaResponseCodes.SUCCESS, "Error"); 
        }
    }
}

library Bits {

    uint constant internal ONE = uint(1);

    // Sets the bit at the given 'index' in 'self' to '1'.
    // Returns the modified value.
    function setBit(uint self, uint8 index) internal pure returns (uint) {
        return self | ONE << index;
    }
}
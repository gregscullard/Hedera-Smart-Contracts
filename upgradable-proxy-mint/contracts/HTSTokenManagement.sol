// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./hip-206/HederaTokenService.sol";

contract HTSTokenManagement is HederaTokenService {

    address public erc20address;
    event LogMsgSender(address who);

    constructor() {
    }

    function setERC20Address(address _erc20address) external {
        require(erc20address == address(0), "ERC20 address already defined");
        erc20address = _erc20address;
    }

    function mintTokenCall(address tokenAddress, uint256 amount) external returns (bool) {
        (int256 responseCode, uint64 newTotalSupply, int64[] memory serialNumbers) = HederaTokenService
        .mintToken(tokenAddress, uint64(amount), new bytes[](0));
        return _checkResponse(responseCode);
    }

    function mintTokenDelegate(address tokenAddress, uint256 amount) external returns (bool) {
        (bool success, bytes memory result) = precompileAddress.delegatecall(
            abi.encodeWithSelector(IHederaTokenService.mintToken.selector, tokenAddress, uint256(amount), new bytes[](0)));
        return success;
    }

    function mintToken(address tokenAddress, uint256 amount) external returns (bool) {
        //TODO: check the ERC20 contract is calling this function
        //        require (msg.sender == erc20address, toString(abi.encodePacked(msg.sender)));

        //        emit LogMsgSender(msg.sender);
        //                return true;
        (int256 responseCode, uint64 newTotalSupply, int64[] memory serialNumbers) = HederaTokenService
        .mintToken(tokenAddress, uint64(amount), new bytes[](0));
        return _checkResponse(responseCode);

        //        (bool success, bytes memory result) = precompileAddress.delegatecall(
        //            abi.encodeWithSelector(IHederaTokenService.mintToken.selector, tokenAddress, uint256(amount), new bytes[](0)));
        //        return success;
    }

    function transfer(address tokenAddress, address from, address to, uint256 amount) external returns (bool) {
        //TODO: check the ERC20 contract is calling this function
//        require (msg.sender == erc20address, "Not allowed to call");

        int256 transferResponse = HederaTokenService.transferToken(tokenAddress, from, to, int64(int256(amount)));

        return _checkResponse(transferResponse);
    }

    function _checkResponse(int256 responseCode) internal returns (bool) {
        require(responseCode == HederaResponseCodes.SUCCESS, "Error");
        return true;
    }

    function toString(bytes memory data) public pure returns(string memory) {
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint i = 0; i < data.length; i++) {
            str[2+i*2] = alphabet[uint(uint8(data[i] >> 4))];
            str[3+i*2] = alphabet[uint(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }
}

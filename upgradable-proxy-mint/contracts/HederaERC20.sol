// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./hip-206/HederaTokenService.sol";
import "./HTSTokenManagement.sol";

contract HederaERC20 is IERC20, HederaTokenService {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    HTSTokenManagement tokenManagementAddress;
    address tokenAddress;

    uint64 constant MAX_INT = 2**64 - 1;

    constructor() {
    }

    function setTokenManagementAddress(HTSTokenManagement _tokenManagementAddress, address _tokenAddress) external {
        //TODO: Check contract address has not yet been set - this errors at the moment
        //require(tokenManagementAddress == address(0), "Token address management already defined");
        require(tokenAddress == address(0), "Token address already defined");
        tokenManagementAddress = _tokenManagementAddress;
        tokenAddress = _tokenAddress;
    }

    function name() external view returns(string memory ){
        return IERC20Metadata(tokenAddress).name();
    }

    function symbol() external view returns(string memory) {
        return IERC20Metadata(tokenAddress).symbol();
    }

    function totalSupply() external view returns (uint256) {
        return IERC20(tokenAddress).totalSupply();
    }

    function balanceOf(address account) public view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(account);
    }

    function decimals() public view returns (uint8) {
        return IERC20Metadata(tokenAddress).decimals();
    }

    function mint(address account, uint256 amount) external returns (bool) {

//        (bool success, bytes memory result) = precompileAddress.delegatecall(
//            abi.encodeWithSelector(IHederaTokenService.mintToken.selector, tokenAddress, uint64(amount), new bytes[](0)));

        (bool success) = tokenManagementAddress.mintToken(tokenAddress, amount);
        require(success, "Minting error");

//        _transfer(address(this), account, amount);
        return success;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        require(false, "Function not implemented HIP 336");
        return(0);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        require(false, "Function not implemented HIP 336 ");
        return(false);
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(false, "Function not implemented HIP 336");
        return(false);
    }

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(balanceOf(from) >= amount, "Insufficient token balance");

        bool result = tokenManagementAddress.transfer(tokenAddress, from, to, amount);
        require(result, "Transfer error");
        return true;
    }

    function _checkResponse(int256 responseCode) internal returns (bool) {
        require(responseCode == HederaResponseCodes.SUCCESS, "Error");
        return true;
    }
}

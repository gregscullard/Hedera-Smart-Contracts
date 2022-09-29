pragma solidity ^0.8.10;
import './MsgSender.sol';

contract Logic {
 MsgSender msgSenderAddress;

 function getOwnSender() public view returns (address sender) {
  return msg.sender;
 }
 function getSenderCall(MsgSender addr) public view returns (address sender) {
  return addr.getSender();
 }
 function getSenderDelegate(MsgSender addr) public returns (address sender) {
  (bool success, bytes memory result) = address(addr).delegatecall(
     abi.encodeWithSignature("getSender()")
  );
  require(success);
  return abi.decode(result, (address));
 }
}

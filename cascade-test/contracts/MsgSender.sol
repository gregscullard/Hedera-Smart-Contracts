pragma solidity ^0.8.10;
contract MsgSender {
    function getSender() public view returns (address msgSender) {
        return msg.sender;
    }
}
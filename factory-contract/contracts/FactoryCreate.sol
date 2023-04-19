pragma solidity ^0.6.2;
import "./ChildContract.sol";

contract FactoryCreate {
  ChildContract public child;

  function createChild() public returns(address childAddress) {
    child = new ChildContract("init");
    return address(child);
  }
}

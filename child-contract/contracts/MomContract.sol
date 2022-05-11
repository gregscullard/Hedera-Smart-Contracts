pragma solidity ^0.6.2;
import "./DaughterContract.sol";
contract MomContract {
 string public name;
 uint public age;
 DaughterContract public daughter;
 constructor(
  string memory _momsName,
  uint _momsAge,
  string memory _daughtersName,
  uint _daughtersAge
 )
  public
 {
  daughter = new DaughterContract(_daughtersName, _daughtersAge);
  name = _momsName;
  age = _momsAge;
 }
}

pragma solidity ^0.6.2;
contract ChildContract {
    string public name;

    constructor(string memory _name) public {
        name = _name;
    }

    function getName() public view returns (string memory _name) {
        return name;
    }
    function setName(string memory _name) public {
        name = _name;
    }
}

pragma solidity ^0.6.2;
contract DaughterContract {
    string public name;
    uint public age;
    constructor(
        string memory _daughtersName,
        uint _daughtersAge
    )
    public
    {
        name = _daughtersName;
        age = _daughtersAge;
    }
}
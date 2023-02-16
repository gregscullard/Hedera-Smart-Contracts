pragma solidity ^0.8.11;

import "./IPrngSystemContract.sol";

contract PseudoRandom {
    address constant PRECOMPILE_ADDRESS = address(0x169);
    uint32 public randomNumber;

    function testNumbers() public {
        randomNumber = getPseudorandomNumber(uint32(2),uint32(8));
    }

    function getPseudorandomSeed() public returns (bytes32 randomBytes) {
        (bool success, bytes memory result) = PRECOMPILE_ADDRESS.call(abi.encodeWithSelector(IPrngSystemContract.getPseudorandomSeed.selector));
        require(success);
        randomBytes = abi.decode(result, (bytes32));
    }

    /**
     * Returns a pseudorandom number in the range [lo, hi) using the seed generated from "getPseudorandomSeed"
     */
    function getPseudorandomNumber(uint32 lo, uint32 hi) public returns (uint32) {
        (bool success, bytes memory result) = PRECOMPILE_ADDRESS.call(abi.encodeWithSelector(IPrngSystemContract.getPseudorandomSeed.selector));
        require(success);
        uint32 choice;
        assembly {
            choice := mload(add(result, 0x20))
        }
        uint32 randNum = lo + (choice % (hi - lo));
        return randNum;
    }
}

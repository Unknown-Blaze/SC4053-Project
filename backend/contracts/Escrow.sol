// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Escrow {
    address public donor;
    address payable public recipient;
    uint public unlockTime;
    bool public isReleased;
    bool public isCanceled;

    enum State { Created, Released, Canceled }
    State public currentState;

    event FundsReleased(uint amount);
    event FundsCanceled(uint amount);

    constructor(address payable _recipient, uint _unlockTime) payable {
        donor = msg.sender;
        recipient = _recipient;
        unlockTime = _unlockTime;
        currentState = State.Created;
    }

    function release() public {
        require(msg.sender == donor, "Only donor can release funds.");
        require(block.timestamp >= unlockTime, "Cannot release funds before unlock time.");
        require(currentState == State.Created, "Funds have already been handled.");

        isReleased = true;
        currentState = State.Released;
        recipient.transfer(address(this).balance);
        emit FundsReleased(address(this).balance);
    }

    function cancel() public {
        require(msg.sender == donor, "Only donor can cancel.");
        require(currentState == State.Created, "Funds have already been handled.");

        isCanceled = true;
        currentState = State.Canceled;
        payable(donor).transfer(address(this).balance);
        emit FundsCanceled(address(this).balance);
    }
}
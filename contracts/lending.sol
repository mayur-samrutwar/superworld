// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IUserProfile {
    function isUserVerified(address) external view returns (bool);
}

contract SimpleLending is ReentrancyGuard, Ownable {
    IUserProfile public constant USER_PROFILE = 
        IUserProfile(0x44C8b42d8147d2A320Fc58B232d2e9f13895D7B4);
    
    struct Deposit {
        uint256 amount;
        uint256 startTime;
        uint256 maturityDate;
        uint256 lockMonths;
    }
    
    struct Loan {
        uint256 amount;
        uint256 startTime;
        uint256 nextPaymentDue;
        uint256 totalPaid;
        uint256 monthlyPayment;
        bool active;
        bool defaulted;
    }

    // Constants
    uint256 public constant LEND_RATE = 1200; // 12% APY in basis points
    uint256 public constant BORROW_RATE = 1300; // 13% APR in basis points
    uint256 public constant MAX_LEND = 1 ether;
    uint256 public constant MAX_BORROW = 0.1 ether;
    uint256 public constant PENALTY_RATE = 500; // 5% penalty
    uint256 public constant LIQUIDATION_PERIOD = 60 days;
    
    // Configurable settings
    uint256 public minLockMonths = 3;
    uint256 public totalLiquidity;
    uint256 public totalDefaults;
    uint256 public insurancePool;
    uint256 public collectedFees;

    // Mappings
    mapping(address => Deposit) public deposits;
    mapping(address => Loan) public loans;
    mapping(address => uint256) public pendingWithdrawals;

    // Events
    event Deposited(address indexed user, uint256 amount, uint256 lockMonths);
    event Withdrawn(address indexed user, uint256 amount, uint256 penalty);
    event LoanTaken(address indexed borrower, uint256 amount);
    event LoanRepaid(address indexed borrower, uint256 amount);
    event LoanDefaulted(address indexed borrower);
    event LockPeriodUpdated(uint256 newMinPeriod);
    event FeesWithdrawn(uint256 amount);
    event InsuranceFunded(uint256 amount);

    constructor() Ownable(msg.sender) {}

    //////////////////////////
    /// LENDER FUNCTIONS ///
    ////////////////////////

    function deposit(uint256 lockMonths) external payable nonReentrant {
        require(msg.value > 0, "Cannot deposit 0");
        require(lockMonths >= minLockMonths, "Lock period too short");
        require(
            deposits[msg.sender].amount + msg.value <= MAX_LEND,
            "Exceeds max deposit"
        );
        
        deposits[msg.sender] = Deposit({
            amount: deposits[msg.sender].amount + msg.value,
            startTime: block.timestamp,
            maturityDate: block.timestamp + (lockMonths * 30 days),
            lockMonths: lockMonths
        });
        
        totalLiquidity += msg.value;
        emit Deposited(msg.sender, msg.value, lockMonths);
    }

    function requestWithdrawal() external nonReentrant {
        Deposit storage dep = deposits[msg.sender];
        require(dep.amount > 0, "No deposit");
        
        uint256 penalty = block.timestamp < dep.maturityDate ? 
            (dep.amount * PENALTY_RATE) / 10000 : 0;
            
        uint256 withdrawAmount = dep.amount - penalty;
        
        // Distribute penalty
        insurancePool += (penalty * 8000) / 10000; // 80% to insurance
        collectedFees += (penalty * 2000) / 10000; // 20% to fees
        
        pendingWithdrawals[msg.sender] += withdrawAmount;
        totalLiquidity -= dep.amount;
        delete deposits[msg.sender];
        
        emit Withdrawn(msg.sender, withdrawAmount, penalty);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    ///////////////////////////
    /// BORROWER FUNCTIONS ///
    /////////////////////////

    function takeLoan() external nonReentrant {
        require(USER_PROFILE.isUserVerified(msg.sender), "Unverified");
        require(loans[msg.sender].amount == 0, "Existing loan");
        require(address(this).balance >= MAX_BORROW, "Insufficient liquidity");
        
        uint256 monthlyPayment = (MAX_BORROW * BORROW_RATE) / (10000 * 12);
        
        loans[msg.sender] = Loan({
            amount: MAX_BORROW,
            startTime: block.timestamp,
            nextPaymentDue: block.timestamp + 30 days,
            totalPaid: 0,
            monthlyPayment: monthlyPayment,
            active: true,
            defaulted: false
        });
        
        totalLiquidity -= MAX_BORROW;
        payable(msg.sender).transfer(MAX_BORROW);
        
        emit LoanTaken(msg.sender, MAX_BORROW);
    }

    function repayLoan() external payable nonReentrant {
        Loan storage loan = loans[msg.sender];
        require(loan.active, "No active loan");
        
        if(block.timestamp > loan.nextPaymentDue + LIQUIDATION_PERIOD) {
            _handleDefault(msg.sender);
            revert("Loan defaulted");
        }
        
        require(msg.value == loan.monthlyPayment, "Incorrect payment amount");
        
        loan.totalPaid += msg.value;
        loan.nextPaymentDue += 30 days;
        
        // Check if loan fully repaid
        if(loan.totalPaid >= (MAX_BORROW * (BORROW_RATE + 10000)) / 10000) {
            delete loans[msg.sender];
            totalLiquidity += MAX_BORROW;
        }
        
        totalLiquidity += msg.value;
        emit LoanRepaid(msg.sender, msg.value);
    }

    ////////////////////////
    /// ADMIN FUNCTIONS ///
    //////////////////////

    function fundContract() external payable onlyOwner {
        totalLiquidity += msg.value;
        emit InsuranceFunded(msg.value);
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = collectedFees;
        collectedFees = 0;
        payable(owner()).transfer(amount);
        emit FeesWithdrawn(amount);
    }

    function setMinLockPeriod(uint256 months) external onlyOwner {
        require(months >= 3, "Minimum 3 months required");
        minLockMonths = months;
        emit LockPeriodUpdated(months);
    }

    function coverDefaults(uint256 amount) external onlyOwner {
        require(amount <= insurancePool, "Exceeds insurance pool");
        totalLiquidity += amount;
        insurancePool -= amount;
        emit InsuranceFunded(amount);
    }

    ////////////////////////
    /// VIEW FUNCTIONS ///
    //////////////////////

    function getLoanDetails(address user) public view returns (
        uint256 totalAmount,
        uint256 paidAmount,
        uint256 nextPayment,
        uint256 paymentAmount,
        bool isDefaulted
    ) {
        Loan memory loan = loans[user];
        return (
            loan.amount,
            loan.totalPaid,
            loan.nextPaymentDue,
            loan.monthlyPayment,
            loan.defaulted
        );
    }

    function getDepositDetails(address user) public view returns (
        uint256 amount,
        uint256 maturity,
        uint256 earnedInterest
    ) {
        Deposit memory dep = deposits[user];
        uint256 interest = (dep.amount * LEND_RATE * 
            (block.timestamp - dep.startTime)) / (365 days * 10000);
        return (
            dep.amount,
            dep.maturityDate,
            interest
        );
    }

    //////////////////////////
    /// INTERNAL FUNCTIONS ///
    /////////////////////////

    function _handleDefault(address borrower) internal {
        Loan storage loan = loans[borrower];
        require(!loan.defaulted, "Already defaulted");
        
        uint256 remainingDebt = MAX_BORROW - loan.totalPaid;
        totalDefaults += remainingDebt;
        loan.active = false;
        loan.defaulted = true;
        
        emit LoanDefaulted(borrower);
    }
}
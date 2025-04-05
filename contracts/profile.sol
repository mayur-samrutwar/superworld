// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UserProfile {
    struct User {
        string username;
        bool isVerified;
        string referredBy;
        string[] referrals;
        uint256 referralCount;
    }

    address public admin;
    uint256 public maxReferrals; // Universal referral limit for all users
    
    mapping(address => User) public users;
    mapping(string => address) public usernameToAddress;

    event UserCreated(address indexed userAddress, string username);
    event UsernameUpdated(address indexed userAddress, string newUsername);
    event VerificationUpdated(address indexed userAddress, bool status);
    event ReferralLimitUpdated(uint256 newLimit);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyRegisteredUser() {
        require(bytes(users[msg.sender].username).length != 0, "User not registered");
        _;
    }

    constructor(uint256 _initialMaxReferrals) {
        admin = msg.sender;
        maxReferrals = _initialMaxReferrals;
    }

    function createUser(string memory _username, string memory _referredBy) external {
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(users[msg.sender].username).length == 0, "User already exists");
        
        User storage newUser = users[msg.sender];
        newUser.username = _username;
        newUser.isVerified = true;
        newUser.referredBy = bytes(_referredBy).length > 0 ? _referredBy : "aaaa";
        newUser.referrals.push(_username);

        usernameToAddress[_username] = msg.sender;
        emit UserCreated(msg.sender, _username);
    }

    function updateUsername(string memory _newUsername) external onlyRegisteredUser {
        require(bytes(_newUsername).length > 0, "New username cannot be empty");
        users[msg.sender].username = _newUsername;
        emit UsernameUpdated(msg.sender, _newUsername);
    }

    function updateVerificationStatus(address _user, bool _status) external onlyAdmin {
        users[_user].isVerified = _status;
        emit VerificationUpdated(_user, _status);
    }

    function setMaxReferrals(uint256 _max) external onlyAdmin {
        maxReferrals = _max;
        emit ReferralLimitUpdated(_max);
    }

    function addReferral(address _user, string memory _referralCode) external onlyAdmin {
        require(users[_user].referralCount < maxReferrals, "Global referral limit reached");
        users[_user].referrals.push(_referralCode);
        users[_user].referralCount++;
    }

    function checkReferredBy(address _user) external view returns (string memory) {
        return users[_user].referredBy;
    }

    function getUserReferrals(address _user) external view returns (string[] memory) {
        return users[_user].referrals;
    }

    function getVerificationStatus(address _user) external view returns (bool) {
        return users[_user].isVerified;
    }

    function isUsernameAvailable(string memory _username) external view returns (bool) {
        return usernameToAddress[_username] == address(0);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UserProfile {
    struct User {
        string username;
        bool isVerified;
        address referredBy; // Now stores address instead of string
        string[] referrals;
        uint256 referralCount;
    }

    address public admin;
    uint256 public maxReferrals;
    mapping(address => User) public users;
    mapping(string => address) public usernameToAddress;

    event UserCreated(address indexed userAddress, string username, address referredBy);
    event UserVerified(address indexed userAddress);
    event ReferralAdded(address indexed referrer, address indexed newUser);

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
        
        // Create admin user
        users[admin] = User({
            username: "mrsr.0000",
            isVerified: true,
            referredBy: address(0),
            referrals: new string[](0),
            referralCount: 0
        });
        usernameToAddress["mrsr.0000"] = admin;
    }

    function createUser(address _newUser, string memory _username) external onlyRegisteredUser {
        require(_newUser != address(0), "Invalid address");
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(users[_newUser].username).length == 0, "User already exists");
        require(users[msg.sender].referralCount < maxReferrals, "Referral limit reached");

        users[_newUser] = User({
            username: _username,
            isVerified: false, // New users start unverified
            referredBy: msg.sender, // Automatically set to referrer
            referrals: new string[](0),
            referralCount: 0
        });

        usernameToAddress[_username] = _newUser;
        users[msg.sender].referrals.push(_username);
        users[msg.sender].referralCount++;

        emit UserCreated(_newUser, _username, msg.sender);
        emit ReferralAdded(msg.sender, _newUser);
    }

    function verifyUser(address _user) external onlyAdmin {
        users[_user].isVerified = true;
        emit UserVerified(_user);
    }

    function setMaxReferrals(uint256 _max) external onlyAdmin {
        maxReferrals = _max;
    }

    function getReferrer(address _user) external view returns (address) {
        return users[_user].referredBy;
    }

    function isUserVerified(address _user) external view returns (bool) {
        return users[_user].isVerified;
    }
}
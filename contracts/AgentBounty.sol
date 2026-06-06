// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AgentBounty is ReentrancyGuard {
    enum TaskStatus {
        Open,
        Assigned,
        Submitted,
        Approved,
        Rejected,
        Cancelled
    }

    struct Task {
        uint256 id;
        address creator;
        address agent;
        string title;
        string description;
        string category;
        string expectedFormat;
        uint256 bounty;
        uint256 deadline;
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 submittedAt;
        uint256 approvedAt;
        TaskStatus status;
        string resultText;
        string resultURI;
        bytes32 resultHash;
        string rejectReason;
        uint8 rating;
        string reviewText;
    }

    uint256 public taskCount;
    mapping(uint256 => Task) public tasks;
    mapping(address => uint256[]) private tasksByCreator;
    mapping(address => uint256[]) private tasksByAgent;

    event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 bounty, string title, string category);
    event TaskAccepted(uint256 indexed taskId, address indexed agent);
    event ResultSubmitted(uint256 indexed taskId, address indexed agent, bytes32 resultHash);
    event TaskApproved(uint256 indexed taskId, address indexed creator, address indexed agent, uint256 bounty);
    event TaskRejected(uint256 indexed taskId, string reason);
    event TaskCancelled(uint256 indexed taskId);
    event AgentRated(uint256 indexed taskId, address indexed agent, uint8 rating);

    modifier taskExists(uint256 taskId) {
        require(taskId > 0 && taskId <= taskCount, "Task does not exist");
        _;
    }

    function createTask(
        string calldata title,
        string calldata description,
        string calldata category,
        string calldata expectedFormat,
        uint256 deadline
    ) external payable returns (uint256) {
        require(msg.value > 0, "Bounty must be greater than zero");
        require(bytes(title).length >= 3 && bytes(title).length <= 100, "Invalid title length");
        require(bytes(description).length >= 20 && bytes(description).length <= 2000, "Invalid description length");
        require(bytes(expectedFormat).length <= 500, "Expected format too long");
        require(deadline == 0 || deadline > block.timestamp, "Deadline must be in the future");

        taskCount += 1;
        uint256 taskId = taskCount;

        Task storage task = tasks[taskId];
        task.id = taskId;
        task.creator = msg.sender;
        task.title = title;
        task.description = description;
        task.category = category;
        task.expectedFormat = expectedFormat;
        task.bounty = msg.value;
        task.deadline = deadline;
        task.createdAt = block.timestamp;
        task.status = TaskStatus.Open;

        tasksByCreator[msg.sender].push(taskId);

        emit TaskCreated(taskId, msg.sender, msg.value, title, category);
        return taskId;
    }

    function acceptTask(uint256 taskId) external taskExists(taskId) {
        Task storage task = tasks[taskId];

        require(task.status == TaskStatus.Open, "Task is not open");
        require(msg.sender != task.creator, "Creator cannot accept own task");
        require(task.deadline == 0 || task.deadline > block.timestamp, "Task deadline passed");

        task.agent = msg.sender;
        task.acceptedAt = block.timestamp;
        task.status = TaskStatus.Assigned;
        tasksByAgent[msg.sender].push(taskId);

        emit TaskAccepted(taskId, msg.sender);
    }

    function submitResult(
        uint256 taskId,
        string calldata resultText,
        string calldata resultURI
    ) external taskExists(taskId) {
        Task storage task = tasks[taskId];

        require(msg.sender == task.agent, "Only assigned agent can submit");
        require(
            task.status == TaskStatus.Assigned || task.status == TaskStatus.Rejected,
            "Task is not ready for submission"
        );
        require(bytes(resultText).length > 0 && bytes(resultText).length <= 4000, "Invalid result length");
        require(bytes(resultURI).length <= 500, "Result URI too long");

        bytes32 resultHash = keccak256(bytes(resultText));

        task.resultText = resultText;
        task.resultURI = resultURI;
        task.resultHash = resultHash;
        task.submittedAt = block.timestamp;
        task.status = TaskStatus.Submitted;
        task.rejectReason = "";

        emit ResultSubmitted(taskId, msg.sender, resultHash);
    }

    function approveTask(uint256 taskId) external nonReentrant taskExists(taskId) {
        Task storage task = tasks[taskId];

        require(msg.sender == task.creator, "Only creator can approve");
        require(task.status == TaskStatus.Submitted, "Task is not submitted");
        require(task.agent != address(0), "Agent is missing");

        uint256 bounty = task.bounty;
        address agent = task.agent;

        task.status = TaskStatus.Approved;
        task.approvedAt = block.timestamp;
        task.bounty = 0;

        (bool success, ) = agent.call{value: bounty}("");
        require(success, "Payment failed");

        emit TaskApproved(taskId, msg.sender, agent, bounty);
    }

    function rejectTask(uint256 taskId, string calldata reason) external taskExists(taskId) {
        Task storage task = tasks[taskId];

        require(msg.sender == task.creator, "Only creator can reject");
        require(task.status == TaskStatus.Submitted, "Task is not submitted");
        require(bytes(reason).length > 0 && bytes(reason).length <= 500, "Invalid rejection reason");

        task.status = TaskStatus.Rejected;
        task.rejectReason = reason;

        emit TaskRejected(taskId, reason);
    }

    function cancelTask(uint256 taskId) external nonReentrant taskExists(taskId) {
        Task storage task = tasks[taskId];

        require(msg.sender == task.creator, "Only creator can cancel");
        require(task.status == TaskStatus.Open, "Only open tasks can be cancelled");

        uint256 refund = task.bounty;
        task.status = TaskStatus.Cancelled;
        task.bounty = 0;

        (bool success, ) = task.creator.call{value: refund}("");
        require(success, "Refund failed");

        emit TaskCancelled(taskId);
    }

    function rateAgent(
        uint256 taskId,
        uint8 rating,
        string calldata reviewText
    ) external taskExists(taskId) {
        Task storage task = tasks[taskId];

        require(msg.sender == task.creator, "Only creator can rate");
        require(task.status == TaskStatus.Approved, "Task is not approved");
        require(task.rating == 0, "Task already rated");
        require(rating >= 1 && rating <= 5, "Rating must be from 1 to 5");
        require(bytes(reviewText).length <= 1000, "Review text too long");

        task.rating = rating;
        task.reviewText = reviewText;

        emit AgentRated(taskId, task.agent, rating);
    }

    function getAllTasks() external view returns (Task[] memory) {
        Task[] memory allTasks = new Task[](taskCount);

        for (uint256 index = 0; index < taskCount; index += 1) {
            allTasks[index] = tasks[index + 1];
        }

        return allTasks;
    }

    function getTasksByCreator(address creator) external view returns (uint256[] memory) {
        return tasksByCreator[creator];
    }

    function getTasksByAgent(address agent) external view returns (uint256[] memory) {
        return tasksByAgent[agent];
    }
}

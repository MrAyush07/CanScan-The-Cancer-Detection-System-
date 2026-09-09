// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CancerRecords {
    struct Record {
        uint256 id;
        bytes32 imageHash;
        string prediction;
        uint256 confidence;
        string ipfsCID;
        uint256 timestamp;
        address submittedBy;
    }

    uint256 private recordCount;

    mapping(uint256 => Record) private records;

    event RecordAdded(
        uint256 indexed id,
        bytes32 indexed imageHash,
        string prediction,
        uint256 confidence,
        string ipfsCID,
        uint256 timestamp,
        address submittedBy
    );

    function addRecord(
        bytes32 imageHash,
        string memory prediction,
        uint256 confidence,
        string memory ipfsCID
    ) public returns (uint256) {
        recordCount++;

        records[recordCount] = Record(
            recordCount,
            imageHash,
            prediction,
            confidence,
            ipfsCID,
            block.timestamp,
            msg.sender
        );

        emit RecordAdded(
            recordCount,
            imageHash,
            prediction,
            confidence,
            ipfsCID,
            block.timestamp,
            msg.sender
        );

        return recordCount;
    }

    function getRecord(uint256 id) public view returns (Record memory) {
        require(id > 0 && id <= recordCount, "Record does not exist");
        return records[id];
    }

    function getRecords() public view returns (Record[] memory) {
        Record[] memory allRecords = new Record[](recordCount);

        for (uint256 i = 1; i <= recordCount; i++) {
            allRecords[i - 1] = records[i];
        }

        return allRecords;
    }

    function verifyRecord(
        uint256 id,
        bytes32 imageHash
    ) public view returns (bool) {
        require(id > 0 && id <= recordCount, "Record does not exist");
        return records[id].imageHash == imageHash;
    }

    function getRecordCount() public view returns (uint256) {
        return recordCount;
    }
}
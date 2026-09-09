const hre = require("hardhat");

async function main() {
    const CancerRecords = await hre.ethers.getContractFactory("CancerRecords");
    const cancerRecords = await CancerRecords.deploy();

    await cancerRecords.waitForDeployment();

    console.log("CancerRecords deployed to:", await cancerRecords.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
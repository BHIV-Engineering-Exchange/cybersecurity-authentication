/**
 * Deploy BlackHole Token Contract
 * Run: npx hardhat run scripts/deploy-token.js --network testnet
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying BlackHole Token Contract...\n");
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Deploy contract
  const BlackHoleToken = await hre.ethers.getContractFactory("BlackHoleToken");
  const token = await BlackHoleToken.deploy();
  
  await token.deployed();
  
  console.log("\n✅ BlackHole Token deployed to:", token.address);
  
  // Get initial supply
  const totalSupply = await token.totalSupply();
  const decimals = await token.decimals();
  const symbol = await token.symbol();
  
  console.log("\nToken Details:");
  console.log("  Name: BlackHole Token");
  console.log("  Symbol:", symbol);
  console.log("  Decimals:", decimals.toString());
  console.log("  Total Supply:", hre.ethers.utils.formatUnits(totalSupply, decimals));
  
  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: token.address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: token.deployTransaction.hash,
    blockNumber: token.deployTransaction.blockNumber
  };
  
  fs.writeFileSync(
    'deployment-token.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📝 Deployment info saved to deployment-token.json");
  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


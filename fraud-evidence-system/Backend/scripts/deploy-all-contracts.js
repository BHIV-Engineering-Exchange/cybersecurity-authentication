/**
 * Deploy All Blockchain Contracts
 * Run: npx hardhat run scripts/deploy-all-contracts.js --network testnet
 */

const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Deploying All Blockchain Contracts...\n");
  console.log("="  .repeat(50));
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");
  
  const deployments = {};
  
  // 1. Deploy Token
  console.log("\n[1/3] Deploying BlackHole Token...");
  const BlackHoleToken = await hre.ethers.getContractFactory("BlackHoleToken");
  const token = await BlackHoleToken.deploy();
  await token.deployed();
  console.log("✅ Token deployed:", token.address);
  deployments.token = token.address;
  
  // 2. Deploy DEX
  console.log("\n[2/3] Deploying BlackHole DEX...");
  const BlackHoleDEX = await hre.ethers.getContractFactory("BlackHoleDEX");
  const dex = await BlackHoleDEX.deploy();
  await dex.deployed();
  console.log("✅ DEX deployed:", dex.address);
  deployments.dex = dex.address;
  
  // 3. Deploy Cybercrime
  console.log("\n[3/3] Deploying Cybercrime Contract...");
  const Cybercrime = await hre.ethers.getContractFactory("Cybercrime");
  const cybercrime = await Cybercrime.deploy(token.address);
  await cybercrime.deployed();
  console.log("✅ Cybercrime deployed:", cybercrime.address);
  deployments.cybercrime = cybercrime.address;
  
  // Setup roles
  console.log("\n🔧 Setting up roles...");
  
  // Grant CYBERCRIME_ROLE to Cybercrime contract on Token
  const CYBERCRIME_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("CYBERCRIME_ROLE"));
  await token.grantRole(CYBERCRIME_ROLE, cybercrime.address);
  console.log("✅ Granted CYBERCRIME_ROLE to Cybercrime contract");
  
  // Grant BRIDGE_ROLE to deployer (will be updated to actual bridge)
  const BRIDGE_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("BRIDGE_ROLE"));
  await token.grantRole(BRIDGE_ROLE, deployer.address);
  console.log("✅ Granted BRIDGE_ROLE to deployer");
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      token: {
        address: token.address,
        txHash: token.deployTransaction.hash
      },
      dex: {
        address: dex.address,
        txHash: dex.deployTransaction.hash
      },
      cybercrime: {
        address: cybercrime.address,
        txHash: cybercrime.deployTransaction.hash
      }
    }
  };
  
  fs.writeFileSync(
    `deployment-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n" + "=".repeat(50));
  console.log("✅ ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log("\nContract Addresses:");
  console.log("  Token:", deployments.token);
  console.log("  DEX:", deployments.dex);
  console.log("  Cybercrime:", deployments.cybercrime);
  console.log("\n📝 Deployment info saved to deployment-" + hre.network.name + ".json");
  console.log("\n🎯 Next Steps:");
  console.log("  1. Verify contracts on block explorer");
  console.log("  2. Update frontend with contract addresses");
  console.log("  3. Initialize bridge SDK with addresses");
  console.log("  4. Run E2E tests");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


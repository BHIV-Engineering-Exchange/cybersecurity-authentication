const Web3 = require("web3");
require("dotenv").config();

const { publishEvent } = require("./eventQueue");

const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.BLACKHOLE_WS));

// Your contract ABI and address
const contractABI = require("../abi/FlagWalletABI.json");
const contractAddress = process.env.CONTRACT_ADDRESS;

const contract = new web3.eth.Contract(contractABI, contractAddress);

function startWeb3EventListener() {
  console.log("🟢 Listening for WalletFlagged events...");

  contract.events.WalletFlagged({}, (error, event) => {
    if (error) {
      console.error("❌ Event Error:", error);
      return;
    }

    const { wallet, riskLevel } = event.returnValues;
    const txHash = event.transactionHash;

    const flagEvent = {
      wallet,
      riskLevel,
      txHash,
      timestamp: Date.now(),
    };

    console.log("✅ Event received:", flagEvent);
    publishEvent(flagEvent);
  });
}

module.exports = { startWeb3EventListener };

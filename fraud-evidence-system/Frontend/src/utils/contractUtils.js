import { ethers } from "ethers";
import CybercrimeABI from "../abi/Cybercrime.json";

const CONTRACT_ADDRESS = "0xYourDeployedContractAddress"; // Replace with your actual deployed address

export const getContract = async () => {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new ethers.providers.Web3Provider(window.ethereum); // <-- FIXED here
  await provider.send("eth_requestAccounts", []); // Prompt user to connect
  const signer = provider.getSigner();

  return new ethers.Contract(CONTRACT_ADDRESS, CybercrimeABI, signer);
};

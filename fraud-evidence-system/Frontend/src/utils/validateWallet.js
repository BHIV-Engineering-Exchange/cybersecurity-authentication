import { ethers } from "ethers";

export const validateentityId = (address) => {
  if (!address || typeof address !== "string") return { valid: false, message: "Address required." };

  if (!address.startsWith("0x") || address.length !== 42) {
    return { valid: false, message: "Invalid format. Should be 0x + 40 chars." };
  }

  try {
    const checksummed = ethers.utils.getAddress(address);
    return { valid: true, checksummed };
  } catch (err) {
    return { valid: false, message: "Invalid checksum or format." };
  }
};

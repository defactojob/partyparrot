import { solana } from "solray";

export const network: any =
  process.env.NETWORK || process.env.SOLANA_NETWORK || "local";
export const rpcHost = process.env.SOLANA_RPC_HOST; // optional
export const conn = solana.connect(network, {
  rpcHost,
});

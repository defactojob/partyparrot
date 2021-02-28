import dotenv from "dotenv";
dotenv.config();

import { Command } from "commander";
import { log } from "./logger";
import { conn, network } from "./context";
import { PublicKey } from "solray";
import { sleep } from "./utils";
import { Deployer } from "./Deployer";
import { UserDeployer } from "./UserDeployer";
import BN from "bn.js";
import { Vault } from "./schema";

const cli = new Command();

async function maybeRequestAirdrop(pubkey: PublicKey) {
  if (network != "mainnet") {
    log.info("airdrop 10 SOL", { address: pubkey.toBase58() });
    await conn.requestAirdrop(pubkey, 10 * 1e9);
    await sleep(500);
  }
}

cli.command("setup").action(async () => {
  const deployer = await Deployer.fromEnv();
  const { wallet, state } = deployer;

  await maybeRequestAirdrop(wallet.pubkey);

  await deployer.deployAll();
});

cli.command("setup-vault").action(async () => {
  const deployer = await UserDeployer.fromEnv();
  const { wallet } = deployer;

  await maybeRequestAirdrop(wallet.pubkey);

  await deployer.deployAll();
});

cli.command("stake [amount]").action(async (amountArg: string) => {
  const amount = parseInt(amountArg);
  const user = await UserDeployer.fromEnv();

  await user.stake(new BN(amount));
});

cli.command("borrow [amount]").action(async (amountArg: string) => {
  const amount = parseInt(amountArg);
  const user = await UserDeployer.fromEnv();

  await user.borrow(new BN(amount));
});

cli.command("info").action(async () => {
  const user = await UserDeployer.fromEnv();

  // (vault.collateralAmount as BN).div()
  const vault = (await Vault.load(user.state.vault)) as any;

  const price = 45000; // FIXED price for testing
  const collateralRatio = vault.collateralAmount
    .muln(price)
    .muln(100)
    .div(vault.debtAmount);
  console.log(`collateral: ${vault.collateralAmount.toString()} BTC`);
  console.log(`debt: ${vault.debtAmount.toString()} dUSD`);
  console.log(`price: ${price} USD/BTC`);
  console.log(`--------------------------------------`);
  console.log(`collateral ratio: ${collateralRatio.toString()}%`);
});

cli.parse(process.argv);

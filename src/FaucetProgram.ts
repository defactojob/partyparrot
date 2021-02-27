import { SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  Account,
  BaseProgram,
  ProgramAccount,
  PublicKey,
  SPLToken,
  System,
  Wallet,
} from "solray";
import { Drip, Faucet, FaucetConfig, InitFaucet } from "./schema";

export class FaucetProgram extends BaseProgram {
  private sys: System;
  constructor(wallet: Wallet, programID: PublicKey) {
    super(wallet, programID);
    this.sys = new System(this.wallet);
  }

  async initFaucet(instruction: InitFaucet, accounts: IInitFaucetAccounts) {
    const faucet = new Account();

    await this.sendTx(
      [
        await this.sys.createRentFreeAccountInstruction({
          newPubicKey: faucet.publicKey,
          space: Faucet.size,
          programID: this.programID,
        }),
        this.instruction(instruction.serialize(), [
          SYSVAR_RENT_PUBKEY,
          { write: faucet },
          ...Object.values(accounts),
        ]),
      ],
      [this.account, faucet],
    );

    return faucet;
  }

  async drip(instruction: Drip, accounts: IDripAccounts) {
    await this.sendTx(
      [
        this.instruction(instruction.serialize(), [
          SPLToken.programID,
          SYSVAR_CLOCK_PUBKEY,

          { write: accounts.faucet },
          { write: accounts.faucetToken },
          accounts.faucetTokenMinter.pubkey,
          { write: accounts.receiver },
        ]),
      ],
      [this.account],
    );
  }
}

interface IDripAccounts {
  faucet: PublicKey;
  faucetToken: PublicKey;
  faucetTokenMinter: ProgramAccount;
  receiver: PublicKey;
}

interface IInitFaucetAccounts {
  token: PublicKey;
}

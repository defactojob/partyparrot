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
import {
  DebtType,
  InitDebtType,
  InitVault,
  InitVaultType,
  Stake,
  Vault,
  VaultType,
} from "./schema";

interface IInitDebtTypeAccounts {
  debtType?: Account; // writable, signed
}

interface IInitVaultTypeAccounts {
  vaultType?: Account; // writable, signed
}

interface IInitVaultAccounts {
  vault?: Account; // writable, signed
}

interface IStakeAccounts {
  collateralFrom: PublicKey; // writable
  collateralFromAuthority: Account; // writable, signed
  collateralTo; // writable (program)

  vaultType: PublicKey;
  vault: PublicKey; // writable
}

export class DebtProgram extends BaseProgram {
  private sys: System;
  constructor(wallet: Wallet, programID: PublicKey) {
    super(wallet, programID);
    this.sys = new System(this.wallet);
  }

  async initDebtType(
    instruction: InitDebtType,
    accounts: IInitDebtTypeAccounts,
  ) {
    const debtType = accounts.debtType || new Account();

    await this.sendTx(
      [
        await this.sys.createRentFreeAccountInstruction({
          newPubicKey: debtType.publicKey,
          space: DebtType.size,
          programID: this.programID,
        }),
        this.instruction(instruction.serialize(), [
          SYSVAR_RENT_PUBKEY,
          { write: debtType },
        ]),
      ],
      [this.account, debtType],
    );

    return debtType;
  }

  async initVaultType(
    instruction: InitVaultType,
    accounts: IInitVaultTypeAccounts,
  ) {
    const vaultType = accounts.vaultType || new Account();

    await this.sendTx(
      [
        await this.sys.createRentFreeAccountInstruction({
          newPubicKey: vaultType.publicKey,
          space: VaultType.size,
          programID: this.programID,
        }),
        this.instruction(instruction.serialize(), [
          SYSVAR_RENT_PUBKEY,
          { write: vaultType },
        ]),
      ],
      [this.account, vaultType],
    );

    return vaultType;
  }

  async initVault(instruction: InitVault, accounts: IInitVaultAccounts = {}) {
    const vault = accounts.vault || new Account();

    await this.sendTx(
      [
        await this.sys.createRentFreeAccountInstruction({
          newPubicKey: vault.publicKey,
          space: Vault.size,
          programID: this.programID,
        }),
        this.instruction(instruction.serialize(), [
          SYSVAR_RENT_PUBKEY,
          { write: vault },
        ]),
      ],
      [this.account, vault],
    );

    return vault;
  }

  async stake(instruction: Stake, accounts: IStakeAccounts) {
    await this.sendTx(
      [
        this.instruction(instruction.serialize(), [
          SPLToken.programID,
          { write: accounts.collateralFrom },
          accounts.collateralFromAuthority,
          { write: accounts.collateralTo },
          accounts.vaultType,
          { write: accounts.vault },
        ]),
      ],
      [this.account, accounts.collateralFromAuthority],
    );
  }
}

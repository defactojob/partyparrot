import {
  BPFLoader,
  ProgramAccount,
  Account,
  PublicKey,
  SPLToken,
  Wallet,
} from "solray";
import path from "path";
import { loadJSONState } from "./json";
import { conn } from "./context";
import { Connection } from "@solana/web3.js";
import { log } from "./logger";
import { DebtProgram } from "./DebtProgram";
import { FaucetConfig, InitDebtType, InitVaultType } from "./schema";

export interface DeployState {
  debtProgram: PublicKey;

  debtToken: PublicKey;
  // TODO: serialize the ProgramAccount for simplicity?
  debtType: PublicKey;

  vaultType: PublicKey;
  collateralToken: PublicKey; // owned by admin wallet for testing
  collateralTokenHolder: PublicKey; // owned by admin wallet for testing
}

export class Deployer {
  public static async fromEnv() {
    const wallet = await Wallet.fromMnemonic(
      process.env.WALLET_MNEMONIC!,
      conn,
    );

    const state = loadJSONState<DeployState>(
      process.env.DEPLOY_FILE!,
      {} as any,
    );

    return new Deployer(state, wallet, conn);
  }

  constructor(
    public state: DeployState,
    public wallet: Wallet,
    public conn: Connection,
  ) {}

  async deployAll() {
    await this.deployProgram();

    await this.deployDebtType();
    await this.deployVaultType();
  }

  async deployDebtType() {
    if (this.state.debtToken && this.state.debtType) {
      return;
    }

    log.info("deploy debt type");

    const debtToken = new Account();
    const debtType = new Account();

    await this.program.initDebtType(
      new InitDebtType({
        debt_token: debtToken.publicKey,
        owner: this.wallet.pubkey,
      }),
      {
        debtType,
      },
    );

    // TODO: maybe serialize the program account
    const programMinter = await this.programAccount(
      debtToken.publicKey,
      "minter",
    );

    const spltoken = new SPLToken(this.wallet);
    await spltoken.initializeMint({
      account: debtToken,
      mintAuthority: programMinter.pubkey,
      decimals: 9,
    });

    this.state.debtToken = debtToken.publicKey;
    this.state.debtType = debtType.publicKey;
  }

  async deployVaultType() {
    if (this.state.collateralToken && this.state.vaultType) {
      return;
    }

    log.info("deploy vault type");

    // create a test token
    const collateralToken = new Account();
    const collateralTokenHolder = new Account();
    const vaultType = new Account();

    await this.program.initVaultType(
      new InitVaultType({
        debt_type: this.state.debtType,
        collateral_token: collateralToken.publicKey,
        collateral_token_holder: collateralTokenHolder.publicKey,
        // FIXME: switch to a real oracle...
        price_oracle: new Account().publicKey,
      }),
      {
        vaultType,
      },
    );

    // create a test collateral token using the wallet as minter
    const spltoken = new SPLToken(this.wallet);
    await spltoken.initializeMint({
      account: collateralToken,
      mintAuthority: this.wallet.pubkey,
      decimals: 9,
    });

    // initialize token's collateral holder token account
    const programHolder = await this.programAccount(vaultType.publicKey, "holder")
    await spltoken.initializeAccount({
      token: collateralToken.publicKey,
      owner: programHolder.pubkey,
      account: collateralTokenHolder,
    });


    this.state.collateralToken = collateralToken.publicKey;
    this.state.vaultType = vaultType.publicKey;
    this.state.collateralTokenHolder = collateralTokenHolder.publicKey;
  }

  async deployProgram() {
    if (this.state.debtProgram) {
      return;
    }

    const binPath = path.join(__dirname, "..", "build/solana_faucet.so");
    log.info("deploy", { bin: binPath });

    const faucetProgramAccount = await this.wallet.loadProgram(binPath);
    this.state.debtProgram = faucetProgramAccount.publicKey;
  }

  get program(): DebtProgram {
    return new DebtProgram(this.wallet, this.state.debtProgram);
  }

  async programAccount(
    parent: PublicKey,
    role: string,
  ): Promise<ProgramAccount> {
    const paccount = await ProgramAccount.forSeeds(
      [parent.toBuffer(), Buffer.from(role)],
      this.state.debtProgram,
    );
    return paccount;
  }
}

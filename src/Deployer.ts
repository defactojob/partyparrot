import { BPFLoader, ProgramAccount, PublicKey, SPLToken, Wallet } from "solray";
import path from "path";
import { loadJSONState } from "./json";
import { conn } from "./context";
import { Account, Connection } from "@solana/web3.js";
import { log } from "./logger";
import { FaucetProgram } from "./FaucetProgram";
import { FaucetConfig, InitFaucet } from "./schema";

export interface DeployState {
  faucetProgram: PublicKey;
  faucet: PublicKey;

  faucetTokenInitialized: boolean;
  faucetToken: Account;
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

    await this.deployFaucet();
    await this.deployFaucetToken();
  }

  async deployProgram() {
    if (this.state.faucetProgram) {
      return;
    }

    const binPath = path.join(__dirname, "..", "build/solana_faucet.so");
    log.info("deploy", { bin: binPath });

    const faucetProgramAccount = await this.wallet.loadProgram(binPath);
    this.state.faucetProgram = faucetProgramAccount.publicKey;
  }

  get faucetProgram() {
    return new FaucetProgram(this.wallet, this.state.faucetProgram);
  }

  async deployFaucet() {
    if (this.state.faucet) {
      return;
    }

    this.state.faucetToken = new Account();

    const faucet = await this.faucetProgram.initFaucet(
      new InitFaucet({
        config: new FaucetConfig({
          amount: 10,
        }),
      }),
      {
        token: this.state.faucetToken.publicKey,
      },
    );

    this.state.faucet = faucet.publicKey;
  }

  private async deployFaucetToken() {
    if (this.state.faucetTokenInitialized) {
      return;
    }

    log.info("create faucet token");

    const minter = await this.faucetTokenMinter();
    const spltoken = new SPLToken(this.wallet);

    await spltoken.initializeMint({
      account: this.state.faucetToken,
      mintAuthority: minter.pubkey,
      decimals: 9,
    });

    this.state.faucetTokenInitialized = true;
  }

  async faucetTokenMinter(): Promise<ProgramAccount> {
    const paccount = await ProgramAccount.forSeeds(
      [this.state.faucet.toBuffer(), Buffer.from("minter")],
      this.state.faucetProgram,
    );
    return paccount;
  }
}

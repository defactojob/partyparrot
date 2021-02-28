import { ProgramAccount, PublicKey, SPLToken, Wallet } from "solray";
import { Borrow, InitVault, Stake } from "./schema";
import { loadJSON, loadJSONState } from "./json";
import { conn } from "./context";
import { DeployState } from "./Deployer";
import BN from "bn.js";
import { DebtProgram } from "./DebtProgram";
import { log } from "./logger";

export interface IUserState {
  // use this token as collateral
  tokenAccount: PublicKey;
  debtTokenAccount: PublicKey;
  vault: PublicKey;
}

export class UserDeployer {
  public static async fromEnv() {
    const wallet = await Wallet.fromMnemonic(
      process.env.WALLET_MNEMONIC!,
      conn,
    );

    const deploy = loadJSON<DeployState>(process.env.DEPLOY_FILE!);

    const state = loadJSONState<IUserState>(process.env.USER_FILE!, {} as any);

    return new UserDeployer(state, wallet, deploy);
  }

  constructor(
    public state: IUserState,
    public wallet: Wallet,
    private readonly deploy: DeployState,
  ) {}

  async deployAll() {
    await this.createTokenAccount();
    await this.createDebtTokenAccount();

    await this.initVault();

    // await this.stake(new BN(10000));
    // await this.borrow(new BN(10));
  }

  private async createTokenAccount() {
    if (this.state.tokenAccount) {
      return;
    }

    log.info("airdrop BTC token for testing");

    // mint some collateral tokens to test account
    const spltoken = new SPLToken(this.wallet);
    const tokenAccount = await spltoken.initializeAccount({
      token: this.deploy.collateralToken,
      owner: this.wallet.pubkey,
    });

    await spltoken.mintTo({
      token: this.deploy.collateralToken,
      to: tokenAccount.publicKey,
      amount: BigInt(1e6 * 1e9),
      authority: this.wallet.account,
    });

    this.state.tokenAccount = tokenAccount.publicKey;
  }

  private async createDebtTokenAccount() {
    if (this.state.debtTokenAccount) {
      return;
    }

    log.info("create dUSD debt token account");

    // mint some collateral tokens to test account
    const spltoken = new SPLToken(this.wallet);
    const tokenAccount = await spltoken.initializeAccount({
      token: this.deploy.debtToken,
      owner: this.wallet.pubkey,
    });

    this.state.debtTokenAccount = tokenAccount.publicKey;
  }

  get program(): DebtProgram {
    return new DebtProgram(this.wallet, this.deploy.debtProgram);
  }

  private async initVault() {
    if (this.state.vault) {
      return;
    }

    const vault = await this.program.initVault(
      new InitVault({
        vault_type: this.deploy.vaultType,
        owner: this.wallet.account.publicKey,
      }),
    );

    this.state.vault = vault.publicKey;
  }

  async stake(amount: BN) {
    const collateralHolderAuthority = await this.programAccount(
      this.deploy.vaultType,
      "holder",
    );

    log.info("stake (fake) BTC", { amount: amount.toString() });

    await this.program.stake(
      new Stake({
        amount,
        collateral_holder_nonce: collateralHolderAuthority.nonce,
      }),
      {
        collateralFrom: this.state.tokenAccount,
        collateralFromAuthority: this.wallet.account,
        collateralTo: this.deploy.collateralTokenHolder,

        vaultType: this.deploy.vaultType,
        vault: this.state.vault,
      },
    );
  }

  async borrow(amount: BN) {
    const debtMinter = await this.programAccount(
      this.deploy.debtType,
      "minter",
    );

    log.info("generate dUSD", { amount: amount.toString() });

    await this.program.borrow(
      new Borrow({
        amount,
        debtMinterNonce: debtMinter.nonce,
      }),
      {
        debtToken: this.deploy.debtToken,
        debtMinter: debtMinter.pubkey,
        debtReceiver: this.state.debtTokenAccount,

        debtType: this.deploy.debtType,
        vaultType: this.deploy.vaultType,
        vault: this.state.vault,
        vaultOwner: this.wallet.account,

        priceOracle: this.deploy.priceOracle,
      },
    );
  }

  async programAccount(
    parent: PublicKey,
    role: string,
  ): Promise<ProgramAccount> {
    const paccount = await ProgramAccount.forSeeds(
      [parent.toBuffer(), Buffer.from(role)],
      this.deploy.debtProgram,
    );
    return paccount;
  }

  // TODO: stake collateral into program
}

import { PublicKey } from "solray";
import { conn } from "./context";

import { BaseEnum, BaseStruct, mappers, Schema } from "./serialization";

export abstract class BaseState extends BaseStruct {
  public static async load<T>(
    this: { new (data: any): T },
    key: PublicKey,
  ): Promise<T> {
    const info = await conn.getAccountInfo(key, "recent");
    if (!info) {
      throw new Error("account does not exist");
    }

    return schema.deserialize(this, info.data);
  }

  public static deserialize<T>(this: { new (data: any): T }, data: Buffer): T {
    return schema.deserialize(this, data);
  }

  public serialize(): Buffer {
    return schema.serialize(this);
  }
}

export class DebtType extends BaseState {
  public static size = 65;

  public static schema = {
    kind: "struct",
    fields: [["amount", "u64"]],
  };
}

export class VaultType extends BaseState {
  public static size = 129;

  public static schema = {
    kind: "struct",
    fields: [["isInitialized", "u8", mappers.bool]],
  };
}

export class Vault extends BaseState {
  public static size = 81;

  public static schema = {
    kind: "struct",
    fields: [
      ["isInitialized", "u8", mappers.bool],
      ["vaultType", [32], mappers.pubkey],
      ["owner", [32], mappers.pubkey],
      ["debtAmount", "u64"],
      ["collateralAmount", "u64"],
    ],
  };
}

export class FaucetConfig extends BaseStruct {
  public static schema = {
    kind: "struct",
    fields: [["amount", "u64"]],
  };
}

export class Faucet extends BaseState {
  public static size = 57;

  public static schema = {
    kind: "struct",
    fields: [
      ["is_initialized", "u8", mappers.bool],
      ["config", FaucetConfig],
      ["amount_supplied", "u64"],
      ["updated_at", "u64"],
      ["token", [32], mappers.pubkey],
    ],
  };
}

// probably can use a decorator to generate serialize
export abstract class BaseInstruction extends BaseStruct {
  public serialize(): Buffer {
    const obj = new InstructionEnum({ [this.constructor.name]: this });
    return schema.serialize(obj);
  }
}

export class InitDebtType extends BaseInstruction {
  public static schema = {
    kind: "struct",
    fields: [
      ["debt_token", [32], mappers.pubkey],
      ["owner", [32], mappers.pubkey],
    ],
  };
}

export class InitVaultType extends BaseInstruction {
  public static schema = {
    kind: "struct",
    fields: [
      ["debt_type", [32], mappers.pubkey],
      ["collateral_token", [32], mappers.pubkey],
      ["collateral_token_holder", [32], mappers.pubkey],
      ["price_oracle", [32], mappers.pubkey],
    ],
  };
}

export class InitVault extends BaseInstruction {
  public static schema = {
    kind: "struct",
    fields: [
      ["vault_type", [32], mappers.pubkey],
      ["owner", [32], mappers.pubkey],
    ],
  };
}

export class Stake extends BaseInstruction {
  public static schema = {
    kind: "struct",
    fields: [
      ["amount", "u64"],
      ["collateral_holder_nonce", "u8"],
    ],
  };
}

export class InstructionEnum extends BaseEnum {
  public static schema = {
    kind: "enum",
    field: "enum",
    values: [
      [InitDebtType.name, InitDebtType],
      [InitVaultType.name, InitVaultType],
      [InitVault.name, InitVault],
      [Stake.name, Stake],
    ],
  };
}

const schema = new Schema([
  Vault,
  InstructionEnum,
  InitDebtType,
  InitVaultType,
  InitVault,
  Stake,
]);

import { PublicKey } from "solray";

import { BaseEnum, BaseStruct, mappers, Schema } from "./serialization";

export abstract class BaseState extends BaseStruct {
  public static deserialize<T>(this: { new (data: any): T }, data: Buffer): T {
    return schema.deserialize(this, data);
  }

  public serialize(): Buffer {
    return schema.serialize(this);
  }
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

export class InitFaucet extends BaseInstruction {
  public static schema = {
    kind: "struct",
    fields: [["config", FaucetConfig]],
  };
}

export class Drip extends BaseInstruction {
  public static schema = {
    kind: "struct",
    fields: [["faucet_token_minter_nonce", "u8"]],
  };
}

export class InstructionEnum extends BaseEnum {
  public static schema = {
    kind: "enum",
    field: "enum",
    values: [
      [InitFaucet.name, InitFaucet],
      [Drip.name, Drip],
    ],
  };
}

const schema = new Schema([
  Faucet,
  FaucetConfig,
  InstructionEnum,
  InitFaucet,
  Drip,
]);

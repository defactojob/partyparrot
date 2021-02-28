import { Account, PublicKey } from "solray";
import {
  Account as Web3Account,
  PublicKey as Web3PublicKey,
} from "@solana/web3.js";

import fs from "fs";
import BN from "bn.js";
import { stateFromJSON } from "./state";

Account.prototype["toJSON"] = function () {
  return {
    type: "Account",
    pubkey: this.publicKey.toBase58(),
    secret: Buffer.from(this.secretKey).toString("hex"),
  };
};

Web3Account.prototype["toJSON"] = function () {
  return {
    type: "Account",
    pubkey: this.publicKey.toBase58(),
    secret: Buffer.from(this.secretKey).toString("hex"),
  };
};

PublicKey.prototype["toJSON"] = function () {
  return {
    type: "PublicKey",
    base58: this.toBase58(),
  };
};

Web3PublicKey.prototype["toJSON"] = function () {
  return {
    type: "PublicKey",
    base58: this.toBase58(),
  };
};

import { inspect } from "util";
Account.prototype[inspect.custom] = function () {
  return {
    type: "Account",
    pubkey: this.publicKey.toBase58(),
    secret: Buffer.from(this.secretKey).toString("hex"),
  };
};

Web3Account.prototype[inspect.custom] = function () {
  return {
    type: "Account",
    pubkey: this.publicKey.toBase58(),
    secret: Buffer.from(this.secretKey).toString("hex"),
  };
};

PublicKey.prototype[inspect.custom] = function () {
  return {
    type: "PublicKey",
    base58: this.toBase58(),
    hex: this.toBuffer().toString("hex"),
  };
};
Web3PublicKey.prototype[inspect.custom] = function () {
  return {
    type: "PublicKey",
    base58: this.toBase58(),
    hex: this.toBuffer().toString("hex"),
  };
};

export function jsonReviver(_key: string, val: any) {
  if (val && typeof val == "object") {
    if (val["type"] == "PublicKey") {
      return new PublicKey(val.base58);
    }

    if (val["type"] == "Account") {
      return new Account(Buffer.from(val["secret"], "hex"));
    }

    if (val["type"] == "Buffer") {
      return Buffer.from(val.hex, "hex");
    }
  }
  return val;
}

export function jsonReplacer(key: string, value: any) {
  if (value && typeof value == "object") {
    // The Buffer class defines a `toJSON` method that returns:
    //
    // {
    //   type: 'Buffer',
    //   data: [
    //     100, 101, 97, 100,
    //      98, 101, 97, 102
    //   ]
    // }
    //
    // Convert this to an hex string
    if (value.type == "Buffer") {
      return {
        type: "Buffer",
        hex: Buffer.from(value).toString("hex"),
      };
    }
  }

  return value;
}

// file-based persistent json state
export function loadJSONState<T>(file: string, defaults: T): T {
  return stateFromJSON(file, defaults, {
    replacer: jsonReplacer,
    reviver: jsonReviver,
  });
}

// readonly json object
export function loadJSON<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8"), jsonReviver);
}

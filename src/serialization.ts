import { PublicKey } from "solray";
import { conn } from "./context";
import { deserialize, serialize } from "borsh";

export namespace mappers {
  export const bool = {
    encode(t: boolean) {
      if (t) {
        return 1;
      } else {
        return 0;
      }
    },
    decode(i: number) {
      if (i == 0) {
        return false;
      } else {
        return true;
      }
    },
  };

  export const pubkey = {
    encode: (key: PublicKey) => {
      // if (key.constructor == PublicKey) {
      //   // key.
      // } else {
      //   key
      // }
      // TODO: support either account or public key
      return key.toBuffer();
    },

    decode: (buf: Uint8Array) => {
      return new PublicKey(buf);
    },
  };
}

export class BaseStruct {
  constructor(data) {
    // this[Serialization.DATA_KEY] = data
    Object.assign(this, data);
  }
}

export class BaseEnum {
  public enum!: string;

  public constructor(prop: { [key: string]: any }) {
    // deserializer calls the constructor with `{ [enum]: value }`, so we need
    // to figure out the enum type
    //
    // expect only one key-value (what a retarded interface)
    for (let key of Object.keys(prop)) {
      this.enum = key;
      this[key] = prop[key];
      return;
    }

    throw new Error("not an expected enum object");
  }

  public get value() {
    return this[this.enum];
  }
}

interface ISerializable {
  schema: any;
}

export class Schema {
  private schema: Map<any, any>;
  constructor(public klasses: ISerializable[]) {
    this.schema = new Map();
    for (let k of klasses) {
      this.schema.set(k, k.schema);
    }
  }

  public deserialize<T>(klass: { new (data: any): T }, data: Buffer): T {
    return deserialize(this.schema, klass, data);
  }

  serialize(obj: any): Buffer {
    return Buffer.from(serialize(this.schema, obj));
  }
}

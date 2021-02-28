import fs from "fs";

// stateFromJSON returns a JSON file backed object. When object mutates, will
// serialize the object as JSON to the specified path.
//
// with recursive proxy support similar to:
//
// https://stackoverflow.com/questions/41299642/how-to-use-javascript-proxy-for-nested-objects
export function stateFromJSON<T extends Object>(
  filepath: string,
  defaultObject: T,
  opts: {
    replacer?: Function;
    reviver?: Function;
  } = {},
): T {
  let root = defaultObject;

  try {
    const data = fs.readFileSync(filepath, "utf8");
    // TODO: support custom revive
    root = JSON.parse(data, opts.reviver as any);
  } catch (err) {
    // console.log("load json error", err);
  }

  function save() {
    // should be sync to avoid write races
    fs.writeFileSync(filepath, JSON.stringify(root, opts.replacer as any, 2));
  }

  const proxy = {
    get(target, key) {
      if (typeof target[key] === "object" && target[key] !== null) {
        return new Proxy(target[key], proxy);
      } else {
        return target[key];
      }
    },

    set(obj, prop, val) {
      obj[prop] = val;
      save();
      return true;
    },
  };

  return new Proxy(root, proxy) as T;
}

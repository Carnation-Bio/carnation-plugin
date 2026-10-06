import { parseArgs } from "node:util";
import { randomUUID, createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer, request } from "node:http";
import path from "node:path";
import { constants, existsSync, openSync, closeSync, chmodSync, renameSync } from "node:fs";
import { mkdir, open as open$1, readdir, rm, rmdir, lstat, rename, opendir } from "node:fs/promises";
import os from "node:os";
import { setTimeout as setTimeout$1 } from "node:timers/promises";
import { Readable, Transform } from "node:stream";
import { request as request$1 } from "node:https";
import { pipeline } from "node:stream/promises";
import { DatabaseSync } from "node:sqlite";
let crypto;
crypto = globalThis.crypto?.webcrypto ?? // Node.js [18-16] REPL
globalThis.crypto ?? // Node.js >18
import("node:crypto").then((m) => m.webcrypto);
async function getRandomValues(size) {
  return (await crypto).getRandomValues(new Uint8Array(size));
}
async function random(size) {
  const mask = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
  const evenDistCutoff = Math.pow(2, 8) - Math.pow(2, 8) % mask.length;
  let result = "";
  while (result.length < size) {
    const randomBytes2 = await getRandomValues(size - result.length);
    for (const randomByte of randomBytes2) {
      if (randomByte < evenDistCutoff) {
        result += mask[randomByte % mask.length];
      }
    }
  }
  return result;
}
async function generateVerifier(length) {
  return await random(length);
}
async function generateChallenge(code_verifier) {
  const buffer2 = await (await crypto).subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
  return btoa(String.fromCharCode(...new Uint8Array(buffer2))).replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "");
}
async function pkceChallenge(length) {
  if (!length)
    length = 43;
  if (length < 43 || length > 128) {
    throw `Expected a length between 43 and 128. Received ${length}.`;
  }
  const verifier = await generateVerifier(length);
  const challenge = await generateChallenge(verifier);
  return {
    code_verifier: verifier,
    code_challenge: challenge
  };
}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values2 = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values2;
}
function joinValues(array2, separator = "|") {
  return array2.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
class Cached {
  constructor(getter) {
    this._getter = getter;
    this._value = void 0;
  }
  get value() {
    const getter = this._getter;
    if (getter !== void 0) {
      this._value = getter();
      this._getter = void 0;
    }
    return this._value;
  }
}
function cached(getter) {
  return new Cached(getter);
}
function nullish(input) {
  return input === null || input === void 0;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const ratio = val / step;
  const roundedRatio = Math.round(ratio);
  const tolerance = 4 * Number.EPSILON * Math.max(Math.abs(ratio), 1);
  if (Math.abs(ratio - roundedRatio) < tolerance)
    return 0;
  return ratio - roundedRatio;
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function rawShape(def) {
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  return desc?.get ? desc.get.raw : desc?.value;
}
function sourceShape(schema) {
  return rawShape(schema._zod.def) ?? schema._zod.def.shape;
}
function deferProp(target, key, getter) {
  Object.defineProperty(target, key, {
    get() {
      const value = getter();
      assignProp(this, key, value);
      return value;
    },
    enumerable: true,
    configurable: true
  });
}
function putProp(target, key, value) {
  if (key in target)
    assignProp(target, key, value);
  else
    target[key] = value;
}
function mirrorShape(target, source, keys, wrap) {
  const raw2 = sourceShape(source);
  for (const key of keys) {
    const desc = Object.getOwnPropertyDescriptor(raw2, key);
    if (!desc.enumerable)
      continue;
    if (desc.get) {
      deferProp(target, key, () => {
        const value = source._zod.def.shape[key];
        return wrap ? wrap(value, key) : value;
      });
    } else
      putProp(target, key, wrap ? wrap(desc.value, key) : desc.value);
  }
}
function mirrorProps(target, source) {
  for (const key of Reflect.ownKeys(source)) {
    const desc = Object.getOwnPropertyDescriptor(source, key);
    if (!desc.enumerable)
      continue;
    if (desc.get)
      deferProp(target, key, () => source[key]);
    else
      putProp(target, key, desc.value);
  }
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
const allowsEval = /* @__PURE__ */ cached(() => {
  if (globalConfig.jitless) {
    return false;
  }
  if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_) {
    return false;
  }
});
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  if (o instanceof Map)
    return new Map(o);
  if (o instanceof Set)
    return new Set(o);
  return o;
}
const propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== void 0) {
    if (params?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin !== void 0 && shape[k]._zod.optout === "optional";
  });
}
const NUMBER_FORMAT_RANGES = /* @__PURE__ */ (() => ({
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
}))();
const BIGINT_FORMAT_RANGES = {
  int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
  uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
};
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const newShape = {};
  mirrorShape(newShape, schema, maskedKeys(schema, mask));
  return clone(schema, mergeDefs(currDef, { shape: newShape, checks: [] }));
}
function maskedKeys(schema, mask) {
  const raw2 = sourceShape(schema);
  const keys = [];
  for (const key of Reflect.ownKeys(mask)) {
    if (!Object.getOwnPropertyDescriptor(raw2, key)?.enumerable) {
      throw new Error(`Unrecognized key: "${String(key)}"`);
    }
    if (mask[key])
      keys.push(key);
  }
  return keys;
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const omitted = new Set(maskedKeys(schema, mask));
  const newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)).filter((key) => !omitted.has(key)));
  return clone(schema, mergeDefs(currDef, { shape: newShape, checks: [] }));
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = sourceShape(schema);
    for (const key of Reflect.ownKeys(shape)) {
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
}
function extended(schema, shape) {
  const newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)));
  mirrorProps(newShape, shape);
  return newShape;
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
}
function merge(a, b) {
  if (!b?._zod?.def) {
    throw new Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
  }
  if (a._zod.def.checks?.length) {
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  }
  const newShape = {};
  mirrorShape(newShape, a, Reflect.ownKeys(sourceShape(a)));
  mirrorShape(newShape, b, Reflect.ownKeys(sourceShape(b)));
  const def = mergeDefs(a._zod.def, {
    shape: newShape,
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: b._zod.def.checks ?? []
  });
  return clone(a, def);
}
function partial(Class, schema, mask, name = "partial") {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(`.${name}() cannot be used on object schemas containing refinements`);
  }
  const selected = mask ? new Set(maskedKeys(schema, mask)) : void 0;
  const newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), Class && ((value, key) => selected && !selected.has(key) ? value : new Class({ type: "optional", innerType: value })));
  return clone(schema, mergeDefs(schema._zod.def, { shape: newShape, checks: [] }));
}
function required(Class, schema, mask) {
  const selected = mask ? new Set(maskedKeys(schema, mask)) : void 0;
  const newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), (value, key) => (
    // overwrite with non-optional
    selected && !selected.has(key) ? value : new Class({ type: "nonoptional", innerType: value })
  ));
  return clone(schema, mergeDefs(schema._zod.def, { shape: newShape }));
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path2, issues) {
  return issues.map((iss) => {
    var _a2;
    (_a2 = iss).path ?? (_a2.path = []);
    iss.path.unshift(path2);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function attachSchema(issues, start, inst) {
  var _a2;
  for (let i = start; i < issues.length; i++) {
    (_a2 = issues[i]).schema ?? (_a2.schema = inst);
  }
}
function finalizeIssue(iss, ctx, config2) {
  var _a2;
  const traits = iss.inst?._zod?.traits;
  if (traits?.has("$ZodType")) {
    if (traits.has("$ZodCheck"))
      (_a2 = iss).schema ?? (_a2.schema = iss.inst);
    else
      iss.schema = iss.inst;
  }
  const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : void 0;
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(schemaError?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
  const full = {};
  for (const k of Object.keys(iss)) {
    if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__")
      continue;
    full[k] = iss[k];
  }
  full.path ?? (full.path = []);
  full.message = message;
  if (ctx?.reportInput) {
    full.input = iss.input;
  }
  return full;
}
const highSurrogate = /[\uD800-\uDBFF]/;
function codePointLength(str) {
  const units = str.length;
  if (!highSurrogate.test(str))
    return units;
  let count = units;
  for (let i = 0; i < units - 1; i++) {
    if ((str.charCodeAt(i) & 64512) === 55296 && (str.charCodeAt(i + 1) & 64512) === 56320) {
      count--;
      i++;
    }
  }
  return count;
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function parsedType(data) {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "nan" : "number";
    }
    case "object": {
      if (data === null) {
        return "null";
      }
      if (Array.isArray(data)) {
        return "array";
      }
      const obj = data;
      if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
        return obj.constructor.name;
      }
    }
  }
  return t;
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function members(proto, table) {
  for (const key in table) {
    const desc = Object.getOwnPropertyDescriptor(table, key);
    if (desc.get)
      Object.defineProperty(proto, key, { ...desc, enumerable: false });
    else
      defineBound(proto, key, desc.value);
  }
}
function own(inst, key, value, enumerable = true) {
  Object.defineProperty(inst, key, { configurable: true, writable: true, enumerable, value });
  return value;
}
function hide(inst, key, value) {
  return own(inst, key, value, false);
}
function derived(computes, table) {
  for (const key in computes) {
    const compute = computes[key];
    Object.defineProperty(table, key, {
      configurable: true,
      enumerable: true,
      get() {
        return own(this, key, compute(this));
      },
      set(value) {
        own(this, key, value);
      }
    });
  }
  return table;
}
function defineBound(proto, key, fn) {
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      return this == null ? fn : own(this, key, fn.bind(this));
    },
    set(value) {
      own(this, key, value);
    }
  });
}
function claim(inst, sentinel) {
  const proto = Object.getPrototypeOf(inst);
  return sentinel in proto ? void 0 : proto;
}
let installing;
let broke = false;
const breaker = {
  configurable: true,
  get() {
    broke = true;
    return void 0;
  }
};
function defineLazyInternal(inst, key, compute) {
  const proto = Object.getPrototypeOf(inst._zod);
  if (key in proto && installing !== inst._zod) {
    installing = void 0;
    return;
  }
  installing = inst._zod;
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      Object.defineProperty(this, key, breaker);
      const outer = broke;
      broke = false;
      try {
        const value = compute(this);
        if (broke)
          delete this[key];
        else
          Object.defineProperty(this, key, { configurable: true, writable: true, value });
        broke = broke || outer;
        return value;
      } catch (err) {
        delete this[key];
        broke = broke || outer;
        throw err;
      }
    },
    set(value) {
      Object.defineProperty(this, key, { configurable: true, writable: true, value });
    }
  });
}
function installLazyProp(inst, key, make, enumerable) {
  const proto = claim(inst, key);
  if (!proto)
    return;
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      const desc = { configurable: true, writable: true, enumerable, value: void 0 };
      Object.defineProperty(this, key, desc);
      desc.value = make(this);
      Object.defineProperty(this, key, desc);
      return desc.value;
    },
    set(value) {
      Object.defineProperty(this, key, { configurable: true, writable: true, enumerable, value });
    }
  });
}
const CONSTANT_CATCH = "~constantCatch";
function constantCatch(value) {
  const fn = () => value;
  fn[CONSTANT_CATCH] = true;
  return fn;
}
var _a$1;
const NEVER = /* @__PURE__ */ Object.freeze({
  status: "aborted"
});
const _zodDesc = { value: void 0, enumerable: false };
let _E = "captureStackTrace" in Error ? Error : null;
function newError(Definition) {
  const E = _E;
  if (E) {
    const saved = E.stackTraceLimit;
    if (typeof saved === "number") {
      try {
        E.stackTraceLimit = 0;
      } catch {
        _E = null;
        return new Definition();
      }
      try {
        return new Definition();
      } finally {
        E.stackTraceLimit = saved;
      }
    }
  }
  return new Definition();
}
function $constructor(name, initializer2, proto, params) {
  const zodProto = {};
  function Internals(def) {
    this.def = def;
    this.constr = _;
    this.traits = /* @__PURE__ */ new Set();
  }
  Internals.prototype = zodProto;
  const protoMembers = proto;
  const initialized = protoMembers && /* @__PURE__ */ new WeakSet();
  function init2(inst, def) {
    if (!inst._zod) {
      _zodDesc.value = new Internals(def);
      try {
        Object.defineProperty(inst, "_zod", _zodDesc);
      } finally {
        _zodDesc.value = void 0;
      }
    } else if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer2(inst, def);
    if (initialized) {
      const own2 = Object.getPrototypeOf(inst);
      const ctorProto = inst._zod.constr.prototype;
      let up = own2;
      while (up && up !== ctorProto)
        up = Object.getPrototypeOf(up);
      const target = up ?? own2;
      if (!initialized.has(target)) {
        initialized.add(target);
        members(target, protoMembers);
      }
    }
    const proto2 = _.prototype;
    for (const k in proto2) {
      if (!Object.prototype.hasOwnProperty.call(proto2, k))
        continue;
      if (!(k in inst)) {
        inst[k] = proto2[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    const inst = params?.Parent ? newError(Definition) : this;
    init2(inst, def);
    const deferred = inst._zod.deferred;
    if (deferred) {
      for (const fn of deferred) {
        fn();
      }
      inst._zod.deferred = void 0;
    }
    const pp = globalThis.__zod_globalConfig?.postProcessor;
    if (pp)
      pp(inst);
    return inst;
  }
  Object.defineProperty(_, "init", { value: init2 });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
class $ZodAsyncError extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
}
class $ZodEncodeError extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
}
(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
const globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}
function _getMessage() {
  const internals = this._zod;
  internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
  return internals.message;
}
function _setMessage(value) {
  this._zod.message = value;
}
const _messageDesc = {
  get: _getMessage,
  set: _setMessage,
  enumerable: true,
  configurable: true
};
const _issuesDesc = { value: void 0, enumerable: false };
const _installedToString = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
const initializer$1 = (inst, def) => {
  inst.name = "$ZodError";
  _issuesDesc.value = def;
  Object.defineProperty(inst, "issues", _issuesDesc);
  _issuesDesc.value = void 0;
  Object.defineProperty(inst, "message", _messageDesc);
  const proto = Object.getPrototypeOf(inst);
  if (!_installedToString.has(proto)) {
    _installedToString.add(proto);
    Object.defineProperty(proto, "toString", {
      configurable: true,
      enumerable: false,
      get() {
        const value = () => this.message;
        Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
        return value;
      },
      set(value) {
        Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
      }
    });
  }
};
const $ZodError = $constructor("$ZodError", initializer$1);
function node(obj, key, make) {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) {
    if (key === "__proto__") {
      Object.defineProperty(obj, key, { value: make(), writable: true, enumerable: true, configurable: true });
    } else {
      obj[key] = make();
    }
  }
  return obj[key];
}
function flattenError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error2.issues) {
    if (sub.path.length > 0) {
      node(fieldErrors, sub.path[0], () => []).push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error3, path2 = []) => {
    for (const issue2 of error3.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, [...path2, ...issue2.path]));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, [...path2, ...issue2.path]);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, [...path2, ...issue2.path]);
      } else {
        const fullpath = [...path2, ...issue2.path];
        if (fullpath.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < fullpath.length) {
            const el = fullpath[i];
            const terminal = i === fullpath.length - 1;
            if (el === "_errors") {
              if (terminal)
                curr._errors.push(mapper(issue2));
              i++;
              continue;
            }
            if (!Object.prototype.hasOwnProperty.call(curr, el)) {
              Object.defineProperty(curr, el, {
                value: { _errors: [] },
                enumerable: true,
                writable: true,
                configurable: true
              });
            }
            const node2 = curr[el];
            if (terminal) {
              node2._errors.push(mapper(issue2));
            }
            curr = node2;
            i++;
          }
        }
      }
    }
  };
  processError(error2);
  return fieldErrors;
}
function finalizeParams(callee, params) {
  return { callee: params?.callee ?? callee, Err: params?.Err };
}
const _parse = (_Err) => {
  const fn = (schema, value, _ctx, _params) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    if (result.issues.length) {
      const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, _params?.callee ?? fn);
      throw e;
    }
    return result.value;
  };
  return fn;
};
const _parseAsync = (_Err) => {
  const fn = async (schema, value, _ctx, params) => {
    const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    if (result.issues.length) {
      const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, params?.callee ?? fn);
      throw e;
    }
    return result.value;
  };
  return fn;
};
const _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
};
function failure(Err, issues, ctx) {
  let error2;
  return {
    success: false,
    get error() {
      if (!error2) {
        error2 = new Err(issues.map((iss) => finalizeIssue(iss, ctx, config())));
        issues = void 0;
        ctx = void 0;
      }
      return error2;
    },
    set error(e) {
      error2 = e;
      issues = void 0;
      ctx = void 0;
    }
  };
}
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
};
const COMPILE_INVALID = /* @__PURE__ */ Symbol.for("zod.compile.invalid");
const COMPILE_FALLBACK = /* @__PURE__ */ Symbol.for("zod.compile.fallback");
const validate = ((schema, value, _ctx) => {
  const validator = schema._zod.bag.validator;
  if (validator !== void 0) {
    if (validator(value) !== COMPILE_INVALID)
      return true;
    if (validator.definite === true && _ctx === void 0)
      return false;
  }
  return validateFallback(schema, value, _ctx);
});
function validateFallback(schema, value, _ctx) {
  const ctx = _ctx ? { ..._ctx, async: false, abortEarly: true } : { async: false, abortEarly: true };
  const fallbackRun = schema._zod.bag.fallbackRun;
  let result;
  if (fallbackRun) {
    ctx[COMPILE_FALLBACK] = true;
    result = fallbackRun({ value, issues: [] }, ctx);
  } else {
    result = schema._zod.run({ value, issues: [] }, ctx);
  }
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length === 0;
}
const validateAsync$1 = async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true, abortEarly: true } : { async: true, abortEarly: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length === 0;
};
const _encode = (_Err) => {
  const parse2 = _parse(_Err);
  const fn = (schema, value, _ctx, _params) => {
    const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
    return parse2(schema, value, ctx, finalizeParams(fn, _params));
  };
  return fn;
};
const _decode = (_Err) => {
  const parse2 = _parse(_Err);
  const fn = (schema, value, _ctx, _params) => {
    return parse2(schema, value, _ctx, finalizeParams(fn, _params));
  };
  return fn;
};
const _encodeAsync = (_Err) => {
  const parseAsync2 = _parseAsync(_Err);
  const fn = async (schema, value, _ctx, _params) => {
    const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
    return await parseAsync2(schema, value, ctx, finalizeParams(fn, _params));
  };
  return fn;
};
const _decodeAsync = (_Err) => {
  const parseAsync2 = _parseAsync(_Err);
  const fn = async (schema, value, _ctx, _params) => {
    return await parseAsync2(schema, value, _ctx, finalizeParams(fn, _params));
  };
  return fn;
};
const _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
};
const _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
};
const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};
const cuid = /^[cC][0-9a-z]{6,}$/;
const cuid2 = /^[0-9a-z]+$/;
const ulid = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/;
const xid = /^[0-9a-vA-V]{20}$/;
const ksuid = /^[A-Za-z0-9]{27}$/;
const nanoid = /^[a-zA-Z0-9_-]{21}$/;
function nanoidOfLength(length) {
  return new RegExp(`^[a-zA-Z0-9_-]{${length}}$`);
}
const duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
const uuid$1 = (version2) => {
  if (!version2)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
const email = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const _emoji$1 = `^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$`;
function emoji() {
  return new RegExp(_emoji$1, "u");
}
const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/;
const httpProtocol = /^https?$/;
const e164 = /^\+[1-9]\d{6,14}$/;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
function anchor(source) {
  return new RegExp(`^${source}$`);
}
const date = /* @__PURE__ */ anchor(dateSource);
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : args.seconds ? `${hhmm}:[0-5]\\d(?:\\.\\d+)?` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime$1(args) {
  const opts = ["Z"];
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const qualified = `${timeSource({ precision: args.precision, seconds: true })}(?:${opts.join("|")})`;
  const timeRegex = args.local ? `${qualified}|${timeSource({ precision: args.precision })}` : qualified;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const anyString = /^[\s\S]{0,}$/;
const integer = /^-?\d+$/;
const number$2 = /^-?\d+(?:\.\d+)?$/;
const boolean$1 = /^(?:true|false)$/i;
const _null$2 = /^null$/i;
const lowercase = /^[^A-Z]*$/;
const uppercase = /^[^a-z]*$/;
const $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a2;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a2 = inst._zod).onattach ?? (_a2.onattach = []);
});
const _whenHasLength = (payload) => {
  const val = payload.value;
  return !nullish(val) && val.length !== void 0;
};
const numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
const $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin: numericOriginMap[typeof payload.value] ?? origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin: numericOriginMap[typeof payload.value] ?? origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? (
      // `value % 0n` throws, and nothing is a multiple of zero — the number branch already fails this way via NaN
      def.value !== BigInt(0) && payload.value % def.value === BigInt(0)
    ) : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = _whenHasLength);
  inst._zod.check = (payload) => {
    const input = payload.value;
    const units = input.length;
    const length = typeof input === "string" && units > def.maximum ? codePointLength(input) : units;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = _whenHasLength);
  inst._zod.check = (payload) => {
    const input = payload.value;
    const units = input.length;
    const length = typeof input === "string" && units >= def.minimum && units < def.minimum * 2 ? codePointLength(input) : units;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = _whenHasLength);
  inst._zod.check = (payload) => {
    const input = payload.value;
    const units = input.length;
    const length = typeof input === "string" && units >= def.length && units <= def.length * 2 ? codePointLength(input) : units;
    if (length === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a2, _b;
  $ZodCheck.init(inst, def);
  if (def.pattern)
    (_a2 = inst._zod).check ?? (_a2.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    });
  else
    (_b = inst._zod).check ?? (_b.check = () => {
    });
});
const $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
  def.pattern ?? (def.pattern = lowercase);
  $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
  def.pattern ?? (def.pattern = uppercase);
  $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  const escapedRegex = escapeRegex(def.includes);
  const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position},}${escapedRegex}` : escapedRegex);
  def.pattern = pattern;
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});
class Doc {
  constructor(args = [], closed = {}) {
    this.content = [];
    this.indent = 0;
    this.args = args;
    this.closed = closed;
  }
  // the compiler catches a child's throw and keeps writing into this doc, so the indent has to unwind with it
  indented(fn) {
    this.indent += 1;
    try {
      fn(this);
    } finally {
      this.indent -= 1;
    }
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split("\n").filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const content = this?.content ?? [``];
    const factory = new F(...Object.keys(this.closed), `return function (${this.args.join(", ")}) {
${content.join("\n")}
};`);
    return factory(...Object.values(this.closed));
  }
}
const version = {
  major: 4,
  minor: 6,
  patch: 5
};
const $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a2;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const defChecks = inst._zod.def.checks;
  const checks = inst._zod.traits.has("$ZodCheck") ? [inst, ...defChecks ?? []] : defChecks?.length ? [...defChecks] : [];
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      if (payload.memo)
        return payload;
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          if (explicitlyAborted(payload))
            continue;
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            attachSchema(payload.issues, currLen, inst);
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          attachSchema(payload.issues, currLen, inst);
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
}, {
  // Wrappers extend this by installing a richer factory over it; reading it eagerly would defeat the laziness.
  get "~standard"() {
    return hide(this, "~standard", standardProps(this));
  },
  set "~standard"(value) {
    own(this, "~standard", value);
  }
});
const toStandardResult = (r, ctx) => r.issues.length ? { issues: r.issues.map((iss) => finalizeIssue(iss, ctx, config())) } : { value: r.value };
async function validateAsync(inst, value) {
  const ctx = { async: true };
  return toStandardResult(await inst._zod.run({ value, issues: [] }, ctx), ctx);
}
function standardProps(inst) {
  return {
    validate: (value) => {
      const ctx = { async: false };
      try {
        const r = inst._zod.run({ value, issues: [] }, ctx);
        if (!(r instanceof Promise))
          return toStandardResult(r, ctx);
      } catch (_) {
      }
      return validateAsync(inst, value);
    },
    vendor: "zod",
    version: 1
  };
}
const $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = def.pattern ?? anyString;
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
const $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
const $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
  def.pattern ?? (def.pattern = guid);
  $ZodStringFormat.init(inst, def);
});
const $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
  if (def.version) {
    const versionMap = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    };
    const v = versionMap[def.version];
    if (v === void 0)
      throw new Error(`Invalid UUID version: "${def.version}"`);
    def.pattern ?? (def.pattern = uuid$1(v));
  } else
    def.pattern ?? (def.pattern = uuid$1());
  $ZodStringFormat.init(inst, def);
});
const $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
  def.pattern ?? (def.pattern = email);
  $ZodStringFormat.init(inst, def);
});
const URL_BAD_FORMAT = 1;
const URL_UNPARSEABLE = 2;
function canParseURL(input) {
  try {
    if (typeof URL !== "undefined" && typeof URL.canParse === "function")
      return URL.canParse(input);
    new URL(input);
    return true;
  } catch {
    return false;
  }
}
function validateURL(trimmed, def) {
  if (!("normalize" in def) && !("hostname" in def) && !("protocol" in def)) {
    return canParseURL(trimmed) || URL_UNPARSEABLE;
  }
  return parseURLObject(trimmed, def);
}
function parseURLObject(trimmed, def) {
  if (!def.normalize && def.protocol?.source === httpProtocol.source && !/^https?:\/\//i.test(trimmed)) {
    return URL_BAD_FORMAT;
  }
  try {
    if (typeof URL !== "undefined") {
      const URLStatic = URL;
      if (typeof URLStatic.parse === "function")
        return URLStatic.parse(trimmed) ?? URL_UNPARSEABLE;
    }
    return new URL(trimmed);
  } catch {
    return URL_UNPARSEABLE;
  }
}
const asciiTabOrNewline = /[\t\n\r]/g;
function stripTabAndNewline(value) {
  return value.replace(asciiTabOrNewline, "");
}
function urlHostnameOk(url2, hostname) {
  hostname.lastIndex = 0;
  return hostname.test(url2.hostname);
}
function urlProtocolOk(url2, protocol) {
  protocol.lastIndex = 0;
  return protocol.test(url2.protocol.endsWith(":") ? url2.protocol.slice(0, -1) : url2.protocol);
}
const $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    try {
      const trimmed = payload.value.trim();
      const url2 = validateURL(trimmed, def);
      if (url2 === URL_BAD_FORMAT) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          note: "Invalid URL format",
          input: payload.value,
          inst,
          continue: !def.abort
        });
        return;
      }
      if (url2 === URL_UNPARSEABLE) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
        return;
      }
      if (url2 === true) {
        payload.value = stripTabAndNewline(trimmed);
        return;
      }
      if (def.hostname && !urlHostnameOk(url2, def.hostname)) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          note: "Invalid hostname",
          pattern: def.hostname.source,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
      if (def.protocol && !urlProtocolOk(url2, def.protocol)) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          note: "Invalid protocol",
          pattern: def.protocol.source,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
      payload.value = def.normalize ? url2.href : stripTabAndNewline(trimmed);
      return;
    } catch (_) {
      payload.issues.push({
        code: "invalid_format",
        format: "url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
  def.pattern ?? (def.pattern = emoji());
  $ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
  if (def.length !== void 0 && (!Number.isInteger(def.length) || def.length < 1))
    throw new Error(`Invalid nanoid length: ${def.length}`);
  def.pattern ?? (def.pattern = def.length === void 0 ? nanoid : nanoidOfLength(def.length));
  $ZodStringFormat.init(inst, def);
});
const $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
  def.pattern ?? (def.pattern = cuid);
  $ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
  def.pattern ?? (def.pattern = cuid2);
  $ZodStringFormat.init(inst, def);
});
const $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
  def.pattern ?? (def.pattern = ulid);
  $ZodStringFormat.init(inst, def);
});
const $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
  def.pattern ?? (def.pattern = xid);
  $ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
  def.pattern ?? (def.pattern = ksuid);
  $ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
  def.pattern ?? (def.pattern = datetime$1(def));
  $ZodStringFormat.init(inst, def);
});
const $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
  def.pattern ?? (def.pattern = date);
  $ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
  def.pattern ?? (def.pattern = time(def));
  $ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
  def.pattern ?? (def.pattern = duration);
  $ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
  def.pattern ?? (def.pattern = ipv4);
  $ZodStringFormat.init(inst, def);
});
const ipv6Alphabet = /^[0-9a-fA-F:.]+$/;
function isValidIPv6(value) {
  if (!ipv6Alphabet.test(value))
    return false;
  return canParseURL(`http://[${value}]`);
}
const $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
  def.pattern ?? (def.pattern = ipv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (!isValidIPv6(payload.value)) {
      payload.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv4);
  $ZodStringFormat.init(inst, def);
});
function isValidCIDRv6(value) {
  const parts = value.split("/");
  if (parts.length !== 2)
    return false;
  const [address, prefix] = parts;
  if (!prefix)
    return false;
  const prefixNum = Number(prefix);
  if (`${prefixNum}` !== prefix)
    return false;
  if (prefixNum < 0 || prefixNum > 128)
    return false;
  return isValidIPv6(address);
}
const $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (!isValidCIDRv6(payload.value)) {
      payload.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
function isValidBase64(data) {
  if (data === "")
    return true;
  if (/\s/.test(data))
    return false;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
const base64Charset = /^[0-9a-zA-Z+/]*={0,2}$/;
const $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
  def.pattern ?? (def.pattern = base64Charset);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidBase64(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const base64urlCharset = /^[A-Za-z0-9_-]*$/;
function isValidBase64URL(data) {
  if (!base64urlCharset.test(data))
    return false;
  const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
  return isValidBase64(padded);
}
const $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
  def.pattern ?? (def.pattern = base64urlCharset);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidBase64URL(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
  def.pattern ?? (def.pattern = e164);
  $ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
const $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidJWT(payload.value, def.alg))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = number$2;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? String(input) : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
const $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
const $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean$1;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
const $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _null$2;
  inst._zod.values = /* @__PURE__ */ new Set([null]);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (input === null)
      return payload;
    payload.issues.push({
      expected: "null",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
const $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
const $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
const $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
const $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  const memo2 = globalConfig.memoizer;
  memo2?.attach(inst);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = memo2 ? memo2.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
    const proms = [];
    const abortEarly = ctx?.abortEarly;
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
        if (abortEarly && result.issues.length !== 0 && aborted(result))
          break;
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input, optin, optout) {
  const isPresent = key in input;
  const isOptionalOut = optout === "optional";
  if (!isPresent && isOptionalOut && optin === "optional") {
    return;
  }
  if (result.issues.length) {
    if (optin !== void 0 && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && optin === void 0) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: void 0,
        path: [key]
      });
    }
    return;
  }
  if (result.value === void 0) {
    if (isPresent || optin === "defaulted" && !isOptionalOut) {
      final.value[key] = void 0;
    }
  } else {
    final.value[key] = result.value;
  }
}
const NO_SYMBOL_KEYS = [];
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  const ownSymbols = Object.getOwnPropertySymbols(def.shape);
  const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
  const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
  for (const k of allKeys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    allKeys,
    symbolKeys,
    // string-only: handleCatchall matches it against `for...in`, which never yields a symbol
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const optin = _catchall.optin;
  const optout = _catchall.optout;
  let seen = 0;
  for (const key in input) {
    if (abortEarly && payload.issues.length !== seen) {
      if (aborted(payload, seen))
        break;
      seen = payload.issues.length;
    }
    if (keySet.has(key))
      continue;
    if (key === "__proto__") {
      if (t === "never")
        unrecognized.push(key);
      continue;
    }
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, optin, optout)));
    } else {
      handlePropertyResult(r, payload, key, input, optin, optout);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst,
      // Describes the shape of the input, not the validity of the parsed value, so it never aborts. The parse still fails; the schema's own checks just get to run first, and an enclosing intersection can reconcile the key against a sibling operand.
      continue: true
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
const $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  const sh = desc?.get ? desc.get.raw : def.shape ?? {};
  if (sh) {
    const get = () => {
      const newSh = { ...sh };
      Object.defineProperty(def, "shape", { value: newSh });
      get.raw = newSh;
      return newSh;
    };
    get.raw = sh;
    Object.defineProperty(def, "shape", { get });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazyInternal(inst, "propValues", (zod) => {
    const shape = zod.def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        if (!Object.prototype.hasOwnProperty.call(propValues, key)) {
          assignProp(propValues, key, /* @__PURE__ */ new Set());
        }
        for (const v of field.values)
          propValues[key].add(v);
        if (field.optin !== void 0)
          propValues[key].add(void 0);
      }
    }
    return propValues;
  });
  const isObject$1 = isObject;
  const catchall = def.catchall;
  let value;
  const memo2 = globalConfig.memoizer;
  memo2?.attach(inst);
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject$1(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = memo2 ? memo2.alloc(inst, payload, {}, ctx) : {};
    const proms = [];
    const shape = value.shape;
    const abortEarly = ctx?.abortEarly;
    let seen = payload.issues.length;
    for (const key of value.allKeys) {
      if (abortEarly && payload.issues.length !== seen) {
        if (aborted(payload, seen))
          break;
        seen = payload.issues.length;
      }
      if (key === "__proto__")
        continue;
      const el = shape[key];
      const optin = el._zod.optin;
      const optout = el._zod.optout;
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, optin, optout)));
      } else {
        handlePropertyResult(r, payload, key, input, optin, optout);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
  };
});
const $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
  $ZodObject.init(inst, def);
  const superParse = inst._zod.parse;
  const _normalized = cached(() => normalizeDef(def));
  const memo2 = globalConfig.memoizer;
  const generateFastpass = (shape) => {
    const normalized = _normalized.value;
    const syms = normalized.symbolKeys;
    const doc = new Doc(["payload", "ctx"], { shape, inst, memo: memo2, syms });
    const parseStr = (k) => `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
    const prefixStr = (id, k) => `
          let ${id}_ab = false;
          for (let i = 0; i < ${id}.issues.length; i++) {
            const iss = ${id}.issues[i];
            iss.path = iss.path ? [${k}, ...iss.path] : [${k}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${id}_ab = true;
          }
          if (${id}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
    doc.write(`const input = payload.value;`);
    const ids = /* @__PURE__ */ Object.create(null);
    let counter = 0;
    for (const key of normalized.allKeys) {
      ids[key] = `key_${counter++}`;
    }
    doc.write(memo2 ? `const newResult = memo.alloc(inst, payload, {}, ctx);` : `const newResult = {};`);
    for (const key of normalized.allKeys) {
      if (key === "__proto__")
        continue;
      const id = ids[key];
      const k = typeof key === "symbol" ? `syms[${syms.indexOf(key)}]` : esc(key);
      const isPresent = `${k} in input`;
      const schema = shape[key];
      const optin = schema?._zod?.optin;
      const isOptionalIn = optin !== void 0;
      const isOptionalOut = schema?._zod?.optout === "optional";
      doc.write(`const ${id} = ${parseStr(k)};`);
      if (isOptionalIn && isOptionalOut) {
        const assign2 = optin === "optional" ? `${id}_present` : `${id}.value !== undefined || ${id}_present`;
        doc.write(`
        const ${id}_present = ${isPresent};
        if (!${id}.issues.length || ${id}_present) {
          if (${id}.issues.length) {${prefixStr(id, k)}
          }

          if (${assign2}) {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
      } else if (!isOptionalIn) {
        doc.write(`
        const ${id}_present = ${isPresent};
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${id}_present) {
          newResult[${k}] = ${id}.value;
        }

      `);
      } else {
        doc.write(`
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
      `);
        if (optin === "defaulted") {
          doc.write(`newResult[${k}] = ${id}.value;`);
        } else {
          doc.write(`
        if (${id}.value !== undefined || ${isPresent}) {
          newResult[${k}] = ${id}.value;
        }
      `);
        }
      }
    }
    doc.write(`payload.value = newResult;`);
    doc.write(`return payload;`);
    return doc.compile();
  };
  let fastpass;
  const isObject$1 = isObject;
  const jit = !globalConfig.jitless;
  const allowsEval$1 = allowsEval;
  const fastEnabled = jit && allowsEval$1.value;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject$1(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
      if (!fastpass)
        fastpass = generateFastpass(def.shape);
      payload = fastpass(payload, ctx);
      if (!catchall)
        return payload;
      return handleCatchall([], input, payload, ctx, value, inst, ctx?.abortEarly === true);
    }
    return superParse(payload, ctx);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
const $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "optin", (zod) => zod.def.options.some((o) => o._zod.optin === "defaulted") ? "defaulted" : zod.def.options.some((o) => o._zod.optin !== void 0) ? "optional" : void 0);
  defineLazyInternal(inst, "optout", (zod) => zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
  defineLazyInternal(inst, "values", (zod) => {
    if (zod.def.options.every((o) => o._zod.values)) {
      return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return void 0;
  });
  defineLazyInternal(inst, "pattern", (zod) => {
    if (zod.def.options.every((o) => o._zod.pattern)) {
      const patterns = zod.def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return void 0;
  });
  const first = def.options.length === 1 ? def.options[0]._zod.run : null;
  inst._zod.parse = (payload, ctx) => {
    if (first) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
function discriminatorMap(def) {
  const map = /* @__PURE__ */ new Map();
  for (const option of def.options) {
    const values2 = option._zod.propValues?.[def.discriminator];
    if (!values2 || values2.size === 0)
      throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
    for (const value of values2) {
      if (map.has(value)) {
        if (value !== void 0)
          throw new Error(`Duplicate discriminator value "${String(value)}"`);
        map.set(value, null);
      } else {
        map.set(value, option);
      }
    }
  }
  return map;
}
const $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
  def.inclusive = false;
  $ZodUnion.init(inst, def);
  const _super = inst._zod.parse;
  defineLazyInternal(inst, "propValues", (zod) => {
    const propValues = {};
    let undefinedCount = 0;
    for (const option of zod.def.options) {
      const pv = option._zod.propValues;
      if (!pv || Object.keys(pv).length === 0)
        throw new Error(`Invalid discriminated union option at index "${zod.def.options.indexOf(option)}"`);
      if (pv[zod.def.discriminator]?.has(void 0))
        undefinedCount++;
      for (const [k, v] of Object.entries(pv)) {
        if (!Object.prototype.hasOwnProperty.call(propValues, k)) {
          assignProp(propValues, k, /* @__PURE__ */ new Set());
        }
        for (const val of v) {
          propValues[k].add(val);
        }
      }
    }
    if (!zod.def.unionFallback && undefinedCount > 1)
      propValues[zod.def.discriminator]?.delete(void 0);
    return propValues;
  });
  def.options.forEach((option, i) => {
    const propShape = rawShape(option._zod.def);
    if (propShape && !Object.prototype.hasOwnProperty.call(propShape, def.discriminator)) {
      throw new Error(`Invalid discriminated union option at index "${i}"`);
    }
  });
  const disc = cached(() => discriminatorMap(def));
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isObject(input)) {
      payload.issues.push({
        code: "invalid_type",
        expected: "object",
        input,
        inst
      });
      return payload;
    }
    const value = input?.[def.discriminator];
    const opt = disc.value.get(value);
    if (opt && (value !== void 0 || ctx.direction !== "backward")) {
      return opt._zod.run(payload, ctx);
    }
    if (def.unionFallback || ctx.direction === "backward") {
      return _super(payload, ctx);
    }
    payload.issues.push({
      code: "invalid_union",
      errors: [],
      note: "No matching discriminator",
      discriminator: def.discriminator,
      options: Array.from(disc.value.keys()).filter((value2) => disc.value.get(value2) !== null),
      input,
      path: [def.discriminator],
      inst
    });
    return payload;
  };
});
const $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => {
        return handleIntersectionResults(payload, left2, right2);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    if (Object.prototype.hasOwnProperty.call(newObj, "__proto__"))
      delete newObj.__proto__;
    for (const key of sharedKeys) {
      if (key === "__proto__")
        continue;
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = /* @__PURE__ */ new Map();
  let unrecIssue;
  const keyIssues = /* @__PURE__ */ new Map();
  const collect = (iss, side) => {
    let keys;
    if (iss.code === "unrecognized_keys" && !iss.path?.length) {
      unrecIssue ?? (unrecIssue = iss);
      keys = iss.keys;
    } else if (iss.code === "invalid_key" && iss.origin === "record" && iss.path?.length === 1) {
      const k = String(iss.path[0]);
      if (!keyIssues.has(k))
        keyIssues.set(k, iss);
      keys = [k];
    } else {
      return false;
    }
    for (const k of keys) {
      if (!unrecKeys.has(k))
        unrecKeys.set(k, {});
      unrecKeys.get(k)[side] = true;
    }
    return true;
  };
  for (const iss of left.issues) {
    if (!collect(iss, "l"))
      result.issues.push(iss);
  }
  for (const iss of right.issues) {
    if (!collect(iss, "r"))
      result.issues.push(iss);
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length) {
    const aggregated = unrecIssue ? bothKeys.filter((k) => unrecIssue.keys.includes(k)) : [];
    if (aggregated.length)
      result.issues.push({ ...unrecIssue, keys: aggregated });
    for (const k of bothKeys) {
      if (!aggregated.includes(k) && keyIssues.has(k))
        result.issues.push(keyIssues.get(k));
    }
  }
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    if (aborted(result))
      return result;
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
const $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
  $ZodType.init(inst, def);
  const memo2 = globalConfig.memoizer;
  memo2?.attach(inst);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isPlainObject(input)) {
      payload.issues.push({
        expected: "record",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    const values2 = def.keyType._zod.values;
    if (values2 && !def.partial) {
      payload.value = memo2 ? memo2.alloc(inst, payload, {}, ctx) : {};
      const recordKeys = /* @__PURE__ */ new Set();
      for (const key of values2) {
        if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
          recordKeys.add(typeof key === "number" ? key.toString() : key);
          if (key === "__proto__")
            continue;
          const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (keyResult.issues.length) {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key,
              path: [key],
              inst
            });
            continue;
          }
          const outKey = keyResult.value;
          if (outKey === "__proto__")
            continue;
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[outKey] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[outKey] = result.value;
          }
        }
      }
      let unrecognized;
      for (const key in input) {
        if (!recordKeys.has(key)) {
          if (def.mode === "loose") {
            if (key === "__proto__")
              continue;
            payload.value[key] = input[key];
          } else {
            unrecognized = unrecognized ?? [];
            unrecognized.push(key);
          }
        }
      }
      if (unrecognized && unrecognized.length > 0) {
        payload.issues.push({
          code: "unrecognized_keys",
          input,
          inst,
          keys: unrecognized,
          continue: true
        });
      }
    } else {
      payload.value = memo2 ? memo2.alloc(inst, payload, {}, ctx) : {};
      let unrecognized;
      for (const key of Reflect.ownKeys(input)) {
        if (key === "__proto__")
          continue;
        if (!Object.prototype.propertyIsEnumerable.call(input, key))
          continue;
        let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        if (keyResult instanceof Promise) {
          throw new Error("Async schemas not supported in object keys currently");
        }
        const checkNumericKey = typeof key === "string" && number$2.test(key) && keyResult.issues.length;
        if (checkNumericKey) {
          const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
          if (retryResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (retryResult.issues.length === 0) {
            keyResult = retryResult;
          }
        }
        if (keyResult.issues.length) {
          if (def.mode === "loose") {
            payload.value[key] = input[key];
          } else if (values2) {
            unrecognized = unrecognized ?? [];
            unrecognized.push(key);
          } else {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key,
              path: [key],
              inst
            });
          }
          continue;
        }
        const outKey = keyResult.value;
        if (outKey === "__proto__")
          continue;
        const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => {
            if (result2.issues.length) {
              payload.issues.push(...prefixIssues(key, result2.issues));
            }
            payload.value[outKey] = result2.value;
          }));
        } else {
          if (result.issues.length) {
            payload.issues.push(...prefixIssues(key, result.issues));
          }
          payload.value[outKey] = result.value;
        }
      }
      if (unrecognized && unrecognized.length > 0) {
        payload.issues.push({
          code: "unrecognized_keys",
          input,
          inst,
          keys: unrecognized,
          continue: true
        });
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
const $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values2 = getEnumValues(def.entries);
  const valuesSet = new Set(values2);
  inst._zod.values = valuesSet;
  defineLazyInternal(inst, "pattern", (zod) => {
    const patternValues = getEnumValues(zod.def.entries).filter((k) => propertyKeyTypes.has(typeof k));
    return new RegExp(patternValues.length ? `^(${patternValues.map((o) => escapeRegex(o.toString())).join("|")})$` : "^[^\\s\\S]$");
  });
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: values2,
      input,
      inst
    });
    return payload;
  };
});
const $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  const values2 = new Set(def.values);
  inst._zod.values = values2;
  defineLazyInternal(inst, "pattern", (zod) => {
    const vals = zod.def.values;
    return new RegExp(vals.length ? `^(${vals.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$` : "^[^\\s\\S]$");
  });
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (values2.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
const $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  globalConfig.memoizer?.guard(inst);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError();
    }
    payload.value = _out;
    return payload;
  };
});
function handleOptionalResult(payload, result) {
  payload.value = result.issues.length ? void 0 : result.value;
  return payload;
}
const $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
  inst._zod.optout = "optional";
  defineLazyInternal(inst, "values", (zod) => {
    const values2 = zod.def.innerType._zod.values;
    return values2 ? /* @__PURE__ */ new Set([...values2, void 0]) : void 0;
  });
  defineLazyInternal(inst, "pattern", (zod) => {
    const pattern = zod.def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === void 0) {
      if (def.innerType._zod.optin !== "defaulted")
        return payload;
      const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
      if (result instanceof Promise)
        return result.then((result2) => handleOptionalResult(payload, result2));
      return handleOptionalResult(payload, result);
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
  defineLazyInternal(inst, "pattern", (zod) => zod.def.innerType._zod.pattern);
  inst._zod.parse = (payload, ctx) => {
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin);
  defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
  defineLazyInternal(inst, "pattern", (zod) => {
    const pattern = zod.def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
  });
  defineLazyInternal(inst, "values", (zod) => {
    return zod.def.innerType._zod.values ? /* @__PURE__ */ new Set([...zod.def.innerType._zod.values, null]) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "defaulted";
  defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === void 0) {
    payload.value = def.defaultValue;
  }
  return payload;
}
const $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "defaulted";
  defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "values", (zod) => {
    const v = zod.def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleNonOptionalResult(result2, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === void 0) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
function handleCatchResult(payload, result, def, ctx) {
  if (!result.issues.length) {
    payload.value = result.value;
    if (result.memo)
      payload.memo = true;
    return payload;
  }
  payload.value = def.catchValue({
    ...result,
    value: payload.value,
    error: {
      issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
    },
    input: payload.value
  });
  return payload;
}
const $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
  defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
  defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleCatchResult(payload, result2, def, ctx));
    }
    return handleCatchResult(payload, result, def, ctx);
  };
});
const $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "values", (zod) => zod.def.in._zod.values);
  defineLazyInternal(inst, "optin", (zod) => zod.def.in._zod.optin);
  defineLazyInternal(inst, "optout", (zod) => zod.def.out._zod.optout);
  defineLazyInternal(inst, "propValues", (zod) => zod.def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handlePipeResult(right2, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next3, ctx) {
  if (left.issues.some((iss) => iss.code !== "unrecognized_keys")) {
    left.aborted = true;
    return left;
  }
  return next3._zod.run({ value: left.value, issues: left.issues }, ctx);
}
const $ZodPreprocess = /* @__PURE__ */ $constructor("$ZodPreprocess", (inst, def) => {
  $ZodPipe.init(inst, def);
});
const $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "propValues", (zod) => zod.def.innerType._zod.propValues);
  defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
  defineLazyInternal(inst, "optin", (zod) => zod.def.innerType?._zod?.optin);
  defineLazyInternal(inst, "optout", (zod) => zod.def.innerType?._zod?.optout);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  if (!payload.memo)
    payload.value = Object.freeze(payload.value);
  return payload;
}
const $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      // incorporates params.error into issue reporting
      path: [...inst._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !inst._zod.def.abort
      // params: inst._zod.def.params,
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
class $ZodCyclicError extends Error {
  constructor() {
    super(`Cannot parse a reference cycle that closes through a transform`);
    this.name = "ZodCyclicError";
  }
}
const STATE = "~memo";
const NO_ISSUES = [];
function isRef(value) {
  return value !== null && typeof value === "object";
}
function cloneIssues(issues) {
  return issues.map((iss) => iss.path ? { ...iss, path: iss.path.slice() } : { ...iss });
}
const recursive = /* @__PURE__ */ new WeakMap();
const NONE = 0;
const ASSUMED = 1;
const PROVEN = 2;
function isRecursive(inst, stack, resolve) {
  const cached2 = recursive.get(inst);
  if (cached2 !== void 0)
    return cached2 ? PROVEN : NONE;
  if (stack.has(inst))
    return PROVEN;
  stack.add(inst);
  let result = NONE;
  const check = (child) => {
    if (result !== PROVEN && child?._zod) {
      const answer = isRecursive(child, stack);
      if (answer > result)
        result = answer;
    }
  };
  const shape = (sh, spread) => {
    let answer = NONE;
    for (const key of Reflect.ownKeys(sh)) {
      const desc = Object.getOwnPropertyDescriptor(sh, key);
      if (!desc.enumerable)
        continue;
      const child = desc.get ? ASSUMED : desc.value?._zod ? isRecursive(desc.value, stack) : NONE;
      if (child > answer)
        answer = child;
    }
    return answer;
  };
  const merge2 = (answer) => {
    if (answer > result)
      result = answer;
  };
  const def = inst._zod.def;
  const kind = def.type;
  switch (kind) {
    case "object": {
      const raw2 = rawShape(def);
      merge2(raw2 ? shape(raw2) : ASSUMED);
      check(def.catchall);
      break;
    }
    case "array":
      check(def.element);
      break;
    case "tuple":
      for (const el of def.items)
        check(el);
      check(def.rest);
      break;
    case "record":
    case "map":
      check(def.keyType);
      check(def.valueType);
      break;
    case "set":
      check(def.valueType);
      break;
    case "union":
      for (const el of def.options)
        check(el);
      break;
    case "intersection":
      check(def.left);
      check(def.right);
      break;
    case "optional":
    case "nullable":
    case "default":
    case "prefault":
    case "catch":
    case "readonly":
    case "nonoptional":
    case "promise":
    case "success":
      check(def.innerType);
      break;
    case "pipe":
      check(def.in);
      check(def.out);
      break;
    case "function":
      check(def.input);
      check(def.output);
      break;
    // `$ZodLazy` caches its inner on the def, so a resolved edge is followed exactly
    case "lazy": {
      const inner = def._cachedInner ?? void 0;
      merge2(inner ? isRecursive(inner, stack) : ASSUMED);
      break;
    }
    // a leaf by choice: `parts` are regex fragments, not data positions
    case "template_literal":
    // leaves
    case "string":
    case "number":
    case "int":
    case "boolean":
    case "bigint":
    case "symbol":
    case "undefined":
    case "null":
    case "void":
    case "never":
    case "any":
    case "unknown":
    case "date":
    case "nan":
    case "enum":
    case "literal":
    case "file":
    case "transform":
    case "custom":
      break;
    default: {
      for (const key in def) {
        const desc = Object.getOwnPropertyDescriptor(def, key);
        if (!desc || desc.get)
          continue;
        const value = desc.value;
        if (!value || typeof value !== "object")
          continue;
        if (value._zod)
          check(value);
        else if (Array.isArray(value))
          for (const el of value)
            check(el);
      }
    }
  }
  stack.delete(inst);
  return settle(inst, result);
}
function settle(inst, answer) {
  if (answer !== ASSUMED)
    recursive.set(inst, answer === PROVEN);
  return answer;
}
function bucketFor(state, inst) {
  let bucket = state.buckets.get(inst);
  if (!bucket) {
    bucket = /* @__PURE__ */ new WeakMap();
    state.buckets.set(inst, bucket);
  }
  return bucket;
}
let handoff;
const open = [];
const memo = {
  alloc(_inst, payload, empty) {
    const bucket = handoff;
    if (!bucket)
      return empty;
    handoff = void 0;
    const entry = { value: empty, issues: null };
    bucket.set(payload.value, entry);
    open.push(entry);
    return empty;
  },
  guard(inst) {
    var _a2;
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    inst._zod.deferred.push(() => {
      const base = inst._zod.parse;
      const wrapped = (payload, ctx) => {
        if (ctx.direction !== "backward" && isBackEdge(ctx, payload.value))
          throw new $ZodCyclicError();
        return base(payload, ctx);
      };
      inst._zod.parse = wrapped;
      if (inst._zod.run === base)
        inst._zod.run = wrapped;
    });
  },
  attach(inst) {
    var _a2;
    let isRecursiveInst;
    let rechecked = false;
    let lastCtx;
    let lastBucket;
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    inst._zod.deferred.push(() => {
      const base = inst._zod.parse;
      const wrapped = (payload, ctx) => {
        if (isRecursiveInst === void 0) {
          const walked = isRecursive(inst, /* @__PURE__ */ new Set());
          if (walked === NONE) {
            inst._zod.parse = base;
            if (inst._zod.run === wrapped)
              inst._zod.run = base;
            return base(payload, ctx);
          }
          if (walked === PROVEN || rechecked)
            isRecursiveInst = true;
          else
            rechecked = true;
        }
        const input = payload.value;
        if (!isRef(input))
          return base(payload, ctx);
        let state = ctx[STATE];
        if (!state) {
          state = { buckets: /* @__PURE__ */ new WeakMap(), backEdges: void 0 };
          ctx[STATE] = state;
        }
        let bucket;
        if (lastCtx === ctx) {
          bucket = lastBucket;
        } else {
          bucket = bucketFor(state, inst);
          lastCtx = ctx;
          lastBucket = bucket;
        }
        const hit = bucket.get(input);
        if (hit) {
          payload.value = hit.value;
          if (hit.issues) {
            if (hit.issues.length)
              payload.issues.push(...cloneIssues(hit.issues));
          } else {
            payload.memo = true;
            state.backEdges ?? (state.backEdges = /* @__PURE__ */ new WeakSet());
            state.backEdges.add(hit.value);
          }
          return payload;
        }
        handoff = bucket;
        const depth = open.length;
        const result = base(payload, ctx);
        handoff = void 0;
        const entry = open.length > depth ? open.pop() : void 0;
        if (result instanceof Promise) {
          return result.then((r) => {
            if (entry)
              entry.issues = r.issues.length ? cloneIssues(r.issues) : NO_ISSUES;
            return r;
          });
        }
        if (entry)
          entry.issues = result.issues.length ? cloneIssues(result.issues) : NO_ISSUES;
        return result;
      };
      inst._zod.parse = wrapped;
      if (inst._zod.run === base)
        inst._zod.run = wrapped;
    });
  }
};
function memoizer() {
  return memo;
}
function isBackEdge(ctx, value) {
  const backEdges = ctx[STATE]?.backEdges;
  return backEdges !== void 0 && isRef(value) && backEdges.has(value);
}
const error = () => {
  const Sizable = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" },
    map: { unit: "entries", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    mac: "MAC address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    currency_code: "currency code",
    credit_card: "credit card number",
    iban: "IBAN",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    // Compatibility: "nan" -> "NaN" for display
    nan: "NaN"
    // All other type names omitted - they fall back to raw values via ?? operator
  };
  function getTypeName(type, input) {
    if (type === "number" && typeof input === "number" && !Number.isFinite(input)) {
      return String(input);
    }
    return TypeDictionary[type] ?? type;
  }
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = getTypeName(issue2.expected);
        const receivedType = parsedType(issue2.input);
        const received = getTypeName(receivedType, issue2.input);
        return `Invalid input: expected ${expected}, received ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.exact ? "exactly " : issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Too big: expected ${issue2.origin ?? "value"} to have ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Too big: expected ${issue2.origin ?? "value"} to be ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.exact ? "exactly " : issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Invalid string: must start with "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Invalid string: must end with "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Invalid string: must include "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Invalid string: must match pattern ${_issue.pattern}`;
        return `Invalid ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${issue2.origin}`;
      case "invalid_union":
        if (issue2.options && Array.isArray(issue2.options) && issue2.options.length > 0) {
          const opts = issue2.options.map((o) => `'${o}'`).join(" | ");
          return `Invalid discriminator value. Expected ${opts}`;
        }
        if (issue2.inclusive === false) {
          return "Invalid input: more than one option matched";
        }
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${issue2.origin}`;
      default:
        return `Invalid input`;
    }
  };
};
function en() {
  return {
    localeError: error()
  };
}
var _a;
class $ZodRegistry {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : void 0;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
}
function registry$1() {
  return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry$1());
const globalRegistry = globalThis.__zod_globalRegistry;
function snapshotChecks(def) {
  if (def.checks)
    def.checks = [...def.checks];
  return def;
}
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
  return new Class(snapshotChecks({ type: "string", ...normalizeParams(params) }));
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
  return new Class({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
  return new Class({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
  return new Class({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _emoji(Class, params) {
  return new Class({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
  return new Class({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
  return new Class({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
  return new Class({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
  return new Class({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
  return new Class({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
  return new Class({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
  return new Class({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
  return new Class({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
  return new Class({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
  return new Class({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
  return new Class({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
  return new Class({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
  return new Class({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
  return new Class({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
  return new Class({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
  return new Class({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
  return new Class(snapshotChecks({ type: "number", checks: [], ...normalizeParams(params) }));
}
// @__NO_SIDE_EFFECTS__
function _coercedNumber(Class, params) {
  return new Class(snapshotChecks({ type: "number", coerce: true, checks: [], ...normalizeParams(params) }));
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
  return new Class({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
  return new Class({
    type: "boolean",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _null$1(Class, params) {
  return new Class({
    type: "null",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _any(Class) {
  return new Class({
    type: "any"
  });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
  return new Class({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
  return new Class({
    type: "never",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
  return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
  return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
  return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
  return new Class({
    type: "array",
    element,
    // get element() {
    //   return element;
    // },
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _custom(Class, fn, _params) {
  const norm = normalizeParams(_params);
  norm.abort ?? (norm.abort = true);
  const schema = new Class({
    type: "custom",
    check: "custom",
    fn,
    ...norm
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
  const schema = new Class({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn, params) {
  const ch = /* @__PURE__ */ _check((payload) => {
    payload.addIssue = (issue$1) => {
      if (typeof issue$1 === "string") {
        payload.issues.push(issue(issue$1, payload.value, ch._zod.def));
      } else {
        const _issue = issue$1;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        if (!("input" in _issue))
          _issue.input = payload.value;
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  }, params);
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
function assignProps(target, ...sources) {
  for (const source of sources) {
    for (const key of Reflect.ownKeys(source)) {
      if (Object.prototype.propertyIsEnumerable.call(source, key)) {
        assignProp(target, key, source[key]);
      }
    }
  }
  return target;
}
function initializeContext(params) {
  let target = params?.target ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: params?.metadata ?? globalRegistry,
    target,
    unrepresentable: params?.unrepresentable ?? "throw",
    override: params?.override ?? (() => {
    }),
    io: params?.io ?? "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    sharedDefsExtractedFor: void 0,
    sharedEmitDoneFor: void 0,
    cycles: params?.cycles ?? "ref",
    reused: params?.reused ?? "inline",
    intersections: [],
    deferred: [],
    external: params?.external ?? void 0
  };
}
function handleUnrepresentable(schema, ctx, json, params, message) {
  const result = typeof ctx.unrepresentable === "function" ? ctx.unrepresentable({ zodSchema: schema, path: params.path, message }) : ctx.unrepresentable;
  if (result === "any")
    return false;
  if (result === void 0 || result === "throw")
    throw new Error(message);
  Object.assign(json, result);
  return true;
}
function processSchema(schema, ctx, _params = { path: [], schemaPath: [] }) {
  var _a2;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
  ctx.seen.set(schema, result);
  ctx.sharedDefsExtractedFor = void 0;
  ctx.sharedEmitDoneFor = void 0;
  const overrideSchema = schema._zod.toJSONSchema?.();
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const parent = schema._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      processSchema(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta = ctx.metadataRegistry.get(schema);
  if (meta)
    assignProps(result.schema, meta);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && "_prefault" in result.schema)
    (_a2 = result.schema).default ?? (_a2.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function encodeJSONPointerSegment(segment) {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
function extractDefs(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  if (ctx.external && ctx.sharedDefsExtractedFor === ctx.external)
    return;
  const idToSchema = /* @__PURE__ */ new Map();
  for (const entry of ctx.seen.entries()) {
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = ctx.external.registry.get(entry[0])?.id;
      const uriGenerator = ctx.external.uri ?? ((id2) => id2);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${encodeJSONPointerSegment(id)}` };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    if (entry[1] === root && !entry[1].schema.id) {
      return { ref: uriPrefix };
    }
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + encodeJSONPointerSegment(defId) };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema2 = seen.schema;
    for (const key in schema2) {
      delete schema2[key];
    }
    schema2.$ref = ref;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = ctx.external.registry.get(entry[0])?.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
      }
    }
  }
  if (ctx.external)
    ctx.sharedDefsExtractedFor = ctx.external;
}
function compactTypeUnion(schema) {
  const options = schema.anyOf;
  if (!Array.isArray(options) || options.length === 0 || schema.type !== void 0)
    return;
  const types = [];
  for (const option of options) {
    if (!option || typeof option !== "object")
      return;
    compactTypeUnion(option);
    const keys = Object.keys(option);
    if (keys.length !== 1 || keys[0] !== "type")
      return;
    const type = option.type;
    for (const member of Array.isArray(type) ? type : [type]) {
      if (typeof member !== "string")
        return;
      if (!types.includes(member))
        types.push(member);
    }
  }
  delete schema.anyOf;
  schema.type = types.length === 1 ? types[0] : types;
}
const FOLDABLE_KEYS = /* @__PURE__ */ new Set(["type", "properties", "required", "additionalProperties"]);
const UNION_KEYS = ["oneOf", "anyOf"];
function undeclaredConstraint(member) {
  const extra = member.additionalProperties;
  if (extra === void 0 || extra === false || typeof extra !== "object" || extra === null)
    return null;
  return Object.keys(extra).length ? extra : null;
}
function foldObjects(members2) {
  const objects = [];
  for (const member of members2) {
    if (typeof member !== "object" || member.type !== "object")
      return null;
    for (const key in member) {
      if (!FOLDABLE_KEYS.has(key))
        return null;
    }
    objects.push(member);
  }
  const properties = {};
  const required2 = /* @__PURE__ */ new Set();
  for (const object2 of objects) {
    for (const key in object2.properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key))
        continue;
      const parts = [];
      for (const other of objects) {
        const part = other.properties?.[key] ?? undeclaredConstraint(other);
        if (part === null || part === void 0)
          continue;
        if (!parts.some((seen) => JSON.stringify(seen) === JSON.stringify(part)))
          parts.push(part);
      }
      const merged = parts.length === 1 ? parts[0] : foldObjects(parts) ?? { allOf: parts };
      assignProp(properties, key, merged);
    }
    for (const key of object2.required ?? [])
      required2.add(key);
  }
  const folded = { type: "object", properties };
  if (required2.size)
    folded.required = [...required2];
  if (objects.every((object2) => object2.additionalProperties === false)) {
    folded.additionalProperties = false;
  } else {
    const constraints = [];
    for (const object2 of objects) {
      const constraint = undeclaredConstraint(object2);
      if (constraint && !constraints.some((seen) => JSON.stringify(seen) === JSON.stringify(constraint)))
        constraints.push(constraint);
    }
    if (constraints.length === 1)
      folded.additionalProperties = constraints[0];
    else if (constraints.length > 1)
      folded.additionalProperties = { allOf: constraints };
  }
  return folded;
}
function foldIntersection(json) {
  const allOf = json.allOf;
  if (!Array.isArray(allOf) || allOf.length < 2)
    return;
  for (const key of FOLDABLE_KEYS)
    if (key in json)
      return;
  const unions = allOf.filter((m) => UNION_KEYS.some((k) => Array.isArray(m[k])));
  let folded = null;
  if (!unions.length) {
    folded = foldObjects(allOf);
  } else {
    const union2 = unions[0];
    const keyword = UNION_KEYS.find((k) => Array.isArray(union2[k]));
    if (Object.keys(union2).length !== 1)
      return;
    const rest = allOf.filter((m) => m !== union2);
    const branches = union2[keyword].map((branch) => foldObjects([...rest, branch]));
    if (branches.some((b) => !b))
      return;
    folded = { [keyword]: branches };
  }
  if (!folded)
    return;
  delete json.allOf;
  assignProps(json, folded);
}
function finalize(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema2 = seen.def ?? seen.schema;
    const _cached = { ...schema2 };
    const ref = seen.ref;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema2.allOf = schema2.allOf ?? [];
        schema2.allOf.push(refSchema);
      } else {
        assignProps(schema2, refSchema);
      }
      assignProps(schema2, _cached);
      const isParentRef = zodSchema._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema2[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema2[key];
          }
        }
      }
    }
    const parent = zodSchema._zod.parent;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen?.schema.$ref) {
        schema2.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema2,
      path: seen.path ?? []
    });
  };
  if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
    for (const entry of [...ctx.seen.entries()].reverse()) {
      flattenRef(entry[0]);
    }
    if (ctx.target !== "openapi-3.0") {
      for (const entry of ctx.seen.entries()) {
        compactTypeUnion(entry[1].def ?? entry[1].schema);
      }
    }
    for (const rewrite of ctx.deferred)
      rewrite();
    if (ctx.intersections.length) {
      const carriers = /* @__PURE__ */ new Map();
      for (const seen of ctx.seen.values()) {
        for (const json of [seen.schema, seen.def]) {
          const allOf = json?.allOf;
          if (!Array.isArray(allOf))
            continue;
          const existing = carriers.get(allOf);
          if (existing)
            existing.push(json);
          else
            carriers.set(allOf, [json]);
        }
      }
      for (const allOf of ctx.intersections) {
        for (const json of carriers.get(allOf) ?? [])
          foldIntersection(json);
      }
    }
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") ;
  else ;
  if (ctx.external?.uri) {
    const id = ctx.external.registry.get(schema)?.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  assignProps(result, root.defId ? root.schema : root.def ?? root.schema);
  const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
  if (rootMetaId !== void 0 && result.id === rootMetaId)
    delete result.id;
  const defs = ctx.external?.defs ?? {};
  if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.def && seen.defId) {
        if (seen.def.id === seen.defId)
          delete seen.def.id;
        assignProp(defs, seen.defId, seen.def);
      }
    }
  }
  if (ctx.external)
    ctx.sharedEmitDoneFor = ctx.external;
  if (ctx.external) ;
  else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault" || def.type === "catch") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    if (_schema._zod.traits.has("$ZodCodec"))
      return true;
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  processSchema(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
  processSchema(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
const narrowMin = (agg, key, value) => {
  if (agg[key] === void 0 || value > agg[key])
    agg[key] = value;
};
const narrowMax = (agg, key, value) => {
  if (agg[key] === void 0 || value < agg[key])
    agg[key] = value;
};
const narrowBoth = (agg, value) => {
  narrowMin(agg, "minimum", value);
  narrowMax(agg, "maximum", value);
};
const addDivisor = (agg, value) => {
  agg.multipleOf ?? (agg.multipleOf = []);
  if (!agg.multipleOf.includes(value))
    agg.multipleOf.push(value);
};
const addPattern = (agg, pattern) => {
  agg.patterns ?? (agg.patterns = /* @__PURE__ */ new Set());
  agg.patterns.add(pattern);
};
const intersectMime = (agg, mime) => {
  agg.mime = agg.mime ? agg.mime.filter((m) => mime.includes(m)) : [...mime];
};
const setFormat = (agg, format) => {
  agg.format = format;
  if (format.includes("int"))
    agg.isInt = true;
};
const minContributor = (agg, def) => narrowMin(agg, "minimum", def.minimum);
const maxContributor = (agg, def) => narrowMax(agg, "maximum", def.maximum);
const formatContributor = (ranges) => (agg, def) => {
  setFormat(agg, def.format);
  const [minimum, maximum] = ranges[def.format];
  narrowMin(agg, "minimum", minimum);
  narrowMax(agg, "maximum", maximum);
};
const contributors = {
  greater_than: (agg, def) => narrowMin(agg, def.inclusive ? "minimum" : "exclusiveMinimum", def.value),
  less_than: (agg, def) => narrowMax(agg, def.inclusive ? "maximum" : "exclusiveMaximum", def.value),
  multiple_of: (agg, def) => addDivisor(agg, def.value),
  number_format: formatContributor(NUMBER_FORMAT_RANGES),
  bigint_format: formatContributor(BIGINT_FORMAT_RANGES),
  min_length: minContributor,
  max_length: maxContributor,
  length_equals: (agg, def) => narrowBoth(agg, def.length),
  min_size: minContributor,
  max_size: maxContributor,
  size_equals: (agg, def) => narrowBoth(agg, def.size),
  string_format: (agg, def) => {
    setFormat(agg, def.format);
    if (def.pattern)
      addPattern(agg, def.pattern);
    if (def.format === "base64" || def.format === "base64url")
      agg.contentEncoding = def.format;
    if (def.local || def.precision === -1)
      agg.laxFormat = true;
  },
  mime_type: (agg, def) => intersectMime(agg, def.mime)
};
function aggregateChecks(schema) {
  const agg = {};
  const def = schema._zod.def;
  const list = schema._zod.traits.has("$ZodCheck") ? [schema, ...def.checks ?? []] : def.checks ?? [];
  for (const ch of list)
    contributors[ch._zod.def.check]?.(agg, ch._zod.def);
  const bag = schema._zod.bag;
  if (bag.minimum !== void 0)
    narrowMin(agg, "minimum", bag.minimum);
  if (bag.exclusiveMinimum !== void 0)
    narrowMin(agg, "exclusiveMinimum", bag.exclusiveMinimum);
  if (bag.maximum !== void 0)
    narrowMax(agg, "maximum", bag.maximum);
  if (bag.exclusiveMaximum !== void 0)
    narrowMax(agg, "exclusiveMaximum", bag.exclusiveMaximum);
  if (bag.multipleOf !== void 0)
    addDivisor(agg, bag.multipleOf);
  if (bag.format !== void 0) {
    agg.format ?? (agg.format = bag.format);
    if (bag.format.includes("int"))
      agg.isInt = true;
  }
  if (bag.mime)
    intersectMime(agg, bag.mime);
  for (const pattern of bag.patterns ?? [])
    addPattern(agg, pattern);
  return agg;
}
const formatMap = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
};
const exactPatterns = /* @__PURE__ */ new Map([
  [base64Charset, base64],
  [base64urlCharset, base64url]
]);
const exactPattern = (p) => exactPatterns.get(p) ?? p;
const stringProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  json.type = "string";
  const { minimum, maximum, format, patterns, contentEncoding, laxFormat } = aggregateChecks(schema);
  if (typeof minimum === "number")
    json.minLength = minimum;
  if (typeof maximum === "number")
    json.maxLength = maximum;
  if (format) {
    json.format = formatMap[format] ?? format;
    if (json.format === "")
      delete json.format;
    if (format === "time" || laxFormat) {
      delete json.format;
    }
  }
  if (contentEncoding)
    json.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    const patternList = [...patterns].map(exactPattern);
    if (patternList.length === 1)
      json.pattern = patternList[0].source;
    else if (patternList.length > 1) {
      json.allOf = [
        ...patternList.map((regex) => ({
          ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
          pattern: regex.source
        }))
      ];
    }
  }
};
const numberProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const { minimum, maximum, multipleOf, exclusiveMaximum, exclusiveMinimum, isInt } = aggregateChecks(schema);
  json.type = isInt ? "integer" : "number";
  const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
  const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
  const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
  if (exMin) {
    if (legacy) {
      json.minimum = exclusiveMinimum;
      json.exclusiveMinimum = true;
    } else {
      json.exclusiveMinimum = exclusiveMinimum;
    }
  } else if (typeof minimum === "number") {
    json.minimum = minimum;
  }
  if (exMax) {
    if (legacy) {
      json.maximum = exclusiveMaximum;
      json.exclusiveMaximum = true;
    } else {
      json.exclusiveMaximum = exclusiveMaximum;
    }
  } else if (typeof maximum === "number") {
    json.maximum = maximum;
  }
  if (multipleOf) {
    const divisors = /* @__PURE__ */ new Set();
    for (const divisor of multipleOf) {
      if (Number.isFinite(divisor) && divisor !== 0)
        divisors.add(Math.abs(divisor));
      else
        handleUnrepresentable(schema, ctx, json, params, `A multipleOf divisor of ${divisor} cannot be represented in JSON Schema`);
    }
    const [first, ...rest] = divisors;
    if (first !== void 0)
      json.multipleOf = first;
    if (rest.length)
      json.allOf = [...json.allOf ?? [], ...rest.map((m) => ({ multipleOf: m }))];
  }
};
const booleanProcessor = (_schema, _ctx, json, _params) => {
  json.type = "boolean";
};
const nullProcessor = (_schema, ctx, json, _params) => {
  if (ctx.target === "openapi-3.0") {
    json.type = "string";
    json.nullable = true;
    json.enum = [null];
  } else {
    json.type = "null";
  }
};
const neverProcessor = (_schema, _ctx, json, _params) => {
  json.not = {};
};
const anyProcessor = (_schema, _ctx, _json, _params) => {
};
const unknownProcessor = (_schema, _ctx, _json, _params) => {
};
const enumProcessor = (schema, _ctx, json, _params) => {
  const def = schema._zod.def;
  const values2 = getEnumValues(def.entries);
  if (values2.length === 0) {
    json.not = {};
    return;
  }
  if (values2.every((v) => typeof v === "number"))
    json.type = "number";
  if (values2.every((v) => typeof v === "string"))
    json.type = "string";
  json.enum = values2;
};
const literalProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  if (def.values.length === 0) {
    json.not = {};
    return;
  }
  const vals = [];
  for (const val of def.values) {
    if (val === void 0) {
      if (handleUnrepresentable(schema, ctx, json, params, "Literal `undefined` cannot be represented in JSON Schema"))
        return;
    } else if (typeof val === "bigint") {
      if (handleUnrepresentable(schema, ctx, json, params, "BigInt literals cannot be represented in JSON Schema"))
        return;
      vals.push(Number(val));
    } else {
      vals.push(val);
    }
  }
  if (vals.length === 0) ;
  else if (vals.length === 1) {
    const val = vals[0];
    json.type = val === null ? "null" : typeof val;
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json.enum = [val];
    } else {
      json.const = val;
    }
  } else {
    if (vals.every((v) => typeof v === "number"))
      json.type = "number";
    if (vals.every((v) => typeof v === "string"))
      json.type = "string";
    if (vals.every((v) => typeof v === "boolean"))
      json.type = "boolean";
    if (vals.every((v) => v === null))
      json.type = "null";
    json.enum = vals;
  }
};
const customProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Custom types cannot be represented in JSON Schema");
};
const transformProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Transforms cannot be represented in JSON Schema");
};
const arrayProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  const { minimum, maximum } = aggregateChecks(schema);
  if (typeof minimum === "number")
    json.minItems = minimum;
  if (typeof maximum === "number")
    json.maxItems = maximum;
  json.type = "array";
  json.items = processSchema(def.element, ctx, {
    ...params,
    path: [...params.path, "items"]
  });
};
function inputOptin(schema) {
  const def = schema._zod.def;
  if (def.type === "pipe" && def.in._zod.traits.has("$ZodTransform")) {
    return inputOptin(def.out);
  }
  if (def.type === "catch") {
    return inputOptin(def.innerType);
  }
  return schema._zod.optin;
}
const objectProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  const shape = def.shape;
  const symbolKeys = Object.getOwnPropertySymbols(shape);
  if (symbolKeys.length && handleUnrepresentable(schema, ctx, json, params, "Symbol keys cannot be represented in JSON Schema")) {
    return;
  }
  json.type = "object";
  json.properties = {};
  for (const key in shape) {
    assignProp(json.properties, key, processSchema(shape[key], ctx, {
      ...params,
      path: [...params.path, "properties", key]
    }));
  }
  const requiredKeys = [];
  for (const key of Object.keys(shape)) {
    const field = def.shape[key];
    if (ctx.io === "input" ? inputOptin(field) === void 0 : field._zod.optout === void 0) {
      requiredKeys.push(key);
    }
  }
  if (requiredKeys.length > 0) {
    json.required = requiredKeys;
  }
  if (def.catchall?._zod.def.type === "never") {
    json.additionalProperties = false;
  } else if (!def.catchall) {
    if (ctx.io === "output")
      json.additionalProperties = false;
  } else if (def.catchall) {
    json.additionalProperties = processSchema(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
};
const unionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i) => processSchema(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json.oneOf = options;
  } else {
    json.anyOf = options;
  }
};
const intersectionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const a = processSchema(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = processSchema(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json.allOf = allOf;
  ctx.intersections.push(allOf);
};
function stringifyKeyNames(bySchema, json, visited) {
  if (json.$ref) {
    if (visited.has(json))
      return json;
    visited.add(json);
    const def = bySchema.get(json)?.def;
    if (!def)
      return json;
    const inlined = stringifyKeyNames(bySchema, def, visited);
    return inlined === def ? json : inlined;
  }
  for (const keyword of ["anyOf", "oneOf"]) {
    const branches = json[keyword];
    if (!Array.isArray(branches))
      continue;
    const mapped = branches.map((branch) => stringifyKeyNames(bySchema, branch, visited));
    if (mapped.some((branch, i) => branch !== branches[i]))
      json = { ...json, [keyword]: mapped };
  }
  const types = Array.isArray(json.type) ? json.type : [json.type];
  const numericType = !types.includes("string") && types.some((t) => t === "number" || t === "integer");
  const values2 = json.enum ?? (json.const !== void 0 ? [json.const] : void 0);
  if (!numericType && !values2?.some((v) => typeof v === "number"))
    return json;
  const { minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf, format, id, ...rest } = json;
  if (rest.enum)
    rest.enum = rest.enum.map((v) => typeof v === "number" ? String(v) : v);
  else if (typeof rest.const === "number")
    rest.const = String(rest.const);
  if (!numericType)
    return rest;
  rest.type = "string";
  if (!values2)
    rest.pattern = (types.includes("number") ? number$2 : integer).source;
  return rest;
}
const pendingRecords = /* @__PURE__ */ new WeakMap();
function rewriteKeyNames(ctx) {
  const bySchema = /* @__PURE__ */ new Map();
  for (const entry of ctx.seen.values()) {
    if (entry.def && !bySchema.has(entry.schema))
      bySchema.set(entry.schema, entry);
  }
  const rewrites = /* @__PURE__ */ new Map();
  for (const record2 of pendingRecords.get(ctx) ?? []) {
    const seen = ctx.seen.get(record2);
    const names = (seen?.def ?? seen?.schema)?.propertyNames;
    if (!names || names === true || rewrites.has(names))
      continue;
    const rewritten = stringifyKeyNames(bySchema, names, /* @__PURE__ */ new Set());
    if (rewritten !== names)
      rewrites.set(names, rewritten);
  }
  if (!rewrites.size)
    return;
  for (const entry of ctx.seen.values()) {
    for (const carrier of [entry.schema, entry.def]) {
      const rewritten = carrier && rewrites.get(carrier.propertyNames);
      if (rewritten)
        carrier.propertyNames = rewritten;
    }
  }
}
const recordProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "object";
  const keyType = def.keyType;
  const patterns = aggregateChecks(keyType).patterns;
  if (def.mode === "loose" && patterns && patterns.size > 0) {
    const valueSchema = processSchema(def.valueType, ctx, {
      ...params,
      path: [...params.path, "patternProperties", "*"]
    });
    json.patternProperties = {};
    for (const pattern of patterns) {
      assignProp(json.patternProperties, exactPattern(pattern).source, valueSchema);
    }
  } else {
    if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
      json.propertyNames = processSchema(def.keyType, ctx, {
        ...params,
        path: [...params.path, "propertyNames"]
      });
      let pending = pendingRecords.get(ctx);
      if (!pending) {
        pending = [];
        pendingRecords.set(ctx, pending);
        ctx.deferred.push(() => rewriteKeyNames(ctx));
      }
      pending.push(schema);
    }
    json.additionalProperties = processSchema(def.valueType, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
  const keyValues = keyType._zod.values;
  const omittableOnInput = ctx.io === "input" && inputOptin(def.valueType) !== void 0;
  if (keyValues && !def.partial && !omittableOnInput) {
    const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
    if (validKeyValues.length > 0) {
      json.required = validKeyValues.map(String);
    }
  }
};
const nullableProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const inner = processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json.nullable = true;
  } else {
    json.anyOf = [inner, { type: "null" }];
  }
};
const nonoptionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
const UNREPRESENTABLE_DEFAULT = /* @__PURE__ */ Symbol();
function serializeDefaultValue(value, schema, ctx, json, params) {
  let unrepresentable = false;
  const serialized = JSON.stringify(value, (_, val) => {
    if (typeof val !== "bigint")
      return val;
    unrepresentable = true;
    return null;
  });
  if (!unrepresentable)
    return JSON.parse(serialized);
  handleUnrepresentable(schema, ctx, json, params, "BigInt defaults cannot be represented in JSON Schema");
  return UNREPRESENTABLE_DEFAULT;
}
const defaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  const value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
  if (value !== UNREPRESENTABLE_DEFAULT)
    json.default = value;
};
const prefaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io !== "input")
    return;
  const value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
  if (value !== UNREPRESENTABLE_DEFAULT)
    json._prefault = value;
};
const catchProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(void 0);
  } catch {
    handleUnrepresentable(schema, ctx, json, params, "Dynamic catch values are not supported in JSON Schema");
    return;
  }
  json.default = catchValue;
};
const pipeProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  const inIsTransform = def.in._zod.traits.has("$ZodTransform");
  const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
  processSchema(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
const readonlyProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.readOnly = true;
};
const optionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
const _installedErrorProtos = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
function _lazyMethod(proto, key, make) {
  Object.defineProperty(proto, key, {
    configurable: true,
    enumerable: false,
    get() {
      const value = make(this);
      Object.defineProperty(this, key, { value, configurable: true, writable: true });
      return value;
    },
    set(value) {
      Object.defineProperty(this, key, { value, configurable: true, writable: true });
    }
  });
}
const initializer = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  const proto = Object.getPrototypeOf(inst);
  if (_installedErrorProtos.has(proto))
    return;
  _installedErrorProtos.add(proto);
  _lazyMethod(proto, "format", (self) => (mapper) => formatError(self, mapper));
  _lazyMethod(proto, "flatten", (self) => (mapper) => flattenError(self, mapper));
  _lazyMethod(proto, "addIssue", (self) => (issue2) => {
    self.issues.push(issue2);
    self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
  });
  _lazyMethod(proto, "addIssues", (self) => (issues2) => {
    self.issues.push(...issues2);
    self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
  });
  Object.defineProperty(proto, "isEmpty", {
    configurable: true,
    enumerable: false,
    get() {
      return this.issues.length === 0;
    }
  });
};
const ZodRealError = /* @__PURE__ */ $constructor("ZodError", initializer, void 0, {
  Parent: Error
});
const parse = /* @__PURE__ */ _parse(ZodRealError);
const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
const encode = /* @__PURE__ */ _encode(ZodRealError);
const decode = /* @__PURE__ */ _decode(ZodRealError);
const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
function _ensureDefaultLocale() {
  if (!globalConfig.localeError)
    config(en());
}
function _ensureDefaultMemoizer() {
  if (!globalConfig.memoizer)
    config({ memoizer: memoizer() });
}
const ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  _ensureDefaultLocale();
  $ZodType.init(inst, def);
  inst.def = def;
  inst.type = def.type;
  return inst;
}, {
  check(...chks) {
    const def = this.def;
    return this.clone(mergeDefs(def, {
      checks: [
        ...def.checks ?? [],
        ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
      ]
    }), { parent: true });
  },
  with(...chks) {
    return this.check(...chks);
  },
  clone(def, params) {
    return clone(this, def, params);
  },
  brand() {
    return this;
  },
  register(reg, meta) {
    reg.add(this, meta);
    return this;
  },
  refine(check, params) {
    return this.check(refine(check, params));
  },
  superRefine(refinement, params) {
    return this.check(superRefine(refinement, params));
  },
  overwrite(fn) {
    return this.check(/* @__PURE__ */ _overwrite(fn));
  },
  optional() {
    return optional(this);
  },
  exactOptional() {
    return exactOptional(this);
  },
  nullable() {
    return nullable(this);
  },
  nullish() {
    return optional(nullable(this));
  },
  nonoptional(params) {
    return nonoptional(this, params);
  },
  array() {
    return array(this);
  },
  or(arg) {
    return union([this, arg]);
  },
  and(arg) {
    return intersection(this, arg);
  },
  transform(tx) {
    return pipe(this, transform(tx));
  },
  default(d) {
    return _default(this, d);
  },
  prefault(d) {
    return prefault(this, d);
  },
  catch(params) {
    return _catch(this, params);
  },
  pipe(target) {
    return pipe(this, target);
  },
  readonly() {
    return readonly(this);
  },
  describe(description) {
    const cl = this.clone();
    globalRegistry.add(cl, { description });
    return cl;
  },
  meta(...args) {
    if (args.length === 0)
      return globalRegistry.get(this);
    const cl = this.clone();
    globalRegistry.add(cl, args[0]);
    return cl;
  },
  isOptional() {
    return this.safeParse(void 0).success;
  },
  isNullable() {
    return this.safeParse(null).success;
  },
  apply(fn, ...args) {
    return args.length === 0 ? fn(this) : fn(this, ...args);
  },
  // Overrides core's `~standard` to add `jsonSchema`. Must stay a prototype entry: redefining it per instance demotes instances to dictionary mode.
  get "~standard"() {
    return hide(this, "~standard", {
      ...standardProps(this),
      jsonSchema: {
        input: createStandardJSONSchemaMethod(this, "input"),
        output: createStandardJSONSchemaMethod(this, "output")
      }
    });
  },
  set "~standard"(value) {
    own(this, "~standard", value);
  },
  parse: function _parse2(data, params) {
    return parse(this, data, params, { callee: _parse2 });
  },
  parseAsync: async function _parseAsync2(data, params) {
    return await parseAsync(this, data, params, { callee: _parseAsync2 });
  },
  safeParse(data, params) {
    return safeParse(this, data, params);
  },
  async safeParseAsync(data, params) {
    return safeParseAsync(this, data, params);
  },
  // `spa` is an alias: same function object as `safeParseAsync`, as before.
  get spa() {
    return this?.safeParseAsync;
  },
  set spa(value) {
    own(this, "spa", value);
  },
  validate(data, params) {
    return validate(this, data, params);
  },
  validateAsync(data, params) {
    return validateAsync$1(this, data, params);
  },
  encode: function _encode2(data, params) {
    return encode(this, data, params, { callee: _encode2 });
  },
  decode: function _decode2(data, params) {
    return decode(this, data, params, { callee: _decode2 });
  },
  encodeAsync: async function _encodeAsync2(data, params) {
    return await encodeAsync(this, data, params, { callee: _encodeAsync2 });
  },
  decodeAsync: async function _decodeAsync2(data, params) {
    return await decodeAsync(this, data, params, { callee: _decodeAsync2 });
  },
  safeEncode(data, params) {
    return safeEncode(this, data, params);
  },
  safeDecode(data, params) {
    return safeDecode(this, data, params);
  },
  async safeEncodeAsync(data, params) {
    return safeEncodeAsync(this, data, params);
  },
  async safeDecodeAsync(data, params) {
    return safeDecodeAsync(this, data, params);
  },
  toJSONSchema(params) {
    return createToJSONSchemaMethod(this, {})(params);
  },
  // Reads through to the registry on every access, so it must not cache.
  get description() {
    return globalRegistry.get(this)?.description;
  },
  // No setter: `schema._def = x` throws, as it did when `_def` was a non-writable own property.
  get _def() {
    return this._zod.def;
  }
});
const _ZodString = /* @__PURE__ */ $constructor(
  "_ZodString",
  (inst, def) => {
    $ZodString.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json);
  },
  /* @__PURE__ */ derived({
    format: (inst) => aggregateChecks(inst).format ?? null,
    minLength: (inst) => aggregateChecks(inst).minimum ?? null,
    maxLength: (inst) => aggregateChecks(inst).maximum ?? null
  }, {
    regex(...args) {
      return this.check(/* @__PURE__ */ _regex(...args));
    },
    includes(...args) {
      return this.check(/* @__PURE__ */ _includes(...args));
    },
    startsWith(...args) {
      return this.check(/* @__PURE__ */ _startsWith(...args));
    },
    endsWith(...args) {
      return this.check(/* @__PURE__ */ _endsWith(...args));
    },
    min(...args) {
      return this.check(/* @__PURE__ */ _minLength(...args));
    },
    max(...args) {
      return this.check(/* @__PURE__ */ _maxLength(...args));
    },
    length(...args) {
      return this.check(/* @__PURE__ */ _length(...args));
    },
    nonempty(...args) {
      return this.check(/* @__PURE__ */ _minLength(1, ...args));
    },
    lowercase(params) {
      return this.check(/* @__PURE__ */ _lowercase(params));
    },
    uppercase(params) {
      return this.check(/* @__PURE__ */ _uppercase(params));
    },
    trim() {
      return this.check(/* @__PURE__ */ _trim());
    },
    normalize(...args) {
      return this.check(/* @__PURE__ */ _normalize(...args));
    },
    toLowerCase() {
      return this.check(/* @__PURE__ */ _toLowerCase());
    },
    toUpperCase() {
      return this.check(/* @__PURE__ */ _toUpperCase());
    },
    slugify() {
      return this.check(/* @__PURE__ */ _slugify());
    }
  })
);
const ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  _ZodString.init(inst, def);
}, {
  email(params) {
    return this.check(/* @__PURE__ */ _email(ZodEmail, params));
  },
  url(params) {
    return this.check(/* @__PURE__ */ _url(ZodURL, params));
  },
  jwt(params) {
    return this.check(/* @__PURE__ */ _jwt(ZodJWT, params));
  },
  emoji(params) {
    return this.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
  },
  guid(params) {
    return this.check(/* @__PURE__ */ _guid(ZodGUID, params));
  },
  uuid(params) {
    return this.check(/* @__PURE__ */ _uuid(ZodUUID, params));
  },
  uuidv4(params) {
    return this.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
  },
  uuidv6(params) {
    return this.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
  },
  uuidv7(params) {
    return this.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
  },
  nanoid(params) {
    return this.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
  },
  cuid(params) {
    return this.check(/* @__PURE__ */ _cuid(ZodCUID, params));
  },
  cuid2(params) {
    return this.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
  },
  ulid(params) {
    return this.check(/* @__PURE__ */ _ulid(ZodULID, params));
  },
  base64(params) {
    return this.check(/* @__PURE__ */ _base64(ZodBase64, params));
  },
  base64url(params) {
    return this.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
  },
  xid(params) {
    return this.check(/* @__PURE__ */ _xid(ZodXID, params));
  },
  ksuid(params) {
    return this.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
  },
  ipv4(params) {
    return this.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
  },
  ipv6(params) {
    return this.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
  },
  cidrv4(params) {
    return this.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
  },
  cidrv6(params) {
    return this.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
  },
  e164(params) {
    return this.check(/* @__PURE__ */ _e164(ZodE164, params));
  },
  datetime(params) {
    return this.check(/* @__PURE__ */ _isoDateTime(ZodISODateTime, params));
  },
  date(params) {
    return this.check(/* @__PURE__ */ _isoDate(ZodISODate, params));
  },
  time(params) {
    return this.check(/* @__PURE__ */ _isoTime(ZodISOTime, params));
  },
  duration(params) {
    return this.check(/* @__PURE__ */ _isoDuration(ZodISODuration, params));
  }
});
function string(params) {
  return /* @__PURE__ */ _string(ZodString, params);
}
const ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  _ZodString.init(inst, def);
});
const ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function url(params) {
  return /* @__PURE__ */ _url(ZodURL, params);
}
const ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
  $ZodCIDRv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodNumber = /* @__PURE__ */ $constructor(
  "ZodNumber",
  (inst, def) => {
    $ZodNumber.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
    inst.isFinite = true;
  },
  /* @__PURE__ */ derived({
    minValue: (inst) => {
      const { minimum, exclusiveMinimum } = aggregateChecks(inst);
      return Math.max(minimum ?? Number.NEGATIVE_INFINITY, exclusiveMinimum ?? Number.NEGATIVE_INFINITY);
    },
    maxValue: (inst) => {
      const { maximum, exclusiveMaximum } = aggregateChecks(inst);
      return Math.min(maximum ?? Number.POSITIVE_INFINITY, exclusiveMaximum ?? Number.POSITIVE_INFINITY);
    },
    isInt: (inst) => {
      const { isInt, multipleOf } = aggregateChecks(inst);
      return !!isInt || !!multipleOf?.some(Number.isSafeInteger);
    },
    format: (inst) => aggregateChecks(inst).format ?? null
  }, {
    gt(value, params) {
      return this.check(/* @__PURE__ */ _gt(value, params));
    },
    gte(value, params) {
      return this.check(/* @__PURE__ */ _gte(value, params));
    },
    min(value, params) {
      return this.check(/* @__PURE__ */ _gte(value, params));
    },
    lt(value, params) {
      return this.check(/* @__PURE__ */ _lt(value, params));
    },
    lte(value, params) {
      return this.check(/* @__PURE__ */ _lte(value, params));
    },
    max(value, params) {
      return this.check(/* @__PURE__ */ _lte(value, params));
    },
    int(params) {
      return this.check(int(params));
    },
    safe(params) {
      return this.check(int(params));
    },
    positive(params) {
      return this.check(/* @__PURE__ */ _gt(0, params));
    },
    nonnegative(params) {
      return this.check(/* @__PURE__ */ _gte(0, params));
    },
    negative(params) {
      return this.check(/* @__PURE__ */ _lt(0, params));
    },
    nonpositive(params) {
      return this.check(/* @__PURE__ */ _lte(0, params));
    },
    multipleOf(value, params) {
      return this.check(/* @__PURE__ */ _multipleOf(value, params));
    },
    step(value, params) {
      return this.check(/* @__PURE__ */ _multipleOf(value, params));
    },
    finite() {
      return this;
    }
  })
);
function number$1(params) {
  return /* @__PURE__ */ _number(ZodNumber, params);
}
const ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return /* @__PURE__ */ _int(ZodNumberFormat, params);
}
const ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json);
});
function boolean(params) {
  return /* @__PURE__ */ _boolean(ZodBoolean, params);
}
const ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
  $ZodNull.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json);
});
function _null(params) {
  return /* @__PURE__ */ _null$1(ZodNull, params);
}
const ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
  $ZodAny.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => anyProcessor();
});
function any() {
  return /* @__PURE__ */ _any(ZodAny);
}
const ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor();
});
function unknown() {
  return /* @__PURE__ */ _unknown(ZodUnknown);
}
const ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json);
});
function never(params) {
  return /* @__PURE__ */ _never(ZodNever, params);
}
const ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  _ensureDefaultMemoizer();
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
  inst.element = def.element;
}, {
  min(n, params) {
    return this.check(/* @__PURE__ */ _minLength(n, params));
  },
  nonempty(params) {
    return this.check(/* @__PURE__ */ _minLength(1, params));
  },
  max(n, params) {
    return this.check(/* @__PURE__ */ _maxLength(n, params));
  },
  length(n, params) {
    return this.check(/* @__PURE__ */ _length(n, params));
  },
  unwrap() {
    return this.element;
  }
});
function array(element, params) {
  return /* @__PURE__ */ _array(ZodArray, element, params);
}
const ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  _ensureDefaultMemoizer();
  $ZodObjectJIT.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
  installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
}, {
  keyof() {
    return _enum(Object.keys(this._zod.def.shape));
  },
  catchall(catchall) {
    return this.clone(mergeDefs(this._zod.def, { catchall }));
  },
  passthrough() {
    return this.clone(mergeDefs(this._zod.def, { catchall: unknown() }));
  },
  loose() {
    return this.clone(mergeDefs(this._zod.def, { catchall: unknown() }));
  },
  strict() {
    return this.clone(mergeDefs(this._zod.def, { catchall: never() }));
  },
  strip() {
    return this.clone(mergeDefs(this._zod.def, { catchall: void 0 }));
  },
  extend(incoming) {
    return extend(this, incoming);
  },
  safeExtend(incoming) {
    return safeExtend(this, incoming);
  },
  merge(other) {
    return merge(this, other);
  },
  pick(mask) {
    return pick(this, mask);
  },
  omit(mask) {
    return omit(this, mask);
  },
  partial(...args) {
    return partial(ZodOptional, this, args[0]);
  },
  exactPartial(...args) {
    return partial(ZodExactOptional, this, args[0], "exactPartial");
  },
  required(...args) {
    return required(ZodNonOptional, this, args[0]);
  }
});
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...normalizeParams(params)
  };
  return new ZodObject(def);
}
function looseObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: unknown(),
    ...normalizeParams(params)
  });
}
const ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
  inst.options = def.options;
});
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
const ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
  ZodUnion.init(inst, def);
  $ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...normalizeParams(params)
  });
}
const ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
const ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
  _ensureDefaultMemoizer();
  $ZodRecord.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
  if (!valueType || !valueType._zod) {
    return new ZodRecord({
      type: "record",
      keyType: string(),
      valueType: keyType,
      ...normalizeParams(valueType)
    });
  }
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
const ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json);
  inst.enum = def.entries;
  inst.options = [...inst._zod.values];
  const keys = new Set(Object.keys(def.entries));
  inst.extract = (values2, params) => {
    const newEntries = {};
    for (const value of values2) {
      if (keys.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values2, params) => {
    const newEntries = { ...def.entries };
    for (const value of values2) {
      if (keys.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum(values2, params) {
  const entries = Array.isArray(values2) ? Object.fromEntries(values2.map((v) => [v, v])) : values2;
  return new ZodEnum({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
const ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
  inst.values = new Set(def.values);
  Object.defineProperty(inst, "value", {
    get() {
      if (def.values.length > 1) {
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      }
      return def.values[0];
    }
  });
});
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
const ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  _ensureDefaultMemoizer();
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    payload.addIssue = (issue$1) => {
      if (typeof issue$1 === "string") {
        payload.issues.push(issue(issue$1, payload.value, def));
      } else {
        const _issue = issue$1;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        if (!("input" in _issue))
          _issue.input = payload.value;
        _issue.inst ?? (_issue.inst = inst);
        payload.issues.push(issue(_issue));
      }
    };
    const output = def.transform(payload.value, payload);
    if (output instanceof Promise) {
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    payload.value = output;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
const ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
const ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
  $ZodExactOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
const ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
const ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
const ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
const ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
const ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : constantCatch(catchValue)
  });
}
const ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
    // ...util.normalizeParams(params),
  });
}
const ZodPreprocess = /* @__PURE__ */ $constructor("ZodPreprocess", (inst, def) => {
  ZodPipe.init(inst, def);
  $ZodPreprocess.init(inst, def);
});
const ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
const ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
});
function custom(fn, _params) {
  return /* @__PURE__ */ _custom(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
  return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
  return /* @__PURE__ */ _superRefine(fn, params);
}
function preprocess(fn, schema) {
  return new ZodPreprocess({
    type: "pipe",
    in: transform(fn),
    out: schema
  });
}
const ZodIssueCode = {
  custom: "custom"
};
function datetime(params) {
  return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
}
function number(params) {
  return /* @__PURE__ */ _coercedNumber(ZodNumber, params);
}
const LATEST_PROTOCOL_VERSION = "2025-11-25";
const RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
const JSONRPC_VERSION = "2.0";
const AssertObjectSchema = custom((v) => v !== null && (typeof v === "object" || typeof v === "function"));
const ProgressTokenSchema = union([string(), number$1().int()]);
const CursorSchema = string();
looseObject({
  /**
   * Time in milliseconds to keep task results available after completion.
   * If null, the task has unlimited lifetime until manually cleaned up.
   */
  ttl: union([number$1(), _null()]).optional(),
  /**
   * Time in milliseconds to wait between task status requests.
   */
  pollInterval: number$1().optional()
});
const TaskMetadataSchema = object({
  ttl: number$1().optional()
});
const RelatedTaskMetadataSchema = object({
  taskId: string()
});
const RequestMetaSchema = looseObject({
  /**
   * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
   */
  progressToken: ProgressTokenSchema.optional(),
  /**
   * If specified, this request is related to the provided task.
   */
  [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional()
});
const BaseRequestParamsSchema = object({
  /**
   * See [General fields: `_meta`](/specification/draft/basic/index#meta) for notes on `_meta` usage.
   */
  _meta: RequestMetaSchema.optional()
});
const TaskAugmentedRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * If specified, the caller is requesting task-augmented execution for this request.
   * The request will return a CreateTaskResult immediately, and the actual result can be
   * retrieved later via tasks/result.
   *
   * Task augmentation is subject to capability negotiation - receivers MUST declare support
   * for task augmentation of specific request types in their capabilities.
   */
  task: TaskMetadataSchema.optional()
});
const RequestSchema = object({
  method: string(),
  params: BaseRequestParamsSchema.loose().optional()
});
const NotificationsParamsSchema = object({
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: RequestMetaSchema.optional()
});
const NotificationSchema = object({
  method: string(),
  params: NotificationsParamsSchema.loose().optional()
});
const ResultSchema = looseObject({
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: RequestMetaSchema.optional()
});
const RequestIdSchema = union([string(), number$1().int()]);
const JSONRPCRequestSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  ...RequestSchema.shape
}).strict();
const JSONRPCNotificationSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  ...NotificationSchema.shape
}).strict();
const JSONRPCResultResponseSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  result: ResultSchema
}).strict();
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2[ErrorCode2["ConnectionClosed"] = -32e3] = "ConnectionClosed";
  ErrorCode2[ErrorCode2["RequestTimeout"] = -32001] = "RequestTimeout";
  ErrorCode2[ErrorCode2["ParseError"] = -32700] = "ParseError";
  ErrorCode2[ErrorCode2["InvalidRequest"] = -32600] = "InvalidRequest";
  ErrorCode2[ErrorCode2["MethodNotFound"] = -32601] = "MethodNotFound";
  ErrorCode2[ErrorCode2["InvalidParams"] = -32602] = "InvalidParams";
  ErrorCode2[ErrorCode2["InternalError"] = -32603] = "InternalError";
  ErrorCode2[ErrorCode2["UrlElicitationRequired"] = -32042] = "UrlElicitationRequired";
})(ErrorCode || (ErrorCode = {}));
const JSONRPCErrorResponseSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema.optional(),
  error: object({
    /**
     * The error type that occurred.
     */
    code: number$1().int(),
    /**
     * A short description of the error. The message SHOULD be limited to a concise single sentence.
     */
    message: string(),
    /**
     * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
     */
    data: unknown().optional()
  })
}).strict();
union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResultResponseSchema,
  JSONRPCErrorResponseSchema
]);
union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
const EmptyResultSchema = ResultSchema.strict();
const CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The ID of the request to cancel.
   *
   * This MUST correspond to the ID of a request previously issued in the same direction.
   */
  requestId: RequestIdSchema.optional(),
  /**
   * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
   */
  reason: string().optional()
});
const CancelledNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/cancelled"),
  params: CancelledNotificationParamsSchema
});
const IconSchema = object({
  /**
   * URL or data URI for the icon.
   */
  src: string(),
  /**
   * Optional MIME type for the icon.
   */
  mimeType: string().optional(),
  /**
   * Optional array of strings that specify sizes at which the icon can be used.
   * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
   *
   * If not provided, the client should assume that the icon can be used at any size.
   */
  sizes: array(string()).optional(),
  /**
   * Optional specifier for the theme this icon is designed for. `light` indicates
   * the icon is designed to be used with a light background, and `dark` indicates
   * the icon is designed to be used with a dark background.
   *
   * If not provided, the client should assume the icon can be used with any theme.
   */
  theme: _enum(["light", "dark"]).optional()
});
const IconsSchema = object({
  /**
   * Optional set of sized icons that the client can display in a user interface.
   *
   * Clients that support rendering icons MUST support at least the following MIME types:
   * - `image/png` - PNG images (safe, universal compatibility)
   * - `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)
   *
   * Clients that support rendering icons SHOULD also support:
   * - `image/svg+xml` - SVG images (scalable but requires security precautions)
   * - `image/webp` - WebP images (modern, efficient format)
   */
  icons: array(IconSchema).optional()
});
const BaseMetadataSchema = object({
  /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
  name: string(),
  /**
   * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
   * even by those unfamiliar with domain-specific terminology.
   *
   * If not provided, the name should be used for display (except for Tool,
   * where `annotations.title` should be given precedence over using `name`,
   * if present).
   */
  title: string().optional()
});
const ImplementationSchema = BaseMetadataSchema.extend({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  version: string(),
  /**
   * An optional URL of the website for this implementation.
   */
  websiteUrl: string().optional(),
  /**
   * An optional human-readable description of what this implementation does.
   *
   * This can be used by clients or servers to provide context about their purpose
   * and capabilities. For example, a server might describe the types of resources
   * or tools it provides, while a client might describe its intended use case.
   */
  description: string().optional()
});
const FormElicitationCapabilitySchema = intersection(object({
  applyDefaults: boolean().optional()
}), record(string(), unknown()));
const ElicitationCapabilitySchema = preprocess((value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (Object.keys(value).length === 0) {
      return { form: {} };
    }
  }
  return value;
}, intersection(object({
  form: FormElicitationCapabilitySchema.optional(),
  url: AssertObjectSchema.optional()
}), record(string(), unknown()).optional()));
const ClientTasksCapabilitySchema = looseObject({
  /**
   * Present if the client supports listing tasks.
   */
  list: AssertObjectSchema.optional(),
  /**
   * Present if the client supports cancelling tasks.
   */
  cancel: AssertObjectSchema.optional(),
  /**
   * Capabilities for task creation on specific request types.
   */
  requests: looseObject({
    /**
     * Task support for sampling requests.
     */
    sampling: looseObject({
      createMessage: AssertObjectSchema.optional()
    }).optional(),
    /**
     * Task support for elicitation requests.
     */
    elicitation: looseObject({
      create: AssertObjectSchema.optional()
    }).optional()
  }).optional()
});
const ServerTasksCapabilitySchema = looseObject({
  /**
   * Present if the server supports listing tasks.
   */
  list: AssertObjectSchema.optional(),
  /**
   * Present if the server supports cancelling tasks.
   */
  cancel: AssertObjectSchema.optional(),
  /**
   * Capabilities for task creation on specific request types.
   */
  requests: looseObject({
    /**
     * Task support for tool requests.
     */
    tools: looseObject({
      call: AssertObjectSchema.optional()
    }).optional()
  }).optional()
});
const ClientCapabilitiesSchema = object({
  /**
   * Experimental, non-standard capabilities that the client supports.
   */
  experimental: record(string(), AssertObjectSchema).optional(),
  /**
   * Present if the client supports sampling from an LLM.
   */
  sampling: object({
    /**
     * Present if the client supports context inclusion via includeContext parameter.
     * If not declared, servers SHOULD only use `includeContext: "none"` (or omit it).
     */
    context: AssertObjectSchema.optional(),
    /**
     * Present if the client supports tool use via tools and toolChoice parameters.
     */
    tools: AssertObjectSchema.optional()
  }).optional(),
  /**
   * Present if the client supports eliciting user input.
   */
  elicitation: ElicitationCapabilitySchema.optional(),
  /**
   * Present if the client supports listing roots.
   */
  roots: object({
    /**
     * Whether the client supports issuing notifications for changes to the roots list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the client supports task creation.
   */
  tasks: ClientTasksCapabilitySchema.optional()
});
const InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
   */
  protocolVersion: string(),
  capabilities: ClientCapabilitiesSchema,
  clientInfo: ImplementationSchema
});
const InitializeRequestSchema = RequestSchema.extend({
  method: literal("initialize"),
  params: InitializeRequestParamsSchema
});
const ServerCapabilitiesSchema = object({
  /**
   * Experimental, non-standard capabilities that the server supports.
   */
  experimental: record(string(), AssertObjectSchema).optional(),
  /**
   * Present if the server supports sending log messages to the client.
   */
  logging: AssertObjectSchema.optional(),
  /**
   * Present if the server supports sending completions to the client.
   */
  completions: AssertObjectSchema.optional(),
  /**
   * Present if the server offers any prompt templates.
   */
  prompts: object({
    /**
     * Whether this server supports issuing notifications for changes to the prompt list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server offers any resources to read.
   */
  resources: object({
    /**
     * Whether this server supports clients subscribing to resource updates.
     */
    subscribe: boolean().optional(),
    /**
     * Whether this server supports issuing notifications for changes to the resource list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server offers any tools to call.
   */
  tools: object({
    /**
     * Whether this server supports issuing notifications for changes to the tool list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server supports task creation.
   */
  tasks: ServerTasksCapabilitySchema.optional()
});
const InitializeResultSchema = ResultSchema.extend({
  /**
   * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
   */
  protocolVersion: string(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ImplementationSchema,
  /**
   * Instructions describing how to use the server and its features.
   *
   * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
   */
  instructions: string().optional()
});
const InitializedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/initialized"),
  params: NotificationsParamsSchema.optional()
});
const PingRequestSchema = RequestSchema.extend({
  method: literal("ping"),
  params: BaseRequestParamsSchema.optional()
});
const ProgressSchema = object({
  /**
   * The progress thus far. This should increase every time progress is made, even if the total is unknown.
   */
  progress: number$1(),
  /**
   * Total number of items to process (or total progress required), if known.
   */
  total: optional(number$1()),
  /**
   * An optional message describing the current progress.
   */
  message: optional(string())
});
const ProgressNotificationParamsSchema = object({
  ...NotificationsParamsSchema.shape,
  ...ProgressSchema.shape,
  /**
   * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
   */
  progressToken: ProgressTokenSchema
});
const ProgressNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/progress"),
  params: ProgressNotificationParamsSchema
});
const PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * An opaque token representing the current pagination position.
   * If provided, the server should return results starting after this cursor.
   */
  cursor: CursorSchema.optional()
});
const PaginatedRequestSchema = RequestSchema.extend({
  params: PaginatedRequestParamsSchema.optional()
});
const PaginatedResultSchema = ResultSchema.extend({
  /**
   * An opaque token representing the pagination position after the last returned result.
   * If present, there may be more results available.
   */
  nextCursor: CursorSchema.optional()
});
const TaskStatusSchema = _enum(["working", "input_required", "completed", "failed", "cancelled"]);
const TaskSchema = object({
  taskId: string(),
  status: TaskStatusSchema,
  /**
   * Time in milliseconds to keep task results available after completion.
   * If null, the task has unlimited lifetime until manually cleaned up.
   */
  ttl: union([number$1(), _null()]),
  /**
   * ISO 8601 timestamp when the task was created.
   */
  createdAt: string(),
  /**
   * ISO 8601 timestamp when the task was last updated.
   */
  lastUpdatedAt: string(),
  pollInterval: optional(number$1()),
  /**
   * Optional diagnostic message for failed tasks or other status information.
   */
  statusMessage: optional(string())
});
const CreateTaskResultSchema = ResultSchema.extend({
  task: TaskSchema
});
const TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
const TaskStatusNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tasks/status"),
  params: TaskStatusNotificationParamsSchema
});
const GetTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/get"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
const GetTaskResultSchema = ResultSchema.merge(TaskSchema);
const GetTaskPayloadRequestSchema = RequestSchema.extend({
  method: literal("tasks/result"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
ResultSchema.loose();
const ListTasksRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tasks/list")
});
const ListTasksResultSchema = PaginatedResultSchema.extend({
  tasks: array(TaskSchema)
});
const CancelTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/cancel"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
ResultSchema.merge(TaskSchema);
const ResourceContentsSchema = object({
  /**
   * The URI of this resource.
   */
  uri: string(),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optional(string()),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
const TextResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
   */
  text: string()
});
const Base64Schema = string().refine((val) => {
  try {
    atob(val);
    return true;
  } catch {
    return false;
  }
}, { message: "Invalid Base64 string" });
const BlobResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * A base64-encoded string representing the binary data of the item.
   */
  blob: Base64Schema
});
const RoleSchema = _enum(["user", "assistant"]);
const AnnotationsSchema = object({
  /**
   * Intended audience(s) for the resource.
   */
  audience: array(RoleSchema).optional(),
  /**
   * Importance hint for the resource, from 0 (least) to 1 (most).
   */
  priority: number$1().min(0).max(1).optional(),
  /**
   * ISO 8601 timestamp for the most recent modification.
   */
  lastModified: datetime({ offset: true }).optional()
});
const ResourceSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * The URI of this resource.
   */
  uri: string(),
  /**
   * A description of what this resource represents.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: optional(string()),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optional(string()),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
const ResourceTemplateSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * A URI template (according to RFC 6570) that can be used to construct resource URIs.
   */
  uriTemplate: string(),
  /**
   * A description of what this template is for.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: optional(string()),
  /**
   * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
   */
  mimeType: optional(string()),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
const ListResourcesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/list")
});
const ListResourcesResultSchema = PaginatedResultSchema.extend({
  resources: array(ResourceSchema)
});
const ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/templates/list")
});
const ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
  resourceTemplates: array(ResourceTemplateSchema)
});
const ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
   *
   * @format uri
   */
  uri: string()
});
const ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
const ReadResourceRequestSchema = RequestSchema.extend({
  method: literal("resources/read"),
  params: ReadResourceRequestParamsSchema
});
const ReadResourceResultSchema = ResultSchema.extend({
  contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema]))
});
const ResourceListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/list_changed"),
  params: NotificationsParamsSchema.optional()
});
const SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
const SubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/subscribe"),
  params: SubscribeRequestParamsSchema
});
const UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
const UnsubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/unsubscribe"),
  params: UnsubscribeRequestParamsSchema
});
const ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
   */
  uri: string()
});
const ResourceUpdatedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/updated"),
  params: ResourceUpdatedNotificationParamsSchema
});
const PromptArgumentSchema = object({
  /**
   * The name of the argument.
   */
  name: string(),
  /**
   * A human-readable description of the argument.
   */
  description: optional(string()),
  /**
   * Whether this argument must be provided.
   */
  required: optional(boolean())
});
const PromptSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * An optional description of what this prompt provides
   */
  description: optional(string()),
  /**
   * A list of arguments to use for templating the prompt.
   */
  arguments: optional(array(PromptArgumentSchema)),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
const ListPromptsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("prompts/list")
});
const ListPromptsResultSchema = PaginatedResultSchema.extend({
  prompts: array(PromptSchema)
});
const GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The name of the prompt or prompt template.
   */
  name: string(),
  /**
   * Arguments to use for templating the prompt.
   */
  arguments: record(string(), string()).optional()
});
const GetPromptRequestSchema = RequestSchema.extend({
  method: literal("prompts/get"),
  params: GetPromptRequestParamsSchema
});
const TextContentSchema = object({
  type: literal("text"),
  /**
   * The text content of the message.
   */
  text: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
const ImageContentSchema = object({
  type: literal("image"),
  /**
   * The base64-encoded image data.
   */
  data: Base64Schema,
  /**
   * The MIME type of the image. Different providers may support different image types.
   */
  mimeType: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
const AudioContentSchema = object({
  type: literal("audio"),
  /**
   * The base64-encoded audio data.
   */
  data: Base64Schema,
  /**
   * The MIME type of the audio. Different providers may support different audio types.
   */
  mimeType: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
const ToolUseContentSchema = object({
  type: literal("tool_use"),
  /**
   * The name of the tool to invoke.
   * Must match a tool name from the request's tools array.
   */
  name: string(),
  /**
   * Unique identifier for this tool call.
   * Used to correlate with ToolResultContent in subsequent messages.
   */
  id: string(),
  /**
   * Arguments to pass to the tool.
   * Must conform to the tool's inputSchema.
   */
  input: record(string(), unknown()),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
const EmbeddedResourceSchema = object({
  type: literal("resource"),
  resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
const ResourceLinkSchema = ResourceSchema.extend({
  type: literal("resource_link")
});
const ContentBlockSchema = union([
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ResourceLinkSchema,
  EmbeddedResourceSchema
]);
const PromptMessageSchema = object({
  role: RoleSchema,
  content: ContentBlockSchema
});
const GetPromptResultSchema = ResultSchema.extend({
  /**
   * An optional description for the prompt.
   */
  description: string().optional(),
  messages: array(PromptMessageSchema)
});
const PromptListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/prompts/list_changed"),
  params: NotificationsParamsSchema.optional()
});
const ToolAnnotationsSchema = object({
  /**
   * A human-readable title for the tool.
   */
  title: string().optional(),
  /**
   * If true, the tool does not modify its environment.
   *
   * Default: false
   */
  readOnlyHint: boolean().optional(),
  /**
   * If true, the tool may perform destructive updates to its environment.
   * If false, the tool performs only additive updates.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: true
   */
  destructiveHint: boolean().optional(),
  /**
   * If true, calling the tool repeatedly with the same arguments
   * will have no additional effect on the its environment.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: false
   */
  idempotentHint: boolean().optional(),
  /**
   * If true, this tool may interact with an "open world" of external
   * entities. If false, the tool's domain of interaction is closed.
   * For example, the world of a web search tool is open, whereas that
   * of a memory tool is not.
   *
   * Default: true
   */
  openWorldHint: boolean().optional()
});
const ToolExecutionSchema = object({
  /**
   * Indicates the tool's preference for task-augmented execution.
   * - "required": Clients MUST invoke the tool as a task
   * - "optional": Clients MAY invoke the tool as a task or normal request
   * - "forbidden": Clients MUST NOT attempt to invoke the tool as a task
   *
   * If not present, defaults to "forbidden".
   */
  taskSupport: _enum(["required", "optional", "forbidden"]).optional()
});
const ToolSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * A human-readable description of the tool.
   */
  description: string().optional(),
  /**
   * A JSON Schema 2020-12 object defining the expected parameters for the tool.
   * Must have type: 'object' at the root level per MCP spec.
   */
  inputSchema: object({
    type: literal("object"),
    properties: record(string(), AssertObjectSchema).optional(),
    required: array(string()).optional()
  }).catchall(unknown()),
  /**
   * An optional JSON Schema 2020-12 object defining the structure of the tool's output
   * returned in the structuredContent field of a CallToolResult.
   * Must have type: 'object' at the root level per MCP spec.
   */
  outputSchema: object({
    type: literal("object"),
    properties: record(string(), AssertObjectSchema).optional(),
    required: array(string()).optional()
  }).catchall(unknown()).optional(),
  /**
   * Optional additional tool information.
   */
  annotations: ToolAnnotationsSchema.optional(),
  /**
   * Execution-related properties for this tool.
   */
  execution: ToolExecutionSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
const ListToolsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tools/list")
});
const ListToolsResultSchema = PaginatedResultSchema.extend({
  tools: array(ToolSchema)
});
const CallToolResultSchema = ResultSchema.extend({
  /**
   * A list of content objects that represent the result of the tool call.
   *
   * If the Tool does not define an outputSchema, this field MUST be present in the result.
   * For backwards compatibility, this field is always present, but it may be empty.
   */
  content: array(ContentBlockSchema).default([]),
  /**
   * An object containing structured tool output.
   *
   * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
   */
  structuredContent: record(string(), unknown()).optional(),
  /**
   * Whether the tool call ended in an error.
   *
   * If not set, this is assumed to be false (the call was successful).
   *
   * Any errors that originate from the tool SHOULD be reported inside the result
   * object, with `isError` set to true, _not_ as an MCP protocol-level error
   * response. Otherwise, the LLM would not be able to see that an error occurred
   * and self-correct.
   *
   * However, any errors in _finding_ the tool, an error indicating that the
   * server does not support tool calls, or any other exceptional conditions,
   * should be reported as an MCP error response.
   */
  isError: boolean().optional()
});
CallToolResultSchema.or(ResultSchema.extend({
  toolResult: unknown()
}));
const CallToolRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The name of the tool to call.
   */
  name: string(),
  /**
   * Arguments to pass to the tool.
   */
  arguments: record(string(), unknown()).optional()
});
const CallToolRequestSchema = RequestSchema.extend({
  method: literal("tools/call"),
  params: CallToolRequestParamsSchema
});
const ToolListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tools/list_changed"),
  params: NotificationsParamsSchema.optional()
});
object({
  /**
   * If true, the list will be refreshed automatically when a list changed notification is received.
   * The callback will be called with the updated list.
   *
   * If false, the callback will be called with null items, allowing manual refresh.
   *
   * @default true
   */
  autoRefresh: boolean().default(true),
  /**
   * Debounce time in milliseconds for list changed notification processing.
   *
   * Multiple notifications received within this timeframe will only trigger one refresh.
   * Set to 0 to disable debouncing.
   *
   * @default 300
   */
  debounceMs: number$1().int().nonnegative().default(300)
});
const LoggingLevelSchema = _enum(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]);
const SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
   */
  level: LoggingLevelSchema
});
const SetLevelRequestSchema = RequestSchema.extend({
  method: literal("logging/setLevel"),
  params: SetLevelRequestParamsSchema
});
const LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The severity of this log message.
   */
  level: LoggingLevelSchema,
  /**
   * An optional name of the logger issuing this message.
   */
  logger: string().optional(),
  /**
   * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
   */
  data: unknown()
});
const LoggingMessageNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/message"),
  params: LoggingMessageNotificationParamsSchema
});
const ModelHintSchema = object({
  /**
   * A hint for a model name.
   */
  name: string().optional()
});
const ModelPreferencesSchema = object({
  /**
   * Optional hints to use for model selection.
   */
  hints: array(ModelHintSchema).optional(),
  /**
   * How much to prioritize cost when selecting a model.
   */
  costPriority: number$1().min(0).max(1).optional(),
  /**
   * How much to prioritize sampling speed (latency) when selecting a model.
   */
  speedPriority: number$1().min(0).max(1).optional(),
  /**
   * How much to prioritize intelligence and capabilities when selecting a model.
   */
  intelligencePriority: number$1().min(0).max(1).optional()
});
const ToolChoiceSchema = object({
  /**
   * Controls when tools are used:
   * - "auto": Model decides whether to use tools (default)
   * - "required": Model MUST use at least one tool before completing
   * - "none": Model MUST NOT use any tools
   */
  mode: _enum(["auto", "required", "none"]).optional()
});
const ToolResultContentSchema = object({
  type: literal("tool_result"),
  toolUseId: string().describe("The unique identifier for the corresponding tool call."),
  content: array(ContentBlockSchema).default([]),
  structuredContent: object({}).loose().optional(),
  isError: boolean().optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
const SamplingContentSchema = discriminatedUnion("type", [TextContentSchema, ImageContentSchema, AudioContentSchema]);
const SamplingMessageContentBlockSchema = discriminatedUnion("type", [
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ToolUseContentSchema,
  ToolResultContentSchema
]);
const SamplingMessageSchema = object({
  role: RoleSchema,
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
const CreateMessageRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  messages: array(SamplingMessageSchema),
  /**
   * The server's preferences for which model to select. The client MAY modify or omit this request.
   */
  modelPreferences: ModelPreferencesSchema.optional(),
  /**
   * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
   */
  systemPrompt: string().optional(),
  /**
   * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.
   * The client MAY ignore this request.
   *
   * Default is "none". Values "thisServer" and "allServers" are soft-deprecated. Servers SHOULD only use these values if the client
   * declares ClientCapabilities.sampling.context. These values may be removed in future spec releases.
   */
  includeContext: _enum(["none", "thisServer", "allServers"]).optional(),
  temperature: number$1().optional(),
  /**
   * The requested maximum number of tokens to sample (to prevent runaway completions).
   *
   * The client MAY choose to sample fewer tokens than the requested maximum.
   */
  maxTokens: number$1().int(),
  stopSequences: array(string()).optional(),
  /**
   * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
   */
  metadata: AssertObjectSchema.optional(),
  /**
   * Tools that the model may use during generation.
   * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
   */
  tools: array(ToolSchema).optional(),
  /**
   * Controls how the model uses tools.
   * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
   * Default is `{ mode: "auto" }`.
   */
  toolChoice: ToolChoiceSchema.optional()
});
const CreateMessageRequestSchema = RequestSchema.extend({
  method: literal("sampling/createMessage"),
  params: CreateMessageRequestParamsSchema
});
const CreateMessageResultSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: string(),
  /**
   * The reason why sampling stopped, if known.
   *
   * Standard values:
   * - "endTurn": Natural end of the assistant's turn
   * - "stopSequence": A stop sequence was encountered
   * - "maxTokens": Maximum token limit was reached
   *
   * This field is an open string to allow for provider-specific stop reasons.
   */
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens"]).or(string())),
  role: RoleSchema,
  /**
   * Response content. Single content block (text, image, or audio).
   */
  content: SamplingContentSchema
});
const CreateMessageResultWithToolsSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: string(),
  /**
   * The reason why sampling stopped, if known.
   *
   * Standard values:
   * - "endTurn": Natural end of the assistant's turn
   * - "stopSequence": A stop sequence was encountered
   * - "maxTokens": Maximum token limit was reached
   * - "toolUse": The model wants to use one or more tools
   *
   * This field is an open string to allow for provider-specific stop reasons.
   */
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(string())),
  role: RoleSchema,
  /**
   * Response content. May be a single block or array. May include ToolUseContent if stopReason is "toolUse".
   */
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)])
});
const BooleanSchemaSchema = object({
  type: literal("boolean"),
  title: string().optional(),
  description: string().optional(),
  default: boolean().optional()
});
const StringSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  minLength: number$1().optional(),
  maxLength: number$1().optional(),
  format: _enum(["email", "uri", "date", "date-time"]).optional(),
  default: string().optional()
});
const NumberSchemaSchema = object({
  type: _enum(["number", "integer"]),
  title: string().optional(),
  description: string().optional(),
  minimum: number$1().optional(),
  maximum: number$1().optional(),
  default: number$1().optional()
});
const UntitledSingleSelectEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  enum: array(string()),
  default: string().optional()
});
const TitledSingleSelectEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  oneOf: array(object({
    const: string(),
    title: string()
  })),
  default: string().optional()
});
const LegacyTitledEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  enum: array(string()),
  enumNames: array(string()).optional(),
  default: string().optional()
});
const SingleSelectEnumSchemaSchema = union([UntitledSingleSelectEnumSchemaSchema, TitledSingleSelectEnumSchemaSchema]);
const UntitledMultiSelectEnumSchemaSchema = object({
  type: literal("array"),
  title: string().optional(),
  description: string().optional(),
  minItems: number$1().optional(),
  maxItems: number$1().optional(),
  items: object({
    type: literal("string"),
    enum: array(string())
  }),
  default: array(string()).optional()
});
const TitledMultiSelectEnumSchemaSchema = object({
  type: literal("array"),
  title: string().optional(),
  description: string().optional(),
  minItems: number$1().optional(),
  maxItems: number$1().optional(),
  items: object({
    anyOf: array(object({
      const: string(),
      title: string()
    }))
  }),
  default: array(string()).optional()
});
const MultiSelectEnumSchemaSchema = union([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema]);
const EnumSchemaSchema = union([LegacyTitledEnumSchemaSchema, SingleSelectEnumSchemaSchema, MultiSelectEnumSchemaSchema]);
const PrimitiveSchemaDefinitionSchema = union([EnumSchemaSchema, BooleanSchemaSchema, StringSchemaSchema, NumberSchemaSchema]);
const ElicitRequestFormParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The elicitation mode.
   *
   * Optional for backward compatibility. Clients MUST treat missing mode as "form".
   */
  mode: literal("form").optional(),
  /**
   * The message to present to the user describing what information is being requested.
   */
  message: string(),
  /**
   * A restricted subset of JSON Schema.
   * Only top-level properties are allowed, without nesting.
   */
  requestedSchema: object({
    type: literal("object"),
    properties: record(string(), PrimitiveSchemaDefinitionSchema),
    required: array(string()).optional()
  })
});
const ElicitRequestURLParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The elicitation mode.
   */
  mode: literal("url"),
  /**
   * The message to present to the user explaining why the interaction is needed.
   */
  message: string(),
  /**
   * The ID of the elicitation, which must be unique within the context of the server.
   * The client MUST treat this ID as an opaque value.
   */
  elicitationId: string(),
  /**
   * The URL that the user should navigate to.
   */
  url: string().url()
});
const ElicitRequestParamsSchema = union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]);
const ElicitRequestSchema = RequestSchema.extend({
  method: literal("elicitation/create"),
  params: ElicitRequestParamsSchema
});
const ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The ID of the elicitation that completed.
   */
  elicitationId: string()
});
const ElicitationCompleteNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/elicitation/complete"),
  params: ElicitationCompleteNotificationParamsSchema
});
const ElicitResultSchema = ResultSchema.extend({
  /**
   * The user action in response to the elicitation.
   * - "accept": User submitted the form/confirmed the action
   * - "decline": User explicitly decline the action
   * - "cancel": User dismissed without making an explicit choice
   */
  action: _enum(["accept", "decline", "cancel"]),
  /**
   * The submitted form data, only present when action is "accept".
   * Contains values matching the requested schema.
   * Per MCP spec, content is "typically omitted" for decline/cancel actions.
   * We normalize null to undefined for leniency while maintaining type compatibility.
   */
  content: preprocess((val) => val === null ? void 0 : val, record(string(), union([string(), number$1(), boolean(), array(string())])).optional())
});
const ResourceTemplateReferenceSchema = object({
  type: literal("ref/resource"),
  /**
   * The URI or URI template of the resource.
   */
  uri: string()
});
const PromptReferenceSchema = object({
  type: literal("ref/prompt"),
  /**
   * The name of the prompt or prompt template
   */
  name: string()
});
const CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
  ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
  /**
   * The argument's information
   */
  argument: object({
    /**
     * The name of the argument
     */
    name: string(),
    /**
     * The value of the argument to use for completion matching.
     */
    value: string()
  }),
  context: object({
    /**
     * Previously-resolved variables in a URI template or prompt.
     */
    arguments: record(string(), string()).optional()
  }).optional()
});
const CompleteRequestSchema = RequestSchema.extend({
  method: literal("completion/complete"),
  params: CompleteRequestParamsSchema
});
const CompleteResultSchema = ResultSchema.extend({
  completion: looseObject({
    /**
     * An array of completion values. Must not exceed 100 items.
     */
    values: array(string()).max(100),
    /**
     * The total number of completion options available. This can exceed the number of values actually sent in the response.
     */
    total: optional(number$1().int()),
    /**
     * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
     */
    hasMore: optional(boolean())
  })
});
const RootSchema = object({
  /**
   * The URI identifying the root. This *must* start with file:// for now.
   */
  uri: string().startsWith("file://"),
  /**
   * An optional name for the root.
   */
  name: string().optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
const ListRootsRequestSchema = RequestSchema.extend({
  method: literal("roots/list"),
  params: BaseRequestParamsSchema.optional()
});
const ListRootsResultSchema = ResultSchema.extend({
  roots: array(RootSchema)
});
const RootsListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/roots/list_changed"),
  params: NotificationsParamsSchema.optional()
});
union([
  PingRequestSchema,
  InitializeRequestSchema,
  CompleteRequestSchema,
  SetLevelRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema,
  TaskStatusNotificationSchema
]);
union([
  EmptyResultSchema,
  CreateMessageResultSchema,
  CreateMessageResultWithToolsSchema,
  ElicitResultSchema,
  ListRootsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
union([
  PingRequestSchema,
  CreateMessageRequestSchema,
  ElicitRequestSchema,
  ListRootsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  TaskStatusNotificationSchema,
  ElicitationCompleteNotificationSchema
]);
union([
  EmptyResultSchema,
  InitializeResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
  ListToolsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
const SafeUrlSchema = url().superRefine((val, ctx) => {
  if (!URL.canParse(val)) {
    ctx.addIssue({
      code: ZodIssueCode.custom,
      message: "URL must be parseable",
      fatal: true
    });
    return NEVER;
  }
}).refine((url2) => {
  const u = new URL(url2);
  return u.protocol !== "javascript:" && u.protocol !== "data:" && u.protocol !== "vbscript:";
}, { message: "URL cannot use javascript:, data:, or vbscript: scheme" });
const OAuthProtectedResourceMetadataSchema = looseObject({
  resource: string().url(),
  authorization_servers: array(SafeUrlSchema).optional(),
  jwks_uri: string().url().optional(),
  scopes_supported: array(string()).optional(),
  bearer_methods_supported: array(string()).optional(),
  resource_signing_alg_values_supported: array(string()).optional(),
  resource_name: string().optional(),
  resource_documentation: string().optional(),
  resource_policy_uri: string().url().optional(),
  resource_tos_uri: string().url().optional(),
  tls_client_certificate_bound_access_tokens: boolean().optional(),
  authorization_details_types_supported: array(string()).optional(),
  dpop_signing_alg_values_supported: array(string()).optional(),
  dpop_bound_access_tokens_required: boolean().optional()
});
const OAuthMetadataSchema = looseObject({
  issuer: string(),
  authorization_endpoint: SafeUrlSchema,
  token_endpoint: SafeUrlSchema,
  registration_endpoint: SafeUrlSchema.optional(),
  scopes_supported: array(string()).optional(),
  response_types_supported: array(string()),
  response_modes_supported: array(string()).optional(),
  grant_types_supported: array(string()).optional(),
  token_endpoint_auth_methods_supported: array(string()).optional(),
  token_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
  service_documentation: SafeUrlSchema.optional(),
  revocation_endpoint: SafeUrlSchema.optional(),
  revocation_endpoint_auth_methods_supported: array(string()).optional(),
  revocation_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
  introspection_endpoint: string().optional(),
  introspection_endpoint_auth_methods_supported: array(string()).optional(),
  introspection_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
  code_challenge_methods_supported: array(string()).optional(),
  client_id_metadata_document_supported: boolean().optional()
});
const OpenIdProviderMetadataSchema = looseObject({
  issuer: string(),
  authorization_endpoint: SafeUrlSchema,
  token_endpoint: SafeUrlSchema,
  userinfo_endpoint: SafeUrlSchema.optional(),
  jwks_uri: SafeUrlSchema,
  registration_endpoint: SafeUrlSchema.optional(),
  scopes_supported: array(string()).optional(),
  response_types_supported: array(string()),
  response_modes_supported: array(string()).optional(),
  grant_types_supported: array(string()).optional(),
  acr_values_supported: array(string()).optional(),
  subject_types_supported: array(string()),
  id_token_signing_alg_values_supported: array(string()),
  id_token_encryption_alg_values_supported: array(string()).optional(),
  id_token_encryption_enc_values_supported: array(string()).optional(),
  userinfo_signing_alg_values_supported: array(string()).optional(),
  userinfo_encryption_alg_values_supported: array(string()).optional(),
  userinfo_encryption_enc_values_supported: array(string()).optional(),
  request_object_signing_alg_values_supported: array(string()).optional(),
  request_object_encryption_alg_values_supported: array(string()).optional(),
  request_object_encryption_enc_values_supported: array(string()).optional(),
  token_endpoint_auth_methods_supported: array(string()).optional(),
  token_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
  display_values_supported: array(string()).optional(),
  claim_types_supported: array(string()).optional(),
  claims_supported: array(string()).optional(),
  service_documentation: string().optional(),
  claims_locales_supported: array(string()).optional(),
  ui_locales_supported: array(string()).optional(),
  claims_parameter_supported: boolean().optional(),
  request_parameter_supported: boolean().optional(),
  request_uri_parameter_supported: boolean().optional(),
  require_request_uri_registration: boolean().optional(),
  op_policy_uri: SafeUrlSchema.optional(),
  op_tos_uri: SafeUrlSchema.optional(),
  client_id_metadata_document_supported: boolean().optional()
});
const OpenIdProviderDiscoveryMetadataSchema = object({
  ...OpenIdProviderMetadataSchema.shape,
  ...OAuthMetadataSchema.pick({
    code_challenge_methods_supported: true
  }).shape
});
const OAuthTokensSchema = object({
  access_token: string(),
  id_token: string().optional(),
  // Optional for OAuth 2.1, but necessary in OpenID Connect
  token_type: string(),
  expires_in: number().optional(),
  scope: string().optional(),
  refresh_token: string().optional()
}).strip();
const OAuthErrorResponseSchema = object({
  error: string(),
  error_description: string().optional(),
  error_uri: string().optional()
});
const OptionalSafeUrlSchema = SafeUrlSchema.optional().or(literal("").transform(() => void 0));
const OAuthClientMetadataSchema = object({
  redirect_uris: array(SafeUrlSchema),
  token_endpoint_auth_method: string().optional(),
  grant_types: array(string()).optional(),
  response_types: array(string()).optional(),
  client_name: string().optional(),
  client_uri: SafeUrlSchema.optional(),
  logo_uri: OptionalSafeUrlSchema,
  scope: string().optional(),
  contacts: array(string()).optional(),
  tos_uri: OptionalSafeUrlSchema,
  policy_uri: string().optional(),
  jwks_uri: SafeUrlSchema.optional(),
  jwks: any().optional(),
  software_id: string().optional(),
  software_version: string().optional(),
  software_statement: string().optional()
}).strip();
const OAuthClientInformationSchema = object({
  client_id: string(),
  client_secret: string().optional(),
  client_id_issued_at: number$1().optional(),
  client_secret_expires_at: number$1().optional()
}).strip();
const OAuthClientInformationFullSchema = OAuthClientMetadataSchema.merge(OAuthClientInformationSchema);
object({
  error: string(),
  error_description: string().optional()
}).strip();
object({
  token: string(),
  token_type_hint: string().optional()
}).strip();
function resourceUrlFromServerUrl(url2) {
  const resourceURL = typeof url2 === "string" ? new URL(url2) : new URL(url2.href);
  resourceURL.hash = "";
  return resourceURL;
}
function checkResourceAllowed({ requestedResource, configuredResource }) {
  const requested = typeof requestedResource === "string" ? new URL(requestedResource) : new URL(requestedResource.href);
  const configured = typeof configuredResource === "string" ? new URL(configuredResource) : new URL(configuredResource.href);
  if (requested.origin !== configured.origin) {
    return false;
  }
  if (requested.pathname.length < configured.pathname.length) {
    return false;
  }
  const requestedPath = requested.pathname.endsWith("/") ? requested.pathname : requested.pathname + "/";
  const configuredPath = configured.pathname.endsWith("/") ? configured.pathname : configured.pathname + "/";
  return requestedPath.startsWith(configuredPath);
}
class OAuthError extends Error {
  constructor(message, errorUri) {
    super(message);
    this.errorUri = errorUri;
    this.name = this.constructor.name;
  }
  /**
   * Converts the error to a standard OAuth error response object
   */
  toResponseObject() {
    const response = {
      error: this.errorCode,
      error_description: this.message
    };
    if (this.errorUri) {
      response.error_uri = this.errorUri;
    }
    return response;
  }
  get errorCode() {
    return this.constructor.errorCode;
  }
}
class InvalidRequestError extends OAuthError {
}
InvalidRequestError.errorCode = "invalid_request";
class InvalidClientError extends OAuthError {
}
InvalidClientError.errorCode = "invalid_client";
class InvalidGrantError extends OAuthError {
}
InvalidGrantError.errorCode = "invalid_grant";
class UnauthorizedClientError extends OAuthError {
}
UnauthorizedClientError.errorCode = "unauthorized_client";
class UnsupportedGrantTypeError extends OAuthError {
}
UnsupportedGrantTypeError.errorCode = "unsupported_grant_type";
class InvalidScopeError extends OAuthError {
}
InvalidScopeError.errorCode = "invalid_scope";
class AccessDeniedError extends OAuthError {
}
AccessDeniedError.errorCode = "access_denied";
class ServerError extends OAuthError {
}
ServerError.errorCode = "server_error";
class TemporarilyUnavailableError extends OAuthError {
}
TemporarilyUnavailableError.errorCode = "temporarily_unavailable";
class UnsupportedResponseTypeError extends OAuthError {
}
UnsupportedResponseTypeError.errorCode = "unsupported_response_type";
class UnsupportedTokenTypeError extends OAuthError {
}
UnsupportedTokenTypeError.errorCode = "unsupported_token_type";
class InvalidTokenError extends OAuthError {
}
InvalidTokenError.errorCode = "invalid_token";
class MethodNotAllowedError extends OAuthError {
}
MethodNotAllowedError.errorCode = "method_not_allowed";
class TooManyRequestsError extends OAuthError {
}
TooManyRequestsError.errorCode = "too_many_requests";
class InvalidClientMetadataError extends OAuthError {
}
InvalidClientMetadataError.errorCode = "invalid_client_metadata";
class InsufficientScopeError extends OAuthError {
}
InsufficientScopeError.errorCode = "insufficient_scope";
class InvalidTargetError extends OAuthError {
}
InvalidTargetError.errorCode = "invalid_target";
const OAUTH_ERRORS = {
  [InvalidRequestError.errorCode]: InvalidRequestError,
  [InvalidClientError.errorCode]: InvalidClientError,
  [InvalidGrantError.errorCode]: InvalidGrantError,
  [UnauthorizedClientError.errorCode]: UnauthorizedClientError,
  [UnsupportedGrantTypeError.errorCode]: UnsupportedGrantTypeError,
  [InvalidScopeError.errorCode]: InvalidScopeError,
  [AccessDeniedError.errorCode]: AccessDeniedError,
  [ServerError.errorCode]: ServerError,
  [TemporarilyUnavailableError.errorCode]: TemporarilyUnavailableError,
  [UnsupportedResponseTypeError.errorCode]: UnsupportedResponseTypeError,
  [UnsupportedTokenTypeError.errorCode]: UnsupportedTokenTypeError,
  [InvalidTokenError.errorCode]: InvalidTokenError,
  [MethodNotAllowedError.errorCode]: MethodNotAllowedError,
  [TooManyRequestsError.errorCode]: TooManyRequestsError,
  [InvalidClientMetadataError.errorCode]: InvalidClientMetadataError,
  [InsufficientScopeError.errorCode]: InsufficientScopeError,
  [InvalidTargetError.errorCode]: InvalidTargetError
};
function isClientAuthMethod(method) {
  return ["client_secret_basic", "client_secret_post", "none"].includes(method);
}
const AUTHORIZATION_CODE_RESPONSE_TYPE = "code";
const AUTHORIZATION_CODE_CHALLENGE_METHOD = "S256";
function selectClientAuthMethod(clientInformation, supportedMethods) {
  const hasClientSecret = clientInformation.client_secret !== void 0;
  if (supportedMethods.length === 0) {
    return hasClientSecret ? "client_secret_post" : "none";
  }
  if ("token_endpoint_auth_method" in clientInformation && clientInformation.token_endpoint_auth_method && isClientAuthMethod(clientInformation.token_endpoint_auth_method) && supportedMethods.includes(clientInformation.token_endpoint_auth_method)) {
    return clientInformation.token_endpoint_auth_method;
  }
  if (hasClientSecret && supportedMethods.includes("client_secret_basic")) {
    return "client_secret_basic";
  }
  if (hasClientSecret && supportedMethods.includes("client_secret_post")) {
    return "client_secret_post";
  }
  if (supportedMethods.includes("none")) {
    return "none";
  }
  return hasClientSecret ? "client_secret_post" : "none";
}
function applyClientAuthentication(method, clientInformation, headers, params) {
  const { client_id, client_secret } = clientInformation;
  switch (method) {
    case "client_secret_basic":
      applyBasicAuth(client_id, client_secret, headers);
      return;
    case "client_secret_post":
      applyPostAuth(client_id, client_secret, params);
      return;
    case "none":
      applyPublicAuth(client_id, params);
      return;
    default:
      throw new Error(`Unsupported client authentication method: ${method}`);
  }
}
function applyBasicAuth(clientId, clientSecret, headers) {
  if (!clientSecret) {
    throw new Error("client_secret_basic authentication requires a client_secret");
  }
  const credentials = btoa(`${clientId}:${clientSecret}`);
  headers.set("Authorization", `Basic ${credentials}`);
}
function applyPostAuth(clientId, clientSecret, params) {
  params.set("client_id", clientId);
  if (clientSecret) {
    params.set("client_secret", clientSecret);
  }
}
function applyPublicAuth(clientId, params) {
  params.set("client_id", clientId);
}
async function parseErrorResponse(input) {
  const statusCode = input instanceof Response ? input.status : void 0;
  const body = input instanceof Response ? await input.text() : input;
  try {
    const result = OAuthErrorResponseSchema.parse(JSON.parse(body));
    const { error: error2, error_description, error_uri } = result;
    const errorClass = OAUTH_ERRORS[error2] || ServerError;
    return new errorClass(error_description || "", error_uri);
  } catch (error2) {
    const errorMessage = `${statusCode ? `HTTP ${statusCode}: ` : ""}Invalid OAuth error response: ${error2}. Raw body: ${body}`;
    return new ServerError(errorMessage);
  }
}
async function auth(provider, options) {
  try {
    return await authInternal(provider, options);
  } catch (error2) {
    if (error2 instanceof InvalidClientError || error2 instanceof UnauthorizedClientError) {
      await provider.invalidateCredentials?.("all");
      return await authInternal(provider, options);
    } else if (error2 instanceof InvalidGrantError) {
      await provider.invalidateCredentials?.("tokens");
      return await authInternal(provider, options);
    }
    throw error2;
  }
}
async function authInternal(provider, { serverUrl, authorizationCode, scope, resourceMetadataUrl, fetchFn }) {
  const cachedState = await provider.discoveryState?.();
  let resourceMetadata;
  let authorizationServerUrl;
  let metadata;
  let effectiveResourceMetadataUrl = resourceMetadataUrl;
  if (!effectiveResourceMetadataUrl && cachedState?.resourceMetadataUrl) {
    effectiveResourceMetadataUrl = new URL(cachedState.resourceMetadataUrl);
  }
  if (cachedState?.authorizationServerUrl) {
    authorizationServerUrl = cachedState.authorizationServerUrl;
    resourceMetadata = cachedState.resourceMetadata;
    metadata = cachedState.authorizationServerMetadata ?? await discoverAuthorizationServerMetadata(authorizationServerUrl, { fetchFn });
    if (!resourceMetadata) {
      try {
        resourceMetadata = await discoverOAuthProtectedResourceMetadata(serverUrl, { resourceMetadataUrl: effectiveResourceMetadataUrl }, fetchFn);
      } catch {
      }
    }
    if (metadata !== cachedState.authorizationServerMetadata || resourceMetadata !== cachedState.resourceMetadata) {
      await provider.saveDiscoveryState?.({
        authorizationServerUrl: String(authorizationServerUrl),
        resourceMetadataUrl: effectiveResourceMetadataUrl?.toString(),
        resourceMetadata,
        authorizationServerMetadata: metadata
      });
    }
  } else {
    const serverInfo = await discoverOAuthServerInfo(serverUrl, { resourceMetadataUrl: effectiveResourceMetadataUrl, fetchFn });
    authorizationServerUrl = serverInfo.authorizationServerUrl;
    metadata = serverInfo.authorizationServerMetadata;
    resourceMetadata = serverInfo.resourceMetadata;
    await provider.saveDiscoveryState?.({
      authorizationServerUrl: String(authorizationServerUrl),
      resourceMetadataUrl: effectiveResourceMetadataUrl?.toString(),
      resourceMetadata,
      authorizationServerMetadata: metadata
    });
  }
  const resource = await selectResourceURL(serverUrl, provider, resourceMetadata);
  let clientInformation = await Promise.resolve(provider.clientInformation());
  if (!clientInformation) {
    if (authorizationCode !== void 0) {
      throw new Error("Existing OAuth client information is required when exchanging an authorization code");
    }
    const supportsUrlBasedClientId = metadata?.client_id_metadata_document_supported === true;
    const clientMetadataUrl = provider.clientMetadataUrl;
    if (clientMetadataUrl && !isHttpsUrl(clientMetadataUrl)) {
      throw new InvalidClientMetadataError(`clientMetadataUrl must be a valid HTTPS URL with a non-root pathname, got: ${clientMetadataUrl}`);
    }
    const shouldUseUrlBasedClientId = supportsUrlBasedClientId && clientMetadataUrl;
    if (shouldUseUrlBasedClientId) {
      clientInformation = {
        client_id: clientMetadataUrl
      };
      await provider.saveClientInformation?.(clientInformation);
    } else {
      if (!provider.saveClientInformation) {
        throw new Error("OAuth client information must be saveable for dynamic registration");
      }
      const fullInformation = await registerClient(authorizationServerUrl, {
        metadata,
        clientMetadata: provider.clientMetadata,
        fetchFn
      });
      await provider.saveClientInformation(fullInformation);
      clientInformation = fullInformation;
    }
  }
  const nonInteractiveFlow = !provider.redirectUrl;
  if (authorizationCode !== void 0 || nonInteractiveFlow) {
    const tokens2 = await fetchToken(provider, authorizationServerUrl, {
      metadata,
      resource,
      authorizationCode,
      fetchFn
    });
    await provider.saveTokens(tokens2);
    return "AUTHORIZED";
  }
  const tokens = await provider.tokens();
  if (tokens?.refresh_token) {
    try {
      const newTokens = await refreshAuthorization(authorizationServerUrl, {
        metadata,
        clientInformation,
        refreshToken: tokens.refresh_token,
        resource,
        addClientAuthentication: provider.addClientAuthentication,
        fetchFn
      });
      await provider.saveTokens(newTokens);
      return "AUTHORIZED";
    } catch (error2) {
      if (!(error2 instanceof OAuthError) || error2 instanceof ServerError) ;
      else {
        throw error2;
      }
    }
  }
  const state = provider.state ? await provider.state() : void 0;
  const { authorizationUrl, codeVerifier } = await startAuthorization(authorizationServerUrl, {
    metadata,
    clientInformation,
    state,
    redirectUrl: provider.redirectUrl,
    scope: scope || resourceMetadata?.scopes_supported?.join(" ") || provider.clientMetadata.scope,
    resource
  });
  await provider.saveCodeVerifier(codeVerifier);
  await provider.redirectToAuthorization(authorizationUrl);
  return "REDIRECT";
}
function isHttpsUrl(value) {
  if (!value)
    return false;
  try {
    const url2 = new URL(value);
    return url2.protocol === "https:" && url2.pathname !== "/";
  } catch {
    return false;
  }
}
async function selectResourceURL(serverUrl, provider, resourceMetadata) {
  const defaultResource = resourceUrlFromServerUrl(serverUrl);
  if (provider.validateResourceURL) {
    return await provider.validateResourceURL(defaultResource, resourceMetadata?.resource);
  }
  if (!resourceMetadata) {
    return void 0;
  }
  if (!checkResourceAllowed({ requestedResource: defaultResource, configuredResource: resourceMetadata.resource })) {
    throw new Error(`Protected resource ${resourceMetadata.resource} does not match expected ${defaultResource} (or origin)`);
  }
  return new URL(resourceMetadata.resource);
}
async function discoverOAuthProtectedResourceMetadata(serverUrl, opts, fetchFn = fetch) {
  const response = await discoverMetadataWithFallback(serverUrl, "oauth-protected-resource", fetchFn, {
    protocolVersion: opts?.protocolVersion,
    metadataUrl: opts?.resourceMetadataUrl
  });
  if (!response || response.status === 404) {
    await response?.body?.cancel();
    throw new Error(`Resource server does not implement OAuth 2.0 Protected Resource Metadata.`);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`HTTP ${response.status} trying to load well-known OAuth protected resource metadata.`);
  }
  return OAuthProtectedResourceMetadataSchema.parse(await response.json());
}
async function fetchWithCorsRetry(url2, headers, fetchFn = fetch) {
  try {
    return await fetchFn(url2, { headers });
  } catch (error2) {
    if (error2 instanceof TypeError) {
      if (headers) {
        return fetchWithCorsRetry(url2, void 0, fetchFn);
      } else {
        return void 0;
      }
    }
    throw error2;
  }
}
function buildWellKnownPath(wellKnownPrefix, pathname = "", options = {}) {
  if (pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  return options.prependPathname ? `${pathname}/.well-known/${wellKnownPrefix}` : `/.well-known/${wellKnownPrefix}${pathname}`;
}
async function tryMetadataDiscovery(url2, protocolVersion, fetchFn = fetch) {
  const headers = {
    "MCP-Protocol-Version": protocolVersion
  };
  return await fetchWithCorsRetry(url2, headers, fetchFn);
}
function shouldAttemptFallback(response, pathname) {
  return !response || response.status >= 400 && response.status < 500 && pathname !== "/";
}
async function discoverMetadataWithFallback(serverUrl, wellKnownType, fetchFn, opts) {
  const issuer = new URL(serverUrl);
  const protocolVersion = opts?.protocolVersion ?? LATEST_PROTOCOL_VERSION;
  let url2;
  if (opts?.metadataUrl) {
    url2 = new URL(opts.metadataUrl);
  } else {
    const wellKnownPath = buildWellKnownPath(wellKnownType, issuer.pathname);
    url2 = new URL(wellKnownPath, opts?.metadataServerUrl ?? issuer);
    url2.search = issuer.search;
  }
  let response = await tryMetadataDiscovery(url2, protocolVersion, fetchFn);
  if (!opts?.metadataUrl && shouldAttemptFallback(response, issuer.pathname)) {
    const rootUrl = new URL(`/.well-known/${wellKnownType}`, issuer);
    response = await tryMetadataDiscovery(rootUrl, protocolVersion, fetchFn);
  }
  return response;
}
function buildDiscoveryUrls(authorizationServerUrl) {
  const url2 = typeof authorizationServerUrl === "string" ? new URL(authorizationServerUrl) : authorizationServerUrl;
  const hasPath = url2.pathname !== "/";
  const urlsToTry = [];
  if (!hasPath) {
    urlsToTry.push({
      url: new URL("/.well-known/oauth-authorization-server", url2.origin),
      type: "oauth"
    });
    urlsToTry.push({
      url: new URL(`/.well-known/openid-configuration`, url2.origin),
      type: "oidc"
    });
    return urlsToTry;
  }
  let pathname = url2.pathname;
  if (pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  urlsToTry.push({
    url: new URL(`/.well-known/oauth-authorization-server${pathname}`, url2.origin),
    type: "oauth"
  });
  urlsToTry.push({
    url: new URL(`/.well-known/openid-configuration${pathname}`, url2.origin),
    type: "oidc"
  });
  urlsToTry.push({
    url: new URL(`${pathname}/.well-known/openid-configuration`, url2.origin),
    type: "oidc"
  });
  return urlsToTry;
}
async function discoverAuthorizationServerMetadata(authorizationServerUrl, { fetchFn = fetch, protocolVersion = LATEST_PROTOCOL_VERSION } = {}) {
  const headers = {
    "MCP-Protocol-Version": protocolVersion,
    Accept: "application/json"
  };
  const urlsToTry = buildDiscoveryUrls(authorizationServerUrl);
  for (const { url: endpointUrl, type } of urlsToTry) {
    const response = await fetchWithCorsRetry(endpointUrl, headers, fetchFn);
    if (!response) {
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status >= 400 && response.status < 500) {
        continue;
      }
      throw new Error(`HTTP ${response.status} trying to load ${type === "oauth" ? "OAuth" : "OpenID provider"} metadata from ${endpointUrl}`);
    }
    if (type === "oauth") {
      return OAuthMetadataSchema.parse(await response.json());
    } else {
      return OpenIdProviderDiscoveryMetadataSchema.parse(await response.json());
    }
  }
  return void 0;
}
async function discoverOAuthServerInfo(serverUrl, opts) {
  let resourceMetadata;
  let authorizationServerUrl;
  try {
    resourceMetadata = await discoverOAuthProtectedResourceMetadata(serverUrl, { resourceMetadataUrl: opts?.resourceMetadataUrl }, opts?.fetchFn);
    if (resourceMetadata.authorization_servers && resourceMetadata.authorization_servers.length > 0) {
      authorizationServerUrl = resourceMetadata.authorization_servers[0];
    }
  } catch {
  }
  if (!authorizationServerUrl) {
    authorizationServerUrl = String(new URL("/", serverUrl));
  }
  const authorizationServerMetadata = await discoverAuthorizationServerMetadata(authorizationServerUrl, { fetchFn: opts?.fetchFn });
  return {
    authorizationServerUrl,
    authorizationServerMetadata,
    resourceMetadata
  };
}
async function startAuthorization(authorizationServerUrl, { metadata, clientInformation, redirectUrl, scope, state, resource }) {
  let authorizationUrl;
  if (metadata) {
    authorizationUrl = new URL(metadata.authorization_endpoint);
    if (!metadata.response_types_supported.includes(AUTHORIZATION_CODE_RESPONSE_TYPE)) {
      throw new Error(`Incompatible auth server: does not support response type ${AUTHORIZATION_CODE_RESPONSE_TYPE}`);
    }
    if (metadata.code_challenge_methods_supported && !metadata.code_challenge_methods_supported.includes(AUTHORIZATION_CODE_CHALLENGE_METHOD)) {
      throw new Error(`Incompatible auth server: does not support code challenge method ${AUTHORIZATION_CODE_CHALLENGE_METHOD}`);
    }
  } else {
    authorizationUrl = new URL("/authorize", authorizationServerUrl);
  }
  const challenge = await pkceChallenge();
  const codeVerifier = challenge.code_verifier;
  const codeChallenge = challenge.code_challenge;
  authorizationUrl.searchParams.set("response_type", AUTHORIZATION_CODE_RESPONSE_TYPE);
  authorizationUrl.searchParams.set("client_id", clientInformation.client_id);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", AUTHORIZATION_CODE_CHALLENGE_METHOD);
  authorizationUrl.searchParams.set("redirect_uri", String(redirectUrl));
  if (state) {
    authorizationUrl.searchParams.set("state", state);
  }
  if (scope) {
    authorizationUrl.searchParams.set("scope", scope);
  }
  if (scope?.includes("offline_access")) {
    authorizationUrl.searchParams.append("prompt", "consent");
  }
  if (resource) {
    authorizationUrl.searchParams.set("resource", resource.href);
  }
  return { authorizationUrl, codeVerifier };
}
function prepareAuthorizationCodeRequest(authorizationCode, codeVerifier, redirectUri) {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: authorizationCode,
    code_verifier: codeVerifier,
    redirect_uri: String(redirectUri)
  });
}
async function executeTokenRequest(authorizationServerUrl, { metadata, tokenRequestParams, clientInformation, addClientAuthentication, resource, fetchFn }) {
  const tokenUrl = metadata?.token_endpoint ? new URL(metadata.token_endpoint) : new URL("/token", authorizationServerUrl);
  const headers = new Headers({
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json"
  });
  if (resource) {
    tokenRequestParams.set("resource", resource.href);
  }
  if (addClientAuthentication) {
    await addClientAuthentication(headers, tokenRequestParams, tokenUrl, metadata);
  } else if (clientInformation) {
    const supportedMethods = metadata?.token_endpoint_auth_methods_supported ?? [];
    const authMethod = selectClientAuthMethod(clientInformation, supportedMethods);
    applyClientAuthentication(authMethod, clientInformation, headers, tokenRequestParams);
  }
  const response = await (fetchFn ?? fetch)(tokenUrl, {
    method: "POST",
    headers,
    body: tokenRequestParams
  });
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  return OAuthTokensSchema.parse(await response.json());
}
async function refreshAuthorization(authorizationServerUrl, { metadata, clientInformation, refreshToken, resource, addClientAuthentication, fetchFn }) {
  const tokenRequestParams = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
  const tokens = await executeTokenRequest(authorizationServerUrl, {
    metadata,
    tokenRequestParams,
    clientInformation,
    addClientAuthentication,
    resource,
    fetchFn
  });
  return { refresh_token: refreshToken, ...tokens };
}
async function fetchToken(provider, authorizationServerUrl, { metadata, resource, authorizationCode, fetchFn } = {}) {
  const scope = provider.clientMetadata.scope;
  let tokenRequestParams;
  if (provider.prepareTokenRequest) {
    tokenRequestParams = await provider.prepareTokenRequest(scope);
  }
  if (!tokenRequestParams) {
    if (!authorizationCode) {
      throw new Error("Either provider.prepareTokenRequest() or authorizationCode is required");
    }
    if (!provider.redirectUrl) {
      throw new Error("redirectUrl is required for authorization_code flow");
    }
    const codeVerifier = await provider.codeVerifier();
    tokenRequestParams = prepareAuthorizationCodeRequest(authorizationCode, codeVerifier, provider.redirectUrl);
  }
  const clientInformation = await provider.clientInformation();
  return executeTokenRequest(authorizationServerUrl, {
    metadata,
    tokenRequestParams,
    clientInformation: clientInformation ?? void 0,
    addClientAuthentication: provider.addClientAuthentication,
    resource,
    fetchFn
  });
}
async function registerClient(authorizationServerUrl, { metadata, clientMetadata, fetchFn }) {
  let registrationUrl;
  if (metadata) {
    if (!metadata.registration_endpoint) {
      throw new Error("Incompatible auth server: does not support dynamic client registration");
    }
    registrationUrl = new URL(metadata.registration_endpoint);
  } else {
    registrationUrl = new URL("/register", authorizationServerUrl);
  }
  const response = await (fetchFn ?? fetch)(registrationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(clientMetadata)
  });
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  return OAuthClientInformationFullSchema.parse(await response.json());
}
const MAX_PRIVATE_STATE_BYTES = 16 * 1024 * 1024;
class HelperError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
  code;
}
function originDirectory(origin) {
  return path.join(
    os.homedir(),
    ".carnation",
    "local-upload",
    createHash("sha256").update(origin).digest("hex")
  );
}
async function readPrivate(filename) {
  try {
    const handle = await open$1(
      filename,
      constants.O_RDONLY | constants.O_NOFOLLOW
    );
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_PRIVATE_STATE_BYTES || (stat.mode & 63) !== 0)
        throw new HelperError("private_state_invalid");
      return JSON.parse(await handle.readFile("utf8"));
    } finally {
      await handle.close();
    }
  } catch (error2) {
    if (error2.code === "ENOENT") return void 0;
    throw new HelperError("private_state_invalid");
  }
}
async function writePrivate(filename, value) {
  const text = JSON.stringify(value);
  if (Buffer.byteLength(text) > MAX_PRIVATE_STATE_BYTES)
    throw new HelperError("private_state_size_limit");
  await mkdir(path.dirname(filename), { recursive: true, mode: 448 });
  const temporary = `${filename}.${randomUUID()}.tmp`;
  const handle = await open$1(temporary, "wx", 384);
  try {
    await handle.writeFile(text);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, filename);
  } finally {
    await rm(temporary, { force: true });
  }
}
async function withPrivateLock(filename, operation, timeoutMs = 12e4) {
  await mkdir(path.dirname(filename), { recursive: true, mode: 448 });
  const deadline = Date.now() + timeoutMs;
  const owner = `${process.pid}-${randomUUID()}`;
  while (true) {
    if (Date.now() >= deadline) throw new HelperError("auth_busy");
    try {
      await mkdir(filename, { mode: 448 });
      try {
        const handle = await open$1(path.join(filename, owner), "wx", 384);
        await handle.close();
        const owners = await readdir(filename);
        if (owners.length !== 1 || owners[0] !== owner) {
          await rm(path.join(filename, owner), { force: true });
          continue;
        }
      } catch (error2) {
        await rmdir(filename).catch(() => void 0);
        if (error2.code !== "ENOENT")
          throw new HelperError("private_state_unavailable");
        continue;
      }
      break;
    } catch (error2) {
      if (error2.code !== "EEXIST")
        throw new HelperError("private_state_unavailable");
      await reclaimDeadLock(filename);
      if (Date.now() >= deadline) throw new HelperError("auth_busy");
      await setTimeout$1(100);
    }
  }
  try {
    return await operation();
  } finally {
    await rm(path.join(filename, owner), { force: true });
    await rmdir(filename).catch((error2) => {
      if (error2.code !== "ENOTEMPTY" && error2.code !== "ENOENT") throw error2;
    });
  }
}
async function reclaimDeadLock(filename) {
  try {
    const info = await lstat(filename);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new HelperError("private_state_invalid");
    const names = await readdir(filename);
    if (names.length === 0) {
      if (Date.now() - info.mtimeMs > 1e3) await rmdir(filename);
      return;
    }
    if (names.length !== 1 || !/^\d+-[0-9a-f-]{36}$/.test(names[0])) return;
    const pid = Number(names[0].split("-")[0]);
    try {
      process.kill(pid, 0);
      return;
    } catch (error2) {
      if (error2.code !== "ESRCH") return;
    }
    await rm(path.join(filename, names[0]), { force: true });
    await rmdir(filename);
  } catch (error2) {
    if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(
      error2.code ?? ""
    ))
      throw error2;
  }
}
async function boundedFile(filename, maximum) {
  const handle = await open$1(
    filename,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
  );
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > maximum)
      throw new HelperError("source_size_limit");
    const buffer2 = Buffer.alloc(stat.size + 1);
    let length = 0;
    while (length < buffer2.length) {
      const read = await handle.read(
        buffer2,
        length,
        buffer2.length - length,
        length
      );
      if (read.bytesRead === 0) break;
      length += read.bytesRead;
    }
    const bytes = buffer2.subarray(0, length);
    if (bytes.length !== stat.size || bytes.length > maximum)
      throw new HelperError("source_changed");
    return bytes;
  } finally {
    await handle.close();
  }
}
async function removePrivate(filename) {
  await rm(filename, { force: true });
}
const HELPER_SCOPE = "uploads:write datasets:read plate-maps:write";
function canonicalOrigin(value, development = false) {
  let url2;
  try {
    url2 = new URL(value);
  } catch {
    throw new HelperError("invalid_origin");
  }
  if (url2.protocol !== "https:" && !(development && url2.protocol === "http:" && url2.hostname === "127.0.0.1") || url2.username || url2.password || url2.search || url2.hash || url2.pathname !== "/")
    throw new HelperError("invalid_origin");
  return url2.origin;
}
function pinnedFetch(origin, fetcher = fetch) {
  return async (input, init2) => {
    const url2 = new URL(input instanceof Request ? input.url : input);
    if (url2.origin !== origin || url2.username || url2.password || url2.hash)
      throw new HelperError("invalid_destination");
    return fetcher(input, {
      ...init2,
      redirect: "error",
      signal: init2?.signal ? AbortSignal.any([init2.signal, AbortSignal.timeout(3e4)]) : AbortSignal.timeout(3e4)
    });
  };
}
class HelperAuth {
  constructor(origin, fetcher = fetch, directory = originDirectory(origin)) {
    this.origin = origin;
    this.filename = path.join(directory, "oauth.json");
    this.lock = path.join(directory, "oauth.lock");
    this.fetcher = pinnedFetch(origin, fetcher);
  }
  origin;
  filename;
  lock;
  fetcher;
  async accessToken() {
    return withPrivateLock(this.lock, async () => {
      const saved = await readPrivate(this.filename);
      if (!saved) throw new HelperError("login_required");
      if (saved.refreshing) throw new HelperError("login_required");
      if (saved.expiresAt > Date.now() + 3e4)
        return saved.tokens.access_token;
      await writePrivate(this.filename, { ...saved, refreshing: true });
      const state = this.provider(saved.redirectUrl, saved);
      state.provider.redirectToAuthorization = () => {
        throw new HelperError("login_required");
      };
      try {
        await auth(state.provider, this.options());
      } catch {
        await removePrivate(this.filename);
        throw new HelperError("login_required");
      }
      return state.value().tokens.access_token;
    });
  }
  async login(openBrowser = launchBrowser) {
    await withPrivateLock(this.lock, async () => {
      const server = createServer();
      let timer;
      try {
        await new Promise((resolve, reject) => {
          server.once("error", reject);
          server.listen(0, "127.0.0.1", resolve);
        });
        const address = server.address();
        if (!address || typeof address === "string")
          throw new HelperError("callback_unavailable");
        const redirect = `http://127.0.0.1:${address.port}/callback`;
        const state = this.provider(redirect);
        const expectedState = randomBytes(32).toString("base64url");
        state.provider.state = () => expectedState;
        state.provider.redirectToAuthorization = async (url2) => {
          if (url2.origin !== this.origin || url2.pathname !== "/authorize" || url2.username || url2.password || url2.hash)
            throw new HelperError("invalid_destination");
          await openBrowser(url2);
        };
        const callback = new Promise((resolve, reject) => {
          timer = setTimeout(
            () => reject(new HelperError("login_timeout")),
            3e5
          );
          server.on("request", (request2, response) => {
            let url2;
            try {
              url2 = new URL(request2.url ?? "/", redirect);
            } catch {
              response.writeHead(400);
              response.end("Authorization callback refused.");
              return;
            }
            const matchingState = request2.method === "GET" && request2.headers.host === new URL(redirect).host && url2.origin === new URL(redirect).origin && url2.pathname === "/callback" && url2.searchParams.getAll("state").length === 1 && url2.searchParams.get("state") === expectedState;
            const denied = matchingState && url2.searchParams.has("error");
            const code2 = url2.searchParams.get("code");
            const valid = matchingState && !!code2 && url2.searchParams.getAll("code").length === 1 && !url2.searchParams.has("error");
            response.writeHead(valid || denied ? 200 : 400, {
              "Content-Type": "text/plain",
              "Cache-Control": "no-store"
            });
            response.end(
              valid ? "Carnation authorization received. Return to your assistant." : denied ? "Authorization denied. Return to your assistant." : "Authorization callback refused."
            );
            if (denied) reject(new HelperError("login_denied"));
            else if (valid && code2) resolve(code2);
          });
        });
        void callback.catch(() => void 0);
        if (await auth(state.provider, this.options()) !== "REDIRECT")
          throw new HelperError("auth_failed");
        const code = await callback;
        await auth(state.provider, {
          ...this.options(),
          authorizationCode: code
        });
      } catch (error2) {
        throw error2 instanceof HelperError ? error2 : new HelperError("auth_failed");
      } finally {
        clearTimeout(timer);
        server.closeAllConnections();
        await new Promise((resolve) => server.close(() => resolve()));
      }
    });
  }
  async logout() {
    await withPrivateLock(this.lock, async () => {
      const saved = await readPrivate(this.filename);
      if (saved) {
        try {
          const result = await this.fetcher(`${this.origin}/revoke`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: saved.client.client_id,
              token: saved.tokens.refresh_token ?? saved.tokens.access_token
            })
          });
          if (!result.ok) throw new HelperError("logout_failed");
        } catch {
          throw new HelperError("logout_failed");
        }
      }
      await removePrivate(this.filename);
    });
  }
  options() {
    return {
      serverUrl: `${this.origin}/v1`,
      resourceMetadataUrl: new URL(
        `${this.origin}/.well-known/oauth-protected-resource/v1`
      ),
      scope: HELPER_SCOPE,
      fetchFn: this.fetcher
    };
  }
  provider(redirectUrl, initial) {
    let client = initial?.client;
    let tokens = initial?.tokens;
    let verifier = "";
    let expiresAt = initial?.expiresAt ?? 0;
    const value = () => {
      if (!client || !tokens) throw new HelperError("auth_failed");
      return { client, tokens, expiresAt, redirectUrl };
    };
    const provider = {
      redirectUrl,
      clientMetadata: {
        client_name: "Carnation local upload",
        redirect_uris: [redirectUrl],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope: HELPER_SCOPE
      },
      clientInformation: () => client,
      saveClientInformation: (information) => {
        client = information;
      },
      tokens: () => tokens,
      saveTokens: async (next3) => {
        tokens = next3;
        expiresAt = Date.now() + (next3.expires_in ?? 600) * 1e3;
        await writePrivate(this.filename, value());
      },
      saveCodeVerifier: (next3) => {
        verifier = next3;
      },
      codeVerifier: () => verifier,
      redirectToAuthorization: () => {
        throw new HelperError("login_required");
      },
      validateResourceURL: async (serverUrl, resource) => {
        if (String(serverUrl) !== `${this.origin}/v1` || resource !== `${this.origin}/v1`)
          throw new HelperError("invalid_resource");
        return new URL(resource);
      },
      invalidateCredentials: async (kind) => {
        if (kind === "client" || kind === "all") client = void 0;
        if (kind === "tokens" || kind === "all") tokens = void 0;
        await removePrivate(this.filename);
      }
    };
    return { provider, value };
  }
}
async function launchBrowser(url2) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "rundll32.exe" : "xdg-open";
  const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url2.href] : [url2.href];
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore", shell: false });
    child.once("error", () => reject(new HelperError("browser_unavailable")));
    child.once(
      "exit",
      (code) => code === 0 ? resolve() : reject(new HelperError("browser_unavailable"))
    );
  });
}
class PublicClient {
  constructor(auth2) {
    this.auth = auth2;
  }
  auth;
  async request(suffix, method = "GET", body, signal) {
    const token = await this.auth.accessToken();
    let response;
    try {
      response = await this.auth.fetcher(`${this.auth.origin}/v1${suffix}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...body === void 0 ? {} : { "Content-Type": "application/json" }
        },
        body: body === void 0 ? void 0 : JSON.stringify(body),
        signal
      });
    } catch {
      throw new HelperError(
        method === "POST" ? "request_outcome_unknown" : "network_unavailable"
      );
    }
    if (!response.ok)
      throw new HelperError(
        response.status === 401 ? "login_required" : response.status === 403 ? "permission_refused" : response.status === 413 ? "plan_size_limit" : `api_${response.status}`
      );
    try {
      if (!response.body) throw new Error();
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          size += result.value.byteLength;
          if (size > 8 * 1024 * 1024) throw new Error();
          chunks.push(result.value);
        }
      } finally {
        await reader.cancel().catch(() => void 0);
      }
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new HelperError(
        method === "POST" ? "request_outcome_unknown" : "invalid_server_response"
      );
    }
  }
  async preflight(confirmationId, plan) {
    const result = await this.request("/uploads/preflight", "POST", {
      confirmation_id: confirmationId,
      plan
    });
    if (result.confirmation_id !== confirmationId || !isSha256$1(result.plan_digest) || !result.summary || !Number.isSafeInteger(result.summary.objects_total) || result.summary.objects_total !== plan.objects.length)
      throw new HelperError("invalid_server_response");
    return result;
  }
  async confirm(body) {
    const result = await this.request(
      "/uploads/confirm",
      "POST",
      body
    );
    if (result.confirmation_id !== body.confirmation_id || result.plan_digest !== body.plan_digest || !isUuid$1(result.dataset_id) || !isUuid$1(result.upload_id) || !Number.isSafeInteger(result.recovery_until_ms))
      throw new HelperError("invalid_server_response");
    return result;
  }
  async status(uploadId) {
    const result = await this.request(
      `/uploads/${identifier(uploadId)}`
    );
    if (result.upload_id !== uploadId || !isUuid$1(result.dataset_id) || !isSha256$1(result.plan_digest))
      throw new HelperError("invalid_server_response");
    return result;
  }
  async objects(uploadId) {
    const objects = [];
    let after = -1;
    for (let pageNumber = 0; pageNumber < 41; pageNumber += 1) {
      const page = await this.request(
        `/uploads/${identifier(uploadId)}/objects?limit=100${after === -1 ? "" : `&after_ordinal=${after}`}`
      );
      if (page.upload_id !== uploadId || !Array.isArray(page.objects) || page.objects.length > 100 || page.objects.some(
        (object2, index) => object2.ordinal !== objects.length + index || !isUuid$1(object2.id) || !("first_sentinel_sha256" in object2) || !isSha256$1(object2.first_sentinel_sha256) || !isSha256$1(object2.last_sentinel_sha256)
      ))
        throw new HelperError("invalid_server_response");
      objects.push(...page.objects);
      if (page.next_after_ordinal === null) return objects;
      if (typeof page.next_after_ordinal !== "number" || !Number.isSafeInteger(page.next_after_ordinal) || page.next_after_ordinal <= after)
        throw new HelperError("invalid_server_response");
      after = page.next_after_ordinal;
    }
    throw new HelperError("invalid_server_response");
  }
  async multipart(uploadId, objectId, suffix = "", method = "GET", body, signal) {
    const result = await this.request(
      `/uploads/${identifier(uploadId)}/objects/${identifier(objectId)}/multipart${suffix}`,
      method,
      body,
      signal
    );
    if (result.upload_id !== uploadId || result.object_id !== objectId)
      throw new HelperError("invalid_server_response");
    return result;
  }
  reconcile(uploadId, objectId, signal) {
    return this.multipart(uploadId, objectId, "", "GET", void 0, signal);
  }
  lease(uploadId, objectId, partNumber, signal) {
    return this.multipart(
      uploadId,
      objectId,
      "/parts",
      "POST",
      { part_numbers: [partNumber] },
      signal
    );
  }
  acknowledge(uploadId, objectId, generation, partNumber, etag, signal) {
    return this.multipart(
      uploadId,
      objectId,
      "/ack",
      "POST",
      { generation, parts: [{ part_number: partNumber, etag }] },
      signal
    );
  }
  complete(uploadId, objectId, generation, sourceSha256, signal) {
    return this.multipart(
      uploadId,
      objectId,
      "/complete",
      "POST",
      { generation, source_sha256: sourceSha256 },
      signal
    );
  }
  async sourceChanged(uploadId, objectId) {
    const token = await this.auth.accessToken();
    const result = await this.auth.fetcher(
      `${this.auth.origin}/v1/uploads/${identifier(uploadId)}/objects/${identifier(objectId)}/multipart/source-changed`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );
    if (!result.ok) throw new HelperError("source_change_reset_failed");
  }
}
function isUuid$1(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
function isSha256$1(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}
function identifier(value) {
  if (!isUuid$1(value)) throw new HelperError("invalid_identifier");
  return value;
}
const PLATFORM_ARTIFACTS = /* @__PURE__ */ new Set([".DS_Store", "Thumbs.db"]);
function isIgnoredPlatformArtifact(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\.\//, "").normalize("NFC");
  const name = normalized.split("/").at(-1) ?? normalized;
  return PLATFORM_ARTIFACTS.has(name) || name.startsWith("._");
}
const ZARR_V1_FORMAT = "carnation-ome-zarr-package-v1";
const utf8Encoder = new TextEncoder();
const ZARR_V1_CAPS = {
  totalSourceBytes: 1e10,
  sourceMembers: 1e4,
  pathDepth: 12,
  packageHardBytes: 256 * 1024 * 1024,
  physicalMemberBytes: 256 * 1024 * 1024,
  manifestBytes: 2 * 1024 * 1024,
  packages: 64,
  planBytes: 8 * 1024 * 1024
};
function utf8Bytes(value) {
  return utf8Encoder.encode(value).byteLength;
}
utf8Bytes(
  JSON.stringify({ format: ZARR_V1_FORMAT, members: [] })
);
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var saxes$1 = {};
var ed5$1 = {};
var hasRequiredEd5$1;
function requireEd5$1() {
  if (hasRequiredEd5$1) return ed5$1;
  hasRequiredEd5$1 = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHAR = "	\n\r -퟿-�𐀀-􏿿";
    exports.S = " 	\r\n";
    exports.NAME_START_CHAR = ":A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
    exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
    exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
    exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
    exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
    exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
    exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
    exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    exports.S_LIST = [SPACE, NL, CR, TAB];
    function isChar(c) {
      return c >= SPACE && c <= 55295 || c === NL || c === CR || c === TAB || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isChar = isChar;
    function isS(c) {
      return c === SPACE || c === NL || c === CR || c === TAB;
    }
    exports.isS = isS;
    function isNameStartChar(c) {
      return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNameStartChar = isNameStartChar;
    function isNameChar(c) {
      return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
    }
    exports.isNameChar = isNameChar;
  })(ed5$1);
  return ed5$1;
}
var ed2$1 = {};
var hasRequiredEd2$1;
function requireEd2$1() {
  if (hasRequiredEd2$1) return ed2$1;
  hasRequiredEd2$1 = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHAR = "-퟿-�𐀀-􏿿";
    exports.RESTRICTED_CHAR = "-\b\v\f---";
    exports.S = " 	\r\n";
    exports.NAME_START_CHAR = ":A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
    exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
    exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
    exports.RESTRICTED_CHAR_RE = new RegExp("^[" + exports.RESTRICTED_CHAR + "]$", "u");
    exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
    exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
    exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
    exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
    exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    exports.S_LIST = [SPACE, NL, CR, TAB];
    function isChar(c) {
      return c >= 1 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isChar = isChar;
    function isRestrictedChar(c) {
      return c >= 1 && c <= 8 || c === 11 || c === 12 || c >= 14 && c <= 31 || c >= 127 && c <= 132 || c >= 134 && c <= 159;
    }
    exports.isRestrictedChar = isRestrictedChar;
    function isCharAndNotRestricted(c) {
      return c === 9 || c === 10 || c === 13 || c > 31 && c < 127 || c === 133 || c > 159 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isCharAndNotRestricted = isCharAndNotRestricted;
    function isS(c) {
      return c === SPACE || c === NL || c === CR || c === TAB;
    }
    exports.isS = isS;
    function isNameStartChar(c) {
      return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNameStartChar = isNameStartChar;
    function isNameChar(c) {
      return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
    }
    exports.isNameChar = isNameChar;
  })(ed2$1);
  return ed2$1;
}
var ed3$1 = {};
var hasRequiredEd3$1;
function requireEd3$1() {
  if (hasRequiredEd3$1) return ed3$1;
  hasRequiredEd3$1 = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NC_NAME_START_CHAR = "A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
    exports.NC_NAME_CHAR = "-" + exports.NC_NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
    exports.NC_NAME_START_CHAR_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "]$", "u");
    exports.NC_NAME_CHAR_RE = new RegExp("^[" + exports.NC_NAME_CHAR + "]$", "u");
    exports.NC_NAME_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "][" + exports.NC_NAME_CHAR + "]*$", "u");
    function isNCNameStartChar(c) {
      return c >= 65 && c <= 90 || c === 95 || c >= 97 && c <= 122 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8204 && c <= 8205 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNCNameStartChar = isNCNameStartChar;
    function isNCNameChar(c) {
      return isNCNameStartChar(c) || (c === 45 || c === 46 || c >= 48 && c <= 57 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256);
    }
    exports.isNCNameChar = isNCNameChar;
  })(ed3$1);
  return ed3$1;
}
var hasRequiredSaxes$1;
function requireSaxes$1() {
  if (hasRequiredSaxes$1) return saxes$1;
  hasRequiredSaxes$1 = 1;
  Object.defineProperty(saxes$1, "__esModule", { value: true });
  saxes$1.SaxesParser = saxes$1.EVENTS = void 0;
  const ed52 = requireEd5$1();
  const ed22 = requireEd2$1();
  const NSed3 = requireEd3$1();
  var isS = ed52.isS;
  var isChar10 = ed52.isChar;
  var isNameStartChar = ed52.isNameStartChar;
  var isNameChar = ed52.isNameChar;
  var S_LIST = ed52.S_LIST;
  var NAME_RE = ed52.NAME_RE;
  var isChar11 = ed22.isChar;
  var isNCNameStartChar = NSed3.isNCNameStartChar;
  var isNCNameChar = NSed3.isNCNameChar;
  var NC_NAME_RE = NSed3.NC_NAME_RE;
  const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
  const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
  const rootNS = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    __proto__: null,
    xml: XML_NAMESPACE,
    xmlns: XMLNS_NAMESPACE
  };
  const XML_ENTITIES = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    __proto__: null,
    amp: "&",
    gt: ">",
    lt: "<",
    quot: '"',
    apos: "'"
  };
  const EOC = -1;
  const NL_LIKE = -2;
  const S_BEGIN = 0;
  const S_BEGIN_WHITESPACE = 1;
  const S_DOCTYPE = 2;
  const S_DOCTYPE_QUOTE = 3;
  const S_DTD = 4;
  const S_DTD_QUOTED = 5;
  const S_DTD_OPEN_WAKA = 6;
  const S_DTD_OPEN_WAKA_BANG = 7;
  const S_DTD_COMMENT = 8;
  const S_DTD_COMMENT_ENDING = 9;
  const S_DTD_COMMENT_ENDED = 10;
  const S_DTD_PI = 11;
  const S_DTD_PI_ENDING = 12;
  const S_TEXT = 13;
  const S_ENTITY = 14;
  const S_OPEN_WAKA = 15;
  const S_OPEN_WAKA_BANG = 16;
  const S_COMMENT = 17;
  const S_COMMENT_ENDING = 18;
  const S_COMMENT_ENDED = 19;
  const S_CDATA = 20;
  const S_CDATA_ENDING = 21;
  const S_CDATA_ENDING_2 = 22;
  const S_PI_FIRST_CHAR = 23;
  const S_PI_REST = 24;
  const S_PI_BODY = 25;
  const S_PI_ENDING = 26;
  const S_XML_DECL_NAME_START = 27;
  const S_XML_DECL_NAME = 28;
  const S_XML_DECL_EQ = 29;
  const S_XML_DECL_VALUE_START = 30;
  const S_XML_DECL_VALUE = 31;
  const S_XML_DECL_SEPARATOR = 32;
  const S_XML_DECL_ENDING = 33;
  const S_OPEN_TAG = 34;
  const S_OPEN_TAG_SLASH = 35;
  const S_ATTRIB = 36;
  const S_ATTRIB_NAME = 37;
  const S_ATTRIB_NAME_SAW_WHITE = 38;
  const S_ATTRIB_VALUE = 39;
  const S_ATTRIB_VALUE_QUOTED = 40;
  const S_ATTRIB_VALUE_CLOSED = 41;
  const S_ATTRIB_VALUE_UNQUOTED = 42;
  const S_CLOSE_TAG = 43;
  const S_CLOSE_TAG_SAW_WHITE = 44;
  const TAB = 9;
  const NL = 10;
  const CR = 13;
  const SPACE = 32;
  const BANG = 33;
  const DQUOTE = 34;
  const AMP = 38;
  const SQUOTE = 39;
  const MINUS = 45;
  const FORWARD_SLASH = 47;
  const SEMICOLON = 59;
  const LESS = 60;
  const EQUAL = 61;
  const GREATER = 62;
  const QUESTION = 63;
  const OPEN_BRACKET = 91;
  const CLOSE_BRACKET = 93;
  const NEL = 133;
  const LS = 8232;
  const isQuote = (c) => c === DQUOTE || c === SQUOTE;
  const QUOTES = [DQUOTE, SQUOTE];
  const DOCTYPE_TERMINATOR = [...QUOTES, OPEN_BRACKET, GREATER];
  const DTD_TERMINATOR = [...QUOTES, LESS, CLOSE_BRACKET];
  const XML_DECL_NAME_TERMINATOR = [EQUAL, QUESTION, ...S_LIST];
  const ATTRIB_VALUE_UNQUOTED_TERMINATOR = [...S_LIST, GREATER, AMP, LESS];
  function nsPairCheck(parser, prefix, uri) {
    switch (prefix) {
      case "xml":
        if (uri !== XML_NAMESPACE) {
          parser.fail(`xml prefix must be bound to ${XML_NAMESPACE}.`);
        }
        break;
      case "xmlns":
        if (uri !== XMLNS_NAMESPACE) {
          parser.fail(`xmlns prefix must be bound to ${XMLNS_NAMESPACE}.`);
        }
        break;
    }
    switch (uri) {
      case XMLNS_NAMESPACE:
        parser.fail(prefix === "" ? `the default namespace may not be set to ${uri}.` : `may not assign a prefix (even "xmlns") to the URI ${XMLNS_NAMESPACE}.`);
        break;
      case XML_NAMESPACE:
        switch (prefix) {
          case "xml":
            break;
          case "":
            parser.fail(`the default namespace may not be set to ${uri}.`);
            break;
          default:
            parser.fail("may not assign the xml namespace to another prefix.");
        }
        break;
    }
  }
  function nsMappingCheck(parser, mapping) {
    for (const local of Object.keys(mapping)) {
      nsPairCheck(parser, local, mapping[local]);
    }
  }
  const isNCName = (name) => NC_NAME_RE.test(name);
  const isName = (name) => NAME_RE.test(name);
  const FORBIDDEN_START = 0;
  const FORBIDDEN_BRACKET = 1;
  const FORBIDDEN_BRACKET_BRACKET = 2;
  saxes$1.EVENTS = [
    "xmldecl",
    "text",
    "processinginstruction",
    "doctype",
    "comment",
    "opentagstart",
    "attribute",
    "opentag",
    "closetag",
    "cdata",
    "error",
    "end",
    "ready"
  ];
  const EVENT_NAME_TO_HANDLER_NAME = {
    xmldecl: "xmldeclHandler",
    text: "textHandler",
    processinginstruction: "piHandler",
    doctype: "doctypeHandler",
    comment: "commentHandler",
    opentagstart: "openTagStartHandler",
    attribute: "attributeHandler",
    opentag: "openTagHandler",
    closetag: "closeTagHandler",
    cdata: "cdataHandler",
    error: "errorHandler",
    end: "endHandler",
    ready: "readyHandler"
  };
  class SaxesParser {
    /**
     * @param opt The parser options.
     */
    constructor(opt) {
      this.opt = opt !== null && opt !== void 0 ? opt : {};
      this.fragmentOpt = !!this.opt.fragment;
      const xmlnsOpt = this.xmlnsOpt = !!this.opt.xmlns;
      this.trackPosition = this.opt.position !== false;
      this.fileName = this.opt.fileName;
      if (xmlnsOpt) {
        this.nameStartCheck = isNCNameStartChar;
        this.nameCheck = isNCNameChar;
        this.isName = isNCName;
        this.processAttribs = this.processAttribsNS;
        this.pushAttrib = this.pushAttribNS;
        this.ns = Object.assign({ __proto__: null }, rootNS);
        const additional = this.opt.additionalNamespaces;
        if (additional != null) {
          nsMappingCheck(this, additional);
          Object.assign(this.ns, additional);
        }
      } else {
        this.nameStartCheck = isNameStartChar;
        this.nameCheck = isNameChar;
        this.isName = isName;
        this.processAttribs = this.processAttribsPlain;
        this.pushAttrib = this.pushAttribPlain;
      }
      this.stateTable = [
        /* eslint-disable @typescript-eslint/unbound-method */
        this.sBegin,
        this.sBeginWhitespace,
        this.sDoctype,
        this.sDoctypeQuote,
        this.sDTD,
        this.sDTDQuoted,
        this.sDTDOpenWaka,
        this.sDTDOpenWakaBang,
        this.sDTDComment,
        this.sDTDCommentEnding,
        this.sDTDCommentEnded,
        this.sDTDPI,
        this.sDTDPIEnding,
        this.sText,
        this.sEntity,
        this.sOpenWaka,
        this.sOpenWakaBang,
        this.sComment,
        this.sCommentEnding,
        this.sCommentEnded,
        this.sCData,
        this.sCDataEnding,
        this.sCDataEnding2,
        this.sPIFirstChar,
        this.sPIRest,
        this.sPIBody,
        this.sPIEnding,
        this.sXMLDeclNameStart,
        this.sXMLDeclName,
        this.sXMLDeclEq,
        this.sXMLDeclValueStart,
        this.sXMLDeclValue,
        this.sXMLDeclSeparator,
        this.sXMLDeclEnding,
        this.sOpenTag,
        this.sOpenTagSlash,
        this.sAttrib,
        this.sAttribName,
        this.sAttribNameSawWhite,
        this.sAttribValue,
        this.sAttribValueQuoted,
        this.sAttribValueClosed,
        this.sAttribValueUnquoted,
        this.sCloseTag,
        this.sCloseTagSawWhite
        /* eslint-enable @typescript-eslint/unbound-method */
      ];
      this._init();
    }
    /**
     * Indicates whether or not the parser is closed. If ``true``, wait for
     * the ``ready`` event to write again.
     */
    get closed() {
      return this._closed;
    }
    _init() {
      var _a2;
      this.openWakaBang = "";
      this.text = "";
      this.name = "";
      this.piTarget = "";
      this.entity = "";
      this.q = null;
      this.tags = [];
      this.tag = null;
      this.topNS = null;
      this.chunk = "";
      this.chunkPosition = 0;
      this.i = 0;
      this.prevI = 0;
      this.carriedFromPrevious = void 0;
      this.forbiddenState = FORBIDDEN_START;
      this.attribList = [];
      const { fragmentOpt } = this;
      this.state = fragmentOpt ? S_TEXT : S_BEGIN;
      this.reportedTextBeforeRoot = this.reportedTextAfterRoot = this.closedRoot = this.sawRoot = fragmentOpt;
      this.xmlDeclPossible = !fragmentOpt;
      this.xmlDeclExpects = ["version"];
      this.entityReturnState = void 0;
      let { defaultXMLVersion } = this.opt;
      if (defaultXMLVersion === void 0) {
        if (this.opt.forceXMLVersion === true) {
          throw new Error("forceXMLVersion set but defaultXMLVersion is not set");
        }
        defaultXMLVersion = "1.0";
      }
      this.setXMLVersion(defaultXMLVersion);
      this.positionAtNewLine = 0;
      this.doctype = false;
      this._closed = false;
      this.xmlDecl = {
        version: void 0,
        encoding: void 0,
        standalone: void 0
      };
      this.line = 1;
      this.column = 0;
      this.ENTITIES = Object.create(XML_ENTITIES);
      (_a2 = this.readyHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this);
    }
    /**
     * The stream position the parser is currently looking at. This field is
     * zero-based.
     *
     * This field is not based on counting Unicode characters but is to be
     * interpreted as a plain index into a JavaScript string.
     */
    get position() {
      return this.chunkPosition + this.i;
    }
    /**
     * The column number of the next character to be read by the parser.  *
     * This field is zero-based. (The first column in a line is 0.)
     *
     * This field reports the index at which the next character would be in the
     * line if the line were represented as a JavaScript string.  Note that this
     * *can* be different to a count based on the number of *Unicode characters*
     * due to how JavaScript handles astral plane characters.
     *
     * See [[column]] for a number that corresponds to a count of Unicode
     * characters.
     */
    get columnIndex() {
      return this.position - this.positionAtNewLine;
    }
    /**
     * Set an event listener on an event. The parser supports one handler per
     * event type. If you try to set an event handler over an existing handler,
     * the old handler is silently overwritten.
     *
     * @param name The event to listen to.
     *
     * @param handler The handler to set.
     */
    on(name, handler) {
      this[EVENT_NAME_TO_HANDLER_NAME[name]] = handler;
    }
    /**
     * Unset an event handler.
     *
     * @parma name The event to stop listening to.
     */
    off(name) {
      this[EVENT_NAME_TO_HANDLER_NAME[name]] = void 0;
    }
    /**
     * Make an error object. The error object will have a message that contains
     * the ``fileName`` option passed at the creation of the parser. If position
     * tracking was turned on, it will also have line and column number
     * information.
     *
     * @param message The message describing the error to report.
     *
     * @returns An error object with a properly formatted message.
     */
    makeError(message) {
      var _a2;
      let msg = (_a2 = this.fileName) !== null && _a2 !== void 0 ? _a2 : "";
      if (this.trackPosition) {
        if (msg.length > 0) {
          msg += ":";
        }
        msg += `${this.line}:${this.column}`;
      }
      if (msg.length > 0) {
        msg += ": ";
      }
      return new Error(msg + message);
    }
    /**
     * Report a parsing error. This method is made public so that client code may
     * check for issues that are outside the scope of this project and can report
     * errors.
     *
     * @param message The error to report.
     *
     * @returns this
     */
    fail(message) {
      const err = this.makeError(message);
      const handler = this.errorHandler;
      if (handler === void 0) {
        throw err;
      } else {
        handler(err);
      }
      return this;
    }
    /**
     * Write a XML data to the parser.
     *
     * @param chunk The XML data to write.
     *
     * @returns this
     */
    // We do need object for the type here. Yes, it often causes problems
    // but not in this case.
    write(chunk) {
      if (this.closed) {
        return this.fail("cannot write after close; assign an onready handler.");
      }
      let end = false;
      if (chunk === null) {
        end = true;
        chunk = "";
      } else if (typeof chunk === "object") {
        chunk = chunk.toString();
      }
      if (this.carriedFromPrevious !== void 0) {
        chunk = `${this.carriedFromPrevious}${chunk}`;
        this.carriedFromPrevious = void 0;
      }
      let limit = chunk.length;
      const lastCode = chunk.charCodeAt(limit - 1);
      if (!end && // A trailing CR or surrogate must be carried over to the next
      // chunk.
      (lastCode === CR || lastCode >= 55296 && lastCode <= 56319)) {
        this.carriedFromPrevious = chunk[limit - 1];
        limit--;
        chunk = chunk.slice(0, limit);
      }
      const { stateTable } = this;
      this.chunk = chunk;
      this.i = 0;
      while (this.i < limit) {
        stateTable[this.state].call(this);
      }
      this.chunkPosition += limit;
      return end ? this.end() : this;
    }
    /**
     * Close the current stream. Perform final well-formedness checks and reset
     * the parser tstate.
     *
     * @returns this
     */
    close() {
      return this.write(null);
    }
    /**
     * Get a single code point out of the current chunk. This updates the current
     * position if we do position tracking.
     *
     * This is the algorithm to use for XML 1.0.
     *
     * @returns The character read.
     */
    getCode10() {
      const { chunk, i } = this;
      this.prevI = i;
      this.i = i + 1;
      if (i >= chunk.length) {
        return EOC;
      }
      const code = chunk.charCodeAt(i);
      this.column++;
      if (code < 55296) {
        if (code >= SPACE || code === TAB) {
          return code;
        }
        switch (code) {
          case NL:
            this.line++;
            this.column = 0;
            this.positionAtNewLine = this.position;
            return NL;
          case CR:
            if (chunk.charCodeAt(i + 1) === NL) {
              this.i = i + 2;
            }
            this.line++;
            this.column = 0;
            this.positionAtNewLine = this.position;
            return NL_LIKE;
          default:
            this.fail("disallowed character.");
            return code;
        }
      }
      if (code > 56319) {
        if (!(code >= 57344 && code <= 65533)) {
          this.fail("disallowed character.");
        }
        return code;
      }
      const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
      this.i = i + 2;
      if (final > 1114111) {
        this.fail("disallowed character.");
      }
      return final;
    }
    /**
     * Get a single code point out of the current chunk. This updates the current
     * position if we do position tracking.
     *
     * This is the algorithm to use for XML 1.1.
     *
     * @returns {number} The character read.
     */
    getCode11() {
      const { chunk, i } = this;
      this.prevI = i;
      this.i = i + 1;
      if (i >= chunk.length) {
        return EOC;
      }
      const code = chunk.charCodeAt(i);
      this.column++;
      if (code < 55296) {
        if (code > 31 && code < 127 || code > 159 && code !== LS || code === TAB) {
          return code;
        }
        switch (code) {
          case NL:
            this.line++;
            this.column = 0;
            this.positionAtNewLine = this.position;
            return NL;
          case CR: {
            const next3 = chunk.charCodeAt(i + 1);
            if (next3 === NL || next3 === NEL) {
              this.i = i + 2;
            }
          }
          /* yes, fall through */
          case NEL:
          // 0x85
          case LS:
            this.line++;
            this.column = 0;
            this.positionAtNewLine = this.position;
            return NL_LIKE;
          default:
            this.fail("disallowed character.");
            return code;
        }
      }
      if (code > 56319) {
        if (!(code >= 57344 && code <= 65533)) {
          this.fail("disallowed character.");
        }
        return code;
      }
      const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
      this.i = i + 2;
      if (final > 1114111) {
        this.fail("disallowed character.");
      }
      return final;
    }
    /**
     * Like ``getCode`` but with the return value normalized so that ``NL`` is
     * returned for ``NL_LIKE``.
     */
    getCodeNorm() {
      const c = this.getCode();
      return c === NL_LIKE ? NL : c;
    }
    unget() {
      this.i = this.prevI;
      this.column--;
    }
    /**
     * Capture characters into a buffer until encountering one of a set of
     * characters.
     *
     * @param chars An array of codepoints. Encountering a character in the array
     * ends the capture. (``chars`` may safely contain ``NL``.)
     *
     * @return The character code that made the capture end, or ``EOC`` if we hit
     * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
     * instead.
     */
    captureTo(chars) {
      let { i: start } = this;
      const { chunk } = this;
      while (true) {
        const c = this.getCode();
        const isNLLike = c === NL_LIKE;
        const final = isNLLike ? NL : c;
        if (final === EOC || chars.includes(final)) {
          this.text += chunk.slice(start, this.prevI);
          return final;
        }
        if (isNLLike) {
          this.text += `${chunk.slice(start, this.prevI)}
`;
          start = this.i;
        }
      }
    }
    /**
     * Capture characters into a buffer until encountering a character.
     *
     * @param char The codepoint that ends the capture. **NOTE ``char`` MAY NOT
     * CONTAIN ``NL``.** Passing ``NL`` will result in buggy behavior.
     *
     * @return ``true`` if we ran into the character. Otherwise, we ran into the
     * end of the current chunk.
     */
    captureToChar(char) {
      let { i: start } = this;
      const { chunk } = this;
      while (true) {
        let c = this.getCode();
        switch (c) {
          case NL_LIKE:
            this.text += `${chunk.slice(start, this.prevI)}
`;
            start = this.i;
            c = NL;
            break;
          case EOC:
            this.text += chunk.slice(start);
            return false;
        }
        if (c === char) {
          this.text += chunk.slice(start, this.prevI);
          return true;
        }
      }
    }
    /**
     * Capture characters that satisfy ``isNameChar`` into the ``name`` field of
     * this parser.
     *
     * @return The character code that made the test fail, or ``EOC`` if we hit
     * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
     * instead.
     */
    captureNameChars() {
      const { chunk, i: start } = this;
      while (true) {
        const c = this.getCode();
        if (c === EOC) {
          this.name += chunk.slice(start);
          return EOC;
        }
        if (!isNameChar(c)) {
          this.name += chunk.slice(start, this.prevI);
          return c === NL_LIKE ? NL : c;
        }
      }
    }
    /**
     * Skip white spaces.
     *
     * @return The character that ended the skip, or ``EOC`` if we hit
     * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
     * instead.
     */
    skipSpaces() {
      while (true) {
        const c = this.getCodeNorm();
        if (c === EOC || !isS(c)) {
          return c;
        }
      }
    }
    setXMLVersion(version2) {
      this.currentXMLVersion = version2;
      if (version2 === "1.0") {
        this.isChar = isChar10;
        this.getCode = this.getCode10;
      } else {
        this.isChar = isChar11;
        this.getCode = this.getCode11;
      }
    }
    // STATE ENGINE METHODS
    // This needs to be a state separate from S_BEGIN_WHITESPACE because we want
    // to be sure never to come back to this state later.
    sBegin() {
      if (this.chunk.charCodeAt(0) === 65279) {
        this.i++;
        this.column++;
      }
      this.state = S_BEGIN_WHITESPACE;
    }
    sBeginWhitespace() {
      const iBefore = this.i;
      const c = this.skipSpaces();
      if (this.prevI !== iBefore) {
        this.xmlDeclPossible = false;
      }
      switch (c) {
        case LESS:
          this.state = S_OPEN_WAKA;
          if (this.text.length !== 0) {
            throw new Error("no-empty text at start");
          }
          break;
        case EOC:
          break;
        default:
          this.unget();
          this.state = S_TEXT;
          this.xmlDeclPossible = false;
      }
    }
    sDoctype() {
      var _a2;
      const c = this.captureTo(DOCTYPE_TERMINATOR);
      switch (c) {
        case GREATER: {
          (_a2 = this.doctypeHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, this.text);
          this.text = "";
          this.state = S_TEXT;
          this.doctype = true;
          break;
        }
        case EOC:
          break;
        default:
          this.text += String.fromCodePoint(c);
          if (c === OPEN_BRACKET) {
            this.state = S_DTD;
          } else if (isQuote(c)) {
            this.state = S_DOCTYPE_QUOTE;
            this.q = c;
          }
      }
    }
    sDoctypeQuote() {
      const q = this.q;
      if (this.captureToChar(q)) {
        this.text += String.fromCodePoint(q);
        this.q = null;
        this.state = S_DOCTYPE;
      }
    }
    sDTD() {
      const c = this.captureTo(DTD_TERMINATOR);
      if (c === EOC) {
        return;
      }
      this.text += String.fromCodePoint(c);
      if (c === CLOSE_BRACKET) {
        this.state = S_DOCTYPE;
      } else if (c === LESS) {
        this.state = S_DTD_OPEN_WAKA;
      } else if (isQuote(c)) {
        this.state = S_DTD_QUOTED;
        this.q = c;
      }
    }
    sDTDQuoted() {
      const q = this.q;
      if (this.captureToChar(q)) {
        this.text += String.fromCodePoint(q);
        this.state = S_DTD;
        this.q = null;
      }
    }
    sDTDOpenWaka() {
      const c = this.getCodeNorm();
      this.text += String.fromCodePoint(c);
      switch (c) {
        case BANG:
          this.state = S_DTD_OPEN_WAKA_BANG;
          this.openWakaBang = "";
          break;
        case QUESTION:
          this.state = S_DTD_PI;
          break;
        default:
          this.state = S_DTD;
      }
    }
    sDTDOpenWakaBang() {
      const char = String.fromCodePoint(this.getCodeNorm());
      const owb = this.openWakaBang += char;
      this.text += char;
      if (owb !== "-") {
        this.state = owb === "--" ? S_DTD_COMMENT : S_DTD;
        this.openWakaBang = "";
      }
    }
    sDTDComment() {
      if (this.captureToChar(MINUS)) {
        this.text += "-";
        this.state = S_DTD_COMMENT_ENDING;
      }
    }
    sDTDCommentEnding() {
      const c = this.getCodeNorm();
      this.text += String.fromCodePoint(c);
      this.state = c === MINUS ? S_DTD_COMMENT_ENDED : S_DTD_COMMENT;
    }
    sDTDCommentEnded() {
      const c = this.getCodeNorm();
      this.text += String.fromCodePoint(c);
      if (c === GREATER) {
        this.state = S_DTD;
      } else {
        this.fail("malformed comment.");
        this.state = S_DTD_COMMENT;
      }
    }
    sDTDPI() {
      if (this.captureToChar(QUESTION)) {
        this.text += "?";
        this.state = S_DTD_PI_ENDING;
      }
    }
    sDTDPIEnding() {
      const c = this.getCodeNorm();
      this.text += String.fromCodePoint(c);
      if (c === GREATER) {
        this.state = S_DTD;
      }
    }
    sText() {
      if (this.tags.length !== 0) {
        this.handleTextInRoot();
      } else {
        this.handleTextOutsideRoot();
      }
    }
    sEntity() {
      let { i: start } = this;
      const { chunk } = this;
      loop:
        while (true) {
          switch (this.getCode()) {
            case NL_LIKE:
              this.entity += `${chunk.slice(start, this.prevI)}
`;
              start = this.i;
              break;
            case SEMICOLON: {
              const { entityReturnState } = this;
              const entity = this.entity + chunk.slice(start, this.prevI);
              this.state = entityReturnState;
              let parsed;
              if (entity === "") {
                this.fail("empty entity name.");
                parsed = "&;";
              } else {
                parsed = this.parseEntity(entity);
                this.entity = "";
              }
              if (entityReturnState !== S_TEXT || this.textHandler !== void 0) {
                this.text += parsed;
              }
              break loop;
            }
            case EOC:
              this.entity += chunk.slice(start);
              break loop;
          }
        }
    }
    sOpenWaka() {
      const c = this.getCode();
      if (isNameStartChar(c)) {
        this.state = S_OPEN_TAG;
        this.unget();
        this.xmlDeclPossible = false;
      } else {
        switch (c) {
          case FORWARD_SLASH:
            this.state = S_CLOSE_TAG;
            this.xmlDeclPossible = false;
            break;
          case BANG:
            this.state = S_OPEN_WAKA_BANG;
            this.openWakaBang = "";
            this.xmlDeclPossible = false;
            break;
          case QUESTION:
            this.state = S_PI_FIRST_CHAR;
            break;
          default:
            this.fail("disallowed character in tag name");
            this.state = S_TEXT;
            this.xmlDeclPossible = false;
        }
      }
    }
    sOpenWakaBang() {
      this.openWakaBang += String.fromCodePoint(this.getCodeNorm());
      switch (this.openWakaBang) {
        case "[CDATA[":
          if (!this.sawRoot && !this.reportedTextBeforeRoot) {
            this.fail("text data outside of root node.");
            this.reportedTextBeforeRoot = true;
          }
          if (this.closedRoot && !this.reportedTextAfterRoot) {
            this.fail("text data outside of root node.");
            this.reportedTextAfterRoot = true;
          }
          this.state = S_CDATA;
          this.openWakaBang = "";
          break;
        case "--":
          this.state = S_COMMENT;
          this.openWakaBang = "";
          break;
        case "DOCTYPE":
          this.state = S_DOCTYPE;
          if (this.doctype || this.sawRoot) {
            this.fail("inappropriately located doctype declaration.");
          }
          this.openWakaBang = "";
          break;
        default:
          if (this.openWakaBang.length >= 7) {
            this.fail("incorrect syntax.");
          }
      }
    }
    sComment() {
      if (this.captureToChar(MINUS)) {
        this.state = S_COMMENT_ENDING;
      }
    }
    sCommentEnding() {
      var _a2;
      const c = this.getCodeNorm();
      if (c === MINUS) {
        this.state = S_COMMENT_ENDED;
        (_a2 = this.commentHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, this.text);
        this.text = "";
      } else {
        this.text += `-${String.fromCodePoint(c)}`;
        this.state = S_COMMENT;
      }
    }
    sCommentEnded() {
      const c = this.getCodeNorm();
      if (c !== GREATER) {
        this.fail("malformed comment.");
        this.text += `--${String.fromCodePoint(c)}`;
        this.state = S_COMMENT;
      } else {
        this.state = S_TEXT;
      }
    }
    sCData() {
      if (this.captureToChar(CLOSE_BRACKET)) {
        this.state = S_CDATA_ENDING;
      }
    }
    sCDataEnding() {
      const c = this.getCodeNorm();
      if (c === CLOSE_BRACKET) {
        this.state = S_CDATA_ENDING_2;
      } else {
        this.text += `]${String.fromCodePoint(c)}`;
        this.state = S_CDATA;
      }
    }
    sCDataEnding2() {
      var _a2;
      const c = this.getCodeNorm();
      switch (c) {
        case GREATER: {
          (_a2 = this.cdataHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, this.text);
          this.text = "";
          this.state = S_TEXT;
          break;
        }
        case CLOSE_BRACKET:
          this.text += "]";
          break;
        default:
          this.text += `]]${String.fromCodePoint(c)}`;
          this.state = S_CDATA;
      }
    }
    // We need this separate state to check the first character fo the pi target
    // with this.nameStartCheck which allows less characters than this.nameCheck.
    sPIFirstChar() {
      const c = this.getCodeNorm();
      if (this.nameStartCheck(c)) {
        this.piTarget += String.fromCodePoint(c);
        this.state = S_PI_REST;
      } else if (c === QUESTION || isS(c)) {
        this.fail("processing instruction without a target.");
        this.state = c === QUESTION ? S_PI_ENDING : S_PI_BODY;
      } else {
        this.fail("disallowed character in processing instruction name.");
        this.piTarget += String.fromCodePoint(c);
        this.state = S_PI_REST;
      }
    }
    sPIRest() {
      const { chunk, i: start } = this;
      while (true) {
        const c = this.getCodeNorm();
        if (c === EOC) {
          this.piTarget += chunk.slice(start);
          return;
        }
        if (!this.nameCheck(c)) {
          this.piTarget += chunk.slice(start, this.prevI);
          const isQuestion = c === QUESTION;
          if (isQuestion || isS(c)) {
            if (this.piTarget === "xml") {
              if (!this.xmlDeclPossible) {
                this.fail("an XML declaration must be at the start of the document.");
              }
              this.state = isQuestion ? S_XML_DECL_ENDING : S_XML_DECL_NAME_START;
            } else {
              this.state = isQuestion ? S_PI_ENDING : S_PI_BODY;
            }
          } else {
            this.fail("disallowed character in processing instruction name.");
            this.piTarget += String.fromCodePoint(c);
          }
          break;
        }
      }
    }
    sPIBody() {
      if (this.text.length === 0) {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_PI_ENDING;
        } else if (!isS(c)) {
          this.text = String.fromCodePoint(c);
        }
      } else if (this.captureToChar(QUESTION)) {
        this.state = S_PI_ENDING;
      }
    }
    sPIEnding() {
      var _a2;
      const c = this.getCodeNorm();
      if (c === GREATER) {
        const { piTarget } = this;
        if (piTarget.toLowerCase() === "xml") {
          this.fail("the XML declaration must appear at the start of the document.");
        }
        (_a2 = this.piHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, {
          target: piTarget,
          body: this.text
        });
        this.piTarget = this.text = "";
        this.state = S_TEXT;
      } else if (c === QUESTION) {
        this.text += "?";
      } else {
        this.text += `?${String.fromCodePoint(c)}`;
        this.state = S_PI_BODY;
      }
      this.xmlDeclPossible = false;
    }
    sXMLDeclNameStart() {
      const c = this.skipSpaces();
      if (c === QUESTION) {
        this.state = S_XML_DECL_ENDING;
        return;
      }
      if (c !== EOC) {
        this.state = S_XML_DECL_NAME;
        this.name = String.fromCodePoint(c);
      }
    }
    sXMLDeclName() {
      const c = this.captureTo(XML_DECL_NAME_TERMINATOR);
      if (c === QUESTION) {
        this.state = S_XML_DECL_ENDING;
        this.name += this.text;
        this.text = "";
        this.fail("XML declaration is incomplete.");
        return;
      }
      if (!(isS(c) || c === EQUAL)) {
        return;
      }
      this.name += this.text;
      this.text = "";
      if (!this.xmlDeclExpects.includes(this.name)) {
        switch (this.name.length) {
          case 0:
            this.fail("did not expect any more name/value pairs.");
            break;
          case 1:
            this.fail(`expected the name ${this.xmlDeclExpects[0]}.`);
            break;
          default:
            this.fail(`expected one of ${this.xmlDeclExpects.join(", ")}`);
        }
      }
      this.state = c === EQUAL ? S_XML_DECL_VALUE_START : S_XML_DECL_EQ;
    }
    sXMLDeclEq() {
      const c = this.getCodeNorm();
      if (c === QUESTION) {
        this.state = S_XML_DECL_ENDING;
        this.fail("XML declaration is incomplete.");
        return;
      }
      if (isS(c)) {
        return;
      }
      if (c !== EQUAL) {
        this.fail("value required.");
      }
      this.state = S_XML_DECL_VALUE_START;
    }
    sXMLDeclValueStart() {
      const c = this.getCodeNorm();
      if (c === QUESTION) {
        this.state = S_XML_DECL_ENDING;
        this.fail("XML declaration is incomplete.");
        return;
      }
      if (isS(c)) {
        return;
      }
      if (!isQuote(c)) {
        this.fail("value must be quoted.");
        this.q = SPACE;
      } else {
        this.q = c;
      }
      this.state = S_XML_DECL_VALUE;
    }
    sXMLDeclValue() {
      const c = this.captureTo([this.q, QUESTION]);
      if (c === QUESTION) {
        this.state = S_XML_DECL_ENDING;
        this.text = "";
        this.fail("XML declaration is incomplete.");
        return;
      }
      if (c === EOC) {
        return;
      }
      const value = this.text;
      this.text = "";
      switch (this.name) {
        case "version": {
          this.xmlDeclExpects = ["encoding", "standalone"];
          const version2 = value;
          this.xmlDecl.version = version2;
          if (!/^1\.[0-9]+$/.test(version2)) {
            this.fail("version number must match /^1\\.[0-9]+$/.");
          } else if (!this.opt.forceXMLVersion) {
            this.setXMLVersion(version2);
          }
          break;
        }
        case "encoding":
          if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(value)) {
            this.fail("encoding value must match 	/^[A-Za-z0-9][A-Za-z0-9._-]*$/.");
          }
          this.xmlDeclExpects = ["standalone"];
          this.xmlDecl.encoding = value;
          break;
        case "standalone":
          if (value !== "yes" && value !== "no") {
            this.fail('standalone value must match "yes" or "no".');
          }
          this.xmlDeclExpects = [];
          this.xmlDecl.standalone = value;
          break;
      }
      this.name = "";
      this.state = S_XML_DECL_SEPARATOR;
    }
    sXMLDeclSeparator() {
      const c = this.getCodeNorm();
      if (c === QUESTION) {
        this.state = S_XML_DECL_ENDING;
        return;
      }
      if (!isS(c)) {
        this.fail("whitespace required.");
        this.unget();
      }
      this.state = S_XML_DECL_NAME_START;
    }
    sXMLDeclEnding() {
      var _a2;
      const c = this.getCodeNorm();
      if (c === GREATER) {
        if (this.piTarget !== "xml") {
          this.fail("processing instructions are not allowed before root.");
        } else if (this.name !== "version" && this.xmlDeclExpects.includes("version")) {
          this.fail("XML declaration must contain a version.");
        }
        (_a2 = this.xmldeclHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, this.xmlDecl);
        this.name = "";
        this.piTarget = this.text = "";
        this.state = S_TEXT;
      } else {
        this.fail("The character ? is disallowed anywhere in XML declarations.");
      }
      this.xmlDeclPossible = false;
    }
    sOpenTag() {
      var _a2;
      const c = this.captureNameChars();
      if (c === EOC) {
        return;
      }
      const tag = this.tag = {
        name: this.name,
        attributes: /* @__PURE__ */ Object.create(null)
      };
      this.name = "";
      if (this.xmlnsOpt) {
        this.topNS = tag.ns = /* @__PURE__ */ Object.create(null);
      }
      (_a2 = this.openTagStartHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, tag);
      this.sawRoot = true;
      if (!this.fragmentOpt && this.closedRoot) {
        this.fail("documents may contain only one root.");
      }
      switch (c) {
        case GREATER:
          this.openTag();
          break;
        case FORWARD_SLASH:
          this.state = S_OPEN_TAG_SLASH;
          break;
        default:
          if (!isS(c)) {
            this.fail("disallowed character in tag name.");
          }
          this.state = S_ATTRIB;
      }
    }
    sOpenTagSlash() {
      if (this.getCode() === GREATER) {
        this.openSelfClosingTag();
      } else {
        this.fail("forward-slash in opening tag not followed by >.");
        this.state = S_ATTRIB;
      }
    }
    sAttrib() {
      const c = this.skipSpaces();
      if (c === EOC) {
        return;
      }
      if (isNameStartChar(c)) {
        this.unget();
        this.state = S_ATTRIB_NAME;
      } else if (c === GREATER) {
        this.openTag();
      } else if (c === FORWARD_SLASH) {
        this.state = S_OPEN_TAG_SLASH;
      } else {
        this.fail("disallowed character in attribute name.");
      }
    }
    sAttribName() {
      const c = this.captureNameChars();
      if (c === EQUAL) {
        this.state = S_ATTRIB_VALUE;
      } else if (isS(c)) {
        this.state = S_ATTRIB_NAME_SAW_WHITE;
      } else if (c === GREATER) {
        this.fail("attribute without value.");
        this.pushAttrib(this.name, this.name);
        this.name = this.text = "";
        this.openTag();
      } else if (c !== EOC) {
        this.fail("disallowed character in attribute name.");
      }
    }
    sAttribNameSawWhite() {
      const c = this.skipSpaces();
      switch (c) {
        case EOC:
          return;
        case EQUAL:
          this.state = S_ATTRIB_VALUE;
          break;
        default:
          this.fail("attribute without value.");
          this.text = "";
          this.name = "";
          if (c === GREATER) {
            this.openTag();
          } else if (isNameStartChar(c)) {
            this.unget();
            this.state = S_ATTRIB_NAME;
          } else {
            this.fail("disallowed character in attribute name.");
            this.state = S_ATTRIB;
          }
      }
    }
    sAttribValue() {
      const c = this.getCodeNorm();
      if (isQuote(c)) {
        this.q = c;
        this.state = S_ATTRIB_VALUE_QUOTED;
      } else if (!isS(c)) {
        this.fail("unquoted attribute value.");
        this.state = S_ATTRIB_VALUE_UNQUOTED;
        this.unget();
      }
    }
    sAttribValueQuoted() {
      const { q, chunk } = this;
      let { i: start } = this;
      while (true) {
        switch (this.getCode()) {
          case q:
            this.pushAttrib(this.name, this.text + chunk.slice(start, this.prevI));
            this.name = this.text = "";
            this.q = null;
            this.state = S_ATTRIB_VALUE_CLOSED;
            return;
          case AMP:
            this.text += chunk.slice(start, this.prevI);
            this.state = S_ENTITY;
            this.entityReturnState = S_ATTRIB_VALUE_QUOTED;
            return;
          case NL:
          case NL_LIKE:
          case TAB:
            this.text += `${chunk.slice(start, this.prevI)} `;
            start = this.i;
            break;
          case LESS:
            this.text += chunk.slice(start, this.prevI);
            this.fail("disallowed character.");
            return;
          case EOC:
            this.text += chunk.slice(start);
            return;
        }
      }
    }
    sAttribValueClosed() {
      const c = this.getCodeNorm();
      if (isS(c)) {
        this.state = S_ATTRIB;
      } else if (c === GREATER) {
        this.openTag();
      } else if (c === FORWARD_SLASH) {
        this.state = S_OPEN_TAG_SLASH;
      } else if (isNameStartChar(c)) {
        this.fail("no whitespace between attributes.");
        this.unget();
        this.state = S_ATTRIB_NAME;
      } else {
        this.fail("disallowed character in attribute name.");
      }
    }
    sAttribValueUnquoted() {
      const c = this.captureTo(ATTRIB_VALUE_UNQUOTED_TERMINATOR);
      switch (c) {
        case AMP:
          this.state = S_ENTITY;
          this.entityReturnState = S_ATTRIB_VALUE_UNQUOTED;
          break;
        case LESS:
          this.fail("disallowed character.");
          break;
        case EOC:
          break;
        default:
          if (this.text.includes("]]>")) {
            this.fail('the string "]]>" is disallowed in char data.');
          }
          this.pushAttrib(this.name, this.text);
          this.name = this.text = "";
          if (c === GREATER) {
            this.openTag();
          } else {
            this.state = S_ATTRIB;
          }
      }
    }
    sCloseTag() {
      const c = this.captureNameChars();
      if (c === GREATER) {
        this.closeTag();
      } else if (isS(c)) {
        this.state = S_CLOSE_TAG_SAW_WHITE;
      } else if (c !== EOC) {
        this.fail("disallowed character in closing tag.");
      }
    }
    sCloseTagSawWhite() {
      switch (this.skipSpaces()) {
        case GREATER:
          this.closeTag();
          break;
        case EOC:
          break;
        default:
          this.fail("disallowed character in closing tag.");
      }
    }
    // END OF STATE ENGINE METHODS
    handleTextInRoot() {
      let { i: start, forbiddenState } = this;
      const { chunk, textHandler: handler } = this;
      scanLoop:
        while (true) {
          switch (this.getCode()) {
            case LESS: {
              this.state = S_OPEN_WAKA;
              if (handler !== void 0) {
                const { text } = this;
                const slice = chunk.slice(start, this.prevI);
                if (text.length !== 0) {
                  handler(text + slice);
                  this.text = "";
                } else if (slice.length !== 0) {
                  handler(slice);
                }
              }
              forbiddenState = FORBIDDEN_START;
              break scanLoop;
            }
            case AMP:
              this.state = S_ENTITY;
              this.entityReturnState = S_TEXT;
              if (handler !== void 0) {
                this.text += chunk.slice(start, this.prevI);
              }
              forbiddenState = FORBIDDEN_START;
              break scanLoop;
            case CLOSE_BRACKET:
              switch (forbiddenState) {
                case FORBIDDEN_START:
                  forbiddenState = FORBIDDEN_BRACKET;
                  break;
                case FORBIDDEN_BRACKET:
                  forbiddenState = FORBIDDEN_BRACKET_BRACKET;
                  break;
                case FORBIDDEN_BRACKET_BRACKET:
                  break;
                default:
                  throw new Error("impossible state");
              }
              break;
            case GREATER:
              if (forbiddenState === FORBIDDEN_BRACKET_BRACKET) {
                this.fail('the string "]]>" is disallowed in char data.');
              }
              forbiddenState = FORBIDDEN_START;
              break;
            case NL_LIKE:
              if (handler !== void 0) {
                this.text += `${chunk.slice(start, this.prevI)}
`;
              }
              start = this.i;
              forbiddenState = FORBIDDEN_START;
              break;
            case EOC:
              if (handler !== void 0) {
                this.text += chunk.slice(start);
              }
              break scanLoop;
            default:
              forbiddenState = FORBIDDEN_START;
          }
        }
      this.forbiddenState = forbiddenState;
    }
    handleTextOutsideRoot() {
      let { i: start } = this;
      const { chunk, textHandler: handler } = this;
      let nonSpace = false;
      outRootLoop:
        while (true) {
          const code = this.getCode();
          switch (code) {
            case LESS: {
              this.state = S_OPEN_WAKA;
              if (handler !== void 0) {
                const { text } = this;
                const slice = chunk.slice(start, this.prevI);
                if (text.length !== 0) {
                  handler(text + slice);
                  this.text = "";
                } else if (slice.length !== 0) {
                  handler(slice);
                }
              }
              break outRootLoop;
            }
            case AMP:
              this.state = S_ENTITY;
              this.entityReturnState = S_TEXT;
              if (handler !== void 0) {
                this.text += chunk.slice(start, this.prevI);
              }
              nonSpace = true;
              break outRootLoop;
            case NL_LIKE:
              if (handler !== void 0) {
                this.text += `${chunk.slice(start, this.prevI)}
`;
              }
              start = this.i;
              break;
            case EOC:
              if (handler !== void 0) {
                this.text += chunk.slice(start);
              }
              break outRootLoop;
            default:
              if (!isS(code)) {
                nonSpace = true;
              }
          }
        }
      if (!nonSpace) {
        return;
      }
      if (!this.sawRoot && !this.reportedTextBeforeRoot) {
        this.fail("text data outside of root node.");
        this.reportedTextBeforeRoot = true;
      }
      if (this.closedRoot && !this.reportedTextAfterRoot) {
        this.fail("text data outside of root node.");
        this.reportedTextAfterRoot = true;
      }
    }
    pushAttribNS(name, value) {
      var _a2;
      const { prefix, local } = this.qname(name);
      const attr = { name, prefix, local, value };
      this.attribList.push(attr);
      (_a2 = this.attributeHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, attr);
      if (prefix === "xmlns") {
        const trimmed = value.trim();
        if (this.currentXMLVersion === "1.0" && trimmed === "") {
          this.fail("invalid attempt to undefine prefix in XML 1.0");
        }
        this.topNS[local] = trimmed;
        nsPairCheck(this, local, trimmed);
      } else if (name === "xmlns") {
        const trimmed = value.trim();
        this.topNS[""] = trimmed;
        nsPairCheck(this, "", trimmed);
      }
    }
    pushAttribPlain(name, value) {
      var _a2;
      const attr = { name, value };
      this.attribList.push(attr);
      (_a2 = this.attributeHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, attr);
    }
    /**
     * End parsing. This performs final well-formedness checks and resets the
     * parser to a clean state.
     *
     * @returns this
     */
    end() {
      var _a2, _b;
      if (!this.sawRoot) {
        this.fail("document must contain a root element.");
      }
      const { tags: tags2 } = this;
      while (tags2.length > 0) {
        const tag = tags2.pop();
        this.fail(`unclosed tag: ${tag.name}`);
      }
      if (this.state !== S_BEGIN && this.state !== S_TEXT) {
        this.fail("unexpected end.");
      }
      const { text } = this;
      if (text.length !== 0) {
        (_a2 = this.textHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, text);
        this.text = "";
      }
      this._closed = true;
      (_b = this.endHandler) === null || _b === void 0 ? void 0 : _b.call(this);
      this._init();
      return this;
    }
    /**
     * Resolve a namespace prefix.
     *
     * @param prefix The prefix to resolve.
     *
     * @returns The namespace URI or ``undefined`` if the prefix is not defined.
     */
    resolve(prefix) {
      var _a2, _b;
      let uri = this.topNS[prefix];
      if (uri !== void 0) {
        return uri;
      }
      const { tags: tags2 } = this;
      for (let index = tags2.length - 1; index >= 0; index--) {
        uri = tags2[index].ns[prefix];
        if (uri !== void 0) {
          return uri;
        }
      }
      uri = this.ns[prefix];
      if (uri !== void 0) {
        return uri;
      }
      return (_b = (_a2 = this.opt).resolvePrefix) === null || _b === void 0 ? void 0 : _b.call(_a2, prefix);
    }
    /**
     * Parse a qname into its prefix and local name parts.
     *
     * @param name The name to parse
     *
     * @returns
     */
    qname(name) {
      const colon = name.indexOf(":");
      if (colon === -1) {
        return { prefix: "", local: name };
      }
      const local = name.slice(colon + 1);
      const prefix = name.slice(0, colon);
      if (prefix === "" || local === "" || local.includes(":")) {
        this.fail(`malformed name: ${name}.`);
      }
      return { prefix, local };
    }
    processAttribsNS() {
      var _a2;
      const { attribList } = this;
      const tag = this.tag;
      {
        const { prefix, local } = this.qname(tag.name);
        tag.prefix = prefix;
        tag.local = local;
        const uri = tag.uri = (_a2 = this.resolve(prefix)) !== null && _a2 !== void 0 ? _a2 : "";
        if (prefix !== "") {
          if (prefix === "xmlns") {
            this.fail('tags may not have "xmlns" as prefix.');
          }
          if (uri === "") {
            this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
            tag.uri = prefix;
          }
        }
      }
      if (attribList.length === 0) {
        return;
      }
      const { attributes } = tag;
      const seen = /* @__PURE__ */ new Set();
      for (const attr of attribList) {
        const { name, prefix, local } = attr;
        let uri;
        let eqname;
        if (prefix === "") {
          uri = name === "xmlns" ? XMLNS_NAMESPACE : "";
          eqname = name;
        } else {
          uri = this.resolve(prefix);
          if (uri === void 0) {
            this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
            uri = prefix;
          }
          eqname = `{${uri}}${local}`;
        }
        if (seen.has(eqname)) {
          this.fail(`duplicate attribute: ${eqname}.`);
        }
        seen.add(eqname);
        attr.uri = uri;
        attributes[name] = attr;
      }
      this.attribList = [];
    }
    processAttribsPlain() {
      const { attribList } = this;
      const attributes = this.tag.attributes;
      for (const { name, value } of attribList) {
        if (attributes[name] !== void 0) {
          this.fail(`duplicate attribute: ${name}.`);
        }
        attributes[name] = value;
      }
      this.attribList = [];
    }
    /**
     * Handle a complete open tag. This parser code calls this once it has seen
     * the whole tag. This method checks for well-formeness and then emits
     * ``onopentag``.
     */
    openTag() {
      var _a2;
      this.processAttribs();
      const { tags: tags2 } = this;
      const tag = this.tag;
      tag.isSelfClosing = false;
      (_a2 = this.openTagHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, tag);
      tags2.push(tag);
      this.state = S_TEXT;
      this.name = "";
    }
    /**
     * Handle a complete self-closing tag. This parser code calls this once it has
     * seen the whole tag. This method checks for well-formeness and then emits
     * ``onopentag`` and ``onclosetag``.
     */
    openSelfClosingTag() {
      var _a2, _b, _c;
      this.processAttribs();
      const { tags: tags2 } = this;
      const tag = this.tag;
      tag.isSelfClosing = true;
      (_a2 = this.openTagHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, tag);
      (_b = this.closeTagHandler) === null || _b === void 0 ? void 0 : _b.call(this, tag);
      const top = this.tag = (_c = tags2[tags2.length - 1]) !== null && _c !== void 0 ? _c : null;
      if (top === null) {
        this.closedRoot = true;
      }
      this.state = S_TEXT;
      this.name = "";
    }
    /**
     * Handle a complete close tag. This parser code calls this once it has seen
     * the whole tag. This method checks for well-formeness and then emits
     * ``onclosetag``.
     */
    closeTag() {
      const { tags: tags2, name } = this;
      this.state = S_TEXT;
      this.name = "";
      if (name === "") {
        this.fail("weird empty close tag.");
        this.text += "</>";
        return;
      }
      const handler = this.closeTagHandler;
      let l = tags2.length;
      while (l-- > 0) {
        const tag = this.tag = tags2.pop();
        this.topNS = tag.ns;
        handler === null || handler === void 0 ? void 0 : handler(tag);
        if (tag.name === name) {
          break;
        }
        this.fail("unexpected close tag.");
      }
      if (l === 0) {
        this.closedRoot = true;
      } else if (l < 0) {
        this.fail(`unmatched closing tag: ${name}.`);
        this.text += `</${name}>`;
      }
    }
    /**
     * Resolves an entity. Makes any necessary well-formedness checks.
     *
     * @param entity The entity to resolve.
     *
     * @returns The parsed entity.
     */
    parseEntity(entity) {
      if (entity[0] !== "#") {
        const defined = this.ENTITIES[entity];
        if (defined !== void 0) {
          return defined;
        }
        this.fail(this.isName(entity) ? "undefined entity." : "disallowed character in entity name.");
        return `&${entity};`;
      }
      let num = NaN;
      if (entity[1] === "x" && /^#x[0-9a-f]+$/i.test(entity)) {
        num = parseInt(entity.slice(2), 16);
      } else if (/^#[0-9]+$/.test(entity)) {
        num = parseInt(entity.slice(1), 10);
      }
      if (!this.isChar(num)) {
        this.fail("malformed character entity.");
        return `&${entity};`;
      }
      return String.fromCodePoint(num);
    }
  }
  saxes$1.SaxesParser = SaxesParser;
  return saxes$1;
}
var saxesExports = requireSaxes$1();
const MAX_OME_XML_INSPECTION_BYTES = 16 * 1024 * 1024;
const MAX_OME_XML_ELEMENTS = 1e5;
const MAX_OME_XML_DEPTH = 64;
const MAX_OME_XML_ATTRIBUTES_PER_ELEMENT = 256;
const MAX_OME_XML_ATTRIBUTES = 1e5;
const MAX_OME_XML_UUID_CHARS = 128;
const MAX_OME_XML_FILE_NAME_BYTES = 1024;
function hasOmeXmlRoot(xmlString) {
  return /<(?:[A-Za-z_][\w.-]*:)?OME(?:\s|>)/.test(xmlString);
}
function inspectOmeTiffXml(xmlString) {
  if (!hasOmeXmlRoot(xmlString) || new TextEncoder().encode(xmlString).byteLength > MAX_OME_XML_INSPECTION_BYTES) {
    return void 0;
  }
  const inspection = {
    imageCount: 0,
    pixelsCount: 0,
    pixelAttributes: {},
    channelNames: [],
    channelNamesTruncated: false,
    hasBinaryOnly: false,
    tiffData: []
  };
  const elementStack = [];
  const tiffDataStack = [];
  let uuidText;
  let invalid = false;
  let elementCount = 0;
  let attributeCount = 0;
  let elementAttributeCount = 0;
  let retainedImageDepth;
  const retainedPixelsDepths = [];
  const parser = new saxesExports.SaxesParser({ xmlns: true });
  const rejectLimit = () => {
    invalid = true;
    throw new Error("OME XML inspection limit exceeded.");
  };
  parser.on("error", () => {
    invalid = true;
  });
  parser.on("opentagstart", () => {
    elementAttributeCount = 0;
  });
  parser.on("attribute", () => {
    attributeCount += 1;
    elementAttributeCount += 1;
    if (attributeCount > MAX_OME_XML_ATTRIBUTES || elementAttributeCount > MAX_OME_XML_ATTRIBUTES_PER_ELEMENT) {
      rejectLimit();
    }
  });
  parser.on("opentag", (tag) => {
    elementCount += 1;
    if (elementCount > MAX_OME_XML_ELEMENTS || elementStack.length >= MAX_OME_XML_DEPTH) {
      rejectLimit();
    }
    if (uuidText && elementStack.length >= uuidText.depth) {
      uuidText.directTextOpen = false;
    }
    const name = tag.local;
    const parent = elementStack.at(-1);
    elementStack.push(name);
    if (elementStack.length === 1) {
      if (name !== "OME") {
        invalid = true;
        return;
      }
      const rootUuid = attribute(tag, "UUID");
      if (rootUuid && rootUuid.length > MAX_OME_XML_UUID_CHARS) {
        rejectLimit();
      }
      inspection.rootUuid = rootUuid?.trim() || void 0;
    }
    if (name === "Image") {
      if (inspection.imageCount === 0) {
        retainedImageDepth = elementStack.length;
      }
      inspection.imageCount = Math.min(2, inspection.imageCount + 1);
    }
    if (name === "BinaryOnly") inspection.hasBinaryOnly = true;
    if (name === "Pixels" && inspection.imageCount === 1 && retainedImageDepth !== void 0) {
      inspection.pixelsCount = Math.min(2, inspection.pixelsCount + 1);
      retainedPixelsDepths.push(elementStack.length);
      if (inspection.pixelsCount === 1) {
        inspection.pixelAttributes = {
          sizeX: attribute(tag, "SizeX"),
          sizeY: attribute(tag, "SizeY"),
          sizeZ: attribute(tag, "SizeZ"),
          sizeC: attribute(tag, "SizeC"),
          sizeT: attribute(tag, "SizeT"),
          dimensionOrder: attribute(tag, "DimensionOrder"),
          pixelType: attribute(tag, "Type")
        };
      }
    }
    if (name === "Channel" && parent === "Pixels" && inspection.pixelsCount === 1 && retainedPixelsDepths.at(-1) === elementStack.length - 1) {
      const channelName = attribute(tag, "Name");
      if (inspection.channelNames.length < 256)
        inspection.channelNames.push(channelName?.slice(0, 128) || null);
      else inspection.channelNamesTruncated = true;
      if ((channelName?.length ?? 0) > 128)
        inspection.channelNamesTruncated = true;
    }
    if (name === "TiffData") {
      const parentTiffData = tiffDataStack.at(-1);
      if (parent === "TiffData" && parentTiffData) {
        parentTiffData.hasUnsupportedChild = true;
      }
      const next3 = parent === "Pixels" && retainedPixelsDepths.at(-1) === elementStack.length - 1 && inspection.tiffData.length < 2 ? {
        ifd: attribute(tag, "IFD"),
        firstZ: attribute(tag, "FirstZ"),
        firstC: attribute(tag, "FirstC"),
        firstT: attribute(tag, "FirstT"),
        planeCount: attribute(tag, "PlaneCount"),
        hasUnsupportedChild: false,
        uuidReferences: []
      } : void 0;
      if (next3) inspection.tiffData.push(next3);
      tiffDataStack.push(next3);
      return;
    }
    const currentTiffData = tiffDataStack.at(-1);
    if (currentTiffData && parent === "TiffData") {
      if (name !== "UUID") {
        currentTiffData.hasUnsupportedChild = true;
      } else {
        const fileName = attribute(tag, "FileName");
        if (fileName && new TextEncoder().encode(fileName).byteLength > MAX_OME_XML_FILE_NAME_BYTES) {
          rejectLimit();
        }
        if (currentTiffData.uuidReferences.length < 2) {
          const reference = { value: "", fileName };
          currentTiffData.uuidReferences.push(reference);
          uuidText = {
            reference,
            directTextOpen: true,
            depth: elementStack.length,
            text: ""
          };
        }
      }
    }
  });
  const appendUuidDirectText = (text) => {
    if (!uuidText || !uuidText.directTextOpen || elementStack.length !== uuidText.depth) {
      return;
    }
    if (uuidText.text.length + text.length > MAX_OME_XML_UUID_CHARS) {
      rejectLimit();
    }
    uuidText.text += text;
  };
  const closeUuidDirectText = () => {
    if (uuidText && elementStack.length >= uuidText.depth) {
      uuidText.directTextOpen = false;
    }
  };
  parser.on("text", appendUuidDirectText);
  parser.on("cdata", appendUuidDirectText);
  parser.on("comment", closeUuidDirectText);
  parser.on("processinginstruction", closeUuidDirectText);
  parser.on("closetag", (tag) => {
    const name = tag.local;
    const depth = elementStack.length;
    if (name === "UUID" && uuidText?.depth === depth) {
      uuidText.reference.value = uuidText.text.trim();
      uuidText = void 0;
    }
    if (name === "TiffData") tiffDataStack.pop();
    if (name === "Pixels" && retainedPixelsDepths.at(-1) === depth) {
      retainedPixelsDepths.pop();
    }
    if (name === "Image" && retainedImageDepth === depth) {
      retainedImageDepth = void 0;
    }
    elementStack.pop();
  });
  try {
    parser.write(xmlString.replace(/\0+$/, "")).close();
  } catch {
    return void 0;
  }
  if (invalid || elementStack.length !== 0) return void 0;
  return inspection;
}
function attribute(tag, name) {
  const attribute2 = tag.attributes[name];
  return attribute2?.prefix === "" ? attribute2.value : void 0;
}
function detectWellFromFilename(filename) {
  return matchExplicitWellLabel(filename) ?? matchRowColNumeric(filename) ?? matchOperaStyle(filename) ?? matchOperaWellIndex(filename) ?? matchLetterDigit(filename);
}
function matchExplicitWellLabel(filename) {
  const match = /[Ww]ell[_-]([A-P])(\d{1,2})/i.exec(filename);
  if (!match) return void 0;
  return fromLetterDigit(match[1].toUpperCase(), match[2]);
}
function matchRowColNumeric(filename) {
  const match = /(?:^|[_\-\s/\\])[Rr](\d{1,2})[Cc](\d{1,2})(?![0-9])/.exec(
    filename
  );
  if (!match) return void 0;
  const row = parseInt(match[1], 10) - 1;
  const col = parseInt(match[2], 10) - 1;
  return fromRowCol(row, col);
}
function matchOperaStyle(filename) {
  const match = /(?:^|[_\-\s/\\])([A-P])\s*-\s*(\d{1,2})(?=[_\-\s./\\]|$)/.exec(
    filename
  );
  if (!match) return void 0;
  return fromLetterDigit(match[1], match[2]);
}
function matchOperaWellIndex(filename) {
  const match = /[_/\\]O(\d{1,3})f\d+d\d+/i.exec(filename);
  if (!match) return void 0;
  const wellNum = parseInt(match[1], 10);
  if (wellNum < 1 || wellNum > 384) return void 0;
  const cols = 12;
  const row = Math.floor((wellNum - 1) / cols);
  const col = (wellNum - 1) % cols;
  return fromRowCol(row, col);
}
function matchLetterDigit(filename) {
  const match = /(?:^|[_\-\s/\\])([A-P])(\d{1,2})(?=[_\-\s./\\]|$)/i.exec(
    filename
  );
  if (!match) return void 0;
  return fromLetterDigit(match[1].toUpperCase(), match[2]);
}
function fromLetterDigit(letter, digitStr) {
  return fromRowCol(letter.charCodeAt(0) - 65, parseInt(digitStr, 10) - 1);
}
function fromRowCol(row, col) {
  if (row < 0 || row > 15 || col < 0 || col > 23) return void 0;
  const id = `${String.fromCharCode(65 + row)}${String(col + 1).padStart(2, "0")}`;
  return { id, row, column: col };
}
function detectSiteFromFilename(filename, options = {}) {
  const pattern = options.allowFieldToken ? /(?:^|[_\-\s/\\])[SsFf](\d{1,3})(?!_[Ww]\d)(?=[_\-\s./\\]|$)/ : /(?:^|[_\-\s/\\])[Ss](\d{1,3})(?!_[Ww]\d)(?=[_\-\s./\\]|$)/;
  const match = pattern.exec(filename);
  if (!match) return void 0;
  const site = parseInt(match[1], 10);
  return site >= 1 ? site - 1 : void 0;
}
const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const MAX_IMAGEJ_DESCRIPTION_CHARS = 64 * 1024;
const MAX_BROWSER_TIFF_METADATA_BYTES = 64 * MIB;
const MAX_UPLOADER_TIFF_OBJECT_BYTES = 1 * GIB;
const MAX_UPLOADER_TIFF_SELECTION_BYTES = 14e11;
const MAX_UPLOADER_TIFF_FILE_COUNT = 4096;
const MAX_TIFF_DECODED_BYTES = 24 * GIB;
const MAX_TIFF_IFD_COUNT = 3e3;
const MAX_TIFF_CHANNEL_COUNT = 256;
const MAX_TIFF_DECODED_PLANE_BYTES = 64 * MIB;
const MAX_TIFF_DECODED_RGB_PAGE_BYTES = 256 * MIB;
const MAX_TIFF_METADATA_BYTES = 32 * MIB;
const MAX_TIFF_METADATA_SLICE_BYTES = 16 * MIB;
const TIFF_UPLOAD_ADAPTER_KEY = "tiff";
const TIFF_UPLOAD_ADAPTER_VERSION = 1;
const FINITE_TIFF_PROFILE = {
  key: "finite-tiff",
  maxObjectBytes: MAX_UPLOADER_TIFF_OBJECT_BYTES,
  maxSelectionBytes: MAX_UPLOADER_TIFF_SELECTION_BYTES,
  maxFileCount: MAX_UPLOADER_TIFF_FILE_COUNT,
  maxSelectionMetadataBytes: MAX_BROWSER_TIFF_METADATA_BYTES,
  oversizeDisposition: "blocked"
};
const OME_DIMENSION_ORDERS = /* @__PURE__ */ new Set([
  "XYCZT",
  "XYZCT",
  "XYCTZ",
  "XYTCZ",
  "XYZTC",
  "XYTZC"
]);
const COMPRESSION_NAMES = /* @__PURE__ */ new Map([
  [1, "none"],
  [5, "lzw"],
  [8, "adobe_deflate"],
  [32946, "deflate"],
  [32773, "packbits"]
]);
const CRITICAL_TAGS = [256, 257, 258, 270, 277, 339];
async function qualifyTiffSources(input, profile, signal) {
  signal?.throwIfAborted();
  const candidates = input.map((candidate) => ({
    ...candidate,
    relativePath: normalizeRelativePath(candidate.relativePath)
  })).sort((a, b) => compareStrings$1(a.relativePath, b.relativePath));
  if (candidates.length === 0) {
    return blocked("invalid_tiff", "Choose at least one TIFF file.");
  }
  for (let index = 0; index < candidates.length; index += 1) {
    signal?.throwIfAborted();
    const candidate = candidates[index];
    if (!isTiffPath(candidate.relativePath)) {
      return blocked(
        "invalid_tiff",
        "The selection contains a file that is not a TIFF.",
        candidate.relativePath
      );
    }
    if (index > 0 && candidate.relativePath === candidates[index - 1].relativePath) {
      return blocked(
        "unsupported_layout",
        "The selection contains the same relative path more than once.",
        candidate.relativePath
      );
    }
  }
  if (candidates.length > profile.maxFileCount) {
    return limitFailure(
      profile,
      "selection_too_large",
      profile.key === "browser-small" ? `Small upload supports at most ${profile.maxFileCount.toLocaleString()} TIFF files. Use Carnation Data Upload for larger selections.` : `Carnation Uploader accepts at most ${profile.maxFileCount.toLocaleString()} TIFF files.`
    );
  }
  const oversized = candidates.find(
    (candidate) => candidate.encodedBytes > profile.maxObjectBytes
  );
  if (oversized) {
    return limitFailure(
      profile,
      "browser_object_too_large",
      profile.key === "browser-small" ? "This TIFF exceeds the 1 GiB Small upload limit. Use Carnation Data Upload." : "Each TIFF must be at most 1 GiB.",
      oversized.relativePath
    );
  }
  const totalEncodedBytes = candidates.reduce(
    (total, candidate) => total + candidate.encodedBytes,
    0
  );
  if (!Number.isSafeInteger(totalEncodedBytes) || profile.maxSelectionBytes !== null && totalEncodedBytes > profile.maxSelectionBytes) {
    return limitFailure(
      profile,
      "selection_too_large",
      profile.key === "browser-small" ? "This selection is too large for browser upload. Use Carnation Data Upload." : "The TIFF folder must be at most 1.4 TB."
    );
  }
  signal?.throwIfAborted();
  const placements = resolvePlacements(candidates);
  if ("status" in placements) return placements;
  const metadataBudget = new SelectionMetadataBudget(profile);
  const files = [];
  for (let index = 0; index < candidates.length; index += 1) {
    signal?.throwIfAborted();
    const candidate = candidates[index];
    const inspected = await inspectTiff(candidate, metadataBudget, signal);
    signal?.throwIfAborted();
    if ("status" in inspected) return inspected;
    files.push({
      relativePath: candidate.relativePath,
      isOme: inspected.isOme,
      isBigTiff: inspected.isBigTiff,
      encodedBytes: candidate.encodedBytes,
      seriesCount: 1,
      seriesIndex: 0,
      dimensionOrder: inspected.dimensionOrder,
      storageAxes: inspected.storageAxes,
      normalizedAxes: inspected.normalizedAxes,
      shape: inspected.shape,
      channelNames: inspected.channelNames,
      channelNamesTruncated: inspected.channelNamesTruncated,
      dtype: inspected.dtype,
      compressions: inspected.compressions,
      pageCount: inspected.pageCount,
      decodedBytes: inspected.decodedBytes,
      placement: placements[index]
    });
  }
  return {
    adapterKey: TIFF_UPLOAD_ADAPTER_KEY,
    adapterVersion: TIFF_UPLOAD_ADAPTER_VERSION,
    status: "supported",
    files,
    totalEncodedBytes
  };
}
async function inspectTiff(source, metadataBudget, signal) {
  let tiff;
  try {
    signal?.throwIfAborted();
    tiff = await source.open(metadataBudget, signal);
    signal?.throwIfAborted();
    const pages = [];
    for (let index = 0; index < MAX_TIFF_IFD_COUNT; index += 1) {
      signal?.throwIfAborted();
      const image = await tiff.getImage(index);
      signal?.throwIfAborted();
      const page = await inspectPage(image, signal);
      signal?.throwIfAborted();
      pages.push(page);
      if (page.nextIfdOffset === 0) break;
      if (index === MAX_TIFF_IFD_COUNT - 1) {
        throw new QualificationFailure(
          "resource_limit",
          `TIFFs with more than ${MAX_TIFF_IFD_COUNT.toLocaleString()} pages are not supported.`
        );
      }
    }
    const first = pages[0];
    if (!first) {
      throw new QualificationFailure("invalid_tiff", "The TIFF has no images.");
    }
    for (const page of pages.slice(1)) {
      if (page.width !== first.width || page.height !== first.height || page.samplesPerPixel !== first.samplesPerPixel || page.photometric !== first.photometric || page.dtype !== first.dtype) {
        throw new QualificationFailure(
          "unsupported_layout",
          "TIFF pages must have the same dimensions and pixel type."
        );
      }
    }
    const decodedBytes = pages.reduce(
      (total, page) => total + page.decodedBytes,
      0
    );
    if (!Number.isSafeInteger(decodedBytes) || decodedBytes > MAX_TIFF_DECODED_BYTES) {
      throw new QualificationFailure(
        "resource_limit",
        "The decoded TIFF is larger than the supported processing envelope."
      );
    }
    const description = first.description;
    const isOme = description ? hasOmeXmlRoot(description) : false;
    const isImageJ = !isOme && description?.startsWith("ImageJ=") === true;
    signal?.throwIfAborted();
    const ome = isOme ? inspectOmeTiffXml(description ?? "") : void 0;
    signal?.throwIfAborted();
    const shape = isOme ? qualifyOmeShape(ome, pages, first, source.relativePath) : isImageJ ? qualifyImageJShape(description ?? "", pages, first) : qualifyPlainShape(pages, first);
    const compressions = Array.from(
      new Set(pages.map((page) => page.compression))
    ).sort(compareStrings$1);
    return {
      isOme,
      isBigTiff: tiff.bigTiff,
      dimensionOrder: shape.dimensionOrder,
      storageAxes: shape.storageAxes,
      normalizedAxes: shape.normalizedAxes,
      shape: shape.shape,
      channelNames: ome?.channelNames ?? null,
      channelNamesTruncated: ome?.channelNamesTruncated ?? false,
      dtype: first.dtype,
      compressions,
      pageCount: pages.length,
      decodedBytes
    };
  } catch (error2) {
    if (signal?.aborted) throw error2;
    if (error2 instanceof QualificationFailure) {
      return blocked(error2.code, error2.message, source.relativePath);
    }
    if (error2 instanceof RouteToUploaderFailure) {
      return route(error2.code, error2.message, source.relativePath);
    }
    return blocked(
      "invalid_tiff",
      "Carnation could not read this TIFF's metadata.",
      source.relativePath
    );
  } finally {
    await tiff?.close();
  }
}
async function inspectPage(image, signal) {
  const fd = image.getFileDirectory();
  for (const tag of CRITICAL_TAGS) {
    await loadTagValue(fd, tag, signal);
  }
  const width = image.getWidth();
  const height = image.getHeight();
  const samplesPerPixel = image.getSamplesPerPixel();
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    throw new QualificationFailure(
      "invalid_tiff",
      "The TIFF has invalid image dimensions."
    );
  }
  if (samplesPerPixel !== 1 && samplesPerPixel !== 3) {
    throw new QualificationFailure(
      "unsupported_layout",
      "Only grayscale planes and contiguous RGB TIFF images are supported."
    );
  }
  const sampleDtypes = Array.from(
    { length: samplesPerPixel },
    (_, sample) => qualifyDtype(image.getSampleFormat(sample), image.getBitsPerSample(sample))
  );
  const dtype = sampleDtypes[0];
  if (!dtype || sampleDtypes.some((candidate) => candidate !== dtype)) {
    throw new QualificationFailure(
      "unsupported_dtype",
      "TIFF samples must share one supported pixel type."
    );
  }
  const bitsPerSample = image.getBitsPerSample(0);
  const compressionCode = scalarNumber(
    await loadTagValue(fd, "Compression", signal),
    1
  );
  const compression = COMPRESSION_NAMES.get(compressionCode);
  if (!compression) {
    throw new QualificationFailure(
      "unsupported_compression",
      `TIFF compression ${compressionCode} is not supported.`
    );
  }
  const photometric = scalarNumber(
    await loadTagValue(fd, "PhotometricInterpretation", signal),
    1
  );
  const planarConfiguration = scalarNumber(
    await loadTagValue(fd, "PlanarConfiguration", signal),
    1
  );
  const isGrayscale = samplesPerPixel === 1 && (photometric === 0 || photometric === 1);
  const isPackedRgb = samplesPerPixel === 3 && photometric === 2 && planarConfiguration === 1;
  if (!isGrayscale && !isPackedRgb) {
    throw new QualificationFailure(
      "unsupported_layout",
      "Only grayscale planes and contiguous RGB TIFF images are supported."
    );
  }
  if (fd.hasTag("SubIFDs")) {
    throw new QualificationFailure(
      "unsupported_layout",
      "Pyramidal TIFF SubIFDs are not supported in browser upload yet."
    );
  }
  const newSubfileType = scalarNumber(
    await loadTagValue(fd, "NewSubfileType", signal),
    0
  );
  if (newSubfileType !== 0) {
    throw new QualificationFailure(
      "unsupported_layout",
      "Reduced-resolution and auxiliary TIFF images are not supported."
    );
  }
  const orientation = scalarNumber(
    await loadTagValue(fd, "Orientation", signal),
    1
  );
  if (orientation !== 1) {
    throw new QualificationFailure(
      "unsupported_layout",
      "TIFF orientation transforms are not supported."
    );
  }
  const decodedBytes = width * height * samplesPerPixel * (bitsPerSample / 8);
  const maxPageBytes = isPackedRgb ? MAX_TIFF_DECODED_RGB_PAGE_BYTES : MAX_TIFF_DECODED_PLANE_BYTES;
  if (!Number.isSafeInteger(decodedBytes) || decodedBytes > maxPageBytes) {
    throw new QualificationFailure(
      "resource_limit",
      "A decoded TIFF plane is larger than the supported processing envelope."
    );
  }
  const descriptionValue = await loadTagValue(fd, "ImageDescription", signal);
  return {
    width,
    height,
    samplesPerPixel,
    photometric,
    dtype,
    compression,
    description: typeof descriptionValue === "string" ? descriptionValue : void 0,
    decodedBytes,
    nextIfdOffset: fd.nextIFDByteOffset
  };
}
async function loadTagValue(fd, tag, signal) {
  signal?.throwIfAborted();
  const value = await fd.loadValue(tag);
  signal?.throwIfAborted();
  return value;
}
function qualifyDtype(sampleFormat, bitsPerSample) {
  if (sampleFormat === 1 && bitsPerSample === 8) return "uint8";
  if (sampleFormat === 1 && bitsPerSample === 16) return "uint16";
  if (sampleFormat === 3 && bitsPerSample === 32) return "float32";
  throw new QualificationFailure(
    "unsupported_dtype",
    `TIFF SampleFormat ${sampleFormat} with ${bitsPerSample}-bit pixels is not supported.`
  );
}
function qualifyPlainShape(pages, first) {
  if (pages.length !== 1) {
    throw new QualificationFailure(
      "ambiguous_axes",
      "Plain multipage TIFF axes are ambiguous. Use an OME-TIFF instead."
    );
  }
  const isPackedRgb = first.samplesPerPixel === 3 && first.photometric === 2;
  return isPackedRgb ? {
    storageAxes: "yxs",
    normalizedAxes: "cyx",
    shape: { t: 1, c: 3, z: 1, y: first.height, x: first.width }
  } : {
    storageAxes: "yx",
    normalizedAxes: "yx",
    shape: { t: 1, c: 1, z: 1, y: first.height, x: first.width }
  };
}
function qualifyImageJShape(description, pages, first) {
  if (description.length > MAX_IMAGEJ_DESCRIPTION_CHARS) {
    throw new QualificationFailure(
      "resource_limit",
      "ImageJ metadata is larger than the supported inspection limit."
    );
  }
  if (first.samplesPerPixel !== 1) {
    throw new QualificationFailure(
      "unsupported_layout",
      "ImageJ hyperstacks require one grayscale sample per image plane."
    );
  }
  const dimensions = /* @__PURE__ */ new Map();
  const dimensionKeys = /* @__PURE__ */ new Set(["images", "channels", "slices", "frames"]);
  for (const line of description.split(/\r?\n/).slice(1)) {
    const separator = line.indexOf("=");
    if (separator < 0) continue;
    const key = line.slice(0, separator);
    if (!dimensionKeys.has(key)) continue;
    if (dimensions.has(key)) {
      throw new QualificationFailure(
        "ambiguous_axes",
        `ImageJ metadata repeats ${key}.`
      );
    }
    dimensions.set(key, line.slice(separator + 1));
  }
  const images = parsePositiveImageJDimension(
    dimensions.get("images"),
    "images"
  );
  const channels = parsePositiveImageJDimension(
    dimensions.get("channels") ?? "1",
    "channels"
  );
  const slices = parsePositiveImageJDimension(
    dimensions.get("slices") ?? "1",
    "slices"
  );
  const frames = parsePositiveImageJDimension(
    dimensions.get("frames") ?? "1",
    "frames"
  );
  if (images !== pages.length || channels * slices * frames !== pages.length) {
    throw new QualificationFailure(
      "ambiguous_axes",
      "ImageJ dimensions do not match the TIFF pages."
    );
  }
  if (channels > MAX_TIFF_CHANNEL_COUNT) {
    throw new QualificationFailure(
      "resource_limit",
      `ImageJ TIFFs with more than ${MAX_TIFF_CHANNEL_COUNT} channels are not supported.`
    );
  }
  const shape = {
    t: frames,
    c: channels,
    z: slices,
    y: first.height,
    x: first.width
  };
  return {
    dimensionOrder: "XYCZT",
    storageAxes: storageAxes("XYCZT", shape),
    normalizedAxes: normalizedAxes(shape),
    shape
  };
}
function qualifyOmeShape(inspection, pages, first, relativePath) {
  if (!inspection) {
    throw new QualificationFailure(
      "invalid_tiff",
      "The embedded OME metadata is invalid."
    );
  }
  if (first.samplesPerPixel !== 1) {
    throw new QualificationFailure(
      "unsupported_layout",
      "OME-TIFF upload requires one sample per image plane."
    );
  }
  if (inspection.hasBinaryOnly) {
    throw new QualificationFailure(
      "external_companion",
      "Externally linked OME-TIFF companions are not supported."
    );
  }
  if (inspection.imageCount !== 1) {
    throw new QualificationFailure(
      "multiple_series",
      "OME-TIFF upload requires exactly one Image."
    );
  }
  if (inspection.pixelsCount !== 1) {
    throw new QualificationFailure(
      "unsupported_layout",
      "The OME Image must contain exactly one Pixels element."
    );
  }
  const declared = inspection.pixelAttributes;
  const sizeX = parsePositiveOmeAttribute(declared.sizeX, "SizeX");
  const sizeY = parsePositiveOmeAttribute(declared.sizeY, "SizeY");
  const sizeZ = parsePositiveOmeAttribute(declared.sizeZ, "SizeZ");
  const sizeC = parsePositiveOmeAttribute(declared.sizeC, "SizeC");
  const sizeT = parsePositiveOmeAttribute(declared.sizeT, "SizeT");
  const dimensionOrder = declared.dimensionOrder;
  if (!OME_DIMENSION_ORDERS.has(dimensionOrder)) {
    throw new QualificationFailure(
      "ambiguous_axes",
      "The OME-TIFF dimension order is missing or unsupported."
    );
  }
  if (sizeX !== first.width || sizeY !== first.height || sizeZ * sizeC * sizeT !== pages.length) {
    throw new QualificationFailure(
      "ambiguous_axes",
      "The OME dimensions do not match the TIFF pages."
    );
  }
  if (sizeC > MAX_TIFF_CHANNEL_COUNT) {
    throw new QualificationFailure(
      "resource_limit",
      `OME-TIFFs with more than ${MAX_TIFF_CHANNEL_COUNT} channels are not supported.`
    );
  }
  const expectedOmeType = first.dtype === "float32" ? "float" : first.dtype;
  if (declared.pixelType !== expectedOmeType) {
    throw new QualificationFailure(
      "unsupported_dtype",
      "The OME pixel type does not match the TIFF pixel data."
    );
  }
  qualifyTiffDataMapping(inspection, pages.length, relativePath);
  const shape = {
    t: sizeT,
    c: sizeC,
    z: sizeZ,
    y: sizeY,
    x: sizeX
  };
  return {
    dimensionOrder,
    storageAxes: storageAxes(dimensionOrder, shape),
    normalizedAxes: normalizedAxes(shape),
    shape
  };
}
function qualifyTiffDataMapping(inspection, pageCount, relativePath) {
  if (inspection.tiffData.length !== 1) {
    throw new QualificationFailure(
      "ambiguous_axes",
      "OME-TIFF upload requires one sequential TiffData mapping."
    );
  }
  const mapping = inspection.tiffData[0];
  if (mapping.hasUnsupportedChild) {
    throw new QualificationFailure(
      "external_companion",
      "The OME TiffData mapping contains an unsupported source reference."
    );
  }
  const ifd = parseUnsignedAttribute(mapping.ifd, 0);
  const firstZ = parseUnsignedAttribute(mapping.firstZ, 0);
  const firstC = parseUnsignedAttribute(mapping.firstC, 0);
  const firstT = parseUnsignedAttribute(mapping.firstT, 0);
  const planeCount = parseUnsignedAttribute(mapping.planeCount, 1);
  if (ifd !== 0 || firstZ !== 0 || firstC !== 0 || firstT !== 0 || planeCount !== pageCount) {
    throw new QualificationFailure(
      "ambiguous_axes",
      "The OME TiffData mapping is not a single sequential series."
    );
  }
  if (mapping.uuidReferences.length > 1) {
    throw new QualificationFailure(
      "external_companion",
      "The OME TiffData mapping does not prove one source file."
    );
  }
  const reference = mapping.uuidReferences[0];
  if (!reference) return;
  const sourceName = basename(relativePath).toLowerCase();
  const filenameMatches = !reference.fileName || basename(reference.fileName).toLowerCase() === sourceName;
  if (!inspection.rootUuid || !reference.value || reference.value !== inspection.rootUuid || !filenameMatches) {
    throw new QualificationFailure(
      "external_companion",
      "The OME UUID reference does not prove this source file."
    );
  }
}
function resolvePlacements(candidates) {
  if (candidates.some((candidate) => candidate.explicitPlacement !== void 0)) {
    const occupied2 = /* @__PURE__ */ new Set();
    const placements2 = [];
    for (const candidate of candidates) {
      const placement = candidate.explicitPlacement;
      if (!placement || ![placement.wellRow, placement.wellColumn, placement.fieldIndex].every(
        (value) => Number.isSafeInteger(value) && value !== null && value >= 0 && value <= 2147483647
      ))
        return blocked(
          "unsupported_layout",
          "Explicit placement must cover every TIFF with nonnegative coordinates and field indices.",
          candidate.relativePath
        );
      const key = `${placement.wellRow}:${placement.wellColumn}:${placement.fieldIndex}`;
      if (occupied2.has(key))
        return blocked(
          "unsupported_layout",
          "Two TIFFs map to the same well and site.",
          candidate.relativePath
        );
      occupied2.add(key);
      placements2.push({ ...placement });
    }
    return placements2;
  }
  const detected = candidates.map((candidate) => ({
    well: detectWellFromFilename(candidate.relativePath),
    fieldIndex: detectSiteFromFilename(candidate.relativePath, {
      allowFieldToken: true
    })
  }));
  if (detected.every(({ well, fieldIndex }) => !well && fieldIndex === void 0)) {
    return candidates.map((_, fieldIndex) => ({
      wellRow: null,
      wellColumn: null,
      fieldIndex
    }));
  }
  if (candidates.length === 1) {
    const [{ well, fieldIndex }] = detected;
    return [
      {
        wellRow: well?.row ?? 0,
        wellColumn: well?.column ?? 0,
        fieldIndex: fieldIndex ?? 0
      }
    ];
  }
  const placements = [];
  const occupied = /* @__PURE__ */ new Set();
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const { well, fieldIndex } = detected[index];
    if (!well || fieldIndex === void 0) {
      return blocked(
        "unsupported_layout",
        "Multiple TIFFs need an unambiguous well and site in every filename.",
        candidate.relativePath
      );
    }
    const key = `${well.row}:${well.column}:${fieldIndex}`;
    if (occupied.has(key)) {
      return blocked(
        "unsupported_layout",
        "Two TIFFs map to the same well and site.",
        candidate.relativePath
      );
    }
    occupied.add(key);
    placements.push({
      wellRow: well.row,
      wellColumn: well.column,
      fieldIndex
    });
  }
  return placements;
}
function storageAxes(dimensionOrder, shape) {
  const sizes = { t: shape.t, c: shape.c, z: shape.z };
  const nonSpatial = dimensionOrder.slice(2).toLowerCase().split("").reverse().filter((axis) => sizes[axis] > 1).join("");
  return `${nonSpatial}yx`;
}
function normalizedAxes(shape) {
  return `${shape.t > 1 ? "t" : ""}${shape.c > 1 ? "c" : ""}${shape.z > 1 ? "z" : ""}yx`;
}
function scalarNumber(value, fallback) {
  if (typeof value === "number") return value;
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const array2 = value;
    const first = array2.length > 0 ? array2[0] : void 0;
    return typeof first === "number" ? first : fallback;
  }
  if (Array.isArray(value) && typeof value[0] === "number") return value[0];
  return fallback;
}
function parseUnsignedAttribute(value, fallback) {
  if (value === void 0) return fallback;
  if (!/^\d+$/.test(value)) {
    throw new QualificationFailure(
      "ambiguous_axes",
      "The OME TiffData mapping contains an invalid index."
    );
  }
  return Number(value);
}
function parsePositiveOmeAttribute(value, name) {
  if (value === void 0 || !/^\d+$/.test(value)) {
    throw new QualificationFailure(
      "ambiguous_axes",
      `OME ${name} must be a positive integer.`
    );
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new QualificationFailure(
      "ambiguous_axes",
      `OME ${name} must be a positive safe integer.`
    );
  }
  return parsed;
}
function parsePositiveImageJDimension(value, name) {
  if (value === void 0 || !/^[1-9]\d*$/.test(value)) {
    throw new QualificationFailure(
      "ambiguous_axes",
      `ImageJ ${name} must be a positive integer.`
    );
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new QualificationFailure(
      "ambiguous_axes",
      `ImageJ ${name} must be a positive safe integer.`
    );
  }
  return parsed;
}
function normalizeRelativePath(path2) {
  return path2.replaceAll("\\", "/").replace(/^\.\//, "");
}
function basename(path2) {
  const normalized = path2.replaceAll("\\", "/");
  return normalized.split("/").at(-1) ?? normalized;
}
function isTiffPath(path2) {
  return /\.(?:tiff?|tf2|tf8|btf)$/i.test(path2);
}
function compareStrings$1(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function blocked(code, message, relativePath) {
  return {
    adapterKey: TIFF_UPLOAD_ADAPTER_KEY,
    adapterVersion: TIFF_UPLOAD_ADAPTER_VERSION,
    status: "blocked",
    code,
    message,
    relativePath
  };
}
function route(code, message, relativePath) {
  return {
    adapterKey: TIFF_UPLOAD_ADAPTER_KEY,
    adapterVersion: TIFF_UPLOAD_ADAPTER_VERSION,
    status: "route_to_uploader",
    code,
    message,
    relativePath
  };
}
function limitFailure(profile, routeCode, message, relativePath) {
  return profile.oversizeDisposition === "route_to_uploader" ? route(routeCode, message, relativePath) : blocked("resource_limit", message, relativePath);
}
class QualificationFailure extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
class RouteToUploaderFailure extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
class SelectionMetadataBudget {
  constructor(profile) {
    this.profile = profile;
    this.fetchedBytes = 0;
  }
  consume(bytes) {
    const next3 = this.fetchedBytes + bytes;
    if (!Number.isSafeInteger(bytes) || bytes < 0 || !Number.isSafeInteger(next3) || next3 > this.profile.maxSelectionMetadataBytes) {
      if (this.profile.oversizeDisposition === "route_to_uploader") {
        throw new RouteToUploaderFailure(
          "selection_too_large",
          "This selection needs too much metadata inspection for Small upload. Use Carnation Data Upload."
        );
      }
      throw new QualificationFailure(
        "resource_limit",
        "The TIFF metadata exceeds the Uploader inspection limit."
      );
    }
    this.fetchedBytes = next3;
  }
}
function uncurryThis(target) {
  return (thisArg, ...args) => {
    return ReflectApply(target, thisArg, args);
  };
}
function uncurryThisGetter(target, key) {
  return uncurryThis(
    ReflectGetOwnPropertyDescriptor(
      target,
      key
    ).get
  );
}
const {
  apply: ReflectApply,
  getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
  getPrototypeOf: ReflectGetPrototypeOf,
  ownKeys: ReflectOwnKeys
} = Reflect;
const {
  iterator: SymbolIterator,
  toStringTag: SymbolToStringTag
} = Symbol;
const NativeObject = Object;
const {
  create: ObjectCreate,
  defineProperty: ObjectDefineProperty
} = NativeObject;
const NativeArray = Array;
const ArrayPrototype = NativeArray.prototype;
const NativeArrayPrototypeSymbolIterator = ArrayPrototype[SymbolIterator];
const ArrayPrototypeSymbolIterator = uncurryThis(NativeArrayPrototypeSymbolIterator);
const NativeArrayBuffer = ArrayBuffer;
const ArrayBufferPrototype = NativeArrayBuffer.prototype;
uncurryThisGetter(ArrayBufferPrototype, "byteLength");
const NativeSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : null;
NativeSharedArrayBuffer && uncurryThisGetter(NativeSharedArrayBuffer.prototype, "byteLength");
const TypedArray = ReflectGetPrototypeOf(Uint8Array);
TypedArray.from;
const TypedArrayPrototype = TypedArray.prototype;
TypedArrayPrototype[SymbolIterator];
uncurryThis(TypedArrayPrototype.keys);
uncurryThis(
  TypedArrayPrototype.values
);
uncurryThis(
  TypedArrayPrototype.entries
);
uncurryThis(TypedArrayPrototype.set);
uncurryThis(
  TypedArrayPrototype.reverse
);
uncurryThis(TypedArrayPrototype.fill);
uncurryThis(
  TypedArrayPrototype.copyWithin
);
uncurryThis(TypedArrayPrototype.sort);
uncurryThis(TypedArrayPrototype.slice);
uncurryThis(
  TypedArrayPrototype.subarray
);
uncurryThisGetter(
  TypedArrayPrototype,
  "buffer"
);
uncurryThisGetter(
  TypedArrayPrototype,
  "byteOffset"
);
uncurryThisGetter(
  TypedArrayPrototype,
  "length"
);
uncurryThisGetter(
  TypedArrayPrototype,
  SymbolToStringTag
);
const NativeUint8Array = Uint8Array;
const NativeUint16Array = Uint16Array;
const NativeUint32Array = Uint32Array;
const NativeFloat32Array = Float32Array;
const ArrayIteratorPrototype = ReflectGetPrototypeOf([][SymbolIterator]());
const ArrayIteratorPrototypeNext = uncurryThis(ArrayIteratorPrototype.next);
const GeneratorPrototypeNext = uncurryThis((function* () {
})().next);
const IteratorPrototype = ReflectGetPrototypeOf(ArrayIteratorPrototype);
const DataViewPrototype = DataView.prototype;
const DataViewPrototypeGetUint16 = uncurryThis(
  DataViewPrototype.getUint16
);
const NativeWeakMap = WeakMap;
const WeakMapPrototype = NativeWeakMap.prototype;
const WeakMapPrototypeGet = uncurryThis(WeakMapPrototype.get);
const WeakMapPrototypeSet = uncurryThis(WeakMapPrototype.set);
const arrayIterators = new NativeWeakMap();
const SafeIteratorPrototype = ObjectCreate(null, {
  next: {
    value: function next() {
      const arrayIterator = WeakMapPrototypeGet(arrayIterators, this);
      return ArrayIteratorPrototypeNext(arrayIterator);
    }
  },
  [SymbolIterator]: {
    value: function values() {
      return this;
    }
  }
});
function safeIfNeeded(array2) {
  if (array2[SymbolIterator] === NativeArrayPrototypeSymbolIterator && ArrayIteratorPrototype.next === ArrayIteratorPrototypeNext) {
    return array2;
  }
  const safe = ObjectCreate(SafeIteratorPrototype);
  WeakMapPrototypeSet(arrayIterators, safe, ArrayPrototypeSymbolIterator(array2));
  return safe;
}
const generators = new NativeWeakMap();
const DummyArrayIteratorPrototype = ObjectCreate(IteratorPrototype, {
  next: {
    value: function next2() {
      const generator = WeakMapPrototypeGet(generators, this);
      return GeneratorPrototypeNext(generator);
    },
    writable: true,
    configurable: true
  }
});
for (const key of ReflectOwnKeys(ArrayIteratorPrototype)) {
  if (key === "next") {
    continue;
  }
  ObjectDefineProperty(DummyArrayIteratorPrototype, key, ReflectGetOwnPropertyDescriptor(ArrayIteratorPrototype, key));
}
const buffer = new NativeArrayBuffer(4);
const floatView = new NativeFloat32Array(buffer);
const uint32View = new NativeUint32Array(buffer);
const baseTable = new NativeUint16Array(512);
const shiftTable = new NativeUint8Array(512);
for (let i = 0; i < 256; ++i) {
  const e = i - 127;
  if (e < -24) {
    baseTable[i] = 0;
    baseTable[i | 256] = 32768;
    shiftTable[i] = 24;
    shiftTable[i | 256] = 24;
  } else if (e < -14) {
    baseTable[i] = 1024 >> -e - 14;
    baseTable[i | 256] = 1024 >> -e - 14 | 32768;
    shiftTable[i] = -e - 1;
    shiftTable[i | 256] = -e - 1;
  } else if (e <= 15) {
    baseTable[i] = e + 15 << 10;
    baseTable[i | 256] = e + 15 << 10 | 32768;
    shiftTable[i] = 13;
    shiftTable[i | 256] = 13;
  } else if (e < 128) {
    baseTable[i] = 31744;
    baseTable[i | 256] = 64512;
    shiftTable[i] = 24;
    shiftTable[i | 256] = 24;
  } else {
    baseTable[i] = 31744;
    baseTable[i | 256] = 64512;
    shiftTable[i] = 13;
    shiftTable[i | 256] = 13;
  }
}
const mantissaTable = new NativeUint32Array(2048);
for (let i = 1; i < 1024; ++i) {
  let m = i << 13;
  let e = 0;
  while ((m & 8388608) === 0) {
    m <<= 1;
    e -= 8388608;
  }
  m &= -8388609;
  e += 947912704;
  mantissaTable[i] = m | e;
}
for (let i = 1024; i < 2048; ++i) {
  mantissaTable[i] = 939524096 + (i - 1024 << 13);
}
const exponentTable = new NativeUint32Array(64);
for (let i = 1; i < 31; ++i) {
  exponentTable[i] = i << 23;
}
exponentTable[31] = 1199570944;
exponentTable[32] = 2147483648;
for (let i = 33; i < 63; ++i) {
  exponentTable[i] = 2147483648 + (i - 32 << 23);
}
exponentTable[63] = 3347054592;
const offsetTable = new NativeUint16Array(64);
for (let i = 1; i < 64; ++i) {
  if (i !== 32) {
    offsetTable[i] = 1024;
  }
}
function convertToNumber(float16bits) {
  const i = float16bits >> 10;
  uint32View[0] = mantissaTable[offsetTable[i] + (float16bits & 1023)] + exponentTable[i];
  return floatView[0];
}
function getFloat16(dataView, byteOffset, ...opts) {
  return convertToNumber(
    DataViewPrototypeGetUint16(dataView, byteOffset, ...safeIfNeeded(opts))
  );
}
function getAttribute(tag, attributeName, options) {
  const xml = typeof tag === "object" ? tag.outer : tag;
  const opening = xml.slice(0, xml.indexOf(">") + 1);
  const quotechars = ['"', "'"];
  for (let i = 0; i < quotechars.length; i++) {
    const char = quotechars[i];
    const pattern = attributeName + "\\=" + char + "([^" + char + "]*)" + char;
    const re = new RegExp(pattern);
    const match = re.exec(opening);
    if (match) return match[1];
  }
}
function indexOfMatch(xml, pattern, startIndex) {
  const re = new RegExp(pattern);
  const match = re.exec(xml.slice(startIndex));
  if (match) return startIndex + match.index;
  else return -1;
}
function indexOfMatchEnd(xml, pattern, startIndex) {
  const re = new RegExp(pattern);
  const match = re.exec(xml.slice(startIndex));
  if (match) return startIndex + match.index + match[0].length - 1;
  else return -1;
}
function countSubstring(string2, substring) {
  const pattern = new RegExp(substring, "g");
  const match = string2.match(pattern);
  return match ? match.length : 0;
}
function findTagByName(xml, tagName, options) {
  const debug = options && options.debug || false;
  const nested = !(options && typeof options.nested === false);
  const startIndex = options && options.startIndex || 0;
  if (debug) console.log("[xml-utils] starting findTagByName with", tagName, " and ", options);
  const start = indexOfMatch(xml, `<${tagName}[ 
>/]`, startIndex);
  if (debug) console.log("[xml-utils] start:", start);
  if (start === -1) return void 0;
  const afterStart = xml.slice(start + tagName.length);
  let relativeEnd = indexOfMatchEnd(afterStart, "^[^<]*[ /]>", 0);
  const selfClosing = relativeEnd !== -1 && afterStart[relativeEnd - 1] === "/";
  if (debug) console.log("[xml-utils] selfClosing:", selfClosing);
  if (selfClosing === false) {
    if (nested) {
      let startIndex2 = 0;
      let openings = 1;
      let closings = 0;
      while ((relativeEnd = indexOfMatchEnd(afterStart, "[ /]" + tagName + ">", startIndex2)) !== -1) {
        const clip = afterStart.substring(startIndex2, relativeEnd + 1);
        openings += countSubstring(clip, "<" + tagName + "[ \n	>]");
        closings += countSubstring(clip, "</" + tagName + ">");
        if (closings >= openings) break;
        startIndex2 = relativeEnd;
      }
    } else {
      relativeEnd = indexOfMatchEnd(afterStart, "[ /]" + tagName + ">", 0);
    }
  }
  const end = start + tagName.length + relativeEnd + 1;
  if (debug) console.log("[xml-utils] end:", end);
  if (end === -1) return void 0;
  const outer = xml.slice(start, end);
  let inner;
  if (selfClosing) {
    inner = null;
  } else {
    inner = outer.slice(outer.indexOf(">") + 1, outer.lastIndexOf("<"));
  }
  return { inner, outer, start, end };
}
function findTagsByName(xml, tagName, options) {
  const tags2 = [];
  const debug = false;
  let startIndex = 0;
  let tag;
  while (tag = findTagByName(xml, tagName, { debug, startIndex })) {
    {
      startIndex = tag.start + 1 + tagName.length;
    }
    tags2.push(tag);
  }
  return tags2;
}
const fieldTypes = Object.freeze({
  BYTE: 1,
  ASCII: 2,
  SHORT: 3,
  LONG: 4,
  RATIONAL: 5,
  SBYTE: 6,
  UNDEFINED: 7,
  SSHORT: 8,
  SLONG: 9,
  SRATIONAL: 10,
  FLOAT: 11,
  DOUBLE: 12,
  // IFD offset, suggested by https://owl.phy.queensu.ca/~phil/exiftool/standards.html
  IFD: 13,
  // introduced by BigTIFF
  LONG8: 16,
  SLONG8: 17,
  IFD8: 18
});
const fieldTypeSizes = Object.freeze({
  [fieldTypes.BYTE]: 1,
  [fieldTypes.ASCII]: 1,
  [fieldTypes.SBYTE]: 1,
  [fieldTypes.UNDEFINED]: 1,
  [fieldTypes.SHORT]: 2,
  [fieldTypes.SSHORT]: 2,
  [fieldTypes.LONG]: 4,
  [fieldTypes.SLONG]: 4,
  [fieldTypes.FLOAT]: 4,
  [fieldTypes.IFD]: 4,
  [fieldTypes.RATIONAL]: 8,
  [fieldTypes.SRATIONAL]: 8,
  [fieldTypes.DOUBLE]: 8,
  [fieldTypes.LONG8]: 8,
  [fieldTypes.SLONG8]: 8,
  [fieldTypes.IFD8]: 8
});
function getFieldTypeSize(fieldType) {
  const size = fieldTypeSizes[fieldType];
  if (size === void 0) {
    throw new RangeError(`Invalid field type: ${fieldType}`);
  }
  return size;
}
const tagSource = [
  { tag: 254, name: "NewSubfileType", fieldTypes: fieldTypes.LONG },
  { tag: 255, name: "SubfileType", type: fieldTypes.SHORT },
  { tag: 256, name: "ImageWidth", type: fieldTypes.SHORT },
  { tag: 257, name: "ImageLength", type: fieldTypes.SHORT },
  {
    tag: 258,
    name: "BitsPerSample",
    type: fieldTypes.SHORT,
    isArray: true,
    eager: true
  },
  { tag: 259, name: "Compression", type: fieldTypes.SHORT },
  { tag: 262, name: "PhotometricInterpretation", type: fieldTypes.SHORT },
  { tag: 263, name: "Threshholding", type: fieldTypes.SHORT },
  { tag: 264, name: "CellWidth", type: fieldTypes.SHORT },
  { tag: 265, name: "CellLength", type: fieldTypes.SHORT },
  { tag: 266, name: "FillOrder", type: fieldTypes.SHORT },
  { tag: 269, name: "DocumentName", type: fieldTypes.ASCII },
  { tag: 270, name: "ImageDescription", type: fieldTypes.ASCII },
  { tag: 271, name: "Make", type: fieldTypes.ASCII },
  { tag: 272, name: "Model", type: fieldTypes.ASCII },
  { tag: 273, name: "StripOffsets", type: fieldTypes.SHORT, isArray: true },
  { tag: 274, name: "Orientation", type: fieldTypes.SHORT },
  { tag: 277, name: "SamplesPerPixel", type: fieldTypes.SHORT },
  { tag: 278, name: "RowsPerStrip", type: fieldTypes.SHORT },
  { tag: 279, name: "StripByteCounts", type: fieldTypes.LONG, isArray: true },
  { tag: 280, name: "MinSampleValue", type: fieldTypes.SHORT, isArray: true },
  { tag: 281, name: "MaxSampleValue", type: fieldTypes.SHORT, isArray: true },
  { tag: 282, name: "XResolution", type: fieldTypes.RATIONAL },
  { tag: 283, name: "YResolution", type: fieldTypes.RATIONAL },
  { tag: 284, name: "PlanarConfiguration", fieldTypes: fieldTypes.SHORT },
  { tag: 285, name: "PageName", type: fieldTypes.ASCII },
  { tag: 286, name: "XPosition", type: fieldTypes.RATIONAL },
  { tag: 287, name: "YPosition", type: fieldTypes.RATIONAL },
  { tag: 288, name: "FreeOffsets", type: fieldTypes.LONG },
  { tag: 289, name: "FreeByteCounts", type: fieldTypes.LONG },
  { tag: 290, name: "GrayResponseUnit", type: fieldTypes.SHORT },
  {
    tag: 291,
    name: "GrayResponseCurve",
    type: fieldTypes.SHORT,
    isArray: true
  },
  { tag: 292, name: "T4Options", type: fieldTypes.LONG },
  { tag: 293, name: "T6Options", type: fieldTypes.LONG },
  { tag: 296, name: "ResolutionUnit", type: fieldTypes.SHORT },
  { tag: 297, name: "PageNumber", type: fieldTypes.SHORT, isArray: true },
  { tag: 301, name: "TransferFunction", type: fieldTypes.SHORT, isArray: true },
  { tag: 305, name: "Software", type: fieldTypes.ASCII },
  { tag: 306, name: "DateTime", type: fieldTypes.ASCII },
  { tag: 315, name: "Artist", type: fieldTypes.ASCII },
  { tag: 316, name: "HostComputer", type: fieldTypes.ASCII },
  { tag: 317, name: "Predictor", type: fieldTypes.SHORT },
  { tag: 318, name: "WhitePoint", type: fieldTypes.RATIONAL, isArray: true },
  {
    tag: 319,
    name: "PrimaryChromaticities",
    type: fieldTypes.RATIONAL,
    isArray: true
  },
  { tag: 320, name: "ColorMap", type: fieldTypes.SHORT, isArray: true },
  { tag: 321, name: "HalftoneHints", type: fieldTypes.SHORT, isArray: true },
  { tag: 322, name: "TileWidth", type: fieldTypes.SHORT },
  { tag: 323, name: "TileLength", type: fieldTypes.SHORT },
  { tag: 324, name: "TileOffsets", type: fieldTypes.LONG, isArray: true },
  { tag: 325, name: "TileByteCounts", type: fieldTypes.SHORT, isArray: true },
  { tag: 332, name: "InkSet", type: fieldTypes.SHORT },
  { tag: 333, name: "InkNames", type: fieldTypes.ASCII },
  { tag: 334, name: "NumberOfInks", type: fieldTypes.SHORT },
  { tag: 336, name: "DotRange", type: fieldTypes.BYTE, isArray: true },
  { tag: 337, name: "TargetPrinter", type: fieldTypes.ASCII },
  { tag: 338, name: "ExtraSamples", type: fieldTypes.BYTE, isArray: true },
  {
    tag: 339,
    name: "SampleFormat",
    type: fieldTypes.SHORT,
    isArray: true,
    eager: true
  },
  { tag: 340, name: "SMinSampleValue", isArray: true },
  { tag: 341, name: "SMaxSampleValue", isArray: true },
  { tag: 342, name: "TransferRange", type: fieldTypes.SHORT, isArray: true },
  { tag: 512, name: "JPEGProc", type: fieldTypes.SHORT },
  { tag: 513, name: "JPEGInterchangeFormat", type: fieldTypes.LONG },
  { tag: 514, name: "JPEGInterchangeFormatLngth", type: fieldTypes.LONG },
  { tag: 515, name: "JPEGRestartInterval", type: fieldTypes.SHORT },
  {
    tag: 517,
    name: "JPEGLosslessPredictors",
    type: fieldTypes.SHORT,
    isArray: true
  },
  {
    tag: 518,
    name: "JPEGPointTransforms",
    type: fieldTypes.SHORT,
    isArray: true
  },
  { tag: 519, name: "JPEGQTables", type: fieldTypes.LONG, isArray: true },
  { tag: 520, name: "JPEGDCTables", type: fieldTypes.LONG, isArray: true },
  { tag: 521, name: "JPEGACTables", type: fieldTypes.LONG, isArray: true },
  {
    tag: 529,
    name: "YCbCrCoefficients",
    type: fieldTypes.RATIONAL,
    isArray: true
  },
  { tag: 530, name: "YCbCrSubSampling", type: fieldTypes.SHORT, isArray: true },
  { tag: 531, name: "YCbCrPositioning", type: fieldTypes.SHORT },
  {
    tag: 532,
    name: "ReferenceBlackWhite",
    type: fieldTypes.LONG,
    isArray: true
  },
  { tag: 33432, name: "Copyright", type: fieldTypes.ASCII },
  // TIFF Extended
  { tag: 326, name: "BadFaxLines" },
  { tag: 327, name: "CleanFaxData" },
  { tag: 343, name: "ClipPath" },
  { tag: 328, name: "ConsecutiveBadFaxLines" },
  { tag: 433, name: "Decode" },
  { tag: 434, name: "DefaultImageColor" },
  { tag: 346, name: "Indexed" },
  { tag: 347, name: "JPEGTables", isArray: true, eager: true },
  { tag: 559, name: "StripRowCounts", isArray: true },
  { tag: 330, name: "SubIFDs", isArray: true },
  { tag: 344, name: "XClipPathUnits" },
  { tag: 345, name: "YClipPathUnits" },
  // EXIF
  { tag: 37378, name: "ApertureValue" },
  { tag: 40961, name: "ColorSpace" },
  { tag: 36868, name: "DateTimeDigitized" },
  { tag: 36867, name: "DateTimeOriginal" },
  { tag: 34665, name: "Exif IFD", type: fieldTypes.LONG },
  { tag: 36864, name: "ExifVersion" },
  { tag: 33434, name: "ExposureTime" },
  { tag: 41728, name: "FileSource" },
  { tag: 37385, name: "Flash" },
  { tag: 40960, name: "FlashpixVersion" },
  { tag: 33437, name: "FNumber" },
  { tag: 42016, name: "ImageUniqueID" },
  { tag: 37384, name: "LightSource" },
  { tag: 37500, name: "MakerNote" },
  { tag: 37377, name: "ShutterSpeedValue" },
  { tag: 37510, name: "UserComment" },
  // IPTC
  { tag: 33723, name: "IPTC" },
  // Laser Scanning Microscopy
  { tag: 34412, name: "CZ_LSMINFO" },
  // ICC
  { tag: 34675, name: "ICC Profile" },
  // XMP
  { tag: 700, name: "XMP" },
  // GDAL
  { tag: 42112, name: "GDAL_METADATA" },
  { tag: 42113, name: "GDAL_NODATA", type: fieldTypes.ASCII },
  // Photoshop
  { tag: 34377, name: "Photoshop" },
  // GeoTiff
  {
    tag: 33550,
    name: "ModelPixelScale",
    type: fieldTypes.DOUBLE,
    isArray: true,
    eager: true
  },
  {
    tag: 33922,
    name: "ModelTiepoint",
    type: fieldTypes.DOUBLE,
    isArray: true,
    eager: true
  },
  {
    tag: 34264,
    name: "ModelTransformation",
    type: fieldTypes.DOUBLE,
    isArray: true,
    eager: true
  },
  {
    tag: 34735,
    name: "GeoKeyDirectory",
    type: fieldTypes.SHORT,
    isArray: true,
    eager: true
  },
  {
    tag: 34736,
    name: "GeoDoubleParams",
    type: fieldTypes.DOUBLE,
    isArray: true,
    eager: true
  },
  { tag: 34737, name: "GeoAsciiParams", type: fieldTypes.ASCII, eager: true },
  // LERC
  { tag: 50674, name: "LercParameters", eager: true }
];
const tags = {};
const tagDefinitions = {};
function registerTag(tag, name, type, isArray = false, eager = false) {
  tags[name] = tag;
  tagDefinitions[tag] = { tag, name, type: typeof type === "string" ? fieldTypes[type] : type, isArray, eager };
}
for (const entry of tagSource) {
  registerTag(entry.tag, entry.name, entry.type, entry.isArray, entry.eager);
}
function resolveTag(tagIdentifier) {
  if (typeof tagIdentifier === "number") {
    return tagIdentifier;
  }
  return tags[tagIdentifier];
}
const photometricInterpretations = {
  WhiteIsZero: 0,
  BlackIsZero: 1,
  RGB: 2,
  Palette: 3,
  CMYK: 5,
  YCbCr: 6,
  CIELab: 8
};
const ExtraSamplesValues = {
  Unspecified: 0
};
const LercParameters = {
  AddCompression: 1
};
const LercAddCompression = {
  None: 0,
  Deflate: 1,
  Zstandard: 2
};
const geoKeyNames = Object.freeze({
  1024: "GTModelTypeGeoKey",
  1025: "GTRasterTypeGeoKey",
  1026: "GTCitationGeoKey",
  2048: "GeographicTypeGeoKey",
  2049: "GeogCitationGeoKey",
  2050: "GeogGeodeticDatumGeoKey",
  2051: "GeogPrimeMeridianGeoKey",
  2052: "GeogLinearUnitsGeoKey",
  2053: "GeogLinearUnitSizeGeoKey",
  2054: "GeogAngularUnitsGeoKey",
  2055: "GeogAngularUnitSizeGeoKey",
  2056: "GeogEllipsoidGeoKey",
  2057: "GeogSemiMajorAxisGeoKey",
  2058: "GeogSemiMinorAxisGeoKey",
  2059: "GeogInvFlatteningGeoKey",
  2060: "GeogAzimuthUnitsGeoKey",
  2061: "GeogPrimeMeridianLongGeoKey",
  2062: "GeogTOWGS84GeoKey",
  3072: "ProjectedCSTypeGeoKey",
  3073: "PCSCitationGeoKey",
  3074: "ProjectionGeoKey",
  3075: "ProjCoordTransGeoKey",
  3076: "ProjLinearUnitsGeoKey",
  3077: "ProjLinearUnitSizeGeoKey",
  3078: "ProjStdParallel1GeoKey",
  3079: "ProjStdParallel2GeoKey",
  3080: "ProjNatOriginLongGeoKey",
  3081: "ProjNatOriginLatGeoKey",
  3082: "ProjFalseEastingGeoKey",
  3083: "ProjFalseNorthingGeoKey",
  3084: "ProjFalseOriginLongGeoKey",
  3085: "ProjFalseOriginLatGeoKey",
  3086: "ProjFalseOriginEastingGeoKey",
  3087: "ProjFalseOriginNorthingGeoKey",
  3088: "ProjCenterLongGeoKey",
  3089: "ProjCenterLatGeoKey",
  3090: "ProjCenterEastingGeoKey",
  3091: "ProjCenterNorthingGeoKey",
  3092: "ProjScaleAtNatOriginGeoKey",
  3093: "ProjScaleAtCenterGeoKey",
  3094: "ProjAzimuthAngleGeoKey",
  3095: "ProjStraightVertPoleLongGeoKey",
  3096: "ProjRectifiedGridAngleGeoKey",
  4096: "VerticalCSTypeGeoKey",
  4097: "VerticalCitationGeoKey",
  4098: "VerticalDatumGeoKey",
  4099: "VerticalUnitsGeoKey"
});
const geoKeys = (
  /** @type {Record<GeoKeyName, number>} */
  {}
);
for (const key in geoKeyNames) {
  if (geoKeyNames.hasOwnProperty(key)) {
    geoKeys[geoKeyNames[key]] = parseInt(key, 10);
  }
}
function fromWhiteIsZero(raster, max) {
  const { width, height } = raster;
  const rgbRaster = new Uint8Array(width * height * 3);
  let value;
  for (let i = 0, j = 0; i < raster.length; ++i, j += 3) {
    value = 256 - raster[i] / max * 256;
    rgbRaster[j] = value;
    rgbRaster[j + 1] = value;
    rgbRaster[j + 2] = value;
  }
  return rgbRaster;
}
function fromBlackIsZero(raster, max) {
  const { width, height } = raster;
  const rgbRaster = new Uint8Array(width * height * 3);
  let value;
  for (let i = 0, j = 0; i < raster.length; ++i, j += 3) {
    value = raster[i] / max * 256;
    rgbRaster[j] = value;
    rgbRaster[j + 1] = value;
    rgbRaster[j + 2] = value;
  }
  return rgbRaster;
}
function fromPalette(raster, colorMap) {
  const { width, height } = raster;
  const rgbRaster = new Uint8Array(width * height * 3);
  const greenOffset = colorMap.length / 3;
  const blueOffset = colorMap.length / 3 * 2;
  for (let i = 0, j = 0; i < raster.length; ++i, j += 3) {
    const mapIndex = raster[i];
    rgbRaster[j] = colorMap[mapIndex] / 65536 * 256;
    rgbRaster[j + 1] = colorMap[mapIndex + greenOffset] / 65536 * 256;
    rgbRaster[j + 2] = colorMap[mapIndex + blueOffset] / 65536 * 256;
  }
  return rgbRaster;
}
function fromCMYK(cmykRaster) {
  const { width, height } = cmykRaster;
  const rgbRaster = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < cmykRaster.length; i += 4, j += 3) {
    const c = cmykRaster[i];
    const m = cmykRaster[i + 1];
    const y = cmykRaster[i + 2];
    const k = cmykRaster[i + 3];
    rgbRaster[j] = 255 * ((255 - c) / 256) * ((255 - k) / 256);
    rgbRaster[j + 1] = 255 * ((255 - m) / 256) * ((255 - k) / 256);
    rgbRaster[j + 2] = 255 * ((255 - y) / 256) * ((255 - k) / 256);
  }
  return rgbRaster;
}
function fromYCbCr(yCbCrRaster) {
  const { width, height } = yCbCrRaster;
  const rgbRaster = new Uint8ClampedArray(width * height * 3);
  for (let i = 0, j = 0; i < yCbCrRaster.length; i += 3, j += 3) {
    const y = yCbCrRaster[i];
    const cb = yCbCrRaster[i + 1];
    const cr = yCbCrRaster[i + 2];
    rgbRaster[j] = y + 1.402 * (cr - 128);
    rgbRaster[j + 1] = y - 0.34414 * (cb - 128) - 0.71414 * (cr - 128);
    rgbRaster[j + 2] = y + 1.772 * (cb - 128);
  }
  return rgbRaster;
}
const Xn = 0.95047;
const Yn = 1;
const Zn = 1.08883;
function fromCIELab(cieLabRaster) {
  const { width, height } = cieLabRaster;
  const rgbRaster = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < cieLabRaster.length; i += 3, j += 3) {
    const L = cieLabRaster[i + 0];
    const a_ = cieLabRaster[i + 1] << 24 >> 24;
    const b_ = cieLabRaster[i + 2] << 24 >> 24;
    let y = (L + 16) / 116;
    let x = a_ / 500 + y;
    let z = y - b_ / 200;
    let r;
    let g;
    let b;
    x = Xn * (x * x * x > 8856e-6 ? x * x * x : (x - 16 / 116) / 7.787);
    y = Yn * (y * y * y > 8856e-6 ? y * y * y : (y - 16 / 116) / 7.787);
    z = Zn * (z * z * z > 8856e-6 ? z * z * z : (z - 16 / 116) / 7.787);
    r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    b = x * 0.0557 + y * -0.204 + z * 1.057;
    r = r > 31308e-7 ? 1.055 * r ** (1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 31308e-7 ? 1.055 * g ** (1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 31308e-7 ? 1.055 * b ** (1 / 2.4) - 0.055 : 12.92 * b;
    rgbRaster[j] = Math.max(0, Math.min(1, r)) * 255;
    rgbRaster[j + 1] = Math.max(0, Math.min(1, g)) * 255;
    rgbRaster[j + 2] = Math.max(0, Math.min(1, b)) * 255;
  }
  return rgbRaster;
}
const registry = /* @__PURE__ */ new Map();
async function defaultDecoderParameterFn(fileDirectory) {
  const isTiled = !fileDirectory.hasTag("StripOffsets");
  return {
    tileWidth: isTiled ? await fileDirectory.loadValue("TileWidth") : await fileDirectory.loadValue("ImageWidth"),
    tileHeight: isTiled ? await fileDirectory.loadValue("TileLength") : await fileDirectory.loadValue("RowsPerStrip") || await fileDirectory.loadValue("ImageLength"),
    planarConfiguration: await fileDirectory.loadValue("PlanarConfiguration"),
    bitsPerSample: await fileDirectory.loadValue("BitsPerSample"),
    predictor: await fileDirectory.loadValue("Predictor") || 1
  };
}
function addDecoder(cases, importFn, decoderParameterFn = defaultDecoderParameterFn, preferWorker_ = true) {
  if (!Array.isArray(cases)) {
    cases = [cases];
  }
  cases.forEach((c) => {
    registry.set(c, { importFn, decoderParameterFn, preferWorker: preferWorker_ });
  });
}
async function getDecoderParameters(compression, fileDirectory) {
  if (!registry.has(compression)) {
    throw new Error(`Unknown compression method identifier: ${compression}`);
  }
  const { decoderParameterFn } = registry.get(compression);
  return decoderParameterFn(fileDirectory);
}
async function getDecoder(compression, decoderParameters) {
  if (!registry.has(compression)) {
    throw new Error(`Unknown compression method identifier: ${compression}`);
  }
  const { importFn } = registry.get(compression);
  const Decoder = await importFn();
  return new Decoder(decoderParameters);
}
const defaultDecoderDefinitions = [
  // No compression
  {
    cases: [void 0, 1],
    importFn: () => Promise.resolve().then(() => raw).then((m) => m.default),
    preferWorker: false
  },
  // LZW
  {
    cases: 5,
    importFn: () => Promise.resolve().then(() => lzw).then((m) => m.default)
  },
  // Old-style JPEG
  {
    cases: 6,
    importFn: () => {
      throw new Error("old style JPEG compression is not supported.");
    }
  },
  // JPEG
  {
    cases: 7,
    importFn: () => Promise.resolve().then(() => jpeg).then((m) => m.default),
    decoderParameterFn: async (fileDirectory) => {
      return {
        ...await defaultDecoderParameterFn(fileDirectory),
        JPEGTables: await fileDirectory.loadValue("JPEGTables")
      };
    }
  },
  // Deflate / Adobe Deflate
  {
    cases: [8, 32946],
    importFn: () => Promise.resolve().then(() => deflate).then((m) => m.default)
  },
  // PackBits
  {
    cases: 32773,
    importFn: () => Promise.resolve().then(() => packbits).then((m) => m.default)
  },
  // LERC
  {
    cases: 34887,
    importFn: () => Promise.resolve().then(() => lerc).then(async (m) => {
      await m.zstd.init();
      return m;
    }).then((m) => m.default),
    decoderParameterFn: async (fileDirectory) => {
      return {
        ...await defaultDecoderParameterFn(fileDirectory),
        LercParameters: await fileDirectory.loadValue("LercParameters")
      };
    }
  },
  // zstd
  {
    cases: 5e4,
    importFn: () => Promise.resolve().then(() => zstd$1).then(async (m) => {
      await m.zstd.init();
      return m;
    }).then((m) => m.default)
  },
  // WebP Images
  {
    cases: 50001,
    importFn: () => Promise.resolve().then(() => webimage).then((m) => m.default),
    decoderParameterFn: async (fileDirectory) => {
      return {
        ...await defaultDecoderParameterFn(fileDirectory),
        samplesPerPixel: await fileDirectory.loadValue("SamplesPerPixel") || 4
      };
    },
    preferWorker: false
  }
];
for (const decoderDefinition of defaultDecoderDefinitions) {
  const { cases, importFn, decoderParameterFn, preferWorker: preferWorker_ } = decoderDefinition;
  addDecoder(cases, importFn, decoderParameterFn, preferWorker_);
}
function copyNewSize(array2, width, height, samplesPerPixel = 1) {
  return new (Object.getPrototypeOf(array2)).constructor(width * height * samplesPerPixel);
}
function resampleNearest(valueArrays, inWidth, inHeight, outWidth, outHeight) {
  const relX = inWidth / outWidth;
  const relY = inHeight / outHeight;
  return valueArrays.map((array2) => {
    const newArray = copyNewSize(array2, outWidth, outHeight);
    for (let y = 0; y < outHeight; ++y) {
      const cy = Math.min(Math.round(relY * y), inHeight - 1);
      for (let x = 0; x < outWidth; ++x) {
        const cx = Math.min(Math.round(relX * x), inWidth - 1);
        const value = array2[cy * inWidth + cx];
        newArray[y * outWidth + x] = value;
      }
    }
    return newArray;
  });
}
function lerp(v0, v1, t) {
  return (1 - t) * v0 + t * v1;
}
function resampleBilinear(valueArrays, inWidth, inHeight, outWidth, outHeight) {
  const relX = inWidth / outWidth;
  const relY = inHeight / outHeight;
  return valueArrays.map((array2) => {
    const newArray = copyNewSize(array2, outWidth, outHeight);
    for (let y = 0; y < outHeight; ++y) {
      const rawY = relY * y;
      const yl = Math.floor(rawY);
      const yh = Math.min(Math.ceil(rawY), inHeight - 1);
      for (let x = 0; x < outWidth; ++x) {
        const rawX = relX * x;
        const tx = rawX % 1;
        const xl = Math.floor(rawX);
        const xh = Math.min(Math.ceil(rawX), inWidth - 1);
        const ll = array2[yl * inWidth + xl];
        const hl = array2[yl * inWidth + xh];
        const lh = array2[yh * inWidth + xl];
        const hh = array2[yh * inWidth + xh];
        const value = lerp(lerp(ll, hl, tx), lerp(lh, hh, tx), rawY % 1);
        newArray[y * outWidth + x] = value;
      }
    }
    return newArray;
  });
}
function resample(valueArrays, inWidth, inHeight, outWidth, outHeight, method = "nearest") {
  switch (method.toLowerCase()) {
    case "nearest":
      return resampleNearest(valueArrays, inWidth, inHeight, outWidth, outHeight);
    case "bilinear":
    case "linear":
      return resampleBilinear(valueArrays, inWidth, inHeight, outWidth, outHeight);
    default:
      throw new Error(`Unsupported resampling method: '${method}'`);
  }
}
function resampleNearestInterleaved(valueArray, inWidth, inHeight, outWidth, outHeight, samples) {
  const relX = inWidth / outWidth;
  const relY = inHeight / outHeight;
  const newArray = copyNewSize(valueArray, outWidth, outHeight, samples);
  for (let y = 0; y < outHeight; ++y) {
    const cy = Math.min(Math.round(relY * y), inHeight - 1);
    for (let x = 0; x < outWidth; ++x) {
      const cx = Math.min(Math.round(relX * x), inWidth - 1);
      for (let i = 0; i < samples; ++i) {
        const value = valueArray[cy * inWidth * samples + cx * samples + i];
        newArray[y * outWidth * samples + x * samples + i] = value;
      }
    }
  }
  return newArray;
}
function resampleBilinearInterleaved(valueArray, inWidth, inHeight, outWidth, outHeight, samples) {
  const relX = inWidth / outWidth;
  const relY = inHeight / outHeight;
  const newArray = copyNewSize(valueArray, outWidth, outHeight, samples);
  for (let y = 0; y < outHeight; ++y) {
    const rawY = relY * y;
    const yl = Math.floor(rawY);
    const yh = Math.min(Math.ceil(rawY), inHeight - 1);
    for (let x = 0; x < outWidth; ++x) {
      const rawX = relX * x;
      const tx = rawX % 1;
      const xl = Math.floor(rawX);
      const xh = Math.min(Math.ceil(rawX), inWidth - 1);
      for (let i = 0; i < samples; ++i) {
        const ll = valueArray[yl * inWidth * samples + xl * samples + i];
        const hl = valueArray[yl * inWidth * samples + xh * samples + i];
        const lh = valueArray[yh * inWidth * samples + xl * samples + i];
        const hh = valueArray[yh * inWidth * samples + xh * samples + i];
        const value = lerp(lerp(ll, hl, tx), lerp(lh, hh, tx), rawY % 1);
        newArray[y * outWidth * samples + x * samples + i] = value;
      }
    }
  }
  return newArray;
}
function resampleInterleaved(valueArray, inWidth, inHeight, outWidth, outHeight, samples, method = "nearest") {
  switch (method.toLowerCase()) {
    case "nearest":
      return resampleNearestInterleaved(valueArray, inWidth, inHeight, outWidth, outHeight, samples);
    case "bilinear":
    case "linear":
      return resampleBilinearInterleaved(valueArray, inWidth, inHeight, outWidth, outHeight, samples);
    default:
      throw new Error(`Unsupported resampling method: '${method}'`);
  }
}
function sum(array2, start, end) {
  let s = 0;
  for (let i = start; i < end; ++i) {
    s += array2[i];
  }
  return s;
}
function arrayForType(format, bitsPerSample, size) {
  switch (format) {
    case 1:
      if (bitsPerSample <= 8) {
        return new Uint8Array(size);
      } else if (bitsPerSample <= 16) {
        return new Uint16Array(size);
      } else if (bitsPerSample <= 32) {
        return new Uint32Array(size);
      }
      break;
    case 2:
      if (bitsPerSample === 8) {
        return new Int8Array(size);
      } else if (bitsPerSample === 16) {
        return new Int16Array(size);
      } else if (bitsPerSample === 32) {
        return new Int32Array(size);
      }
      break;
    case 3:
      switch (bitsPerSample) {
        case 16:
        case 32:
          return new Float32Array(size);
        case 64:
          return new Float64Array(size);
      }
      break;
  }
  throw Error("Unsupported data format/bitsPerSample");
}
function needsNormalization(format, bitsPerSample) {
  if ((format === 1 || format === 2) && bitsPerSample <= 32 && bitsPerSample % 8 === 0) {
    return false;
  } else if (format === 3 && (bitsPerSample === 16 || bitsPerSample === 32 || bitsPerSample === 64)) {
    return false;
  }
  return true;
}
function normalizeArray(inBuffer, format, planarConfiguration, samplesPerPixel, bitsPerSample, tileWidth, tileHeight) {
  const view = new DataView(inBuffer);
  const outSize = planarConfiguration === 2 ? tileHeight * tileWidth : tileHeight * tileWidth * samplesPerPixel;
  const samplesToTransfer = planarConfiguration === 2 ? 1 : samplesPerPixel;
  const outArray = arrayForType(format, bitsPerSample, outSize);
  const bitMask = parseInt("1".repeat(bitsPerSample), 2);
  if (format === 1) {
    let pixelBitSkip;
    if (planarConfiguration === 1) {
      pixelBitSkip = samplesPerPixel * bitsPerSample;
    } else {
      pixelBitSkip = bitsPerSample;
    }
    let bitsPerLine = tileWidth * pixelBitSkip;
    if ((bitsPerLine & 7) !== 0) {
      bitsPerLine = bitsPerLine + 7 & -8;
    }
    for (let y = 0; y < tileHeight; ++y) {
      const lineBitOffset = y * bitsPerLine;
      for (let x = 0; x < tileWidth; ++x) {
        const pixelBitOffset = lineBitOffset + x * samplesToTransfer * bitsPerSample;
        for (let i = 0; i < samplesToTransfer; ++i) {
          const bitOffset = pixelBitOffset + i * bitsPerSample;
          const outIndex = (y * tileWidth + x) * samplesToTransfer + i;
          const byteOffset = Math.floor(bitOffset / 8);
          const innerBitOffset = bitOffset % 8;
          if (innerBitOffset + bitsPerSample <= 8) {
            outArray[outIndex] = view.getUint8(byteOffset) >> 8 - bitsPerSample - innerBitOffset & bitMask;
          } else if (innerBitOffset + bitsPerSample <= 16) {
            outArray[outIndex] = view.getUint16(byteOffset) >> 16 - bitsPerSample - innerBitOffset & bitMask;
          } else if (innerBitOffset + bitsPerSample <= 24) {
            const raw2 = view.getUint16(byteOffset) << 8 | view.getUint8(byteOffset + 2);
            outArray[outIndex] = raw2 >> 24 - bitsPerSample - innerBitOffset & bitMask;
          } else {
            outArray[outIndex] = view.getUint32(byteOffset) >> 32 - bitsPerSample - innerBitOffset & bitMask;
          }
        }
      }
    }
  }
  return outArray.buffer;
}
class GeoTIFFImage {
  /**
   * @constructor
   * @param {import("./imagefiledirectory").ImageFileDirectory} fileDirectory The parsed file directory
   * @param {Boolean} littleEndian Whether the file is encoded in little or big endian
   * @param {Boolean} cache Whether or not decoded tiles shall be cached
   * @param {import('./source/basesource.js').BaseSource} source The datasource to read from
   */
  constructor(fileDirectory, littleEndian, cache, source) {
    this.fileDirectory = fileDirectory;
    this.littleEndian = littleEndian;
    this.tiles = cache ? {} : null;
    this.isTiled = !fileDirectory.hasTag("StripOffsets");
    const planarConfiguration = fileDirectory.getValue("PlanarConfiguration") ?? 1;
    if (planarConfiguration !== 1 && planarConfiguration !== 2) {
      throw new Error("Invalid planar configuration.");
    }
    this.planarConfiguration = planarConfiguration;
    this.source = source;
  }
  /**
   * Returns the associated parsed file directory.
   * @returns {import("./imagefiledirectory").ImageFileDirectory} the parsed file directory
   */
  getFileDirectory() {
    return this.fileDirectory;
  }
  /**
   * Returns the associated parsed geo keys.
   * @returns {Partial<Record<import('./globals.js').GeoKeyName, *>>|null} the parsed geo keys
   */
  getGeoKeys() {
    return this.fileDirectory.parseGeoKeyDirectory();
  }
  /**
   * Returns the width of the image.
   * @returns {Number} the width of the image
   */
  getWidth() {
    return this.fileDirectory.getValue("ImageWidth");
  }
  /**
   * Returns the height of the image.
   * @returns {Number} the height of the image
   */
  getHeight() {
    return this.fileDirectory.getValue("ImageLength");
  }
  /**
   * Returns the number of samples per pixel.
   * @returns {Number} the number of samples per pixel
   */
  getSamplesPerPixel() {
    return this.fileDirectory.hasTag("SamplesPerPixel") ? this.fileDirectory.getValue("SamplesPerPixel") : 1;
  }
  /**
   * Returns the width of each tile.
   * @returns {Number} the width of each tile
   */
  getTileWidth() {
    return this.isTiled ? this.fileDirectory.getValue("TileWidth") : this.getWidth();
  }
  /**
   * Returns the height of each tile.
   * @returns {Number} the height of each tile
   */
  getTileHeight() {
    if (this.isTiled) {
      return this.fileDirectory.getValue("TileLength");
    }
    if (this.fileDirectory.hasTag("RowsPerStrip")) {
      return Math.min(this.fileDirectory.getValue("RowsPerStrip"), this.getHeight());
    }
    return this.getHeight();
  }
  getBlockWidth() {
    return this.getTileWidth();
  }
  getBlockHeight(y) {
    if (this.isTiled || (y + 1) * this.getTileHeight() <= this.getHeight()) {
      return this.getTileHeight();
    } else {
      return this.getHeight() - y * this.getTileHeight();
    }
  }
  /**
   * Calculates the number of bytes for each pixel across all samples. Only full
   * bytes are supported, an exception is thrown when this is not the case.
   * @returns {Number} the bytes per pixel
   */
  getBytesPerPixel() {
    let bytes = 0;
    for (let i = 0; i < this.fileDirectory.getValue("BitsPerSample").length; ++i) {
      bytes += this.getSampleByteSize(i);
    }
    return bytes;
  }
  getSampleByteSize(i) {
    const bitsPerSample = this.fileDirectory.getValue("BitsPerSample");
    if (i >= bitsPerSample.length) {
      throw new RangeError(`Sample index ${i} is out of range.`);
    }
    return Math.ceil(bitsPerSample[i] / 8);
  }
  getReaderForSample(sampleIndex) {
    const format = this.fileDirectory.hasTag("SampleFormat") ? this.fileDirectory.getValue("SampleFormat")[sampleIndex] : 1;
    const bitsPerSample = this.fileDirectory.getValue("BitsPerSample")[sampleIndex];
    switch (format) {
      case 1:
        if (bitsPerSample <= 8) {
          return DataView.prototype.getUint8;
        } else if (bitsPerSample <= 16) {
          return DataView.prototype.getUint16;
        } else if (bitsPerSample <= 32) {
          return DataView.prototype.getUint32;
        }
        break;
      case 2:
        if (bitsPerSample <= 8) {
          return DataView.prototype.getInt8;
        } else if (bitsPerSample <= 16) {
          return DataView.prototype.getInt16;
        } else if (bitsPerSample <= 32) {
          return DataView.prototype.getInt32;
        }
        break;
      case 3:
        switch (bitsPerSample) {
          case 16:
            return function(offset, littleEndian) {
              return getFloat16(this, offset, littleEndian);
            };
          case 32:
            return DataView.prototype.getFloat32;
          case 64:
            return DataView.prototype.getFloat64;
        }
        break;
    }
    throw Error("Unsupported data format/bitsPerSample");
  }
  getSampleFormat(sampleIndex = 0) {
    return this.fileDirectory.hasTag("SampleFormat") ? this.fileDirectory.getValue("SampleFormat")[sampleIndex] : 1;
  }
  getBitsPerSample(sampleIndex = 0) {
    return this.fileDirectory.getValue("BitsPerSample")[sampleIndex];
  }
  getArrayForSample(sampleIndex, size) {
    const format = this.getSampleFormat(sampleIndex);
    const bitsPerSample = this.getBitsPerSample(sampleIndex);
    return arrayForType(format, bitsPerSample, size);
  }
  /**
   * Returns the decoded strip or tile.
   * @param {Number} x the strip or tile x-offset
   * @param {Number} y the tile y-offset (0 for stripped images)
   * @param {Number} sample the sample to get for separated samples
   * @param {DecoderWorker|import("./geotiff").BaseDecoder} poolOrDecoder the decoder or decoder pool
   * @param {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
   *                               to be aborted
   * @returns {Promise.<{x: number, y: number, sample: number, data: ArrayBuffer}>} the decoded strip or tile
   */
  async getTileOrStrip(x, y, sample, poolOrDecoder, signal) {
    const numTilesPerRow = Math.ceil(this.getWidth() / this.getTileWidth());
    const numTilesPerCol = Math.ceil(this.getHeight() / this.getTileHeight());
    let index;
    const { tiles } = this;
    if (this.planarConfiguration === 1) {
      index = y * numTilesPerRow + x;
    } else if (this.planarConfiguration === 2) {
      index = sample * numTilesPerRow * numTilesPerCol + y * numTilesPerRow + x;
    }
    if (index === void 0) {
      throw new Error("Could not determine tile or strip index.");
    }
    let offset;
    let byteCount;
    if (this.isTiled) {
      offset = await this.fileDirectory.loadValueIndexed("TileOffsets", index);
      byteCount = await this.fileDirectory.loadValueIndexed("TileByteCounts", index);
    } else {
      offset = await this.fileDirectory.loadValueIndexed("StripOffsets", index);
      byteCount = await this.fileDirectory.loadValueIndexed("StripByteCounts", index);
    }
    if (byteCount === 0) {
      const nPixels = this.getBlockHeight(y) * this.getTileWidth();
      const bytesPerPixel = this.planarConfiguration === 2 ? this.getSampleByteSize(sample) : this.getBytesPerPixel();
      const data = new ArrayBuffer(nPixels * bytesPerPixel);
      const view = this.getArrayForSample(sample, data);
      view.fill(this.getGDALNoData() || 0);
      return { x, y, sample, data };
    }
    const slice = (await this.source.fetch([{ offset, length: byteCount }], signal))[0];
    let request2;
    if (tiles === null || !tiles[index]) {
      request2 = (async () => {
        let data = await poolOrDecoder.decode(slice);
        const sampleFormat = this.getSampleFormat();
        const bitsPerSample = this.getBitsPerSample();
        if (needsNormalization(sampleFormat, bitsPerSample)) {
          data = normalizeArray(data, sampleFormat, this.planarConfiguration, this.getSamplesPerPixel(), bitsPerSample, this.getTileWidth(), this.getBlockHeight(y));
        }
        return data;
      })();
      if (tiles !== null) {
        tiles[index] = request2;
      }
    } else {
      request2 = tiles[index];
    }
    return { x, y, sample, data: await request2 };
  }
  /**
   * Internal read function.
   * @private
   * @param {Array} imageWindow The image window in pixel coordinates
   * @param {Array} samples The selected samples (0-based indices)
   * @param {TypedArray|TypedArray[]} valueArrays The array(s) to write into
   * @param {boolean|undefined} interleave Whether or not to write in an interleaved manner
   * @param {DecoderWorker|import("./geotiff").BaseDecoder} poolOrDecoder the decoder or decoder pool
   * @param {number} [width] the width of window to be read into
   * @param {number} [height] the height of window to be read into
   * @param {string} [resampleMethod] the resampling method to be used when interpolating
   * @param {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
   *                               to be aborted
   * @returns {Promise<ReadRasterResult>}
   */
  async _readRaster(imageWindow, samples, valueArrays, interleave, poolOrDecoder, width, height, resampleMethod, signal) {
    const tileWidth = this.getTileWidth();
    const tileHeight = this.getTileHeight();
    const imageWidth = this.getWidth();
    const imageHeight = this.getHeight();
    const minXTile = Math.max(Math.floor(imageWindow[0] / tileWidth), 0);
    const maxXTile = Math.min(Math.ceil(imageWindow[2] / tileWidth), Math.ceil(imageWidth / tileWidth));
    const minYTile = Math.max(Math.floor(imageWindow[1] / tileHeight), 0);
    const maxYTile = Math.min(Math.ceil(imageWindow[3] / tileHeight), Math.ceil(imageHeight / tileHeight));
    const windowWidth = imageWindow[2] - imageWindow[0];
    let bytesPerPixel = this.getBytesPerPixel();
    const srcSampleOffsets = [];
    const sampleReaders = [];
    for (let i = 0; i < samples.length; ++i) {
      if (this.planarConfiguration === 1) {
        srcSampleOffsets.push(sum(await this.fileDirectory.loadValue("BitsPerSample"), 0, samples[i]) / 8);
      } else {
        srcSampleOffsets.push(0);
      }
      sampleReaders.push(this.getReaderForSample(samples[i]));
    }
    const promises = [];
    const { littleEndian } = this;
    for (let yTile = minYTile; yTile < maxYTile; ++yTile) {
      for (let xTile = minXTile; xTile < maxXTile; ++xTile) {
        let getPromise;
        if (this.planarConfiguration === 1) {
          getPromise = this.getTileOrStrip(xTile, yTile, 0, poolOrDecoder, signal);
        }
        for (let sampleIndex = 0; sampleIndex < samples.length; ++sampleIndex) {
          const si = sampleIndex;
          const sample = samples[sampleIndex];
          if (this.planarConfiguration === 2) {
            bytesPerPixel = this.getSampleByteSize(sample);
            getPromise = this.getTileOrStrip(xTile, yTile, sample, poolOrDecoder, signal);
          }
          if (!getPromise) {
            throw new Error("Could not get tile or strip data.");
          }
          const promise = getPromise.then((tile) => {
            const buffer2 = tile.data;
            const dataView = new DataView(buffer2);
            const blockHeight = this.getBlockHeight(tile.y);
            const firstLine = tile.y * tileHeight;
            const firstCol = tile.x * tileWidth;
            const lastLine = firstLine + blockHeight;
            const lastCol = (tile.x + 1) * tileWidth;
            const reader = sampleReaders[si];
            const ymax = Math.min(blockHeight, blockHeight - (lastLine - imageWindow[3]), imageHeight - firstLine);
            const xmax = Math.min(tileWidth, tileWidth - (lastCol - imageWindow[2]), imageWidth - firstCol);
            for (let y = Math.max(0, imageWindow[1] - firstLine); y < ymax; ++y) {
              for (let x = Math.max(0, imageWindow[0] - firstCol); x < xmax; ++x) {
                const pixelOffset = (y * tileWidth + x) * bytesPerPixel;
                const value = reader.call(dataView, pixelOffset + srcSampleOffsets[si], littleEndian);
                let windowCoordinate;
                if (interleave) {
                  windowCoordinate = (y + firstLine - imageWindow[1]) * windowWidth * samples.length + (x + firstCol - imageWindow[0]) * samples.length + si;
                  valueArrays[windowCoordinate] = value;
                } else {
                  windowCoordinate = (y + firstLine - imageWindow[1]) * windowWidth + x + firstCol - imageWindow[0];
                  valueArrays[si][windowCoordinate] = value;
                }
              }
            }
          });
          promises.push(promise);
        }
      }
    }
    await Promise.all(promises);
    if (width && imageWindow[2] - imageWindow[0] !== width || height && imageWindow[3] - imageWindow[1] !== height) {
      let resampled;
      if (interleave) {
        resampled = resampleInterleaved(
          /** @type {TypedArray} */
          valueArrays,
          imageWindow[2] - imageWindow[0],
          imageWindow[3] - imageWindow[1],
          /** @type {number} */
          width,
          /** @type {number} */
          height,
          samples.length,
          resampleMethod
        );
      } else {
        resampled = resample(
          /** @type {TypedArray[]} */
          valueArrays,
          imageWindow[2] - imageWindow[0],
          imageWindow[3] - imageWindow[1],
          /** @type {number} */
          width,
          /** @type {number} */
          height,
          resampleMethod
        );
      }
      const resampledWithDimensions = (
        /** @type {ReadRasterResult} */
        resampled
      );
      resampledWithDimensions.width = width ?? imageWindow[2] - imageWindow[0];
      resampledWithDimensions.height = height ?? imageWindow[3] - imageWindow[1];
      return resampledWithDimensions;
    }
    const valueArraysWithDimensions = (
      /** @type {ReadRasterResult} */
      valueArrays
    );
    valueArraysWithDimensions.width = width || imageWindow[2] - imageWindow[0];
    valueArraysWithDimensions.height = height || imageWindow[3] - imageWindow[1];
    return valueArraysWithDimensions;
  }
  /**
   * @overload
   * @param {ReadRastersOptions & {interleave: true}} options optional parameters
   * @returns {Promise<import("./geotiff").TypedArrayWithDimensions>} the decoded arrays as a promise
   */
  /**
   * @overload
   * @param {ReadRastersOptions & {interleave: false}} options optional parameters
   * @returns {Promise<import("./geotiff").TypedArrayArrayWithDimensions>} the decoded arrays as a promise
   */
  /**
   * @overload
   * @param {ReadRastersOptions & {interleave: boolean}} options optional parameters
   * @returns {Promise<ReadRasterResult>} the decoded arrays as a promise
   */
  /**
   * @overload
   * @param {ReadRastersOptions} [options={}] optional parameters
   * @returns {Promise<import("./geotiff").TypedArrayArrayWithDimensions>} the decoded arrays as a promise
   */
  /**
   * Reads raster data from the image. This function reads all selected samples
   * into separate arrays of the correct type for that sample or into a single
   * combined array when `interleave` is set. When provided, only a subset
   * of the raster is read for each sample.
   *
   * @param {ReadRastersOptions} [options={}] optional parameters
   * @returns {Promise<ReadRasterResult>} the decoded arrays as a promise
   */
  async readRasters(options = {}) {
    const { window: wnd, samples = [], pool = null, width, height, resampleMethod, fillValue, signal } = options;
    const interleave = "interleave" in options && options.interleave;
    const imageWindow = wnd || [0, 0, this.getWidth(), this.getHeight()];
    if (imageWindow[0] > imageWindow[2] || imageWindow[1] > imageWindow[3]) {
      throw new Error("Invalid subsets");
    }
    const imageWindowWidth = imageWindow[2] - imageWindow[0];
    const imageWindowHeight = imageWindow[3] - imageWindow[1];
    const numPixels = imageWindowWidth * imageWindowHeight;
    const samplesPerPixel = this.getSamplesPerPixel();
    if (!samples || !samples.length) {
      for (let i = 0; i < samplesPerPixel; ++i) {
        samples.push(i);
      }
    } else {
      for (let i = 0; i < samples.length; ++i) {
        if (samples[i] >= samplesPerPixel) {
          return Promise.reject(new RangeError(`Invalid sample index '${samples[i]}'.`));
        }
      }
    }
    let valueArrays;
    if (interleave) {
      const format = this.fileDirectory.hasTag("SampleFormat") ? Math.max.apply(null, this.fileDirectory.getValue("SampleFormat")) : 1;
      const bitsPerSample = Math.max.apply(null, this.fileDirectory.getValue("BitsPerSample"));
      valueArrays = arrayForType(format, bitsPerSample, numPixels * samples.length);
      if (fillValue) {
        if (Array.isArray(fillValue)) {
          throw new Error("When reading interleaved data, fillValue must be a single number.");
        }
        valueArrays.fill(fillValue);
      }
    } else {
      valueArrays = [];
      for (let i = 0; i < samples.length; ++i) {
        const valueArray = this.getArrayForSample(samples[i], numPixels);
        if (Array.isArray(fillValue) && i < fillValue.length) {
          valueArray.fill(fillValue[i]);
        } else if (fillValue && !Array.isArray(fillValue)) {
          valueArray.fill(fillValue);
        }
        valueArrays.push(valueArray);
      }
    }
    const compression = this.fileDirectory.getValue("Compression") || 1;
    const decoderParameters = await getDecoderParameters(compression, this.fileDirectory);
    const poolOrDecoder = pool ? pool.bindParameters(compression, decoderParameters) : await getDecoder(compression, decoderParameters);
    const result = await this._readRaster(imageWindow, samples, valueArrays, interleave, poolOrDecoder, width, height, resampleMethod, signal);
    return result;
  }
  /**
   * @overload
   * @param {ReadRGBOptions & {interleave: true}} options optional parameters
   * @returns {Promise<import("./geotiff").TypedArrayWithDimensions>} the RGB array as a Promise
   */
  /**
   * @overload
   * @param {ReadRGBOptions & {interleave: false}} options optional parameters
   * @returns {Promise<import("./geotiff").TypedArrayArrayWithDimensions>} the RGB array as a Promise
   */
  /**
   * @overload
   * @param {ReadRGBOptions & {interleave: boolean}} options optional parameters
   * @returns {Promise<ReadRasterResult>} the RGB array as a Promise
   */
  /**
   * @overload
   * @param {ReadRGBOptions} [options={}] optional parameters
   * @returns {Promise<import("./geotiff").TypedArrayArrayWithDimensions>} the RGB array as a Promise
   */
  /**
   * Reads raster data from the image as RGB.
   * Colorspaces other than RGB will be transformed to RGB, color maps expanded.
   * When no other method is applicable, the first sample is used to produce a
   * grayscale image.
   * When provided, only a subset of the raster is read for each sample.
   *
   * @param {ReadRGBOptions} [options] optional parameters
   * @returns {Promise<ReadRasterResult>} the RGB array as a Promise
   */
  async readRGB(options = {}) {
    const { window, pool = null, width, height, resampleMethod, enableAlpha = false, signal } = options;
    const interleave = ("interleave" in options && options.interleave) ?? false;
    const imageWindow = window || [0, 0, this.getWidth(), this.getHeight()];
    if (imageWindow[0] > imageWindow[2] || imageWindow[1] > imageWindow[3]) {
      throw new Error("Invalid subsets");
    }
    const pi = this.fileDirectory.getValue("PhotometricInterpretation");
    if (pi === photometricInterpretations.RGB) {
      let s = [0, 1, 2];
      if (!(this.fileDirectory.getValue("ExtraSamples") === ExtraSamplesValues.Unspecified) && enableAlpha) {
        s = [];
        for (let i = 0; i < this.fileDirectory.getValue("BitsPerSample").length; i += 1) {
          s.push(i);
        }
      }
      return this.readRasters({
        window,
        interleave,
        samples: s,
        pool,
        width,
        height,
        resampleMethod,
        signal
      });
    }
    let samples;
    switch (pi) {
      case photometricInterpretations.WhiteIsZero:
      case photometricInterpretations.BlackIsZero:
      case photometricInterpretations.Palette:
        samples = [0];
        break;
      case photometricInterpretations.CMYK:
        samples = [0, 1, 2, 3];
        break;
      case photometricInterpretations.YCbCr:
      case photometricInterpretations.CIELab:
        samples = [0, 1, 2];
        break;
      default:
        throw new Error("Invalid or unsupported photometric interpretation.");
    }
    const subOptions = {
      window: imageWindow,
      /** @type {true} */
      interleave: true,
      samples,
      pool,
      width,
      height,
      resampleMethod,
      signal
    };
    const { fileDirectory } = this;
    const raster = await this.readRasters(subOptions);
    const max = 2 ** this.getBitsPerSample(0);
    let data;
    switch (pi) {
      case photometricInterpretations.WhiteIsZero:
        data = fromWhiteIsZero(raster, max);
        break;
      case photometricInterpretations.BlackIsZero:
        data = fromBlackIsZero(raster, max);
        break;
      case photometricInterpretations.Palette:
        data = fromPalette(raster, await fileDirectory.loadValue("ColorMap"));
        break;
      case photometricInterpretations.CMYK:
        data = fromCMYK(raster);
        break;
      case photometricInterpretations.YCbCr:
        data = fromYCbCr(raster);
        break;
      case photometricInterpretations.CIELab:
        data = fromCIELab(raster);
        break;
      default:
        throw new Error("Unsupported photometric interpretation.");
    }
    if (!interleave) {
      const red = new Uint8Array(data.length / 3);
      const green = new Uint8Array(data.length / 3);
      const blue = new Uint8Array(data.length / 3);
      for (let i = 0, j = 0; i < data.length; i += 3, ++j) {
        red[j] = data[i];
        green[j] = data[i + 1];
        blue[j] = data[i + 2];
      }
      data = [red, green, blue];
    }
    const dataWithDimensions = (
      /** @type {import("./geotiff").ReadRasterResult} */
      data
    );
    dataWithDimensions.width = raster.width;
    dataWithDimensions.height = raster.height;
    return dataWithDimensions;
  }
  /**
   * Returns an array of tiepoints.
   * @returns {Promise<Object[]>}
   */
  async getTiePoints() {
    if (!this.fileDirectory.hasTag("ModelTiepoint")) {
      return [];
    }
    const modelTiePoint = await this.fileDirectory.loadValue("ModelTiepoint");
    const tiePoints = [];
    for (let i = 0; i < modelTiePoint.length; i += 6) {
      tiePoints.push({
        i: modelTiePoint[i],
        j: modelTiePoint[i + 1],
        k: modelTiePoint[i + 2],
        x: modelTiePoint[i + 3],
        y: modelTiePoint[i + 4],
        z: modelTiePoint[i + 5]
      });
    }
    return tiePoints;
  }
  /**
   * Returns the parsed GDAL metadata items.
   *
   * If sample is passed to null, dataset-level metadata will be returned.
   * Otherwise only metadata specific to the provided sample will be returned.
   *
   * @param {number|null} [sample=null] The sample index.
   * @returns {Promise<Object>}
   */
  async getGDALMetadata(sample = null) {
    const metadata = {};
    if (!this.fileDirectory.hasTag("GDAL_METADATA")) {
      return null;
    }
    const string2 = await this.fileDirectory.loadValue("GDAL_METADATA");
    let items = findTagsByName(string2, "Item");
    if (sample === null) {
      items = items.filter((item) => getAttribute(item, "sample") === void 0);
    } else {
      items = items.filter((item) => Number(getAttribute(item, "sample")) === sample);
    }
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      metadata[getAttribute(item, "name")] = item.inner;
    }
    return metadata;
  }
  /**
   * Returns the GDAL nodata value
   * @returns {number|null}
   */
  getGDALNoData() {
    if (!this.fileDirectory.hasTag("GDAL_NODATA")) {
      return null;
    }
    const string2 = this.fileDirectory.getValue("GDAL_NODATA");
    return Number(string2.substring(0, string2.length - 1));
  }
  /**
   * Returns the image origin as a XYZ-vector. When the image has no affine
   * transformation, then an exception is thrown.
   * @returns {Array<number>} The origin as a vector
   */
  getOrigin() {
    const tiePoints = this.fileDirectory.getValue("ModelTiepoint");
    const modelTransformation = this.fileDirectory.getValue("ModelTransformation");
    if (tiePoints && tiePoints.length === 6) {
      return [
        tiePoints[3],
        tiePoints[4],
        tiePoints[5]
      ];
    }
    if (modelTransformation) {
      return [
        modelTransformation[3],
        modelTransformation[7],
        modelTransformation[11]
      ];
    }
    throw new Error("The image does not have an affine transformation.");
  }
  /**
   * Returns the image resolution as a XYZ-vector. When the image has no affine
   * transformation, then an exception is thrown.
   * @param {GeoTIFFImage|null} [referenceImage=null] A reference image to calculate the resolution from
   *                                             in cases when the current image does not have the
   *                                             required tags on its own.
   * @returns {Array<number>} The resolution as a vector
   */
  getResolution(referenceImage = null) {
    const modelPixelScale = this.fileDirectory.getValue("ModelPixelScale");
    const modelTransformation = this.fileDirectory.getValue("ModelTransformation");
    if (modelPixelScale) {
      return [
        modelPixelScale[0],
        -modelPixelScale[1],
        modelPixelScale[2]
      ];
    }
    if (modelTransformation) {
      if (modelTransformation[1] === 0 && modelTransformation[4] === 0) {
        return [
          modelTransformation[0],
          -modelTransformation[5],
          modelTransformation[10]
        ];
      }
      return [
        Math.sqrt(modelTransformation[0] * modelTransformation[0] + modelTransformation[4] * modelTransformation[4]),
        -Math.sqrt(modelTransformation[1] * modelTransformation[1] + modelTransformation[5] * modelTransformation[5]),
        modelTransformation[10]
      ];
    }
    if (referenceImage) {
      const [refResX, refResY, refResZ] = referenceImage.getResolution();
      return [
        refResX * referenceImage.getWidth() / this.getWidth(),
        refResY * referenceImage.getHeight() / this.getHeight(),
        refResZ * referenceImage.getWidth() / this.getWidth()
      ];
    }
    throw new Error("The image does not have an affine transformation.");
  }
  /**
   * Returns whether or not the pixels of the image depict an area (or point).
   * @returns {Boolean} Whether the pixels are a point
   */
  pixelIsArea() {
    return this.getGeoKeys()?.GTRasterTypeGeoKey === 1;
  }
  /**
   * Returns the image bounding box as an array of 4 values: min-x, min-y,
   * max-x and max-y. When the image has no affine transformation, then an
   * exception is thrown.
   * @param {boolean} [tilegrid=false] If true return extent for a tilegrid
   *                                   without adjustment for ModelTransformation.
   * @returns {Array<number>} The bounding box
   */
  getBoundingBox(tilegrid = false) {
    const height = this.getHeight();
    const width = this.getWidth();
    if (this.fileDirectory.hasTag("ModelTransformation") && !tilegrid) {
      const [a, b, c, d, e, f, g, h] = this.fileDirectory.getValue("ModelTransformation");
      const corners = [
        [0, 0],
        [0, height],
        [width, 0],
        [width, height]
      ];
      const projected = corners.map(([I, J]) => [
        d + a * I + b * J,
        h + e * I + f * J
      ]);
      const xs = projected.map((pt) => pt[0]);
      const ys = projected.map((pt) => pt[1]);
      return [
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys)
      ];
    } else {
      const origin = this.getOrigin();
      const resolution = this.getResolution();
      const x1 = origin[0];
      const y1 = origin[1];
      const x2 = x1 + resolution[0] * width;
      const y2 = y1 + resolution[1] * height;
      return [
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.max(x1, x2),
        Math.max(y1, y2)
      ];
    }
  }
}
class DataView64 {
  constructor(arrayBuffer) {
    this._dataView = new DataView(arrayBuffer);
  }
  get buffer() {
    return this._dataView.buffer;
  }
  getUint64(offset, littleEndian) {
    const left = this.getUint32(offset, littleEndian);
    const right = this.getUint32(offset + 4, littleEndian);
    let combined;
    if (littleEndian) {
      combined = left + 2 ** 32 * right;
      if (!Number.isSafeInteger(combined)) {
        throw new Error(`${combined} exceeds MAX_SAFE_INTEGER. Precision may be lost. Please report if you get this message to https://github.com/geotiffjs/geotiff.js/issues`);
      }
      return combined;
    }
    combined = 2 ** 32 * left + right;
    if (!Number.isSafeInteger(combined)) {
      throw new Error(`${combined} exceeds MAX_SAFE_INTEGER. Precision may be lost. Please report if you get this message to https://github.com/geotiffjs/geotiff.js/issues`);
    }
    return combined;
  }
  // adapted from https://stackoverflow.com/a/55338384/8060591
  getInt64(offset, littleEndian) {
    let value = 0;
    const isNegative = (this._dataView.getUint8(offset + (littleEndian ? 7 : 0)) & 128) > 0;
    let carrying = true;
    for (let i = 0; i < 8; i++) {
      let byte = this._dataView.getUint8(offset + (littleEndian ? i : 7 - i));
      if (isNegative) {
        if (carrying) {
          if (byte !== 0) {
            byte = ~(byte - 1) & 255;
            carrying = false;
          }
        } else {
          byte = ~byte & 255;
        }
      }
      value += byte * 256 ** i;
    }
    if (isNegative) {
      value = -value;
    }
    return value;
  }
  getUint8(offset) {
    return this._dataView.getUint8(offset);
  }
  getInt8(offset) {
    return this._dataView.getInt8(offset);
  }
  getUint16(offset, littleEndian) {
    return this._dataView.getUint16(offset, littleEndian);
  }
  getInt16(offset, littleEndian) {
    return this._dataView.getInt16(offset, littleEndian);
  }
  getUint32(offset, littleEndian) {
    return this._dataView.getUint32(offset, littleEndian);
  }
  getInt32(offset, littleEndian) {
    return this._dataView.getInt32(offset, littleEndian);
  }
  getFloat16(offset, littleEndian) {
    return getFloat16(this._dataView, offset, littleEndian);
  }
  getFloat32(offset, littleEndian) {
    return this._dataView.getFloat32(offset, littleEndian);
  }
  getFloat64(offset, littleEndian) {
    return this._dataView.getFloat64(offset, littleEndian);
  }
}
class DataSlice {
  constructor(arrayBuffer, sliceOffset, littleEndian, bigTiff) {
    this._dataView = new DataView(arrayBuffer);
    this._sliceOffset = sliceOffset;
    this._littleEndian = littleEndian;
    this._bigTiff = bigTiff;
  }
  get sliceOffset() {
    return this._sliceOffset;
  }
  get sliceTop() {
    return this._sliceOffset + this.buffer.byteLength;
  }
  get littleEndian() {
    return this._littleEndian;
  }
  get bigTiff() {
    return this._bigTiff;
  }
  get buffer() {
    return this._dataView.buffer;
  }
  covers(offset, length) {
    return this.sliceOffset <= offset && this.sliceTop >= offset + length;
  }
  readUint8(offset) {
    return this._dataView.getUint8(offset - this._sliceOffset);
  }
  readInt8(offset) {
    return this._dataView.getInt8(offset - this._sliceOffset);
  }
  readUint16(offset) {
    return this._dataView.getUint16(offset - this._sliceOffset, this._littleEndian);
  }
  readInt16(offset) {
    return this._dataView.getInt16(offset - this._sliceOffset, this._littleEndian);
  }
  readUint32(offset) {
    return this._dataView.getUint32(offset - this._sliceOffset, this._littleEndian);
  }
  readInt32(offset) {
    return this._dataView.getInt32(offset - this._sliceOffset, this._littleEndian);
  }
  readFloat32(offset) {
    return this._dataView.getFloat32(offset - this._sliceOffset, this._littleEndian);
  }
  readFloat64(offset) {
    return this._dataView.getFloat64(offset - this._sliceOffset, this._littleEndian);
  }
  readUint64(offset) {
    const left = this.readUint32(offset);
    const right = this.readUint32(offset + 4);
    let combined;
    if (this._littleEndian) {
      combined = left + 2 ** 32 * right;
      if (!Number.isSafeInteger(combined)) {
        throw new Error(`${combined} exceeds MAX_SAFE_INTEGER. Precision may be lost. Please report if you get this message to https://github.com/geotiffjs/geotiff.js/issues`);
      }
      return combined;
    }
    combined = 2 ** 32 * left + right;
    if (!Number.isSafeInteger(combined)) {
      throw new Error(`${combined} exceeds MAX_SAFE_INTEGER. Precision may be lost. Please report if you get this message to https://github.com/geotiffjs/geotiff.js/issues`);
    }
    return combined;
  }
  // adapted from https://stackoverflow.com/a/55338384/8060591
  readInt64(offset) {
    let value = 0;
    const isNegative = (this._dataView.getUint8(offset + (this._littleEndian ? 7 : 0)) & 128) > 0;
    let carrying = true;
    for (let i = 0; i < 8; i++) {
      let byte = this._dataView.getUint8(offset + (this._littleEndian ? i : 7 - i));
      if (isNegative) {
        if (carrying) {
          if (byte !== 0) {
            byte = ~(byte - 1) & 255;
            carrying = false;
          }
        } else {
          byte = ~byte & 255;
        }
      }
      value += byte * 256 ** i;
    }
    if (isNegative) {
      value = -value;
    }
    return value;
  }
  readOffset(offset) {
    if (this._bigTiff) {
      return this.readUint64(offset);
    }
    return this.readUint32(offset);
  }
}
function getArrayForSamples(fieldType, count) {
  switch (fieldType) {
    case fieldTypes.BYTE:
    case fieldTypes.ASCII:
    case fieldTypes.UNDEFINED:
      return new Uint8Array(count);
    case fieldTypes.SBYTE:
      return new Int8Array(count);
    case fieldTypes.SHORT:
      return new Uint16Array(count);
    case fieldTypes.SSHORT:
      return new Int16Array(count);
    case fieldTypes.LONG:
    case fieldTypes.IFD:
      return new Uint32Array(count);
    case fieldTypes.SLONG:
      return new Int32Array(count);
    case fieldTypes.LONG8:
    case fieldTypes.IFD8:
      return new Array(count);
    case fieldTypes.SLONG8:
      return new Array(count);
    case fieldTypes.RATIONAL:
      return new Uint32Array(count * 2);
    case fieldTypes.SRATIONAL:
      return new Int32Array(count * 2);
    case fieldTypes.FLOAT:
      return new Float32Array(count);
    case fieldTypes.DOUBLE:
      return new Float64Array(count);
    default:
      throw new RangeError(`Invalid field type: ${fieldType}`);
  }
}
function getDataSliceReader(dataSlice, fieldType) {
  switch (fieldType) {
    case fieldTypes.BYTE:
    case fieldTypes.ASCII:
    case fieldTypes.UNDEFINED:
      return dataSlice.readUint8;
    case fieldTypes.SBYTE:
      return dataSlice.readInt8;
    case fieldTypes.SHORT:
      return dataSlice.readUint16;
    case fieldTypes.SSHORT:
      return dataSlice.readInt16;
    case fieldTypes.LONG:
    case fieldTypes.IFD:
      return dataSlice.readUint32;
    case fieldTypes.SLONG:
      return dataSlice.readInt32;
    case fieldTypes.LONG8:
    case fieldTypes.IFD8:
      return dataSlice.readUint64;
    case fieldTypes.SLONG8:
      return dataSlice.readInt64;
    case fieldTypes.RATIONAL:
      return dataSlice.readUint32;
    case fieldTypes.SRATIONAL:
      return dataSlice.readInt32;
    case fieldTypes.FLOAT:
      return dataSlice.readFloat32;
    case fieldTypes.DOUBLE:
      return dataSlice.readFloat64;
    default:
      throw new RangeError(`Invalid field type: ${fieldType}`);
  }
}
function getValues$1(outValues = null, readMethod, dataSlice, fieldType, count, offset, isArray = false) {
  const fieldTypeLength = getFieldTypeSize(fieldType);
  const values2 = outValues || getArrayForSamples(fieldType, count);
  const isRational = fieldType === fieldTypes.RATIONAL || fieldType === fieldTypes.SRATIONAL;
  if (!isRational) {
    for (let i = 0; i < count; ++i) {
      values2[i] = readMethod.call(dataSlice, offset + i * fieldTypeLength);
    }
  } else {
    for (let i = 0; i < count; i += 2) {
      values2[i] = readMethod.call(dataSlice, offset + i * fieldTypeLength);
      values2[i + 1] = readMethod.call(dataSlice, offset + (i * fieldTypeLength + 4));
    }
  }
  if (fieldType === fieldTypes.ASCII) {
    return new TextDecoder("utf-8").decode(
      /** @type {Uint8Array} */
      values2
    );
  }
  if (count === 1 && !isArray && !isRational) {
    return values2[0];
  }
  return values2;
}
class DeferredArray {
  /**
   * Creates a DeferredArray for lazy-loading of large TIFF field arrays.
   * @param {import("./source/basesource.js").BaseSource} source - Data source for fetching
   * @param {number} arrayOffset - Byte offset where the array data starts
   * @param {boolean} littleEndian - Endianness of the data
   * @param {import('./globals.js').FieldType} fieldType - TIFF field type constant
   * @param {number} length - Number of elements in the array
   */
  constructor(source, arrayOffset, littleEndian, fieldType, length) {
    this.source = source;
    this.arrayOffset = arrayOffset;
    this.littleEndian = littleEndian;
    this.fieldType = fieldType;
    this.length = length;
    this.data = getArrayForSamples(fieldType, length);
    this.itemSize = getFieldTypeSize(fieldType);
    this.maskBitmap = new Uint8Array(Math.ceil(length / 8));
    this.fetchIndexPromises = /* @__PURE__ */ new Map();
    this.fullFetchPromise = null;
  }
  /**
   * Loads all values in the deferred array at once.
   * Subsequent calls return the same promise to avoid redundant fetches.
   * @returns {Promise<import('./geotiff.js').TypedArray|Array<number>>} Promise resolving to the fully loaded array
   */
  async loadAll() {
    if (!this.fullFetchPromise) {
      this.fullFetchPromise = this.source.fetch([{
        offset: this.arrayOffset,
        length: this.itemSize * this.length
      }]).then((data) => {
        const dataSlice = new DataSlice(data[0], this.arrayOffset, true, false);
        const result = getValues$1(this.data, getDataSliceReader(dataSlice, this.fieldType), dataSlice, this.fieldType, this.length, this.arrayOffset, true);
        this.maskBitmap.fill(255);
        this.fetchIndexPromises.clear();
        return result;
      });
    }
    return this.fullFetchPromise;
  }
  /**
   * Loads and returns a single value at the specified index.
   * If the value is already loaded, returns it immediately. Otherwise, fetches it
   * from the source. Multiple calls for the same index reuse the same promise.
   * @param {number} index - Zero-based index of the value to load
   * @returns {Promise<number|bigint>} Promise resolving to the value at the given index
   * @throws {RangeError} If index is out of bounds
   */
  async get(index) {
    if (index < 0 || index >= this.data.length) {
      throw new RangeError(`Index ${index} out of bounds for length ${this.data.length}`);
    }
    const byteIndex = Math.floor(index / 8);
    const bitMask = 1 << index % 8;
    const offset = this.arrayOffset + index * this.itemSize;
    if ((this.maskBitmap[byteIndex] & bitMask) === 0) {
      if (!this.fetchIndexPromises.has(index)) {
        const fetchPromise = this.source.fetch([{
          offset,
          length: this.itemSize
        }]).then((data) => {
          const dataSlice = new DataSlice(data[0], this.arrayOffset + index * this.itemSize, true, false);
          const readMethod = getDataSliceReader(dataSlice, this.fieldType);
          const value = readMethod.call(dataSlice, offset);
          this.data[index] = value;
          this.maskBitmap[byteIndex] |= bitMask;
          this.fetchIndexPromises.delete(index);
          return value;
        });
        this.fetchIndexPromises.set(index, fetchPromise);
      }
      return this.fetchIndexPromises.get(index);
    }
    return this.data[index];
  }
}
class ImageFileDirectory {
  /**
   * Create an ImageFileDirectory.
   * @param {Map} actualizedFields the file directory, mapping tag names to values
   * @param {Map} deferredFields the deferred fields, mapping tag names to async functions
   * @param {Map} deferredArrays the deferred arrays, mapping tag names to DeferredArray objects
   * @param {number} nextIFDByteOffset the byte offset to the next IFD
   */
  constructor(actualizedFields, deferredFields, deferredArrays, nextIFDByteOffset) {
    this.actualizedFields = actualizedFields;
    this.deferredFields = deferredFields;
    this.deferredFieldsBeingResolved = /* @__PURE__ */ new Map();
    this.deferredArrays = deferredArrays;
    this.nextIFDByteOffset = nextIFDByteOffset;
  }
  /**
   * @param {number|string} tagIdentifier The field tag ID or name
   * @returns {boolean} whether the field exists (actualized or deferred)
   */
  hasTag(tagIdentifier) {
    const tag = resolveTag(tagIdentifier);
    return this.actualizedFields.has(tag) || this.deferredFields.has(tag) || this.deferredArrays.has(tag);
  }
  /**
   * Synchronously retrieves the value for a given tag. If it is deferred, an error is thrown.
   * @param {number|string} tagIdentifier The field tag ID or name
   * @returns the field value, or undefined if it does not exist
   * @throws {Error} If the tag is deferred and requires asynchronous loading
   */
  getValue(tagIdentifier) {
    const tag = resolveTag(tagIdentifier);
    if (this.deferredFields.has(tag) || this.deferredArrays.has(tag)) {
      const tagDef = tagDefinitions[tag];
      const tagName = tagDef?.name || `Tag${tag}`;
      throw new Error(`Field '${tagName}' (${tag}) is deferred. Use loadValue() to load it asynchronously.`);
    }
    if (!this.actualizedFields.has(tag)) {
      return void 0;
    }
    return this.actualizedFields.get(tag);
  }
  /**
   * Retrieves the value for a given tag. If it is deferred, it will be loaded first.
   * @param {number|string} tagIdentifier The field tag ID or name
   * @returns the field value, or undefined if it does not exist
   */
  async loadValue(tagIdentifier) {
    const tag = resolveTag(tagIdentifier);
    if (this.actualizedFields.has(tag)) {
      return this.actualizedFields.get(tag);
    }
    if (this.deferredFieldsBeingResolved.has(tag)) {
      return this.deferredFieldsBeingResolved.get(tag);
    }
    if (this.deferredFields.has(tag)) {
      const loaderFn = this.deferredFields.get(tag);
      this.deferredFields.delete(tag);
      const valuePromise = (async () => {
        try {
          const value = await loaderFn();
          this.actualizedFields.set(tag, value);
          return value;
        } finally {
          this.deferredFieldsBeingResolved.delete(tag);
        }
      })();
      this.deferredFieldsBeingResolved.set(tag, valuePromise);
      return valuePromise;
    }
    if (this.deferredArrays.has(tag)) {
      const deferredArray = this.deferredArrays.get(tag);
      return deferredArray.loadAll();
    }
    return void 0;
  }
  /**
   * Retrieves the value at a given index for a tag that is an array. If it is deferred, it will be loaded first.
   * @param {number|string} tagIdentifier The field tag ID or name
   * @param {number} index The index within the array
   * @returns the field value at the given index, or undefined if it does not exist
   */
  async loadValueIndexed(tagIdentifier, index) {
    const tag = resolveTag(tagIdentifier);
    if (this.actualizedFields.has(tag)) {
      const value = this.actualizedFields.get(tag);
      return value[index];
    } else if (this.deferredArrays.has(tag)) {
      const deferredArray = this.deferredArrays.get(tag);
      return deferredArray.get(index);
    } else if (this.hasTag(tag)) {
      return (await this.loadValue(tag))[index];
    }
    return void 0;
  }
  /**
   * Parses the GeoTIFF GeoKeyDirectory tag into a structured object.
   * The GeoKeyDirectory is a special TIFF tag that contains geographic metadata
   * in a key-value format as defined by the GeoTIFF specification.
   * @returns {Partial<Record<import('./globals.js').GeoKeyName, *>>|null} Parsed geo key directory
   *     mapping key names to values, or null if not present
   * @throws {Error} If a referenced geo key value cannot be retrieved
   */
  parseGeoKeyDirectory() {
    const rawGeoKeyDirectory = this.getValue("GeoKeyDirectory");
    if (!rawGeoKeyDirectory) {
      return null;
    }
    const geoKeyDirectory = {};
    for (let i = 4; i <= rawGeoKeyDirectory[3] * 4; i += 4) {
      const key = geoKeyNames[rawGeoKeyDirectory[i]];
      const location = rawGeoKeyDirectory[i + 1] || null;
      const count = rawGeoKeyDirectory[i + 2];
      const offset = rawGeoKeyDirectory[i + 3];
      let value = null;
      if (!location) {
        value = offset;
      } else {
        value = this.getValue(location);
        if (typeof value === "undefined" || value === null) {
          throw new Error(`Could not get value of geoKey '${key}'.`);
        } else if (typeof value === "string") {
          value = value.substring(offset, offset + count - 1);
        } else if (value.subarray) {
          value = value.subarray(offset, offset + count);
          if (count === 1) {
            value = value[0];
          }
        }
      }
      geoKeyDirectory[key] = value;
    }
    return geoKeyDirectory;
  }
  toObject() {
    const obj = {};
    for (const [tag, value] of this.actualizedFields.entries()) {
      const tagDefinition = tagDefinitions[tag];
      const tagName = tagDefinition ? tagDefinition.name : `Tag${tag}`;
      obj[tagName] = value;
    }
    return obj;
  }
}
class ImageFileDirectoryParser {
  /**
   * @param {import("./source/basesource.js").BaseSource} source the data source to fetch from
   * @param {boolean} littleEndian the endianness of the file
   * @param {boolean} bigTiff whether the file is a BigTIFF
   * @param {boolean} [eager=false] whether to eagerly fetch deferred fields.
   *                                 When false (default), tags are loaded lazily on-demand.
   *                                 When true, all tags are loaded immediately during parsing.
   */
  constructor(source, littleEndian, bigTiff, eager = false) {
    this.source = source;
    this.littleEndian = littleEndian;
    this.bigTiff = bigTiff;
    this.eager = eager;
  }
  /**
   * Helper function to retrieve a DataSlice from the source.
   * @param {number} offset Byte offset of the slice
   * @param {number} [length] Length of the slice
   * @returns {Promise<DataSlice>}
   */
  async getSlice(offset, length) {
    const fallbackLength = this.bigTiff ? 4048 : 1024;
    return new DataSlice((await this.source.fetch([
      {
        offset,
        length: typeof length !== "undefined" ? length : fallbackLength
      }
    ]))[0], offset, this.littleEndian, this.bigTiff);
  }
  /**
   * Instructs to parse an image file directory at the given file offset.
   * As there is no way to ensure that a location is indeed the start of an IFD,
   * this function must be called with caution (e.g only using the IFD offsets from
   * the headers or other IFDs).
   * @param {number} offset the offset to parse the IFD at
   * @returns {Promise<ImageFileDirectory>} the parsed IFD
   */
  async parseFileDirectoryAt(offset) {
    const entrySize = this.bigTiff ? 20 : 12;
    const offsetSize = this.bigTiff ? 8 : 2;
    let dataSlice = await this.getSlice(offset);
    const numDirEntries = this.bigTiff ? dataSlice.readUint64(offset) : dataSlice.readUint16(offset);
    const byteSize = numDirEntries * (entrySize + (this.bigTiff ? 16 : 6));
    if (!dataSlice.covers(offset, byteSize)) {
      dataSlice = await this.getSlice(offset, byteSize);
    }
    const actualizedFields = /* @__PURE__ */ new Map();
    const deferredFields = /* @__PURE__ */ new Map();
    const deferredArrays = /* @__PURE__ */ new Map();
    let i = offset + (this.bigTiff ? 8 : 2);
    for (let entryCount = 0; entryCount < numDirEntries; i += entrySize, ++entryCount) {
      const fieldTag = dataSlice.readUint16(i);
      const fieldType = (
        /** @type {import('./globals.js').FieldType} */
        dataSlice.readUint16(i + 2)
      );
      const typeCount = this.bigTiff ? dataSlice.readUint64(i + 4) : dataSlice.readUint32(i + 4);
      let fieldValues = null;
      let deferredFieldValues = null;
      let deferredArray = null;
      const fieldTypeLength = getFieldTypeSize(fieldType);
      const valueOffset = i + (this.bigTiff ? 12 : 8);
      const isArray = tagDefinitions[fieldTag]?.isArray;
      const eager = tagDefinitions[fieldTag]?.eager || this.eager;
      if (fieldTypeLength * typeCount <= (this.bigTiff ? 8 : 4)) {
        fieldValues = getValues$1(getArrayForSamples(fieldType, typeCount), getDataSliceReader(dataSlice, fieldType), dataSlice, fieldType, typeCount, valueOffset, isArray);
      } else {
        const actualOffset = dataSlice.readOffset(valueOffset);
        const length = getFieldTypeSize(fieldType) * typeCount;
        if (dataSlice.covers(actualOffset, length)) {
          fieldValues = getValues$1(getArrayForSamples(fieldType, typeCount), getDataSliceReader(dataSlice, fieldType), dataSlice, fieldType, typeCount, actualOffset, isArray);
        } else if (eager) {
          const fieldDataSlice = await this.getSlice(actualOffset, length);
          fieldValues = getValues$1(getArrayForSamples(fieldType, typeCount), getDataSliceReader(fieldDataSlice, fieldType), fieldDataSlice, fieldType, typeCount, actualOffset, isArray);
        } else if (isArray) {
          deferredArray = new DeferredArray(this.source, actualOffset, this.littleEndian, fieldType, typeCount);
        } else {
          deferredFieldValues = async () => {
            const fieldDataSlice = await this.getSlice(actualOffset, length);
            return getValues$1(getArrayForSamples(fieldType, typeCount), getDataSliceReader(fieldDataSlice, fieldType), fieldDataSlice, fieldType, typeCount, actualOffset, isArray);
          };
        }
      }
      if (fieldValues !== null) {
        actualizedFields.set(fieldTag, fieldValues);
      } else if (deferredFieldValues !== null) {
        deferredFields.set(fieldTag, deferredFieldValues);
      } else if (deferredArray !== null) {
        deferredArrays.set(fieldTag, deferredArray);
      }
    }
    const nextIFDByteOffset = dataSlice.readOffset(offset + offsetSize + entrySize * numDirEntries);
    return new ImageFileDirectory(actualizedFields, deferredFields, deferredArrays, nextIFDByteOffset);
  }
}
function decodeRowAcc(row, stride) {
  let length = row.length - stride;
  let offset = 0;
  do {
    for (let i = stride; i > 0; i--) {
      row[offset + stride] += row[offset];
      offset++;
    }
    length -= stride;
  } while (length > 0);
}
function decodeRowFloatingPoint(row, stride, bytesPerSample) {
  let index = 0;
  let count = row.length;
  const wc = count / bytesPerSample;
  while (count > stride) {
    for (let i = stride; i > 0; --i) {
      row[index + stride] += row[index];
      ++index;
    }
    count -= stride;
  }
  const copy = row.slice();
  for (let i = 0; i < wc; ++i) {
    for (let b = 0; b < bytesPerSample; ++b) {
      row[bytesPerSample * i + b] = copy[(bytesPerSample - b - 1) * wc + i];
    }
  }
}
function applyPredictor(block, predictor, width, height, bitsPerSample, planarConfiguration) {
  if (!predictor || predictor === 1) {
    return block;
  }
  for (let i = 0; i < bitsPerSample.length; ++i) {
    if (bitsPerSample[i] % 8 !== 0) {
      throw new Error("When decoding with predictor, only multiple of 8 bits are supported.");
    }
    if (bitsPerSample[i] !== bitsPerSample[0]) {
      throw new Error("When decoding with predictor, all samples must have the same size.");
    }
  }
  const bytesPerSample = bitsPerSample[0] / 8;
  const stride = planarConfiguration === 2 ? 1 : bitsPerSample.length;
  for (let i = 0; i < height; ++i) {
    if (i * stride * width * bytesPerSample >= block.byteLength) {
      break;
    }
    let row;
    if (predictor === 2) {
      switch (bitsPerSample[0]) {
        case 8:
          row = new Uint8Array(block, i * stride * width * bytesPerSample, stride * width * bytesPerSample);
          break;
        case 16:
          row = new Uint16Array(block, i * stride * width * bytesPerSample, stride * width * bytesPerSample / 2);
          break;
        case 32:
          row = new Uint32Array(block, i * stride * width * bytesPerSample, stride * width * bytesPerSample / 4);
          break;
        default:
          throw new Error(`Predictor 2 not allowed with ${bitsPerSample[0]} bits per sample.`);
      }
      decodeRowAcc(row, stride);
    } else if (predictor === 3) {
      row = new Uint8Array(block, i * stride * width * bytesPerSample, stride * width * bytesPerSample);
      decodeRowFloatingPoint(row, stride, bytesPerSample);
    }
  }
  return block;
}
class BaseDecoder {
  constructor(parameters) {
    this.parameters = parameters;
  }
  /**
   * @abstract
   */
  decodeBlock(_buffer) {
    throw new Error("decodeBlock not implemented");
  }
  async decode(buffer2) {
    const decoded = await this.decodeBlock(buffer2);
    const { tileWidth, tileHeight, predictor, bitsPerSample, planarConfiguration } = this.parameters;
    if (predictor !== 1) {
      return applyPredictor(decoded, predictor, tileWidth, tileHeight, bitsPerSample, planarConfiguration);
    }
    return decoded;
  }
}
function getValues(dataSlice, fieldType, count, offset) {
  let values2 = null;
  let readMethod = null;
  const fieldTypeLength = getFieldTypeSize(fieldType);
  switch (fieldType) {
    case fieldTypes.BYTE:
    case fieldTypes.ASCII:
    case fieldTypes.UNDEFINED:
      values2 = new Uint8Array(count);
      readMethod = dataSlice.readUint8;
      break;
    case fieldTypes.SBYTE:
      values2 = new Int8Array(count);
      readMethod = dataSlice.readInt8;
      break;
    case fieldTypes.SHORT:
      values2 = new Uint16Array(count);
      readMethod = dataSlice.readUint16;
      break;
    case fieldTypes.SSHORT:
      values2 = new Int16Array(count);
      readMethod = dataSlice.readInt16;
      break;
    case fieldTypes.LONG:
    case fieldTypes.IFD:
      values2 = new Uint32Array(count);
      readMethod = dataSlice.readUint32;
      break;
    case fieldTypes.SLONG:
      values2 = new Int32Array(count);
      readMethod = dataSlice.readInt32;
      break;
    case fieldTypes.LONG8:
    case fieldTypes.IFD8:
      values2 = new Array(count);
      readMethod = dataSlice.readUint64;
      break;
    case fieldTypes.SLONG8:
      values2 = new Array(count);
      readMethod = dataSlice.readInt64;
      break;
    case fieldTypes.RATIONAL:
      values2 = new Uint32Array(count * 2);
      readMethod = dataSlice.readUint32;
      break;
    case fieldTypes.SRATIONAL:
      values2 = new Int32Array(count * 2);
      readMethod = dataSlice.readInt32;
      break;
    case fieldTypes.FLOAT:
      values2 = new Float32Array(count);
      readMethod = dataSlice.readFloat32;
      break;
    case fieldTypes.DOUBLE:
      values2 = new Float64Array(count);
      readMethod = dataSlice.readFloat64;
      break;
  }
  if (values2 === null || readMethod === null) {
    throw new RangeError(`Invalid field type: ${fieldType}`);
  }
  if (!(fieldType === fieldTypes.RATIONAL || fieldType === fieldTypes.SRATIONAL)) {
    for (let i = 0; i < count; ++i) {
      values2[i] = readMethod.call(dataSlice, offset + i * fieldTypeLength);
    }
  } else {
    for (let i = 0; i < count; i += 2) {
      values2[i] = readMethod.call(dataSlice, offset + i * fieldTypeLength);
      values2[i + 1] = readMethod.call(dataSlice, offset + (i * fieldTypeLength + 4));
    }
  }
  if (fieldType === fieldTypes.ASCII) {
    return new TextDecoder("utf-8").decode(
      /** @type {Uint8Array} */
      values2
    );
  }
  return values2;
}
class GeoTIFFImageIndexError extends Error {
  constructor(index) {
    super(`No image at index ${index}`);
    this.index = index;
  }
}
class GeoTIFFBase {
  /**
   * @param {number} [_index=0] the index of the image to return.
   * @returns {Promise<GeoTIFFImage>} the image at the given index
   */
  async getImage(_index = 0) {
    throw new Error("Not implemented");
  }
  /**
   * @returns {Promise<number>} the number of internal subfile images
   */
  async getImageCount() {
    throw new Error("Not implemented");
  }
  /**
   * @typedef {Object} ReadRastersWindowOptions
   * @property {number} [resX] desired Y resolution (world units per pixel)
   * @property {number} [resY] desired X resolution (world units per pixel)
   * @property {Array<number>} [bbox] the subset to read data from in
   *     geographical coordinates. Whole image if not specified.
   */
  /**
   * (experimental) Reads raster data from the best fitting image. This function uses
   * the image with the lowest resolution that is still a higher resolution than the
   * requested resolution.
   * When specified, the `bbox` option is translated to the `window` option and the
   * `resX` and `resY` to `width` and `height` respectively.
   * Then, the [readRasters]{@link GeoTIFFImage#readRasters} method of the selected
   * image is called and the result returned.
   * @see GeoTIFFImage.readRasters
   * @param {ReadRastersOptions & ReadRastersWindowOptions} options optional parameters
   * @returns {Promise<ReadRasterResult>} the decoded array(s), with `height` and `width`, as a promise
   */
  async readRasters(options = {}) {
    const { window: imageWindow, width, height } = options;
    let { resX, resY, bbox } = options;
    const firstImage = await this.getImage();
    let usedImage = firstImage;
    const imageCount = await this.getImageCount();
    const imgBBox = firstImage.getBoundingBox();
    if (imageWindow && bbox) {
      throw new Error('Both "bbox" and "window" passed.');
    }
    if (width || height) {
      if (imageWindow) {
        const [oX, oY] = firstImage.getOrigin();
        const [rX, rY] = firstImage.getResolution();
        bbox = [
          oX + imageWindow[0] * rX,
          oY + imageWindow[1] * rY,
          oX + imageWindow[2] * rX,
          oY + imageWindow[3] * rY
        ];
      }
      const usedBBox = bbox || imgBBox;
      if (width) {
        if (resX) {
          throw new Error("Both width and resX passed");
        }
        resX = (usedBBox[2] - usedBBox[0]) / width;
      }
      if (height) {
        if (resY) {
          throw new Error("Both width and resY passed");
        }
        resY = (usedBBox[3] - usedBBox[1]) / height;
      }
    }
    if (resX || resY) {
      const allImages = [];
      for (let i = 0; i < imageCount; ++i) {
        const image = await this.getImage(i);
        const subfileType = image.fileDirectory.getValue("SubfileType");
        const newSubfileType = image.fileDirectory.getValue("NewSubfileType");
        if (i === 0 || subfileType === 2 || newSubfileType & 1) {
          allImages.push(image);
        }
      }
      allImages.sort((a, b) => a.getWidth() - b.getWidth());
      for (let i = 0; i < allImages.length; ++i) {
        const image = allImages[i];
        const imgResX = (imgBBox[2] - imgBBox[0]) / image.getWidth();
        const imgResY = (imgBBox[3] - imgBBox[1]) / image.getHeight();
        usedImage = image;
        if (resX && resX > imgResX || resY && resY > imgResY) {
          break;
        }
      }
    }
    let wnd = imageWindow;
    if (bbox) {
      const [oX, oY] = firstImage.getOrigin();
      const [imageResX, imageResY] = usedImage.getResolution(firstImage);
      wnd = [
        Math.round((bbox[0] - oX) / imageResX),
        Math.round((bbox[1] - oY) / imageResY),
        Math.round((bbox[2] - oX) / imageResX),
        Math.round((bbox[3] - oY) / imageResY)
      ];
      wnd = [
        Math.min(wnd[0], wnd[2]),
        Math.min(wnd[1], wnd[3]),
        Math.max(wnd[0], wnd[2]),
        Math.max(wnd[1], wnd[3])
      ];
    }
    return usedImage.readRasters({ ...options, window: wnd });
  }
}
class GeoTIFF extends GeoTIFFBase {
  /**
   * @constructor
   * @param {BaseSource} source The datasource to read from.
   * @param {boolean} littleEndian Whether the image uses little endian.
   * @param {boolean} bigTiff Whether the image uses bigTIFF conventions.
   * @param {number} firstIFDOffset The numeric byte-offset from the start of the image
   *                                to the first IFD.
   * @param {GeoTIFFOptions} [options] further options.
   */
  constructor(source, littleEndian, bigTiff, firstIFDOffset, options = {}) {
    super();
    this.source = source;
    this.parser = new ImageFileDirectoryParser(source, littleEndian, bigTiff, false);
    this.littleEndian = littleEndian;
    this.bigTiff = bigTiff;
    this.firstIFDOffset = firstIFDOffset;
    this.cache = options.cache || false;
    this.ifdRequests = [];
    this.ghostValues = null;
  }
  async getSlice(offset, size) {
    const fallbackSize = this.bigTiff ? 4048 : 1024;
    return new DataSlice((await this.source.fetch([{
      offset,
      length: typeof size !== "undefined" ? size : fallbackSize
    }]))[0], offset, this.littleEndian, this.bigTiff);
  }
  async requestIFD(index) {
    if (this.ifdRequests[index]) {
      return this.ifdRequests[index];
    } else if (index === 0) {
      this.ifdRequests[index] = this.parser.parseFileDirectoryAt(this.firstIFDOffset);
      return this.ifdRequests[index];
    } else if (!this.ifdRequests[index - 1]) {
      try {
        this.ifdRequests[index - 1] = this.requestIFD(index - 1);
      } catch (e) {
        if (e instanceof GeoTIFFImageIndexError) {
          throw new GeoTIFFImageIndexError(index);
        }
        throw e;
      }
    }
    this.ifdRequests[index] = (async () => {
      const previousIfd = await this.ifdRequests[index - 1];
      if (previousIfd.nextIFDByteOffset === 0) {
        throw new GeoTIFFImageIndexError(index);
      }
      return this.parser.parseFileDirectoryAt(previousIfd.nextIFDByteOffset);
    })();
    return this.ifdRequests[index];
  }
  /**
   * Get the n-th internal subfile of an image. By default, the first is returned.
   *
   * @param {number} [index=0] the index of the image to return.
   * @returns {Promise<GeoTIFFImage>} the image at the given index
   */
  async getImage(index = 0) {
    return new GeoTIFFImage(await this.requestIFD(index), this.littleEndian, this.cache, this.source);
  }
  /**
   * Returns the count of the internal subfiles.
   *
   * @returns {Promise<number>} the number of internal subfile images
   */
  async getImageCount() {
    let index = 0;
    let hasNext = true;
    while (hasNext) {
      try {
        await this.requestIFD(index);
        ++index;
      } catch (e) {
        if (e instanceof GeoTIFFImageIndexError) {
          hasNext = false;
        } else {
          throw e;
        }
      }
    }
    return index;
  }
  /**
   * Get the values of the COG ghost area as a parsed map.
   * See https://gdal.org/drivers/raster/cog.html#header-ghost-area for reference
   * @returns {Promise<Object>} the parsed ghost area or null, if no such area was found
   */
  async getGhostValues() {
    const offset = this.bigTiff ? 16 : 8;
    if (this.ghostValues) {
      return this.ghostValues;
    }
    const detectionString = "GDAL_STRUCTURAL_METADATA_SIZE=";
    const heuristicAreaSize = detectionString.length + 100;
    let slice = await this.getSlice(offset, heuristicAreaSize);
    if (detectionString === getValues(slice, fieldTypes.ASCII, detectionString.length, offset)) {
      const valuesString = getValues(slice, fieldTypes.ASCII, heuristicAreaSize, offset);
      const firstLine = valuesString.split("\n")[0];
      const metadataSize = Number(firstLine.split("=")[1].split(" ")[0]) + firstLine.length;
      if (metadataSize > heuristicAreaSize) {
        slice = await this.getSlice(offset, metadataSize);
      }
      const fullString = getValues(slice, fieldTypes.ASCII, metadataSize, offset);
      this.ghostValues = {};
      fullString.split("\n").filter((line) => line.length > 0).map((line) => line.split("=")).forEach(([key, value]) => {
        this.ghostValues[key] = value;
      });
    }
    return this.ghostValues;
  }
  /**
   * Parse a (Geo)TIFF file from the given source.
   *
   * @param {BaseSource} source The source of data to parse from.
   * @param {GeoTIFFOptions} [options] Additional options.
   * @param {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
   *                               to be aborted
   */
  static async fromSource(source, options, signal) {
    const headerData = (await source.fetch([{ offset: 0, length: 1024 }], signal))[0];
    const dataView = new DataView64(headerData);
    const BOM = dataView.getUint16(0, 0);
    let littleEndian;
    if (BOM === 18761) {
      littleEndian = true;
    } else if (BOM === 19789) {
      littleEndian = false;
    } else {
      throw new TypeError("Invalid byte order value.");
    }
    const magicNumber = dataView.getUint16(2, littleEndian);
    let bigTiff;
    if (magicNumber === 42) {
      bigTiff = false;
    } else if (magicNumber === 43) {
      bigTiff = true;
      const offsetByteSize = dataView.getUint16(4, littleEndian);
      if (offsetByteSize !== 8) {
        throw new Error("Unsupported offset byte-size.");
      }
    } else {
      throw new TypeError("Invalid magic number.");
    }
    const firstIFDOffset = bigTiff ? dataView.getUint64(8, littleEndian) : dataView.getUint32(4, littleEndian);
    return new GeoTIFF(source, littleEndian, bigTiff, firstIFDOffset, options);
  }
  /**
   * Closes the underlying file buffer
   * N.B. After the GeoTIFF has been completely processed it needs
   * to be closed but only if it has been constructed from a file.
   */
  close() {
    if (typeof this.source.close === "function") {
      return this.source.close();
    }
    return false;
  }
}
const SENTINEL_BYTES = 64 * 1024;
async function qualifyDesktopTiff(selection, signal, placements) {
  const qualification = await qualifyTiffSources(
    selection.map((source) => ({
      relativePath: source.relativePath,
      encodedBytes: source.identity.sizeBytes,
      explicitPlacement: placements?.[source.relativePath],
      open: (budget, openSignal) => openCountedTiff(source, budget, openSignal)
    })),
    FINITE_TIFF_PROFILE,
    signal
  );
  if (qualification.status !== "supported" || qualification.files.length !== selection.length) {
    throw new Error("The source did not qualify for Uploader.");
  }
  const objects = [];
  for (let index = 0; index < qualification.files.length; index += 1) {
    signal?.throwIfAborted();
    const source = selection[index];
    const facts = qualification.files[index];
    if (!source || !facts || source.relativePath !== facts.relativePath || !isStorageAxes(facts.storageAxes) || !isNormalizedAxes(facts.normalizedAxes)) {
      throw new Error(
        "The qualified TIFF inventory is not supported by the server."
      );
    }
    objects.push({
      ...await originalTiffIdentity(source),
      is_ome: facts.isOme,
      is_bigtiff: facts.isBigTiff,
      series_count: 1,
      series_index: 0,
      dimension_order: facts.dimensionOrder ?? null,
      storage_axes: facts.storageAxes,
      normalized_axes: facts.normalizedAxes,
      shape: facts.shape,
      dtype: facts.dtype,
      compressions: facts.compressions,
      page_count: facts.pageCount,
      decoded_bytes: facts.decodedBytes,
      placement: {
        well_row: facts.placement.wellRow,
        well_column: facts.placement.wellColumn,
        field_index: facts.placement.fieldIndex
      }
    });
  }
  const plan = {
    plan_schema_version: 1,
    storage_layout_version: 1,
    source_kind: "uploader",
    adapter_key: TIFF_UPLOAD_ADAPTER_KEY,
    adapter_version: TIFF_UPLOAD_ADAPTER_VERSION,
    objects
  };
  const containers = new Set(
    qualification.files.map((facts) => facts.isBigTiff ? "BigTIFF" : "TIFF")
  );
  return {
    plan,
    qualifiedFiles: qualification.files,
    review: {
      fileCount: qualification.files.length,
      totalBytes: qualification.totalEncodedBytes,
      container: containers.size === 1 ? containers.values().next().value ?? "TIFF" : "TIFF and BigTIFF"
    }
  };
}
async function originalTiffIdentity(source) {
  const [first, last] = await Promise.all([
    hashRange(source, 0, Math.min(source.identity.sizeBytes, SENTINEL_BYTES)),
    hashRange(
      source,
      Math.max(0, source.identity.sizeBytes - SENTINEL_BYTES),
      Math.min(source.identity.sizeBytes, SENTINEL_BYTES)
    )
  ]);
  return {
    relative_path: source.relativePath,
    size_bytes: source.identity.sizeBytes,
    last_modified_ms: Number(BigInt(source.identity.mtimeNs) / 1000000n),
    first_sentinel_sha256: first,
    last_sentinel_sha256: last
  };
}
async function hashRange(source, offset, length) {
  const buffer2 = await readStructuralRange(source, offset, length);
  return createHash("sha256").update(buffer2).digest("hex");
}
const STORAGE_AXES = /* @__PURE__ */ new Set([
  "yx",
  "yxs",
  "cyx",
  "zyx",
  "zcyx",
  "czyx",
  "tyx",
  "tcyx",
  "tzyx",
  "tzcyx",
  "tczyx"
]);
const NORMALIZED_AXES = /* @__PURE__ */ new Set([
  "yx",
  "cyx",
  "zyx",
  "czyx",
  "tyx",
  "tcyx",
  "tzyx",
  "tczyx"
]);
function isStorageAxes(value) {
  return STORAGE_AXES.has(value);
}
function isNormalizedAxes(value) {
  return NORMALIZED_AXES.has(value);
}
async function openCountedTiff(source, budget, signal) {
  let fetchedBytes = 0;
  const readSlice = async (slice, fetchSignal) => {
    signal?.throwIfAborted();
    fetchSignal?.throwIfAborted();
    const start = slice.offset;
    const requestedLength = slice.length;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedLength) || start < 0 || start >= source.identity.sizeBytes || requestedLength <= 0 || requestedLength > MAX_TIFF_METADATA_SLICE_BYTES) {
      throw new QualificationFailure(
        "resource_limit",
        "The TIFF metadata contains an oversized value."
      );
    }
    const length = Math.min(requestedLength, source.identity.sizeBytes - start);
    fetchedBytes += length;
    if (fetchedBytes > MAX_TIFF_METADATA_BYTES) {
      throw new QualificationFailure(
        "resource_limit",
        "The TIFF metadata exceeds the Uploader inspection limit."
      );
    }
    budget.consume(length);
    const data = await readStructuralRange(source, start, length, signal);
    return data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    );
  };
  const exactSource = {
    fetch: (slices, fetchSignal) => Promise.all(slices.map((slice) => readSlice(slice, fetchSignal))),
    fetchSlice: readSlice,
    get fileSize() {
      return null;
    },
    async close() {
    }
  };
  return GeoTIFF.fromSource(exactSource, void 0, signal);
}
var saxes = {};
var ed5 = {};
var hasRequiredEd5;
function requireEd5() {
  if (hasRequiredEd5) return ed5;
  hasRequiredEd5 = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHAR = "	\n\r -퟿-�𐀀-􏿿";
    exports.S = " 	\r\n";
    exports.NAME_START_CHAR = ":A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
    exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
    exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
    exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
    exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
    exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
    exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
    exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    exports.S_LIST = [SPACE, NL, CR, TAB];
    function isChar(c) {
      return c >= SPACE && c <= 55295 || c === NL || c === CR || c === TAB || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isChar = isChar;
    function isS(c) {
      return c === SPACE || c === NL || c === CR || c === TAB;
    }
    exports.isS = isS;
    function isNameStartChar(c) {
      return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNameStartChar = isNameStartChar;
    function isNameChar(c) {
      return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
    }
    exports.isNameChar = isNameChar;
  })(ed5);
  return ed5;
}
var ed2 = {};
var hasRequiredEd2;
function requireEd2() {
  if (hasRequiredEd2) return ed2;
  hasRequiredEd2 = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHAR = "-퟿-�𐀀-􏿿";
    exports.RESTRICTED_CHAR = "-\b\v\f---";
    exports.S = " 	\r\n";
    exports.NAME_START_CHAR = ":A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
    exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
    exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
    exports.RESTRICTED_CHAR_RE = new RegExp("^[" + exports.RESTRICTED_CHAR + "]$", "u");
    exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
    exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
    exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
    exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
    exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    exports.S_LIST = [SPACE, NL, CR, TAB];
    function isChar(c) {
      return c >= 1 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isChar = isChar;
    function isRestrictedChar(c) {
      return c >= 1 && c <= 8 || c === 11 || c === 12 || c >= 14 && c <= 31 || c >= 127 && c <= 132 || c >= 134 && c <= 159;
    }
    exports.isRestrictedChar = isRestrictedChar;
    function isCharAndNotRestricted(c) {
      return c === 9 || c === 10 || c === 13 || c > 31 && c < 127 || c === 133 || c > 159 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isCharAndNotRestricted = isCharAndNotRestricted;
    function isS(c) {
      return c === SPACE || c === NL || c === CR || c === TAB;
    }
    exports.isS = isS;
    function isNameStartChar(c) {
      return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNameStartChar = isNameStartChar;
    function isNameChar(c) {
      return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
    }
    exports.isNameChar = isNameChar;
  })(ed2);
  return ed2;
}
var ed3 = {};
var hasRequiredEd3;
function requireEd3() {
  if (hasRequiredEd3) return ed3;
  hasRequiredEd3 = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NC_NAME_START_CHAR = "A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
    exports.NC_NAME_CHAR = "-" + exports.NC_NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
    exports.NC_NAME_START_CHAR_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "]$", "u");
    exports.NC_NAME_CHAR_RE = new RegExp("^[" + exports.NC_NAME_CHAR + "]$", "u");
    exports.NC_NAME_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "][" + exports.NC_NAME_CHAR + "]*$", "u");
    function isNCNameStartChar(c) {
      return c >= 65 && c <= 90 || c === 95 || c >= 97 && c <= 122 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8204 && c <= 8205 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNCNameStartChar = isNCNameStartChar;
    function isNCNameChar(c) {
      return isNCNameStartChar(c) || (c === 45 || c === 46 || c >= 48 && c <= 57 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256);
    }
    exports.isNCNameChar = isNCNameChar;
  })(ed3);
  return ed3;
}
var hasRequiredSaxes;
function requireSaxes() {
  if (hasRequiredSaxes) return saxes;
  hasRequiredSaxes = 1;
  Object.defineProperty(saxes, "__esModule", { value: true });
  saxes.SaxesParser = saxes.EVENTS = void 0;
  const ed52 = requireEd5();
  const ed22 = requireEd2();
  const NSed3 = requireEd3();
  var isS = ed52.isS;
  var isChar10 = ed52.isChar;
  var isNameStartChar = ed52.isNameStartChar;
  var isNameChar = ed52.isNameChar;
  var S_LIST = ed52.S_LIST;
  var NAME_RE = ed52.NAME_RE;
  var isChar11 = ed22.isChar;
  var isNCNameStartChar = NSed3.isNCNameStartChar;
  var isNCNameChar = NSed3.isNCNameChar;
  var NC_NAME_RE = NSed3.NC_NAME_RE;
  const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
  const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
  const rootNS = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    __proto__: null,
    xml: XML_NAMESPACE,
    xmlns: XMLNS_NAMESPACE
  };
  const XML_ENTITIES = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    __proto__: null,
    amp: "&",
    gt: ">",
    lt: "<",
    quot: '"',
    apos: "'"
  };
  const EOC = -1;
  const NL_LIKE = -2;
  const S_BEGIN = 0;
  const S_BEGIN_WHITESPACE = 1;
  const S_DOCTYPE = 2;
  const S_DOCTYPE_QUOTE = 3;
  const S_DTD = 4;
  const S_DTD_QUOTED = 5;
  const S_DTD_OPEN_WAKA = 6;
  const S_DTD_OPEN_WAKA_BANG = 7;
  const S_DTD_COMMENT = 8;
  const S_DTD_COMMENT_ENDING = 9;
  const S_DTD_COMMENT_ENDED = 10;
  const S_DTD_PI = 11;
  const S_DTD_PI_ENDING = 12;
  const S_TEXT = 13;
  const S_ENTITY = 14;
  const S_OPEN_WAKA = 15;
  const S_OPEN_WAKA_BANG = 16;
  const S_COMMENT = 17;
  const S_COMMENT_ENDING = 18;
  const S_COMMENT_ENDED = 19;
  const S_CDATA = 20;
  const S_CDATA_ENDING = 21;
  const S_CDATA_ENDING_2 = 22;
  const S_PI_FIRST_CHAR = 23;
  const S_PI_REST = 24;
  const S_PI_BODY = 25;
  const S_PI_ENDING = 26;
  const S_XML_DECL_NAME_START = 27;
  const S_XML_DECL_NAME = 28;
  const S_XML_DECL_EQ = 29;
  const S_XML_DECL_VALUE_START = 30;
  const S_XML_DECL_VALUE = 31;
  const S_XML_DECL_SEPARATOR = 32;
  const S_XML_DECL_ENDING = 33;
  const S_OPEN_TAG = 34;
  const S_OPEN_TAG_SLASH = 35;
  const S_ATTRIB = 36;
  const S_ATTRIB_NAME = 37;
  const S_ATTRIB_NAME_SAW_WHITE = 38;
  const S_ATTRIB_VALUE = 39;
  const S_ATTRIB_VALUE_QUOTED = 40;
  const S_ATTRIB_VALUE_CLOSED = 41;
  const S_ATTRIB_VALUE_UNQUOTED = 42;
  const S_CLOSE_TAG = 43;
  const S_CLOSE_TAG_SAW_WHITE = 44;
  const TAB = 9;
  const NL = 10;
  const CR = 13;
  const SPACE = 32;
  const BANG = 33;
  const DQUOTE = 34;
  const AMP = 38;
  const SQUOTE = 39;
  const MINUS = 45;
  const FORWARD_SLASH = 47;
  const SEMICOLON = 59;
  const LESS = 60;
  const EQUAL = 61;
  const GREATER = 62;
  const QUESTION = 63;
  const OPEN_BRACKET = 91;
  const CLOSE_BRACKET = 93;
  const NEL = 133;
  const LS = 8232;
  const isQuote = (c) => c === DQUOTE || c === SQUOTE;
  const QUOTES = [DQUOTE, SQUOTE];
  const DOCTYPE_TERMINATOR = [...QUOTES, OPEN_BRACKET, GREATER];
  const DTD_TERMINATOR = [...QUOTES, LESS, CLOSE_BRACKET];
  const XML_DECL_NAME_TERMINATOR = [EQUAL, QUESTION, ...S_LIST];
  const ATTRIB_VALUE_UNQUOTED_TERMINATOR = [...S_LIST, GREATER, AMP, LESS];
  function nsPairCheck(parser, prefix, uri) {
    switch (prefix) {
      case "xml":
        if (uri !== XML_NAMESPACE) {
          parser.fail(`xml prefix must be bound to ${XML_NAMESPACE}.`);
        }
        break;
      case "xmlns":
        if (uri !== XMLNS_NAMESPACE) {
          parser.fail(`xmlns prefix must be bound to ${XMLNS_NAMESPACE}.`);
        }
        break;
    }
    switch (uri) {
      case XMLNS_NAMESPACE:
        parser.fail(prefix === "" ? `the default namespace may not be set to ${uri}.` : `may not assign a prefix (even "xmlns") to the URI ${XMLNS_NAMESPACE}.`);
        break;
      case XML_NAMESPACE:
        switch (prefix) {
          case "xml":
            break;
          case "":
            parser.fail(`the default namespace may not be set to ${uri}.`);
            break;
          default:
            parser.fail("may not assign the xml namespace to another prefix.");
        }
        break;
    }
  }
  function nsMappingCheck(parser, mapping) {
    for (const local of Object.keys(mapping)) {
      nsPairCheck(parser, local, mapping[local]);
    }
  }
  const isNCName = (name) => NC_NAME_RE.test(name);
  const isName = (name) => NAME_RE.test(name);
  const FORBIDDEN_START = 0;
  const FORBIDDEN_BRACKET = 1;
  const FORBIDDEN_BRACKET_BRACKET = 2;
  saxes.EVENTS = [
    "xmldecl",
    "text",
    "processinginstruction",
    "doctype",
    "comment",
    "opentagstart",
    "attribute",
    "opentag",
    "closetag",
    "cdata",
    "error",
    "end",
    "ready"
  ];
  const EVENT_NAME_TO_HANDLER_NAME = {
    xmldecl: "xmldeclHandler",
    text: "textHandler",
    processinginstruction: "piHandler",
    doctype: "doctypeHandler",
    comment: "commentHandler",
    opentagstart: "openTagStartHandler",
    attribute: "attributeHandler",
    opentag: "openTagHandler",
    closetag: "closeTagHandler",
    cdata: "cdataHandler",
    error: "errorHandler",
    end: "endHandler",
    ready: "readyHandler"
  };
  class SaxesParser {
    /**
     * @param opt The parser options.
     */
    constructor(opt) {
      this.opt = opt !== null && opt !== void 0 ? opt : {};
      this.fragmentOpt = !!this.opt.fragment;
      const xmlnsOpt = this.xmlnsOpt = !!this.opt.xmlns;
      this.trackPosition = this.opt.position !== false;
      this.fileName = this.opt.fileName;
      if (xmlnsOpt) {
        this.nameStartCheck = isNCNameStartChar;
        this.nameCheck = isNCNameChar;
        this.isName = isNCName;
        this.processAttribs = this.processAttribsNS;
        this.pushAttrib = this.pushAttribNS;
        this.ns = Object.assign({ __proto__: null }, rootNS);
        const additional = this.opt.additionalNamespaces;
        if (additional != null) {
          nsMappingCheck(this, additional);
          Object.assign(this.ns, additional);
        }
      } else {
        this.nameStartCheck = isNameStartChar;
        this.nameCheck = isNameChar;
        this.isName = isName;
        this.processAttribs = this.processAttribsPlain;
        this.pushAttrib = this.pushAttribPlain;
      }
      this.stateTable = [
        /* eslint-disable @typescript-eslint/unbound-method */
        this.sBegin,
        this.sBeginWhitespace,
        this.sDoctype,
        this.sDoctypeQuote,
        this.sDTD,
        this.sDTDQuoted,
        this.sDTDOpenWaka,
        this.sDTDOpenWakaBang,
        this.sDTDComment,
        this.sDTDCommentEnding,
        this.sDTDCommentEnded,
        this.sDTDPI,
        this.sDTDPIEnding,
        this.sText,
        this.sEntity,
        this.sOpenWaka,
        this.sOpenWakaBang,
        this.sComment,
        this.sCommentEnding,
        this.sCommentEnded,
        this.sCData,
        this.sCDataEnding,
        this.sCDataEnding2,
        this.sPIFirstChar,
        this.sPIRest,
        this.sPIBody,
        this.sPIEnding,
        this.sXMLDeclNameStart,
        this.sXMLDeclName,
        this.sXMLDeclEq,
        this.sXMLDeclValueStart,
        this.sXMLDeclValue,
        this.sXMLDeclSeparator,
        this.sXMLDeclEnding,
        this.sOpenTag,
        this.sOpenTagSlash,
        this.sAttrib,
        this.sAttribName,
        this.sAttribNameSawWhite,
        this.sAttribValue,
        this.sAttribValueQuoted,
        this.sAttribValueClosed,
        this.sAttribValueUnquoted,
        this.sCloseTag,
        this.sCloseTagSawWhite
        /* eslint-enable @typescript-eslint/unbound-method */
      ];
      this._init();
    }
    /**
     * Indicates whether or not the parser is closed. If ``true``, wait for
     * the ``ready`` event to write again.
     */
    get closed() {
      return this._closed;
    }
    _init() {
      var _a2;
      this.openWakaBang = "";
      this.text = "";
      this.name = "";
      this.piTarget = "";
      this.entity = "";
      this.q = null;
      this.tags = [];
      this.tag = null;
      this.topNS = null;
      this.chunk = "";
      this.chunkPosition = 0;
      this.i = 0;
      this.prevI = 0;
      this.carriedFromPrevious = void 0;
      this.forbiddenState = FORBIDDEN_START;
      this.attribList = [];
      const { fragmentOpt } = this;
      this.state = fragmentOpt ? S_TEXT : S_BEGIN;
      this.reportedTextBeforeRoot = this.reportedTextAfterRoot = this.closedRoot = this.sawRoot = fragmentOpt;
      this.xmlDeclPossible = !fragmentOpt;
      this.xmlDeclExpects = ["version"];
      this.entityReturnState = void 0;
      let { defaultXMLVersion } = this.opt;
      if (defaultXMLVersion === void 0) {
        if (this.opt.forceXMLVersion === true) {
          throw new Error("forceXMLVersion set but defaultXMLVersion is not set");
        }
        defaultXMLVersion = "1.0";
      }
      this.setXMLVersion(defaultXMLVersion);
      this.positionAtNewLine = 0;
      this.doctype = false;
      this._closed = false;
      this.xmlDecl = {
        version: void 0,
        encoding: void 0,
        standalone: void 0
      };
      this.line = 1;
      this.column = 0;
      this.ENTITIES = Object.create(XML_ENTITIES);
      (_a2 = this.readyHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this);
    }
    /**
     * The stream position the parser is currently looking at. This field is
     * zero-based.
     *
     * This field is not based on counting Unicode characters but is to be
     * interpreted as a plain index into a JavaScript string.
     */
    get position() {
      return this.chunkPosition + this.i;
    }
    /**
     * The column number of the next character to be read by the parser.  *
     * This field is zero-based. (The first column in a line is 0.)
     *
     * This field reports the index at which the next character would be in the
     * line if the line were represented as a JavaScript string.  Note that this
     * *can* be different to a count based on the number of *Unicode characters*
     * due to how JavaScript handles astral plane characters.
     *
     * See [[column]] for a number that corresponds to a count of Unicode
     * characters.
     */
    get columnIndex() {
      return this.position - this.positionAtNewLine;
    }
    /**
     * Set an event listener on an event. The parser supports one handler per
     * event type. If you try to set an event handler over an existing handler,
     * the old handler is silently overwritten.
     *
     * @param name The event to listen to.
     *
     * @param handler The handler to set.
     */
    on(name, handler) {
      this[EVENT_NAME_TO_HANDLER_NAME[name]] = handler;
    }
    /**
     * Unset an event handler.
     *
     * @parma name The event to stop listening to.
     */
    off(name) {
      this[EVENT_NAME_TO_HANDLER_NAME[name]] = void 0;
    }
    /**
     * Make an error object. The error object will have a message that contains
     * the ``fileName`` option passed at the creation of the parser. If position
     * tracking was turned on, it will also have line and column number
     * information.
     *
     * @param message The message describing the error to report.
     *
     * @returns An error object with a properly formatted message.
     */
    makeError(message) {
      var _a2;
      let msg = (_a2 = this.fileName) !== null && _a2 !== void 0 ? _a2 : "";
      if (this.trackPosition) {
        if (msg.length > 0) {
          msg += ":";
        }
        msg += `${this.line}:${this.column}`;
      }
      if (msg.length > 0) {
        msg += ": ";
      }
      return new Error(msg + message);
    }
    /**
     * Report a parsing error. This method is made public so that client code may
     * check for issues that are outside the scope of this project and can report
     * errors.
     *
     * @param message The error to report.
     *
     * @returns this
     */
    fail(message) {
      const err = this.makeError(message);
      const handler = this.errorHandler;
      if (handler === void 0) {
        throw err;
      } else {
        handler(err);
      }
      return this;
    }
    /**
     * Write a XML data to the parser.
     *
     * @param chunk The XML data to write.
     *
     * @returns this
     */
    // We do need object for the type here. Yes, it often causes problems
    // but not in this case.
    write(chunk) {
      if (this.closed) {
        return this.fail("cannot write after close; assign an onready handler.");
      }
      let end = false;
      if (chunk === null) {
        end = true;
        chunk = "";
      } else if (typeof chunk === "object") {
        chunk = chunk.toString();
      }
      if (this.carriedFromPrevious !== void 0) {
        chunk = `${this.carriedFromPrevious}${chunk}`;
        this.carriedFromPrevious = void 0;
      }
      let limit = chunk.length;
      const lastCode = chunk.charCodeAt(limit - 1);
      if (!end && // A trailing CR or surrogate must be carried over to the next
      // chunk.
      (lastCode === CR || lastCode >= 55296 && lastCode <= 56319)) {
        this.carriedFromPrevious = chunk[limit - 1];
        limit--;
        chunk = chunk.slice(0, limit);
      }
      const { stateTable } = this;
      this.chunk = chunk;
      this.i = 0;
      while (this.i < limit) {
        stateTable[this.state].call(this);
      }
      this.chunkPosition += limit;
      return end ? this.end() : this;
    }
    /**
     * Close the current stream. Perform final well-formedness checks and reset
     * the parser tstate.
     *
     * @returns this
     */
    close() {
      return this.write(null);
    }
    /**
     * Get a single code point out of the current chunk. This updates the current
     * position if we do position tracking.
     *
     * This is the algorithm to use for XML 1.0.
     *
     * @returns The character read.
     */
    getCode10() {
      const { chunk, i } = this;
      this.prevI = i;
      this.i = i + 1;
      if (i >= chunk.length) {
        return EOC;
      }
      const code = chunk.charCodeAt(i);
      this.column++;
      if (code < 55296) {
        if (code >= SPACE || code === TAB) {
          return code;
        }
        switch (code) {
          case NL:
            this.line++;
            this.column = 0;
            this.positionAtNewLine = this.position;
            return NL;
          case CR:
            if (chunk.charCodeAt(i + 1) === NL) {
              this.i = i + 2;
            }
            this.line++;
            this.column = 0;
            this.positionAtNewLine = this.position;
            return NL_LIKE;
          default:
            this.fail("disallowed character.");
            return code;
        }
      }
      if (code > 56319) {
        if (!(code >= 57344 && code <= 65533)) {
          this.fail("disallowed character.");
        }
        return code;
      }
      const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
      this.i = i + 2;
      if (final > 1114111) {
        this.fail("disallowed character.");
      }
      return final;
    }
    /**
     * Get a single code point out of the current chunk. This updates the current
     * position if we do position tracking.
     *
     * This is the algorithm to use for XML 1.1.
     *
     * @returns {number} The character read.
     */
    getCode11() {
      const { chunk, i } = this;
      this.prevI = i;
      this.i = i + 1;
      if (i >= chunk.length) {
        return EOC;
      }
      const code = chunk.charCodeAt(i);
      this.column++;
      if (code < 55296) {
        if (code > 31 && code < 127 || code > 159 && code !== LS || code === TAB) {
          return code;
        }
        switch (code) {
          case NL:
            this.line++;
            this.column = 0;
            this.positionAtNewLine = this.position;
            return NL;
          case CR: {
            const next3 = chunk.charCodeAt(i + 1);
            if (next3 === NL || next3 === NEL) {
              this.i = i + 2;
            }
          }
          /* yes, fall through */
          case NEL:
          // 0x85
          case LS:
            this.line++;
            this.column = 0;
            this.positionAtNewLine = this.position;
            return NL_LIKE;
          default:
            this.fail("disallowed character.");
            return code;
        }
      }
      if (code > 56319) {
        if (!(code >= 57344 && code <= 65533)) {
          this.fail("disallowed character.");
        }
        return code;
      }
      const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
      this.i = i + 2;
      if (final > 1114111) {
        this.fail("disallowed character.");
      }
      return final;
    }
    /**
     * Like ``getCode`` but with the return value normalized so that ``NL`` is
     * returned for ``NL_LIKE``.
     */
    getCodeNorm() {
      const c = this.getCode();
      return c === NL_LIKE ? NL : c;
    }
    unget() {
      this.i = this.prevI;
      this.column--;
    }
    /**
     * Capture characters into a buffer until encountering one of a set of
     * characters.
     *
     * @param chars An array of codepoints. Encountering a character in the array
     * ends the capture. (``chars`` may safely contain ``NL``.)
     *
     * @return The character code that made the capture end, or ``EOC`` if we hit
     * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
     * instead.
     */
    captureTo(chars) {
      let { i: start } = this;
      const { chunk } = this;
      while (true) {
        const c = this.getCode();
        const isNLLike = c === NL_LIKE;
        const final = isNLLike ? NL : c;
        if (final === EOC || chars.includes(final)) {
          this.text += chunk.slice(start, this.prevI);
          return final;
        }
        if (isNLLike) {
          this.text += `${chunk.slice(start, this.prevI)}
`;
          start = this.i;
        }
      }
    }
    /**
     * Capture characters into a buffer until encountering a character.
     *
     * @param char The codepoint that ends the capture. **NOTE ``char`` MAY NOT
     * CONTAIN ``NL``.** Passing ``NL`` will result in buggy behavior.
     *
     * @return ``true`` if we ran into the character. Otherwise, we ran into the
     * end of the current chunk.
     */
    captureToChar(char) {
      let { i: start } = this;
      const { chunk } = this;
      while (true) {
        let c = this.getCode();
        switch (c) {
          case NL_LIKE:
            this.text += `${chunk.slice(start, this.prevI)}
`;
            start = this.i;
            c = NL;
            break;
          case EOC:
            this.text += chunk.slice(start);
            return false;
        }
        if (c === char) {
          this.text += chunk.slice(start, this.prevI);
          return true;
        }
      }
    }
    /**
     * Capture characters that satisfy ``isNameChar`` into the ``name`` field of
     * this parser.
     *
     * @return The character code that made the test fail, or ``EOC`` if we hit
     * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
     * instead.
     */
    captureNameChars() {
      const { chunk, i: start } = this;
      while (true) {
        const c = this.getCode();
        if (c === EOC) {
          this.name += chunk.slice(start);
          return EOC;
        }
        if (!isNameChar(c)) {
          this.name += chunk.slice(start, this.prevI);
          return c === NL_LIKE ? NL : c;
        }
      }
    }
    /**
     * Skip white spaces.
     *
     * @return The character that ended the skip, or ``EOC`` if we hit
     * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
     * instead.
     */
    skipSpaces() {
      while (true) {
        const c = this.getCodeNorm();
        if (c === EOC || !isS(c)) {
          return c;
        }
      }
    }
    setXMLVersion(version2) {
      this.currentXMLVersion = version2;
      if (version2 === "1.0") {
        this.isChar = isChar10;
        this.getCode = this.getCode10;
      } else {
        this.isChar = isChar11;
        this.getCode = this.getCode11;
      }
    }
    // STATE ENGINE METHODS
    // This needs to be a state separate from S_BEGIN_WHITESPACE because we want
    // to be sure never to come back to this state later.
    sBegin() {
      if (this.chunk.charCodeAt(0) === 65279) {
        this.i++;
        this.column++;
      }
      this.state = S_BEGIN_WHITESPACE;
    }
    sBeginWhitespace() {
      const iBefore = this.i;
      const c = this.skipSpaces();
      if (this.prevI !== iBefore) {
        this.xmlDeclPossible = false;
      }
      switch (c) {
        case LESS:
          this.state = S_OPEN_WAKA;
          if (this.text.length !== 0) {
            throw new Error("no-empty text at start");
          }
          break;
        case EOC:
          break;
        default:
          this.unget();
          this.state = S_TEXT;
          this.xmlDeclPossible = false;
      }
    }
    sDoctype() {
      var _a2;
      const c = this.captureTo(DOCTYPE_TERMINATOR);
      switch (c) {
        case GREATER: {
          (_a2 = this.doctypeHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, this.text);
          this.text = "";
          this.state = S_TEXT;
          this.doctype = true;
          break;
        }
        case EOC:
          break;
        default:
          this.text += String.fromCodePoint(c);
          if (c === OPEN_BRACKET) {
            this.state = S_DTD;
          } else if (isQuote(c)) {
            this.state = S_DOCTYPE_QUOTE;
            this.q = c;
          }
      }
    }
    sDoctypeQuote() {
      const q = this.q;
      if (this.captureToChar(q)) {
        this.text += String.fromCodePoint(q);
        this.q = null;
        this.state = S_DOCTYPE;
      }
    }
    sDTD() {
      const c = this.captureTo(DTD_TERMINATOR);
      if (c === EOC) {
        return;
      }
      this.text += String.fromCodePoint(c);
      if (c === CLOSE_BRACKET) {
        this.state = S_DOCTYPE;
      } else if (c === LESS) {
        this.state = S_DTD_OPEN_WAKA;
      } else if (isQuote(c)) {
        this.state = S_DTD_QUOTED;
        this.q = c;
      }
    }
    sDTDQuoted() {
      const q = this.q;
      if (this.captureToChar(q)) {
        this.text += String.fromCodePoint(q);
        this.state = S_DTD;
        this.q = null;
      }
    }
    sDTDOpenWaka() {
      const c = this.getCodeNorm();
      this.text += String.fromCodePoint(c);
      switch (c) {
        case BANG:
          this.state = S_DTD_OPEN_WAKA_BANG;
          this.openWakaBang = "";
          break;
        case QUESTION:
          this.state = S_DTD_PI;
          break;
        default:
          this.state = S_DTD;
      }
    }
    sDTDOpenWakaBang() {
      const char = String.fromCodePoint(this.getCodeNorm());
      const owb = this.openWakaBang += char;
      this.text += char;
      if (owb !== "-") {
        this.state = owb === "--" ? S_DTD_COMMENT : S_DTD;
        this.openWakaBang = "";
      }
    }
    sDTDComment() {
      if (this.captureToChar(MINUS)) {
        this.text += "-";
        this.state = S_DTD_COMMENT_ENDING;
      }
    }
    sDTDCommentEnding() {
      const c = this.getCodeNorm();
      this.text += String.fromCodePoint(c);
      this.state = c === MINUS ? S_DTD_COMMENT_ENDED : S_DTD_COMMENT;
    }
    sDTDCommentEnded() {
      const c = this.getCodeNorm();
      this.text += String.fromCodePoint(c);
      if (c === GREATER) {
        this.state = S_DTD;
      } else {
        this.fail("malformed comment.");
        this.state = S_DTD_COMMENT;
      }
    }
    sDTDPI() {
      if (this.captureToChar(QUESTION)) {
        this.text += "?";
        this.state = S_DTD_PI_ENDING;
      }
    }
    sDTDPIEnding() {
      const c = this.getCodeNorm();
      this.text += String.fromCodePoint(c);
      if (c === GREATER) {
        this.state = S_DTD;
      }
    }
    sText() {
      if (this.tags.length !== 0) {
        this.handleTextInRoot();
      } else {
        this.handleTextOutsideRoot();
      }
    }
    sEntity() {
      let { i: start } = this;
      const { chunk } = this;
      loop:
        while (true) {
          switch (this.getCode()) {
            case NL_LIKE:
              this.entity += `${chunk.slice(start, this.prevI)}
`;
              start = this.i;
              break;
            case SEMICOLON: {
              const { entityReturnState } = this;
              const entity = this.entity + chunk.slice(start, this.prevI);
              this.state = entityReturnState;
              let parsed;
              if (entity === "") {
                this.fail("empty entity name.");
                parsed = "&;";
              } else {
                parsed = this.parseEntity(entity);
                this.entity = "";
              }
              if (entityReturnState !== S_TEXT || this.textHandler !== void 0) {
                this.text += parsed;
              }
              break loop;
            }
            case EOC:
              this.entity += chunk.slice(start);
              break loop;
          }
        }
    }
    sOpenWaka() {
      const c = this.getCode();
      if (isNameStartChar(c)) {
        this.state = S_OPEN_TAG;
        this.unget();
        this.xmlDeclPossible = false;
      } else {
        switch (c) {
          case FORWARD_SLASH:
            this.state = S_CLOSE_TAG;
            this.xmlDeclPossible = false;
            break;
          case BANG:
            this.state = S_OPEN_WAKA_BANG;
            this.openWakaBang = "";
            this.xmlDeclPossible = false;
            break;
          case QUESTION:
            this.state = S_PI_FIRST_CHAR;
            break;
          default:
            this.fail("disallowed character in tag name");
            this.state = S_TEXT;
            this.xmlDeclPossible = false;
        }
      }
    }
    sOpenWakaBang() {
      this.openWakaBang += String.fromCodePoint(this.getCodeNorm());
      switch (this.openWakaBang) {
        case "[CDATA[":
          if (!this.sawRoot && !this.reportedTextBeforeRoot) {
            this.fail("text data outside of root node.");
            this.reportedTextBeforeRoot = true;
          }
          if (this.closedRoot && !this.reportedTextAfterRoot) {
            this.fail("text data outside of root node.");
            this.reportedTextAfterRoot = true;
          }
          this.state = S_CDATA;
          this.openWakaBang = "";
          break;
        case "--":
          this.state = S_COMMENT;
          this.openWakaBang = "";
          break;
        case "DOCTYPE":
          this.state = S_DOCTYPE;
          if (this.doctype || this.sawRoot) {
            this.fail("inappropriately located doctype declaration.");
          }
          this.openWakaBang = "";
          break;
        default:
          if (this.openWakaBang.length >= 7) {
            this.fail("incorrect syntax.");
          }
      }
    }
    sComment() {
      if (this.captureToChar(MINUS)) {
        this.state = S_COMMENT_ENDING;
      }
    }
    sCommentEnding() {
      var _a2;
      const c = this.getCodeNorm();
      if (c === MINUS) {
        this.state = S_COMMENT_ENDED;
        (_a2 = this.commentHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, this.text);
        this.text = "";
      } else {
        this.text += `-${String.fromCodePoint(c)}`;
        this.state = S_COMMENT;
      }
    }
    sCommentEnded() {
      const c = this.getCodeNorm();
      if (c !== GREATER) {
        this.fail("malformed comment.");
        this.text += `--${String.fromCodePoint(c)}`;
        this.state = S_COMMENT;
      } else {
        this.state = S_TEXT;
      }
    }
    sCData() {
      if (this.captureToChar(CLOSE_BRACKET)) {
        this.state = S_CDATA_ENDING;
      }
    }
    sCDataEnding() {
      const c = this.getCodeNorm();
      if (c === CLOSE_BRACKET) {
        this.state = S_CDATA_ENDING_2;
      } else {
        this.text += `]${String.fromCodePoint(c)}`;
        this.state = S_CDATA;
      }
    }
    sCDataEnding2() {
      var _a2;
      const c = this.getCodeNorm();
      switch (c) {
        case GREATER: {
          (_a2 = this.cdataHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, this.text);
          this.text = "";
          this.state = S_TEXT;
          break;
        }
        case CLOSE_BRACKET:
          this.text += "]";
          break;
        default:
          this.text += `]]${String.fromCodePoint(c)}`;
          this.state = S_CDATA;
      }
    }
    // We need this separate state to check the first character fo the pi target
    // with this.nameStartCheck which allows less characters than this.nameCheck.
    sPIFirstChar() {
      const c = this.getCodeNorm();
      if (this.nameStartCheck(c)) {
        this.piTarget += String.fromCodePoint(c);
        this.state = S_PI_REST;
      } else if (c === QUESTION || isS(c)) {
        this.fail("processing instruction without a target.");
        this.state = c === QUESTION ? S_PI_ENDING : S_PI_BODY;
      } else {
        this.fail("disallowed character in processing instruction name.");
        this.piTarget += String.fromCodePoint(c);
        this.state = S_PI_REST;
      }
    }
    sPIRest() {
      const { chunk, i: start } = this;
      while (true) {
        const c = this.getCodeNorm();
        if (c === EOC) {
          this.piTarget += chunk.slice(start);
          return;
        }
        if (!this.nameCheck(c)) {
          this.piTarget += chunk.slice(start, this.prevI);
          const isQuestion = c === QUESTION;
          if (isQuestion || isS(c)) {
            if (this.piTarget === "xml") {
              if (!this.xmlDeclPossible) {
                this.fail("an XML declaration must be at the start of the document.");
              }
              this.state = isQuestion ? S_XML_DECL_ENDING : S_XML_DECL_NAME_START;
            } else {
              this.state = isQuestion ? S_PI_ENDING : S_PI_BODY;
            }
          } else {
            this.fail("disallowed character in processing instruction name.");
            this.piTarget += String.fromCodePoint(c);
          }
          break;
        }
      }
    }
    sPIBody() {
      if (this.text.length === 0) {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_PI_ENDING;
        } else if (!isS(c)) {
          this.text = String.fromCodePoint(c);
        }
      } else if (this.captureToChar(QUESTION)) {
        this.state = S_PI_ENDING;
      }
    }
    sPIEnding() {
      var _a2;
      const c = this.getCodeNorm();
      if (c === GREATER) {
        const { piTarget } = this;
        if (piTarget.toLowerCase() === "xml") {
          this.fail("the XML declaration must appear at the start of the document.");
        }
        (_a2 = this.piHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, {
          target: piTarget,
          body: this.text
        });
        this.piTarget = this.text = "";
        this.state = S_TEXT;
      } else if (c === QUESTION) {
        this.text += "?";
      } else {
        this.text += `?${String.fromCodePoint(c)}`;
        this.state = S_PI_BODY;
      }
      this.xmlDeclPossible = false;
    }
    sXMLDeclNameStart() {
      const c = this.skipSpaces();
      if (c === QUESTION) {
        this.state = S_XML_DECL_ENDING;
        return;
      }
      if (c !== EOC) {
        this.state = S_XML_DECL_NAME;
        this.name = String.fromCodePoint(c);
      }
    }
    sXMLDeclName() {
      const c = this.captureTo(XML_DECL_NAME_TERMINATOR);
      if (c === QUESTION) {
        this.state = S_XML_DECL_ENDING;
        this.name += this.text;
        this.text = "";
        this.fail("XML declaration is incomplete.");
        return;
      }
      if (!(isS(c) || c === EQUAL)) {
        return;
      }
      this.name += this.text;
      this.text = "";
      if (!this.xmlDeclExpects.includes(this.name)) {
        switch (this.name.length) {
          case 0:
            this.fail("did not expect any more name/value pairs.");
            break;
          case 1:
            this.fail(`expected the name ${this.xmlDeclExpects[0]}.`);
            break;
          default:
            this.fail(`expected one of ${this.xmlDeclExpects.join(", ")}`);
        }
      }
      this.state = c === EQUAL ? S_XML_DECL_VALUE_START : S_XML_DECL_EQ;
    }
    sXMLDeclEq() {
      const c = this.getCodeNorm();
      if (c === QUESTION) {
        this.state = S_XML_DECL_ENDING;
        this.fail("XML declaration is incomplete.");
        return;
      }
      if (isS(c)) {
        return;
      }
      if (c !== EQUAL) {
        this.fail("value required.");
      }
      this.state = S_XML_DECL_VALUE_START;
    }
    sXMLDeclValueStart() {
      const c = this.getCodeNorm();
      if (c === QUESTION) {
        this.state = S_XML_DECL_ENDING;
        this.fail("XML declaration is incomplete.");
        return;
      }
      if (isS(c)) {
        return;
      }
      if (!isQuote(c)) {
        this.fail("value must be quoted.");
        this.q = SPACE;
      } else {
        this.q = c;
      }
      this.state = S_XML_DECL_VALUE;
    }
    sXMLDeclValue() {
      const c = this.captureTo([this.q, QUESTION]);
      if (c === QUESTION) {
        this.state = S_XML_DECL_ENDING;
        this.text = "";
        this.fail("XML declaration is incomplete.");
        return;
      }
      if (c === EOC) {
        return;
      }
      const value = this.text;
      this.text = "";
      switch (this.name) {
        case "version": {
          this.xmlDeclExpects = ["encoding", "standalone"];
          const version2 = value;
          this.xmlDecl.version = version2;
          if (!/^1\.[0-9]+$/.test(version2)) {
            this.fail("version number must match /^1\\.[0-9]+$/.");
          } else if (!this.opt.forceXMLVersion) {
            this.setXMLVersion(version2);
          }
          break;
        }
        case "encoding":
          if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(value)) {
            this.fail("encoding value must match 	/^[A-Za-z0-9][A-Za-z0-9._-]*$/.");
          }
          this.xmlDeclExpects = ["standalone"];
          this.xmlDecl.encoding = value;
          break;
        case "standalone":
          if (value !== "yes" && value !== "no") {
            this.fail('standalone value must match "yes" or "no".');
          }
          this.xmlDeclExpects = [];
          this.xmlDecl.standalone = value;
          break;
      }
      this.name = "";
      this.state = S_XML_DECL_SEPARATOR;
    }
    sXMLDeclSeparator() {
      const c = this.getCodeNorm();
      if (c === QUESTION) {
        this.state = S_XML_DECL_ENDING;
        return;
      }
      if (!isS(c)) {
        this.fail("whitespace required.");
        this.unget();
      }
      this.state = S_XML_DECL_NAME_START;
    }
    sXMLDeclEnding() {
      var _a2;
      const c = this.getCodeNorm();
      if (c === GREATER) {
        if (this.piTarget !== "xml") {
          this.fail("processing instructions are not allowed before root.");
        } else if (this.name !== "version" && this.xmlDeclExpects.includes("version")) {
          this.fail("XML declaration must contain a version.");
        }
        (_a2 = this.xmldeclHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, this.xmlDecl);
        this.name = "";
        this.piTarget = this.text = "";
        this.state = S_TEXT;
      } else {
        this.fail("The character ? is disallowed anywhere in XML declarations.");
      }
      this.xmlDeclPossible = false;
    }
    sOpenTag() {
      var _a2;
      const c = this.captureNameChars();
      if (c === EOC) {
        return;
      }
      const tag = this.tag = {
        name: this.name,
        attributes: /* @__PURE__ */ Object.create(null)
      };
      this.name = "";
      if (this.xmlnsOpt) {
        this.topNS = tag.ns = /* @__PURE__ */ Object.create(null);
      }
      (_a2 = this.openTagStartHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, tag);
      this.sawRoot = true;
      if (!this.fragmentOpt && this.closedRoot) {
        this.fail("documents may contain only one root.");
      }
      switch (c) {
        case GREATER:
          this.openTag();
          break;
        case FORWARD_SLASH:
          this.state = S_OPEN_TAG_SLASH;
          break;
        default:
          if (!isS(c)) {
            this.fail("disallowed character in tag name.");
          }
          this.state = S_ATTRIB;
      }
    }
    sOpenTagSlash() {
      if (this.getCode() === GREATER) {
        this.openSelfClosingTag();
      } else {
        this.fail("forward-slash in opening tag not followed by >.");
        this.state = S_ATTRIB;
      }
    }
    sAttrib() {
      const c = this.skipSpaces();
      if (c === EOC) {
        return;
      }
      if (isNameStartChar(c)) {
        this.unget();
        this.state = S_ATTRIB_NAME;
      } else if (c === GREATER) {
        this.openTag();
      } else if (c === FORWARD_SLASH) {
        this.state = S_OPEN_TAG_SLASH;
      } else {
        this.fail("disallowed character in attribute name.");
      }
    }
    sAttribName() {
      const c = this.captureNameChars();
      if (c === EQUAL) {
        this.state = S_ATTRIB_VALUE;
      } else if (isS(c)) {
        this.state = S_ATTRIB_NAME_SAW_WHITE;
      } else if (c === GREATER) {
        this.fail("attribute without value.");
        this.pushAttrib(this.name, this.name);
        this.name = this.text = "";
        this.openTag();
      } else if (c !== EOC) {
        this.fail("disallowed character in attribute name.");
      }
    }
    sAttribNameSawWhite() {
      const c = this.skipSpaces();
      switch (c) {
        case EOC:
          return;
        case EQUAL:
          this.state = S_ATTRIB_VALUE;
          break;
        default:
          this.fail("attribute without value.");
          this.text = "";
          this.name = "";
          if (c === GREATER) {
            this.openTag();
          } else if (isNameStartChar(c)) {
            this.unget();
            this.state = S_ATTRIB_NAME;
          } else {
            this.fail("disallowed character in attribute name.");
            this.state = S_ATTRIB;
          }
      }
    }
    sAttribValue() {
      const c = this.getCodeNorm();
      if (isQuote(c)) {
        this.q = c;
        this.state = S_ATTRIB_VALUE_QUOTED;
      } else if (!isS(c)) {
        this.fail("unquoted attribute value.");
        this.state = S_ATTRIB_VALUE_UNQUOTED;
        this.unget();
      }
    }
    sAttribValueQuoted() {
      const { q, chunk } = this;
      let { i: start } = this;
      while (true) {
        switch (this.getCode()) {
          case q:
            this.pushAttrib(this.name, this.text + chunk.slice(start, this.prevI));
            this.name = this.text = "";
            this.q = null;
            this.state = S_ATTRIB_VALUE_CLOSED;
            return;
          case AMP:
            this.text += chunk.slice(start, this.prevI);
            this.state = S_ENTITY;
            this.entityReturnState = S_ATTRIB_VALUE_QUOTED;
            return;
          case NL:
          case NL_LIKE:
          case TAB:
            this.text += `${chunk.slice(start, this.prevI)} `;
            start = this.i;
            break;
          case LESS:
            this.text += chunk.slice(start, this.prevI);
            this.fail("disallowed character.");
            return;
          case EOC:
            this.text += chunk.slice(start);
            return;
        }
      }
    }
    sAttribValueClosed() {
      const c = this.getCodeNorm();
      if (isS(c)) {
        this.state = S_ATTRIB;
      } else if (c === GREATER) {
        this.openTag();
      } else if (c === FORWARD_SLASH) {
        this.state = S_OPEN_TAG_SLASH;
      } else if (isNameStartChar(c)) {
        this.fail("no whitespace between attributes.");
        this.unget();
        this.state = S_ATTRIB_NAME;
      } else {
        this.fail("disallowed character in attribute name.");
      }
    }
    sAttribValueUnquoted() {
      const c = this.captureTo(ATTRIB_VALUE_UNQUOTED_TERMINATOR);
      switch (c) {
        case AMP:
          this.state = S_ENTITY;
          this.entityReturnState = S_ATTRIB_VALUE_UNQUOTED;
          break;
        case LESS:
          this.fail("disallowed character.");
          break;
        case EOC:
          break;
        default:
          if (this.text.includes("]]>")) {
            this.fail('the string "]]>" is disallowed in char data.');
          }
          this.pushAttrib(this.name, this.text);
          this.name = this.text = "";
          if (c === GREATER) {
            this.openTag();
          } else {
            this.state = S_ATTRIB;
          }
      }
    }
    sCloseTag() {
      const c = this.captureNameChars();
      if (c === GREATER) {
        this.closeTag();
      } else if (isS(c)) {
        this.state = S_CLOSE_TAG_SAW_WHITE;
      } else if (c !== EOC) {
        this.fail("disallowed character in closing tag.");
      }
    }
    sCloseTagSawWhite() {
      switch (this.skipSpaces()) {
        case GREATER:
          this.closeTag();
          break;
        case EOC:
          break;
        default:
          this.fail("disallowed character in closing tag.");
      }
    }
    // END OF STATE ENGINE METHODS
    handleTextInRoot() {
      let { i: start, forbiddenState } = this;
      const { chunk, textHandler: handler } = this;
      scanLoop:
        while (true) {
          switch (this.getCode()) {
            case LESS: {
              this.state = S_OPEN_WAKA;
              if (handler !== void 0) {
                const { text } = this;
                const slice = chunk.slice(start, this.prevI);
                if (text.length !== 0) {
                  handler(text + slice);
                  this.text = "";
                } else if (slice.length !== 0) {
                  handler(slice);
                }
              }
              forbiddenState = FORBIDDEN_START;
              break scanLoop;
            }
            case AMP:
              this.state = S_ENTITY;
              this.entityReturnState = S_TEXT;
              if (handler !== void 0) {
                this.text += chunk.slice(start, this.prevI);
              }
              forbiddenState = FORBIDDEN_START;
              break scanLoop;
            case CLOSE_BRACKET:
              switch (forbiddenState) {
                case FORBIDDEN_START:
                  forbiddenState = FORBIDDEN_BRACKET;
                  break;
                case FORBIDDEN_BRACKET:
                  forbiddenState = FORBIDDEN_BRACKET_BRACKET;
                  break;
                case FORBIDDEN_BRACKET_BRACKET:
                  break;
                default:
                  throw new Error("impossible state");
              }
              break;
            case GREATER:
              if (forbiddenState === FORBIDDEN_BRACKET_BRACKET) {
                this.fail('the string "]]>" is disallowed in char data.');
              }
              forbiddenState = FORBIDDEN_START;
              break;
            case NL_LIKE:
              if (handler !== void 0) {
                this.text += `${chunk.slice(start, this.prevI)}
`;
              }
              start = this.i;
              forbiddenState = FORBIDDEN_START;
              break;
            case EOC:
              if (handler !== void 0) {
                this.text += chunk.slice(start);
              }
              break scanLoop;
            default:
              forbiddenState = FORBIDDEN_START;
          }
        }
      this.forbiddenState = forbiddenState;
    }
    handleTextOutsideRoot() {
      let { i: start } = this;
      const { chunk, textHandler: handler } = this;
      let nonSpace = false;
      outRootLoop:
        while (true) {
          const code = this.getCode();
          switch (code) {
            case LESS: {
              this.state = S_OPEN_WAKA;
              if (handler !== void 0) {
                const { text } = this;
                const slice = chunk.slice(start, this.prevI);
                if (text.length !== 0) {
                  handler(text + slice);
                  this.text = "";
                } else if (slice.length !== 0) {
                  handler(slice);
                }
              }
              break outRootLoop;
            }
            case AMP:
              this.state = S_ENTITY;
              this.entityReturnState = S_TEXT;
              if (handler !== void 0) {
                this.text += chunk.slice(start, this.prevI);
              }
              nonSpace = true;
              break outRootLoop;
            case NL_LIKE:
              if (handler !== void 0) {
                this.text += `${chunk.slice(start, this.prevI)}
`;
              }
              start = this.i;
              break;
            case EOC:
              if (handler !== void 0) {
                this.text += chunk.slice(start);
              }
              break outRootLoop;
            default:
              if (!isS(code)) {
                nonSpace = true;
              }
          }
        }
      if (!nonSpace) {
        return;
      }
      if (!this.sawRoot && !this.reportedTextBeforeRoot) {
        this.fail("text data outside of root node.");
        this.reportedTextBeforeRoot = true;
      }
      if (this.closedRoot && !this.reportedTextAfterRoot) {
        this.fail("text data outside of root node.");
        this.reportedTextAfterRoot = true;
      }
    }
    pushAttribNS(name, value) {
      var _a2;
      const { prefix, local } = this.qname(name);
      const attr = { name, prefix, local, value };
      this.attribList.push(attr);
      (_a2 = this.attributeHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, attr);
      if (prefix === "xmlns") {
        const trimmed = value.trim();
        if (this.currentXMLVersion === "1.0" && trimmed === "") {
          this.fail("invalid attempt to undefine prefix in XML 1.0");
        }
        this.topNS[local] = trimmed;
        nsPairCheck(this, local, trimmed);
      } else if (name === "xmlns") {
        const trimmed = value.trim();
        this.topNS[""] = trimmed;
        nsPairCheck(this, "", trimmed);
      }
    }
    pushAttribPlain(name, value) {
      var _a2;
      const attr = { name, value };
      this.attribList.push(attr);
      (_a2 = this.attributeHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, attr);
    }
    /**
     * End parsing. This performs final well-formedness checks and resets the
     * parser to a clean state.
     *
     * @returns this
     */
    end() {
      var _a2, _b;
      if (!this.sawRoot) {
        this.fail("document must contain a root element.");
      }
      const { tags: tags2 } = this;
      while (tags2.length > 0) {
        const tag = tags2.pop();
        this.fail(`unclosed tag: ${tag.name}`);
      }
      if (this.state !== S_BEGIN && this.state !== S_TEXT) {
        this.fail("unexpected end.");
      }
      const { text } = this;
      if (text.length !== 0) {
        (_a2 = this.textHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, text);
        this.text = "";
      }
      this._closed = true;
      (_b = this.endHandler) === null || _b === void 0 ? void 0 : _b.call(this);
      this._init();
      return this;
    }
    /**
     * Resolve a namespace prefix.
     *
     * @param prefix The prefix to resolve.
     *
     * @returns The namespace URI or ``undefined`` if the prefix is not defined.
     */
    resolve(prefix) {
      var _a2, _b;
      let uri = this.topNS[prefix];
      if (uri !== void 0) {
        return uri;
      }
      const { tags: tags2 } = this;
      for (let index = tags2.length - 1; index >= 0; index--) {
        uri = tags2[index].ns[prefix];
        if (uri !== void 0) {
          return uri;
        }
      }
      uri = this.ns[prefix];
      if (uri !== void 0) {
        return uri;
      }
      return (_b = (_a2 = this.opt).resolvePrefix) === null || _b === void 0 ? void 0 : _b.call(_a2, prefix);
    }
    /**
     * Parse a qname into its prefix and local name parts.
     *
     * @param name The name to parse
     *
     * @returns
     */
    qname(name) {
      const colon = name.indexOf(":");
      if (colon === -1) {
        return { prefix: "", local: name };
      }
      const local = name.slice(colon + 1);
      const prefix = name.slice(0, colon);
      if (prefix === "" || local === "" || local.includes(":")) {
        this.fail(`malformed name: ${name}.`);
      }
      return { prefix, local };
    }
    processAttribsNS() {
      var _a2;
      const { attribList } = this;
      const tag = this.tag;
      {
        const { prefix, local } = this.qname(tag.name);
        tag.prefix = prefix;
        tag.local = local;
        const uri = tag.uri = (_a2 = this.resolve(prefix)) !== null && _a2 !== void 0 ? _a2 : "";
        if (prefix !== "") {
          if (prefix === "xmlns") {
            this.fail('tags may not have "xmlns" as prefix.');
          }
          if (uri === "") {
            this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
            tag.uri = prefix;
          }
        }
      }
      if (attribList.length === 0) {
        return;
      }
      const { attributes } = tag;
      const seen = /* @__PURE__ */ new Set();
      for (const attr of attribList) {
        const { name, prefix, local } = attr;
        let uri;
        let eqname;
        if (prefix === "") {
          uri = name === "xmlns" ? XMLNS_NAMESPACE : "";
          eqname = name;
        } else {
          uri = this.resolve(prefix);
          if (uri === void 0) {
            this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
            uri = prefix;
          }
          eqname = `{${uri}}${local}`;
        }
        if (seen.has(eqname)) {
          this.fail(`duplicate attribute: ${eqname}.`);
        }
        seen.add(eqname);
        attr.uri = uri;
        attributes[name] = attr;
      }
      this.attribList = [];
    }
    processAttribsPlain() {
      const { attribList } = this;
      const attributes = this.tag.attributes;
      for (const { name, value } of attribList) {
        if (attributes[name] !== void 0) {
          this.fail(`duplicate attribute: ${name}.`);
        }
        attributes[name] = value;
      }
      this.attribList = [];
    }
    /**
     * Handle a complete open tag. This parser code calls this once it has seen
     * the whole tag. This method checks for well-formeness and then emits
     * ``onopentag``.
     */
    openTag() {
      var _a2;
      this.processAttribs();
      const { tags: tags2 } = this;
      const tag = this.tag;
      tag.isSelfClosing = false;
      (_a2 = this.openTagHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, tag);
      tags2.push(tag);
      this.state = S_TEXT;
      this.name = "";
    }
    /**
     * Handle a complete self-closing tag. This parser code calls this once it has
     * seen the whole tag. This method checks for well-formeness and then emits
     * ``onopentag`` and ``onclosetag``.
     */
    openSelfClosingTag() {
      var _a2, _b, _c;
      this.processAttribs();
      const { tags: tags2 } = this;
      const tag = this.tag;
      tag.isSelfClosing = true;
      (_a2 = this.openTagHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, tag);
      (_b = this.closeTagHandler) === null || _b === void 0 ? void 0 : _b.call(this, tag);
      const top = this.tag = (_c = tags2[tags2.length - 1]) !== null && _c !== void 0 ? _c : null;
      if (top === null) {
        this.closedRoot = true;
      }
      this.state = S_TEXT;
      this.name = "";
    }
    /**
     * Handle a complete close tag. This parser code calls this once it has seen
     * the whole tag. This method checks for well-formeness and then emits
     * ``onclosetag``.
     */
    closeTag() {
      const { tags: tags2, name } = this;
      this.state = S_TEXT;
      this.name = "";
      if (name === "") {
        this.fail("weird empty close tag.");
        this.text += "</>";
        return;
      }
      const handler = this.closeTagHandler;
      let l = tags2.length;
      while (l-- > 0) {
        const tag = this.tag = tags2.pop();
        this.topNS = tag.ns;
        handler === null || handler === void 0 ? void 0 : handler(tag);
        if (tag.name === name) {
          break;
        }
        this.fail("unexpected close tag.");
      }
      if (l === 0) {
        this.closedRoot = true;
      } else if (l < 0) {
        this.fail(`unmatched closing tag: ${name}.`);
        this.text += `</${name}>`;
      }
    }
    /**
     * Resolves an entity. Makes any necessary well-formedness checks.
     *
     * @param entity The entity to resolve.
     *
     * @returns The parsed entity.
     */
    parseEntity(entity) {
      if (entity[0] !== "#") {
        const defined = this.ENTITIES[entity];
        if (defined !== void 0) {
          return defined;
        }
        this.fail(this.isName(entity) ? "undefined entity." : "disallowed character in entity name.");
        return `&${entity};`;
      }
      let num = NaN;
      if (entity[1] === "x" && /^#x[0-9a-f]+$/i.test(entity)) {
        num = parseInt(entity.slice(2), 16);
      } else if (/^#[0-9]+$/.test(entity)) {
        num = parseInt(entity.slice(1), 10);
      }
      if (!this.isChar(num)) {
        this.fail("malformed character entity.");
        return `&${entity};`;
      }
      return String.fromCodePoint(num);
    }
  }
  saxes.SaxesParser = SaxesParser;
  return saxes;
}
requireSaxes();
const MAX_PATH_BYTES = 1024;
const MAX_PATH_DEPTH = 32;
const MAX_SOURCE_ENTRIES = 65536;
const MAX_SOURCE_FILES = 32768;
const MAX_SOURCE_OBJECT_BYTES = 1073741824;
const MAX_SOURCE_SELECTION_BYTES = 14e11;
class SourceChangedError extends Error {
  constructor(message = "The source changed after it was checked.") {
    super(message);
    this.name = "SourceChangedError";
  }
}
class SourceBufferBudget {
  constructor(maximumBytes) {
    this.maximumBytes = maximumBytes;
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) {
      throw new Error("Invalid source buffer ceiling.");
    }
  }
  maximumBytes;
  heldBytes = 0;
  highWaterBytes = 0;
  acquire(bytes) {
    const next3 = this.heldBytes + bytes;
    if (next3 > this.maximumBytes) {
      throw new Error("The source buffer ceiling was exceeded.");
    }
    this.heldBytes = next3;
    this.highWaterBytes = Math.max(this.highWaterBytes, next3);
  }
  release(bytes) {
    this.heldBytes -= bytes;
    if (this.heldBytes < 0)
      throw new Error("Invalid source buffer accounting.");
  }
  snapshot() {
    return {
      heldBytes: this.heldBytes,
      highWaterBytes: this.highWaterBytes
    };
  }
}
async function prepareTiffSelection(selectedPath, options = {}, signal) {
  const selection = path.resolve(selectedPath);
  const info = await lstat(selection, { bigint: true });
  if (info.isSymbolicLink() || !info.isFile() && !info.isDirectory())
    throw new Error("Select a TIFF file or a folder without symbolic links.");
  const excludedPaths = new Set(
    (options.excludedPaths ?? []).map((value) => path.resolve(value))
  );
  const rootPath = info.isFile() ? path.dirname(selection) : selection;
  const inventory = async () => {
    const sources2 = [];
    const traversal = {
      observed: 0,
      excluded: 0,
      totalBytes: 0,
      zarr: false,
      excludedPaths
    };
    if (info.isFile()) {
      const current = await lstat(selection, { bigint: true });
      if (!current.isFile() || current.isSymbolicLink())
        throw new SourceChangedError();
      sources2.push({
        absolutePath: selection,
        relativePath: path.basename(selection).normalize("NFC"),
        identity: identityFromStat(current)
      });
    } else
      await enumerate(
        rootPath,
        "",
        0,
        sources2,
        /* @__PURE__ */ new Set(),
        traversal
      );
    sources2.sort((a, b) => compareStrings(a.relativePath, b.relativePath));
    return { sources: sources2, excluded: traversal.excluded };
  };
  const { sources, excluded } = await inventory();
  const placements = options.placements;
  if (placements && (Object.keys(placements).length !== sources.length || sources.some((source) => !Object.hasOwn(placements, source.relativePath))))
    throw new Error(
      "Placement must name exactly every selected TIFF relative path."
    );
  const result = await qualifyDesktopTiff(sources, signal, options.placements);
  if (!sameSourceInventory(sources, (await inventory()).sources))
    throw new SourceChangedError();
  for (const source of sources) await assertStructuralSourceUnchanged(source);
  return {
    kind: "files",
    rootPath,
    sources,
    plan: result.plan,
    qualifiedFiles: result.qualifiedFiles,
    review: {
      folderName: path.basename(selection),
      ...result.review,
      excludedFileCount: excluded
    }
  };
}
async function enumerate(rootPath, relativeDirectory, depth, sources, normalizedPaths, traversal, signal) {
  const maxDepth = traversal.zarr ? ZARR_V1_CAPS.pathDepth : MAX_PATH_DEPTH;
  if (depth > maxDepth) throw new Error("The source path is too deep.");
  const absoluteDirectory = path.join(rootPath, relativeDirectory);
  const directoryBefore = await lstat(absoluteDirectory, { bigint: true });
  if (directoryBefore.isSymbolicLink() || !directoryBefore.isDirectory()) {
    throw new SourceChangedError(
      "The source directory changed during inventory."
    );
  }
  const entries = [];
  for await (const entry of await opendir(absoluteDirectory)) {
    traversal.observed += 1;
    if (traversal.observed > (traversal.zarr ? ZARR_V1_CAPS.sourceMembers * (ZARR_V1_CAPS.pathDepth + 1) : MAX_SOURCE_ENTRIES)) {
      throw new Error("The source contains too many entries.");
    }
    entries.push(entry);
  }
  entries.sort(
    (a, b) => compareStrings(a.name.normalize("NFC"), b.name.normalize("NFC"))
  );
  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory.replaceAll(path.sep, "/"), entry.name).normalize("NFC");
    if (relativePath === "." || relativePath.startsWith("../") || path.isAbsolute(relativePath) || relativePath.split("/").length > maxDepth || /[\u0000-\u001f\u007f]/.test(relativePath) || Buffer.byteLength(relativePath, "utf8") > MAX_PATH_BYTES) {
      throw new Error("The source contains an invalid path.");
    }
    const absolutePath = path.join(rootPath, ...relativePath.split("/"));
    const info = await lstat(absolutePath, { bigint: true });
    if (info.isSymbolicLink())
      throw new Error("Symbolic links are not supported.");
    if (info.isFile() && traversal.excludedPaths?.has(absolutePath)) {
      traversal.excluded += 1;
      continue;
    }
    if (!traversal.zarr && info.isFile() && isIgnoredPlatformArtifact(relativePath)) {
      traversal.excluded += 1;
      continue;
    }
    const collisionKey = relativePath.toLocaleLowerCase("en-US");
    if (normalizedPaths.has(collisionKey)) {
      throw new Error("The source contains ambiguous file names.");
    }
    normalizedPaths.add(collisionKey);
    if (info.isDirectory()) {
      await enumerate(
        rootPath,
        relativePath,
        depth + 1,
        sources,
        normalizedPaths,
        traversal
      );
      continue;
    }
    if (!info.isFile()) throw new Error("Special files are not supported.");
    if (sources.length >= (traversal.zarr ? 2 * ZARR_V1_CAPS.sourceMembers : MAX_SOURCE_FILES)) {
      throw new Error("The source contains too many files.");
    }
    const identity = identityFromStat(info);
    const excludedRootArtifact = traversal.zarr && !relativePath.includes("/") && isIgnoredPlatformArtifact(relativePath);
    if (!excludedRootArtifact && (identity.sizeBytes < (traversal.zarr ? 0 : 1) || identity.sizeBytes > (traversal.zarr ? ZARR_V1_CAPS.physicalMemberBytes : MAX_SOURCE_OBJECT_BYTES))) {
      throw new Error("The source exceeds the supported member size.");
    }
    const selectionBytes = traversal.totalBytes + (excludedRootArtifact ? 0 : identity.sizeBytes);
    if (!Number.isSafeInteger(selectionBytes) || selectionBytes > (traversal.zarr ? ZARR_V1_CAPS.totalSourceBytes : MAX_SOURCE_SELECTION_BYTES)) {
      throw new Error(
        traversal.zarr ? "The source exceeds the 10 GB OME-Zarr limit." : "The source exceeds the 1.4 TB Uploader limit."
      );
    }
    traversal.totalBytes = selectionBytes;
    sources.push({ absolutePath, relativePath, identity });
  }
  const directoryAfter = await lstat(absoluteDirectory, { bigint: true });
  if (directoryAfter.isSymbolicLink() || !directoryAfter.isDirectory() || !sameIdentity(
    identityFromStat(directoryBefore),
    identityFromStat(directoryAfter)
  )) {
    throw new SourceChangedError(
      "The source directory changed during inventory."
    );
  }
}
function identityFromStat(info) {
  const sizeBytes = Number(info.size);
  if (!Number.isSafeInteger(sizeBytes))
    throw new Error("Source size is unsafe.");
  return {
    device: info.dev.toString(),
    inode: info.ino.toString(),
    sizeBytes,
    mtimeNs: info.mtimeNs.toString()
  };
}
async function assertSourceDirectoriesUnchanged(source) {
  const directories = [];
  let directory = source.absolutePath;
  for (const _component of source.relativePath.split("/")) {
    directory = path.dirname(directory);
    directories.push(directory);
  }
  for (const ancestor of directories.reverse()) {
    const info = await lstat(ancestor, { bigint: true }).catch(() => {
      throw new SourceChangedError();
    });
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw new SourceChangedError();
    }
  }
}
async function openStructuralSource(candidate, bufferBudget) {
  let handle;
  try {
    await assertSourceDirectoriesUnchanged(candidate);
    handle = await open$1(
      candidate.absolutePath,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
    );
  } catch {
    throw new SourceChangedError("The source changed while it was opened.");
  }
  try {
    const current = await handle.stat({ bigint: true });
    if (!current.isFile() || !sameIdentity(identityFromStat(current), candidate.identity)) {
      throw new SourceChangedError("The source changed while it was opened.");
    }
    await assertSourceDirectoriesUnchanged(candidate);
    return {
      ...candidate,
      file: new DescriptorBoundSourceFile(handle, candidate, bufferBudget)
    };
  } catch (error2) {
    await handle.close();
    throw error2;
  }
}
async function readStructuralRange(source, offset, length, signal) {
  const opened = await openStructuralSource(source);
  try {
    return await opened.file.readExact(offset, length, signal);
  } finally {
    await opened.file.close();
  }
}
async function assertStructuralSourceUnchanged(source) {
  const opened = await openStructuralSource(source);
  try {
    await opened.file.assertUnchanged();
  } finally {
    await opened.file.close();
  }
}
class DescriptorBoundSourceFile {
  constructor(handle, source, bufferBudget) {
    this.handle = handle;
    this.source = source;
    this.bufferBudget = bufferBudget;
    this.sizeBytes = source.identity.sizeBytes;
  }
  handle;
  source;
  bufferBudget;
  sizeBytes;
  closePromise;
  async assertUnchanged() {
    try {
      await assertSourceDirectoriesUnchanged(this.source);
      const [currentPath, currentHandle] = await Promise.all([
        lstat(this.source.absolutePath, { bigint: true }),
        this.handle.stat({ bigint: true })
      ]);
      if (currentPath.isSymbolicLink() || !currentPath.isFile() || !currentHandle.isFile() || !sameIdentity(identityFromStat(currentPath), this.source.identity) || !sameIdentity(identityFromStat(currentHandle), this.source.identity)) {
        throw new Error("identity mismatch");
      }
    } catch {
      throw new SourceChangedError();
    }
  }
  async readExact(offset, length, signal) {
    assertRange(offset, length, this.sizeBytes);
    const buffer2 = Buffer.alloc(length);
    let bytesRead = 0;
    while (bytesRead < length) {
      signal?.throwIfAborted();
      const result = await this.handle.read(
        buffer2,
        bytesRead,
        length - bytesRead,
        offset + bytesRead
      );
      if (result.bytesRead === 0) {
        throw new SourceChangedError("The source changed while reading.");
      }
      bytesRead += result.bytesRead;
    }
    return buffer2;
  }
  createRangeStream(offset, length, signal) {
    assertRange(offset, length, this.sizeBytes);
    signal?.throwIfAborted();
    return Readable.from(this.readRange(offset, length, signal), {
      objectMode: false,
      signal
    });
  }
  close() {
    this.closePromise ??= this.handle.close();
    return this.closePromise;
  }
  async *readRange(offset, length, signal) {
    let position = offset;
    const end = offset + length;
    while (position < end) {
      signal?.throwIfAborted();
      const chunk = Buffer.alloc(Math.min(1024 * 1024, end - position));
      this.bufferBudget?.acquire(chunk.byteLength);
      const { bytesRead } = await this.handle.read(chunk, 0, chunk.byteLength, position).catch((error2) => {
        this.bufferBudget?.release(chunk.byteLength);
        throw error2;
      });
      if (bytesRead === 0) {
        this.bufferBudget?.release(chunk.byteLength);
        throw new SourceChangedError("The source changed while reading.");
      }
      position += bytesRead;
      try {
        yield bytesRead === chunk.byteLength ? chunk : chunk.subarray(0, bytesRead);
      } finally {
        this.bufferBudget?.release(chunk.byteLength);
      }
    }
  }
}
function assertRange(offset, length, sizeBytes) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length <= 0 || offset + length > sizeBytes) {
    throw new Error("Invalid source byte range.");
  }
}
function sameIdentity(a, b) {
  return a.device === b.device && a.inode === b.inode && a.sizeBytes === b.sizeBytes && a.mtimeNs === b.mtimeNs;
}
function sameSourceInventory(a, b) {
  return a.length === b.length && a.every(
    (source, index) => source.relativePath === b[index]?.relativePath && sameIdentity(source.identity, b[index].identity)
  );
}
function compareStrings(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
const LOCAL_STORAGE_ORIGIN = "http://localhost:9000";
function isLocalDevelopmentUrl(url2, origin, localDevelopment) {
  return localDevelopment && url2.origin === origin && !url2.username && !url2.password;
}
const UPLOADER_PART_SIZE_BYTES = 64 * 1024 * 1024;
const MAX_PART_ATTEMPTS = 3;
const MULTIPART_CONNECTION_TIMEOUT_MS = 3e4;
const MULTIPART_SOCKET_INACTIVITY_TIMEOUT_MS = 6e4;
class TransferGenerationChangedError extends Error {
}
class MultipartTransportError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = "MultipartTransportError";
  }
}
async function transferOneObject(input) {
  const sizeBytes = input.source.sizeBytes;
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Invalid source size.");
  }
  const partCount = Math.ceil(sizeBytes / UPLOADER_PART_SIZE_BYTES);
  let state = input.initialState ?? await input.api.reconcile(input.uploadId, input.objectId, input.signal);
  assertGeometry(state, partCount, sizeBytes);
  const generation = state.generation;
  let confirmed = confirmedSet(state);
  let sourceHash = createHash("sha256");
  for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
    input.signal?.throwIfAborted();
    await input.source.assertUnchanged();
    const { offset, length } = partGeometry(partNumber, partCount, sizeBytes);
    if (confirmed.has(partNumber)) {
      sourceHash = await hashFileRange(
        input.source,
        offset,
        length,
        sourceHash,
        input.signal
      );
      await input.source.assertUnchanged();
      emitProgress(input, confirmed, partCount);
      continue;
    }
    let completed = false;
    let lease;
    for (let attempt = 1; attempt <= MAX_PART_ATTEMPTS; attempt += 1) {
      input.signal?.throwIfAborted();
      await input.source.assertUnchanged();
      state = await input.api.reconcile(
        input.uploadId,
        input.objectId,
        input.signal
      );
      await input.source.assertUnchanged();
      input.signal?.throwIfAborted();
      assertGeometry(state, partCount, sizeBytes);
      assertGeneration(state, generation);
      confirmed = confirmedSet(state);
      if (confirmed.has(partNumber)) {
        sourceHash = await hashFileRange(
          input.source,
          offset,
          length,
          sourceHash,
          input.signal
        );
        await input.source.assertUnchanged();
        completed = true;
        break;
      }
      if (lease && (lease.generation !== state.generation || leaseExpired(lease.value, (input.now ?? Date.now)()))) {
        lease = void 0;
      }
      if (!lease) {
        state = await input.api.lease(
          input.uploadId,
          input.objectId,
          partNumber,
          input.signal
        );
        assertGeometry(state, partCount, sizeBytes);
        assertGeneration(state, generation);
        lease = {
          value: exactLease(state, partNumber, length),
          generation: state.generation
        };
        if (leaseExpired(lease.value, (input.now ?? Date.now)())) {
          throw new Error("The server returned an expired part lease.");
        }
      }
      await input.source.assertUnchanged();
      const workingHash = sourceHash.copy();
      let partBytesRead = 0;
      const hashingStream = new Transform({
        transform(chunk, _encoding, callback) {
          partBytesRead += chunk.byteLength;
          workingHash.update(chunk);
          callback(null, chunk);
        }
      });
      const fileStream = input.source.createRangeStream(
        offset,
        length,
        input.signal
      );
      fileStream.once("error", (error2) => hashingStream.destroy(error2));
      try {
        const put = await input.transport.put(
          lease.value.upload_url,
          length,
          fileStream.pipe(hashingStream),
          input.signal
        );
        if (partBytesRead !== length)
          throw new Error("The part stream ended early.");
        await input.source.assertUnchanged();
        input.signal?.throwIfAborted();
        state = await input.api.acknowledge(
          input.uploadId,
          input.objectId,
          state.generation,
          partNumber,
          put.etag,
          input.signal
        );
        assertGeometry(state, partCount, sizeBytes);
        assertGeneration(state, generation);
      } catch (error2) {
        fileStream.destroy();
        hashingStream.destroy();
        if (error2 instanceof SourceChangedError) throw error2;
        state = await input.api.reconcile(
          input.uploadId,
          input.objectId,
          input.signal
        );
        assertGeometry(state, partCount, sizeBytes);
        assertGeneration(state, generation);
        confirmed = confirmedSet(state);
        if (confirmed.has(partNumber) && partBytesRead === length) {
          sourceHash = workingHash;
          completed = true;
          break;
        }
        if (attempt === MAX_PART_ATTEMPTS) throw error2;
        continue;
      }
      confirmed = confirmedSet(state);
      if (!confirmed.has(partNumber)) {
        if (attempt === MAX_PART_ATTEMPTS) {
          throw new Error("The provider did not confirm the uploaded part.");
        }
        continue;
      }
      sourceHash = workingHash;
      completed = true;
      break;
    }
    if (!completed) throw new Error("The part could not be confirmed.");
    input.saveCheckpoint({
      generation: state.generation,
      confirmedPartNumbers: [...confirmed].sort((a, b) => a - b)
    });
    emitProgress(input, confirmed, partCount);
  }
  await input.source.assertUnchanged();
  input.signal?.throwIfAborted();
  const sourceSha256 = sourceHash.digest("hex");
  state = await input.api.complete(
    input.uploadId,
    input.objectId,
    state.generation,
    sourceSha256,
    input.signal
  );
  assertGeometry(state, partCount, sizeBytes);
  assertGeneration(state, generation);
  return { sourceSha256, state };
}
class HttpsMultipartTransport {
  constructor(request2, inactivityTimeoutMs = MULTIPART_SOCKET_INACTIVITY_TIMEOUT_MS, connectionTimeoutMs = MULTIPART_CONNECTION_TIMEOUT_MS, localDevelopment = false) {
    this.request = request2;
    this.inactivityTimeoutMs = inactivityTimeoutMs;
    this.connectionTimeoutMs = connectionTimeoutMs;
    this.localDevelopment = localDevelopment;
  }
  request;
  inactivityTimeoutMs;
  connectionTimeoutMs;
  localDevelopment;
  async put(uploadUrl, contentLength, source, signal) {
    const url2 = new URL(uploadUrl);
    const local = isLocalDevelopmentUrl(
      url2,
      LOCAL_STORAGE_ORIGIN,
      this.localDevelopment
    );
    if (!local && url2.protocol !== "https:" || url2.username || url2.password) {
      throw new Error("Multipart upload requires HTTPS.");
    }
    const response = new Promise((resolve, reject) => {
      let settled = false;
      let sourceFailure;
      let connectionTimer;
      const onSourceError = (error2) => {
        sourceFailure = error2 instanceof Error ? error2 : new Error("The source read failed.");
      };
      source.once("error", onSourceError);
      const clearConnectionTimer = () => {
        if (connectionTimer) clearTimeout(connectionTimer);
        connectionTimer = void 0;
      };
      const cleanup = () => {
        clearConnectionTimer();
        source.removeListener("error", onSourceError);
      };
      const rejectOnce = (error2) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error2);
      };
      const resolveOnce = (etag) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ etag });
      };
      const rejectProvider = (message, cause) => {
        rejectOnce(
          cause instanceof MultipartTransportError ? cause : new MultipartTransportError(message, cause)
        );
      };
      const request$2 = (this.request ?? (local ? request : request$1))(
        url2,
        {
          method: "PUT",
          headers: { "Content-Length": String(contentLength) },
          signal
        },
        (result) => {
          clearConnectionTimer();
          result.once("error", (error2) => {
            rejectProvider("The storage provider response failed.", error2);
          });
          result.once("aborted", () => {
            rejectProvider("The storage provider response was interrupted.");
          });
          result.once("end", () => {
            const status = result.statusCode ?? 0;
            const etag = result.headers.etag;
            if (status < 200 || status >= 300 || typeof etag !== "string") {
              rejectProvider("The storage provider rejected the part.");
              return;
            }
            resolveOnce(etag);
          });
          result.resume();
        }
      );
      request$2.once("socket", (socket) => {
        if (local) {
          if (socket.connecting) socket.once("connect", clearConnectionTimer);
          else clearConnectionTimer();
        } else if ("authorized" in socket && socket.authorized) {
          clearConnectionTimer();
        } else {
          socket.once("secureConnect", clearConnectionTimer);
        }
      });
      if (!settled) {
        connectionTimer = setTimeout(() => {
          const error2 = new MultipartTransportError(
            "The storage provider connection timed out."
          );
          rejectOnce(error2);
          request$2.destroy(error2);
        }, this.connectionTimeoutMs);
        connectionTimer.unref();
      }
      request$2.setTimeout(this.inactivityTimeoutMs, () => {
        const error2 = new MultipartTransportError(
          "The storage provider request timed out."
        );
        rejectOnce(error2);
        request$2.destroy(error2);
      });
      request$2.once("error", (error2) => {
        if (sourceFailure) {
          rejectOnce(sourceFailure);
        } else if (error2.name === "AbortError") {
          rejectOnce(error2);
        } else {
          rejectProvider("The storage provider request failed.", error2);
        }
      });
      void pipeline(source, request$2).catch((error2) => {
        if (sourceFailure) {
          rejectOnce(sourceFailure);
        } else if (error2 instanceof Error && error2.name === "AbortError") {
          rejectOnce(error2);
        } else {
          rejectProvider("The storage provider request failed.", error2);
        }
      });
    });
    return response;
  }
}
function exactLease(state, partNumber, length) {
  const lease = state.leases?.find((item) => item.part_number === partNumber);
  if (!lease || lease.content_length !== length || !Number.isFinite(Date.parse(lease.expires_at))) {
    throw new Error("The server returned invalid part geometry.");
  }
  return lease;
}
function leaseExpired(lease, nowMs) {
  return Date.parse(lease.expires_at) <= nowMs;
}
function confirmedSet(state) {
  return new Set(state.confirmed_parts.map((part) => part.part_number));
}
function assertGeometry(state, partCount, sizeBytes) {
  if (state.part_size_bytes !== UPLOADER_PART_SIZE_BYTES || state.part_count !== partCount || state.confirmed_parts.some((part) => {
    const geometry = partGeometry(part.part_number, partCount, sizeBytes);
    return part.size_bytes !== geometry.length;
  })) {
    throw new Error("Server multipart geometry does not match the source.");
  }
}
function assertMultipartStateGeometry(state, sizeBytes) {
  const partCount = Math.ceil(sizeBytes / UPLOADER_PART_SIZE_BYTES);
  assertGeometry(state, partCount, sizeBytes);
  const confirmed = new Set(
    state.confirmed_parts.map((part) => part.part_number)
  );
  const requiresCompleteParts = state.state === "completing" || state.state === "completed" || state.object_status === "uploaded" || state.object_status === "verified";
  if (!Number.isInteger(state.generation) || state.generation < 1 || confirmed.size !== state.confirmed_parts.length || requiresCompleteParts && (confirmed.size !== partCount || Array.from({ length: partCount }, (_, index) => index + 1).some(
    (partNumber) => !confirmed.has(partNumber)
  ))) {
    throw new Error("Server multipart geometry does not match the source.");
  }
}
function assertGeneration(state, expected) {
  if (state.generation !== expected) {
    throw new TransferGenerationChangedError(
      "Multipart generation changed during transfer."
    );
  }
}
function partGeometry(partNumber, partCount, sizeBytes) {
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > partCount) {
    throw new Error("Invalid part number.");
  }
  const offset = (partNumber - 1) * UPLOADER_PART_SIZE_BYTES;
  return {
    offset,
    length: Math.min(UPLOADER_PART_SIZE_BYTES, sizeBytes - offset)
  };
}
async function hashFileRange(source, offset, length, hash, signal) {
  const working = hash.copy();
  let bytesRead = 0;
  const sink = new Transform({
    transform(chunk, _encoding, callback) {
      bytesRead += chunk.byteLength;
      working.update(chunk);
      callback();
    }
  });
  await pipeline(source.createRangeStream(offset, length, signal), sink);
  if (bytesRead !== length)
    throw new SourceChangedError("The source changed while reading.");
  return working;
}
function emitProgress(input, confirmed, partCount) {
  input.onProgress?.({
    uploadedBytes: Math.min(
      input.source.sizeBytes,
      [...confirmed].reduce((total, partNumber) => {
        return total + partGeometry(partNumber, partCount, input.source.sizeBytes).length;
      }, 0)
    ),
    totalBytes: input.source.sizeBytes,
    confirmedParts: confirmed.size,
    partCount
  });
}
const MAX_TRANSFER_SOURCE_BUFFER_BYTES = 384 * 1024 * 1024;
async function transferFiniteTiffFolder(input) {
  assertInventory(input);
  const budget = new SourceBufferBudget(MAX_TRANSFER_SOURCE_BUFFER_BYTES);
  const ledger = /* @__PURE__ */ new Map();
  const queue = [];
  const activeControllers = /* @__PURE__ */ new Map();
  const awaitingServer = /* @__PURE__ */ new Set();
  let nextIndex = 0;
  let stopped = false;
  let firstFailure;
  let terminalFailure;
  let ambiguousAtFailure = /* @__PURE__ */ new Set();
  const sourceMutations = /* @__PURE__ */ new Map();
  let activeWorkers = 0;
  let maximumActiveWorkers = 0;
  const fenceSourceMutations = async (lifecycleInterrupted, complete = /* @__PURE__ */ new Set()) => {
    await Promise.all(
      [...sourceMutations.values()].map(async (mutation) => {
        if (complete.has(mutation.object.objectId)) return;
        try {
          const interrupted = lifecycleInterrupted || input.signal?.aborted;
          await input.onSourceChanged?.(mutation.object, interrupted === true);
        } catch {
        }
      })
    );
  };
  for (const object2 of input.bundle.objects) {
    const server = input.serverObjects[object2.ordinal];
    if (!server) throw new Error("The server inventory is incomplete.");
    const partCount = Math.ceil(object2.sizeBytes / UPLOADER_PART_SIZE_BYTES);
    const complete = server.status === "uploaded" || server.status === "verified";
    ledger.set(object2.objectId, {
      uploadedBytes: complete ? object2.sizeBytes : 0,
      confirmedParts: complete ? partCount : 0,
      partCount,
      complete
    });
    if (server.status === "error") {
      throw new Error("Uploader transfer could not complete.");
    }
    if (!complete) queue.push(object2);
  }
  publishProgress();
  const worker = async () => {
    while (!stopped && !input.signal?.aborted) {
      const object2 = queue[nextIndex];
      nextIndex += 1;
      if (!object2) return;
      const source = input.sources[object2.ordinal];
      if (!source) throw new Error("The local source inventory is incomplete.");
      const controller = new AbortController();
      activeControllers.set(object2.objectId, controller);
      activeWorkers += 1;
      maximumActiveWorkers = Math.max(maximumActiveWorkers, activeWorkers);
      input.onWorkerActivity?.(object2.objectId, true);
      publishMetrics();
      let opened;
      try {
        const signal = input.signal ? AbortSignal.any([input.signal, controller.signal]) : controller.signal;
        const initialState = await input.api.reconcile(
          input.bundle.uploadId,
          object2.objectId,
          signal
        );
        assertMultipartStateGeometry(initialState, object2.sizeBytes);
        input.onReconciled?.(object2, initialState);
        if (multipartFailed(initialState)) {
          const error2 = new Error("Uploader transfer could not complete.");
          terminalFailure ??= error2;
          throw error2;
        }
        const current = ledger.get(object2.objectId);
        if (!current) throw new Error("Transfer progress is unavailable.");
        applyMultipartProgress(current, initialState, object2.sizeBytes);
        if (initialState.object_status === "uploaded" || initialState.object_status === "verified") {
          current.complete = true;
          publishProgress();
          continue;
        }
        if (initialState.state === "completing" || initialState.state === "completed") {
          awaitingServer.add(object2.objectId);
          publishProgress();
          continue;
        }
        publishProgress();
        opened = await openStructuralSource(source, budget);
        const result = await transferOneObject({
          source: opened.file,
          uploadId: input.bundle.uploadId,
          objectId: object2.objectId,
          api: input.api,
          transport: input.transport,
          saveCheckpoint: (checkpoint) => {
            object2.checkpointGeneration = checkpoint.generation;
            object2.confirmedPartNumbers = [...checkpoint.confirmedPartNumbers];
            input.saveCheckpoint(object2, checkpoint);
          },
          onProgress: (progress) => {
            const current2 = ledger.get(object2.objectId);
            if (!current2) throw new Error("Transfer progress is unavailable.");
            current2.uploadedBytes = Math.max(
              current2.uploadedBytes,
              progress.uploadedBytes
            );
            current2.confirmedParts = Math.max(
              current2.confirmedParts,
              progress.confirmedParts
            );
            publishProgress();
            publishMetrics();
          },
          signal,
          initialState
        });
        assertMultipartStateGeometry(result.state, object2.sizeBytes);
        if (multipartFailed(result.state)) {
          const error2 = new Error("Uploader transfer could not complete.");
          terminalFailure ??= error2;
          throw error2;
        }
        const awaitsServer = result.state.object_status === "pending" && (result.state.state === "completing" || result.state.state === "completed");
        if (result.state.object_status !== "uploaded" && result.state.object_status !== "verified" && !awaitsServer) {
          throw new Error("Uploader transfer did not complete the object.");
        }
        const completed = ledger.get(object2.objectId);
        if (!completed) throw new Error("Transfer progress is unavailable.");
        applyMultipartProgress(completed, result.state, object2.sizeBytes);
        completed.complete = !awaitsServer;
        if (awaitsServer) awaitingServer.add(object2.objectId);
        input.onReconciled?.(object2, result.state);
        publishProgress();
      } catch (error2) {
        if (error2 instanceof SourceChangedError) {
          sourceMutations.set(object2.objectId, { object: object2, error: error2 });
        }
        if (!firstFailure && !input.signal?.aborted) {
          firstFailure = { error: error2 };
          stopped = true;
          ambiguousAtFailure = new Set(activeControllers.keys());
          for (const [objectId, active] of activeControllers) {
            if (objectId !== object2.objectId) active.abort();
          }
        }
      } finally {
        activeControllers.delete(object2.objectId);
        activeWorkers -= 1;
        input.onWorkerActivity?.(object2.objectId, false);
        await opened?.file.close().catch(() => void 0);
        publishMetrics();
      }
    }
  };
  await Promise.all([worker(), worker()]);
  if (input.signal?.aborted) {
    await fenceSourceMutations(true);
  }
  input.signal?.throwIfAborted();
  if (firstFailure) {
    const completeAfterDrain = /* @__PURE__ */ new Set();
    for (const object2 of input.bundle.objects) {
      if (!ambiguousAtFailure.has(object2.objectId)) continue;
      try {
        const state = await input.api.reconcile(
          input.bundle.uploadId,
          object2.objectId,
          input.signal
        );
        assertMultipartStateGeometry(state, object2.sizeBytes);
        const current = ledger.get(object2.objectId);
        if (!current) continue;
        applyMultipartProgress(current, state, object2.sizeBytes);
        if (multipartFailed(state)) {
          current.complete = false;
          awaitingServer.delete(object2.objectId);
          terminalFailure ??= new Error(
            "Uploader transfer could not complete."
          );
        } else if (state.object_status === "uploaded" || state.object_status === "verified") {
          current.complete = true;
          completeAfterDrain.add(object2.objectId);
          awaitingServer.delete(object2.objectId);
        } else if (state.object_status === "pending" && (state.state === "completing" || state.state === "completed")) {
          awaitingServer.add(object2.objectId);
        }
        input.onReconciled?.(object2, state);
      } catch {
      }
    }
    if (input.signal?.aborted) {
      await fenceSourceMutations(true, completeAfterDrain);
      input.signal.throwIfAborted();
    }
    publishProgress();
    await fenceSourceMutations(false, completeAfterDrain);
    throw terminalFailure ?? sourceMutations.values().next().value?.error ?? firstFailure.error;
  }
  const metrics = budget.snapshot();
  return {
    highWaterSourceBufferBytes: metrics.highWaterBytes,
    maximumActiveWorkers,
    awaitingServer: awaitingServer.size > 0
  };
  function publishProgress() {
    let uploadedBytes = 0;
    let confirmedParts = 0;
    let partCount = 0;
    let completedFiles = 0;
    for (const object2 of ledger.values()) {
      uploadedBytes += object2.uploadedBytes;
      confirmedParts += object2.confirmedParts;
      partCount += object2.partCount;
      if (object2.complete) completedFiles += 1;
    }
    input.onProgress?.({
      uploadedBytes,
      totalBytes: input.bundle.bytesTotal,
      confirmedParts,
      partCount,
      completedFiles,
      fileCount: input.bundle.objectsTotal
    });
  }
  function publishMetrics() {
    const metrics2 = budget.snapshot();
    input.onMetrics?.({
      activeWorkers,
      maximumActiveWorkers,
      heldSourceBufferBytes: metrics2.heldBytes,
      highWaterSourceBufferBytes: metrics2.highWaterBytes
    });
  }
}
function multipartFailed(state) {
  return state.dataset_status === "failed" || state.object_status === "error" || state.state === "aborted";
}
function assertInventory(input) {
  if (input.sources.length !== input.bundle.objectsTotal || input.serverObjects.length !== input.bundle.objectsTotal) {
    throw new Error("The folder inventory is incomplete.");
  }
  for (let ordinal = 0; ordinal < input.bundle.objectsTotal; ordinal += 1) {
    const hint = input.bundle.objects[ordinal];
    const source = input.sources[ordinal];
    const server = input.serverObjects[ordinal];
    if (!hint || !source || !server || hint.ordinal !== ordinal || server.ordinal !== ordinal || hint.objectId !== server.id || hint.relativePath !== source.relativePath || hint.relativePath !== server.relative_path || hint.sizeBytes !== source.identity.sizeBytes || hint.sizeBytes !== server.size_bytes || Number(BigInt(hint.mtimeNs) / 1000000n) !== server.last_modified_ms || hint.firstSentinelSha256 !== server.first_sentinel_sha256 || hint.lastSentinelSha256 !== server.last_sentinel_sha256) {
      throw new Error("The folder inventory does not match recovery state.");
    }
  }
}
function confirmedBytes(sizeBytes, parts) {
  const partCount = Math.ceil(sizeBytes / UPLOADER_PART_SIZE_BYTES);
  let total = 0;
  for (const partNumber of parts) {
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > partCount) {
      throw new Error("Invalid saved transfer progress.");
    }
    const offset = (partNumber - 1) * UPLOADER_PART_SIZE_BYTES;
    total += Math.min(UPLOADER_PART_SIZE_BYTES, sizeBytes - offset);
  }
  return total;
}
function applyMultipartProgress(ledger, state, sizeBytes) {
  const confirmed = new Set(
    state.confirmed_parts.map((part) => part.part_number)
  );
  const uploadedBytes = confirmedBytes(sizeBytes, confirmed);
  if (ledger.generation !== state.generation) {
    ledger.uploadedBytes = uploadedBytes;
    ledger.confirmedParts = confirmed.size;
  } else {
    ledger.uploadedBytes = Math.max(ledger.uploadedBytes, uploadedBytes);
    ledger.confirmedParts = Math.max(ledger.confirmedParts, confirmed.size);
  }
  ledger.generation = state.generation;
  if (state.object_status === "uploaded" || state.object_status === "verified") {
    ledger.uploadedBytes = sizeBytes;
    ledger.confirmedParts = ledger.partCount;
  }
}
function ensureZarrRecoverySchema(database) {
  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS recovery_zarr_inventory (
        upload_id TEXT PRIMARY KEY REFERENCES recovery_upload(upload_id) ON DELETE CASCADE,
        payload_version INTEGER NOT NULL CHECK (payload_version = 1),
        plan_json TEXT NOT NULL CHECK (length(CAST(plan_json AS BLOB)) <= 8388608),
        source_bytes INTEGER NOT NULL CHECK (source_bytes BETWEEN 0 AND 10000000000)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS recovery_zarr_member (
        upload_id TEXT NOT NULL REFERENCES recovery_zarr_inventory(upload_id) ON DELETE CASCADE,
        member_index INTEGER NOT NULL CHECK (member_index BETWEEN 0 AND 9999),
        relative_path TEXT NOT NULL,
        package_ordinal INTEGER NOT NULL CHECK (package_ordinal BETWEEN 0 AND 63),
        device TEXT NOT NULL, inode TEXT NOT NULL,
        size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 0 AND 268435456),
        mtime_ns TEXT NOT NULL,
        PRIMARY KEY (upload_id, member_index), UNIQUE (upload_id, relative_path)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS recovery_zarr_package (
        upload_id TEXT NOT NULL REFERENCES recovery_zarr_inventory(upload_id) ON DELETE CASCADE,
        object_id TEXT PRIMARY KEY,
        ordinal INTEGER NOT NULL CHECK (ordinal BETWEEN 0 AND 63),
        relative_path TEXT NOT NULL,
        size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 268435456),
        checkpoint_generation INTEGER NOT NULL CHECK (checkpoint_generation > 0),
        confirmed_parts_json TEXT NOT NULL,
        package_sha256 TEXT, member_manifest_json TEXT, member_manifest_digest TEXT,
        UNIQUE (upload_id, ordinal), UNIQUE (upload_id, relative_path),
        CHECK ((package_sha256 IS NULL AND member_manifest_json IS NULL AND member_manifest_digest IS NULL)
          OR (package_sha256 IS NOT NULL AND member_manifest_json IS NOT NULL AND member_manifest_digest IS NOT NULL))
      ) STRICT;
    `);
    database.prepare(
      "SELECT upload_id, payload_version, plan_json, source_bytes FROM recovery_zarr_inventory LIMIT 0"
    ).all();
    database.prepare(
      "SELECT upload_id, member_index, relative_path, package_ordinal, device, inode, size_bytes, mtime_ns FROM recovery_zarr_member LIMIT 0"
    ).all();
    database.prepare(
      "SELECT upload_id, object_id, ordinal, relative_path, size_bytes, checkpoint_generation, confirmed_parts_json, package_sha256, member_manifest_json, member_manifest_digest FROM recovery_zarr_package LIMIT 0"
    ).all();
    for (const [table, parent] of [
      ["recovery_zarr_inventory", "recovery_upload"],
      ["recovery_zarr_member", "recovery_zarr_inventory"],
      ["recovery_zarr_package", "recovery_zarr_inventory"]
    ]) {
      const keys = database.prepare(`PRAGMA foreign_key_list(${table})`).all();
      if (keys.length !== 1 || keys[0].table !== parent || keys[0].from !== "upload_id" || keys[0].to !== "upload_id" || keys[0].on_delete !== "CASCADE")
        throw new Error("Recovery extension ownership is invalid.");
    }
    database.exec("COMMIT");
  } catch (error2) {
    database.exec("ROLLBACK");
    throw error2;
  }
}
function readZarrRecovery(database, envelope) {
  const inventory = database.prepare("SELECT * FROM recovery_zarr_inventory WHERE upload_id = ?").get(envelope.uploadId);
  if (!inventory || typeof inventory.plan_json !== "string")
    throw new Error("Recovery inventory is unavailable.");
  const members2 = database.prepare(
    "SELECT * FROM recovery_zarr_member WHERE upload_id = ? ORDER BY member_index"
  ).all(envelope.uploadId);
  const packages = database.prepare(
    "SELECT * FROM recovery_zarr_package WHERE upload_id = ? ORDER BY ordinal"
  ).all(envelope.uploadId);
  const bundle = {
    ...envelope,
    payloadVersion: inventory.payload_version,
    plan: JSON.parse(inventory.plan_json),
    sourceBytes: inventory.source_bytes,
    members: members2.map((row) => ({
      memberIndex: row.member_index,
      relativePath: row.relative_path,
      packageOrdinal: row.package_ordinal,
      device: row.device,
      inode: row.inode,
      sizeBytes: row.size_bytes,
      mtimeNs: row.mtime_ns
    })),
    packages: packages.map((row) => ({
      objectId: row.object_id,
      ordinal: row.ordinal,
      relativePath: row.relative_path,
      sizeBytes: row.size_bytes,
      checkpointGeneration: row.checkpoint_generation,
      confirmedPartNumbers: JSON.parse(
        row.confirmed_parts_json
      ),
      declaration: row.package_sha256 === null && row.member_manifest_json === null && row.member_manifest_digest === null ? null : {
        package_sha256: row.package_sha256,
        member_manifest: JSON.parse(
          row.member_manifest_json
        ),
        member_manifest_digest: row.member_manifest_digest
      }
    }))
  };
  assertZarrRecovery(bundle);
  return bundle;
}
function writeZarrRecovery(database, bundle) {
  database.prepare("INSERT INTO recovery_zarr_inventory VALUES (?, ?, ?, ?)").run(
    bundle.uploadId,
    bundle.payloadVersion,
    JSON.stringify(bundle.plan),
    bundle.sourceBytes
  );
  const member = database.prepare(
    "INSERT INTO recovery_zarr_member VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const item of bundle.members)
    member.run(
      bundle.uploadId,
      item.memberIndex,
      item.relativePath,
      item.packageOrdinal,
      item.device,
      item.inode,
      item.sizeBytes,
      item.mtimeNs
    );
  const pkg = database.prepare(
    "INSERT INTO recovery_zarr_package VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const item of bundle.packages)
    pkg.run(
      bundle.uploadId,
      item.objectId,
      item.ordinal,
      item.relativePath,
      item.sizeBytes,
      item.checkpointGeneration,
      JSON.stringify(item.confirmedPartNumbers),
      item.declaration?.package_sha256 ?? null,
      item.declaration ? JSON.stringify(item.declaration.member_manifest) : null,
      item.declaration?.member_manifest_digest ?? null
    );
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha = /^[0-9a-f]{64}$/;
function requireHint(condition) {
  if (!condition) throw new Error("Recovery checkpoint is corrupt.");
}
function assertZarrDeclaration(plan, ordinal, declaration) {
  const pkg = plan.packages[ordinal];
  requireHint(
    !!pkg && sha.test(declaration.package_sha256) && sha.test(declaration.member_manifest_digest)
  );
  const manifest = declaration.member_manifest;
  requireHint(
    manifest.format === "carnation-ome-zarr-package-v1" && manifest.members.length === pkg.member_indexes.length
  );
  for (let index = 0; index < manifest.members.length; index++) {
    const member = manifest.members[index];
    const expected = plan.members[pkg.member_indexes[index]];
    requireHint(
      !!expected && member.path === expected.relative_path && member.size === expected.size_bytes && sha.test(member.sha256)
    );
  }
  const encoded = JSON.stringify({
    format: manifest.format,
    members: manifest.members.map((member) => ({
      path: member.path,
      size: member.size,
      sha256: member.sha256
    }))
  });
  requireHint(
    Buffer.byteLength(encoded) === pkg.manifest_bytes && Buffer.byteLength(encoded) <= ZARR_V1_CAPS.manifestBytes && createHash("sha256").update(encoded).digest("hex") === declaration.member_manifest_digest
  );
}
function assertZarrRecovery(bundle) {
  const plan = bundle.plan;
  requireHint(
    uuid.test(bundle.datasetId) && uuid.test(bundle.uploadId) && sha.test(bundle.planDigest) && bundle.sourceRoot.startsWith("/") && bundle.adapterKey === "ome-zarr" && bundle.adapterVersion === 1 && bundle.qualificationJson === null && bundle.payloadVersion === 1 && Number.isSafeInteger(bundle.recoveryUntilMs) && bundle.recoveryUntilMs > 0 && plan.source_kind === "uploader" && plan.adapter_key === "ome-zarr" && plan.adapter_version === 1 && plan.plan_schema_version === 1 && plan.storage_layout_version === 1 && Buffer.byteLength(JSON.stringify(plan)) <= ZARR_V1_CAPS.planBytes && bundle.members.length > 0 && bundle.members.length <= ZARR_V1_CAPS.sourceMembers && bundle.members.length === plan.members.length && bundle.members.length === plan.totals.members && bundle.packages.length > 0 && bundle.packages.length <= ZARR_V1_CAPS.packages && bundle.packages.length === plan.packages.length && bundle.objectsTotal === bundle.packages.length
  );
  const paths = /* @__PURE__ */ new Set();
  let sourceBytes = 0;
  for (const [index, member] of bundle.members.entries()) {
    const expected = plan.members[index];
    requireHint(
      member.memberIndex === index && expected.index === index && member.relativePath === expected.relative_path && member.packageOrdinal === expected.package_index && member.sizeBytes === expected.size_bytes && [member.device, member.inode, member.mtimeNs].every(
        (value) => typeof value === "string" && /^\d+$/.test(value)
      ) && Number(BigInt(member.mtimeNs) / 1000000n) === expected.last_modified_ms && Number.isSafeInteger(member.sizeBytes) && member.sizeBytes >= 0 && member.sizeBytes <= ZARR_V1_CAPS.physicalMemberBytes && !paths.has(member.relativePath) && !member.relativePath.startsWith("/") && !member.relativePath.split("/").includes("..")
    );
    paths.add(member.relativePath);
    sourceBytes += member.sizeBytes;
  }
  requireHint(
    sourceBytes === bundle.sourceBytes && sourceBytes === plan.totals.size_bytes && sourceBytes <= ZARR_V1_CAPS.totalSourceBytes
  );
  const ids = /* @__PURE__ */ new Set();
  const assigned = /* @__PURE__ */ new Set();
  let transportBytes = 0;
  for (const [ordinal, pkg] of bundle.packages.entries()) {
    const expected = plan.packages[ordinal];
    requireHint(
      uuid.test(pkg.objectId) && !ids.has(pkg.objectId) && pkg.ordinal === ordinal && expected.index === ordinal && pkg.relativePath === expected.relative_path && pkg.sizeBytes === expected.size_bytes && Number.isSafeInteger(pkg.sizeBytes) && pkg.sizeBytes > 0 && pkg.sizeBytes <= ZARR_V1_CAPS.packageHardBytes && Number.isSafeInteger(pkg.checkpointGeneration) && pkg.checkpointGeneration > 0 && Array.isArray(pkg.confirmedPartNumbers) && new Set(pkg.confirmedPartNumbers).size === pkg.confirmedPartNumbers.length && pkg.confirmedPartNumbers.every(
        (part) => Number.isInteger(part) && part >= 1 && part <= Math.ceil(pkg.sizeBytes / 67108864)
      ) && (pkg.declaration !== null || pkg.confirmedPartNumbers.length === 0)
    );
    for (const memberIndex of expected.member_indexes) {
      requireHint(
        !assigned.has(memberIndex) && bundle.members[memberIndex]?.packageOrdinal === ordinal
      );
      assigned.add(memberIndex);
    }
    if (pkg.declaration) assertZarrDeclaration(plan, ordinal, pkg.declaration);
    ids.add(pkg.objectId);
    transportBytes += pkg.sizeBytes;
  }
  requireHint(
    assigned.size === bundle.members.length && transportBytes === bundle.bytesTotal
  );
}
const SCHEMA_VERSION = 3;
const PART_SIZE_BYTES = 67108864;
class RecoveryStore {
  constructor(database) {
    this.database = database;
  }
  database;
  static open(filePath) {
    const existed = existsSync(filePath);
    let database;
    let result;
    try {
      database = openDatabase(filePath);
      const version2 = database.prepare("PRAGMA user_version").get();
      if (version2.user_version === 0) createSchema(database);
      else if (version2.user_version === 2) migrateSchema2(database);
      else if (version2.user_version !== SCHEMA_VERSION) {
        database.close();
        throw new Error("Unsupported recovery schema.");
      }
      const store = new RecoveryStore(database);
      store.load();
      result = { store, status: existed ? "ready" : "missing" };
    } catch {
      try {
        database?.close();
      } catch {
      }
      quarantineFile(filePath);
      quarantineFile(`${filePath}-journal`);
      const replacement = openDatabase(filePath);
      createSchema(replacement);
      database = replacement;
      result = { store: new RecoveryStore(replacement), status: "quarantined" };
    }
    try {
      ensureZarrRecoverySchema(database);
    } catch (error2) {
      database.close();
      throw error2;
    }
    return result;
  }
  load() {
    const upload = this.database.prepare("SELECT * FROM recovery_upload WHERE singleton_id = 1").get();
    if (!upload) return void 0;
    if (upload.adapter_key === "ome-zarr") {
      return readZarrRecovery(this.database, {
        datasetId: upload.dataset_id,
        uploadId: upload.upload_id,
        sourceRoot: upload.source_root,
        planDigest: upload.plan_digest,
        adapterKey: "ome-zarr",
        adapterVersion: upload.adapter_version,
        qualificationJson: upload.qualification_json,
        objectsTotal: upload.objects_total,
        bytesTotal: upload.bytes_total,
        recoveryUntilMs: upload.recovery_until_ms
      });
    }
    const rows = this.database.prepare(
      "SELECT * FROM recovery_object WHERE upload_id = ? ORDER BY ordinal"
    ).all(upload.upload_id);
    const objects = rows.map(objectFromRow);
    const bundle = {
      datasetId: upload.dataset_id,
      uploadId: upload.upload_id,
      sourceRoot: upload.source_root,
      planDigest: upload.plan_digest,
      adapterKey: upload.adapter_key,
      adapterVersion: upload.adapter_version,
      qualificationJson: upload.qualification_json,
      objectsTotal: upload.objects_total,
      bytesTotal: upload.bytes_total,
      recoveryUntilMs: upload.recovery_until_ms,
      objects
    };
    assertValidBundle(bundle);
    return bundle;
  }
  loadDeadline() {
    const row = this.database.prepare(
      `
        SELECT upload_id, recovery_until_ms
        FROM recovery_upload
        WHERE singleton_id = 1
      `
    ).get();
    if (!row) return void 0;
    if (!isUuid(row.upload_id) || !Number.isSafeInteger(row.recovery_until_ms) || row.recovery_until_ms <= 0) {
      throw new Error("Recovery checkpoint is corrupt.");
    }
    return {
      uploadId: row.upload_id,
      recoveryUntilMs: row.recovery_until_ms
    };
  }
  replace(bundle) {
    if (bundle.adapterKey === "ome-zarr") assertZarrRecovery(bundle);
    else assertValidBundle(bundle);
    this.transaction(() => {
      const previous = this.load();
      if (previous?.adapterKey === "ome-zarr" && previous.uploadId === bundle.uploadId) {
        if (bundle.adapterKey !== "ome-zarr" || previous.planDigest !== bundle.planDigest || canonicalJson(previous.plan) !== canonicalJson(bundle.plan))
          throw new Error("The frozen recovery plan changed.");
        for (const pkg of previous.packages) {
          const next3 = bundle.packages[pkg.ordinal];
          if (pkg.declaration && (!next3 || pkg.objectId !== next3.objectId || canonicalJson(pkg.declaration) !== canonicalJson(next3.declaration)))
            throw new Error("Package proof changed after confirmation.");
        }
      }
      this.database.prepare("DELETE FROM recovery_upload").run();
      this.database.prepare(
        `
          INSERT INTO recovery_upload (
            singleton_id, dataset_id, upload_id, source_root, plan_digest,
            adapter_key, adapter_version, qualification_json, objects_total,
            bytes_total, recovery_until_ms
          ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        bundle.datasetId,
        bundle.uploadId,
        bundle.sourceRoot,
        bundle.planDigest,
        bundle.adapterKey,
        bundle.adapterVersion,
        bundle.qualificationJson,
        bundle.objectsTotal,
        bundle.bytesTotal,
        bundle.recoveryUntilMs
      );
      if (bundle.adapterKey === "ome-zarr") {
        writeZarrRecovery(this.database, bundle);
        return;
      }
      const insert = this.database.prepare(`
        INSERT INTO recovery_object (
          upload_id, object_id, ordinal, relative_path, device, inode,
          size_bytes, mtime_ns, first_sentinel_sha256,
          last_sentinel_sha256, part_size_bytes, checkpoint_generation,
          confirmed_parts_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const object2 of bundle.objects) {
        insert.run(
          bundle.uploadId,
          object2.objectId,
          object2.ordinal,
          object2.relativePath,
          object2.device,
          object2.inode,
          object2.sizeBytes,
          object2.mtimeNs,
          object2.firstSentinelSha256,
          object2.lastSentinelSha256,
          object2.partSizeBytes,
          object2.checkpointGeneration,
          JSON.stringify(sortedParts(object2.confirmedPartNumbers))
        );
      }
    });
  }
  savePackageDeclaration(uploadId, objectId, declaration) {
    this.transaction(() => {
      const bundle = this.load();
      if (!bundle || bundle.adapterKey !== "ome-zarr" || bundle.uploadId !== uploadId)
        throw new Error("Recovery package is unavailable.");
      const pkg = bundle.packages.find((item) => item.objectId === objectId);
      if (!pkg) throw new Error("Recovery package is unavailable.");
      assertZarrDeclaration(bundle.plan, pkg.ordinal, declaration);
      if (pkg.declaration && canonicalJson(pkg.declaration) !== canonicalJson(declaration))
        throw new Error("Package proof changed after confirmation.");
      this.database.prepare(
        `UPDATE recovery_zarr_package SET package_sha256 = ?, member_manifest_json = ?, member_manifest_digest = ? WHERE upload_id = ? AND object_id = ?`
      ).run(
        declaration.package_sha256,
        JSON.stringify(declaration.member_manifest),
        declaration.member_manifest_digest,
        uploadId,
        objectId
      );
    });
  }
  updateCheckpoint(uploadId, objectId, checkpoint) {
    if (!isUuid(uploadId) || !isUuid(objectId) || !Number.isSafeInteger(checkpoint.generation) || checkpoint.generation < 1) {
      throw new Error("Invalid recovery checkpoint.");
    }
    const confirmed = sortedParts(checkpoint.confirmedPartNumbers);
    if (confirmed.some((part) => !Number.isInteger(part) || part < 1) || new Set(confirmed).size !== confirmed.length) {
      throw new Error("Invalid recovery checkpoint.");
    }
    this.transaction(() => {
      const upload = this.database.prepare(
        "SELECT adapter_key FROM recovery_upload WHERE singleton_id = 1 AND upload_id = ?"
      ).get(uploadId);
      if (!upload) throw new Error("Recovery object is unavailable.");
      const table = upload.adapter_key === "ome-zarr" ? "recovery_zarr_package" : "recovery_object";
      const object2 = this.database.prepare(
        `SELECT size_bytes${table === "recovery_zarr_package" ? ", package_sha256" : ""} FROM ${table} WHERE upload_id = ? AND object_id = ?`
      ).get(uploadId, objectId);
      if (!object2) throw new Error("Recovery object is unavailable.");
      const outside = confirmed.some(
        (part) => part > Math.ceil(object2.size_bytes / PART_SIZE_BYTES)
      );
      if (table === "recovery_zarr_package" && (!object2.package_sha256 || outside))
        throw new Error("Package proof is required for a recovery checkpoint.");
      if (outside) throw new Error("Invalid recovery checkpoint.");
      const result = this.database.prepare(
        `
          UPDATE ${table}
          SET checkpoint_generation = ?, confirmed_parts_json = ?
          WHERE upload_id = ? AND object_id = ?
        `
      ).run(
        checkpoint.generation,
        JSON.stringify(confirmed),
        uploadId,
        objectId
      );
      if (result.changes !== 1) {
        throw new Error("Recovery object is unavailable.");
      }
    });
  }
  updateRecoveryUntil(uploadId, recoveryUntilMs) {
    if (!isUuid(uploadId) || !Number.isSafeInteger(recoveryUntilMs) || recoveryUntilMs <= 0) {
      throw new Error("Invalid recovery deadline.");
    }
    this.transaction(() => {
      const result = this.database.prepare(
        "UPDATE recovery_upload SET recovery_until_ms = ? WHERE upload_id = ?"
      ).run(recoveryUntilMs, uploadId);
      if (result.changes !== 1)
        throw new Error("Recovery upload is unavailable.");
    });
  }
  clear() {
    this.transaction(() => {
      this.database.prepare("DELETE FROM recovery_upload").run();
    });
  }
  close() {
    this.database.close();
  }
  transaction(operation) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      operation();
      this.database.exec("COMMIT");
    } catch (error2) {
      this.database.exec("ROLLBACK");
      throw error2;
    }
  }
}
function objectFromRow(row) {
  let confirmed;
  try {
    confirmed = JSON.parse(row.confirmed_parts_json);
  } catch {
    throw new Error("Recovery checkpoint is corrupt.");
  }
  if (!Array.isArray(confirmed))
    throw new Error("Recovery checkpoint is corrupt.");
  return {
    objectId: row.object_id,
    ordinal: row.ordinal,
    relativePath: row.relative_path,
    device: row.device,
    inode: row.inode,
    sizeBytes: row.size_bytes,
    mtimeNs: row.mtime_ns,
    firstSentinelSha256: row.first_sentinel_sha256,
    lastSentinelSha256: row.last_sentinel_sha256,
    partSizeBytes: row.part_size_bytes,
    checkpointGeneration: row.checkpoint_generation,
    confirmedPartNumbers: confirmed
  };
}
function assertValidBundle(bundle) {
  if (!isUuid(bundle.datasetId) || !isUuid(bundle.uploadId) || typeof bundle.sourceRoot !== "string" || !bundle.sourceRoot.startsWith("/") || !isSha256(bundle.planDigest) || ![
    "tiff",
    "nd2",
    "czi",
    "lif",
    "harmony",
    "imagej-channel-stack",
    "cq1"
  ].includes(bundle.adapterKey) || bundle.adapterVersion !== 1 || ["tiff", "harmony", "imagej-channel-stack", "cq1"].includes(
    bundle.adapterKey
  ) && bundle.qualificationJson !== null || ["nd2", "czi", "lif"].includes(bundle.adapterKey) && !isCanonicalQualificationJson(bundle.qualificationJson) || !Number.isInteger(bundle.objectsTotal) || bundle.objectsTotal < 1 || bundle.objectsTotal > 32768 || !Number.isSafeInteger(bundle.bytesTotal) || bundle.bytesTotal < 1 || bundle.bytesTotal > 14e11 || !Number.isSafeInteger(bundle.recoveryUntilMs) || bundle.recoveryUntilMs <= 0 || bundle.objects.length !== bundle.objectsTotal) {
    throw new Error("Recovery checkpoint is corrupt.");
  }
  const ids = /* @__PURE__ */ new Set();
  const paths = /* @__PURE__ */ new Set();
  let bytesTotal = 0;
  for (let ordinal = 0; ordinal < bundle.objects.length; ordinal += 1) {
    const object2 = bundle.objects[ordinal];
    if (!object2 || !isValidObject(object2, ordinal)) {
      throw new Error("Recovery checkpoint is corrupt.");
    }
    if (ids.has(object2.objectId) || paths.has(object2.relativePath)) {
      throw new Error("Recovery checkpoint is corrupt.");
    }
    ids.add(object2.objectId);
    paths.add(object2.relativePath);
    bytesTotal += object2.sizeBytes;
  }
  if (!Number.isSafeInteger(bytesTotal) || bytesTotal !== bundle.bytesTotal) {
    throw new Error("Recovery checkpoint is corrupt.");
  }
}
function isValidObject(object2, ordinal) {
  const partCount = Math.ceil(object2.sizeBytes / object2.partSizeBytes);
  return isUuid(object2.objectId) && object2.ordinal === ordinal && typeof object2.relativePath === "string" && object2.relativePath.length > 0 && !object2.relativePath.startsWith("/") && !object2.relativePath.split("/").includes("..") && [object2.device, object2.inode, object2.mtimeNs].every(
    (value) => typeof value === "string" && /^\d+$/.test(value)
  ) && Number.isSafeInteger(object2.sizeBytes) && object2.sizeBytes > 0 && object2.sizeBytes <= 1073741824 && isSha256(object2.firstSentinelSha256) && isSha256(object2.lastSentinelSha256) && object2.partSizeBytes === PART_SIZE_BYTES && Number.isSafeInteger(object2.checkpointGeneration) && object2.checkpointGeneration >= 1 && object2.confirmedPartNumbers.every(
    (part) => Number.isInteger(part) && part >= 1 && part <= partCount
  ) && new Set(object2.confirmedPartNumbers).size === object2.confirmedPartNumbers.length;
}
function sortedParts(parts) {
  return [...parts].sort((a, b) => a - b);
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
function isSha256(value) {
  return /^[0-9a-f]{64}$/.test(value);
}
function quarantineFile(filePath) {
  if (existsSync(filePath)) {
    renameSync(filePath, `${filePath}.quarantine-${Date.now()}`);
  }
}
function openDatabase(filePath) {
  const descriptor = openSync(filePath, "a", 384);
  closeSync(descriptor);
  chmodSync(filePath, 384);
  const database = new DatabaseSync(filePath, {
    allowExtension: false,
    defensive: true,
    timeout: 250
  });
  database.exec("PRAGMA journal_mode = DELETE");
  database.exec("PRAGMA synchronous = FULL");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA busy_timeout = 250");
  return database;
}
function createSchema(database) {
  database.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE recovery_upload (
      singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
      dataset_id TEXT NOT NULL,
      upload_id TEXT NOT NULL UNIQUE,
      source_root TEXT NOT NULL,
      plan_digest TEXT NOT NULL,
      adapter_key TEXT NOT NULL,
      adapter_version INTEGER NOT NULL,
      qualification_json TEXT,
      objects_total INTEGER NOT NULL,
      bytes_total INTEGER NOT NULL,
      recovery_until_ms INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE recovery_object (
      upload_id TEXT NOT NULL,
      object_id TEXT PRIMARY KEY,
      ordinal INTEGER NOT NULL,
      relative_path TEXT NOT NULL,
      device TEXT NOT NULL,
      inode TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      mtime_ns TEXT NOT NULL,
      first_sentinel_sha256 TEXT NOT NULL,
      last_sentinel_sha256 TEXT NOT NULL,
      part_size_bytes INTEGER NOT NULL,
      checkpoint_generation INTEGER NOT NULL,
      confirmed_parts_json TEXT NOT NULL,
      UNIQUE (upload_id, ordinal),
      UNIQUE (upload_id, relative_path),
      FOREIGN KEY (upload_id) REFERENCES recovery_upload(upload_id)
        ON DELETE CASCADE
    ) STRICT;
    PRAGMA user_version = ${SCHEMA_VERSION};
    COMMIT;
  `);
}
function migrateSchema2(database) {
  database.exec(`
    BEGIN IMMEDIATE;
    ALTER TABLE recovery_upload
      ADD COLUMN adapter_key TEXT NOT NULL DEFAULT 'tiff';
    ALTER TABLE recovery_upload
      ADD COLUMN adapter_version INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE recovery_upload ADD COLUMN qualification_json TEXT;
    PRAGMA user_version = ${SCHEMA_VERSION};
    COMMIT;
  `);
}
function isCanonicalQualificationJson(value) {
  if (value === null || Buffer.byteLength(value, "utf8") > 256 * 1024)
    return false;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && canonicalJson(parsed) === value;
  } catch {
    return false;
  }
}
function canonicalJson(value) {
  return JSON.stringify(sortJson(value));
}
function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => [key, sortJson(item)])
  );
}
function reviewDigest(review) {
  const {
    receipt: _receipt,
    confirmed: _confirmed,
    mapAttempted: _mapAttempted,
    ...immutable
  } = review;
  return createHash("sha256").update(JSON.stringify(immutable)).digest("hex");
}
function reviewPath(origin, id) {
  return path.join(
    originDirectory(origin),
    "reviews",
    `${identifier(id)}.json`
  );
}
async function saveReview(review) {
  await writePrivate(reviewPath(review.origin, review.id), review);
}
async function loadReview(origin, id, digest) {
  const review = await readPrivate(reviewPath(origin, id));
  if (!review || review.version !== 1 || review.origin !== origin || review.id !== id || reviewDigest(review) !== digest)
    throw new HelperError("review_mismatch");
  return review;
}
async function inspect(origin, selectedPath, datasetName, options = {}) {
  if (!datasetName.trim() || datasetName.length > 255)
    throw new HelperError("invalid_dataset_name");
  let placements;
  if (options.placementFile) {
    const values2 = JSON.parse(
      (await boundedFile(options.placementFile, 1024 * 1024)).toString("utf8")
    );
    if (!values2 || Array.isArray(values2) || typeof values2 !== "object")
      throw new HelperError("invalid_placement_file");
    placements = {};
    for (const [relativePath, value] of Object.entries(values2)) {
      if (!value || Object.keys(value).some(
        (key) => !["well_row", "well_column", "field_index"].includes(key)
      ))
        throw new HelperError("invalid_placement_file");
      placements[relativePath] = {
        wellRow: value.well_row,
        wellColumn: value.well_column,
        fieldIndex: value.field_index
      };
    }
  }
  const excludedPaths = [options.mapFile, options.placementFile].filter((value) => value !== void 0).map((value) => path.resolve(value));
  const prepared = await prepareTiffSelection(selectedPath, {
    excludedPaths,
    placements
  });
  if (prepared.plan.adapter_key !== "tiff")
    throw new HelperError("unsupported_format");
  const plan = { ...prepared.plan };
  if (options.plateFormat) {
    const dimensions = {
      "6": [2, 3],
      "12": [3, 4],
      "24": [4, 6],
      "48": [6, 8],
      "96": [8, 12],
      "384": [16, 24],
      "1536": [32, 48]
    };
    const geometry = dimensions[options.plateFormat];
    if (!geometry || plan.objects.some(
      (object2) => object2.placement.well_row === null || object2.placement.well_column === null || object2.placement.well_row >= geometry[0] || object2.placement.well_column >= geometry[1]
    ))
      throw new HelperError("invalid_plate_geometry");
    plan.plate_geometry = { rows: geometry[0], columns: geometry[1] };
  }
  if (Buffer.byteLength(JSON.stringify(plan)) > 8 * 1024 * 1024 - 2048)
    throw new HelperError("plan_size_limit");
  const review = {
    version: 1,
    id: randomUUID(),
    origin,
    selectedPath: path.resolve(selectedPath),
    excludedPaths,
    placements,
    datasetName,
    prepared: {
      kind: prepared.kind,
      rootPath: prepared.rootPath,
      sources: prepared.sources,
      review: prepared.review
    },
    plan,
    confirmationId: randomUUID(),
    mapFile: options.mapFile ? path.resolve(options.mapFile) : void 0
  };
  const summary = summarizeReview(plan, prepared.qualifiedFiles);
  assertReviewSize(review);
  await saveReview(review);
  const knownWells = new Set(
    plan.objects.filter((object2) => object2.placement.well_row !== null).map(
      (object2) => `${object2.placement.well_row}:${object2.placement.well_column}`
    )
  );
  return {
    review,
    output: {
      review_id: review.id,
      review_digest: reviewDigest(review),
      name: datasetName,
      ...prepared.review,
      adapter: "tiff@1",
      wells: knownWells.size,
      ...summary,
      placement_source: placements ? "explicit" : "filenames_or_unplaced",
      map_requested: !!review.mapFile,
      confirmation_required: true
    }
  };
}
async function revalidateReview(review) {
  const current = await prepareTiffSelection(review.selectedPath, {
    excludedPaths: review.excludedPaths,
    placements: review.placements
  });
  if (JSON.stringify(current.sources) !== JSON.stringify(review.prepared.sources) || JSON.stringify(current.plan) !== JSON.stringify(
    (({ plate_geometry: _geometry, ...plan }) => plan)(review.plan)
  ))
    throw new HelperError("source_changed");
  return current;
}
function assertReviewSize(review) {
  if (Buffer.byteLength(JSON.stringify(review)) > MAX_PRIVATE_STATE_BYTES - 4096)
    throw new HelperError("review_size_limit");
}
function summarizeReview(plan, facts) {
  const scopes = /* @__PURE__ */ new Map();
  for (const object2 of plan.objects) {
    const {
      well_row: wellRow,
      well_column: wellColumn,
      field_index: fieldIndex
    } = object2.placement;
    const key = `${wellRow}:${wellColumn}`;
    const scope = scopes.get(key) ?? {
      well_row: wellRow,
      well_column: wellColumn,
      fields: []
    };
    scope.fields.push(fieldIndex);
    scopes.set(key, scope);
  }
  const ordered = [...scopes.values()].sort(
    (a, b) => (a.well_row ?? -1) - (b.well_row ?? -1) || (a.well_column ?? -1) - (b.well_column ?? -1)
  );
  const unplaced = ordered.find((value) => value.well_row === null);
  const inferred = unplaced ? { rows: 1, columns: 1 } : {
    rows: Math.max(...ordered.map((value) => value.well_row ?? 0)) + 1,
    columns: Math.max(...ordered.map((value) => value.well_column ?? 0)) + 1
  };
  if ((plan.plate_geometry?.rows ?? inferred.rows) * (plan.plate_geometry?.columns ?? inferred.columns) > 1536)
    throw new HelperError("invalid_plate_geometry");
  const profiles = /* @__PURE__ */ new Map();
  for (const file of facts) {
    const profile = {
      shape: file.shape,
      dtype: file.dtype,
      channel_names: file.channelNames,
      channel_names_truncated: file.channelNamesTruncated
    };
    const key = JSON.stringify(profile);
    const existing = profiles.get(key);
    if (existing) existing.files += 1;
    else profiles.set(key, { ...profile, files: 1 });
  }
  return {
    plate_geometry: plan.plate_geometry ?? inferred,
    plate_geometry_source: plan.plate_geometry ? "declared" : unplaced ? "coordinate_less" : "inferred_bounds",
    unplaced_files: unplaced?.fields.length ?? 0,
    well_field_scope: ordered.slice(0, 12).map((value) => ({
      well_row: value.well_row,
      well_column: value.well_column,
      field_count: value.fields.length,
      field_indices: value.fields.sort((a, b) => a - b).slice(0, 12),
      fields_truncated: value.fields.length > 12
    })),
    well_scope_count: ordered.length,
    well_scope_truncated: ordered.length > 12,
    dimension_profiles: [...profiles.values()].slice(0, 12).map((profile) => ({
      ...profile,
      channel_count: profile.shape.c,
      channel_names: profile.channel_names?.slice(0, 12) ?? null,
      channel_names_truncated: profile.channel_names_truncated || (profile.channel_names?.length ?? 0) > 12
    })),
    dimension_profile_count: profiles.size,
    dimension_profiles_truncated: profiles.size > 12
  };
}
async function uploadReviewed(client, review, options) {
  if (!options.confirmed && !review.confirmed)
    throw new HelperError("confirmation_required");
  let prepared = review.receipt ? void 0 : await revalidateReview(review);
  if (!review.confirmed) {
    review.confirmed = true;
    await saveReview(review);
  }
  if (!review.receipt) {
    const preflight = await client.preflight(
      review.confirmationId,
      review.plan
    );
    review.receipt = await client.confirm({
      confirmation_id: review.confirmationId,
      plan_digest: preflight.plan_digest,
      dataset_name: review.datasetName,
      experiment_id: null,
      plan: review.plan
    });
    await saveReview(review);
  }
  const receipt = review.receipt;
  options.onAccepted?.({
    dataset_id: receipt.dataset_id,
    upload_id: receipt.upload_id,
    plan_digest: receipt.plan_digest
  });
  const status = await client.status(receipt.upload_id);
  if (status.dataset_id !== receipt.dataset_id || status.plan_digest !== receipt.plan_digest)
    throw new HelperError("invalid_server_response");
  if (status.dataset_status === "ready" || status.dataset_status === "failed")
    return status;
  prepared ??= await revalidateReview(review);
  const objects = await client.objects(receipt.upload_id);
  if (objects.length !== prepared.sources.length)
    throw new HelperError("invalid_server_response");
  const { store } = RecoveryStore.open(
    `${reviewPath(review.origin, review.id)}.sqlite`
  );
  try {
    let recovery = store.load();
    if (recovery && (recovery.adapterKey !== "tiff" || recovery.uploadId !== receipt.upload_id || recovery.datasetId !== receipt.dataset_id || recovery.planDigest !== receipt.plan_digest))
      throw new HelperError("recovery_mismatch");
    if (!recovery) {
      const bundle = {
        datasetId: receipt.dataset_id,
        uploadId: receipt.upload_id,
        sourceRoot: prepared.rootPath,
        planDigest: receipt.plan_digest,
        adapterKey: "tiff",
        adapterVersion: 1,
        qualificationJson: null,
        objectsTotal: objects.length,
        bytesTotal: review.plan.objects.reduce(
          (sum2, object2) => sum2 + object2.size_bytes,
          0
        ),
        recoveryUntilMs: receipt.recovery_until_ms,
        objects: prepared.sources.map((source, ordinal) => {
          const expected = review.plan.objects[ordinal];
          const actual = objects[ordinal];
          if (!expected || !actual || actual.ordinal !== ordinal || actual.relative_path !== source.relativePath || actual.size_bytes !== source.identity.sizeBytes || actual.first_sentinel_sha256 !== expected.first_sentinel_sha256 || actual.last_sentinel_sha256 !== expected.last_sentinel_sha256)
            throw new HelperError("invalid_server_response");
          return {
            objectId: actual.id,
            ordinal,
            relativePath: source.relativePath,
            device: source.identity.device,
            inode: source.identity.inode,
            sizeBytes: source.identity.sizeBytes,
            mtimeNs: source.identity.mtimeNs,
            firstSentinelSha256: expected.first_sentinel_sha256,
            lastSentinelSha256: expected.last_sentinel_sha256,
            partSizeBytes: UPLOADER_PART_SIZE_BYTES,
            checkpointGeneration: 1,
            confirmedPartNumbers: []
          };
        })
      };
      store.replace(bundle);
      recovery = bundle;
    }
    if (recovery.adapterKey !== "tiff")
      throw new HelperError("recovery_mismatch");
    await transferFiniteTiffFolder({
      bundle: recovery,
      sources: prepared.sources,
      serverObjects: objects,
      api: client,
      transport: options.transport ?? new HttpsMultipartTransport(),
      signal: options.signal,
      onProgress: options.progress,
      saveCheckpoint: (object2, checkpoint) => store.updateCheckpoint(receipt.upload_id, object2.objectId, checkpoint),
      onSourceChanged: (object2) => client.sourceChanged(receipt.upload_id, object2.objectId)
    });
  } finally {
    store.close();
  }
  return client.status(receipt.upload_id);
}
class MapImportFailure extends HelperError {
  constructor(code, importId) {
    super(code);
    this.importId = importId;
  }
  importId;
}
async function importMap(client, origin, datasetId, filename, fetcher = fetch) {
  const bytes = await boundedFile(filename, 25 * 1024 * 1024);
  const extension = path.extname(filename).toLowerCase();
  const kinds = {
    ".csv": ["csv", "text/csv"],
    ".xlsx": [
      "xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ],
    ".png": ["image", "image/png"],
    ".jpg": ["image", "image/jpeg"],
    ".jpeg": ["image", "image/jpeg"],
    ".pdf": ["document", "application/pdf"],
    ".docx": [
      "document",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ],
    ".zip": ["bundle", "application/zip"],
    ".txt": ["prose", "text/plain"],
    ".md": ["prose", "text/plain"]
  };
  const kind = kinds[extension];
  if (!kind) throw new HelperError("unsupported_map_source");
  if (kind[0] === "prose" && bytes.length > 2 * 1024 * 1024)
    throw new HelperError("source_size_limit");
  const base = `/datasets/${identifier(datasetId)}/treatment-map/imports`;
  const body = kind[0] === "prose" ? {
    source_type: "prose",
    prose: new TextDecoder("utf8", {
      fatal: true,
      ignoreBOM: true
    }).decode(bytes),
    canonical_csv: false
  } : {
    source_type: kind[0],
    filename: path.basename(filename),
    size_bytes: bytes.length,
    content_type: kind[1],
    canonical_csv: false
  };
  const created = await client.request(base, "POST", body);
  if (!created.import || !isUuid$1(created.import.id) || created.import.dataset_id !== datasetId)
    throw new HelperError("map_create_outcome_unknown");
  try {
    if (kind[0] !== "prose") {
      if (!created.upload_url)
        throw new HelperError("map_create_outcome_unknown");
      const target = new URL(created.upload_url);
      if (target.protocol !== "https:" || target.username || target.password || target.hash || target.origin === origin)
        throw new HelperError("invalid_storage_destination");
      let response;
      try {
        response = await fetcher(target, {
          method: "PUT",
          headers: {
            "Content-Type": created.content_type,
            "Content-Length": String(bytes.length)
          },
          body: new Uint8Array(bytes),
          redirect: "error",
          signal: AbortSignal.timeout(12e4)
        });
      } catch {
        throw new HelperError("map_upload_outcome_unknown");
      }
      if (!response.ok) throw new HelperError("map_upload_failed");
    }
    const settled = await client.request(
      `${base}/${created.import.id}/complete`,
      "POST"
    );
    const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
    if (settled.id !== created.import.id || settled.dataset_id !== datasetId || settled.source_sha256 && settled.source_sha256 !== sourceSha256)
      throw new HelperError("invalid_server_response");
    return { import: settled, local_source_sha256: sourceSha256 };
  } catch (error2) {
    throw new MapImportFailure(
      error2 instanceof HelperError ? error2.code : "map_import_failed",
      created.import.id
    );
  }
}
const HELP = `Carnation local upload helper (Node 24)
login | logout [--origin https://public-api.carnation.bio]
inspect --source FILE_OR_FOLDER --name NAME [--placements FILE.json] [--plate-format 96] [--map-file FILE]
upload --review UUID --digest SHA256 --confirmed
resume --review UUID --digest SHA256
status --upload UUID
import-map --dataset UUID --map-file FILE

Placement JSON names every selected relative TIFF path with zero-based well_row, well_column, field_index.
Inspection is local. Upload requires the exact review digest and explicit confirmation. Map imports remain drafts.
`;
async function main(argv) {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "help") {
    process.stdout.write(HELP);
    return;
  }
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new HelperError("node_24_required");
  const command = argv[0];
  const { values: values2 } = parseArgs({
    args: argv.slice(1),
    options: {
      origin: { type: "string" },
      source: { type: "string" },
      name: { type: "string" },
      placements: { type: "string" },
      "plate-format": { type: "string" },
      "map-file": { type: "string" },
      review: { type: "string" },
      digest: { type: "string" },
      confirmed: { type: "boolean" },
      upload: { type: "string" },
      dataset: { type: "string" }
    }
  });
  const origin = canonicalOrigin(
    values2.origin ?? "https://public-api.carnation.bio"
  );
  const required2 = (value) => {
    if (!value) throw new HelperError("missing_argument");
    return value;
  };
  const output = (value) => process.stdout.write(`${JSON.stringify(value)}
`);
  if (command === "inspect") {
    const result = await inspect(
      origin,
      required2(values2.source),
      required2(values2.name),
      {
        placementFile: values2.placements,
        plateFormat: values2["plate-format"],
        mapFile: values2["map-file"]
      }
    );
    output(result.output);
    return;
  }
  const auth2 = new HelperAuth(origin);
  const client = new PublicClient(auth2);
  if (command === "login") {
    await auth2.login();
    output({ status: "authorized", resource: `${origin}/v1` });
    return;
  }
  if (command === "logout") {
    await auth2.logout();
    output({ status: "disconnected" });
    return;
  }
  if (command === "status") {
    output(await client.status(identifier(required2(values2.upload))));
    return;
  }
  if (command === "import-map") {
    output(
      await importMap(
        client,
        origin,
        identifier(required2(values2.dataset)),
        required2(values2["map-file"])
      )
    );
    return;
  }
  if (command === "upload" || command === "resume") {
    const reviewId = identifier(required2(values2.review));
    const digest = required2(values2.digest);
    if (command === "upload" && values2.confirmed !== true)
      throw new HelperError("confirmation_required");
    await withPrivateLock(`${reviewPath(origin, reviewId)}.lock`, async () => {
      const review = await loadReview(origin, reviewId, digest);
      if (command === "resume" && !review.confirmed)
        throw new HelperError("confirmation_required");
      const controller = new AbortController();
      const stop = () => controller.abort(new HelperError("transfer_paused"));
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
      let lastMilestone = -1;
      try {
        const result = await uploadReviewed(client, review, {
          confirmed: values2.confirmed === true,
          signal: controller.signal,
          onAccepted: (receipt) => output({ status: "accepted", ...receipt }),
          progress: (value) => {
            const progress = value;
            const milestone = Math.floor(progress.uploadedBytes / progress.totalBytes * 4) * 25;
            if (milestone !== lastMilestone) {
              lastMilestone = milestone;
              output({ transfer_percent: milestone });
            }
          }
        });
        output(result);
        if (review.mapFile && !review.mapAttempted) {
          review.mapAttempted = true;
          await saveReview(review);
          try {
            output(
              await importMap(
                client,
                origin,
                result.dataset_id,
                review.mapFile
              )
            );
          } catch (error2) {
            output({
              dataset_id: result.dataset_id,
              map_error: error2 instanceof HelperError ? error2.code : "map_import_failed",
              import_id: error2 instanceof MapImportFailure ? error2.importId : void 0,
              map_saved: false
            });
          }
        }
      } finally {
        process.removeListener("SIGINT", stop);
        process.removeListener("SIGTERM", stop);
      }
    });
    return;
  }
  throw new HelperError("unknown_command");
}
void main(process.argv.slice(2)).catch((error2) => {
  process.stderr.write(
    `${JSON.stringify({ error: error2 instanceof HelperError ? error2.code : error2 instanceof SourceChangedError ? "source_changed" : "helper_failed", import_id: error2 instanceof MapImportFailure ? error2.importId : void 0 })}
`
  );
  process.exitCode = 1;
});
class RawDecoder extends BaseDecoder {
  decodeBlock(buffer2) {
    return buffer2;
  }
}
const raw = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: RawDecoder
}, Symbol.toStringTag, { value: "Module" }));
const MIN_BITS = 9;
const CLEAR_CODE = 256;
const EOI_CODE = 257;
const MAX_BYTELENGTH = 12;
function getByte(array2, position, length) {
  const d = position % 8;
  const a = Math.floor(position / 8);
  const de = 8 - d;
  const ef = position + length - (a + 1) * 8;
  let fg = 8 * (a + 2) - (position + length);
  const dg = (a + 2) * 8 - position;
  fg = Math.max(0, fg);
  if (a >= array2.length) {
    console.warn("ran off the end of the buffer before finding EOI_CODE (end on input code)");
    return EOI_CODE;
  }
  let chunk1 = array2[a] & 2 ** (8 - d) - 1;
  chunk1 <<= length - de;
  let chunks = chunk1;
  if (a + 1 < array2.length) {
    let chunk2 = array2[a + 1] >>> fg;
    chunk2 <<= Math.max(0, length - dg);
    chunks += chunk2;
  }
  if (ef > 8 && a + 2 < array2.length) {
    const hi = (a + 3) * 8 - (position + length);
    const chunk3 = array2[a + 2] >>> hi;
    chunks += chunk3;
  }
  return chunks;
}
function appendReversed(dest, source) {
  for (let i = source.length - 1; i >= 0; i--) {
    dest.push(source[i]);
  }
  return dest;
}
function decompress(input) {
  const dictionaryIndex = new Uint16Array(4093);
  const dictionaryChar = new Uint8Array(4093);
  for (let i = 0; i <= 257; i++) {
    dictionaryIndex[i] = 4096;
    dictionaryChar[i] = i;
  }
  let dictionaryLength = 258;
  let byteLength = MIN_BITS;
  let position = 0;
  function initDictionary() {
    dictionaryLength = 258;
    byteLength = MIN_BITS;
  }
  function getNext(array3) {
    const byte = getByte(array3, position, byteLength);
    position += byteLength;
    return byte;
  }
  function addToDictionary(i, c) {
    dictionaryChar[dictionaryLength] = c;
    dictionaryIndex[dictionaryLength] = i;
    dictionaryLength++;
    return dictionaryLength - 1;
  }
  function getDictionaryReversed(n) {
    const rev = [];
    for (let i = n; i !== 4096; i = dictionaryIndex[i]) {
      rev.push(dictionaryChar[i]);
    }
    return rev;
  }
  const result = [];
  initDictionary();
  const array2 = new Uint8Array(input);
  let code = getNext(array2);
  let oldCode;
  while (code !== EOI_CODE) {
    if (code === CLEAR_CODE) {
      initDictionary();
      code = getNext(array2);
      while (code === CLEAR_CODE) {
        code = getNext(array2);
      }
      if (code === EOI_CODE) {
        break;
      } else if (code > CLEAR_CODE) {
        throw new Error(`corrupted code at scanline ${code}`);
      } else {
        const val = getDictionaryReversed(code);
        appendReversed(result, val);
        oldCode = code;
      }
    } else if (code < dictionaryLength) {
      const val = getDictionaryReversed(code);
      appendReversed(result, val);
      addToDictionary(oldCode, val[val.length - 1]);
      oldCode = code;
    } else {
      const oldVal = getDictionaryReversed(oldCode);
      if (!oldVal) {
        throw new Error(`Bogus entry. Not in dictionary, ${oldCode} / ${dictionaryLength}, position: ${position}`);
      }
      appendReversed(result, oldVal);
      result.push(oldVal[oldVal.length - 1]);
      addToDictionary(oldCode, oldVal[oldVal.length - 1]);
      oldCode = code;
    }
    if (dictionaryLength + 1 >= 2 ** byteLength) {
      if (byteLength === MAX_BYTELENGTH) {
        oldCode = void 0;
      } else {
        byteLength++;
      }
    }
    code = getNext(array2);
  }
  return new Uint8Array(result);
}
class LZWDecoder extends BaseDecoder {
  decodeBlock(buffer2) {
    return decompress(buffer2).buffer;
  }
}
const lzw = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LZWDecoder
}, Symbol.toStringTag, { value: "Module" }));
const dctZigZag = new Int32Array([
  0,
  1,
  8,
  16,
  9,
  2,
  3,
  10,
  17,
  24,
  32,
  25,
  18,
  11,
  4,
  5,
  12,
  19,
  26,
  33,
  40,
  48,
  41,
  34,
  27,
  20,
  13,
  6,
  7,
  14,
  21,
  28,
  35,
  42,
  49,
  56,
  57,
  50,
  43,
  36,
  29,
  22,
  15,
  23,
  30,
  37,
  44,
  51,
  58,
  59,
  52,
  45,
  38,
  31,
  39,
  46,
  53,
  60,
  61,
  54,
  47,
  55,
  62,
  63
]);
const dctCos1 = 4017;
const dctSin1 = 799;
const dctCos3 = 3406;
const dctSin3 = 2276;
const dctCos6 = 1567;
const dctSin6 = 3784;
const dctSqrt2 = 5793;
const dctSqrt1d2 = 2896;
function buildHuffmanTable(codeLengths, values2) {
  let k = 0;
  const code = [];
  let length = 16;
  while (length > 0 && !codeLengths[length - 1]) {
    --length;
  }
  code.push({ children: [], index: 0 });
  let p = code[0];
  let q;
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < codeLengths[i]; j++) {
      p = code.pop();
      if (!p) {
        throw new Error("buildHuffmanTable: codeLength mismatch");
      }
      p.children[p.index] = values2[k];
      while (p.index > 0) {
        p = code.pop();
        if (!p) {
          throw new Error("buildHuffmanTable: codeLength mismatch");
        }
      }
      p.index++;
      code.push(p);
      while (code.length <= i) {
        code.push(q = { children: [], index: 0 });
        p.children[p.index] = q.children;
        p = q;
      }
      k++;
    }
    if (i + 1 < length) {
      code.push(q = { children: [], index: 0 });
      p.children[p.index] = q.children;
      p = q;
    }
  }
  return code[0].children;
}
function decodeScan(data, initialOffset, frame, components, resetInterval, spectralStart, spectralEnd, successivePrev, successive) {
  const { mcusPerLine, progressive } = frame;
  const startOffset = initialOffset;
  let offset = initialOffset;
  let bitsData = 0;
  let bitsCount = 0;
  function readBit() {
    if (bitsCount > 0) {
      bitsCount--;
      return bitsData >> bitsCount & 1;
    }
    bitsData = data[offset++];
    if (bitsData === 255) {
      const nextByte = data[offset++];
      if (nextByte) {
        throw new Error(`unexpected marker: ${(bitsData << 8 | nextByte).toString(16)}`);
      }
    }
    bitsCount = 7;
    return bitsData >>> 7;
  }
  function decodeHuffman(tree) {
    let node2 = tree;
    let bit;
    while ((bit = readBit()) !== null) {
      node2 = node2[bit];
      if (typeof node2 === "number") {
        return node2;
      }
      if (typeof node2 !== "object") {
        throw new Error("invalid huffman sequence");
      }
    }
    return null;
  }
  function receive(initialLength) {
    let length = initialLength;
    let n2 = 0;
    while (length > 0) {
      const bit = readBit();
      if (bit === null) {
        return void 0;
      }
      n2 = n2 << 1 | bit;
      --length;
    }
    return n2;
  }
  function receiveAndExtend(length) {
    const n2 = receive(length);
    if (n2 === void 0) {
      return void 0;
    }
    if (n2 >= 1 << length - 1) {
      return n2;
    }
    return n2 + (-1 << length) + 1;
  }
  function decodeBaseline(component2, zz) {
    const t = decodeHuffman(component2.huffmanTableDC);
    const diff = t === 0 ? 0 : receiveAndExtend(t);
    component2.pred += diff;
    zz[0] = component2.pred;
    let k2 = 1;
    while (k2 < 64) {
      const rs = decodeHuffman(component2.huffmanTableAC);
      if (rs === null) {
        throw new Error("Unexpected end of data in AC coefficient decoding");
      }
      const s = rs & 15;
      const r = rs >> 4;
      if (s === 0) {
        if (r < 15) {
          break;
        }
        k2 += 16;
      } else {
        k2 += r;
        const z = dctZigZag[k2];
        zz[z] = receiveAndExtend(s);
        k2++;
      }
    }
  }
  function decodeDCFirst(component2, zz) {
    const t = decodeHuffman(component2.huffmanTableDC);
    const value = receiveAndExtend(t);
    if (value === void 0) {
      throw new Error("Unexpected end of data in DC coefficient decoding");
    }
    const diff = t === 0 ? 0 : value << successive;
    component2.pred += diff;
    zz[0] = component2.pred;
  }
  function decodeDCSuccessive(component2, zz) {
    zz[0] |= readBit() << successive;
  }
  let eobrun = 0;
  function decodeACFirst(component2, zz) {
    if (eobrun > 0) {
      eobrun--;
      return;
    }
    let k2 = spectralStart;
    const e = spectralEnd;
    while (k2 <= e) {
      const rs = decodeHuffman(component2.huffmanTableAC);
      if (rs === null) {
        throw new Error("Unexpected end of data in AC coefficient decoding");
      }
      const s = rs & 15;
      const r = rs >> 4;
      if (s === 0) {
        if (r < 15) {
          const value = receive(r);
          if (value === void 0) {
            throw new Error("Unexpected end of data in AC coefficient decoding");
          }
          eobrun = value + (1 << r) - 1;
          break;
        }
        k2 += 16;
      } else {
        k2 += r;
        const z = dctZigZag[k2];
        const value = receiveAndExtend(s);
        if (value === void 0) {
          throw new Error("Unexpected end of data in AC coefficient decoding");
        }
        zz[z] = value * (1 << successive);
        k2++;
      }
    }
  }
  let successiveACState = 0;
  let successiveACNextValue;
  function decodeACSuccessive(component2, zz) {
    let k2 = spectralStart;
    const e = spectralEnd;
    let r = 0;
    while (k2 <= e) {
      const z = dctZigZag[k2];
      const direction = zz[z] < 0 ? -1 : 1;
      switch (successiveACState) {
        case 0: {
          const rs = decodeHuffman(component2.huffmanTableAC);
          if (rs === null) {
            throw new Error("Unexpected end of data in AC coefficient decoding");
          }
          const s = rs & 15;
          r = rs >> 4;
          if (s === 0) {
            if (r < 15) {
              const value = receive(r);
              if (value === void 0) {
                throw new Error("Unexpected end of data in AC coefficient decoding");
              }
              eobrun = value + (1 << r);
              successiveACState = 4;
            } else {
              r = 16;
              successiveACState = 1;
            }
          } else {
            if (s !== 1) {
              throw new Error("invalid ACn encoding");
            }
            successiveACNextValue = receiveAndExtend(s);
            successiveACState = r ? 2 : 3;
          }
          continue;
        }
        case 1:
        // skipping r zero items
        case 2:
          if (zz[z]) {
            zz[z] += (readBit() << successive) * direction;
          } else {
            r--;
            if (r === 0) {
              successiveACState = successiveACState === 2 ? 3 : 0;
            }
          }
          break;
        case 3:
          if (zz[z]) {
            zz[z] += (readBit() << successive) * direction;
          } else {
            zz[z] = successiveACNextValue << successive;
            successiveACState = 0;
          }
          break;
        case 4:
          if (zz[z]) {
            zz[z] += (readBit() << successive) * direction;
          }
          break;
      }
      k2++;
    }
    if (successiveACState === 4) {
      eobrun--;
      if (eobrun === 0) {
        successiveACState = 0;
      }
    }
  }
  function decodeMcu(component2, decodeFunction, mcu2, row, col) {
    const mcuRow = mcu2 / mcusPerLine | 0;
    const mcuCol = mcu2 % mcusPerLine;
    const blockRow = mcuRow * component2.v + row;
    const blockCol = mcuCol * component2.h + col;
    decodeFunction(component2, component2.blocks[blockRow][blockCol]);
  }
  function decodeBlock(component2, decodeFunction, mcu2) {
    const blockRow = mcu2 / component2.blocksPerLine | 0;
    const blockCol = mcu2 % component2.blocksPerLine;
    decodeFunction(component2, component2.blocks[blockRow][blockCol]);
  }
  const componentsLength = components.length;
  let component;
  let i;
  let j;
  let k;
  let n;
  let decodeFn;
  if (progressive) {
    if (spectralStart === 0) {
      decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
    } else {
      decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
    }
  } else {
    decodeFn = decodeBaseline;
  }
  let mcu = 0;
  let marker;
  let mcuExpected;
  if (componentsLength === 1) {
    mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
  } else {
    mcuExpected = mcusPerLine * frame.mcusPerColumn;
  }
  const usedResetInterval = resetInterval || mcuExpected;
  while (mcu < mcuExpected) {
    for (i = 0; i < componentsLength; i++) {
      components[i].pred = 0;
    }
    eobrun = 0;
    if (componentsLength === 1) {
      component = components[0];
      for (n = 0; n < usedResetInterval; n++) {
        decodeBlock(component, decodeFn, mcu);
        mcu++;
      }
    } else {
      for (n = 0; n < usedResetInterval; n++) {
        for (i = 0; i < componentsLength; i++) {
          component = components[i];
          const { h, v } = component;
          for (j = 0; j < v; j++) {
            for (k = 0; k < h; k++) {
              decodeMcu(component, decodeFn, mcu, j, k);
            }
          }
        }
        mcu++;
        if (mcu === mcuExpected) {
          break;
        }
      }
    }
    bitsCount = 0;
    marker = data[offset] << 8 | data[offset + 1];
    if (marker < 65280) {
      throw new Error("marker was not found");
    }
    if (marker >= 65488 && marker <= 65495) {
      offset += 2;
    } else {
      break;
    }
  }
  return offset - startOffset;
}
function buildComponentData(frame, component) {
  const lines = [];
  const { blocksPerLine, blocksPerColumn } = component;
  const samplesPerLine = blocksPerLine << 3;
  const R = new Int32Array(64);
  const r = new Uint8Array(64);
  function quantizeAndInverse(zz, dataOut, dataIn) {
    const qt = component.quantizationTable;
    let v0;
    let v1;
    let v2;
    let v3;
    let v4;
    let v5;
    let v6;
    let v7;
    let t;
    const p = dataIn;
    let i;
    for (i = 0; i < 64; i++) {
      p[i] = zz[i] * qt[i];
    }
    for (i = 0; i < 8; ++i) {
      const row = 8 * i;
      if (p[1 + row] === 0 && p[2 + row] === 0 && p[3 + row] === 0 && p[4 + row] === 0 && p[5 + row] === 0 && p[6 + row] === 0 && p[7 + row] === 0) {
        t = dctSqrt2 * p[0 + row] + 512 >> 10;
        p[0 + row] = t;
        p[1 + row] = t;
        p[2 + row] = t;
        p[3 + row] = t;
        p[4 + row] = t;
        p[5 + row] = t;
        p[6 + row] = t;
        p[7 + row] = t;
        continue;
      }
      v0 = dctSqrt2 * p[0 + row] + 128 >> 8;
      v1 = dctSqrt2 * p[4 + row] + 128 >> 8;
      v2 = p[2 + row];
      v3 = p[6 + row];
      v4 = dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128 >> 8;
      v7 = dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128 >> 8;
      v5 = p[3 + row] << 4;
      v6 = p[5 + row] << 4;
      t = v0 - v1 + 1 >> 1;
      v0 = v0 + v1 + 1 >> 1;
      v1 = t;
      t = v2 * dctSin6 + v3 * dctCos6 + 128 >> 8;
      v2 = v2 * dctCos6 - v3 * dctSin6 + 128 >> 8;
      v3 = t;
      t = v4 - v6 + 1 >> 1;
      v4 = v4 + v6 + 1 >> 1;
      v6 = t;
      t = v7 + v5 + 1 >> 1;
      v5 = v7 - v5 + 1 >> 1;
      v7 = t;
      t = v0 - v3 + 1 >> 1;
      v0 = v0 + v3 + 1 >> 1;
      v3 = t;
      t = v1 - v2 + 1 >> 1;
      v1 = v1 + v2 + 1 >> 1;
      v2 = t;
      t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
      v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
      v7 = t;
      t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
      v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
      v6 = t;
      p[0 + row] = v0 + v7;
      p[7 + row] = v0 - v7;
      p[1 + row] = v1 + v6;
      p[6 + row] = v1 - v6;
      p[2 + row] = v2 + v5;
      p[5 + row] = v2 - v5;
      p[3 + row] = v3 + v4;
      p[4 + row] = v3 - v4;
    }
    for (i = 0; i < 8; ++i) {
      const col = i;
      if (p[1 * 8 + col] === 0 && p[2 * 8 + col] === 0 && p[3 * 8 + col] === 0 && p[4 * 8 + col] === 0 && p[5 * 8 + col] === 0 && p[6 * 8 + col] === 0 && p[7 * 8 + col] === 0) {
        t = dctSqrt2 * dataIn[i + 0] + 8192 >> 14;
        p[0 * 8 + col] = t;
        p[1 * 8 + col] = t;
        p[2 * 8 + col] = t;
        p[3 * 8 + col] = t;
        p[4 * 8 + col] = t;
        p[5 * 8 + col] = t;
        p[6 * 8 + col] = t;
        p[7 * 8 + col] = t;
        continue;
      }
      v0 = dctSqrt2 * p[0 * 8 + col] + 2048 >> 12;
      v1 = dctSqrt2 * p[4 * 8 + col] + 2048 >> 12;
      v2 = p[2 * 8 + col];
      v3 = p[6 * 8 + col];
      v4 = dctSqrt1d2 * (p[1 * 8 + col] - p[7 * 8 + col]) + 2048 >> 12;
      v7 = dctSqrt1d2 * (p[1 * 8 + col] + p[7 * 8 + col]) + 2048 >> 12;
      v5 = p[3 * 8 + col];
      v6 = p[5 * 8 + col];
      t = v0 - v1 + 1 >> 1;
      v0 = v0 + v1 + 1 >> 1;
      v1 = t;
      t = v2 * dctSin6 + v3 * dctCos6 + 2048 >> 12;
      v2 = v2 * dctCos6 - v3 * dctSin6 + 2048 >> 12;
      v3 = t;
      t = v4 - v6 + 1 >> 1;
      v4 = v4 + v6 + 1 >> 1;
      v6 = t;
      t = v7 + v5 + 1 >> 1;
      v5 = v7 - v5 + 1 >> 1;
      v7 = t;
      t = v0 - v3 + 1 >> 1;
      v0 = v0 + v3 + 1 >> 1;
      v3 = t;
      t = v1 - v2 + 1 >> 1;
      v1 = v1 + v2 + 1 >> 1;
      v2 = t;
      t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
      v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
      v7 = t;
      t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
      v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
      v6 = t;
      p[0 * 8 + col] = v0 + v7;
      p[7 * 8 + col] = v0 - v7;
      p[1 * 8 + col] = v1 + v6;
      p[6 * 8 + col] = v1 - v6;
      p[2 * 8 + col] = v2 + v5;
      p[5 * 8 + col] = v2 - v5;
      p[3 * 8 + col] = v3 + v4;
      p[4 * 8 + col] = v3 - v4;
    }
    for (i = 0; i < 64; ++i) {
      const sample = 128 + (p[i] + 8 >> 4);
      if (sample < 0) {
        dataOut[i] = 0;
      } else if (sample > 255) {
        dataOut[i] = 255;
      } else {
        dataOut[i] = sample;
      }
    }
  }
  for (let blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
    const scanLine = blockRow << 3;
    for (let i = 0; i < 8; i++) {
      lines.push(new Uint8Array(samplesPerLine));
    }
    for (let blockCol = 0; blockCol < blocksPerLine; blockCol++) {
      quantizeAndInverse(component.blocks[blockRow][blockCol], r, R);
      let offset = 0;
      const sample = blockCol << 3;
      for (let j = 0; j < 8; j++) {
        const line = lines[scanLine + j];
        for (let i = 0; i < 8; i++) {
          line[sample + i] = r[offset++];
        }
      }
    }
  }
  return lines;
}
class JpegStreamReader {
  constructor() {
    this.jfif = null;
    this.adobe = null;
    this.quantizationTables = [];
    this.huffmanTablesAC = [];
    this.huffmanTablesDC = [];
    this.frames = [];
  }
  resetFrames() {
    this.frames = [];
  }
  parse(data) {
    let offset = 0;
    function readUint16() {
      const value = data[offset] << 8 | data[offset + 1];
      offset += 2;
      return value;
    }
    function readDataBlock() {
      const length = readUint16();
      const array2 = data.subarray(offset, offset + length - 2);
      offset += array2.length;
      return array2;
    }
    function prepareComponents(frame) {
      let maxH = 0;
      let maxV = 0;
      let component;
      let componentId;
      for (componentId in frame.components) {
        if (frame.components.hasOwnProperty(componentId)) {
          component = frame.components[componentId];
          if (maxH < component.h) {
            maxH = component.h;
          }
          if (maxV < component.v) {
            maxV = component.v;
          }
        }
      }
      const mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / maxH);
      const mcusPerColumn = Math.ceil(frame.scanLines / 8 / maxV);
      for (componentId in frame.components) {
        if (frame.components.hasOwnProperty(componentId)) {
          component = frame.components[componentId];
          const blocksPerLine = Math.ceil(Math.ceil(frame.samplesPerLine / 8) * component.h / maxH);
          const blocksPerColumn = Math.ceil(Math.ceil(frame.scanLines / 8) * component.v / maxV);
          const blocksPerLineForMcu = mcusPerLine * component.h;
          const blocksPerColumnForMcu = mcusPerColumn * component.v;
          const blocks = [];
          for (let i = 0; i < blocksPerColumnForMcu; i++) {
            const row = [];
            for (let j = 0; j < blocksPerLineForMcu; j++) {
              row.push(new Int32Array(64));
            }
            blocks.push(row);
          }
          component.blocksPerLine = blocksPerLine;
          component.blocksPerColumn = blocksPerColumn;
          component.blocks = blocks;
        }
      }
      frame.maxH = maxH;
      frame.maxV = maxV;
      frame.mcusPerLine = mcusPerLine;
      frame.mcusPerColumn = mcusPerColumn;
    }
    let fileMarker = readUint16();
    if (fileMarker !== 65496) {
      throw new Error("SOI not found");
    }
    fileMarker = readUint16();
    while (fileMarker !== 65497) {
      switch (fileMarker) {
        case 65280:
          break;
        case 65504:
        // APP0 (Application Specific)
        case 65505:
        // APP1
        case 65506:
        // APP2
        case 65507:
        // APP3
        case 65508:
        // APP4
        case 65509:
        // APP5
        case 65510:
        // APP6
        case 65511:
        // APP7
        case 65512:
        // APP8
        case 65513:
        // APP9
        case 65514:
        // APP10
        case 65515:
        // APP11
        case 65516:
        // APP12
        case 65517:
        // APP13
        case 65518:
        // APP14
        case 65519:
        // APP15
        case 65534: {
          const appData = readDataBlock();
          if (fileMarker === 65504) {
            if (appData[0] === 74 && appData[1] === 70 && appData[2] === 73 && appData[3] === 70 && appData[4] === 0) {
              this.jfif = {
                version: { major: appData[5], minor: appData[6] },
                densityUnits: appData[7],
                xDensity: appData[8] << 8 | appData[9],
                yDensity: appData[10] << 8 | appData[11],
                thumbWidth: appData[12],
                thumbHeight: appData[13],
                thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
              };
            }
          }
          if (fileMarker === 65518) {
            if (appData[0] === 65 && appData[1] === 100 && appData[2] === 111 && appData[3] === 98 && appData[4] === 101 && appData[5] === 0) {
              this.adobe = {
                version: appData[6],
                flags0: appData[7] << 8 | appData[8],
                flags1: appData[9] << 8 | appData[10],
                transformCode: appData[11]
              };
            }
          }
          break;
        }
        case 65499: {
          const quantizationTablesLength = readUint16();
          const quantizationTablesEnd = quantizationTablesLength + offset - 2;
          while (offset < quantizationTablesEnd) {
            const quantizationTableSpec = data[offset++];
            const tableData = new Int32Array(64);
            if (quantizationTableSpec >> 4 === 0) {
              for (let j = 0; j < 64; j++) {
                const z = dctZigZag[j];
                tableData[z] = data[offset++];
              }
            } else if (quantizationTableSpec >> 4 === 1) {
              for (let j = 0; j < 64; j++) {
                const z = dctZigZag[j];
                tableData[z] = readUint16();
              }
            } else {
              throw new Error("DQT: invalid table spec");
            }
            this.quantizationTables[quantizationTableSpec & 15] = tableData;
          }
          break;
        }
        case 65472:
        // SOF0 (Start of Frame, Baseline DCT)
        case 65473:
        // SOF1 (Start of Frame, Extended DCT)
        case 65474: {
          readUint16();
          const frame = {
            extended: fileMarker === 65473,
            progressive: fileMarker === 65474,
            precision: data[offset++],
            scanLines: readUint16(),
            samplesPerLine: readUint16(),
            components: {},
            /** @type {any[]} */
            componentsOrder: []
          };
          const componentsCount = data[offset++];
          let componentId;
          for (let i = 0; i < componentsCount; i++) {
            componentId = data[offset];
            const h = data[offset + 1] >> 4;
            const v = data[offset + 1] & 15;
            const qId = data[offset + 2];
            frame.componentsOrder.push(componentId);
            frame.components[componentId] = {
              h,
              v,
              quantizationIdx: qId
            };
            offset += 3;
          }
          prepareComponents(frame);
          this.frames.push(frame);
          break;
        }
        case 65476: {
          const huffmanLength = readUint16();
          for (let i = 2; i < huffmanLength; ) {
            const huffmanTableSpec = data[offset++];
            const codeLengths = new Uint8Array(16);
            let codeLengthSum = 0;
            for (let j = 0; j < 16; j++, offset++) {
              codeLengths[j] = data[offset];
              codeLengthSum += codeLengths[j];
            }
            const huffmanValues = new Uint8Array(codeLengthSum);
            for (let j = 0; j < codeLengthSum; j++, offset++) {
              huffmanValues[j] = data[offset];
            }
            i += 17 + codeLengthSum;
            if (huffmanTableSpec >> 4 === 0) {
              this.huffmanTablesDC[huffmanTableSpec & 15] = buildHuffmanTable(codeLengths, huffmanValues);
            } else {
              this.huffmanTablesAC[huffmanTableSpec & 15] = buildHuffmanTable(codeLengths, huffmanValues);
            }
          }
          break;
        }
        case 65501:
          readUint16();
          this.resetInterval = readUint16();
          break;
        case 65498: {
          readUint16();
          const selectorsCount = data[offset++];
          const components = [];
          const frame = this.frames[0];
          for (let i = 0; i < selectorsCount; i++) {
            const component = frame.components[data[offset++]];
            const tableSpec = data[offset++];
            component.huffmanTableDC = this.huffmanTablesDC[tableSpec >> 4];
            component.huffmanTableAC = this.huffmanTablesAC[tableSpec & 15];
            components.push(component);
          }
          const spectralStart = data[offset++];
          const spectralEnd = data[offset++];
          const successiveApproximation = data[offset++];
          const processed = decodeScan(data, offset, frame, components, this.resetInterval, spectralStart, spectralEnd, successiveApproximation >> 4, successiveApproximation & 15);
          offset += processed;
          break;
        }
        case 65535:
          if (data[offset] !== 255) {
            offset--;
          }
          break;
        default:
          if (data[offset - 3] === 255 && data[offset - 2] >= 192 && data[offset - 2] <= 254) {
            offset -= 3;
            break;
          }
          throw new Error(`unknown JPEG marker ${fileMarker.toString(16)}`);
      }
      fileMarker = readUint16();
    }
  }
  getResult() {
    const { frames } = this;
    if (this.frames.length === 0) {
      throw new Error("no frames were decoded");
    } else if (this.frames.length > 1) {
      console.warn("more than one frame is not supported");
    }
    for (let i = 0; i < this.frames.length; i++) {
      const cp = this.frames[i].components;
      for (const j of Object.keys(cp)) {
        cp[j].quantizationTable = this.quantizationTables[cp[j].quantizationIdx];
        delete cp[j].quantizationIdx;
      }
    }
    const frame = frames[0];
    const { components, componentsOrder } = frame;
    const outComponents = [];
    const width = frame.samplesPerLine;
    const height = frame.scanLines;
    for (let i = 0; i < componentsOrder.length; i++) {
      const component = components[componentsOrder[i]];
      outComponents.push({
        lines: buildComponentData(frame, component),
        scaleX: component.h / frame.maxH,
        scaleY: component.v / frame.maxV
      });
    }
    const out = new Uint8Array(width * height * outComponents.length);
    let oi = 0;
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        for (let i = 0; i < outComponents.length; ++i) {
          const component = outComponents[i];
          out[oi] = component.lines[0 | y * component.scaleY][0 | x * component.scaleX];
          ++oi;
        }
      }
    }
    return out;
  }
}
class JpegDecoder extends BaseDecoder {
  constructor(parameters) {
    super(parameters);
    this.reader = new JpegStreamReader();
    if (parameters.JPEGTables) {
      this.reader.parse(parameters.JPEGTables);
    }
  }
  decodeBlock(buffer2) {
    this.reader.resetFrames();
    this.reader.parse(new Uint8Array(buffer2));
    return this.reader.getResult().buffer;
  }
}
const jpeg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: JpegDecoder
}, Symbol.toStringTag, { value: "Module" }));
function zero$1(buf) {
  let len = buf.length;
  while (--len >= 0) {
    buf[len] = 0;
  }
}
const MIN_MATCH$1 = 3;
const MAX_MATCH$1 = 258;
const LENGTH_CODES$1 = 29;
const LITERALS$1 = 256;
const L_CODES$1 = LITERALS$1 + 1 + LENGTH_CODES$1;
const D_CODES$1 = 30;
const DIST_CODE_LEN = 512;
const static_ltree = new Array((L_CODES$1 + 2) * 2);
zero$1(static_ltree);
const static_dtree = new Array(D_CODES$1 * 2);
zero$1(static_dtree);
const _dist_code = new Array(DIST_CODE_LEN);
zero$1(_dist_code);
const _length_code = new Array(MAX_MATCH$1 - MIN_MATCH$1 + 1);
zero$1(_length_code);
const base_length = new Array(LENGTH_CODES$1);
zero$1(base_length);
const base_dist = new Array(D_CODES$1);
zero$1(base_dist);
const adler32 = (adler, buf, len, pos) => {
  let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
  while (len !== 0) {
    n = len > 2e3 ? 2e3 : len;
    len -= n;
    do {
      s1 = s1 + buf[pos++] | 0;
      s2 = s2 + s1 | 0;
    } while (--n);
    s1 %= 65521;
    s2 %= 65521;
  }
  return s1 | s2 << 16 | 0;
};
var adler32_1 = adler32;
const makeTable = () => {
  let c, table = [];
  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) {
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    }
    table[n] = c;
  }
  return table;
};
const crcTable = new Uint32Array(makeTable());
const crc32 = (crc, buf, len, pos) => {
  const t = crcTable;
  const end = pos + len;
  crc ^= -1;
  for (let i = pos; i < end; i++) {
    crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
  }
  return crc ^ -1;
};
var crc32_1 = crc32;
var messages = {
  2: "need dictionary",
  /* Z_NEED_DICT       2  */
  1: "stream end",
  /* Z_STREAM_END      1  */
  0: "",
  /* Z_OK              0  */
  "-1": "file error",
  /* Z_ERRNO         (-1) */
  "-2": "stream error",
  /* Z_STREAM_ERROR  (-2) */
  "-3": "data error",
  /* Z_DATA_ERROR    (-3) */
  "-4": "insufficient memory",
  /* Z_MEM_ERROR     (-4) */
  "-5": "buffer error",
  /* Z_BUF_ERROR     (-5) */
  "-6": "incompatible version"
  /* Z_VERSION_ERROR (-6) */
};
var constants$2 = {
  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH: 0,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  /* The deflate compression method */
  Z_DEFLATED: 8
  //Z_NULL:                 null // Use -1 or null inline, depending on var type
};
const _has = (obj, key) => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};
var assign = function(obj) {
  const sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    const source = sources.shift();
    if (!source) {
      continue;
    }
    if (typeof source !== "object") {
      throw new TypeError(source + "must be non-object");
    }
    for (const p in source) {
      if (_has(source, p)) {
        obj[p] = source[p];
      }
    }
  }
  return obj;
};
var flattenChunks = (chunks) => {
  let len = 0;
  for (let i = 0, l = chunks.length; i < l; i++) {
    len += chunks[i].length;
  }
  const result = new Uint8Array(len);
  for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
    let chunk = chunks[i];
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
};
var common = {
  assign,
  flattenChunks
};
let STR_APPLY_UIA_OK = true;
try {
  String.fromCharCode.apply(null, new Uint8Array(1));
} catch (__) {
  STR_APPLY_UIA_OK = false;
}
const _utf8len = new Uint8Array(256);
for (let q = 0; q < 256; q++) {
  _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
}
_utf8len[254] = _utf8len[254] = 1;
var string2buf = (str) => {
  if (typeof TextEncoder === "function" && TextEncoder.prototype.encode) {
    return new TextEncoder().encode(str);
  }
  let buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 64512) === 56320) {
        c = 65536 + (c - 55296 << 10) + (c2 - 56320);
        m_pos++;
      }
    }
    buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
  }
  buf = new Uint8Array(buf_len);
  for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 64512) === 56320) {
        c = 65536 + (c - 55296 << 10) + (c2 - 56320);
        m_pos++;
      }
    }
    if (c < 128) {
      buf[i++] = c;
    } else if (c < 2048) {
      buf[i++] = 192 | c >>> 6;
      buf[i++] = 128 | c & 63;
    } else if (c < 65536) {
      buf[i++] = 224 | c >>> 12;
      buf[i++] = 128 | c >>> 6 & 63;
      buf[i++] = 128 | c & 63;
    } else {
      buf[i++] = 240 | c >>> 18;
      buf[i++] = 128 | c >>> 12 & 63;
      buf[i++] = 128 | c >>> 6 & 63;
      buf[i++] = 128 | c & 63;
    }
  }
  return buf;
};
const buf2binstring = (buf, len) => {
  if (len < 65534) {
    if (buf.subarray && STR_APPLY_UIA_OK) {
      return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
    }
  }
  let result = "";
  for (let i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
};
var buf2string = (buf, max) => {
  const len = max || buf.length;
  if (typeof TextDecoder === "function" && TextDecoder.prototype.decode) {
    return new TextDecoder().decode(buf.subarray(0, max));
  }
  let i, out;
  const utf16buf = new Array(len * 2);
  for (out = 0, i = 0; i < len; ) {
    let c = buf[i++];
    if (c < 128) {
      utf16buf[out++] = c;
      continue;
    }
    let c_len = _utf8len[c];
    if (c_len > 4) {
      utf16buf[out++] = 65533;
      i += c_len - 1;
      continue;
    }
    c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
    while (c_len > 1 && i < len) {
      c = c << 6 | buf[i++] & 63;
      c_len--;
    }
    if (c_len > 1) {
      utf16buf[out++] = 65533;
      continue;
    }
    if (c < 65536) {
      utf16buf[out++] = c;
    } else {
      c -= 65536;
      utf16buf[out++] = 55296 | c >> 10 & 1023;
      utf16buf[out++] = 56320 | c & 1023;
    }
  }
  return buf2binstring(utf16buf, out);
};
var utf8border = (buf, max) => {
  max = max || buf.length;
  if (max > buf.length) {
    max = buf.length;
  }
  let pos = max - 1;
  while (pos >= 0 && (buf[pos] & 192) === 128) {
    pos--;
  }
  if (pos < 0) {
    return max;
  }
  if (pos === 0) {
    return max;
  }
  return pos + _utf8len[buf[pos]] > max ? pos : max;
};
var strings = {
  string2buf,
  buf2string,
  utf8border
};
function ZStream() {
  this.input = null;
  this.next_in = 0;
  this.avail_in = 0;
  this.total_in = 0;
  this.output = null;
  this.next_out = 0;
  this.avail_out = 0;
  this.total_out = 0;
  this.msg = "";
  this.state = null;
  this.data_type = 2;
  this.adler = 0;
}
var zstream = ZStream;
const BAD$1 = 16209;
const TYPE$1 = 16191;
var inffast = function inflate_fast(strm, start) {
  let _in;
  let last;
  let _out;
  let beg;
  let end;
  let dmax;
  let wsize;
  let whave;
  let wnext;
  let s_window;
  let hold;
  let bits;
  let lcode;
  let dcode;
  let lmask;
  let dmask;
  let here;
  let op;
  let len;
  let dist;
  let from;
  let from_source;
  let input, output;
  const state = strm.state;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
  dmax = state.dmax;
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;
  top:
    do {
      if (bits < 15) {
        hold += input[_in++] << bits;
        bits += 8;
        hold += input[_in++] << bits;
        bits += 8;
      }
      here = lcode[hold & lmask];
      dolen:
        for (; ; ) {
          op = here >>> 24;
          hold >>>= op;
          bits -= op;
          op = here >>> 16 & 255;
          if (op === 0) {
            output[_out++] = here & 65535;
          } else if (op & 16) {
            len = here & 65535;
            op &= 15;
            if (op) {
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
              len += hold & (1 << op) - 1;
              hold >>>= op;
              bits -= op;
            }
            if (bits < 15) {
              hold += input[_in++] << bits;
              bits += 8;
              hold += input[_in++] << bits;
              bits += 8;
            }
            here = dcode[hold & dmask];
            dodist:
              for (; ; ) {
                op = here >>> 24;
                hold >>>= op;
                bits -= op;
                op = here >>> 16 & 255;
                if (op & 16) {
                  dist = here & 65535;
                  op &= 15;
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                    if (bits < op) {
                      hold += input[_in++] << bits;
                      bits += 8;
                    }
                  }
                  dist += hold & (1 << op) - 1;
                  if (dist > dmax) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD$1;
                    break top;
                  }
                  hold >>>= op;
                  bits -= op;
                  op = _out - beg;
                  if (dist > op) {
                    op = dist - op;
                    if (op > whave) {
                      if (state.sane) {
                        strm.msg = "invalid distance too far back";
                        state.mode = BAD$1;
                        break top;
                      }
                    }
                    from = 0;
                    from_source = s_window;
                    if (wnext === 0) {
                      from += wsize - op;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;
                        from_source = output;
                      }
                    } else if (wnext < op) {
                      from += wsize + wnext - op;
                      op -= wnext;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = 0;
                        if (wnext < len) {
                          op = wnext;
                          len -= op;
                          do {
                            output[_out++] = s_window[from++];
                          } while (--op);
                          from = _out - dist;
                          from_source = output;
                        }
                      }
                    } else {
                      from += wnext - op;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;
                        from_source = output;
                      }
                    }
                    while (len > 2) {
                      output[_out++] = from_source[from++];
                      output[_out++] = from_source[from++];
                      output[_out++] = from_source[from++];
                      len -= 3;
                    }
                    if (len) {
                      output[_out++] = from_source[from++];
                      if (len > 1) {
                        output[_out++] = from_source[from++];
                      }
                    }
                  } else {
                    from = _out - dist;
                    do {
                      output[_out++] = output[from++];
                      output[_out++] = output[from++];
                      output[_out++] = output[from++];
                      len -= 3;
                    } while (len > 2);
                    if (len) {
                      output[_out++] = output[from++];
                      if (len > 1) {
                        output[_out++] = output[from++];
                      }
                    }
                  }
                } else if ((op & 64) === 0) {
                  here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                  continue dodist;
                } else {
                  strm.msg = "invalid distance code";
                  state.mode = BAD$1;
                  break top;
                }
                break;
              }
          } else if ((op & 64) === 0) {
            here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
            continue dolen;
          } else if (op & 32) {
            state.mode = TYPE$1;
            break top;
          } else {
            strm.msg = "invalid literal/length code";
            state.mode = BAD$1;
            break top;
          }
          break;
        }
    } while (_in < last && _out < end);
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
  strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
  state.hold = hold;
  state.bits = bits;
  return;
};
const MAXBITS = 15;
const ENOUGH_LENS$1 = 852;
const ENOUGH_DISTS$1 = 592;
const CODES$1 = 0;
const LENS$1 = 1;
const DISTS$1 = 2;
const lbase = new Uint16Array([
  /* Length codes 257..285 base */
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  0,
  0
]);
const lext = new Uint8Array([
  /* Length codes 257..285 extra */
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  17,
  17,
  17,
  17,
  18,
  18,
  18,
  18,
  19,
  19,
  19,
  19,
  20,
  20,
  20,
  20,
  21,
  21,
  21,
  21,
  16,
  72,
  78
]);
const dbase = new Uint16Array([
  /* Distance codes 0..29 base */
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577,
  0,
  0
]);
const dext = new Uint8Array([
  /* Distance codes 0..29 extra */
  16,
  16,
  16,
  16,
  17,
  17,
  18,
  18,
  19,
  19,
  20,
  20,
  21,
  21,
  22,
  22,
  23,
  23,
  24,
  24,
  25,
  25,
  26,
  26,
  27,
  27,
  28,
  28,
  29,
  29,
  64,
  64
]);
const inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) => {
  const bits = opts.bits;
  let len = 0;
  let sym = 0;
  let min = 0, max = 0;
  let root = 0;
  let curr = 0;
  let drop = 0;
  let left = 0;
  let used = 0;
  let huff = 0;
  let incr;
  let fill;
  let low;
  let mask;
  let next3;
  let base = null;
  let match;
  const count = new Uint16Array(MAXBITS + 1);
  const offs = new Uint16Array(MAXBITS + 1);
  let extra = null;
  let here_bits, here_op, here_val;
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) {
      break;
    }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {
    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    opts.bits = 1;
    return 0;
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) {
      break;
    }
  }
  if (root < min) {
    root = min;
  }
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }
  }
  if (left > 0 && (type === CODES$1 || max !== 1)) {
    return -1;
  }
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }
  if (type === CODES$1) {
    base = extra = work;
    match = 20;
  } else if (type === LENS$1) {
    base = lbase;
    extra = lext;
    match = 257;
  } else {
    base = dbase;
    extra = dext;
    match = 0;
  }
  huff = 0;
  sym = 0;
  len = min;
  next3 = table_index;
  curr = root;
  drop = 0;
  low = -1;
  used = 1 << root;
  mask = used - 1;
  if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) {
    return 1;
  }
  for (; ; ) {
    here_bits = len - drop;
    if (work[sym] + 1 < match) {
      here_op = 0;
      here_val = work[sym];
    } else if (work[sym] >= match) {
      here_op = extra[work[sym] - match];
      here_val = base[work[sym] - match];
    } else {
      here_op = 32 + 64;
      here_val = 0;
    }
    incr = 1 << len - drop;
    fill = 1 << curr;
    min = fill;
    do {
      fill -= incr;
      table[next3 + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
    } while (fill !== 0);
    incr = 1 << len - 1;
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }
    sym++;
    if (--count[len] === 0) {
      if (len === max) {
        break;
      }
      len = lens[lens_index + work[sym]];
    }
    if (len > root && (huff & mask) !== low) {
      if (drop === 0) {
        drop = root;
      }
      next3 += min;
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) {
          break;
        }
        curr++;
        left <<= 1;
      }
      used += 1 << curr;
      if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) {
        return 1;
      }
      low = huff & mask;
      table[low] = root << 24 | curr << 16 | next3 - table_index | 0;
    }
  }
  if (huff !== 0) {
    table[next3 + huff] = len - drop << 24 | 64 << 16 | 0;
  }
  opts.bits = root;
  return 0;
};
var inftrees = inflate_table;
const CODES = 0;
const LENS = 1;
const DISTS = 2;
const {
  Z_FINISH: Z_FINISH$1,
  Z_BLOCK,
  Z_TREES,
  Z_OK: Z_OK$1,
  Z_STREAM_END: Z_STREAM_END$1,
  Z_NEED_DICT: Z_NEED_DICT$1,
  Z_STREAM_ERROR: Z_STREAM_ERROR$1,
  Z_DATA_ERROR: Z_DATA_ERROR$1,
  Z_MEM_ERROR: Z_MEM_ERROR$1,
  Z_BUF_ERROR,
  Z_DEFLATED
} = constants$2;
const HEAD = 16180;
const FLAGS = 16181;
const TIME = 16182;
const OS = 16183;
const EXLEN = 16184;
const EXTRA = 16185;
const NAME = 16186;
const COMMENT = 16187;
const HCRC = 16188;
const DICTID = 16189;
const DICT = 16190;
const TYPE = 16191;
const TYPEDO = 16192;
const STORED = 16193;
const COPY_ = 16194;
const COPY = 16195;
const TABLE = 16196;
const LENLENS = 16197;
const CODELENS = 16198;
const LEN_ = 16199;
const LEN = 16200;
const LENEXT = 16201;
const DIST = 16202;
const DISTEXT = 16203;
const MATCH = 16204;
const LIT = 16205;
const CHECK = 16206;
const LENGTH = 16207;
const DONE = 16208;
const BAD = 16209;
const MEM = 16210;
const SYNC = 16211;
const ENOUGH_LENS = 852;
const ENOUGH_DISTS = 592;
const MAX_WBITS = 15;
const DEF_WBITS = MAX_WBITS;
const zswap32 = (q) => {
  return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
};
function InflateState() {
  this.strm = null;
  this.mode = 0;
  this.last = false;
  this.wrap = 0;
  this.havedict = false;
  this.flags = 0;
  this.dmax = 0;
  this.check = 0;
  this.total = 0;
  this.head = null;
  this.wbits = 0;
  this.wsize = 0;
  this.whave = 0;
  this.wnext = 0;
  this.window = null;
  this.hold = 0;
  this.bits = 0;
  this.length = 0;
  this.offset = 0;
  this.extra = 0;
  this.lencode = null;
  this.distcode = null;
  this.lenbits = 0;
  this.distbits = 0;
  this.ncode = 0;
  this.nlen = 0;
  this.ndist = 0;
  this.have = 0;
  this.next = null;
  this.lens = new Uint16Array(320);
  this.work = new Uint16Array(288);
  this.lendyn = null;
  this.distdyn = null;
  this.sane = 0;
  this.back = 0;
  this.was = 0;
}
const inflateStateCheck = (strm) => {
  if (!strm) {
    return 1;
  }
  const state = strm.state;
  if (!state || state.strm !== strm || state.mode < HEAD || state.mode > SYNC) {
    return 1;
  }
  return 0;
};
const inflateResetKeep = (strm) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = "";
  if (state.wrap) {
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.flags = -1;
  state.dmax = 32768;
  state.head = null;
  state.hold = 0;
  state.bits = 0;
  state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
  state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
  state.sane = 1;
  state.back = -1;
  return Z_OK$1;
};
const inflateReset = (strm) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);
};
const inflateReset2 = (strm, windowBits) => {
  let wrap;
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  } else {
    wrap = (windowBits >> 4) + 5;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR$1;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
};
const inflateInit2 = (strm, windowBits) => {
  if (!strm) {
    return Z_STREAM_ERROR$1;
  }
  const state = new InflateState();
  strm.state = state;
  state.strm = strm;
  state.window = null;
  state.mode = HEAD;
  const ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK$1) {
    strm.state = null;
  }
  return ret;
};
const inflateInit = (strm) => {
  return inflateInit2(strm, DEF_WBITS);
};
let virgin = true;
let lenfix, distfix;
const fixedtables = (state) => {
  if (virgin) {
    lenfix = new Int32Array(512);
    distfix = new Int32Array(32);
    let sym = 0;
    while (sym < 144) {
      state.lens[sym++] = 8;
    }
    while (sym < 256) {
      state.lens[sym++] = 9;
    }
    while (sym < 280) {
      state.lens[sym++] = 7;
    }
    while (sym < 288) {
      state.lens[sym++] = 8;
    }
    inftrees(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
    sym = 0;
    while (sym < 32) {
      state.lens[sym++] = 5;
    }
    inftrees(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
    virgin = false;
  }
  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
};
const updatewindow = (strm, src, end, copy) => {
  let dist;
  const state = strm.state;
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;
    state.window = new Uint8Array(state.wsize);
  }
  if (copy >= state.wsize) {
    state.window.set(src.subarray(end - state.wsize, end), 0);
    state.wnext = 0;
    state.whave = state.wsize;
  } else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
    copy -= dist;
    if (copy) {
      state.window.set(src.subarray(end - copy, end), 0);
      state.wnext = copy;
      state.whave = state.wsize;
    } else {
      state.wnext += dist;
      if (state.wnext === state.wsize) {
        state.wnext = 0;
      }
      if (state.whave < state.wsize) {
        state.whave += dist;
      }
    }
  }
  return 0;
};
const inflate$2 = (strm, flush) => {
  let state;
  let input, output;
  let next3;
  let put;
  let have, left;
  let hold;
  let bits;
  let _in, _out;
  let copy;
  let from;
  let from_source;
  let here = 0;
  let here_bits, here_op, here_val;
  let last_bits, last_op, last_val;
  let len;
  let ret;
  const hbuf = new Uint8Array(4);
  let opts;
  let n;
  const order = (
    /* permutation of code lengths */
    new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15])
  );
  if (inflateStateCheck(strm) || !strm.output || !strm.input && strm.avail_in !== 0) {
    return Z_STREAM_ERROR$1;
  }
  state = strm.state;
  if (state.mode === TYPE) {
    state.mode = TYPEDO;
  }
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next3 = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  _in = have;
  _out = left;
  ret = Z_OK$1;
  inf_leave:
    for (; ; ) {
      switch (state.mode) {
        case HEAD:
          if (state.wrap === 0) {
            state.mode = TYPEDO;
            break;
          }
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next3++] << bits;
            bits += 8;
          }
          if (state.wrap & 2 && hold === 35615) {
            if (state.wbits === 0) {
              state.wbits = 15;
            }
            state.check = 0;
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32_1(state.check, hbuf, 2, 0);
            hold = 0;
            bits = 0;
            state.mode = FLAGS;
            break;
          }
          if (state.head) {
            state.head.done = false;
          }
          if (!(state.wrap & 1) || /* check if zlib header allowed */
          (((hold & 255) << 8) + (hold >> 8)) % 31) {
            strm.msg = "incorrect header check";
            state.mode = BAD;
            break;
          }
          if ((hold & 15) !== Z_DEFLATED) {
            strm.msg = "unknown compression method";
            state.mode = BAD;
            break;
          }
          hold >>>= 4;
          bits -= 4;
          len = (hold & 15) + 8;
          if (state.wbits === 0) {
            state.wbits = len;
          }
          if (len > 15 || len > state.wbits) {
            strm.msg = "invalid window size";
            state.mode = BAD;
            break;
          }
          state.dmax = 1 << state.wbits;
          state.flags = 0;
          strm.adler = state.check = 1;
          state.mode = hold & 512 ? DICTID : TYPE;
          hold = 0;
          bits = 0;
          break;
        case FLAGS:
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next3++] << bits;
            bits += 8;
          }
          state.flags = hold;
          if ((state.flags & 255) !== Z_DEFLATED) {
            strm.msg = "unknown compression method";
            state.mode = BAD;
            break;
          }
          if (state.flags & 57344) {
            strm.msg = "unknown header flags set";
            state.mode = BAD;
            break;
          }
          if (state.head) {
            state.head.text = hold >> 8 & 1;
          }
          if (state.flags & 512 && state.wrap & 4) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32_1(state.check, hbuf, 2, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = TIME;
        /* falls through */
        case TIME:
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next3++] << bits;
            bits += 8;
          }
          if (state.head) {
            state.head.time = hold;
          }
          if (state.flags & 512 && state.wrap & 4) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            hbuf[2] = hold >>> 16 & 255;
            hbuf[3] = hold >>> 24 & 255;
            state.check = crc32_1(state.check, hbuf, 4, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = OS;
        /* falls through */
        case OS:
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next3++] << bits;
            bits += 8;
          }
          if (state.head) {
            state.head.xflags = hold & 255;
            state.head.os = hold >> 8;
          }
          if (state.flags & 512 && state.wrap & 4) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32_1(state.check, hbuf, 2, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = EXLEN;
        /* falls through */
        case EXLEN:
          if (state.flags & 1024) {
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next3++] << bits;
              bits += 8;
            }
            state.length = hold;
            if (state.head) {
              state.head.extra_len = hold;
            }
            if (state.flags & 512 && state.wrap & 4) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32_1(state.check, hbuf, 2, 0);
            }
            hold = 0;
            bits = 0;
          } else if (state.head) {
            state.head.extra = null;
          }
          state.mode = EXTRA;
        /* falls through */
        case EXTRA:
          if (state.flags & 1024) {
            copy = state.length;
            if (copy > have) {
              copy = have;
            }
            if (copy) {
              if (state.head) {
                len = state.head.extra_len - state.length;
                if (!state.head.extra) {
                  state.head.extra = new Uint8Array(state.head.extra_len);
                }
                state.head.extra.set(
                  input.subarray(
                    next3,
                    // extra field is limited to 65536 bytes
                    // - no need for additional size check
                    next3 + copy
                  ),
                  /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                  len
                );
              }
              if (state.flags & 512 && state.wrap & 4) {
                state.check = crc32_1(state.check, input, copy, next3);
              }
              have -= copy;
              next3 += copy;
              state.length -= copy;
            }
            if (state.length) {
              break inf_leave;
            }
          }
          state.length = 0;
          state.mode = NAME;
        /* falls through */
        case NAME:
          if (state.flags & 2048) {
            if (have === 0) {
              break inf_leave;
            }
            copy = 0;
            do {
              len = input[next3 + copy++];
              if (state.head && len && state.length < 65536) {
                state.head.name += String.fromCharCode(len);
              }
            } while (len && copy < have);
            if (state.flags & 512 && state.wrap & 4) {
              state.check = crc32_1(state.check, input, copy, next3);
            }
            have -= copy;
            next3 += copy;
            if (len) {
              break inf_leave;
            }
          } else if (state.head) {
            state.head.name = null;
          }
          state.length = 0;
          state.mode = COMMENT;
        /* falls through */
        case COMMENT:
          if (state.flags & 4096) {
            if (have === 0) {
              break inf_leave;
            }
            copy = 0;
            do {
              len = input[next3 + copy++];
              if (state.head && len && state.length < 65536) {
                state.head.comment += String.fromCharCode(len);
              }
            } while (len && copy < have);
            if (state.flags & 512 && state.wrap & 4) {
              state.check = crc32_1(state.check, input, copy, next3);
            }
            have -= copy;
            next3 += copy;
            if (len) {
              break inf_leave;
            }
          } else if (state.head) {
            state.head.comment = null;
          }
          state.mode = HCRC;
        /* falls through */
        case HCRC:
          if (state.flags & 512) {
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next3++] << bits;
              bits += 8;
            }
            if (state.wrap & 4 && hold !== (state.check & 65535)) {
              strm.msg = "header crc mismatch";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          if (state.head) {
            state.head.hcrc = state.flags >> 9 & 1;
            state.head.done = true;
          }
          strm.adler = state.check = 0;
          state.mode = TYPE;
          break;
        case DICTID:
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next3++] << bits;
            bits += 8;
          }
          strm.adler = state.check = zswap32(hold);
          hold = 0;
          bits = 0;
          state.mode = DICT;
        /* falls through */
        case DICT:
          if (state.havedict === 0) {
            strm.next_out = put;
            strm.avail_out = left;
            strm.next_in = next3;
            strm.avail_in = have;
            state.hold = hold;
            state.bits = bits;
            return Z_NEED_DICT$1;
          }
          strm.adler = state.check = 1;
          state.mode = TYPE;
        /* falls through */
        case TYPE:
          if (flush === Z_BLOCK || flush === Z_TREES) {
            break inf_leave;
          }
        /* falls through */
        case TYPEDO:
          if (state.last) {
            hold >>>= bits & 7;
            bits -= bits & 7;
            state.mode = CHECK;
            break;
          }
          while (bits < 3) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next3++] << bits;
            bits += 8;
          }
          state.last = hold & 1;
          hold >>>= 1;
          bits -= 1;
          switch (hold & 3) {
            case 0:
              state.mode = STORED;
              break;
            case 1:
              fixedtables(state);
              state.mode = LEN_;
              if (flush === Z_TREES) {
                hold >>>= 2;
                bits -= 2;
                break inf_leave;
              }
              break;
            case 2:
              state.mode = TABLE;
              break;
            case 3:
              strm.msg = "invalid block type";
              state.mode = BAD;
          }
          hold >>>= 2;
          bits -= 2;
          break;
        case STORED:
          hold >>>= bits & 7;
          bits -= bits & 7;
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next3++] << bits;
            bits += 8;
          }
          if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
            strm.msg = "invalid stored block lengths";
            state.mode = BAD;
            break;
          }
          state.length = hold & 65535;
          hold = 0;
          bits = 0;
          state.mode = COPY_;
          if (flush === Z_TREES) {
            break inf_leave;
          }
        /* falls through */
        case COPY_:
          state.mode = COPY;
        /* falls through */
        case COPY:
          copy = state.length;
          if (copy) {
            if (copy > have) {
              copy = have;
            }
            if (copy > left) {
              copy = left;
            }
            if (copy === 0) {
              break inf_leave;
            }
            output.set(input.subarray(next3, next3 + copy), put);
            have -= copy;
            next3 += copy;
            left -= copy;
            put += copy;
            state.length -= copy;
            break;
          }
          state.mode = TYPE;
          break;
        case TABLE:
          while (bits < 14) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next3++] << bits;
            bits += 8;
          }
          state.nlen = (hold & 31) + 257;
          hold >>>= 5;
          bits -= 5;
          state.ndist = (hold & 31) + 1;
          hold >>>= 5;
          bits -= 5;
          state.ncode = (hold & 15) + 4;
          hold >>>= 4;
          bits -= 4;
          if (state.nlen > 286 || state.ndist > 30) {
            strm.msg = "too many length or distance symbols";
            state.mode = BAD;
            break;
          }
          state.have = 0;
          state.mode = LENLENS;
        /* falls through */
        case LENLENS:
          while (state.have < state.ncode) {
            while (bits < 3) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next3++] << bits;
              bits += 8;
            }
            state.lens[order[state.have++]] = hold & 7;
            hold >>>= 3;
            bits -= 3;
          }
          while (state.have < 19) {
            state.lens[order[state.have++]] = 0;
          }
          state.lencode = state.lendyn;
          state.lenbits = 7;
          opts = { bits: state.lenbits };
          ret = inftrees(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
          state.lenbits = opts.bits;
          if (ret) {
            strm.msg = "invalid code lengths set";
            state.mode = BAD;
            break;
          }
          state.have = 0;
          state.mode = CODELENS;
        /* falls through */
        case CODELENS:
          while (state.have < state.nlen + state.ndist) {
            for (; ; ) {
              here = state.lencode[hold & (1 << state.lenbits) - 1];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next3++] << bits;
              bits += 8;
            }
            if (here_val < 16) {
              hold >>>= here_bits;
              bits -= here_bits;
              state.lens[state.have++] = here_val;
            } else {
              if (here_val === 16) {
                n = here_bits + 2;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next3++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                if (state.have === 0) {
                  strm.msg = "invalid bit length repeat";
                  state.mode = BAD;
                  break;
                }
                len = state.lens[state.have - 1];
                copy = 3 + (hold & 3);
                hold >>>= 2;
                bits -= 2;
              } else if (here_val === 17) {
                n = here_bits + 3;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next3++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                len = 0;
                copy = 3 + (hold & 7);
                hold >>>= 3;
                bits -= 3;
              } else {
                n = here_bits + 7;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next3++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                len = 0;
                copy = 11 + (hold & 127);
                hold >>>= 7;
                bits -= 7;
              }
              if (state.have + copy > state.nlen + state.ndist) {
                strm.msg = "invalid bit length repeat";
                state.mode = BAD;
                break;
              }
              while (copy--) {
                state.lens[state.have++] = len;
              }
            }
          }
          if (state.mode === BAD) {
            break;
          }
          if (state.lens[256] === 0) {
            strm.msg = "invalid code -- missing end-of-block";
            state.mode = BAD;
            break;
          }
          state.lenbits = 9;
          opts = { bits: state.lenbits };
          ret = inftrees(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
          state.lenbits = opts.bits;
          if (ret) {
            strm.msg = "invalid literal/lengths set";
            state.mode = BAD;
            break;
          }
          state.distbits = 6;
          state.distcode = state.distdyn;
          opts = { bits: state.distbits };
          ret = inftrees(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
          state.distbits = opts.bits;
          if (ret) {
            strm.msg = "invalid distances set";
            state.mode = BAD;
            break;
          }
          state.mode = LEN_;
          if (flush === Z_TREES) {
            break inf_leave;
          }
        /* falls through */
        case LEN_:
          state.mode = LEN;
        /* falls through */
        case LEN:
          if (have >= 6 && left >= 258) {
            strm.next_out = put;
            strm.avail_out = left;
            strm.next_in = next3;
            strm.avail_in = have;
            state.hold = hold;
            state.bits = bits;
            inffast(strm, _out);
            put = strm.next_out;
            output = strm.output;
            left = strm.avail_out;
            next3 = strm.next_in;
            input = strm.input;
            have = strm.avail_in;
            hold = state.hold;
            bits = state.bits;
            if (state.mode === TYPE) {
              state.back = -1;
            }
            break;
          }
          state.back = 0;
          for (; ; ) {
            here = state.lencode[hold & (1 << state.lenbits) - 1];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 255;
            here_val = here & 65535;
            if (here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next3++] << bits;
            bits += 8;
          }
          if (here_op && (here_op & 240) === 0) {
            last_bits = here_bits;
            last_op = here_op;
            last_val = here_val;
            for (; ; ) {
              here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (last_bits + here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next3++] << bits;
              bits += 8;
            }
            hold >>>= last_bits;
            bits -= last_bits;
            state.back += last_bits;
          }
          hold >>>= here_bits;
          bits -= here_bits;
          state.back += here_bits;
          state.length = here_val;
          if (here_op === 0) {
            state.mode = LIT;
            break;
          }
          if (here_op & 32) {
            state.back = -1;
            state.mode = TYPE;
            break;
          }
          if (here_op & 64) {
            strm.msg = "invalid literal/length code";
            state.mode = BAD;
            break;
          }
          state.extra = here_op & 15;
          state.mode = LENEXT;
        /* falls through */
        case LENEXT:
          if (state.extra) {
            n = state.extra;
            while (bits < n) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next3++] << bits;
              bits += 8;
            }
            state.length += hold & (1 << state.extra) - 1;
            hold >>>= state.extra;
            bits -= state.extra;
            state.back += state.extra;
          }
          state.was = state.length;
          state.mode = DIST;
        /* falls through */
        case DIST:
          for (; ; ) {
            here = state.distcode[hold & (1 << state.distbits) - 1];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 255;
            here_val = here & 65535;
            if (here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next3++] << bits;
            bits += 8;
          }
          if ((here_op & 240) === 0) {
            last_bits = here_bits;
            last_op = here_op;
            last_val = here_val;
            for (; ; ) {
              here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (last_bits + here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next3++] << bits;
              bits += 8;
            }
            hold >>>= last_bits;
            bits -= last_bits;
            state.back += last_bits;
          }
          hold >>>= here_bits;
          bits -= here_bits;
          state.back += here_bits;
          if (here_op & 64) {
            strm.msg = "invalid distance code";
            state.mode = BAD;
            break;
          }
          state.offset = here_val;
          state.extra = here_op & 15;
          state.mode = DISTEXT;
        /* falls through */
        case DISTEXT:
          if (state.extra) {
            n = state.extra;
            while (bits < n) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next3++] << bits;
              bits += 8;
            }
            state.offset += hold & (1 << state.extra) - 1;
            hold >>>= state.extra;
            bits -= state.extra;
            state.back += state.extra;
          }
          if (state.offset > state.dmax) {
            strm.msg = "invalid distance too far back";
            state.mode = BAD;
            break;
          }
          state.mode = MATCH;
        /* falls through */
        case MATCH:
          if (left === 0) {
            break inf_leave;
          }
          copy = _out - left;
          if (state.offset > copy) {
            copy = state.offset - copy;
            if (copy > state.whave) {
              if (state.sane) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD;
                break;
              }
            }
            if (copy > state.wnext) {
              copy -= state.wnext;
              from = state.wsize - copy;
            } else {
              from = state.wnext - copy;
            }
            if (copy > state.length) {
              copy = state.length;
            }
            from_source = state.window;
          } else {
            from_source = output;
            from = put - state.offset;
            copy = state.length;
          }
          if (copy > left) {
            copy = left;
          }
          left -= copy;
          state.length -= copy;
          do {
            output[put++] = from_source[from++];
          } while (--copy);
          if (state.length === 0) {
            state.mode = LEN;
          }
          break;
        case LIT:
          if (left === 0) {
            break inf_leave;
          }
          output[put++] = state.length;
          left--;
          state.mode = LEN;
          break;
        case CHECK:
          if (state.wrap) {
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold |= input[next3++] << bits;
              bits += 8;
            }
            _out -= left;
            strm.total_out += _out;
            state.total += _out;
            if (state.wrap & 4 && _out) {
              strm.adler = state.check = /*UPDATE_CHECK(state.check, put - _out, _out);*/
              state.flags ? crc32_1(state.check, output, _out, put - _out) : adler32_1(state.check, output, _out, put - _out);
            }
            _out = left;
            if (state.wrap & 4 && (state.flags ? hold : zswap32(hold)) !== state.check) {
              strm.msg = "incorrect data check";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          state.mode = LENGTH;
        /* falls through */
        case LENGTH:
          if (state.wrap && state.flags) {
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next3++] << bits;
              bits += 8;
            }
            if (state.wrap & 4 && hold !== (state.total & 4294967295)) {
              strm.msg = "incorrect length check";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          state.mode = DONE;
        /* falls through */
        case DONE:
          ret = Z_STREAM_END$1;
          break inf_leave;
        case BAD:
          ret = Z_DATA_ERROR$1;
          break inf_leave;
        case MEM:
          return Z_MEM_ERROR$1;
        case SYNC:
        /* falls through */
        default:
          return Z_STREAM_ERROR$1;
      }
    }
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next3;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH$1)) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) ;
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap & 4 && _out) {
    strm.adler = state.check = /*UPDATE_CHECK(state.check, strm.next_out - _out, _out);*/
    state.flags ? crc32_1(state.check, output, _out, strm.next_out - _out) : adler32_1(state.check, output, _out, strm.next_out - _out);
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if ((_in === 0 && _out === 0 || flush === Z_FINISH$1) && ret === Z_OK$1) {
    ret = Z_BUF_ERROR;
  }
  return ret;
};
const inflateEnd = (strm) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  let state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK$1;
};
const inflateGetHeader = (strm, head) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  if ((state.wrap & 2) === 0) {
    return Z_STREAM_ERROR$1;
  }
  state.head = head;
  head.done = false;
  return Z_OK$1;
};
const inflateSetDictionary = (strm, dictionary) => {
  const dictLength = dictionary.length;
  let state;
  let dictid;
  let ret;
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  state = strm.state;
  if (state.wrap !== 0 && state.mode !== DICT) {
    return Z_STREAM_ERROR$1;
  }
  if (state.mode === DICT) {
    dictid = 1;
    dictid = adler32_1(dictid, dictionary, dictLength, 0);
    if (dictid !== state.check) {
      return Z_DATA_ERROR$1;
    }
  }
  ret = updatewindow(strm, dictionary, dictLength, dictLength);
  if (ret) {
    state.mode = MEM;
    return Z_MEM_ERROR$1;
  }
  state.havedict = 1;
  return Z_OK$1;
};
var inflateReset_1 = inflateReset;
var inflateReset2_1 = inflateReset2;
var inflateResetKeep_1 = inflateResetKeep;
var inflateInit_1 = inflateInit;
var inflateInit2_1 = inflateInit2;
var inflate_2$1 = inflate$2;
var inflateEnd_1 = inflateEnd;
var inflateGetHeader_1 = inflateGetHeader;
var inflateSetDictionary_1 = inflateSetDictionary;
var inflateInfo = "pako inflate (from Nodeca project)";
var inflate_1$2 = {
  inflateReset: inflateReset_1,
  inflateReset2: inflateReset2_1,
  inflateResetKeep: inflateResetKeep_1,
  inflateInit: inflateInit_1,
  inflateInit2: inflateInit2_1,
  inflate: inflate_2$1,
  inflateEnd: inflateEnd_1,
  inflateGetHeader: inflateGetHeader_1,
  inflateSetDictionary: inflateSetDictionary_1,
  inflateInfo
};
function GZheader() {
  this.text = 0;
  this.time = 0;
  this.xflags = 0;
  this.os = 0;
  this.extra = null;
  this.extra_len = 0;
  this.name = "";
  this.comment = "";
  this.hcrc = 0;
  this.done = false;
}
var gzheader = GZheader;
const toString = Object.prototype.toString;
const {
  Z_NO_FLUSH,
  Z_FINISH,
  Z_OK,
  Z_STREAM_END,
  Z_NEED_DICT,
  Z_STREAM_ERROR,
  Z_DATA_ERROR,
  Z_MEM_ERROR
} = constants$2;
function Inflate$1(options) {
  this.options = common.assign({
    chunkSize: 1024 * 64,
    windowBits: 15,
    to: ""
  }, options || {});
  const opt = this.options;
  if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) {
      opt.windowBits = -15;
    }
  }
  if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
    opt.windowBits += 32;
  }
  if (opt.windowBits > 15 && opt.windowBits < 48) {
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }
  this.err = 0;
  this.msg = "";
  this.ended = false;
  this.chunks = [];
  this.strm = new zstream();
  this.strm.avail_out = 0;
  let status = inflate_1$2.inflateInit2(
    this.strm,
    opt.windowBits
  );
  if (status !== Z_OK) {
    throw new Error(messages[status]);
  }
  this.header = new gzheader();
  inflate_1$2.inflateGetHeader(this.strm, this.header);
  if (opt.dictionary) {
    if (typeof opt.dictionary === "string") {
      opt.dictionary = strings.string2buf(opt.dictionary);
    } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
      opt.dictionary = new Uint8Array(opt.dictionary);
    }
    if (opt.raw) {
      status = inflate_1$2.inflateSetDictionary(this.strm, opt.dictionary);
      if (status !== Z_OK) {
        throw new Error(messages[status]);
      }
    }
  }
}
Inflate$1.prototype.push = function(data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  const dictionary = this.options.dictionary;
  let status, _flush_mode, last_avail_out;
  if (this.ended) return false;
  if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;
  else _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
  if (toString.call(data) === "[object ArrayBuffer]") {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
  for (; ; ) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    status = inflate_1$2.inflate(strm, _flush_mode);
    if (status === Z_NEED_DICT && dictionary) {
      status = inflate_1$2.inflateSetDictionary(strm, dictionary);
      if (status === Z_OK) {
        status = inflate_1$2.inflate(strm, _flush_mode);
      } else if (status === Z_DATA_ERROR) {
        status = Z_NEED_DICT;
      }
    }
    while (strm.avail_in > 0 && status === Z_STREAM_END && strm.state.wrap > 0 && data[strm.next_in] !== 0) {
      inflate_1$2.inflateReset(strm);
      status = inflate_1$2.inflate(strm, _flush_mode);
    }
    switch (status) {
      case Z_STREAM_ERROR:
      case Z_DATA_ERROR:
      case Z_NEED_DICT:
      case Z_MEM_ERROR:
        this.onEnd(status);
        this.ended = true;
        return false;
    }
    last_avail_out = strm.avail_out;
    if (strm.next_out) {
      if (strm.avail_out === 0 || status === Z_STREAM_END) {
        if (this.options.to === "string") {
          let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
          let tail = strm.next_out - next_out_utf8;
          let utf8str = strings.buf2string(strm.output, next_out_utf8);
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail) strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
          this.onData(utf8str);
        } else {
          this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
        }
      }
    }
    if (status === Z_OK && last_avail_out === 0) continue;
    if (status === Z_STREAM_END) {
      status = inflate_1$2.inflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return true;
    }
    if (strm.avail_in === 0) break;
  }
  return true;
};
Inflate$1.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};
Inflate$1.prototype.onEnd = function(status) {
  if (status === Z_OK) {
    if (this.options.to === "string") {
      this.result = this.chunks.join("");
    } else {
      this.result = common.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
function inflate$1(input, options) {
  const inflator = new Inflate$1(options);
  inflator.push(input);
  if (inflator.err) throw inflator.msg || messages[inflator.err];
  return inflator.result;
}
var inflate_2 = inflate$1;
var inflate_1$1 = {
  inflate: inflate_2
};
const { inflate } = inflate_1$1;
var inflate_1 = inflate;
class DeflateDecoder extends BaseDecoder {
  decodeBlock(buffer2) {
    return inflate_1(new Uint8Array(buffer2)).buffer;
  }
}
const deflate = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: DeflateDecoder
}, Symbol.toStringTag, { value: "Module" }));
class PackbitsDecoder extends BaseDecoder {
  decodeBlock(buffer2) {
    const dataView = new DataView(buffer2);
    const out = [];
    for (let i = 0; i < buffer2.byteLength; ++i) {
      let header = dataView.getInt8(i);
      if (header < 0) {
        const next3 = dataView.getUint8(i + 1);
        header = -header;
        for (let j = 0; j <= header; ++j) {
          out.push(next3);
        }
        i += 1;
      } else {
        for (let j = 0; j <= header; ++j) {
          out.push(dataView.getUint8(i + j + 1));
        }
        i += header + 1;
      }
    }
    return new Uint8Array(out).buffer;
  }
}
const packbits = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: PackbitsDecoder
}, Symbol.toStringTag, { value: "Module" }));
var LercDecode = { exports: {} };
var hasRequiredLercDecode;
function requireLercDecode() {
  if (hasRequiredLercDecode) return LercDecode.exports;
  hasRequiredLercDecode = 1;
  (function(module) {
    (function() {
      var LercDecode2 = (function() {
        var CntZImage = {};
        CntZImage.defaultNoDataValue = -34027999387901484e22;
        CntZImage.decode = function(input, options) {
          options = options || {};
          var skipMask = options.encodedMaskData || options.encodedMaskData === null;
          var parsedData = parse2(input, options.inputOffset || 0, skipMask);
          var noDataValue = options.noDataValue !== null ? options.noDataValue : CntZImage.defaultNoDataValue;
          var uncompressedData = uncompressPixelValues(
            parsedData,
            options.pixelType || Float32Array,
            options.encodedMaskData,
            noDataValue,
            options.returnMask
          );
          var result = {
            width: parsedData.width,
            height: parsedData.height,
            pixelData: uncompressedData.resultPixels,
            minValue: uncompressedData.minValue,
            maxValue: parsedData.pixels.maxValue,
            noDataValue
          };
          if (uncompressedData.resultMask) {
            result.maskData = uncompressedData.resultMask;
          }
          if (options.returnEncodedMask && parsedData.mask) {
            result.encodedMaskData = parsedData.mask.bitset ? parsedData.mask.bitset : null;
          }
          if (options.returnFileInfo) {
            result.fileInfo = formatFileInfo(parsedData);
            if (options.computeUsedBitDepths) {
              result.fileInfo.bitDepths = computeUsedBitDepths(parsedData);
            }
          }
          return result;
        };
        var uncompressPixelValues = function(data, TypedArrayClass, maskBitset, noDataValue, storeDecodedMask) {
          var blockIdx = 0;
          var numX = data.pixels.numBlocksX;
          var numY = data.pixels.numBlocksY;
          var blockWidth = Math.floor(data.width / numX);
          var blockHeight = Math.floor(data.height / numY);
          var scale = 2 * data.maxZError;
          var minValue = Number.MAX_VALUE, currentValue;
          maskBitset = maskBitset || (data.mask ? data.mask.bitset : null);
          var resultPixels, resultMask;
          resultPixels = new TypedArrayClass(data.width * data.height);
          if (storeDecodedMask && maskBitset) {
            resultMask = new Uint8Array(data.width * data.height);
          }
          var blockDataBuffer = new Float32Array(blockWidth * blockHeight);
          var xx, yy;
          for (var y = 0; y <= numY; y++) {
            var thisBlockHeight = y !== numY ? blockHeight : data.height % numY;
            if (thisBlockHeight === 0) {
              continue;
            }
            for (var x = 0; x <= numX; x++) {
              var thisBlockWidth = x !== numX ? blockWidth : data.width % numX;
              if (thisBlockWidth === 0) {
                continue;
              }
              var outPtr = y * data.width * blockHeight + x * blockWidth;
              var outStride = data.width - thisBlockWidth;
              var block = data.pixels.blocks[blockIdx];
              var blockData, blockPtr, constValue;
              if (block.encoding < 2) {
                if (block.encoding === 0) {
                  blockData = block.rawData;
                } else {
                  unstuff(block.stuffedData, block.bitsPerPixel, block.numValidPixels, block.offset, scale, blockDataBuffer, data.pixels.maxValue);
                  blockData = blockDataBuffer;
                }
                blockPtr = 0;
              } else if (block.encoding === 2) {
                constValue = 0;
              } else {
                constValue = block.offset;
              }
              var maskByte;
              if (maskBitset) {
                for (yy = 0; yy < thisBlockHeight; yy++) {
                  if (outPtr & 7) {
                    maskByte = maskBitset[outPtr >> 3];
                    maskByte <<= outPtr & 7;
                  }
                  for (xx = 0; xx < thisBlockWidth; xx++) {
                    if (!(outPtr & 7)) {
                      maskByte = maskBitset[outPtr >> 3];
                    }
                    if (maskByte & 128) {
                      if (resultMask) {
                        resultMask[outPtr] = 1;
                      }
                      currentValue = block.encoding < 2 ? blockData[blockPtr++] : constValue;
                      minValue = minValue > currentValue ? currentValue : minValue;
                      resultPixels[outPtr++] = currentValue;
                    } else {
                      if (resultMask) {
                        resultMask[outPtr] = 0;
                      }
                      resultPixels[outPtr++] = noDataValue;
                    }
                    maskByte <<= 1;
                  }
                  outPtr += outStride;
                }
              } else {
                if (block.encoding < 2) {
                  for (yy = 0; yy < thisBlockHeight; yy++) {
                    for (xx = 0; xx < thisBlockWidth; xx++) {
                      currentValue = blockData[blockPtr++];
                      minValue = minValue > currentValue ? currentValue : minValue;
                      resultPixels[outPtr++] = currentValue;
                    }
                    outPtr += outStride;
                  }
                } else {
                  minValue = minValue > constValue ? constValue : minValue;
                  for (yy = 0; yy < thisBlockHeight; yy++) {
                    for (xx = 0; xx < thisBlockWidth; xx++) {
                      resultPixels[outPtr++] = constValue;
                    }
                    outPtr += outStride;
                  }
                }
              }
              if (block.encoding === 1 && blockPtr !== block.numValidPixels) {
                throw "Block and Mask do not match";
              }
              blockIdx++;
            }
          }
          return {
            resultPixels,
            resultMask,
            minValue
          };
        };
        var formatFileInfo = function(data) {
          return {
            "fileIdentifierString": data.fileIdentifierString,
            "fileVersion": data.fileVersion,
            "imageType": data.imageType,
            "height": data.height,
            "width": data.width,
            "maxZError": data.maxZError,
            "eofOffset": data.eofOffset,
            "mask": data.mask ? {
              "numBlocksX": data.mask.numBlocksX,
              "numBlocksY": data.mask.numBlocksY,
              "numBytes": data.mask.numBytes,
              "maxValue": data.mask.maxValue
            } : null,
            "pixels": {
              "numBlocksX": data.pixels.numBlocksX,
              "numBlocksY": data.pixels.numBlocksY,
              "numBytes": data.pixels.numBytes,
              "maxValue": data.pixels.maxValue,
              "noDataValue": data.noDataValue
            }
          };
        };
        var computeUsedBitDepths = function(data) {
          var numBlocks = data.pixels.numBlocksX * data.pixels.numBlocksY;
          var bitDepths = {};
          for (var i = 0; i < numBlocks; i++) {
            var block = data.pixels.blocks[i];
            if (block.encoding === 0) {
              bitDepths.float32 = true;
            } else if (block.encoding === 1) {
              bitDepths[block.bitsPerPixel] = true;
            } else {
              bitDepths[0] = true;
            }
          }
          return Object.keys(bitDepths);
        };
        var parse2 = function(input, fp, skipMask) {
          var data = {};
          var fileIdView = new Uint8Array(input, fp, 10);
          data.fileIdentifierString = String.fromCharCode.apply(null, fileIdView);
          if (data.fileIdentifierString.trim() !== "CntZImage") {
            throw "Unexpected file identifier string: " + data.fileIdentifierString;
          }
          fp += 10;
          var view = new DataView(input, fp, 24);
          data.fileVersion = view.getInt32(0, true);
          data.imageType = view.getInt32(4, true);
          data.height = view.getUint32(8, true);
          data.width = view.getUint32(12, true);
          data.maxZError = view.getFloat64(16, true);
          fp += 24;
          if (!skipMask) {
            view = new DataView(input, fp, 16);
            data.mask = {};
            data.mask.numBlocksY = view.getUint32(0, true);
            data.mask.numBlocksX = view.getUint32(4, true);
            data.mask.numBytes = view.getUint32(8, true);
            data.mask.maxValue = view.getFloat32(12, true);
            fp += 16;
            if (data.mask.numBytes > 0) {
              var bitset = new Uint8Array(Math.ceil(data.width * data.height / 8));
              view = new DataView(input, fp, data.mask.numBytes);
              var cnt = view.getInt16(0, true);
              var ip = 2, op = 0;
              do {
                if (cnt > 0) {
                  while (cnt--) {
                    bitset[op++] = view.getUint8(ip++);
                  }
                } else {
                  var val = view.getUint8(ip++);
                  cnt = -cnt;
                  while (cnt--) {
                    bitset[op++] = val;
                  }
                }
                cnt = view.getInt16(ip, true);
                ip += 2;
              } while (ip < data.mask.numBytes);
              if (cnt !== -32768 || op < bitset.length) {
                throw "Unexpected end of mask RLE encoding";
              }
              data.mask.bitset = bitset;
              fp += data.mask.numBytes;
            } else if ((data.mask.numBytes | data.mask.numBlocksY | data.mask.maxValue) === 0) {
              data.mask.bitset = new Uint8Array(Math.ceil(data.width * data.height / 8));
            }
          }
          view = new DataView(input, fp, 16);
          data.pixels = {};
          data.pixels.numBlocksY = view.getUint32(0, true);
          data.pixels.numBlocksX = view.getUint32(4, true);
          data.pixels.numBytes = view.getUint32(8, true);
          data.pixels.maxValue = view.getFloat32(12, true);
          fp += 16;
          var numBlocksX = data.pixels.numBlocksX;
          var numBlocksY = data.pixels.numBlocksY;
          var actualNumBlocksX = numBlocksX + (data.width % numBlocksX > 0 ? 1 : 0);
          var actualNumBlocksY = numBlocksY + (data.height % numBlocksY > 0 ? 1 : 0);
          data.pixels.blocks = new Array(actualNumBlocksX * actualNumBlocksY);
          var blockI = 0;
          for (var blockY = 0; blockY < actualNumBlocksY; blockY++) {
            for (var blockX = 0; blockX < actualNumBlocksX; blockX++) {
              var size = 0;
              var bytesLeft = input.byteLength - fp;
              view = new DataView(input, fp, Math.min(10, bytesLeft));
              var block = {};
              data.pixels.blocks[blockI++] = block;
              var headerByte = view.getUint8(0);
              size++;
              block.encoding = headerByte & 63;
              if (block.encoding > 3) {
                throw "Invalid block encoding (" + block.encoding + ")";
              }
              if (block.encoding === 2) {
                fp++;
                continue;
              }
              if (headerByte !== 0 && headerByte !== 2) {
                headerByte >>= 6;
                block.offsetType = headerByte;
                if (headerByte === 2) {
                  block.offset = view.getInt8(1);
                  size++;
                } else if (headerByte === 1) {
                  block.offset = view.getInt16(1, true);
                  size += 2;
                } else if (headerByte === 0) {
                  block.offset = view.getFloat32(1, true);
                  size += 4;
                } else {
                  throw "Invalid block offset type";
                }
                if (block.encoding === 1) {
                  headerByte = view.getUint8(size);
                  size++;
                  block.bitsPerPixel = headerByte & 63;
                  headerByte >>= 6;
                  block.numValidPixelsType = headerByte;
                  if (headerByte === 2) {
                    block.numValidPixels = view.getUint8(size);
                    size++;
                  } else if (headerByte === 1) {
                    block.numValidPixels = view.getUint16(size, true);
                    size += 2;
                  } else if (headerByte === 0) {
                    block.numValidPixels = view.getUint32(size, true);
                    size += 4;
                  } else {
                    throw "Invalid valid pixel count type";
                  }
                }
              }
              fp += size;
              if (block.encoding === 3) {
                continue;
              }
              var arrayBuf, store8;
              if (block.encoding === 0) {
                var numPixels = (data.pixels.numBytes - 1) / 4;
                if (numPixels !== Math.floor(numPixels)) {
                  throw "uncompressed block has invalid length";
                }
                arrayBuf = new ArrayBuffer(numPixels * 4);
                store8 = new Uint8Array(arrayBuf);
                store8.set(new Uint8Array(input, fp, numPixels * 4));
                var rawData = new Float32Array(arrayBuf);
                block.rawData = rawData;
                fp += numPixels * 4;
              } else if (block.encoding === 1) {
                var dataBytes = Math.ceil(block.numValidPixels * block.bitsPerPixel / 8);
                var dataWords = Math.ceil(dataBytes / 4);
                arrayBuf = new ArrayBuffer(dataWords * 4);
                store8 = new Uint8Array(arrayBuf);
                store8.set(new Uint8Array(input, fp, dataBytes));
                block.stuffedData = new Uint32Array(arrayBuf);
                fp += dataBytes;
              }
            }
          }
          data.eofOffset = fp;
          return data;
        };
        var unstuff = function(src, bitsPerPixel, numPixels, offset, scale, dest, maxValue) {
          var bitMask = (1 << bitsPerPixel) - 1;
          var i = 0, o;
          var bitsLeft = 0;
          var n, buffer2;
          var nmax = Math.ceil((maxValue - offset) / scale);
          var numInvalidTailBytes = src.length * 4 - Math.ceil(bitsPerPixel * numPixels / 8);
          src[src.length - 1] <<= 8 * numInvalidTailBytes;
          for (o = 0; o < numPixels; o++) {
            if (bitsLeft === 0) {
              buffer2 = src[i++];
              bitsLeft = 32;
            }
            if (bitsLeft >= bitsPerPixel) {
              n = buffer2 >>> bitsLeft - bitsPerPixel & bitMask;
              bitsLeft -= bitsPerPixel;
            } else {
              var missingBits = bitsPerPixel - bitsLeft;
              n = (buffer2 & bitMask) << missingBits & bitMask;
              buffer2 = src[i++];
              bitsLeft = 32 - missingBits;
              n += buffer2 >>> bitsLeft;
            }
            dest[o] = n < nmax ? offset + n * scale : maxValue;
          }
          return dest;
        };
        return CntZImage;
      })();
      var Lerc2Decode = /* @__PURE__ */ (function() {
        var BitStuffer = {
          //methods ending with 2 are for the new byte order used by Lerc2.3 and above.
          //originalUnstuff is used to unpack Huffman code table. code is duplicated to unstuffx for performance reasons.
          unstuff: function(src, dest, bitsPerPixel, numPixels, lutArr, offset, scale, maxValue) {
            var bitMask = (1 << bitsPerPixel) - 1;
            var i = 0, o;
            var bitsLeft = 0;
            var n, buffer2, missingBits, nmax;
            var numInvalidTailBytes = src.length * 4 - Math.ceil(bitsPerPixel * numPixels / 8);
            src[src.length - 1] <<= 8 * numInvalidTailBytes;
            if (lutArr) {
              for (o = 0; o < numPixels; o++) {
                if (bitsLeft === 0) {
                  buffer2 = src[i++];
                  bitsLeft = 32;
                }
                if (bitsLeft >= bitsPerPixel) {
                  n = buffer2 >>> bitsLeft - bitsPerPixel & bitMask;
                  bitsLeft -= bitsPerPixel;
                } else {
                  missingBits = bitsPerPixel - bitsLeft;
                  n = (buffer2 & bitMask) << missingBits & bitMask;
                  buffer2 = src[i++];
                  bitsLeft = 32 - missingBits;
                  n += buffer2 >>> bitsLeft;
                }
                dest[o] = lutArr[n];
              }
            } else {
              nmax = Math.ceil((maxValue - offset) / scale);
              for (o = 0; o < numPixels; o++) {
                if (bitsLeft === 0) {
                  buffer2 = src[i++];
                  bitsLeft = 32;
                }
                if (bitsLeft >= bitsPerPixel) {
                  n = buffer2 >>> bitsLeft - bitsPerPixel & bitMask;
                  bitsLeft -= bitsPerPixel;
                } else {
                  missingBits = bitsPerPixel - bitsLeft;
                  n = (buffer2 & bitMask) << missingBits & bitMask;
                  buffer2 = src[i++];
                  bitsLeft = 32 - missingBits;
                  n += buffer2 >>> bitsLeft;
                }
                dest[o] = n < nmax ? offset + n * scale : maxValue;
              }
            }
          },
          unstuffLUT: function(src, bitsPerPixel, numPixels, offset, scale, maxValue) {
            var bitMask = (1 << bitsPerPixel) - 1;
            var i = 0, o = 0, missingBits = 0, bitsLeft = 0, n = 0;
            var buffer2;
            var dest = [];
            var numInvalidTailBytes = src.length * 4 - Math.ceil(bitsPerPixel * numPixels / 8);
            src[src.length - 1] <<= 8 * numInvalidTailBytes;
            var nmax = Math.ceil((maxValue - offset) / scale);
            for (o = 0; o < numPixels; o++) {
              if (bitsLeft === 0) {
                buffer2 = src[i++];
                bitsLeft = 32;
              }
              if (bitsLeft >= bitsPerPixel) {
                n = buffer2 >>> bitsLeft - bitsPerPixel & bitMask;
                bitsLeft -= bitsPerPixel;
              } else {
                missingBits = bitsPerPixel - bitsLeft;
                n = (buffer2 & bitMask) << missingBits & bitMask;
                buffer2 = src[i++];
                bitsLeft = 32 - missingBits;
                n += buffer2 >>> bitsLeft;
              }
              dest[o] = n < nmax ? offset + n * scale : maxValue;
            }
            dest.unshift(offset);
            return dest;
          },
          unstuff2: function(src, dest, bitsPerPixel, numPixels, lutArr, offset, scale, maxValue) {
            var bitMask = (1 << bitsPerPixel) - 1;
            var i = 0, o;
            var bitsLeft = 0, bitPos = 0;
            var n, buffer2, missingBits;
            if (lutArr) {
              for (o = 0; o < numPixels; o++) {
                if (bitsLeft === 0) {
                  buffer2 = src[i++];
                  bitsLeft = 32;
                  bitPos = 0;
                }
                if (bitsLeft >= bitsPerPixel) {
                  n = buffer2 >>> bitPos & bitMask;
                  bitsLeft -= bitsPerPixel;
                  bitPos += bitsPerPixel;
                } else {
                  missingBits = bitsPerPixel - bitsLeft;
                  n = buffer2 >>> bitPos & bitMask;
                  buffer2 = src[i++];
                  bitsLeft = 32 - missingBits;
                  n |= (buffer2 & (1 << missingBits) - 1) << bitsPerPixel - missingBits;
                  bitPos = missingBits;
                }
                dest[o] = lutArr[n];
              }
            } else {
              var nmax = Math.ceil((maxValue - offset) / scale);
              for (o = 0; o < numPixels; o++) {
                if (bitsLeft === 0) {
                  buffer2 = src[i++];
                  bitsLeft = 32;
                  bitPos = 0;
                }
                if (bitsLeft >= bitsPerPixel) {
                  n = buffer2 >>> bitPos & bitMask;
                  bitsLeft -= bitsPerPixel;
                  bitPos += bitsPerPixel;
                } else {
                  missingBits = bitsPerPixel - bitsLeft;
                  n = buffer2 >>> bitPos & bitMask;
                  buffer2 = src[i++];
                  bitsLeft = 32 - missingBits;
                  n |= (buffer2 & (1 << missingBits) - 1) << bitsPerPixel - missingBits;
                  bitPos = missingBits;
                }
                dest[o] = n < nmax ? offset + n * scale : maxValue;
              }
            }
            return dest;
          },
          unstuffLUT2: function(src, bitsPerPixel, numPixels, offset, scale, maxValue) {
            var bitMask = (1 << bitsPerPixel) - 1;
            var i = 0, o = 0, missingBits = 0, bitsLeft = 0, n = 0, bitPos = 0;
            var buffer2;
            var dest = [];
            var nmax = Math.ceil((maxValue - offset) / scale);
            for (o = 0; o < numPixels; o++) {
              if (bitsLeft === 0) {
                buffer2 = src[i++];
                bitsLeft = 32;
                bitPos = 0;
              }
              if (bitsLeft >= bitsPerPixel) {
                n = buffer2 >>> bitPos & bitMask;
                bitsLeft -= bitsPerPixel;
                bitPos += bitsPerPixel;
              } else {
                missingBits = bitsPerPixel - bitsLeft;
                n = buffer2 >>> bitPos & bitMask;
                buffer2 = src[i++];
                bitsLeft = 32 - missingBits;
                n |= (buffer2 & (1 << missingBits) - 1) << bitsPerPixel - missingBits;
                bitPos = missingBits;
              }
              dest[o] = n < nmax ? offset + n * scale : maxValue;
            }
            dest.unshift(offset);
            return dest;
          },
          originalUnstuff: function(src, dest, bitsPerPixel, numPixels) {
            var bitMask = (1 << bitsPerPixel) - 1;
            var i = 0, o;
            var bitsLeft = 0;
            var n, buffer2, missingBits;
            var numInvalidTailBytes = src.length * 4 - Math.ceil(bitsPerPixel * numPixels / 8);
            src[src.length - 1] <<= 8 * numInvalidTailBytes;
            for (o = 0; o < numPixels; o++) {
              if (bitsLeft === 0) {
                buffer2 = src[i++];
                bitsLeft = 32;
              }
              if (bitsLeft >= bitsPerPixel) {
                n = buffer2 >>> bitsLeft - bitsPerPixel & bitMask;
                bitsLeft -= bitsPerPixel;
              } else {
                missingBits = bitsPerPixel - bitsLeft;
                n = (buffer2 & bitMask) << missingBits & bitMask;
                buffer2 = src[i++];
                bitsLeft = 32 - missingBits;
                n += buffer2 >>> bitsLeft;
              }
              dest[o] = n;
            }
            return dest;
          },
          originalUnstuff2: function(src, dest, bitsPerPixel, numPixels) {
            var bitMask = (1 << bitsPerPixel) - 1;
            var i = 0, o;
            var bitsLeft = 0, bitPos = 0;
            var n, buffer2, missingBits;
            for (o = 0; o < numPixels; o++) {
              if (bitsLeft === 0) {
                buffer2 = src[i++];
                bitsLeft = 32;
                bitPos = 0;
              }
              if (bitsLeft >= bitsPerPixel) {
                n = buffer2 >>> bitPos & bitMask;
                bitsLeft -= bitsPerPixel;
                bitPos += bitsPerPixel;
              } else {
                missingBits = bitsPerPixel - bitsLeft;
                n = buffer2 >>> bitPos & bitMask;
                buffer2 = src[i++];
                bitsLeft = 32 - missingBits;
                n |= (buffer2 & (1 << missingBits) - 1) << bitsPerPixel - missingBits;
                bitPos = missingBits;
              }
              dest[o] = n;
            }
            return dest;
          }
        };
        var Lerc2Helpers = {
          HUFFMAN_LUT_BITS_MAX: 12,
          //use 2^12 lut, treat it like constant
          computeChecksumFletcher32: function(input) {
            var sum1 = 65535, sum2 = 65535;
            var len = input.length;
            var words = Math.floor(len / 2);
            var i = 0;
            while (words) {
              var tlen = words >= 359 ? 359 : words;
              words -= tlen;
              do {
                sum1 += input[i++] << 8;
                sum2 += sum1 += input[i++];
              } while (--tlen);
              sum1 = (sum1 & 65535) + (sum1 >>> 16);
              sum2 = (sum2 & 65535) + (sum2 >>> 16);
            }
            if (len & 1) {
              sum2 += sum1 += input[i] << 8;
            }
            sum1 = (sum1 & 65535) + (sum1 >>> 16);
            sum2 = (sum2 & 65535) + (sum2 >>> 16);
            return (sum2 << 16 | sum1) >>> 0;
          },
          readHeaderInfo: function(input, data) {
            var ptr = data.ptr;
            var fileIdView = new Uint8Array(input, ptr, 6);
            var headerInfo = {};
            headerInfo.fileIdentifierString = String.fromCharCode.apply(null, fileIdView);
            if (headerInfo.fileIdentifierString.lastIndexOf("Lerc2", 0) !== 0) {
              throw "Unexpected file identifier string (expect Lerc2 ): " + headerInfo.fileIdentifierString;
            }
            ptr += 6;
            var view = new DataView(input, ptr, 8);
            var fileVersion = view.getInt32(0, true);
            headerInfo.fileVersion = fileVersion;
            ptr += 4;
            if (fileVersion >= 3) {
              headerInfo.checksum = view.getUint32(4, true);
              ptr += 4;
            }
            view = new DataView(input, ptr, 12);
            headerInfo.height = view.getUint32(0, true);
            headerInfo.width = view.getUint32(4, true);
            ptr += 8;
            if (fileVersion >= 4) {
              headerInfo.numDims = view.getUint32(8, true);
              ptr += 4;
            } else {
              headerInfo.numDims = 1;
            }
            view = new DataView(input, ptr, 40);
            headerInfo.numValidPixel = view.getUint32(0, true);
            headerInfo.microBlockSize = view.getInt32(4, true);
            headerInfo.blobSize = view.getInt32(8, true);
            headerInfo.imageType = view.getInt32(12, true);
            headerInfo.maxZError = view.getFloat64(16, true);
            headerInfo.zMin = view.getFloat64(24, true);
            headerInfo.zMax = view.getFloat64(32, true);
            ptr += 40;
            data.headerInfo = headerInfo;
            data.ptr = ptr;
            var checksum, keyLength;
            if (fileVersion >= 3) {
              keyLength = fileVersion >= 4 ? 52 : 48;
              checksum = this.computeChecksumFletcher32(new Uint8Array(input, ptr - keyLength, headerInfo.blobSize - 14));
              if (checksum !== headerInfo.checksum) {
                throw "Checksum failed.";
              }
            }
            return true;
          },
          checkMinMaxRanges: function(input, data) {
            var headerInfo = data.headerInfo;
            var OutPixelTypeArray = this.getDataTypeArray(headerInfo.imageType);
            var rangeBytes = headerInfo.numDims * this.getDataTypeSize(headerInfo.imageType);
            var minValues = this.readSubArray(input, data.ptr, OutPixelTypeArray, rangeBytes);
            var maxValues = this.readSubArray(input, data.ptr + rangeBytes, OutPixelTypeArray, rangeBytes);
            data.ptr += 2 * rangeBytes;
            var i, equal = true;
            for (i = 0; i < headerInfo.numDims; i++) {
              if (minValues[i] !== maxValues[i]) {
                equal = false;
                break;
              }
            }
            headerInfo.minValues = minValues;
            headerInfo.maxValues = maxValues;
            return equal;
          },
          readSubArray: function(input, ptr, OutPixelTypeArray, numBytes) {
            var rawData;
            if (OutPixelTypeArray === Uint8Array) {
              rawData = new Uint8Array(input, ptr, numBytes);
            } else {
              var arrayBuf = new ArrayBuffer(numBytes);
              var store8 = new Uint8Array(arrayBuf);
              store8.set(new Uint8Array(input, ptr, numBytes));
              rawData = new OutPixelTypeArray(arrayBuf);
            }
            return rawData;
          },
          readMask: function(input, data) {
            var ptr = data.ptr;
            var headerInfo = data.headerInfo;
            var numPixels = headerInfo.width * headerInfo.height;
            var numValidPixel = headerInfo.numValidPixel;
            var view = new DataView(input, ptr, 4);
            var mask = {};
            mask.numBytes = view.getUint32(0, true);
            ptr += 4;
            if ((0 === numValidPixel || numPixels === numValidPixel) && 0 !== mask.numBytes) {
              throw "invalid mask";
            }
            var bitset, resultMask;
            if (numValidPixel === 0) {
              bitset = new Uint8Array(Math.ceil(numPixels / 8));
              mask.bitset = bitset;
              resultMask = new Uint8Array(numPixels);
              data.pixels.resultMask = resultMask;
              ptr += mask.numBytes;
            } else if (mask.numBytes > 0) {
              bitset = new Uint8Array(Math.ceil(numPixels / 8));
              view = new DataView(input, ptr, mask.numBytes);
              var cnt = view.getInt16(0, true);
              var ip = 2, op = 0, val = 0;
              do {
                if (cnt > 0) {
                  while (cnt--) {
                    bitset[op++] = view.getUint8(ip++);
                  }
                } else {
                  val = view.getUint8(ip++);
                  cnt = -cnt;
                  while (cnt--) {
                    bitset[op++] = val;
                  }
                }
                cnt = view.getInt16(ip, true);
                ip += 2;
              } while (ip < mask.numBytes);
              if (cnt !== -32768 || op < bitset.length) {
                throw "Unexpected end of mask RLE encoding";
              }
              resultMask = new Uint8Array(numPixels);
              var mb = 0, k = 0;
              for (k = 0; k < numPixels; k++) {
                if (k & 7) {
                  mb = bitset[k >> 3];
                  mb <<= k & 7;
                } else {
                  mb = bitset[k >> 3];
                }
                if (mb & 128) {
                  resultMask[k] = 1;
                }
              }
              data.pixels.resultMask = resultMask;
              mask.bitset = bitset;
              ptr += mask.numBytes;
            }
            data.ptr = ptr;
            data.mask = mask;
            return true;
          },
          readDataOneSweep: function(input, data, OutPixelTypeArray, useBSQForOutputDim) {
            var ptr = data.ptr;
            var headerInfo = data.headerInfo;
            var numDims = headerInfo.numDims;
            var numPixels = headerInfo.width * headerInfo.height;
            var imageType = headerInfo.imageType;
            var numBytes = headerInfo.numValidPixel * Lerc2Helpers.getDataTypeSize(imageType) * numDims;
            var rawData;
            var mask = data.pixels.resultMask;
            if (OutPixelTypeArray === Uint8Array) {
              rawData = new Uint8Array(input, ptr, numBytes);
            } else {
              var arrayBuf = new ArrayBuffer(numBytes);
              var store8 = new Uint8Array(arrayBuf);
              store8.set(new Uint8Array(input, ptr, numBytes));
              rawData = new OutPixelTypeArray(arrayBuf);
            }
            if (rawData.length === numPixels * numDims) {
              if (useBSQForOutputDim) {
                data.pixels.resultPixels = Lerc2Helpers.swapDimensionOrder(rawData, numPixels, numDims, OutPixelTypeArray, true);
              } else {
                data.pixels.resultPixels = rawData;
              }
            } else {
              data.pixels.resultPixels = new OutPixelTypeArray(numPixels * numDims);
              var z = 0, k = 0, i = 0, nStart = 0;
              if (numDims > 1) {
                if (useBSQForOutputDim) {
                  for (k = 0; k < numPixels; k++) {
                    if (mask[k]) {
                      nStart = k;
                      for (i = 0; i < numDims; i++, nStart += numPixels) {
                        data.pixels.resultPixels[nStart] = rawData[z++];
                      }
                    }
                  }
                } else {
                  for (k = 0; k < numPixels; k++) {
                    if (mask[k]) {
                      nStart = k * numDims;
                      for (i = 0; i < numDims; i++) {
                        data.pixels.resultPixels[nStart + i] = rawData[z++];
                      }
                    }
                  }
                }
              } else {
                for (k = 0; k < numPixels; k++) {
                  if (mask[k]) {
                    data.pixels.resultPixels[k] = rawData[z++];
                  }
                }
              }
            }
            ptr += numBytes;
            data.ptr = ptr;
            return true;
          },
          readHuffmanTree: function(input, data) {
            var BITS_MAX = this.HUFFMAN_LUT_BITS_MAX;
            var view = new DataView(input, data.ptr, 16);
            data.ptr += 16;
            var version2 = view.getInt32(0, true);
            if (version2 < 2) {
              throw "unsupported Huffman version";
            }
            var size = view.getInt32(4, true);
            var i0 = view.getInt32(8, true);
            var i1 = view.getInt32(12, true);
            if (i0 >= i1) {
              return false;
            }
            var blockDataBuffer = new Uint32Array(i1 - i0);
            Lerc2Helpers.decodeBits(input, data, blockDataBuffer);
            var codeTable = [];
            var i, j, k, len;
            for (i = i0; i < i1; i++) {
              j = i - (i < size ? 0 : size);
              codeTable[j] = { first: blockDataBuffer[i - i0], second: null };
            }
            var dataBytes = input.byteLength - data.ptr;
            var dataWords = Math.ceil(dataBytes / 4);
            var arrayBuf = new ArrayBuffer(dataWords * 4);
            var store8 = new Uint8Array(arrayBuf);
            store8.set(new Uint8Array(input, data.ptr, dataBytes));
            var stuffedData = new Uint32Array(arrayBuf);
            var bitPos = 0, word, srcPtr = 0;
            word = stuffedData[0];
            for (i = i0; i < i1; i++) {
              j = i - (i < size ? 0 : size);
              len = codeTable[j].first;
              if (len > 0) {
                codeTable[j].second = word << bitPos >>> 32 - len;
                if (32 - bitPos >= len) {
                  bitPos += len;
                  if (bitPos === 32) {
                    bitPos = 0;
                    srcPtr++;
                    word = stuffedData[srcPtr];
                  }
                } else {
                  bitPos += len - 32;
                  srcPtr++;
                  word = stuffedData[srcPtr];
                  codeTable[j].second |= word >>> 32 - bitPos;
                }
              }
            }
            var numBitsLUT = 0, numBitsLUTQick = 0;
            var tree = new TreeNode();
            for (i = 0; i < codeTable.length; i++) {
              if (codeTable[i] !== void 0) {
                numBitsLUT = Math.max(numBitsLUT, codeTable[i].first);
              }
            }
            if (numBitsLUT >= BITS_MAX) {
              numBitsLUTQick = BITS_MAX;
            } else {
              numBitsLUTQick = numBitsLUT;
            }
            var decodeLut = [], entry, code, numEntries, jj, currentBit, node2;
            for (i = i0; i < i1; i++) {
              j = i - (i < size ? 0 : size);
              len = codeTable[j].first;
              if (len > 0) {
                entry = [len, j];
                if (len <= numBitsLUTQick) {
                  code = codeTable[j].second << numBitsLUTQick - len;
                  numEntries = 1 << numBitsLUTQick - len;
                  for (k = 0; k < numEntries; k++) {
                    decodeLut[code | k] = entry;
                  }
                } else {
                  code = codeTable[j].second;
                  node2 = tree;
                  for (jj = len - 1; jj >= 0; jj--) {
                    currentBit = code >>> jj & 1;
                    if (currentBit) {
                      if (!node2.right) {
                        node2.right = new TreeNode();
                      }
                      node2 = node2.right;
                    } else {
                      if (!node2.left) {
                        node2.left = new TreeNode();
                      }
                      node2 = node2.left;
                    }
                    if (jj === 0 && !node2.val) {
                      node2.val = entry[1];
                    }
                  }
                }
              }
            }
            return {
              decodeLut,
              numBitsLUTQick,
              numBitsLUT,
              tree,
              stuffedData,
              srcPtr,
              bitPos
            };
          },
          readHuffman: function(input, data, OutPixelTypeArray, useBSQForOutputDim) {
            var headerInfo = data.headerInfo;
            var numDims = headerInfo.numDims;
            var height = data.headerInfo.height;
            var width = data.headerInfo.width;
            var numPixels = width * height;
            var huffmanInfo = this.readHuffmanTree(input, data);
            var decodeLut = huffmanInfo.decodeLut;
            var tree = huffmanInfo.tree;
            var stuffedData = huffmanInfo.stuffedData;
            var srcPtr = huffmanInfo.srcPtr;
            var bitPos = huffmanInfo.bitPos;
            var numBitsLUTQick = huffmanInfo.numBitsLUTQick;
            var numBitsLUT = huffmanInfo.numBitsLUT;
            var offset = data.headerInfo.imageType === 0 ? 128 : 0;
            var node2, val, delta, mask = data.pixels.resultMask, valTmp, valTmpQuick, currentBit;
            var i, j, k, ii;
            var prevVal = 0;
            if (bitPos > 0) {
              srcPtr++;
              bitPos = 0;
            }
            var word = stuffedData[srcPtr];
            var deltaEncode = data.encodeMode === 1;
            var resultPixelsAllDim = new OutPixelTypeArray(numPixels * numDims);
            var resultPixels = resultPixelsAllDim;
            var iDim;
            if (numDims < 2 || deltaEncode) {
              for (iDim = 0; iDim < numDims; iDim++) {
                if (numDims > 1) {
                  resultPixels = new OutPixelTypeArray(resultPixelsAllDim.buffer, numPixels * iDim, numPixels);
                  prevVal = 0;
                }
                if (data.headerInfo.numValidPixel === width * height) {
                  for (k = 0, i = 0; i < height; i++) {
                    for (j = 0; j < width; j++, k++) {
                      val = 0;
                      valTmp = word << bitPos >>> 32 - numBitsLUTQick;
                      valTmpQuick = valTmp;
                      if (32 - bitPos < numBitsLUTQick) {
                        valTmp |= stuffedData[srcPtr + 1] >>> 64 - bitPos - numBitsLUTQick;
                        valTmpQuick = valTmp;
                      }
                      if (decodeLut[valTmpQuick]) {
                        val = decodeLut[valTmpQuick][1];
                        bitPos += decodeLut[valTmpQuick][0];
                      } else {
                        valTmp = word << bitPos >>> 32 - numBitsLUT;
                        valTmpQuick = valTmp;
                        if (32 - bitPos < numBitsLUT) {
                          valTmp |= stuffedData[srcPtr + 1] >>> 64 - bitPos - numBitsLUT;
                          valTmpQuick = valTmp;
                        }
                        node2 = tree;
                        for (ii = 0; ii < numBitsLUT; ii++) {
                          currentBit = valTmp >>> numBitsLUT - ii - 1 & 1;
                          node2 = currentBit ? node2.right : node2.left;
                          if (!(node2.left || node2.right)) {
                            val = node2.val;
                            bitPos = bitPos + ii + 1;
                            break;
                          }
                        }
                      }
                      if (bitPos >= 32) {
                        bitPos -= 32;
                        srcPtr++;
                        word = stuffedData[srcPtr];
                      }
                      delta = val - offset;
                      if (deltaEncode) {
                        if (j > 0) {
                          delta += prevVal;
                        } else if (i > 0) {
                          delta += resultPixels[k - width];
                        } else {
                          delta += prevVal;
                        }
                        delta &= 255;
                        resultPixels[k] = delta;
                        prevVal = delta;
                      } else {
                        resultPixels[k] = delta;
                      }
                    }
                  }
                } else {
                  for (k = 0, i = 0; i < height; i++) {
                    for (j = 0; j < width; j++, k++) {
                      if (mask[k]) {
                        val = 0;
                        valTmp = word << bitPos >>> 32 - numBitsLUTQick;
                        valTmpQuick = valTmp;
                        if (32 - bitPos < numBitsLUTQick) {
                          valTmp |= stuffedData[srcPtr + 1] >>> 64 - bitPos - numBitsLUTQick;
                          valTmpQuick = valTmp;
                        }
                        if (decodeLut[valTmpQuick]) {
                          val = decodeLut[valTmpQuick][1];
                          bitPos += decodeLut[valTmpQuick][0];
                        } else {
                          valTmp = word << bitPos >>> 32 - numBitsLUT;
                          valTmpQuick = valTmp;
                          if (32 - bitPos < numBitsLUT) {
                            valTmp |= stuffedData[srcPtr + 1] >>> 64 - bitPos - numBitsLUT;
                            valTmpQuick = valTmp;
                          }
                          node2 = tree;
                          for (ii = 0; ii < numBitsLUT; ii++) {
                            currentBit = valTmp >>> numBitsLUT - ii - 1 & 1;
                            node2 = currentBit ? node2.right : node2.left;
                            if (!(node2.left || node2.right)) {
                              val = node2.val;
                              bitPos = bitPos + ii + 1;
                              break;
                            }
                          }
                        }
                        if (bitPos >= 32) {
                          bitPos -= 32;
                          srcPtr++;
                          word = stuffedData[srcPtr];
                        }
                        delta = val - offset;
                        if (deltaEncode) {
                          if (j > 0 && mask[k - 1]) {
                            delta += prevVal;
                          } else if (i > 0 && mask[k - width]) {
                            delta += resultPixels[k - width];
                          } else {
                            delta += prevVal;
                          }
                          delta &= 255;
                          resultPixels[k] = delta;
                          prevVal = delta;
                        } else {
                          resultPixels[k] = delta;
                        }
                      }
                    }
                  }
                }
              }
            } else {
              for (k = 0, i = 0; i < height; i++) {
                for (j = 0; j < width; j++) {
                  k = i * width + j;
                  if (!mask || mask[k]) {
                    for (iDim = 0; iDim < numDims; iDim++, k += numPixels) {
                      val = 0;
                      valTmp = word << bitPos >>> 32 - numBitsLUTQick;
                      valTmpQuick = valTmp;
                      if (32 - bitPos < numBitsLUTQick) {
                        valTmp |= stuffedData[srcPtr + 1] >>> 64 - bitPos - numBitsLUTQick;
                        valTmpQuick = valTmp;
                      }
                      if (decodeLut[valTmpQuick]) {
                        val = decodeLut[valTmpQuick][1];
                        bitPos += decodeLut[valTmpQuick][0];
                      } else {
                        valTmp = word << bitPos >>> 32 - numBitsLUT;
                        valTmpQuick = valTmp;
                        if (32 - bitPos < numBitsLUT) {
                          valTmp |= stuffedData[srcPtr + 1] >>> 64 - bitPos - numBitsLUT;
                          valTmpQuick = valTmp;
                        }
                        node2 = tree;
                        for (ii = 0; ii < numBitsLUT; ii++) {
                          currentBit = valTmp >>> numBitsLUT - ii - 1 & 1;
                          node2 = currentBit ? node2.right : node2.left;
                          if (!(node2.left || node2.right)) {
                            val = node2.val;
                            bitPos = bitPos + ii + 1;
                            break;
                          }
                        }
                      }
                      if (bitPos >= 32) {
                        bitPos -= 32;
                        srcPtr++;
                        word = stuffedData[srcPtr];
                      }
                      delta = val - offset;
                      resultPixels[k] = delta;
                    }
                  }
                }
              }
            }
            data.ptr = data.ptr + (srcPtr + 1) * 4 + (bitPos > 0 ? 4 : 0);
            data.pixels.resultPixels = resultPixelsAllDim;
            if (numDims > 1 && !useBSQForOutputDim) {
              data.pixels.resultPixels = Lerc2Helpers.swapDimensionOrder(resultPixelsAllDim, numPixels, numDims, OutPixelTypeArray);
            }
          },
          decodeBits: function(input, data, blockDataBuffer, offset, iDim) {
            {
              var headerInfo = data.headerInfo;
              var fileVersion = headerInfo.fileVersion;
              var blockPtr = 0;
              var viewByteLength = input.byteLength - data.ptr >= 5 ? 5 : input.byteLength - data.ptr;
              var view = new DataView(input, data.ptr, viewByteLength);
              var headerByte = view.getUint8(0);
              blockPtr++;
              var bits67 = headerByte >> 6;
              var n = bits67 === 0 ? 4 : 3 - bits67;
              var doLut = (headerByte & 32) > 0 ? true : false;
              var numBits = headerByte & 31;
              var numElements = 0;
              if (n === 1) {
                numElements = view.getUint8(blockPtr);
                blockPtr++;
              } else if (n === 2) {
                numElements = view.getUint16(blockPtr, true);
                blockPtr += 2;
              } else if (n === 4) {
                numElements = view.getUint32(blockPtr, true);
                blockPtr += 4;
              } else {
                throw "Invalid valid pixel count type";
              }
              var scale = 2 * headerInfo.maxZError;
              var stuffedData, arrayBuf, store8, dataBytes, dataWords;
              var lutArr, lutData, lutBytes, bitsPerPixel;
              var zMax = headerInfo.numDims > 1 ? headerInfo.maxValues[iDim] : headerInfo.zMax;
              if (doLut) {
                data.counter.lut++;
                lutBytes = view.getUint8(blockPtr);
                blockPtr++;
                dataBytes = Math.ceil((lutBytes - 1) * numBits / 8);
                dataWords = Math.ceil(dataBytes / 4);
                arrayBuf = new ArrayBuffer(dataWords * 4);
                store8 = new Uint8Array(arrayBuf);
                data.ptr += blockPtr;
                store8.set(new Uint8Array(input, data.ptr, dataBytes));
                lutData = new Uint32Array(arrayBuf);
                data.ptr += dataBytes;
                bitsPerPixel = 0;
                while (lutBytes - 1 >>> bitsPerPixel) {
                  bitsPerPixel++;
                }
                dataBytes = Math.ceil(numElements * bitsPerPixel / 8);
                dataWords = Math.ceil(dataBytes / 4);
                arrayBuf = new ArrayBuffer(dataWords * 4);
                store8 = new Uint8Array(arrayBuf);
                store8.set(new Uint8Array(input, data.ptr, dataBytes));
                stuffedData = new Uint32Array(arrayBuf);
                data.ptr += dataBytes;
                if (fileVersion >= 3) {
                  lutArr = BitStuffer.unstuffLUT2(lutData, numBits, lutBytes - 1, offset, scale, zMax);
                } else {
                  lutArr = BitStuffer.unstuffLUT(lutData, numBits, lutBytes - 1, offset, scale, zMax);
                }
                if (fileVersion >= 3) {
                  BitStuffer.unstuff2(stuffedData, blockDataBuffer, bitsPerPixel, numElements, lutArr);
                } else {
                  BitStuffer.unstuff(stuffedData, blockDataBuffer, bitsPerPixel, numElements, lutArr);
                }
              } else {
                data.counter.bitstuffer++;
                bitsPerPixel = numBits;
                data.ptr += blockPtr;
                if (bitsPerPixel > 0) {
                  dataBytes = Math.ceil(numElements * bitsPerPixel / 8);
                  dataWords = Math.ceil(dataBytes / 4);
                  arrayBuf = new ArrayBuffer(dataWords * 4);
                  store8 = new Uint8Array(arrayBuf);
                  store8.set(new Uint8Array(input, data.ptr, dataBytes));
                  stuffedData = new Uint32Array(arrayBuf);
                  data.ptr += dataBytes;
                  if (fileVersion >= 3) {
                    if (offset == null) {
                      BitStuffer.originalUnstuff2(stuffedData, blockDataBuffer, bitsPerPixel, numElements);
                    } else {
                      BitStuffer.unstuff2(stuffedData, blockDataBuffer, bitsPerPixel, numElements, false, offset, scale, zMax);
                    }
                  } else {
                    if (offset == null) {
                      BitStuffer.originalUnstuff(stuffedData, blockDataBuffer, bitsPerPixel, numElements);
                    } else {
                      BitStuffer.unstuff(stuffedData, blockDataBuffer, bitsPerPixel, numElements, false, offset, scale, zMax);
                    }
                  }
                }
              }
            }
          },
          readTiles: function(input, data, OutPixelTypeArray, useBSQForOutputDim) {
            var headerInfo = data.headerInfo;
            var width = headerInfo.width;
            var height = headerInfo.height;
            var numPixels = width * height;
            var microBlockSize = headerInfo.microBlockSize;
            var imageType = headerInfo.imageType;
            var dataTypeSize = Lerc2Helpers.getDataTypeSize(imageType);
            var numBlocksX = Math.ceil(width / microBlockSize);
            var numBlocksY = Math.ceil(height / microBlockSize);
            data.pixels.numBlocksY = numBlocksY;
            data.pixels.numBlocksX = numBlocksX;
            data.pixels.ptr = 0;
            var row = 0, col = 0, blockY = 0, blockX = 0, thisBlockHeight = 0, thisBlockWidth = 0, bytesLeft = 0, headerByte = 0, bits67 = 0, testCode = 0, outPtr = 0, outStride = 0, numBytes = 0, bytesleft = 0, z = 0, blockPtr = 0;
            var view, block, arrayBuf, store8, rawData;
            var blockEncoding;
            var blockDataBuffer = new OutPixelTypeArray(microBlockSize * microBlockSize);
            var lastBlockHeight = height % microBlockSize || microBlockSize;
            var lastBlockWidth = width % microBlockSize || microBlockSize;
            var offsetType, offset;
            var numDims = headerInfo.numDims, iDim;
            var mask = data.pixels.resultMask;
            var resultPixels = data.pixels.resultPixels;
            var fileVersion = headerInfo.fileVersion;
            var fileVersionCheckNum = fileVersion >= 5 ? 14 : 15;
            var isDiffEncoding;
            var zMax = headerInfo.zMax;
            var resultPixelsPrevDim;
            for (blockY = 0; blockY < numBlocksY; blockY++) {
              thisBlockHeight = blockY !== numBlocksY - 1 ? microBlockSize : lastBlockHeight;
              for (blockX = 0; blockX < numBlocksX; blockX++) {
                thisBlockWidth = blockX !== numBlocksX - 1 ? microBlockSize : lastBlockWidth;
                outPtr = blockY * width * microBlockSize + blockX * microBlockSize;
                outStride = width - thisBlockWidth;
                for (iDim = 0; iDim < numDims; iDim++) {
                  if (numDims > 1) {
                    resultPixelsPrevDim = resultPixels;
                    outPtr = blockY * width * microBlockSize + blockX * microBlockSize;
                    resultPixels = new OutPixelTypeArray(data.pixels.resultPixels.buffer, numPixels * iDim * dataTypeSize, numPixels);
                    zMax = headerInfo.maxValues[iDim];
                  } else {
                    resultPixelsPrevDim = null;
                  }
                  bytesLeft = input.byteLength - data.ptr;
                  view = new DataView(input, data.ptr, Math.min(10, bytesLeft));
                  block = {};
                  blockPtr = 0;
                  headerByte = view.getUint8(0);
                  blockPtr++;
                  isDiffEncoding = headerInfo.fileVersion >= 5 ? headerByte & 4 : 0;
                  bits67 = headerByte >> 6 & 255;
                  testCode = headerByte >> 2 & fileVersionCheckNum;
                  if (testCode !== (blockX * microBlockSize >> 3 & fileVersionCheckNum)) {
                    throw "integrity issue";
                  }
                  if (isDiffEncoding && iDim === 0) {
                    throw "integrity issue";
                  }
                  blockEncoding = headerByte & 3;
                  if (blockEncoding > 3) {
                    data.ptr += blockPtr;
                    throw "Invalid block encoding (" + blockEncoding + ")";
                  } else if (blockEncoding === 2) {
                    if (isDiffEncoding) {
                      if (mask) {
                        for (row = 0; row < thisBlockHeight; row++) {
                          for (col = 0; col < thisBlockWidth; col++) {
                            if (mask[outPtr]) {
                              resultPixels[outPtr] = resultPixelsPrevDim[outPtr];
                            }
                            outPtr++;
                          }
                        }
                      } else {
                        for (row = 0; row < thisBlockHeight; row++) {
                          for (col = 0; col < thisBlockWidth; col++) {
                            resultPixels[outPtr] = resultPixelsPrevDim[outPtr];
                            outPtr++;
                          }
                        }
                      }
                    }
                    data.counter.constant++;
                    data.ptr += blockPtr;
                    continue;
                  } else if (blockEncoding === 0) {
                    if (isDiffEncoding) {
                      throw "integrity issue";
                    }
                    data.counter.uncompressed++;
                    data.ptr += blockPtr;
                    numBytes = thisBlockHeight * thisBlockWidth * dataTypeSize;
                    bytesleft = input.byteLength - data.ptr;
                    numBytes = numBytes < bytesleft ? numBytes : bytesleft;
                    arrayBuf = new ArrayBuffer(numBytes % dataTypeSize === 0 ? numBytes : numBytes + dataTypeSize - numBytes % dataTypeSize);
                    store8 = new Uint8Array(arrayBuf);
                    store8.set(new Uint8Array(input, data.ptr, numBytes));
                    rawData = new OutPixelTypeArray(arrayBuf);
                    z = 0;
                    if (mask) {
                      for (row = 0; row < thisBlockHeight; row++) {
                        for (col = 0; col < thisBlockWidth; col++) {
                          if (mask[outPtr]) {
                            resultPixels[outPtr] = rawData[z++];
                          }
                          outPtr++;
                        }
                        outPtr += outStride;
                      }
                    } else {
                      for (row = 0; row < thisBlockHeight; row++) {
                        for (col = 0; col < thisBlockWidth; col++) {
                          resultPixels[outPtr++] = rawData[z++];
                        }
                        outPtr += outStride;
                      }
                    }
                    data.ptr += z * dataTypeSize;
                  } else {
                    offsetType = Lerc2Helpers.getDataTypeUsed(isDiffEncoding && imageType < 6 ? 4 : imageType, bits67);
                    offset = Lerc2Helpers.getOnePixel(block, blockPtr, offsetType, view);
                    blockPtr += Lerc2Helpers.getDataTypeSize(offsetType);
                    if (blockEncoding === 3) {
                      data.ptr += blockPtr;
                      data.counter.constantoffset++;
                      if (mask) {
                        for (row = 0; row < thisBlockHeight; row++) {
                          for (col = 0; col < thisBlockWidth; col++) {
                            if (mask[outPtr]) {
                              resultPixels[outPtr] = isDiffEncoding ? Math.min(zMax, resultPixelsPrevDim[outPtr] + offset) : offset;
                            }
                            outPtr++;
                          }
                          outPtr += outStride;
                        }
                      } else {
                        for (row = 0; row < thisBlockHeight; row++) {
                          for (col = 0; col < thisBlockWidth; col++) {
                            resultPixels[outPtr] = isDiffEncoding ? Math.min(zMax, resultPixelsPrevDim[outPtr] + offset) : offset;
                            outPtr++;
                          }
                          outPtr += outStride;
                        }
                      }
                    } else {
                      data.ptr += blockPtr;
                      Lerc2Helpers.decodeBits(input, data, blockDataBuffer, offset, iDim);
                      blockPtr = 0;
                      if (isDiffEncoding) {
                        if (mask) {
                          for (row = 0; row < thisBlockHeight; row++) {
                            for (col = 0; col < thisBlockWidth; col++) {
                              if (mask[outPtr]) {
                                resultPixels[outPtr] = blockDataBuffer[blockPtr++] + resultPixelsPrevDim[outPtr];
                              }
                              outPtr++;
                            }
                            outPtr += outStride;
                          }
                        } else {
                          for (row = 0; row < thisBlockHeight; row++) {
                            for (col = 0; col < thisBlockWidth; col++) {
                              resultPixels[outPtr] = blockDataBuffer[blockPtr++] + resultPixelsPrevDim[outPtr];
                              outPtr++;
                            }
                            outPtr += outStride;
                          }
                        }
                      } else if (mask) {
                        for (row = 0; row < thisBlockHeight; row++) {
                          for (col = 0; col < thisBlockWidth; col++) {
                            if (mask[outPtr]) {
                              resultPixels[outPtr] = blockDataBuffer[blockPtr++];
                            }
                            outPtr++;
                          }
                          outPtr += outStride;
                        }
                      } else {
                        for (row = 0; row < thisBlockHeight; row++) {
                          for (col = 0; col < thisBlockWidth; col++) {
                            resultPixels[outPtr++] = blockDataBuffer[blockPtr++];
                          }
                          outPtr += outStride;
                        }
                      }
                    }
                  }
                }
              }
            }
            if (numDims > 1 && !useBSQForOutputDim) {
              data.pixels.resultPixels = Lerc2Helpers.swapDimensionOrder(data.pixels.resultPixels, numPixels, numDims, OutPixelTypeArray);
            }
          },
          /*****************
          *  private methods (helper methods)
          *****************/
          formatFileInfo: function(data) {
            return {
              "fileIdentifierString": data.headerInfo.fileIdentifierString,
              "fileVersion": data.headerInfo.fileVersion,
              "imageType": data.headerInfo.imageType,
              "height": data.headerInfo.height,
              "width": data.headerInfo.width,
              "numValidPixel": data.headerInfo.numValidPixel,
              "microBlockSize": data.headerInfo.microBlockSize,
              "blobSize": data.headerInfo.blobSize,
              "maxZError": data.headerInfo.maxZError,
              "pixelType": Lerc2Helpers.getPixelType(data.headerInfo.imageType),
              "eofOffset": data.eofOffset,
              "mask": data.mask ? {
                "numBytes": data.mask.numBytes
              } : null,
              "pixels": {
                "numBlocksX": data.pixels.numBlocksX,
                "numBlocksY": data.pixels.numBlocksY,
                //"numBytes": data.pixels.numBytes,
                "maxValue": data.headerInfo.zMax,
                "minValue": data.headerInfo.zMin,
                "noDataValue": data.noDataValue
              }
            };
          },
          constructConstantSurface: function(data, useBSQForOutputDim) {
            var val = data.headerInfo.zMax;
            var valMin = data.headerInfo.zMin;
            var maxValues = data.headerInfo.maxValues;
            var numDims = data.headerInfo.numDims;
            var numPixels = data.headerInfo.height * data.headerInfo.width;
            var i = 0, k = 0, nStart = 0;
            var mask = data.pixels.resultMask;
            var resultPixels = data.pixels.resultPixels;
            if (mask) {
              if (numDims > 1) {
                if (useBSQForOutputDim) {
                  for (i = 0; i < numDims; i++) {
                    nStart = i * numPixels;
                    val = maxValues[i];
                    for (k = 0; k < numPixels; k++) {
                      if (mask[k]) {
                        resultPixels[nStart + k] = val;
                      }
                    }
                  }
                } else {
                  for (k = 0; k < numPixels; k++) {
                    if (mask[k]) {
                      nStart = k * numDims;
                      for (i = 0; i < numDims; i++) {
                        resultPixels[nStart + numDims] = maxValues[i];
                      }
                    }
                  }
                }
              } else {
                for (k = 0; k < numPixels; k++) {
                  if (mask[k]) {
                    resultPixels[k] = val;
                  }
                }
              }
            } else {
              if (numDims > 1 && valMin !== val) {
                if (useBSQForOutputDim) {
                  for (i = 0; i < numDims; i++) {
                    nStart = i * numPixels;
                    val = maxValues[i];
                    for (k = 0; k < numPixels; k++) {
                      resultPixels[nStart + k] = val;
                    }
                  }
                } else {
                  for (k = 0; k < numPixels; k++) {
                    nStart = k * numDims;
                    for (i = 0; i < numDims; i++) {
                      resultPixels[nStart + i] = maxValues[i];
                    }
                  }
                }
              } else {
                for (k = 0; k < numPixels * numDims; k++) {
                  resultPixels[k] = val;
                }
              }
            }
            return;
          },
          getDataTypeArray: function(t) {
            var tp;
            switch (t) {
              case 0:
                tp = Int8Array;
                break;
              case 1:
                tp = Uint8Array;
                break;
              case 2:
                tp = Int16Array;
                break;
              case 3:
                tp = Uint16Array;
                break;
              case 4:
                tp = Int32Array;
                break;
              case 5:
                tp = Uint32Array;
                break;
              case 6:
                tp = Float32Array;
                break;
              case 7:
                tp = Float64Array;
                break;
              default:
                tp = Float32Array;
            }
            return tp;
          },
          getPixelType: function(t) {
            var tp;
            switch (t) {
              case 0:
                tp = "S8";
                break;
              case 1:
                tp = "U8";
                break;
              case 2:
                tp = "S16";
                break;
              case 3:
                tp = "U16";
                break;
              case 4:
                tp = "S32";
                break;
              case 5:
                tp = "U32";
                break;
              case 6:
                tp = "F32";
                break;
              case 7:
                tp = "F64";
                break;
              default:
                tp = "F32";
            }
            return tp;
          },
          isValidPixelValue: function(t, val) {
            if (val == null) {
              return false;
            }
            var isValid;
            switch (t) {
              case 0:
                isValid = val >= -128 && val <= 127;
                break;
              case 1:
                isValid = val >= 0 && val <= 255;
                break;
              case 2:
                isValid = val >= -32768 && val <= 32767;
                break;
              case 3:
                isValid = val >= 0 && val <= 65536;
                break;
              case 4:
                isValid = val >= -2147483648 && val <= 2147483647;
                break;
              case 5:
                isValid = val >= 0 && val <= 4294967296;
                break;
              case 6:
                isValid = val >= -34027999387901484e22 && val <= 34027999387901484e22;
                break;
              case 7:
                isValid = val >= -17976931348623157e292 && val <= 17976931348623157e292;
                break;
              default:
                isValid = false;
            }
            return isValid;
          },
          getDataTypeSize: function(t) {
            var s = 0;
            switch (t) {
              case 0:
              //ubyte
              case 1:
                s = 1;
                break;
              case 2:
              //short
              case 3:
                s = 2;
                break;
              case 4:
              case 5:
              case 6:
                s = 4;
                break;
              case 7:
                s = 8;
                break;
              default:
                s = t;
            }
            return s;
          },
          getDataTypeUsed: function(dt, tc) {
            var t = dt;
            switch (dt) {
              case 2:
              //short
              case 4:
                t = dt - tc;
                break;
              case 3:
              //ushort
              case 5:
                t = dt - 2 * tc;
                break;
              case 6:
                if (0 === tc) {
                  t = dt;
                } else if (1 === tc) {
                  t = 2;
                } else {
                  t = 1;
                }
                break;
              case 7:
                if (0 === tc) {
                  t = dt;
                } else {
                  t = dt - 2 * tc + 1;
                }
                break;
              default:
                t = dt;
                break;
            }
            return t;
          },
          getOnePixel: function(block, blockPtr, offsetType, view) {
            var temp = 0;
            switch (offsetType) {
              case 0:
                temp = view.getInt8(blockPtr);
                break;
              case 1:
                temp = view.getUint8(blockPtr);
                break;
              case 2:
                temp = view.getInt16(blockPtr, true);
                break;
              case 3:
                temp = view.getUint16(blockPtr, true);
                break;
              case 4:
                temp = view.getInt32(blockPtr, true);
                break;
              case 5:
                temp = view.getUInt32(blockPtr, true);
                break;
              case 6:
                temp = view.getFloat32(blockPtr, true);
                break;
              case 7:
                temp = view.getFloat64(blockPtr, true);
                break;
              default:
                throw "the decoder does not understand this pixel type";
            }
            return temp;
          },
          swapDimensionOrder: function(pixels, numPixels, numDims, OutPixelTypeArray, inputIsBIP) {
            var i = 0, j = 0, iDim = 0, temp = 0, swap = pixels;
            if (numDims > 1) {
              swap = new OutPixelTypeArray(numPixels * numDims);
              if (inputIsBIP) {
                for (i = 0; i < numPixels; i++) {
                  temp = i;
                  for (iDim = 0; iDim < numDims; iDim++, temp += numPixels) {
                    swap[temp] = pixels[j++];
                  }
                }
              } else {
                for (i = 0; i < numPixels; i++) {
                  temp = i;
                  for (iDim = 0; iDim < numDims; iDim++, temp += numPixels) {
                    swap[j++] = pixels[temp];
                  }
                }
              }
            }
            return swap;
          }
        };
        var TreeNode = function(val, left, right) {
          this.val = val;
          this.left = left;
          this.right = right;
        };
        var Lerc2Decode2 = {
          /*
          * ********removed options compared to LERC1. We can bring some of them back if needed.
           * removed pixel type. LERC2 is typed and doesn't require user to give pixel type
           * changed encodedMaskData to maskData. LERC2 's js version make it faster to use maskData directly.
           * removed returnMask. mask is used by LERC2 internally and is cost free. In case of user input mask, it's returned as well and has neglible cost.
           * removed nodatavalue. Because LERC2 pixels are typed, nodatavalue will sacrify a useful value for many types (8bit, 16bit) etc,
           *       user has to be knowledgable enough about raster and their data to avoid usability issues. so nodata value is simply removed now.
           *       We can add it back later if their's a clear requirement.
           * removed encodedMask. This option was not implemented in LercDecode. It can be done after decoding (less efficient)
           * removed computeUsedBitDepths.
           *
           *
           * response changes compared to LERC1
           * 1. encodedMaskData is not available
           * 2. noDataValue is optional (returns only if user's noDataValue is with in the valid data type range)
           * 3. maskData is always available
          */
          /*****************
          *  public properties
          ******************/
          //HUFFMAN_LUT_BITS_MAX: 12, //use 2^12 lut, not configurable
          /*****************
          *  public methods
          *****************/
          /**
           * Decode a LERC2 byte stream and return an object containing the pixel data and optional metadata.
           *
           * @param {ArrayBuffer} input The LERC input byte stream
           * @param {object} [options] options Decoding options
           * @param {number} [options.inputOffset] The number of bytes to skip in the input byte stream. A valid LERC file is expected at that position
           * @param {boolean} [options.returnFileInfo] If true, the return value will have a fileInfo property that contains metadata obtained from the LERC headers and the decoding process
           * @param {boolean} [options.returnPixelInterleavedDims]  If true, returned dimensions are pixel-interleaved, a.k.a [p1_dim0, p1_dim1, p1_dimn, p2_dim0...], default is [p1_dim0, p2_dim0, ..., p1_dim1, p2_dim1...]
           */
          decode: function(input, options) {
            options = options || {};
            var noDataValue = options.noDataValue;
            var i = 0, data = {};
            data.ptr = options.inputOffset || 0;
            data.pixels = {};
            if (!Lerc2Helpers.readHeaderInfo(input, data)) {
              return;
            }
            var headerInfo = data.headerInfo;
            var fileVersion = headerInfo.fileVersion;
            var OutPixelTypeArray = Lerc2Helpers.getDataTypeArray(headerInfo.imageType);
            if (fileVersion > 5) {
              throw "unsupported lerc version 2." + fileVersion;
            }
            Lerc2Helpers.readMask(input, data);
            if (headerInfo.numValidPixel !== headerInfo.width * headerInfo.height && !data.pixels.resultMask) {
              data.pixels.resultMask = options.maskData;
            }
            var numPixels = headerInfo.width * headerInfo.height;
            data.pixels.resultPixels = new OutPixelTypeArray(numPixels * headerInfo.numDims);
            data.counter = {
              onesweep: 0,
              uncompressed: 0,
              lut: 0,
              bitstuffer: 0,
              constant: 0,
              constantoffset: 0
            };
            var useBSQForOutputDim = !options.returnPixelInterleavedDims;
            if (headerInfo.numValidPixel !== 0) {
              if (headerInfo.zMax === headerInfo.zMin) {
                Lerc2Helpers.constructConstantSurface(data, useBSQForOutputDim);
              } else if (fileVersion >= 4 && Lerc2Helpers.checkMinMaxRanges(input, data)) {
                Lerc2Helpers.constructConstantSurface(data, useBSQForOutputDim);
              } else {
                var view = new DataView(input, data.ptr, 2);
                var bReadDataOneSweep = view.getUint8(0);
                data.ptr++;
                if (bReadDataOneSweep) {
                  Lerc2Helpers.readDataOneSweep(input, data, OutPixelTypeArray, useBSQForOutputDim);
                } else {
                  if (fileVersion > 1 && headerInfo.imageType <= 1 && Math.abs(headerInfo.maxZError - 0.5) < 1e-5) {
                    var flagHuffman = view.getUint8(1);
                    data.ptr++;
                    data.encodeMode = flagHuffman;
                    if (flagHuffman > 2 || fileVersion < 4 && flagHuffman > 1) {
                      throw "Invalid Huffman flag " + flagHuffman;
                    }
                    if (flagHuffman) {
                      Lerc2Helpers.readHuffman(input, data, OutPixelTypeArray, useBSQForOutputDim);
                    } else {
                      Lerc2Helpers.readTiles(input, data, OutPixelTypeArray, useBSQForOutputDim);
                    }
                  } else {
                    Lerc2Helpers.readTiles(input, data, OutPixelTypeArray, useBSQForOutputDim);
                  }
                }
              }
            }
            data.eofOffset = data.ptr;
            var diff;
            if (options.inputOffset) {
              diff = data.headerInfo.blobSize + options.inputOffset - data.ptr;
              if (Math.abs(diff) >= 1) {
                data.eofOffset = options.inputOffset + data.headerInfo.blobSize;
              }
            } else {
              diff = data.headerInfo.blobSize - data.ptr;
              if (Math.abs(diff) >= 1) {
                data.eofOffset = data.headerInfo.blobSize;
              }
            }
            var result = {
              width: headerInfo.width,
              height: headerInfo.height,
              pixelData: data.pixels.resultPixels,
              minValue: headerInfo.zMin,
              maxValue: headerInfo.zMax,
              validPixelCount: headerInfo.numValidPixel,
              dimCount: headerInfo.numDims,
              dimStats: {
                minValues: headerInfo.minValues,
                maxValues: headerInfo.maxValues
              },
              maskData: data.pixels.resultMask
              //noDataValue: noDataValue
            };
            if (data.pixels.resultMask && Lerc2Helpers.isValidPixelValue(headerInfo.imageType, noDataValue)) {
              var mask = data.pixels.resultMask;
              for (i = 0; i < numPixels; i++) {
                if (!mask[i]) {
                  result.pixelData[i] = noDataValue;
                }
              }
              result.noDataValue = noDataValue;
            }
            data.noDataValue = noDataValue;
            if (options.returnFileInfo) {
              result.fileInfo = Lerc2Helpers.formatFileInfo(data);
            }
            return result;
          },
          getBandCount: function(input) {
            var count = 0;
            var i = 0;
            var temp = {};
            temp.ptr = 0;
            temp.pixels = {};
            while (i < input.byteLength - 58) {
              Lerc2Helpers.readHeaderInfo(input, temp);
              i += temp.headerInfo.blobSize;
              count++;
              temp.ptr = i;
            }
            return count;
          }
        };
        return Lerc2Decode2;
      })();
      var isPlatformLittleEndian = (function() {
        var a = new ArrayBuffer(4);
        var b = new Uint8Array(a);
        var c = new Uint32Array(a);
        c[0] = 1;
        return b[0] === 1;
      })();
      var Lerc2 = {
        /************wrapper**********************************************/
        /**
         * A wrapper for decoding both LERC1 and LERC2 byte streams capable of handling multiband pixel blocks for various pixel types.
         *
         * @alias module:Lerc
         * @param {ArrayBuffer} input The LERC input byte stream
         * @param {object} [options] The decoding options below are optional.
         * @param {number} [options.inputOffset] The number of bytes to skip in the input byte stream. A valid Lerc file is expected at that position.
         * @param {string} [options.pixelType] (LERC1 only) Default value is F32. Valid pixel types for input are U8/S8/S16/U16/S32/U32/F32.
         * @param {number} [options.noDataValue] (LERC1 only). It is recommended to use the returned mask instead of setting this value.
         * @param {boolean} [options.returnPixelInterleavedDims] (nDim LERC2 only) If true, returned dimensions are pixel-interleaved, a.k.a [p1_dim0, p1_dim1, p1_dimn, p2_dim0...], default is [p1_dim0, p2_dim0, ..., p1_dim1, p2_dim1...]
         * @returns {{width, height, pixels, pixelType, mask, statistics}}
           * @property {number} width Width of decoded image.
           * @property {number} height Height of decoded image.
           * @property {array} pixels [band1, band2, …] Each band is a typed array of width*height.
           * @property {string} pixelType The type of pixels represented in the output.
           * @property {mask} mask Typed array with a size of width*height, or null if all pixels are valid.
           * @property {array} statistics [statistics_band1, statistics_band2, …] Each element is a statistics object representing min and max values
        **/
        decode: function(encodedData, options) {
          if (!isPlatformLittleEndian) {
            throw "Big endian system is not supported.";
          }
          options = options || {};
          var inputOffset = options.inputOffset || 0;
          var fileIdView = new Uint8Array(encodedData, inputOffset, 10);
          var fileIdentifierString = String.fromCharCode.apply(null, fileIdView);
          var lerc2, majorVersion;
          if (fileIdentifierString.trim() === "CntZImage") {
            lerc2 = LercDecode2;
            majorVersion = 1;
          } else if (fileIdentifierString.substring(0, 5) === "Lerc2") {
            lerc2 = Lerc2Decode;
            majorVersion = 2;
          } else {
            throw "Unexpected file identifier string: " + fileIdentifierString;
          }
          var iPlane = 0, eof = encodedData.byteLength - 10, encodedMaskData, bandMasks = [], bandMask, maskData;
          var decodedPixelBlock = {
            width: 0,
            height: 0,
            pixels: [],
            pixelType: options.pixelType,
            mask: null,
            statistics: []
          };
          var uniqueBandMaskCount = 0;
          while (inputOffset < eof) {
            var result = lerc2.decode(encodedData, {
              inputOffset,
              //for both lerc1 and lerc2
              encodedMaskData,
              //lerc1 only
              maskData,
              //lerc2 only
              returnMask: iPlane === 0 ? true : false,
              //lerc1 only
              returnEncodedMask: iPlane === 0 ? true : false,
              //lerc1 only
              returnFileInfo: true,
              //for both lerc1 and lerc2
              returnPixelInterleavedDims: options.returnPixelInterleavedDims,
              //for ndim lerc2 only
              pixelType: options.pixelType || null,
              //lerc1 only
              noDataValue: options.noDataValue || null
              //lerc1 only
            });
            inputOffset = result.fileInfo.eofOffset;
            maskData = result.maskData;
            if (iPlane === 0) {
              encodedMaskData = result.encodedMaskData;
              decodedPixelBlock.width = result.width;
              decodedPixelBlock.height = result.height;
              decodedPixelBlock.dimCount = result.dimCount || 1;
              decodedPixelBlock.pixelType = result.pixelType || result.fileInfo.pixelType;
              decodedPixelBlock.mask = maskData;
            }
            if (majorVersion > 1) {
              if (maskData) {
                bandMasks.push(maskData);
              }
              if (result.fileInfo.mask && result.fileInfo.mask.numBytes > 0) {
                uniqueBandMaskCount++;
              }
            }
            iPlane++;
            decodedPixelBlock.pixels.push(result.pixelData);
            decodedPixelBlock.statistics.push({
              minValue: result.minValue,
              maxValue: result.maxValue,
              noDataValue: result.noDataValue,
              dimStats: result.dimStats
            });
          }
          var i, j, numPixels;
          if (majorVersion > 1 && uniqueBandMaskCount > 1) {
            numPixels = decodedPixelBlock.width * decodedPixelBlock.height;
            decodedPixelBlock.bandMasks = bandMasks;
            maskData = new Uint8Array(numPixels);
            maskData.set(bandMasks[0]);
            for (i = 1; i < bandMasks.length; i++) {
              bandMask = bandMasks[i];
              for (j = 0; j < numPixels; j++) {
                maskData[j] = maskData[j] & bandMask[j];
              }
            }
            decodedPixelBlock.maskData = maskData;
          }
          return decodedPixelBlock;
        }
      };
      if (module.exports) {
        module.exports = Lerc2;
      } else {
        this.Lerc = Lerc2;
      }
    })();
  })(LercDecode);
  return LercDecode.exports;
}
var LercDecodeExports = requireLercDecode();
const Lerc = /* @__PURE__ */ getDefaultExportFromCjs(LercDecodeExports);
let init$1;
let instance$1;
let heap$1;
const IMPORT_OBJECT$1 = {
  env: {
    emscripten_notify_memory_growth: (_) => {
      heap$1 = new Uint8Array(instance$1.exports.memory.buffer);
    }
  }
};
let ZSTDDecoder$1 = class ZSTDDecoder {
  init() {
    if (init$1) return init$1;
    if (typeof fetch !== "undefined") {
      init$1 = fetch(`data:application/wasm;base64,${wasm$1}`).then((response) => response.arrayBuffer()).then((arrayBuffer) => WebAssembly.instantiate(arrayBuffer, IMPORT_OBJECT$1)).then(this._init);
    } else {
      init$1 = WebAssembly.instantiate(Buffer.from(wasm$1, "base64"), IMPORT_OBJECT$1).then(this._init);
    }
    return init$1;
  }
  _init(result) {
    instance$1 = result.instance;
    IMPORT_OBJECT$1.env.emscripten_notify_memory_growth(0);
  }
  decode(array2, uncompressedSize = 0) {
    if (!instance$1) throw new Error("ZSTDDecoder: Await .init() before decoding.");
    const compressedSize = array2.byteLength;
    const compressedPtr = instance$1.exports.malloc(compressedSize);
    heap$1.set(array2, compressedPtr);
    uncompressedSize = uncompressedSize || Number(instance$1.exports.ZSTD_findDecompressedSize(compressedPtr, compressedSize));
    const uncompressedPtr = instance$1.exports.malloc(uncompressedSize);
    const actualSize = instance$1.exports.ZSTD_decompress(uncompressedPtr, uncompressedSize, compressedPtr, compressedSize);
    const dec = heap$1.slice(uncompressedPtr, uncompressedPtr + actualSize);
    instance$1.exports.free(compressedPtr);
    instance$1.exports.free(uncompressedPtr);
    return dec;
  }
};
const wasm$1 = "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AikACDcACCAHIDo3AAAgEUEZSA0BIARBGGohBANAIAIpABAhOiAEIAIpABg3AAggBCA6NwAAIAIpACAhOiAEIAIpACg3ABggBCA6NwAQIAJBIGohAiAEQSBqIgQgCkkNAAsMAQsCQAJAIAUoAswCIhEgBUHgAWogJUEHcUEMbGoiDygCACICaiIHIBxLDQAgCSAPKAIEIgogAmoiBmogG0sNACAGQSBqIBQgCWtNDQELIAUgDygCCDYCoAEgBSAPKQIANwOYASAJIBQgBUGYAWogBUHMAmogHCALIBcgIhAgIQYMAQsgAiAJaiEEIA8oAgghFSARKQAAITogCSARKQAINwAIIAkgOjcAAAJAIAJBEUkNACARKQAQITogCSARKQAYNwAYIAkgOjcAECACQRBrQRFIDQAgEUEQaiECIAlBIGohEgNAIAIpABAhOiASIAIpABg3AAggEiA6NwAAIAIpACAhOiASIAIpACg3ABggEiA6NwAQIAJBIGohAiASQSBqIhIgBEkNAAsLIAQgFWshAiAFIAc2AswCIAQgC2sgFUkEQCAVIAQgF2tLDQwgIiAiIAIgC2siD2oiByAKak8EQCAKRQ0CIAQgByAK/AoAAAwCC0EAIA9rIgIEQCAEIAcgAvwKAAALIAogD2ohCiAEIA9rIQQgCyECCyAVQRBPBEAgAikAACE6IAQgAikACDcACCAEIDo3AAAgCkERSA0BIAQgCmohByAEQRBqIQQDQCACKQAQITogBCACKQAYNwAIIAQgOjcAACACKQAgITogBCACKQAoNwAYIAQgOjcAECACQSBqIQIgBEEgaiIEIAdJDQALDAELAkAgFUEHTQRAIAQgAi0AADoAACAEIAItAAE6AAEgBCACLQACOgACIAQgAi0AAzoAAyAEIAIgFUECdCIHQeAaaigCAGoiAigAADYABCACIAdBgBtqKAIAayECDAELIAQgAikAADcAAAsgCkEJSQ0AIAQgCmohDyAEQQhqIgcgAkEIaiICa0EPTARAA0AgByACKQAANwAAIAJBCGohAiAHQQhqIgcgD0kNAAwCCwALIAIpAAAhOiAHIAIpAAg3AAggByA6NwAAIApBGUgNACAEQRhqIQQDQCACKQAQITogBCACKQAYNwAIIAQgOjcAACACKQAgITogBCACKQAoNwAYIAQgOjcAECACQSBqIQIgBEEgaiIEIA9JDQALCyAGQYh/SwRAIAYhAwwLCyAFQeABaiAlQQdxQQxsaiICIA02AgggAiAMNgIEIAIgEDYCAAsgBiAJaiEJICVBAWohJSAQIC1qIAxqIS0MAQsLIAUoArABIAUoArQBRw0HIAUoAqwBQSBHDQcgDiAoayEQA0ACQCAOIBBMBEBBACECA0AgAkEDRg0CIDIgAkECdCIDaiADICZqKAIANgIAIAJBAWohAgwACwALIAVB4AFqIBBBB3FBDGxqIQoCfwJAIAgoAoTsAUECRgRAIAUoAswCIg8gCigCACIEaiIHIAgoAoDsASICSwRAIAIgD0cEQCACIA9rIgIgFCAJa0sNCyAJIA8gAhAfIAogBCACayIENgIAIAIgCWohCQsgBSAWNgLMAiAIQQA2AoTsAQJAAkACQCAEQYCABEoNACAJIAooAgQiDSAEaiIGaiAbSw0AIAZBIGogFCAJa00NAQsgBSAKKAIINgJQIAUgCikCADcDSCAJIBQgBUHIAGogBUHMAmogGSALIBcgIhAgIQYMAQsgBCAWaiEHIAQgCWohDCAKKAIIIQogFikAACE6IAkgFikACDcACCAJIDo3AAACQCAEQRFJDQAgHikAACE6IAkgHikACDcAGCAJIDo3ABAgBEEQa0ERSA0AIAlBIGohAiAeIQQDQCAEKQAQITogAiAEKQAYNwAIIAIgOjcAACAEKQAgITogAiAEKQAoNwAYIAIgOjcAECAEQSBqIQQgAkEgaiICIAxJDQALCyAMIAprIQIgBSAHNgLMAiAMIAtrIApJBEAgCiAMIBdrSw0PICIgIiACIAtrIgdqIgQgDWpPBEAgDUUNAiAMIAQgDfwKAAAMAgtBACAHayICBEAgDCAEIAL8CgAACyAHIA1qIQ0gDCAHayEMIAshAgsgCkEQTwRAIAIpAAAhOiAMIAIpAAg3AAggDCA6NwAAIA1BEUgNASAMIA1qIQcgDEEQaiEEA0AgAikAECE6IAQgAikAGDcACCAEIDo3AAAgAikAICE6IAQgAikAKDcAGCAEIDo3ABAgAkEgaiECIARBIGoiBCAHSQ0ACwwBCwJAIApBB00EQCAMIAItAAA6AAAgDCACLQABOgABIAwgAi0AAjoAAiAMIAItAAM6AAMgDCACIApBAnQiBEHgGmooAgBqIgIoAAA2AAQgAiAEQYAbaigCAGshAgwBCyAMIAIpAAA3AAALIA1BCUkNACAMIA1qIQcgDEEIaiIEIAJBCGoiAmtBD0wEQANAIAQgAikAADcAACACQQhqIQIgBEEIaiIEIAdJDQAMAgsACyACKQAAITogBCACKQAINwAIIAQgOjcAACANQRlIDQAgDEEYaiEEA0AgAikAECE6IAQgAikAGDcACCAEIDo3AAAgAikAICE6IAQgAikAKDcAGCAEIDo3ABAgAkEgaiECIARBIGoiBCAHSQ0ACwsgBkGJf08EQCAGIQMMDgsgGSEcIAYgCWoMAwsgB0EgayECAkACQCAHIBxLDQAgCSAKKAIEIhIgBGoiDGogAksNACAMQSBqIBQgCWtNDQELIAUgCigCCDYCYCAFIAopAgA3A1ggCSAUIAIgBUHYAGogBUHMAmogHCALIBcgIhAhIQwMAgsgBCAJaiEGIAooAgghCiAPKQAAITogCSAPKQAINwAIIAkgOjcAAAJAIARBEUkNACAPKQAQITogCSAPKQAYNwAYIAkgOjcAECAEQRBrQRFIDQAgD0EQaiECIAlBIGohBANAIAIpABAhOiAEIAIpABg3AAggBCA6NwAAIAIpACAhOiAEIAIpACg3ABggBCA6NwAQIAJBIGohAiAEQSBqIgQgBkkNAAsLIAYgCmshAiAFIAc2AswCIAYgC2sgCkkEQCAKIAYgF2tLDQ0gIiAiIAIgC2siB2oiBCASak8EQCASRQ0DIAYgBCAS/AoAAAwDC0EAIAdrIgIEQCAGIAQgAvwKAAALIAcgEmohEiAGIAdrIQYgCyECCyAKQRBPBEAgAikAACE6IAYgAikACDcACCAGIDo3AAAgEkERSA0CIAYgEmohByAGQRBqIQQDQCACKQAQITogBCACKQAYNwAIIAQgOjcAACACKQAgITogBCACKQAoNwAYIAQgOjcAECACQSBqIQIgBEEgaiIEIAdJDQALDAILAkAgCkEHTQRAIAYgAi0AADoAACAGIAItAAE6AAEgBiACLQACOgACIAYgAi0AAzoAAyAGIAIgCkECdCIEQeAaaigCAGoiAigAADYABCACIARBgBtqKAIAayECDAELIAYgAikAADcAAAsgEkEJSQ0BIAYgEmohByAGQQhqIgQgAkEIaiICa0EPTARAA0AgBCACKQAANwAAIAJBCGohAiAEQQhqIgQgB0kNAAwDCwALIAIpAAAhOiAEIAIpAAg3AAggBCA6NwAAIBJBGUgNASAGQRhqIQQDQCACKQAQITogBCACKQAYNwAIIAQgOjcAACACKQAgITogBCACKQAoNwAYIAQgOjcAECACQSBqIQIgBEEgaiIEIAdJDQALDAELAkACQCAFKALMAiIGIAooAgAiAmoiByAcSw0AIAkgCigCBCINIAJqIgxqIBtLDQAgDEEgaiAUIAlrTQ0BCyAFIAooAgg2AnAgBSAKKQIANwNoIAkgFCAFQegAaiAFQcwCaiAcIAsgFyAiECAhDAwBCyACIAlqIQQgCigCCCEKIAYpAAAhOiAJIAYpAAg3AAggCSA6NwAAAkAgAkERSQ0AIAYpABAhOiAJIAYpABg3ABggCSA6NwAQIAJBEGtBEUgNACAGQRBqIQIgCUEgaiEGA0AgAikAECE6IAYgAikAGDcACCAGIDo3AAAgAikAICE6IAYgAikAKDcAGCAGIDo3ABAgAkEgaiECIAZBIGoiBiAESQ0ACwsgBCAKayECIAUgBzYCzAIgBCALayAKSQRAIAogBCAXa0sNDCAiICIgAiALayIHaiIGIA1qTwRAIA1FDQIgBCAGIA38CgAADAILQQAgB2siAgRAIAQgBiAC/AoAAAsgByANaiENIAQgB2shBCALIQILIApBEE8EQCACKQAAITogBCACKQAINwAIIAQgOjcAACANQRFIDQEgBCANaiEGIARBEGohBANAIAIpABAhOiAEIAIpABg3AAggBCA6NwAAIAIpACAhOiAEIAIpACg3ABggBCA6NwAQIAJBIGohAiAEQSBqIgQgBkkNAAsMAQsCQCAKQQdNBEAgBCACLQAAOgAAIAQgAi0AAToAASAEIAItAAI6AAIgBCACLQADOgADIAQgAiAKQQJ0IgZB4BpqKAIAaiICKAAANgAEIAIgBkGAG2ooAgBrIQIMAQsgBCACKQAANwAACyANQQlJDQAgBCANaiEGIARBCGoiByACQQhqIgJrQQ9MBEADQCAHIAIpAAA3AAAgAkEIaiECIAdBCGoiByAGSQ0ADAILAAsgAikAACE6IAcgAikACDcACCAHIDo3AAAgDUEZSA0AIARBGGohBANAIAIpABAhOiAEIAIpABg3AAggBCA6NwAAIAIpACAhOiAEIAIpACg3ABggBCA6NwAQIAJBIGohAiAEQSBqIgQgBkkNAAsLIAxBiH9LBEAgDCEDDAsLIAkgDGoLIQkgEEEBaiEQDAELCyAIKAKE7AEhAiAFKALMAiEDDAMFICQgMEEDdGoiBy0AAiEuICsgKkEDdGoiCi0AAiEvIBggIUEDdGoiDC0AAyEWIAotAAMhGyAHLQADIR8gDC8BACEnIAovAQAhHiAHLwEAIRkgDCgCBCENIAcoAgQhByAKKAIEIQoCQAJAIAwtAAIiEkECTwRAIAkgBHQhDCAVIBJBGUlyRQRAIAxBBSASa3ZBBXQgDWohDQJAIAQgEmpBBWsiBEEgSwRAQbAaIQIMAQsgAiApTwRAIAUgBEEHcSIMNgKsASACIARBA3ZrIgIoAAAhCSAMIQQMAQsgAiAjRg0AIAUgBCACICNrIARBA3YiBCACIARrICNJGyIMQQN0ayIENgKsASACIAxrIgIoAAAhCQsgBSAEQQVqIg82AqwBIA0gCSAEdEEbdmohEgwCCyAFIAQgEmoiDzYCrAEgDEEAIBJrdiANaiESIA9BIEsEQEGwGiECDAILIAIgKU8EQCAFIA9BB3EiBDYCrAEgAiAPQQN2ayICKAAAIQkgBCEPDAILIAIgI0YNASAFIA8gAiAjayAPQQN2IgQgAiAEayAjSRsiBEEDdGsiDzYCrAEgAiAEayICKAAAIQkMAQsgB0UhDCASRQRAICYgDEECdGooAgAhEiAmIAdBAEdBAnRqKAIAIREgBCEPDAILIAUgBEEBaiIPNgKsASANIAkgBHRBH3ZqIAxqIgxBA0YEQCARQQFrIgRBfyAEGyESDAELICYgDEECdGooAgAiBEF/IAQbIRIgDEEBRg0BCyAFIAY2AtwBCyAuIC9qIQQgBSASNgLUASAFIBE2AtgBAkAgL0UEQCAPIQwMAQsgBSAPIC9qIgw2AqwBIAkgD3RBACAva3YgCmohCgsCQCAEQRRJDQAgDEEgSwRAQbAaIQIMAQsgAiApTwRAIAUgDEEHcSIENgKsASACIAxBA3ZrIgIoAAAhCSAEIQwMAQsgAiAjRg0AIAUgDCACICNrIAxBA3YiBCACIARrICNJGyIEQQN0ayIMNgKsASACIARrIgIoAAAhCQsCQCAuRQRAIAwhBAwBCyAFIAwgLmoiBDYCrAEgCSAMdEEAIC5rdiAHaiEHCwJAIARBIEsEQEGwGiECDAELIAIgKU8EQCAFIARBB3EiBjYCrAEgAiAEQQN2ayICKAAAIQkgBiEEDAELIAIgI0YNACAFIAQgAiAjayAEQQN2IgQgAiAEayAjSRsiBkEDdGsiBDYCrAEgAiAGayICKAAAIQkLAkAgECAaRg0AIB9BAnRBsBlqKAIAIAlBACAEIB9qIgRrdnEhDyAbQQJ0QbAZaigCACAJQQAgBCAbaiIEa3ZxIQYCQAJ/AkACQCAEQSBLBEBBsBohAgwBCyACIClPBEAgBSAEQQdxIgw2AqwBIAIgBEEDdmsMAwsgAiAjRw0BCyAEIQwMAgsgBSAEIAIgI2sgBEEDdiIEIAIgBGsgI0kbIgRBA3RrIgw2AqwBIAIgBGsLIgIoAAAhCQsgDyAZaiEwIAYgHmohKiAFIAwgFmoiBjYCrAEgFkECdEGwGWooAgAgCUEAIAZrdnEgJ2ohIQJ/AkACQCAGQSBLBEBBsBohAgwBCyACIClPBEAgBSAGQQdxIgQ2AqwBIAIgBkEDdmsMAwsgAiAjRw0BCyAGIQQMAgsgBSAGIAIgI2sgBkEDdiIEIAIgBGsgI0kbIgZBA3RrIgQ2AqwBIAIgBmsLIgIoAAAhCQsgBUHgAWogEEEMbGoiBiASNgIIIAYgCjYCBCAGIAc2AgAgEEEBaiEQIAcgLWogCmohLSARIQYMAQsACwALAn8CQAJAAkAgAg4DAQIAAgsgBSAIKAL46gEiAzYCzAJBACECIBMgFEEAIBRBAEobaiEaIAgoAoDsASERAn8CQCAORQRAIBMhBwwBCyAIKAK46QEhFiAIKAK06QEhHyAIKAKw6QEhCyAIQQE2AozqASAIQazQAWohKyAFQYwCaiEbA0AgAkEDRwRAIBsgAkECdCIDaiADICtqKAIANgIAIAJBAWohAgwBCwsgBUHgAWoiAiAEIAcQCEGIf0sNByAFQfQBaiACIAgoAgAQHiAFQfwBaiACIAgoAggQHiAFQYQCaiACIAgoAgQQHiAzRSEeIBMhBwJAA0AgDkUNASAFKAL4ASAFKAL0AUEDdGoiBC0AAiEkIAUoAogCIAUoAoQCQQN0aiIDLQACIRUgBSgCgAIgBSgC/AFBA3RqIgItAAMhJyADLQADIRIgBC0AAyEcIAIvAQAhGSADLwEAIQ8gBC8BACEMIAIoAgQhBiAEKAIEIQQgAygCBCEJAkAgAi0AAiINQQJPBEACQCAeIA1BGUlyRQRAIAUoAuABIiEgBSgC5AEiAnRBBSANa3ZBBXQgBmohBgJAIAIgDWpBBWsiAkEhTwRAIAVBsBo2AugBDAELIAUoAugBIgogBSgC8AFPBEAgBSACQQdxIgM2AuQBIAUgCiACQQN2ayICNgLoASAFIAIoAAAiITYC4AEgAyECDAELIAogBSgC7AEiA0YNACAFIAIgCiADayACQQN2IgIgCiACayADSRsiA0EDdGsiAjYC5AEgBSAKIANrIgM2AugBIAUgAygAACIhNgLgAQsgBSACQQVqIgo2AuQBIAYgISACdEEbdmohDQwBCyAFIAUoAuQBIgIgDWoiCjYC5AEgBSgC4AEgAnRBACANa3YgBmohDSAKQSFPBEAgBUGwGjYC6AEMAQsgBSgC6AEiBiAFKALwAU8EQCAFIApBB3EiAjYC5AEgBSAGIApBA3ZrIgM2AugBIAUgAygAADYC4AEgAiEKDAELIAYgBSgC7AEiA0YNACAFIAogBiADayAKQQN2IgIgBiACayADSRsiAkEDdGsiCjYC5AEgBSAGIAJrIgI2AugBIAUgAigAADYC4AELIAUpAowCITogBSANNgKMAiAFIDo3ApACDAELIARFIQMgDUUEQCAbIARBAEdBAnRqKAIAIQIgBSAbIANBAnRqKAIAIg02AowCIAUgAjYCkAIgBSgC5AEhCgwBCyAFIAUoAuQBIgJBAWoiCjYC5AECQAJAIAMgBmogBSgC4AEgAnRBH3ZqIgNBA0YEQCAFKAKMAkEBayICQX8gAhshDQwBCyAbIANBAnRqKAIAIgJBfyACGyENIANBAUYNAQsgBSAFKAKQAjYClAILIAUgBSgCjAI2ApACIAUgDTYCjAILIBUgJGohAwJAIBVFBEAgCiECDAELIAUgCiAVaiICNgLkASAFKALgASAKdEEAIBVrdiAJaiEJCwJAIANBFEkNACACQSFPBEAgBUGwGjYC6AEMAQsgBSgC6AEiBiAFKALwAU8EQCAFIAJBB3EiAzYC5AEgBSAGIAJBA3ZrIgI2AugBIAUgAigAADYC4AEgAyECDAELIAYgBSgC7AEiA0YNACAFIAIgBiADayACQQN2IgIgBiACayADSRsiA0EDdGsiAjYC5AEgBSAGIANrIgM2AugBIAUgAygAADYC4AELAkAgJEUEQCACIQMMAQsgBSACICRqIgM2AuQBIAUoAuABIAJ0QQAgJGt2IARqIQQLAkAgA0EhTwRAQbAaIQIgBUGwGjYC6AEMAQsgBSgC6AEiAiAFKALwAU8EQCAFIANBB3EiBjYC5AEgBSACIANBA3ZrIgI2AugBIAUgAigAADYC4AEgBiEDDAELIAIgBSgC7AEiCkYNACAFIAIgAiAKayADQQN2IgYgAiAGayAKSRsiBmsiAjYC6AEgBSADIAZBA3RrIgM2AuQBIAUgAigAADYC4AELAkAgDkEBRg0AIAUgHEECdEGwGWooAgAgBSgC4AEiBkEAIAMgHGoiA2t2cSAMajYC9AEgBSASQQJ0QbAZaigCACAGQQAgAyASaiIDa3ZxIA9qNgKEAgJAIANBIU8EQEGwGiECIAVBsBo2AugBDAELIAUoAvABIAJNBEAgBSADQQdxIgo2AuQBIAUgAiADQQN2ayICNgLoASAFIAIoAAAiBjYC4AEgCiEDDAELIAIgBSgC7AEiCkYNACAFIAIgAiAKayADQQN2IgYgAiAGayAKSRsiBmsiAjYC6AEgBSADIAZBA3RrIgM2AuQBIAUgAigAACIGNgLgAQsgBSADICdqIgM2AuQBIAUgJ0ECdEGwGWooAgAgBkEAIANrdnEgGWo2AvwBIANBIU8EQCAFQbAaNgLoAQwBCyAFKALwASACTQRAIAUgA0EHcTYC5AEgBSACIANBA3ZrIgI2AugBIAUgAigAADYC4AEMAQsgAiAFKALsASIGRg0AIAUgAyACIAZrIANBA3YiAyACIANrIAZJGyIDQQN0azYC5AEgBSACIANrIgI2AugBIAUgAigAADYC4AELIAUoAswCIgwgBGoiCiAIKAKA7AEiAk0EQCAKQSBrIQIgBSAENgKoASAFIAk2AqwBIAUgDTYCsAECQAJAAkAgCiARSw0AIAcgBCAJaiIDaiACSw0AIANBIGogGiAHa00NAQsgBUFAayAFKAKwATYCACAFIAUpA6gBNwM4IAcgGiACIAVBOGogBUHMAmogESALIB8gFhAhIQMMAQsgBCAHaiEGIAwpAAAhOiAHIAwpAAg3AAggByA6NwAAAkAgBEERSQ0AIAwpABAhOiAHIAwpABg3ABggByA6NwAQIARBEGtBEUgNACAMQRBqIQIgB0EgaiEEA0AgAikAECE6IAQgAikAGDcACCAEIDo3AAAgAikAICE6IAQgAikAKDcAGCAEIDo3ABAgAkEgaiECIARBIGoiBCAGSQ0ACwsgBiANayECIAUgCjYCzAIgBiALayANSQRAIA0gBiAfa0sNDCAWIBYgAiALayIKaiIEIAlqTwRAIAlFDQIgBiAEIAn8CgAADAILQQAgCmsiAgRAIAYgBCAC/AoAAAsgBSAJIApqIgk2AqwBIAYgCmshBiALIQILIA1BEE8EQCACKQAAITogBiACKQAINwAIIAYgOjcAACAJQRFIDQEgBiAJaiEKIAZBEGohBANAIAIpABAhOiAEIAIpABg3AAggBCA6NwAAIAIpACAhOiAEIAIpACg3ABggBCA6NwAQIAJBIGohAiAEQSBqIgQgCkkNAAsMAQsCQCANQQdNBEAgBiACLQAAOgAAIAYgAi0AAToAASAGIAItAAI6AAIgBiACLQADOgADIAYgAiANQQJ0IgRB4BpqKAIAaiICKAAANgAEIAIgBEGAG2ooAgBrIQIMAQsgBiACKQAANwAACyAJQQlJDQAgBiAJaiEKIAZBCGoiBCACQQhqIgJrQQ9MBEADQCAEIAIpAAA3AAAgAkEIaiECIARBCGoiBCAKSQ0ADAILAAsgAikAACE6IAQgAikACDcACCAEIDo3AAAgCUEZSA0AIAZBGGohBANAIAIpABAhOiAEIAIpABg3AAggBCA6NwAAIAIpACAhOiAEIAIpACg3ABggBCA6NwAQIAJBIGohAiAEQSBqIgQgCkkNAAsLIANBiH9LDQwgDkEBayEOIAMgB2ohBwwBCwsgDkEATA0IIAIgDEcEQEG6fyEDIAIgDGsiAiAaIAdrSw0LIAcgDCACEB8gAiAHaiEHIAQgAmshBAsgBSAIQYjsAWoiAjYCzAIgCEEANgKE7AEgCEGI7AVqIREgBSAENgKoASAFIAk2AqwBIAUgDTYCsAECQAJAAkAgBEGAgARKDQAgByAEIAlqIgNqIBpBIGtLDQAgA0EgaiAaIAdrTQ0BCyAFIAUoArABNgIwIAUgBSkDqAE3AyggByAaIAVBKGogBUHMAmogESALIB8gFhAgIQMMAQsgAiAEaiEKIAQgB2ohBiACKQAAITogByACKQAINwAIIAcgOjcAAAJAIARBEUkNACAIKQCY7AEhOiAHIAhBoOwBaikAADcAGCAHIDo3ABAgBEEQa0ERSA0AIAhBmOwBaiECIAdBIGohBANAIAIpABAhOiAEIAIpABg3AAggBCA6NwAAIAIpACAhOiAEIAIpACg3ABggBCA6NwAQIAJBIGohAiAEQSBqIgQgBkkNAAsLIAYgDWshAiAFIAo2AswCIAYgC2sgDUkEQCANIAYgH2tLDQogFiAWIAIgC2siCmoiBCAJak8EQCAJRQ0CIAYgBCAJ/AoAAAwCC0EAIAprIgIEQCAGIAQgAvwKAAALIAUgCSAKaiIJNgKsASAGIAprIQYgCyECCyANQRBPBEAgAikAACE6IAYgAikACDcACCAGIDo3AAAgCUERSA0BIAYgCWohCiAGQRBqIQQDQCACKQAQITogBCACKQAYNwAIIAQgOjcAACACKQAgITogBCACKQAoNwAYIAQgOjcAECACQSBqIQIgBEEgaiIEIApJDQALDAELAkAgDUEHTQRAIAYgAi0AADoAACAGIAItAAE6AAEgBiACLQACOgACIAYgAi0AAzoAAyAGIAIgDUECdCIEQeAaaigCAGoiAigAADYABCACIARBgBtqKAIAayECDAELIAYgAikAADcAAAsgCUEJSQ0AIAYgCWohCiAGQQhqIgQgAkEIaiICa0EPTARAA0AgBCACKQAANwAAIAJBCGohAiAEQQhqIgQgCkkNAAwCCwALIAIpAAAhOiAEIAIpAAg3AAggBCA6NwAAIAlBGUgNACAGQRhqIQQDQCACKQAQITogBCACKQAYNwAIIAQgOjcAACACKQAgITogBCACKQAoNwAYIAQgOjcAECACQSBqIQIgBEEgaiIEIApJDQALCyADQYh/Sw0KIAMgB2ohByAOQQFrIgpFDQAgGkEgayESIDNFIRwDQCAFKAL4ASAFKAL0AUEDdGoiBC0AAiEJIAUoAogCIAUoAoQCQQN0aiIDLQACIQwgBSgCgAIgBSgC/AFBA3RqIgItAAMhJCADLQADIRUgBC0AAyEnIAIvAQAhHiADLwEAIRkgBC8BACEPIAIoAgQhBiAEKAIEIQQgAygCBCEOAkAgAi0AAiIYQQJPBEACQCAcIBhBGUlyRQRAIAUoAuABIiogBSgC5AEiAnRBBSAYa3ZBBXQgBmohBgJAIAIgGGpBBWsiAkEhTwRAIAVBsBo2AugBDAELIAUoAugBIg0gBSgC8AFPBEAgBSACQQdxIgM2AuQBIAUgDSACQQN2ayICNgLoASAFIAIoAAAiKjYC4AEgAyECDAELIA0gBSgC7AEiA0YNACAFIAIgDSADayACQQN2IgIgDSACayADSRsiA0EDdGsiAjYC5AEgBSANIANrIgM2AugBIAUgAygAACIqNgLgAQsgBSACQQVqIg02AuQBIAYgKiACdEEbdmohBgwBCyAFIAUoAuQBIgIgGGoiDTYC5AEgBSgC4AEgAnRBACAYa3YgBmohBiANQSFPBEAgBUGwGjYC6AEMAQsgBSgC6AEiGCAFKALwAU8EQCAFIA1BB3EiAjYC5AEgBSAYIA1BA3ZrIgM2AugBIAUgAygAADYC4AEgAiENDAELIBggBSgC7AEiA0YNACAFIA0gGCADayANQQN2IgIgGCACayADSRsiAkEDdGsiDTYC5AEgBSAYIAJrIgI2AugBIAUgAigAADYC4AELIAUpAowCITogBSAGNgKMAiAFIDo3ApACDAELIARFIQMgGEUEQCAbIARBAEdBAnRqKAIAIQIgBSAbIANBAnRqKAIAIgY2AowCIAUgAjYCkAIgBSgC5AEhDQwBCyAFIAUoAuQBIgJBAWoiDTYC5AECQAJAIAMgBmogBSgC4AEgAnRBH3ZqIgNBA0YEQCAFKAKMAkEBayICQX8gAhshBgwBCyAbIANBAnRqKAIAIgJBfyACGyEGIANBAUYNAQsgBSAFKAKQAjYClAILIAUgBSgCjAI2ApACIAUgBjYCjAILIAkgDGohAwJAIAxFBEAgDSECDAELIAUgDCANaiICNgLkASAFKALgASANdEEAIAxrdiAOaiEOCwJAIANBFEkNACACQSFPBEAgBUGwGjYC6AEMAQsgBSgC6AEiDCAFKALwAU8EQCAFIAJBB3EiAzYC5AEgBSAMIAJBA3ZrIgI2AugBIAUgAigAADYC4AEgAyECDAELIAwgBSgC7AEiA0YNACAFIAIgDCADayACQQN2IgIgDCACayADSRsiA0EDdGsiAjYC5AEgBSAMIANrIgM2AugBIAUgAygAADYC4AELAkAgCUUEQCACIQMMAQsgBSACIAlqIgM2AuQBIAUoAuABIAJ0QQAgCWt2IARqIQQLAkAgA0EhTwRAQbAaIQIgBUGwGjYC6AEMAQsgBSgC6AEiAiAFKALwAU8EQCAFIANBB3EiDDYC5AEgBSACIANBA3ZrIgI2AugBIAUgAigAADYC4AEgDCEDDAELIAIgBSgC7AEiCUYNACAFIAIgAiAJayADQQN2IgwgAiAMayAJSRsiDGsiAjYC6AEgBSADIAxBA3RrIgM2AuQBIAUgAigAADYC4AELAkAgCkEBRg0AIAUgJ0ECdEGwGWooAgAgBSgC4AEiCUEAIAMgJ2oiA2t2cSAPajYC9AEgBSAVQQJ0QbAZaigCACAJQQAgAyAVaiIDa3ZxIBlqNgKEAgJAIANBIU8EQEGwGiECIAVBsBo2AugBDAELIAUoAvABIAJNBEAgBSADQQdxIgw2AuQBIAUgAiADQQN2ayICNgLoASAFIAIoAAAiCTYC4AEgDCEDDAELIAIgBSgC7AEiD0YNACAFIAIgAiAPayADQQN2IgwgAiAMayAPSRsiDGsiAjYC6AEgBSADIAxBA3RrIgM2AuQBIAUgAigAACIJNgLgAQsgBSADICRqIgM2AuQBIAUgJEECdEGwGWooAgAgCUEAIANrdnEgHmo2AvwBIANBIU8EQCAFQbAaNgLoAQwBCyAFKALwASACTQRAIAUgA0EHcTYC5AEgBSACIANBA3ZrIgI2AugBIAUgAigAADYC4AEMAQsgAiAFKALsASIMRg0AIAUgAyACIAxrIANBA3YiAyACIANrIAxJGyIDQQN0azYC5AEgBSACIANrIgI2AugBIAUgAigAADYC4AELIAUgBDYCqAEgBSAONgKsASAFIAY2ArABAkACQAJAIAUoAswCIgIgBGoiDCARSw0AIAcgBCAOaiIDaiASSw0AIANBIGogGiAHa00NAQsgBSAFKAKwATYCICAFIAUpA6gBNwMYIAcgGiAFQRhqIAVBzAJqIBEgCyAfIBYQICEDDAELIAQgB2ohCSACKQAAITogByACKQAINwAIIAcgOjcAAAJAIARBEUkNACACKQAQITogByACKQAYNwAYIAcgOjcAECAEQRBrQRFIDQAgAkEQaiECIAdBIGohBANAIAIpABAhOiAEIAIpABg3AAggBCA6NwAAIAIpACAhOiAEIAIpACg3ABggBCA6NwAQIAJBIGohAiAEQSBqIgQgCUkNAAsLIAkgBmshAiAFIAw2AswCIAkgC2sgBkkEQCAGIAkgH2tLDQsgFiAWIAIgC2siDGoiBCAOak8EQCAORQ0CIAkgBCAO/AoAAAwCC0EAIAxrIgIEQCAJIAQgAvwKAAALIAUgDCAOaiIONgKsASAJIAxrIQkgCyECCyAGQRBPBEAgAikAACE6IAkgAikACDcACCAJIDo3AAAgDkERSA0BIAkgDmohBiAJQRBqIQQDQCACKQAQITogBCACKQAYNwAIIAQgOjcAACACKQAgITogBCACKQAoNwAYIAQgOjcAECACQSBqIQIgBEEgaiIEIAZJDQALDAELAkAgBkEHTQRAIAkgAi0AADoAACAJIAItAAE6AAEgCSACLQACOgACIAkgAi0AAzoAAyAJIAIgBkECdCIEQeAaaigCAGoiAigAADYABCACIARBgBtqKAIAayECDAELIAkgAikAADcAAAsgDkEJSQ0AIAkgDmohBiAJQQhqIgQgAkEIaiICa0EPTARAA0AgBCACKQAANwAAIAJBCGohAiAEQQhqIgQgBkkNAAwCCwALIAIpAAAhOiAEIAIpAAg3AAggBCA6NwAAIA5BGUgNACAJQRhqIQQDQCACKQAQITogBCACKQAYNwAIIAQgOjcAACACKQAgITogBCACKQAoNwAYIAQgOjcAECACQSBqIQIgBEEgaiIEIAZJDQALCyADQYh/Sw0LIAMgB2ohByAKQQFrIgoNAAsLIAUoAugBIAUoAuwBRw0HQWwhAyAFKALkAUEgRw0JQQAhAgNAIAJBA0cEQCArIAJBAnQiA2ogAyAbaigCADYCACACQQFqIQIMAQsLIAUoAswCIgMgCCgChOwBQQJHDQEaCyARIANrIgIgGiAHa0sNBUEAIQQgBwRAIAIEQCAHIAMgAvwKAAALIAIgB2ohBAsgCEEANgKE7AEgCEGI7AVqIREgBCEHIAhBiOwBagshAiARIAJrIgMgGiAHa0sNBCAHBH8gAwRAIAcgAiAD/AoAAAsgAyAHagVBAAsgE2shAwwHCyATIBRBACAUQQBKG2oMAQsgCCgC/OsBCyEWIAUgCCgC+OoBIgI2AswCIAIgCCgCiOsBaiEfAkAgDkUEQCATIQkMAQsgCCgCuOkBIRggCCgCtOkBISsgCCgCsOkBIQwgCEEBNgKM6gEgCEGs0AFqISQgBUGMAmohGkEAIQIDQCACQQNHBEAgGiACQQJ0IgNqIAMgJGooAgA2AgAgAkEBaiECDAELC0FsIQMgBUHgAWoiAiAEIAcQCEGIf0sNBSAFQfQBaiACIAgoAgAQHiAFQfwBaiACIAgoAggQHiAFQYQCaiACIAgoAgQQHiAWQSBrIRwgM0UhHiATIQkDQCAOBEAgBSgC+AEgBSgC9AFBA3RqIgItAAIhGyAFKAKIAiAFKAKEAkEDdGoiBC0AAiENIAUoAoACIAUoAvwBQQN0aiIGLQADIRUgBC0AAyEnIAItAAMhEiAGLwEAIRkgBC8BACERIAIvAQAhDyAGKAIEIQcgAigCBCECIAQoAgQhBAJAIAYtAAIiKEECTwRAAkAgHiAoQRlJckUEQCAFKALgASIhIAUoAuQBIgZ0QQUgKGt2QQV0IAdqIQcCQCAGIChqQQVrIgZBIU8EQCAFQbAaNgLoAQwBCyAFKALoASIKIAUoAvABTwRAIAUgBkEHcSILNgLkASAFIAogBkEDdmsiBjYC6AEgBSAGKAAAIiE2AuABIAshBgwBCyAKIAUoAuwBIgtGDQAgBSAGIAogC2sgBkEDdiIGIAogBmsgC0kbIgtBA3RrIgY2AuQBIAUgCiALayILNgLoASAFIAsoAAAiITYC4AELIAUgBkEFaiIKNgLkASAHICEgBnRBG3ZqIRAMAQsgBSAFKALkASIGIChqIgo2AuQBIAUoAuABIAZ0QQAgKGt2IAdqIRAgCkEhTwRAIAVBsBo2AugBDAELIAUoAugBIgcgBSgC8AFPBEAgBSAKQQdxIgY2AuQBIAUgByAKQQN2ayILNgLoASAFIAsoAAA2AuABIAYhCgwBCyAHIAUoAuwBIgtGDQAgBSAKIAcgC2sgCkEDdiIGIAcgBmsgC0kbIgZBA3RrIgo2AuQBIAUgByAGayIGNgLoASAFIAYoAAA2AuABCyAFKQKMAiE6IAUgEDYCjAIgBSA6NwKQAgwBCyACRSELIChFBEAgGiACQQBHQQJ0aigCACEGIAUgGiALQQJ0aigCACIQNgKMAiAFIAY2ApACIAUoAuQBIQoMAQsgBSAFKALkASIGQQFqIgo2AuQBAkACQCAHIAtqIAUoAuABIAZ0QR92aiILQQNGBEAgBSgCjAJBAWsiBkF/IAYbIRAMAQsgGiALQQJ0aigCACIGQX8gBhshECALQQFGDQELIAUgBSgCkAI2ApQCCyAFIAUoAowCNgKQAiAFIBA2AowCCyANIBtqIQsCQCANRQRAIAohBgwBCyAFIAogDWoiBjYC5AEgBSgC4AEgCnRBACANa3YgBGohBAsCQCALQRRJDQAgBkEhTwRAIAVBsBo2AugBDAELIAUoAugBIgcgBSgC8AFPBEAgBSAGQQdxIgs2AuQBIAUgByAGQQN2ayIGNgLoASAFIAYoAAA2AuABIAshBgwBCyAHIAUoAuwBIgtGDQAgBSAGIAcgC2sgBkEDdiIGIAcgBmsgC0kbIgtBA3RrIgY2AuQBIAUgByALayILNgLoASAFIAsoAAA2AuABCwJAIBtFBEAgBiEHDAELIAUgBiAbaiIHNgLkASAFKALgASAGdEEAIBtrdiACaiECCwJAIAdBIU8EQEGwGiEGIAVBsBo2AugBDAELIAUoAugBIgYgBSgC8AFPBEAgBSAHQQdxIgs2AuQBIAUgBiAHQQN2ayIGNgLoASAFIAYoAAA2AuABIAshBwwBCyAGIAUoAuwBIgpGDQAgBSAGIAYgCmsgB0EDdiILIAYgC2sgCkkbIgtrIgY2AugBIAUgByALQQN0ayIHNgLkASAFIAYoAAA2AuABCwJAIA5BAUYNACAFIBJBAnRBsBlqKAIAIAUoAuABIg1BACAHIBJqIgtrdnEgD2o2AvQBIAUgJ0ECdEGwGWooAgAgDUEAIAsgJ2oiB2t2cSARajYChAICQCAHQSFPBEBBsBohBiAFQbAaNgLoAQwBCyAFKALwASAGTQRAIAUgB0EHcSILNgLkASAFIAYgB0EDdmsiBjYC6AEgBSAGKAAAIg02AuABIAshBwwBCyAGIAUoAuwBIgpGDQAgBSAGIAYgCmsgB0EDdiILIAYgC2sgCkkbIgtrIgY2AugBIAUgByALQQN0ayIHNgLkASAFIAYoAAAiDTYC4AELIAUgByAVaiILNgLkASAFIBVBAnRBsBlqKAIAIA1BACALa3ZxIBlqNgL8ASALQSFPBEAgBUGwGjYC6AEMAQsgBSgC8AEgBk0EQCAFIAtBB3E2AuQBIAUgBiALQQN2ayIGNgLoASAFIAYoAAA2AuABDAELIAYgBSgC7AEiB0YNACAFIAsgBiAHayALQQN2IgsgBiALayAHSRsiC0EDdGs2AuQBIAUgBiALayIGNgLoASAFIAYoAAA2AuABCyAFIAI2AqgBIAUgBDYCrAEgBSAQNgKwAQJAAkACQCAFKALMAiIGIAJqIgsgH0sNACAJIAIgBGoiDWogHEsNACANQSBqIBYgCWtNDQELIAUgBSgCsAE2AhAgBSAFKQOoATcDCCAJIBYgBUEIaiAFQcwCaiAfIAwgKyAYECAhDQwBCyACIAlqIQcgBikAACE6IAkgBikACDcACCAJIDo3AAACQCACQRFJDQAgBikAECE6IAkgBikAGDcAGCAJIDo3ABAgAkEQa0ERSA0AIAZBEGohBiAJQSBqIQIDQCAGKQAQITogAiAGKQAYNwAIIAIgOjcAACAGKQAgITogAiAGKQAoNwAYIAIgOjcAECAGQSBqIQYgAkEgaiICIAdJDQALCyAHIBBrIQYgBSALNgLMAiAHIAxrIBBJBEAgECAHICtrSw0JIBggGCAGIAxrIgtqIgYgBGpPBEAgBEUNAiAHIAYgBPwKAAAMAgtBACALayICBEAgByAGIAL8CgAACyAFIAQgC2oiBDYCrAEgByALayEHIAwhBgsgEEEQTwRAIAYpAAAhOiAHIAYpAAg3AAggByA6NwAAIARBEUgNASAEIAdqIQQgB0EQaiECA0AgBikAECE6IAIgBikAGDcACCACIDo3AAAgBikAICE6IAIgBikAKDcAGCACIDo3ABAgBkEgaiEGIAJBIGoiAiAESQ0ACwwBCwJAIBBBB00EQCAHIAYtAAA6AAAgByAGLQABOgABIAcgBi0AAjoAAiAHIAYtAAM6AAMgByAGIBBBAnQiC0HgGmooAgBqIgIoAAA2AAQgAiALQYAbaigCAGshBgwBCyAHIAYpAAA3AAALIARBCUkNACAEIAdqIQsgB0EIaiICIAZBCGoiBmtBD0wEQANAIAIgBikAADcAACAGQQhqIQYgAkEIaiICIAtJDQAMAgsACyAGKQAAITogAiAGKQAINwAIIAIgOjcAACAEQRlIDQAgB0EYaiECA0AgBikAECE6IAIgBikAGDcACCACIDo3AAAgBikAICE6IAIgBikAKDcAGCACIDo3ABAgBkEgaiEGIAJBIGoiAiALSQ0ACwsgDUGIf0sEQCANIQMMCAUgDkEBayEOIAkgDWohCQwCCwALCyAFKALoASAFKALsAUcNBSAFKALkAUEgRw0FQQAhBgNAIAZBA0cEQCAkIAZBAnQiAmogAiAaaigCADYCACAGQQFqIQYMAQsLIAUoAswCIQILQbp/IQMgHyACayIEIBYgCWtLDQQgCQR/IAQEQCAJIAIgBPwKAAALIAQgCWoFQQALIBNrIQMMBAsgAkECRgRAIBwgA2siAiAUIAlrSw0BIAkEfyACBEAgCSADIAL8CgAACyACIAlqBUEACyEJIAhBiOwFaiEcIAhBiOwBaiEDCyAcIANrIgIgFCAJa0sNACAJBH8gAgRAIAkgAyAC/AoAAAsgAiAJagVBAAsgE2shAwwDC0G6fyEDDAILQWwhAwwBC0G4fyEDCyAFQdACaiQAIAMhBAwECyAgIDUgE2tLDQkgE0UEQCAgDQIMBQsgICIERQ0FIBMgHSAE/AoAAAwFCyAxKAIMIgQgAiATa0sNCCATDQEgBEUNAwtBtn8hBAwJCyAERQ0AIBMgHS0AACAE/AsACyAEQYh/Sw0HDAELQQAhBAsCQCAIKAL06gFFIBNFcg0AIAggCCkDkOoBIAStfDcDkOoBIAgoAtjqASIGIARqQR9NBEAgBARAIAYgNGogEyAE/AoAAAsgCCAIKALY6gEgBGo2AtjqAQwBCyATIQMgBgRAQSAgBmsiAgRAIAYgNGogAyAC/AoAAAsgCCgC2OoBIQIgCEEANgLY6gEgCCAIKQOY6gEgCCkAuOoBQs/W077Sx6vZQn58Qh+JQoeVr6+Ytt6bnn9+NwOY6gEgCCAIKQOg6gEgCCkAwOoBQs/W077Sx6vZQn58Qh+JQoeVr6+Ytt6bnn9+NwOg6gEgCCAIKQOo6gEgCCkAyOoBQs/W077Sx6vZQn58Qh+JQoeVr6+Ytt6bnn9+NwOo6gEgCCAIKQOw6gEgCCkA0OoBQs/W077Sx6vZQn58Qh+JQoeVr6+Ytt6bnn9+NwOw6gEgEyACa0EgaiEDCyAEIBNqIgYgA0Egak8EQCAGQSBrIQIgCCkDsOoBITsgCCkDqOoBITwgCCkDoOoBIT0gCCkDmOoBIToDQCAIIAMpAABCz9bTvtLHq9lCfiA6fEIfiUKHla+vmLbem55/fiI6NwOY6gEgCCADKQAIQs/W077Sx6vZQn4gPXxCH4lCh5Wvr5i23puef34iPTcDoOoBIAggAykAEELP1tO+0ser2UJ+IDx8Qh+JQoeVr6+Ytt6bnn9+Ijw3A6jqASAIIAMpABhCz9bTvtLHq9lCfiA7fEIfiUKHla+vmLbem55/fiI7NwOw6gEgA0EgaiIDIAJNDQALCyADIAZPDQAgBiADayICBEAgNCADIAL8CgAACyAIIAI2AtjqAQsgOCAgayEDIB0gIGohAiAEIBNqIRMgMSgCCEUNAAsgNikDACI6Qn9RIDogEyAsa6xRckUEQEFsIQYMBgsgCCgC4OkBBEBBaiEGIANBBEkNBiAIKALw6gFFBEAgAigAAAJ+IDcpAwAiPkIgWgRAIAgpA6DqASI7QgeJIAgpA5jqASI8QgGJfCAIKQOo6gEiPUIMiXwgCCkDsOoBIjpCEol8IDxCz9bTvtLHq9lCfkIfiUKHla+vmLbem55/foVCh5Wvr5i23puef35CnaO16oOxjYr6AH0gO0LP1tO+0ser2UJ+Qh+JQoeVr6+Ytt6bnn9+hUKHla+vmLbem55/fkKdo7Xqg7GNivoAfSA9Qs/W077Sx6vZQn5CH4lCh5Wvr5i23puef36FQoeVr6+Ytt6bnn9+Qp2jteqDsY2K+gB9IDpCz9bTvtLHq9lCfkIfiUKHla+vmLbem55/foVCh5Wvr5i23puef35CnaO16oOxjYr6AH0MAQsgCCkDqOoBQsXP2bLx5brqJ3wLID58IDQgPqcQIqdHDQcLIANBBGshAyACQQRqIQILIBMgLGsiBEGJf08NBCABIARrIQEgBCAsaiEsQQEhOQwBCwsgAwRAQbh/IQYMBAsgLCAAayEGDAMLQbp/IQQMAQtBuH8hBAtBuH8gBCAEQXZGGyAEIDkbIQYLIAgoApDrAQ0AIAgoAoTrASECIAgoAoDrASEDIAgQFiAIKALA6wEgAyACEBUgCEEANgLA6wEgCCgCrOsBIgEEQAJAAkACQAJAIAEoAgAiAARAIANFDQIgAiAAIAMRAgAMAQsgA0UNAgsgAiABIAMRAgAMAgsgABACCyABEAILIAhBADYCrOsBCyADBEAgAiAIIAMRAgAMAQsgCBACCyAxQRBqJAAgBgsKACAABEAQJgALCwMAAAsLzRIKAEGICAsFAQAAAAEAQZgIC9sEAQAAAAEAAACWAAAA2AAAAH0BAAB3AAAAqgAAAM0AAAACAgAAcAAAALEAAADHAAAAGwIAAG4AAADFAAAAwgAAAIQCAABrAAAA3QAAAMAAAADfAgAAawAAAAABAAC9AAAAcQMAAGoAAABnAQAAvAAAAI8EAABtAAAARgIAALsAAAAiBgAAcgAAALACAAC7AAAAsAYAAHoAAAA5AwAAugAAAK0HAACIAAAA0AMAALkAAABTCAAAlgAAAJwEAAC6AAAAFggAAK8AAABhBQAAuQAAAMMGAADKAAAAhAUAALkAAACfBgAAygAAAAAAAAABAAAAAQAAAAUAAAANAAAAHQAAAD0AAAB9AAAA/QAAAP0BAAD9AwAA/QcAAP0PAAD9HwAA/T8AAP1/AAD9/wAA/f8BAP3/AwD9/wcA/f8PAP3/HwD9/z8A/f9/AP3//wD9//8B/f//A/3//wf9//8P/f//H/3//z/9//9/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8DAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAABEAAAASAAAAEwAAABQAAAAVAAAAFgAAABcAAAAYAAAAGQAAABoAAAAbAAAAHAAAAB0AAAAeAAAAHwAAACAAAAAhAAAAIgAAACMAAAAlAAAAJwAAACkAAAArAAAALwAAADMAAAA7AAAAQwAAAFMAAABjAAAAgwAAAAMBAAADAgAAAwQAAAMIAAADEAAAAyAAAANAAAADgAAAAwABAEGgDQsVAQEBAQICAwMEBAUHCAkKCwwNDg8QAEHEDQuLAQEAAAACAAAAAwAAAAQAAAAFAAAABgAAAAcAAAAIAAAACQAAAAoAAAALAAAADAAAAA0AAAAOAAAADwAAABAAAAASAAAAFAAAABYAAAAYAAAAHAAAACAAAAAoAAAAMAAAAEAAAACAAAAAAAEAAAACAAAABAAAAAgAAAAQAAAAIAAAAEAAAACAAAAAAAEAQeAOC6YEAQEBAQICAwMEBgcICQoLDA0ODxABAAAABAAAAAgAAAABAAEBBgAAAAAAAAQAAAAAEAAABAAAAAAgAAAFAQAAAAAAAAUDAAAAAAAABQQAAAAAAAAFBgAAAAAAAAUHAAAAAAAABQkAAAAAAAAFCgAAAAAAAAUMAAAAAAAABg4AAAAAAAEFEAAAAAAAAQUUAAAAAAABBRYAAAAAAAIFHAAAAAAAAwUgAAAAAAAEBTAAAAAgAAYFQAAAAAAABwWAAAAAAAAIBgABAAAAAAoGAAQAAAAADAYAEAAAIAAABAAAAAAAAAAEAQAAAAAAAAUCAAAAIAAABQQAAAAAAAAFBQAAACAAAAUHAAAAAAAABQgAAAAgAAAFCgAAAAAAAAULAAAAAAAABg0AAAAgAAEFEAAAAAAAAQUSAAAAIAABBRYAAAAAAAIFGAAAACAAAwUgAAAAAAADBSgAAAAAAAYEQAAAABAABgRAAAAAIAAHBYAAAAAAAAkGAAIAAAAACwYACAAAMAAABAAAAAAQAAAEAQAAACAAAAUCAAAAIAAABQMAAAAgAAAFBQAAACAAAAUGAAAAIAAABQgAAAAgAAAFCQAAACAAAAULAAAAIAAABQwAAAAAAAAGDwAAACAAAQUSAAAAIAABBRQAAAAgAAIFGAAAACAAAgUcAAAAIAADBSgAAAAgAAQFMAAAAAAAEAYAAAEAAAAPBgCAAAAAAA4GAEAAAAAADQYAIABBkBMLhwIBAAEBBQAAAAAAAAUAAAAAAAAGBD0AAAAAAAkF/QEAAAAADwX9fwAAAAAVBf3/HwAAAAMFBQAAAAAABwR9AAAAAAAMBf0PAAAAABIF/f8DAAAAFwX9/38AAAAFBR0AAAAAAAgE/QAAAAAADgX9PwAAAAAUBf3/DwAAAAIFAQAAABAABwR9AAAAAAALBf0HAAAAABEF/f8BAAAAFgX9/z8AAAAEBQ0AAAAQAAgE/QAAAAAADQX9HwAAAAATBf3/BwAAAAEFAQAAABAABgQ9AAAAAAAKBf0DAAAAABAF/f8AAAAAHAX9//8PAAAbBf3//wcAABoF/f//AwAAGQX9//8BAAAYBf3//wBBoBULhgQBAAEBBgAAAAAAAAYDAAAAAAAABAQAAAAgAAAFBQAAAAAAAAUGAAAAAAAABQgAAAAAAAAFCQAAAAAAAAULAAAAAAAABg0AAAAAAAAGEAAAAAAAAAYTAAAAAAAABhYAAAAAAAAGGQAAAAAAAAYcAAAAAAAABh8AAAAAAAAGIgAAAAAAAQYlAAAAAAABBikAAAAAAAIGLwAAAAAAAwY7AAAAAAAEBlMAAAAAAAcGgwAAAAAACQYDAgAAEAAABAQAAAAAAAAEBQAAACAAAAUGAAAAAAAABQcAAAAgAAAFCQAAAAAAAAUKAAAAAAAABgwAAAAAAAAGDwAAAAAAAAYSAAAAAAAABhUAAAAAAAAGGAAAAAAAAAYbAAAAAAAABh4AAAAAAAAGIQAAAAAAAQYjAAAAAAABBicAAAAAAAIGKwAAAAAAAwYzAAAAAAAEBkMAAAAAAAUGYwAAAAAACAYDAQAAIAAABAQAAAAwAAAEBAAAABAAAAQFAAAAIAAABQcAAAAgAAAFCAAAACAAAAUKAAAAIAAABQsAAAAAAAAGDgAAAAAAAAYRAAAAAAAABhQAAAAAAAAGFwAAAAAAAAYaAAAAAAAABh0AAAAAAAAGIAAAAAAAEAYDAAEAAAAPBgOAAAAAAA4GA0AAAAAADQYDIAAAAAAMBgMQAAAAAAsGAwgAAAAACgYDBABBtBkLfAEAAAADAAAABwAAAA8AAAAfAAAAPwAAAH8AAAD/AAAA/wEAAP8DAAD/BwAA/w8AAP8fAAD/PwAA/38AAP//AAD//wEA//8DAP//BwD//w8A//8fAP//PwD//38A////AP///wH///8D////B////w////8f////P////38AQcQaC1kBAAAAAgAAAAQAAAAAAAAAAgAAAAQAAAAIAAAAAAAAAAEAAAACAAAAAQAAAAQAAAAEAAAABAAAAAQAAAAIAAAACAAAAAgAAAAHAAAACAAAAAkAAAAKAAAACwBBoBsLA6APAQ==";
const zstd$2 = new ZSTDDecoder$1();
class LercDecoder extends BaseDecoder {
  decodeBlock(buffer2) {
    const addCompression = this.parameters.LercParameters[LercParameters.AddCompression];
    switch (addCompression) {
      case LercAddCompression.None:
        break;
      case LercAddCompression.Deflate:
        buffer2 = inflate_1(new Uint8Array(buffer2)).buffer;
        break;
      case LercAddCompression.Zstandard:
        buffer2 = zstd$2.decode(new Uint8Array(buffer2)).buffer;
        break;
      default:
        throw new Error(`Unsupported LERC additional compression method identifier: ${addCompression}`);
    }
    const lercResult = Lerc.decode(buffer2, { returnPixelInterleavedDims: this.parameters.planarConfiguration === 1 });
    const lercData = lercResult.pixels[0];
    return lercData.buffer;
  }
}
const lerc = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LercDecoder,
  zstd: zstd$2
}, Symbol.toStringTag, { value: "Module" }));
let init;
let instance;
let heap;
let heapView;
const IMPORT_OBJECT = {
  env: {
    emscripten_notify_memory_growth: (_) => {
      heap = new Uint8Array(instance.exports.memory.buffer);
      heapView = new DataView(heap.buffer);
    }
  }
};
class ZSTDDecoder2 {
  init() {
    if (init) return init;
    if (typeof fetch !== "undefined") {
      init = fetch(`data:application/wasm;base64,${wasm}`).then((response) => response.arrayBuffer()).then((arrayBuffer) => WebAssembly.instantiate(arrayBuffer, IMPORT_OBJECT)).then(this._init);
    } else {
      init = WebAssembly.instantiate(Buffer.from(wasm, "base64"), IMPORT_OBJECT).then(this._init);
    }
    return init;
  }
  _init(result) {
    instance = result.instance;
    IMPORT_OBJECT.env.emscripten_notify_memory_growth(0);
  }
  decode(array2, uncompressedSize = 0) {
    if (!instance) throw new Error("ZSTDDecoder: Await .init() before decoding.");
    const compressedSize = array2.byteLength;
    const compressedPtr = instance.exports.malloc(compressedSize);
    heap.set(array2, compressedPtr);
    if (uncompressedSize === 0) {
      uncompressedSize = Number(instance.exports.ZSTD_findDecompressedSize(compressedPtr, compressedSize));
    }
    if (uncompressedSize === -1) {
      instance.exports.free(compressedPtr);
      const parts = [];
      for (const out of this.decodeStreaming([array2])) {
        parts.push(out);
      }
      if (parts.length === 1) {
        return parts[0];
      }
      const fullByteLength = parts.reduce((acc, arr) => acc + arr.byteLength, 0);
      const result = new Uint8Array(fullByteLength);
      let offset = 0;
      for (const part of parts) {
        result.set(part, offset);
        offset += part.byteLength;
      }
      return result;
    }
    const uncompressedPtr = instance.exports.malloc(uncompressedSize);
    const actualSize = instance.exports.ZSTD_decompress(uncompressedPtr, uncompressedSize, compressedPtr, compressedSize);
    const dec = heap.slice(uncompressedPtr, uncompressedPtr + actualSize);
    instance.exports.free(compressedPtr);
    instance.exports.free(uncompressedPtr);
    return dec;
  }
  *decodeStreaming(arrays) {
    if (!instance) throw new Error("ZSTDDecoder: Await .init() before decoding.");
    const buffInSize = instance.exports.ZSTD_DStreamInSize();
    const buffIn = instance.exports.malloc(buffInSize);
    const buffOutSize = instance.exports.ZSTD_DStreamOutSize();
    const buffOut = instance.exports.malloc(buffOutSize);
    const dctxPtr = instance.exports.ZSTD_createDCtx();
    const sizeOfPointer = 4;
    const sizeOfSizeT = 4;
    const inputPtr = instance.exports.malloc(sizeOfPointer + sizeOfSizeT * 2);
    const outputPtr = instance.exports.malloc(sizeOfPointer + sizeOfSizeT * 2);
    let lastRet = 0;
    for (const array2 of arrays) {
      const compressedPtr = instance.exports.malloc(array2.byteLength);
      heap.set(array2, compressedPtr);
      heapView.setInt32(inputPtr, compressedPtr, true);
      heapView.setInt32(inputPtr + sizeOfPointer, array2.byteLength, true);
      heapView.setInt32(inputPtr + sizeOfPointer + sizeOfSizeT, 0, true);
      while (heapView.getUint32(inputPtr + sizeOfPointer + sizeOfSizeT, true) < heapView.getUint32(inputPtr + sizeOfPointer, true)) {
        heapView.setInt32(outputPtr, buffOut, true);
        heapView.setInt32(outputPtr + sizeOfPointer, buffOutSize, true);
        heapView.setInt32(outputPtr + sizeOfPointer + sizeOfSizeT, 0, true);
        lastRet = instance.exports.ZSTD_decompressStream(dctxPtr, outputPtr, inputPtr);
        const outputPos = heapView.getUint32(outputPtr + sizeOfPointer + sizeOfSizeT, true);
        yield heap.slice(buffOut, buffOut + outputPos);
      }
      instance.exports.free(compressedPtr);
    }
    instance.exports.ZSTD_freeDCtx(dctxPtr);
    instance.exports.free(buffIn);
    instance.exports.free(buffOut);
    instance.exports.free(inputPtr);
    instance.exports.free(outputPtr);
    if (lastRet !== 0) {
      throw new Error("Incomplete stream, more data expected.");
    }
  }
}
const wasm = "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QQhyIQBBACEDA0AgACADTQ0DIANBQGshAwwACwALQWwhCiAOIA5B/ABqIA5B+ABqIAUgBhAGIgJBiH9LDQEgDigCeCIDIARLDQEgACAOIA4oAnwgByAIIAMgDRAlIAEgADYCACACIQoMAQtBbCEKCyAOQYABaiQAIAoLcAEEfyAAQgA3AgAgAgRAIAFBCmohBiABKAIEIQRBACECQQAhAQNAIAEgBHZFBEAgAiAGIAFBA3RqLQAAIgUgAiAFSxshAiABQQFqIQEgAyAFQRZLaiEDDAELCyAAIAI2AgQgACADQQggBGt0NgIACwuuAQEEfyABIAIoAgQiAyABKAIEaiIENgIEIAAgA0ECdEGwGWooAgAgASgCAEEAIARrdnE2AgACQCAEQSFPBEAgAUGwGjYCCAwBCyABKAIIIgMgASgCEE8EQCABEAwMAQsgAyABKAIMIgVGDQAgASADIAMgBWsgBEEDdiIGIAMgBmsgBUkbIgNrIgU2AgggASAEIANBA3RrNgIEIAEgBSgAADYCAAsgACACQQhqNgIEC40CAgN/AX4gACACaiEEAkACQCACQQhOBEAgACABayICQXlIDQELA0AgACAETw0CIAAgAS0AADoAACAAQQFqIQAgAUEBaiEBDAALAAsCQAJAIAJBb0sNACAAIARBIGsiAksNACABKQAAIQYgACABKQAINwAIIAAgBjcAACACIABrIgVBEU4EQCAAQRBqIQAgASEDA0AgAykAECEGIAAgAykAGDcACCAAIAY3AAAgAykAICEGIAAgAykAKDcAGCAAIAY3ABAgA0EgaiEDIABBIGoiACACSQ0ACwsgASAFaiEBDAELIAAhAgsDQCACIARPDQEgAiABLQAAOgAAIAJBAWohAiABQQFqIQEMAAsACwvfAQEGf0G6fyEKAkAgAigCBCIIIAIoAgAiCWoiDSABIABrSw0AQWwhCiAJIAQgAygCACILa0sNACAAIAlqIgQgAigCCCIMayECIAAgAUEgayIBIAsgCUEAEDMgAyAJIAtqNgIAAkACQCAEIAVrIAxPBEAgAiEFDAELIAwgBCAGa0sNAiAHIAcgAiAFayIDaiICIAhqTwRAIAhFDQIgBCACIAj8CgAADAILQQAgA2siAARAIAQgAiAA/AoAAAsgAyAIaiEIIAQgA2shBAsgBCABIAUgCEEBEDML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";
const zstd = new ZSTDDecoder2();
class ZstdDecoder extends BaseDecoder {
  decodeBlock(buffer2) {
    return zstd.decode(new Uint8Array(buffer2)).buffer;
  }
}
const zstd$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ZstdDecoder,
  zstd
}, Symbol.toStringTag, { value: "Module" }));
class WebImageDecoder extends BaseDecoder {
  constructor(parameters) {
    super(parameters);
    if (typeof createImageBitmap === "undefined") {
      throw new Error("Cannot decode WebImage as `createImageBitmap` is not available");
    } else if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined") {
      throw new Error("Cannot decode WebImage as neither `document` nor `OffscreenCanvas` is not available");
    }
  }
  async decodeBlock(buffer2) {
    const blob = new Blob([buffer2]);
    const imageBitmap = await createImageBitmap(blob);
    let canvas;
    if (typeof document !== "undefined") {
      canvas = document.createElement("canvas");
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
    } else {
      canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    }
    const ctx = (
      /** @type {CanvasRenderingContext2D} */
      canvas.getContext("2d")
    );
    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height).data;
    const samplesPerPixel = this.parameters.samplesPerPixel || 4;
    if (samplesPerPixel === 4) {
      return imageData.buffer;
    } else if (samplesPerPixel === 3) {
      const rgb = new Uint8ClampedArray(imageBitmap.width * imageBitmap.height * 3);
      for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
        rgb[i] = imageData[j];
        rgb[i + 1] = imageData[j + 1];
        rgb[i + 2] = imageData[j + 2];
      }
      return rgb.buffer;
    } else {
      throw new Error(`Unsupported SamplesPerPixel value: ${samplesPerPixel}`);
    }
  }
}
const webimage = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: WebImageDecoder
}, Symbol.toStringTag, { value: "Module" }));
export {
  main
};

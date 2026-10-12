import { parseArgs } from "node:util";
import { randomUUID, createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer, request } from "node:http";
import path from "node:path";
import { a as auth } from "./lib/modelcontextprotocol-sdk.mjs";
import { constants, existsSync, openSync, closeSync, chmodSync, renameSync } from "node:fs";
import { mkdir, open, readdir, rm, rmdir, lstat, rename, opendir } from "node:fs/promises";
import os from "node:os";
import { setTimeout as setTimeout$1 } from "node:timers/promises";
import { Readable, Transform } from "node:stream";
import { s as saxesExports } from "./lib/saxes.mjs";
import { G as GeoTIFF } from "./lib/geotiff.mjs";
import { request as request$1 } from "node:https";
import { pipeline } from "node:stream/promises";
import { DatabaseSync } from "node:sqlite";
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
    const handle = await open(
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
  } catch (error) {
    if (error.code === "ENOENT") return void 0;
    throw new HelperError("private_state_invalid");
  }
}
async function writePrivate(filename, value) {
  const text = JSON.stringify(value);
  if (Buffer.byteLength(text) > MAX_PRIVATE_STATE_BYTES)
    throw new HelperError("private_state_size_limit");
  await mkdir(path.dirname(filename), { recursive: true, mode: 448 });
  const temporary = `${filename}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 384);
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
        const handle = await open(path.join(filename, owner), "wx", 384);
        await handle.close();
        const owners = await readdir(filename);
        if (owners.length !== 1 || owners[0] !== owner) {
          await rm(path.join(filename, owner), { force: true });
          continue;
        }
      } catch (error) {
        await rmdir(filename).catch(() => void 0);
        if (error.code !== "ENOENT")
          throw new HelperError("private_state_unavailable");
        continue;
      }
      break;
    } catch (error) {
      if (error.code !== "EEXIST")
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
    await rmdir(filename).catch((error) => {
      if (error.code !== "ENOTEMPTY" && error.code !== "ENOENT") throw error;
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
    } catch (error) {
      if (error.code !== "ESRCH") return;
    }
    await rm(path.join(filename, names[0]), { force: true });
    await rmdir(filename);
  } catch (error) {
    if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(
      error.code ?? ""
    ))
      throw error;
  }
}
async function boundedFile(filename, maximum) {
  const handle = await open(
    filename,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
  );
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > maximum)
      throw new HelperError("source_size_limit");
    const buffer = Buffer.alloc(stat.size + 1);
    let length = 0;
    while (length < buffer.length) {
      const read = await handle.read(
        buffer,
        length,
        buffer.length - length,
        length
      );
      if (read.bytesRead === 0) break;
      length += read.bytesRead;
    }
    const bytes = buffer.subarray(0, length);
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
function boundToOrigin(credentials, origin) {
  return [credentials.client?.issuer, credentials.tokens?.issuer].every(
    (issuer) => {
      if (typeof issuer !== "string") return false;
      try {
        return new URL(issuer).href === `${origin}/`;
      } catch {
        return false;
      }
    }
  );
}
function canonicalOrigin(value, development = false) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new HelperError("invalid_origin");
  }
  if (url.protocol !== "https:" && !(development && url.protocol === "http:" && url.hostname === "127.0.0.1") || url.username || url.password || url.search || url.hash || url.pathname !== "/")
    throw new HelperError("invalid_origin");
  return url.origin;
}
function pinnedFetch(origin, fetcher = fetch) {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.origin !== origin || url.username || url.password || url.hash)
      throw new HelperError("invalid_destination");
    return fetcher(input, {
      ...init,
      redirect: "error",
      signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(3e4)]) : AbortSignal.timeout(3e4)
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
      if (!boundToOrigin(saved, this.origin)) {
        await removePrivate(this.filename);
        throw new HelperError("login_required");
      }
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
        state.provider.redirectToAuthorization = async (url) => {
          if (url.origin !== this.origin || url.pathname !== "/authorize" || url.username || url.password || url.hash)
            throw new HelperError("invalid_destination");
          await openBrowser(url);
        };
        const callback = new Promise((resolve, reject) => {
          timer = setTimeout(
            () => reject(new HelperError("login_timeout")),
            3e5
          );
          server.on("request", (request2, response) => {
            let url;
            try {
              url = new URL(request2.url ?? "/", redirect);
            } catch {
              response.writeHead(400);
              response.end("Authorization callback refused.");
              return;
            }
            const matchingState = request2.method === "GET" && request2.headers.host === new URL(redirect).host && url.origin === new URL(redirect).origin && url.pathname === "/callback" && url.searchParams.getAll("state").length === 1 && url.searchParams.get("state") === expectedState;
            const denied = matchingState && url.searchParams.has("error");
            const code2 = url.searchParams.get("code");
            const valid = matchingState && !!code2 && url.searchParams.getAll("code").length === 1 && !url.searchParams.has("error");
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
      } catch (error) {
        throw error instanceof HelperError ? error : new HelperError("auth_failed");
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
      if (saved && boundToOrigin(saved, this.origin)) {
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
      const credentials = { client, tokens, expiresAt, redirectUrl };
      if (!boundToOrigin(credentials, this.origin))
        throw new HelperError("auth_failed");
      return credentials;
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
      saveTokens: async (next) => {
        tokens = next;
        expiresAt = Date.now() + (next.expires_in ?? 600) * 1e3;
        await writePrivate(this.filename, value());
      },
      saveCodeVerifier: (next) => {
        verifier = next;
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
async function launchBrowser(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "rundll32.exe" : "xdg-open";
  const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url.href] : [url.href];
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
        (object, index) => object.ordinal !== objects.length + index || !isUuid$1(object.id) || !("first_sentinel_sha256" in object) || !isSha256$1(object.first_sentinel_sha256) || !isSha256$1(object.last_sentinel_sha256)
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
      const next = parent === "Pixels" && retainedPixelsDepths.at(-1) === elementStack.length - 1 && inspection.tiffData.length < 2 ? {
        ifd: attribute(tag, "IFD"),
        firstZ: attribute(tag, "FirstZ"),
        firstC: attribute(tag, "FirstC"),
        firstT: attribute(tag, "FirstT"),
        planeCount: attribute(tag, "PlaneCount"),
        hasUnsupportedChild: false,
        uuidReferences: []
      } : void 0;
      if (next) inspection.tiffData.push(next);
      tiffDataStack.push(next);
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
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof QualificationFailure) {
      return blocked(error.code, error.message, source.relativePath);
    }
    if (error instanceof RouteToUploaderFailure) {
      return route(error.code, error.message, source.relativePath);
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
    const array = value;
    const first = array.length > 0 ? array[0] : void 0;
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
    const next = this.fetchedBytes + bytes;
    if (!Number.isSafeInteger(bytes) || bytes < 0 || !Number.isSafeInteger(next) || next > this.profile.maxSelectionMetadataBytes) {
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
    this.fetchedBytes = next;
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
  const buffer = await readStructuralRange(source, offset, length);
  return createHash("sha256").update(buffer).digest("hex");
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
    const next = this.heldBytes + bytes;
    if (next > this.maximumBytes) {
      throw new Error("The source buffer ceiling was exceeded.");
    }
    this.heldBytes = next;
    this.highWaterBytes = Math.max(this.highWaterBytes, next);
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
    handle = await open(
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
  } catch (error) {
    await handle.close();
    throw error;
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
    const buffer = Buffer.alloc(length);
    let bytesRead = 0;
    while (bytesRead < length) {
      signal?.throwIfAborted();
      const result = await this.handle.read(
        buffer,
        bytesRead,
        length - bytesRead,
        offset + bytesRead
      );
      if (result.bytesRead === 0) {
        throw new SourceChangedError("The source changed while reading.");
      }
      bytesRead += result.bytesRead;
    }
    return buffer;
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
      const { bytesRead } = await this.handle.read(chunk, 0, chunk.byteLength, position).catch((error) => {
        this.bufferBudget?.release(chunk.byteLength);
        throw error;
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
function isLocalDevelopmentUrl(url, origin, localDevelopment) {
  return localDevelopment && url.origin === origin && !url.username && !url.password;
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
      fileStream.once("error", (error) => hashingStream.destroy(error));
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
      } catch (error) {
        fileStream.destroy();
        hashingStream.destroy();
        if (error instanceof SourceChangedError) throw error;
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
        if (attempt === MAX_PART_ATTEMPTS) throw error;
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
    const url = new URL(uploadUrl);
    const local = isLocalDevelopmentUrl(
      url,
      LOCAL_STORAGE_ORIGIN,
      this.localDevelopment
    );
    if (!local && url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Multipart upload requires HTTPS.");
    }
    const response = new Promise((resolve, reject) => {
      let settled = false;
      let sourceFailure;
      let connectionTimer;
      const onSourceError = (error) => {
        sourceFailure = error instanceof Error ? error : new Error("The source read failed.");
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
      const rejectOnce = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
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
        url,
        {
          method: "PUT",
          headers: { "Content-Length": String(contentLength) },
          signal
        },
        (result) => {
          clearConnectionTimer();
          result.once("error", (error) => {
            rejectProvider("The storage provider response failed.", error);
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
          const error = new MultipartTransportError(
            "The storage provider connection timed out."
          );
          rejectOnce(error);
          request$2.destroy(error);
        }, this.connectionTimeoutMs);
        connectionTimer.unref();
      }
      request$2.setTimeout(this.inactivityTimeoutMs, () => {
        const error = new MultipartTransportError(
          "The storage provider request timed out."
        );
        rejectOnce(error);
        request$2.destroy(error);
      });
      request$2.once("error", (error) => {
        if (sourceFailure) {
          rejectOnce(sourceFailure);
        } else if (error.name === "AbortError") {
          rejectOnce(error);
        } else {
          rejectProvider("The storage provider request failed.", error);
        }
      });
      void pipeline(source, request$2).catch((error) => {
        if (sourceFailure) {
          rejectOnce(sourceFailure);
        } else if (error instanceof Error && error.name === "AbortError") {
          rejectOnce(error);
        } else {
          rejectProvider("The storage provider request failed.", error);
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
  for (const object of input.bundle.objects) {
    const server = input.serverObjects[object.ordinal];
    if (!server) throw new Error("The server inventory is incomplete.");
    const partCount = Math.ceil(object.sizeBytes / UPLOADER_PART_SIZE_BYTES);
    const complete = server.status === "uploaded" || server.status === "verified";
    ledger.set(object.objectId, {
      uploadedBytes: complete ? object.sizeBytes : 0,
      confirmedParts: complete ? partCount : 0,
      partCount,
      complete
    });
    if (server.status === "error") {
      throw new Error("Uploader transfer could not complete.");
    }
    if (!complete) queue.push(object);
  }
  publishProgress();
  const worker = async () => {
    while (!stopped && !input.signal?.aborted) {
      const object = queue[nextIndex];
      nextIndex += 1;
      if (!object) return;
      const source = input.sources[object.ordinal];
      if (!source) throw new Error("The local source inventory is incomplete.");
      const controller = new AbortController();
      activeControllers.set(object.objectId, controller);
      activeWorkers += 1;
      maximumActiveWorkers = Math.max(maximumActiveWorkers, activeWorkers);
      input.onWorkerActivity?.(object.objectId, true);
      publishMetrics();
      let opened;
      try {
        const signal = input.signal ? AbortSignal.any([input.signal, controller.signal]) : controller.signal;
        const initialState = await input.api.reconcile(
          input.bundle.uploadId,
          object.objectId,
          signal
        );
        assertMultipartStateGeometry(initialState, object.sizeBytes);
        input.onReconciled?.(object, initialState);
        if (multipartFailed(initialState)) {
          const error = new Error("Uploader transfer could not complete.");
          terminalFailure ??= error;
          throw error;
        }
        const current = ledger.get(object.objectId);
        if (!current) throw new Error("Transfer progress is unavailable.");
        applyMultipartProgress(current, initialState, object.sizeBytes);
        if (initialState.object_status === "uploaded" || initialState.object_status === "verified") {
          current.complete = true;
          publishProgress();
          continue;
        }
        if (initialState.state === "completing" || initialState.state === "completed") {
          awaitingServer.add(object.objectId);
          publishProgress();
          continue;
        }
        publishProgress();
        opened = await openStructuralSource(source, budget);
        const result = await transferOneObject({
          source: opened.file,
          uploadId: input.bundle.uploadId,
          objectId: object.objectId,
          api: input.api,
          transport: input.transport,
          saveCheckpoint: (checkpoint) => {
            object.checkpointGeneration = checkpoint.generation;
            object.confirmedPartNumbers = [...checkpoint.confirmedPartNumbers];
            input.saveCheckpoint(object, checkpoint);
          },
          onProgress: (progress) => {
            const current2 = ledger.get(object.objectId);
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
        assertMultipartStateGeometry(result.state, object.sizeBytes);
        if (multipartFailed(result.state)) {
          const error = new Error("Uploader transfer could not complete.");
          terminalFailure ??= error;
          throw error;
        }
        const awaitsServer = result.state.object_status === "pending" && (result.state.state === "completing" || result.state.state === "completed");
        if (result.state.object_status !== "uploaded" && result.state.object_status !== "verified" && !awaitsServer) {
          throw new Error("Uploader transfer did not complete the object.");
        }
        const completed = ledger.get(object.objectId);
        if (!completed) throw new Error("Transfer progress is unavailable.");
        applyMultipartProgress(completed, result.state, object.sizeBytes);
        completed.complete = !awaitsServer;
        if (awaitsServer) awaitingServer.add(object.objectId);
        input.onReconciled?.(object, result.state);
        publishProgress();
      } catch (error) {
        if (error instanceof SourceChangedError) {
          sourceMutations.set(object.objectId, { object, error });
        }
        if (!firstFailure && !input.signal?.aborted) {
          firstFailure = { error };
          stopped = true;
          ambiguousAtFailure = new Set(activeControllers.keys());
          for (const [objectId, active] of activeControllers) {
            if (objectId !== object.objectId) active.abort();
          }
        }
      } finally {
        activeControllers.delete(object.objectId);
        activeWorkers -= 1;
        input.onWorkerActivity?.(object.objectId, false);
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
    for (const object of input.bundle.objects) {
      if (!ambiguousAtFailure.has(object.objectId)) continue;
      try {
        const state = await input.api.reconcile(
          input.bundle.uploadId,
          object.objectId,
          input.signal
        );
        assertMultipartStateGeometry(state, object.sizeBytes);
        const current = ledger.get(object.objectId);
        if (!current) continue;
        applyMultipartProgress(current, state, object.sizeBytes);
        if (multipartFailed(state)) {
          current.complete = false;
          awaitingServer.delete(object.objectId);
          terminalFailure ??= new Error(
            "Uploader transfer could not complete."
          );
        } else if (state.object_status === "uploaded" || state.object_status === "verified") {
          current.complete = true;
          completeAfterDrain.add(object.objectId);
          awaitingServer.delete(object.objectId);
        } else if (state.object_status === "pending" && (state.state === "completing" || state.state === "completed")) {
          awaitingServer.add(object.objectId);
        }
        input.onReconciled?.(object, state);
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
    for (const object of ledger.values()) {
      uploadedBytes += object.uploadedBytes;
      confirmedParts += object.confirmedParts;
      partCount += object.partCount;
      if (object.complete) completedFiles += 1;
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
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
function readZarrRecovery(database, envelope) {
  const inventory = database.prepare("SELECT * FROM recovery_zarr_inventory WHERE upload_id = ?").get(envelope.uploadId);
  if (!inventory || typeof inventory.plan_json !== "string")
    throw new Error("Recovery inventory is unavailable.");
  const members = database.prepare(
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
    members: members.map((row) => ({
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
      const version = database.prepare("PRAGMA user_version").get();
      if (version.user_version === 0) createSchema(database);
      else if (version.user_version === 2) migrateSchema2(database);
      else if (version.user_version !== SCHEMA_VERSION) {
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
    } catch (error) {
      database.close();
      throw error;
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
          const next = bundle.packages[pkg.ordinal];
          if (pkg.declaration && (!next || pkg.objectId !== next.objectId || canonicalJson(pkg.declaration) !== canonicalJson(next.declaration)))
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
      for (const object of bundle.objects) {
        insert.run(
          bundle.uploadId,
          object.objectId,
          object.ordinal,
          object.relativePath,
          object.device,
          object.inode,
          object.sizeBytes,
          object.mtimeNs,
          object.firstSentinelSha256,
          object.lastSentinelSha256,
          object.partSizeBytes,
          object.checkpointGeneration,
          JSON.stringify(sortedParts(object.confirmedPartNumbers))
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
      const object = this.database.prepare(
        `SELECT size_bytes${table === "recovery_zarr_package" ? ", package_sha256" : ""} FROM ${table} WHERE upload_id = ? AND object_id = ?`
      ).get(uploadId, objectId);
      if (!object) throw new Error("Recovery object is unavailable.");
      const outside = confirmed.some(
        (part) => part > Math.ceil(object.size_bytes / PART_SIZE_BYTES)
      );
      if (table === "recovery_zarr_package" && (!object.package_sha256 || outside))
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
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
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
    const object = bundle.objects[ordinal];
    if (!object || !isValidObject(object, ordinal)) {
      throw new Error("Recovery checkpoint is corrupt.");
    }
    if (ids.has(object.objectId) || paths.has(object.relativePath)) {
      throw new Error("Recovery checkpoint is corrupt.");
    }
    ids.add(object.objectId);
    paths.add(object.relativePath);
    bytesTotal += object.sizeBytes;
  }
  if (!Number.isSafeInteger(bytesTotal) || bytesTotal !== bundle.bytesTotal) {
    throw new Error("Recovery checkpoint is corrupt.");
  }
}
function isValidObject(object, ordinal) {
  const partCount = Math.ceil(object.sizeBytes / object.partSizeBytes);
  return isUuid(object.objectId) && object.ordinal === ordinal && typeof object.relativePath === "string" && object.relativePath.length > 0 && !object.relativePath.startsWith("/") && !object.relativePath.split("/").includes("..") && [object.device, object.inode, object.mtimeNs].every(
    (value) => typeof value === "string" && /^\d+$/.test(value)
  ) && Number.isSafeInteger(object.sizeBytes) && object.sizeBytes > 0 && object.sizeBytes <= 1073741824 && isSha256(object.firstSentinelSha256) && isSha256(object.lastSentinelSha256) && object.partSizeBytes === PART_SIZE_BYTES && Number.isSafeInteger(object.checkpointGeneration) && object.checkpointGeneration >= 1 && object.confirmedPartNumbers.every(
    (part) => Number.isInteger(part) && part >= 1 && part <= partCount
  ) && new Set(object.confirmedPartNumbers).size === object.confirmedPartNumbers.length;
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
    const values = JSON.parse(
      (await boundedFile(options.placementFile, 1024 * 1024)).toString("utf8")
    );
    if (!values || Array.isArray(values) || typeof values !== "object")
      throw new HelperError("invalid_placement_file");
    placements = {};
    for (const [relativePath, value] of Object.entries(values)) {
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
      (object) => object.placement.well_row === null || object.placement.well_column === null || object.placement.well_row >= geometry[0] || object.placement.well_column >= geometry[1]
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
    plan.objects.filter((object) => object.placement.well_row !== null).map(
      (object) => `${object.placement.well_row}:${object.placement.well_column}`
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
  for (const object of plan.objects) {
    const {
      well_row: wellRow,
      well_column: wellColumn,
      field_index: fieldIndex
    } = object.placement;
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
          (sum, object) => sum + object.size_bytes,
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
      saveCheckpoint: (object, checkpoint) => store.updateCheckpoint(receipt.upload_id, object.objectId, checkpoint),
      onSourceChanged: (object) => client.sourceChanged(receipt.upload_id, object.objectId)
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
  } catch (error) {
    throw new MapImportFailure(
      error instanceof HelperError ? error.code : "map_import_failed",
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
  const { values } = parseArgs({
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
    values.origin ?? "https://public-api.carnation.bio"
  );
  const required = (value) => {
    if (!value) throw new HelperError("missing_argument");
    return value;
  };
  const output = (value) => process.stdout.write(`${JSON.stringify(value)}
`);
  if (command === "inspect") {
    const result = await inspect(
      origin,
      required(values.source),
      required(values.name),
      {
        placementFile: values.placements,
        plateFormat: values["plate-format"],
        mapFile: values["map-file"]
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
    output(await client.status(identifier(required(values.upload))));
    return;
  }
  if (command === "import-map") {
    output(
      await importMap(
        client,
        origin,
        identifier(required(values.dataset)),
        required(values["map-file"])
      )
    );
    return;
  }
  if (command === "upload" || command === "resume") {
    const reviewId = identifier(required(values.review));
    const digest = required(values.digest);
    if (command === "upload" && values.confirmed !== true)
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
          confirmed: values.confirmed === true,
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
          } catch (error) {
            output({
              dataset_id: result.dataset_id,
              map_error: error instanceof HelperError ? error.code : "map_import_failed",
              import_id: error instanceof MapImportFailure ? error.importId : void 0,
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
void main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(
    `${JSON.stringify({ error: error instanceof HelperError ? error.code : error instanceof SourceChangedError ? "source_changed" : "helper_failed", import_id: error instanceof MapImportFailure ? error.importId : void 0 })}
`
  );
  process.exitCode = 1;
});
export {
  main
};

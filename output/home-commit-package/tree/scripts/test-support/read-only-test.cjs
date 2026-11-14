"use strict";
// Preload for audit suites: fail before any filesystem mutation. An attempted
// identical-byte synchronous write is checked and suppressed, never persisted.
// Other chats may still change the checkout independently.
const fs = require("node:fs");
const originalRead = fs.readFileSync;
const deny = name => () => { throw new Error(`READ_ONLY_TEST: forbidden fs.${name}`); };
for (const name of ["writeFile", "appendFile", "truncate", "ftruncate", "write", "writev", "rename", "unlink", "rm", "rmdir", "mkdir", "copyFile", "cp", "link", "symlink", "chmod", "chown", "utimes"]) {
  for (const key of [name, `${name}Sync`]) if (typeof fs[key] === "function") fs[key] = deny(key);
  if (typeof fs.promises[name] === "function") fs.promises[name] = deny(`promises.${name}`);
}
fs.writeFileSync = function(file, data, options) {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data, typeof options === "string" ? options : options?.encoding || "utf8");
  if (fs.existsSync(file) && originalRead(file).equals(bytes)) return;
  return deny("writeFileSync (content change)")();
};
for (const key of ["open", "openSync"]) {
  const original = fs[key];
  fs[key] = function(file, flags, ...args) {
    if (typeof flags === "number" ? (flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND)) !== 0 : /[wa+]/.test(flags)) return deny(key)();
    return original.call(this, file, flags, ...args);
  };
}
fs.createWriteStream = deny("createWriteStream");
const originalOpen = fs.promises.open;
fs.promises.open = async function(file, flags, ...args) {
  if (flags !== "r" && flags !== fs.constants.O_RDONLY) return deny("promises.open")();
  return originalOpen.call(this, file, flags, ...args);
};

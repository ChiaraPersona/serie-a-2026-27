"use strict";

const { execFileSync } = require("child_process");
const path = require("path");

execFileSync(process.execPath, [path.join(__dirname, "build-schedina.js"), "--matchday", "3"], { stdio: "inherit" });

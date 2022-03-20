const {
  sendNotification,
  sendPermanentNotification,
} = require("notifications");

function readStream(readableStream) {
  return new Promise((resolve, _reject) => {
    const reader = readableStream.getReader();
    let out = "";
    reader.read().then(function processChunk({
      done,
      value,
    }) {
      if (done) {
        resolve(out);
      } else {
        out += arrayBufferToString(value);
        reader.read().then(processChunk);
      }
    });
  });
}

function arrayBufferToString(buffer) {
  const arr = new Uint8Array(buffer);
  const str = String.fromCharCode.apply(String, arr);
  if (/[\u0080-\uffff]/.test(str)) {
    throw new Error("this string seems to contain (still encoded) multibytes");
  }
  return str;
}

function getStorage() {
  try {
    nova.fs.mkdir(nova.extension.globalStoragePath);
  } catch (e) {
    console.error(e);
  }
  return nova.extension.globalStoragePath;
}

function getFileName(path) {
  return path.replace(/^.*[\\\/]/, "");
}

function trace(x) {
  console.log(JSON.stringify(x));
  return x;
}

function traceRaw(x) {
  console.log(x);
  return x;
}

async function call(path, args) {
  const env = await getEnv()
  const process = new Process(path, {...args, ...{env}});
  const promise = new Promise((resolve, reject) => {
    process.onDidExit((exitCode) => {
      console.log(exitCode)
      if (exitCode == 0) {
        readStream(process.stdout).then((x) => {
          resolve(x);
        });
      } else {
        readStream(process.stderr).then((x) => {
          reject(x)
        });
      }
    });
  })
  process.start()
  return promise
}


function parseEnvs(x) {
  const env = {}
  for (line of x.split("\n")) {
    const res = line.match(/(.*?)=(.*)/)
    if (res) {
      env[res[1]] = res[2]
    }
  }

  console.log(JSON.stringify(env))

  return env
}

let envCache = null

async function createEnv() {
  const generator = nova.workspace.config.get("env-generator")
  if (generator) {
    const [prog, ...args] = generator.split(/\s+/)
    sendNotification("Generating environment", "Executing " + generator + ".")
    const process = new Process(prog, {
      shell: true,
      args,
      cwd: nova.workspace.path
    });
    const promise = new Promise((resolve, reject) => {
      process.onDidExit((exitCode) => {
        console.log(exitCode)
        if (exitCode == 0) {
          readStream(process.stdout).then((x) => {
            resolve(x);
          });
        } else {
          readStream(process.stderr).then((x) => {
            reject(x)
          });
        }
      });
    })
    process.start()

    const envStr = await promise
      .catch((err) => sendPermanentNotification("Generating environment failed", err))
    envCache = parseEnvs(envStr)
  }
}

async function getEnv() {
  console.log(JSON.stringify(envCache))
  if (!envCache) {
    await createEnv()
  }
  return envCache
}


function hasCustomEnv() {
  return (nova.workspace.config.get("env-generator") !== null)
}

module.exports = { readStream, getStorage, getFileName, trace, traceRaw, call, createEnv, hasCustomEnv, getEnv };


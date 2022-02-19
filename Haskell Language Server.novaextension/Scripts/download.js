const {
  sendNotification,
  sendPermanentNotification,
} = require("notifications");
const {
  readStream,
  getStorage,
} = require("utils");

exports.getHLS = getHLS;

let assets = null;
async function getHLSAssets() {
  if (!assets) {
    const response = await fetch(
      "https://api.github.com/repos/haskell/haskell-language-server/releases",
    );
    if (!response.ok) {
      console.error(response.statusText);
      return null;
    }
    const respObj = await response.json();
    const pairs = respObj[0].assets.flatMap((asset) => {
      const match = asset.name.match("haskell-language-server-macOS-(.*)\.gz");
      if (match) {
        return [
          [match[1], asset.browser_download_url],
        ];
      } else if (asset.name === "haskell-language-server-wrapper-macOS.gz") {
        return [
          ["wrapper", asset.browser_download_url],
        ];
      } else {
        return [];
      }
    });
    assets = Object.fromEntries(pairs);
  }
  return assets;
}
async function downloadTool(name) {
  notifyToolDownloading(name);
  const storagePath = getStorageForTool(name);
  console.log("Downloading " + storagePath);
  const urls = await getHLSAssets();
  const response = await fetch(urls[name]);
  if (!response.ok) {
    console.error(response.statusText);
    return null;
  }
  const p = new Promise((resolve, _reject) => {
    const gzip = new Process("/usr/bin/gzip", {
      args: ["-d"],
    });
    response.body.pipeTo(gzip.stdin);
    const file = nova.fs.open(storagePath, "x+b");
    const outReader = gzip.stdout.getReader();
    outReader.read().then(function processChunk({
      done,
      value,
    }) {
      if (done) {
        file.close;
        console.log("Downloaded " + storagePath);
        const chmod = new Process("/bin/chmod", {
          args: ["+x", storagePath],
        });
        chmod.onDidExit((exitCode) => {
          console.log(exitCode);
          resolve(storagePath);
        });
        chmod.start();
      } else {
        file.write(value);
        outReader.read().then(processChunk);
      }
    });
    console.log("unzipping");
    gzip.start();
  });
  return await p;
}
async function getTool(name) {
  const path = getStorageForTool(name);
  if (nova.fs.access(path, nova.fs.X_OK)) {
    console.log("Exists: " + path);
    return path;
  } else {
    console.log("Doesn't exists: " + path);
    nova.fs.remove(path);
    return await downloadTool(name);
  }
}
async function getGHCVersion() {
  const wrapper = await getTool("wrapper");
  sendNotification("Woking out the GHC version of the project", "");
  const process = new Process(wrapper, {
    cwd: nova.workspace.path,
    args: ["--project-ghc-version"],
  });
  const promise = new Promise((resolve, _reject) => {
    process.onDidExit((exitCode) => {
      if (exitCode == 0) {
        readStream(process.stdout).then((x) => {
          const version = x.trim();
          sendNotification("Detected GHC " + version, "");
          resolve(version);
        });
      } else {
        readStream(process.stderr).then((x) => {
          const rRes = x.match(/Cradle requires (.+) but couldn't find it/);
          if (rRes) {
            let tool;
            switch (rRes[1]) {
              case "stack":
                tool = "Stack";
                break;
              case "cabal":
                tool = "Cabal";
                break;
              case "ghc":
                tool = "GHC";
                break;
              default:
                tool = rRes[1];
                break;
            }
            sendPermanentNotification(
              tool + " not installed!",
              "Please install " + tool +
                " and restart Haskell Language Server.",
            );
          } else {
            sendPermanentNotification("Couldn't detect GHC version", x);
          }
        });
      }
    });
  });
  process.start();
  return promise;
}
async function getHLS() {
  const version = await getGHCVersion();
  return await getTool(version);
}

function getStorageForTool(name) {
  return getStorage() + "/" + getToolName(name);
}

function getToolName(name) {
  return "haskell-language-server-" + name;
}

function notifyToolDownloading(name) {
  sendNotification("Downloading tool", "Downloading " + getToolName(name));
}

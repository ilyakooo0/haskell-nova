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

module.exports = { readStream, getStorage, getFileName, trace, traceRaw };

const {
  sendNotification,
  sendNotificationWithAction,
} = require("notifications");
const {
  getHLS,
} = require("download");
const {
  getHLSConfig,
} = require("configuration");
const {
  getFileName,
} = require("utils");
exports.activate = function () {
  nova.commands.register("stop", (_workspace) => {
    stopServer();
  });
  nova.commands.register("restart", (_workspace) => {
    startServer();
  });
  nova.commands.register("clear-cache", (_workspace) => {
    nova.fs.rmdir(nova.extension.globalStoragePath);
    startServer();
  });
  nova.commands.register("format", formatFile);
  startServer();
};
exports.deactivate = function () {
  // Clean up state before the extension is deactivated
  if (lspClient) {
    lspClient.stop();
    lspClient = null;
  }
};

function formatFile(editor) {
  // If there is no URI, there's not much we can do ;(
  if (editor.document.uri) {
    const name = getFileName(editor.document.uri);
    let valid = true;
    const removeNotification = sendNotificationWithAction(
      "Formatting " + name,
      "Waiting for Haskell Language Server to format " + name,
      "Cancel",
      () => {
        valid = false;
      },
    );
    editor.onDidChange(() => {
      removeNotification();
      valid = false;
    });
    const req = {
      textDocument: {
        uri: editor.document.uri,
      },
      options: {
        tabSize: editor.tabLength,
        insertSpaces: true,
      },
    };
    lspClient.sendRequest("textDocument/formatting", req).then((edits) => {
      editor.edit((edit) => {
        if (valid) {
          const range = new Range(0, editor.document.length);
          const documentText = editor.document.getTextInRange(range);
          const newText = applyAllLSPEdits(edits, documentText);
          if (valid) {
            edit.replace(range, newText);
          }
        }
        removeNotification();
      });
    });
  }
}

function applyAllLSPEdits(edits, text) {
  let i = 0;
  let line = 0;
  let out = "";

  function goToLine(l) {
    while (line < l) {
      if (text.slice(i, i + 2) === "\r\n") {
        line += 1;
        i += 1;
      } else if (text[i] === "\n" || text[i] === "\r") {
        line += 1;
      }
      i += 1;
    }
  }
  let edit;
  for (edit of edits) {
    const prev = i;
    goToLine(edit.range.start.line);
    i += edit.range.start.character;
    out += text.slice(prev, i);
    goToLine(edit.range.end.line);
    i += edit.range.end.character;
    out += edit.newText;
    console.log(out);
  }
  out += text.slice(i);
  return out;
}
let lspClient = null;
async function startServer() {
  stopServer();
  const path = await getServerPath();
  const serverOptions = {
    path: path,
    args: ["lsp", "--cwd", nova.workspace.path],
  };
  const clientOptions = {
    syntaxes: ["haskell"],
    initializationOptions: getHLSConfig(),
  };
  lspClient = new LanguageClient(
    "haskell-language-server",
    nova.extension.name,
    serverOptions,
    clientOptions,
  );
  sendNotification("Starting Haskell Language Server", "");
  lspClient.start();
}

function stopServer() {
  if (lspClient) {
    sendNotification("Stopping Haskell Language Server", "");
    lspClient.stop();
    lspClient = null;
  }
}
function getServerPath() {
  return getHLS();
}

// function getLogPath() {
//   return getStorage() + "/haskell-language-server.log";
// }

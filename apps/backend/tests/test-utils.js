const path = require("node:path");
const { once } = require("node:events");
const express = require("express");

function resolveBackendPath(relativePath) {
  return require.resolve(path.join(__dirname, "..", relativePath));
}

function resolveModulePath(moduleName) {
  return require.resolve(moduleName, { paths: [path.join(__dirname, "..")] });
}

function setMockedModule(resolvedPath, exportsValue) {
  const previous = require.cache[resolvedPath];
  require.cache[resolvedPath] = {
    id: resolvedPath,
    filename: resolvedPath,
    loaded: true,
    exports: exportsValue,
  };
  return previous;
}

function loadDistModuleWithMocks(entryRelativePath, mocks) {
  const entryResolved = resolveBackendPath(entryRelativePath);
  const previousEntries = new Map();

  for (const [mockRelativePath, mockExports] of Object.entries(mocks)) {
    const resolved = mockRelativePath.startsWith("module:")
      ? resolveModulePath(mockRelativePath.slice("module:".length))
      : resolveBackendPath(mockRelativePath);
    previousEntries.set(resolved, setMockedModule(resolved, mockExports));
  }

  delete require.cache[entryResolved];
  const loaded = require(entryResolved);

  delete require.cache[entryResolved];
  for (const [resolved, previous] of previousEntries.entries()) {
    if (previous) {
      require.cache[resolved] = previous;
    } else {
      delete require.cache[resolved];
    }
  }

  return loaded;
}

function createDoc(id, data, extras = {}) {
  return {
    id,
    ref: extras.ref || { id },
    data: () => data,
  };
}

module.exports = {
  createDoc,
  loadDistModuleWithMocks,
  resolveModulePath,
  resolveBackendPath,
  async requestJson(baseUrl, routePath, options = {}) {
    const response = await fetch(`${baseUrl}${routePath}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    return {
      status: response.status,
      body,
    };
  },
  async withExpressServer(router, run) {
    const app = express();
    app.use(express.json());
    app.use(router);

    const server = app.listen(0);
    await once(server, "listening");
    const address = server.address();
    const baseUrl =
      typeof address === "object" && address
        ? `http://127.0.0.1:${address.port}`
        : "http://127.0.0.1";

    try {
      return await run(baseUrl);
    } finally {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  },
};

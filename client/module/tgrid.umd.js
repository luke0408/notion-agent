(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? factory(exports, require("tstl"), require("import2"))
    : typeof define === "function" && define.amd
      ? define(["exports", "tstl", "import2"], factory)
      : ((global =
          typeof globalThis !== "undefined" ? globalThis : global || self),
        factory((global.TGrid = {}), global.tstl, global.import2));
})(this, function (exports, tstl, import2) {
  "use strict";
  const Driver = class {};
  const serializeError = (error) => {
    if (
      typeof error === "object" &&
      error !== null &&
      typeof error.toJSON === "function"
    )
      return error.toJSON();
    else if (error instanceof Error)
      return {
        ...error,
        name: error.name,
        stack: error.stack,
        message: error.message,
      };
    return error;
  };
  class Communicator {
    constructor(provider) {
      this.provider_ = provider;
      this.driver_ = new Proxy(new Driver(), {
        get: ({}, name) => {
          if (name === "then") return null;
          else return this._Proxy_func(name);
        },
      });
      this.promises_ = new tstl.HashMap();
      this.join_cv_ = new tstl.ConditionVariable();
      this.event_listeners_ = new tstl.HashMap();
    }
    on(type, listener) {
      this.event_listeners_
        .take(type, () => new tstl.HashSet())
        .insert(listener);
    }
    off(type, listener) {
      const it = this.event_listeners_.find(type);
      if (it.equals(this.event_listeners_.end()) === false)
        it.second.erase(listener);
      if (it.second.empty()) this.event_listeners_.erase(it);
    }
    async destructor(error) {
      const rejectError = error
        ? error
        : new Error("Connection has been closed.");
      for (const entry of this.promises_) {
        const reject = entry.second.reject;
        reject(rejectError);
      }
      this.promises_.clear();
      await this.join_cv_.notify_all();
    }
    _Proxy_func(name) {
      const func = (...params) => this._Call_function(name, ...params);
      return new Proxy(func, {
        get: ({}, newName) => {
          if (newName === "bind")
            return (thisArg, ...args) => func.bind(thisArg, ...args);
          else if (newName === "call")
            return (thisArg, ...args) => func.call(thisArg, ...args);
          else if (newName === "apply")
            return (thisArg, args) => func.apply(thisArg, args);
          return this._Proxy_func(`${name}.${newName}`);
        },
      });
    }
    _Call_function(name, ...params) {
      return new Promise(async (resolve, reject) => {
        const error = this.inspectReady("Communicator._Call_fuction");
        if (error) {
          reject(error);
          return;
        }
        const invoke = {
          uid: ++Communicator.SEQUENCE,
          listener: name,
          parameters: params.map((p) => ({
            type: typeof p,
            value: p,
          })),
        };
        const eventSetIterator = this.event_listeners_.find("send");
        if (eventSetIterator.equals(this.event_listeners_.end()) === false) {
          const event = {
            type: "send",
            time: new Date(),
            function: invoke,
          };
          for (const listener of eventSetIterator.second)
            try {
              listener(event);
            } catch {}
        }
        this.promises_.emplace(invoke.uid, {
          function: invoke,
          time: new Date(),
          resolve,
          reject,
        });
        await this.sendData(invoke);
      });
    }
    setProvider(obj) {
      this.provider_ = obj;
    }
    getProvider() {
      return this.provider_;
    }
    getDriver() {
      return this.driver_;
    }
    async join(param) {
      const error = this.inspectReady(`${this.constructor.name}.join`);
      if (error) throw error;
      if (param === undefined) await this.join_cv_.wait();
      else if (param instanceof Date)
        return await this.join_cv_.wait_until(param);
      else return await this.join_cv_.wait_for(param);
    }
    replyData(invoke) {
      if (invoke.listener) this._Handle_function(invoke).catch(() => {});
      else this._Handle_complete(invoke);
    }
    async _Handle_function(invoke) {
      const uid = invoke.uid;
      const time = new Date();
      try {
        if (this.provider_ === undefined)
          throw new Error(
            `Error on Communicator._Handle_function(): the provider is not specified yet.`,
          );
        else if (this.provider_ === null)
          throw new Error(
            "Error on Communicator._Handle_function(): the provider would not be.",
          );
        let func = this.provider_;
        let thisArg = undefined;
        const routes = invoke.listener.split(".");
        for (const name of routes) {
          thisArg = func;
          func = thisArg[name];
          if (name[0] === "_")
            throw new Error(
              `Error on Communicator._Handle_function(): RFC does not allow access to a member starting with the underscore: Provider.${invoke.listener}()`,
            );
          else if (name[name.length - 1] === "_")
            throw new Error(
              `Error on Communicator._Handle_function(): RFC does not allow access to a member ending with the underscore: Provider.${invoke.listener}().`,
            );
          else if (name === "toString" && func === Function.toString)
            throw new Error(
              `Error on Communicator._Handle_function(): RFC on Function.toString() is not allowed: Provider.${invoke.listener}().`,
            );
          else if (name === "constructor" || name === "prototype")
            throw new Error(
              `Error on Communicator._Handle_function(): RFC does not allow access to ${name}: Provider.${invoke.listener}().`,
            );
        }
        func = func.bind(thisArg);
        const eventSetIterator = this.event_listeners_.find("receive");
        if (eventSetIterator.equals(this.event_listeners_.end()) === false) {
          const event = {
            type: "receive",
            time,
            function: invoke,
          };
          for (const closure of eventSetIterator.second)
            try {
              closure(event);
            } catch {}
        }
        const parameters = invoke.parameters.map((p) => p.value);
        const result = await func(...parameters);
        await this._Send_return({
          invoke,
          time,
          return: {
            uid,
            success: true,
            value: result,
          },
        });
      } catch (exp) {
        await this._Send_return({
          invoke,
          time,
          return: {
            uid,
            success: false,
            value: exp,
          },
        });
      }
    }
    _Handle_complete(invoke) {
      const it = this.promises_.find(invoke.uid);
      if (it.equals(this.promises_.end())) return;
      const eventSetIterator = this.event_listeners_.find("complete");
      if (eventSetIterator.equals(this.event_listeners_.end()) === false) {
        const event = {
          type: "complete",
          function: it.second.function,
          return: invoke,
          requested_at: it.second.time,
          completed_at: new Date(),
        };
        for (const closure of eventSetIterator.second)
          try {
            closure(event);
          } catch {}
      }
      const func = invoke.success ? it.second.resolve : it.second.reject;
      this.promises_.erase(it);
      func(invoke.value);
    }
    async _Send_return(props) {
      const eventSet = this.event_listeners_.find("return");
      if (eventSet.equals(this.event_listeners_.end()) === false) {
        const event = {
          type: "return",
          function: props.invoke,
          return: props.return,
          requested_at: props.time,
          completed_at: new Date(),
        };
        for (const closure of eventSet.second)
          try {
            closure(event);
          } catch {}
      }
      if (props.return.success === false && props.return.value instanceof Error)
        props.return.value = serializeError(props.return.value);
      await this.sendData(props.return);
    }
  }
  Communicator.SEQUENCE = 0;
  class AcceptorBase extends Communicator {
    constructor(header) {
      super(undefined);
      this.header_ = header;
      this.state_ = -1;
    }
    get header() {
      return this.header_;
    }
    get state() {
      return this.state_;
    }
    inspectReady(method) {
      if (this.state_ === 1) return null;
      else if (this.state_ === -1)
        return new Error(
          `Error on ${this.constructor.name}.${method}(): not accepted yet.`,
        );
      else if (this.state_ === 0)
        return new Error(
          `Error on ${this.constructor.name}.${method}(): it's on accepting, wait for a second.`,
        );
      else if (this.state_ === -2 || this.state_ === 2)
        return new Error(
          `Error on ${this.constructor.name}.${method}(): the connection is on closing.`,
        );
      else if (this.state_ === 3)
        return new Error(
          `Error on ${this.constructor.name}.${method}(): the connection has been closed.`,
        );
      else
        return new Error(
          `Error on ${this.constructor.name}.${method}(): unknown error, but not connected.`,
        );
    }
  }
  class WebSocketError extends Error {
    constructor(status, message) {
      super(message);
      const proto = new.target.prototype;
      if (Object.setPrototypeOf) Object.setPrototypeOf(this, proto);
      else this.__proto__ = proto;
      this.status = status;
    }
  }
  class WebSocketAcceptor extends AcceptorBase {
    static upgrade(request, socket, handler) {
      socket.once("message", async (data) => {
        if (typeof data !== "string") socket.close();
        else
          try {
            const wrapper = JSON.parse(data);
            const acceptor = new WebSocketAcceptor(
              request,
              socket,
              wrapper.header,
            );
            if (handler !== undefined) await handler(acceptor);
          } catch (exp) {
            socket.close();
          }
      });
    }
    constructor(request, socket, header) {
      super(header);
      this.request_ = request;
      this.socket_ = socket;
    }
    async close(code, reason) {
      const error = this.inspectReady("close");
      if (error) throw error;
      const ret = this.join();
      this.state_ = 2;
      if (code === 1e3) this.socket_.close();
      else this.socket_.close(code, reason);
      await ret;
    }
    async destructor(error) {
      await super.destructor(error);
      this.state_ = 3;
    }
    get ip() {
      return this.request_.connection.remoteAddress;
    }
    get path() {
      return this.request_.url;
    }
    get state() {
      return this.state_;
    }
    async accept(provider) {
      if (this.state_ !== -1)
        throw new Error(
          "Error on WebSocketAcceptor.accept(): you've already accepted (or rejected) the connection.",
        );
      this.state_ = 0;
      this.provider_ = provider;
      this.socket_.on("message", this._Handle_message.bind(this));
      this.socket_.on("close", this._Handle_close.bind(this));
      this.socket_.send((1).toString());
      this.state_ = 1;
    }
    async reject(status, reason) {
      if (this.state_ !== -1)
        throw new Error(
          "Error on WebSocketAcceptor.reject(): you've already accepted (or rejected) the connection.",
        );
      this.state_ = -2;
      this.socket_.close(status, reason);
      await this.destructor();
    }
    ping(ms) {
      const error = this.inspectReady("close");
      if (error) throw error;
      (async () => {
        while (this.state_ === 1) {
          await tstl.sleep_for(ms);
          try {
            this.socket_.ping();
          } catch {}
        }
      })().catch(() => {});
    }
    async sendData(invoke) {
      this.socket_.send(JSON.stringify(invoke));
    }
    _Handle_message(data) {
      if (typeof data === "string") {
        const invoke = JSON.parse(data);
        this.replyData(invoke);
      }
    }
    async _Handle_close(code, reason) {
      const error = code !== 100 ? new WebSocketError(code, reason) : undefined;
      await this.destructor(error);
    }
  }
  (function (WebSocketAcceptor) {})(
    WebSocketAcceptor || (WebSocketAcceptor = {}),
  );
  class ConnectorBase extends Communicator {
    constructor(header, provider) {
      super(provider);
      this.header_ = header;
      this.state_ = -1;
    }
    get header() {
      return this.header_;
    }
    get state() {
      return this.state_;
    }
    inspectReady(method) {
      if (this.state_ === 1) return null;
      else if (this.state_ === -1)
        return new Error(
          `Error on ${this.constructor.name}.${method}(): connect first.`,
        );
      else if (this.state_ === 0)
        return new Error(
          `Error on ${this.constructor.name}.${method}(): it's on connecting, wait for a second.`,
        );
      else if (this.state_ === 2)
        return new Error(
          `Error on ${this.constructor.name}.${method}(): the connection is on closing.`,
        );
      else if (this.state_ === 3)
        return new Error(
          `Error on ${this.constructor.name}.${method}(): the connection has been closed.`,
        );
      else
        return new Error(
          `Error on ${this.constructor.name}.${method}(): unknown error, but not connected.`,
        );
    }
  }
  var IHeaderWrapper;
  (function (IHeaderWrapper) {
    function wrap(header) {
      return {
        header,
      };
    }
    IHeaderWrapper.wrap = wrap;
  })(IHeaderWrapper || (IHeaderWrapper = {}));
  function once(handler) {
    let called = false;
    let ret = undefined;
    return (...args) => {
      if (called === false) {
        ret = handler(...args);
        called = true;
      }
      return ret;
    };
  }
  var NodeModule;
  (function (NodeModule) {
    NodeModule.cp = new tstl.Singleton(() => import2("child_process"));
    NodeModule.fs = new tstl.Singleton(() => import2("fs"));
    NodeModule.http = new tstl.Singleton(() => import2("http"));
    NodeModule.https = new tstl.Singleton(() => import2("https"));
    NodeModule.os = new tstl.Singleton(() => import2("os"));
    NodeModule.thread = new tstl.Singleton(() => import2("worker_threads"));
    NodeModule.ws = new tstl.Singleton(() => import("ws"));
    NodeModule.process = () => {
      if (__global === undefined) throw new Error("Not a node environment");
      return __global.process;
    };
  })(NodeModule || (NodeModule = {}));
  const __global = tstl.is_node() ? global : undefined;
  async function WebSocketPolyfill() {
    const modulo = await NodeModule.ws.get();
    return modulo.default;
  }
  class WebSocketConnector extends ConnectorBase {
    async connect(url, options = {}) {
      if (this.socket_ && this.state !== 3)
        if (this.socket_.readyState === 0)
          throw new Error(
            "Error on WebSocketConnector.connect(): already connecting.",
          );
        else if (this.socket_.readyState === 1)
          throw new Error(
            "Error on WebSocketConnector.connect(): already connected.",
          );
        else
          throw new Error(
            "Error on WebSocketConnector.connect(): already closing.",
          );
      this.state_ = 0;
      try {
        const factory = tstl.is_node()
          ? await WebSocketPolyfill()
          : self.WebSocket;
        this.socket_ = new factory(url);
        await this._Wait_connection();
        this.socket_.send(JSON.stringify(IHeaderWrapper.wrap(this.header)));
        if ((await this._Handshake(options.timeout)) !== (1).toString())
          throw new WebSocketError(
            1008,
            "Error on WebSocketConnector.connect(): target server may not be opened by TGrid. It's not following the TGrid's own handshake rule.",
          );
        this.state_ = 1;
        {
          this.socket_.onmessage = this._Handle_message.bind(this);
          this.socket_.onclose = this._Handle_close.bind(this);
          this.socket_.onerror = () => {};
        }
      } catch (exp) {
        this.state_ = -1;
        if (this.socket_ && this.socket_.readyState === 1) {
          this.socket_.onclose = () => {};
          this.socket_.close();
        }
        throw exp;
      }
    }
    _Wait_connection() {
      return new Promise((resolve, reject) => {
        this.socket_.onopen = () => resolve(this.socket_);
        this.socket_.onclose = once((evt) => {
          reject(new WebSocketError(evt.code, evt.reason));
        });
        this.socket_.onerror = once((evt) => {
          reject(
            new WebSocketError(
              1006,
              `Error on WebSocketConnector.connect(): ${evt?.message ?? "connection refused."}`,
            ),
          );
        });
      });
    }
    async close(code, reason) {
      const error = this.inspectReady("close");
      if (error) throw error;
      const ret = this.join();
      this.state_ = 2;
      this.socket_.close(code, reason);
      await ret;
    }
    _Handshake(timeout) {
      return new Promise((resolve, reject) => {
        let completed = false;
        let expired = false;
        if (timeout !== undefined)
          tstl.sleep_for(timeout).then(() => {
            if (completed === false) {
              reject(
                new WebSocketError(
                  1008,
                  `Error on WebSocketConnector.connect(): target server is not sending handshake data over ${timeout} milliseconds.`,
                ),
              );
              expired = true;
            }
          });
        this.socket_.onmessage = once((evt) => {
          if (expired === false) {
            completed = true;
            resolve(evt.data);
          }
        });
        this.socket_.onclose = once((evt) => {
          if (expired === false) {
            completed = true;
            reject(new WebSocketError(evt.code, evt.reason));
          }
        });
        this.socket_.onerror = once(() => {
          if (expired === false) {
            completed = true;
            reject(
              new WebSocketError(
                1006,
                "Error on WebSocketConnector.connect(): connection refused.",
              ),
            );
          }
        });
      });
    }
    get url() {
      return this.socket_ ? this.socket_.url : undefined;
    }
    get state() {
      return this.state_;
    }
    async sendData(invoke) {
      this.socket_.send(JSON.stringify(invoke));
    }
    _Handle_message(evt) {
      if (typeof evt.data === "string") {
        const invoke = JSON.parse(evt.data);
        this.replyData(invoke);
      }
    }
    async _Handle_close(event) {
      const error =
        !event.code || event.code !== 1e3
          ? new WebSocketError(event.code, event.reason)
          : undefined;
      this.state_ = 3;
      await this.destructor(error);
    }
  }
  (function (WebSocketConnector) {})(
    WebSocketConnector || (WebSocketConnector = {}),
  );
  class WebSocketServer {
    constructor(key, cert) {
      if (tstl.is_node() === false)
        throw new Error(
          "Error on WebSocketServer.constructor(): only available in NodeJS.",
        );
      this.options_ =
        !!key && !!cert
          ? {
              key,
              cert,
            }
          : null;
      this.state_ = -1;
      this.server_ = null;
      this.protocol_ = null;
    }
    async open(port, handler) {
      if (this.state_ === 1)
        throw new Error(
          "Error on WebSocketServer.open(): it has already been opened.",
        );
      else if (this.state_ === 0)
        throw new Error(
          "Error on WebSocketServer.open(): it's on opening, wait for a second.",
        );
      else if (this.state_ === 2)
        throw new Error("Error on WebSocketServer.open(): it's on closing.");
      else if (this.server_ === null || this.state_ === 3)
        this.server_ =
          this.options_ !== null
            ? (await NodeModule.https.get()).createServer(this.options_)
            : (await NodeModule.http.get()).createServer();
      this.protocol_ = new (await NodeModule.ws.get()).default.Server({
        noServer: true,
      });
      this.state_ = 0;
      this.server_.on("upgrade", (request, netSocket, header) => {
        this.protocol_.handleUpgrade(request, netSocket, header, (socket) =>
          WebSocketAcceptor.upgrade(request, socket, handler),
        );
      });
      await WebSocketServer._Open(
        this.server_,
        port,
        (state) => (this.state_ = state),
      );
    }
    async close() {
      if (this.state_ !== 1)
        throw new Error(
          "Error on WebSocketServer.close(): server is not opened.",
        );
      this.state_ = 2;
      await this._Close();
      this.state_ = 3;
    }
    static _Open(server, port, setState) {
      return new Promise((resolve, reject) => {
        server.on("listening", () => {
          setState(1);
          server.on("error", () => {});
          resolve();
        });
        server.on("error", (error) => {
          setState(-1);
          reject(error);
        });
        server.listen(port);
      });
    }
    _Close() {
      return new Promise((resolve) => {
        this.protocol_.close(() => {
          this.server_.close(() => {
            resolve();
          });
        });
      });
    }
    get state() {
      return this.state_;
    }
  }
  (function (WebSocketServer) {})(WebSocketServer || (WebSocketServer = {}));
  class ProcessChannel {
    static postMessage(message) {
      NodeModule.process().send(message);
    }
    static close() {
      NodeModule.process().exit();
    }
    static set onmessage(listener) {
      NodeModule.process().on("message", (msg) => {
        listener({
          data: msg,
        });
      });
    }
    static is_worker_server() {
      return !!NodeModule.process().send;
    }
  }
  async function ThreadPort() {
    const { parentPort } = await NodeModule.thread.get();
    if (!parentPort) throw new Error("This is not a worker thread.");
    const process = NodeModule.process();
    class ThreadPort {
      static postMessage(message) {
        parentPort.postMessage(message);
      }
      static close() {
        process.exit(0);
      }
      static set onmessage(listener) {
        parentPort.on("message", (msg) => {
          listener({
            data: msg,
          });
        });
      }
      static get document() {
        return null;
      }
      static is_worker_server() {
        return true;
      }
    }
    return ThreadPort;
  }
  (function (ThreadPort) {
    async function isWorkerThread() {
      const { parentPort } = await NodeModule.thread.get();
      return !!parentPort;
    }
    ThreadPort.isWorkerThread = isWorkerThread;
  })(ThreadPort || (ThreadPort = {}));
  class WorkerServer extends Communicator {
    constructor() {
      super(undefined);
      this.channel_ = new tstl.Singleton(async () => {
        if (tstl.is_node() === false) return self;
        return (await ThreadPort.isWorkerThread())
          ? await ThreadPort()
          : ProcessChannel;
      });
      this.state_ = -1;
      this.header_ = new tstl.Singleton(async () => {
        (await this.channel_.get()).postMessage(0);
        const data = await this._Handshake("getHeader");
        const wrapper = JSON.parse(data);
        return wrapper.header;
      });
    }
    async open(provider) {
      if (tstl.is_node() === false) {
        if (self.document !== undefined)
          throw new Error("Error on WorkerServer.open(): this is not Worker.");
      } else if ((await this.channel_.get()).is_worker_server() === false)
        throw new Error("Error on WorkerServer.open(): this is not Worker.");
      else if (this.state_ !== -1)
        throw new Error(
          "Error on WorkerServer.open(): the server has been opened yet.",
        );
      this.state_ = 0;
      this.provider_ = provider;
      await this.header_.get();
      const channel = await this.channel_.get();
      channel.onmessage = (evt) => this._Handle_message(evt);
      channel.postMessage(1);
      this.state_ = 1;
    }
    async close() {
      const error = this.inspectReady();
      if (error) throw error;
      this.state_ = 2;
      {
        await this.destructor();
        setTimeout(async () => {
          const channel = await this.channel_.get();
          channel.postMessage(2);
          channel.close();
        });
      }
      this.state_ = 3;
    }
    get state() {
      return this.state_;
    }
    getHeader() {
      return this.header_.get();
    }
    _Handshake(method, timeout, until) {
      return new Promise(async (resolve, reject) => {
        let completed = false;
        let expired = false;
        if (until !== undefined)
          tstl
            .sleep_until(until)
            .then(() => {
              if (completed === false) {
                reject(
                  new Error(
                    `Error on WorkerConnector.${method}(): target worker is not sending handshake data over ${timeout} milliseconds.`,
                  ),
                );
                expired = true;
              }
            })
            .catch(() => {});
        (await this.channel_.get()).onmessage = once((evt) => {
          if (expired === false) {
            completed = true;
            resolve(evt.data);
          }
        });
      });
    }
    async sendData(invoke) {
      (await this.channel_.get()).postMessage(JSON.stringify(invoke));
    }
    inspectReady() {
      if (this.state_ === 1) return null;
      else if (this.state_ === -1)
        return new Error(
          "Error on WorkerServer.inspectReady(): server is not opened yet.",
        );
      else if (this.state_ === 0)
        return new Error(
          "Error on WorkerServer.inspectReady(): server is on opening, wait for a sec.",
        );
      else if (this.state_ === 2)
        return new Error(
          "Error on WorkerServer.inspectReady(): server is on closing.",
        );
      else if (this.state_ === 3)
        return new Error(
          "Error on WorkerServer.inspectReady(): the server has been closed.",
        );
      else
        return new Error(
          "Error on WorkerServer.inspectReady(): unknown error, but not connected.",
        );
    }
    _Handle_message(evt) {
      if (evt.data === 2) this.close();
      else this.replyData(JSON.parse(evt.data));
    }
  }
  (function (WorkerServer) {})(WorkerServer || (WorkerServer = {}));
  var FileSystem;
  (function (FileSystem) {
    async function exists(path) {
      const { exists } = await NodeModule.fs.get();
      return new Promise((resolve) => {
        exists(path, resolve);
      });
    }
    FileSystem.exists = exists;
    async function dir(path) {
      const { readdir } = await NodeModule.fs.get();
      return new Promise((resolve, reject) => {
        readdir(path, (err, ret) => {
          if (err) reject(err);
          else resolve(ret);
        });
      });
    }
    FileSystem.dir = dir;
    async function lstat(path) {
      const { lstat } = await NodeModule.fs.get();
      return new Promise((resolve, reject) => {
        lstat(path, (err, stat) => {
          if (err) reject(err);
          else resolve(stat);
        });
      });
    }
    FileSystem.lstat = lstat;
    async function read(path, encoding) {
      const { readFile } = await NodeModule.fs.get();
      return new Promise((resolve, reject) => {
        const callback = (err, ret) => {
          if (err) reject(err);
          else resolve(ret);
        };
        if (encoding === undefined) readFile(path, callback);
        else readFile(path, encoding, callback);
      });
    }
    FileSystem.read = read;
    async function mkdir(path) {
      if ((await exists(path)) === false) await _Mkdir(path);
    }
    FileSystem.mkdir = mkdir;
    async function _Mkdir(path) {
      const { mkdir } = await NodeModule.fs.get();
      return new Promise((resolve, reject) => {
        mkdir(path, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    async function write(path, content) {
      const { writeFile } = await NodeModule.fs.get();
      return new Promise((resolve, reject) => {
        const callback = (err) => {
          if (err) reject(err);
          else resolve();
        };
        if (content instanceof Buffer) writeFile(path, content, callback);
        else writeFile(path, content, "utf8", callback);
      });
    }
    FileSystem.write = write;
    async function unlink(path) {
      const { unlink } = await NodeModule.fs.get();
      return new Promise((resolve, reject) => {
        unlink(path, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    FileSystem.unlink = unlink;
  })(FileSystem || (FileSystem = {}));
  async function ProcessWorker() {
    const { fork } = await NodeModule.cp.get();
    class ProcessWorker {
      constructor(jsFile, options) {
        this.process_ = fork(jsFile, {
          execArgv: options?.execArgv,
          stdio: options?.stdio,
        });
      }
      terminate() {
        this.process_.kill();
      }
      set onmessage(listener) {
        this.process_.on("message", (message) => {
          listener({
            data: message,
          });
        });
      }
      postMessage(message) {
        this.process_.send(message);
      }
    }
    return ProcessWorker;
  }
  async function ThreadWorker() {
    const { Worker } = await NodeModule.thread.get();
    class ThreadWorker {
      constructor(jsFile, arg) {
        this.worker_ = new Worker(jsFile, {
          execArgv: arg?.execArgv,
        });
      }
      terminate() {
        this.worker_.terminate().catch(() => {});
      }
      set onmessage(listener) {
        this.worker_.on("message", (value) => {
          listener({
            data: value,
          });
        });
      }
      postMessage(message) {
        this.worker_.postMessage(message);
      }
    }
    return ThreadWorker;
  }
  const NodeWorkerCompiler = async (type) => ({
    execute: async (jsFile, options) => {
      const factory =
        type === "process" ? await ProcessWorker() : await ThreadWorker();
      return new factory(jsFile, options);
    },
    compile: async (content) => {
      const os = await NodeModule.os.get();
      let path = `${os.tmpdir().split("\\").join("/")}/tgrid`;
      if ((await FileSystem.exists(path)) === false)
        await FileSystem.mkdir(path);
      while (true) {
        const myPath = `${path}/${uuid()}.js`;
        if ((await FileSystem.exists(myPath)) === false) {
          path = myPath;
          break;
        }
      }
      await FileSystem.write(path, content);
      return path;
    },
    remove: async (url) => {
      try {
        await FileSystem.unlink(url);
      } catch {}
    },
  });
  const uuid = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 3) | 8;
      return v.toString(16);
    });
  const WebWorkerCompiler = async () => ({
    compile: async (content) => {
      const blob = new Blob([content], {
        type: "application/javascript",
      });
      return self.URL.createObjectURL(blob);
    },
    remove: async (url) => {
      try {
        self.URL.revokeObjectURL(url);
      } catch {}
    },
    execute: async (jsFile) => new Worker(jsFile),
  });
  class WorkerConnector extends ConnectorBase {
    constructor(header, provider, type) {
      super(header, provider);
      this.compiler_ = new tstl.Singleton(() =>
        tstl.is_node()
          ? NodeWorkerCompiler(type ?? "process")
          : WebWorkerCompiler(),
      );
    }
    async compile(content, options = {}) {
      this._Test_connection("compile");
      const compiler = await this.compiler_.get();
      const path = await compiler.compile(content);
      let error = null;
      try {
        await this._Connect("compile", path, options);
      } catch (exp) {
        error = exp;
      }
      await compiler.remove(path);
      if (error !== null) throw error;
    }
    async connect(jsFile, options = {}) {
      this._Test_connection("connect");
      await this._Connect("connect", jsFile, options);
    }
    _Test_connection(method) {
      if (this.worker_ && this.state !== 3) {
        if (this.state_ === 0)
          throw new Error(
            `Error on WorkerConnector.${method}(): on connecting.`,
          );
        else if (this.state_ === 1)
          throw new Error(
            `Error on WorkerConnector.${method}(): already connected.`,
          );
        else throw new Error(`Error on WorkerConnector.${method}(): closing.`);
      }
    }
    async _Connect(method, jsFile, options) {
      const at =
        options.timeout !== undefined
          ? new Date(Date.now() + options.timeout)
          : undefined;
      this.state_ = 0;
      try {
        const compiler = await this.compiler_.get();
        this.worker_ = await compiler.execute(
          jsFile,
          tstl.is_node() === true ? options : undefined,
        );
        if ((await this._Handshake(method, options.timeout, at)) !== 0)
          throw new Error(
            `Error on WorkerConnector.${method}(): target worker may not be opened by TGrid. It's not following the TGrid's own handshake rule when connecting.`,
          );
        this.worker_.postMessage(
          JSON.stringify(IHeaderWrapper.wrap(this.header)),
        );
        if ((await this._Handshake(method, options.timeout, at)) !== 1)
          throw new Error(
            `Error on WorkerConnector.${method}(): target worker may not be opened by TGrid. It's not following the TGrid's own handshake rule when connected.`,
          );
        this.state_ = 1;
        this.worker_.onmessage = this._Handle_message.bind(this);
      } catch (exp) {
        try {
          if (this.worker_) this.worker_.terminate();
        } catch {}
        this.state_ = -1;
        throw exp;
      }
    }
    _Handshake(method, timeout, until) {
      return new Promise((resolve, reject) => {
        let completed = false;
        let expired = false;
        if (until !== undefined)
          tstl.sleep_until(until).then(() => {
            if (completed === false) {
              reject(
                new Error(
                  `Error on WorkerConnector.${method}(): target worker is not sending handshake data over ${timeout} milliseconds.`,
                ),
              );
              expired = true;
            }
          });
        this.worker_.onmessage = once((evt) => {
          if (expired === false) {
            completed = true;
            resolve(evt.data);
          }
        });
      });
    }
    async close() {
      const error = this.inspectReady("close");
      if (error) throw error;
      const ret = this.join();
      this.state_ = 2;
      this.worker_.postMessage(2);
      await ret;
    }
    async sendData(invoke) {
      this.worker_.postMessage(JSON.stringify(invoke));
    }
    _Handle_message(evt) {
      if (evt.data === 2) this._Handle_close().catch(() => {});
      else this.replyData(JSON.parse(evt.data));
    }
    async _Handle_close() {
      await this.destructor();
      this.state_ = 3;
    }
  }
  (function (WorkerConnector) {})(WorkerConnector || (WorkerConnector = {}));
  class SharedWorkerAcceptor extends AcceptorBase {
    static create(port, header, eraser) {
      return new SharedWorkerAcceptor(port, header, eraser);
    }
    constructor(port, header, eraser) {
      super(header);
      this.port_ = port;
      this.eraser_ = eraser;
    }
    async close() {
      const error = this.inspectReady("close");
      if (error) throw error;
      this.state_ = 2;
      await this._Close();
    }
    async _Close(reason) {
      this.eraser_();
      await this.destructor();
      setTimeout(() => {
        this.port_.postMessage(
          reason === undefined ? 2 : JSON.stringify(reason),
        );
        this.port_.close();
      });
      this.state_ = 3;
    }
    async accept(provider) {
      if (this.state_ !== -1)
        throw new Error(
          "Error on SharedWorkerAcceptor.accept(): you've already accepted (or rejected) the connection.",
        );
      this.state_ = 0;
      {
        this.provider_ = provider;
        this.port_.onmessage = this._Handle_message.bind(this);
        this.port_.start();
        this.port_.postMessage(1);
      }
      this.state_ = 1;
    }
    async reject(reason = "Rejected by server") {
      if (this.state_ !== -1)
        throw new Error(
          "Error on SharedWorkerAcceptor.reject(): you've already accepted (or rejected) the connection.",
        );
      this.state_ = -2;
      await this._Close({
        name: "reject",
        message: reason,
      });
    }
    async sendData(invoke) {
      this.port_.postMessage(JSON.stringify(invoke));
    }
    _Handle_message(evt) {
      if (evt.data === 2) this.close().catch(() => {});
      else this.replyData(JSON.parse(evt.data));
    }
  }
  (function (SharedWorkerAcceptor) {})(
    SharedWorkerAcceptor || (SharedWorkerAcceptor = {}),
  );
  class SharedWorkerServer {
    constructor() {
      this.acceptors_ = new tstl.HashSet();
      this.state_ = -1;
    }
    async open(handler) {
      if (tstl.is_node() === true)
        throw new Error(
          "Error on SharedWorkerServer.open(): SharedWorker is not supported in the NodeJS.",
        );
      else if (self.document !== undefined)
        throw new Error(
          "Error on SharedWorkerServer.open(): this is not the SharedWorker.",
        );
      else if (this.state_ !== -1)
        throw new Error(
          "Error on SharedWorkerServer.open(): the server has been opened yet.",
        );
      this.state_ = 0;
      {
        self.addEventListener("connect", (evt) => {
          for (const port of evt.ports) this._Handle_connect(port, handler);
        });
      }
      this.state_ = 1;
    }
    async close() {
      if (this.state_ !== 1)
        throw new Error(
          "Error on SharedWorkerServer.close(): the server is not opened.",
        );
      for (const acceptor of this.acceptors_) await acceptor.close();
    }
    _Handle_connect(port, handler) {
      port.onmessage = once((evt) => {
        const wrapper = JSON.parse(evt.data);
        let acceptor;
        acceptor = SharedWorkerAcceptor.create(port, wrapper.header, () => {
          this.acceptors_.erase(acceptor);
        });
        this.acceptors_.insert(acceptor);
        handler(acceptor);
      });
      port.postMessage(0);
    }
    get state() {
      return this.state_;
    }
  }
  (function (SharedWorkerServer) {})(
    SharedWorkerServer || (SharedWorkerServer = {}),
  );
  class SharedWorkerConnector extends ConnectorBase {
    async connect(jsFile, options = {}) {
      if (this.port_ && this.state_ !== 3) {
        if (this.state_ === 0)
          throw new Error(
            "Error on SharedWorkerConnector.connect(): on connecting.",
          );
        else if (this.state_ === 1)
          throw new Error(
            "Error on SharedWorkerConnector.connect(): already connected.",
          );
        else
          throw new Error("Error on SharedWorkerConnector.connect(): closing.");
      }
      const at =
        options.timeout !== undefined
          ? new Date(Date.now() + options.timeout)
          : undefined;
      this.state_ = 0;
      try {
        const worker = new SharedWorker(jsFile);
        this.port_ = worker.port;
        if ((await this._Handshake(options.timeout, at)) !== 0)
          throw new Error(
            `Error on SharedWorkerConnector.connect(): target shared-worker may not be opened by TGrid. It's not following the TGrid's own handshake rule when connecting.`,
          );
        this.port_.postMessage(
          JSON.stringify(IHeaderWrapper.wrap(this.header)),
        );
        const last = await this._Handshake(options.timeout, at);
        if (last === 1) {
          this.state_ = 1;
          this.port_.onmessage = this._Handle_message.bind(this);
          this.port_.onmessageerror = () => {};
        } else {
          let reject = null;
          try {
            reject = JSON.parse(last);
          } catch {}
          if (
            reject &&
            reject.name === "reject" &&
            typeof reject.message === "string"
          )
            throw new Error(reject.message);
          else
            throw new Error(
              `Error on SharedWorkerConnector.connect(): target shared-worker may not be opened by TGrid. It's not following the TGrid's own handshake rule.`,
            );
        }
      } catch (exp) {
        try {
          if (this.port_) this.port_.close();
        } catch {}
        this.state_ = -1;
        throw exp;
      }
    }
    _Handshake(timeout, at) {
      return new Promise((resolve, reject) => {
        let completed = false;
        let expired = false;
        if (at !== undefined)
          tstl.sleep_until(at).then(() => {
            if (completed === false) {
              reject(
                new Error(
                  `Error on SharedWorkerConnector.connect(): target shared-worker is not sending handshake data over ${timeout} milliseconds.`,
                ),
              );
              expired = true;
            }
          });
        this.port_.onmessage = once((evt) => {
          if (expired === false) {
            completed = true;
            resolve(evt.data);
          }
        });
      });
    }
    async close() {
      const error = this.inspectReady("close");
      if (error) throw error;
      const ret = this.join();
      this.state_ = 2;
      this.port_.postMessage(2);
      await ret;
    }
    async sendData(invoke) {
      this.port_.postMessage(JSON.stringify(invoke));
    }
    _Handle_message(evt) {
      if (evt.data === 2) this._Handle_close();
      else {
        const data = JSON.parse(evt.data);
        this.replyData(data);
      }
    }
    async _Handle_close() {
      await this.destructor();
      this.state_ = 3;
    }
  }
  (function (SharedWorkerConnector) {
    async function compile(content) {
      const { compile } = await WebWorkerCompiler();
      return compile(content);
    }
    SharedWorkerConnector.compile = compile;
    async function remove(url) {
      const { remove } = await WebWorkerCompiler();
      await remove(url);
    }
    SharedWorkerConnector.remove = remove;
  })(SharedWorkerConnector || (SharedWorkerConnector = {}));
  var tgrid = Object.freeze({
    __proto__: null,
    Communicator,
    Driver,
    get SharedWorkerAcceptor() {
      return SharedWorkerAcceptor;
    },
    get SharedWorkerConnector() {
      return SharedWorkerConnector;
    },
    get SharedWorkerServer() {
      return SharedWorkerServer;
    },
    get WebAcceptor() {
      return WebSocketAcceptor;
    },
    get WebConnector() {
      return WebSocketConnector;
    },
    WebError: WebSocketError,
    get WebServer() {
      return WebSocketServer;
    },
    get WebSocketAcceptor() {
      return WebSocketAcceptor;
    },
    get WebSocketConnector() {
      return WebSocketConnector;
    },
    WebSocketError,
    get WebSocketServer() {
      return WebSocketServer;
    },
    get WorkerConnector() {
      return WorkerConnector;
    },
    get WorkerServer() {
      return WorkerServer;
    },
  });
  exports.Communicator = Communicator;
  exports.Driver = Driver;
  exports.SharedWorkerAcceptor = SharedWorkerAcceptor;
  exports.SharedWorkerConnector = SharedWorkerConnector;
  exports.SharedWorkerServer = SharedWorkerServer;
  exports.WebAcceptor = WebSocketAcceptor;
  exports.WebConnector = WebSocketConnector;
  exports.WebError = WebSocketError;
  exports.WebServer = WebSocketServer;
  exports.WebSocketAcceptor = WebSocketAcceptor;
  exports.WebSocketConnector = WebSocketConnector;
  exports.WebSocketError = WebSocketError;
  exports.WebSocketServer = WebSocketServer;
  exports.WorkerConnector = WorkerConnector;
  exports.WorkerServer = WorkerServer;
  exports.default = tgrid;
  Object.defineProperty(exports, "__esModule", {
    value: true,
  });
});
//# sourceMappingURL=index.umd.js.map

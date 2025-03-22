(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? factory(exports)
    : typeof define === "function" && define.amd
      ? define(["exports"], factory)
      : ((global =
          typeof globalThis !== "undefined" ? globalThis : global || self),
        factory((global.tstl = {})));
})(this, function (exports) {
  "use strict";
  class ForOfAdaptor {
    constructor(first, last) {
      this.it_ = first;
      this.last_ = last;
    }
    next() {
      if (this.it_.equals(this.last_))
        return {
          done: true,
          value: undefined,
        };
      else {
        const it = this.it_;
        this.it_ = this.it_.next();
        return {
          done: false,
          value: it.value,
        };
      }
    }
    [Symbol.iterator]() {
      return this;
    }
  }
  class Container {
    empty() {
      return this.size() === 0;
    }
    rbegin() {
      return this.end().reverse();
    }
    rend() {
      return this.begin().reverse();
    }
    [Symbol.iterator]() {
      return new ForOfAdaptor(this.begin(), this.end());
    }
    toJSON() {
      const ret = [];
      for (const elem of this) ret.push(elem);
      return ret;
    }
  }
  class NativeArrayIterator {
    constructor(data, index) {
      this.data_ = data;
      this.index_ = index;
    }
    index() {
      return this.index_;
    }
    get value() {
      return this.data_[this.index_];
    }
    prev() {
      --this.index_;
      return this;
    }
    next() {
      ++this.index_;
      return this;
    }
    advance(n) {
      this.index_ += n;
      return this;
    }
    equals(obj) {
      return this.data_ === obj.data_ && this.index_ === obj.index_;
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      [this.index_, obj.index_] = [obj.index_, this.index_];
    }
  }
  class SetContainer extends Container {
    constructor(factory) {
      super();
      this.data_ = factory(this);
    }
    assign(first, last) {
      this.clear();
      this.insert(first, last);
    }
    clear() {
      this.data_.clear();
    }
    begin() {
      return this.data_.begin();
    }
    end() {
      return this.data_.end();
    }
    has(key) {
      return !this.find(key).equals(this.end());
    }
    size() {
      return this.data_.size();
    }
    push(...items) {
      if (items.length === 0) return this.size();
      const first = new NativeArrayIterator(items, 0);
      const last = new NativeArrayIterator(items, items.length);
      this._Insert_by_range(first, last);
      return this.size();
    }
    insert(...args) {
      if (args.length === 1) return this._Insert_by_key(args[0]);
      else if (
        args[0].next instanceof Function &&
        args[1].next instanceof Function
      )
        return this._Insert_by_range(args[0], args[1]);
      else return this._Insert_by_hint(args[0], args[1]);
    }
    erase(...args) {
      if (
        args.length === 1 &&
        !(
          args[0] instanceof this.end().constructor && args[0].source() === this
        )
      )
        return this._Erase_by_val(args[0]);
      else if (args.length === 1) return this._Erase_by_range(args[0]);
      else return this._Erase_by_range(args[0], args[1]);
    }
    _Erase_by_range(first, last = first.next()) {
      const it = this.data_.erase(first, last);
      this._Handle_erase(first, last);
      return it;
    }
  }
  class Exception extends Error {
    constructor(message) {
      super(message);
      const proto = new.target.prototype;
      if (Object.setPrototypeOf) Object.setPrototypeOf(this, proto);
      else this.__proto__ = proto;
    }
    get name() {
      return this.constructor.name;
    }
    what() {
      return this.message;
    }
    toJSON() {
      return {
        name: this.name,
        message: this.message,
        stack: this.stack,
      };
    }
  }
  class LogicError extends Exception {
    constructor(message) {
      super(message);
    }
  }
  class InvalidArgument extends LogicError {
    constructor(message) {
      super(message);
    }
  }
  class OutOfRange extends LogicError {
    constructor(message) {
      super(message);
    }
  }
  var ErrorGenerator;
  (function (ErrorGenerator) {
    function get_class_name(instance) {
      if (typeof instance === "string") return instance;
      let ret = instance.constructor.name;
      if (instance.constructor.__MODULE)
        ret = `${instance.constructor.__MODULE}.${ret}`;
      return `std.${ret}`;
    }
    ErrorGenerator.get_class_name = get_class_name;
    function empty(instance, method) {
      return new OutOfRange(
        `Error on ${get_class_name(instance)}.${method}(): it's empty container.`,
      );
    }
    ErrorGenerator.empty = empty;
    function negative_index(instance, method, index) {
      return new OutOfRange(
        `Error on ${get_class_name(instance)}.${method}(): parametric index is negative -> (index = ${index}).`,
      );
    }
    ErrorGenerator.negative_index = negative_index;
    function excessive_index(instance, method, index, size) {
      return new OutOfRange(
        `Error on ${get_class_name(instance)}.${method}(): parametric index is equal or greater than size -> (index = ${index}, size: ${size}).`,
      );
    }
    ErrorGenerator.excessive_index = excessive_index;
    function not_my_iterator(instance, method) {
      return new InvalidArgument(
        `Error on ${get_class_name(instance)}.${method}(): parametric iterator is not this container's own.`,
      );
    }
    ErrorGenerator.not_my_iterator = not_my_iterator;
    function erased_iterator(instance, method) {
      return new InvalidArgument(
        `Error on ${get_class_name(instance)}.${method}(): parametric iterator, it already has been erased.`,
      );
    }
    ErrorGenerator.erased_iterator = erased_iterator;
    function negative_iterator(instance, method, index) {
      return new OutOfRange(
        `Error on ${get_class_name(instance)}.${method}(): parametric iterator is directing negative position -> (index = ${index}).`,
      );
    }
    ErrorGenerator.negative_iterator = negative_iterator;
    function iterator_end_value(instance, method = "end") {
      const className = get_class_name(instance);
      return new OutOfRange(
        `Error on ${className}.Iterator.value: cannot access to the ${className}.${method}().value.`,
      );
    }
    ErrorGenerator.iterator_end_value = iterator_end_value;
    function key_nout_found(instance, method, key) {
      throw new OutOfRange(
        `Error on ${get_class_name(instance)}.${method}(): unable to find the matched key -> ${key}`,
      );
    }
    ErrorGenerator.key_nout_found = key_nout_found;
  })(ErrorGenerator || (ErrorGenerator = {}));
  class UniqueSet extends SetContainer {
    count(key) {
      return this.find(key).equals(this.end()) ? 0 : 1;
    }
    insert(...args) {
      return super.insert(...args);
    }
    _Insert_by_range(first, last) {
      for (; !first.equals(last); first = first.next())
        this._Insert_by_key(first.value);
    }
    extract(param) {
      if (param instanceof this.end().constructor)
        return this._Extract_by_iterator(param);
      else return this._Extract_by_val(param);
    }
    _Extract_by_val(key) {
      const it = this.find(key);
      if (it.equals(this.end()) === true)
        throw ErrorGenerator.key_nout_found(this, "extract", key);
      this._Erase_by_range(it);
      return key;
    }
    _Extract_by_iterator(it) {
      if (it.equals(this.end()) === true || this.has(it.value) === false)
        return this.end();
      this._Erase_by_range(it);
      return it;
    }
    _Erase_by_val(key) {
      const it = this.find(key);
      if (it.equals(this.end()) === true) return 0;
      this._Erase_by_range(it);
      return 1;
    }
    merge(source) {
      for (let it = source.begin(); !it.equals(source.end()); ) {
        if (this.has(it.value) === false) {
          this.insert(it.value);
          it = source.erase(it);
        } else it = it.next();
      }
    }
  }
  class MultiSet extends SetContainer {
    insert(...args) {
      return super.insert(...args);
    }
    _Erase_by_val(key) {
      const first = this.find(key);
      if (first.equals(this.end()) === true) return 0;
      let last = first.next();
      let ret = 1;
      while (!last.equals(this.end()) && this._Key_eq(key, last.value)) {
        last = last.next();
        ++ret;
      }
      this._Erase_by_range(first, last);
      return ret;
    }
    merge(source) {
      this.insert(source.begin(), source.end());
      source.clear();
    }
  }
  class MapContainer extends Container {
    constructor(factory) {
      super();
      this.data_ = factory(this);
    }
    assign(first, last) {
      this.clear();
      this.insert(first, last);
    }
    clear() {
      this.data_.clear();
    }
    begin() {
      return this.data_.begin();
    }
    end() {
      return this.data_.end();
    }
    has(key) {
      return !this.find(key).equals(this.end());
    }
    size() {
      return this.data_.size();
    }
    push(...items) {
      const first = new NativeArrayIterator(items, 0);
      const last = new NativeArrayIterator(items, items.length);
      this.insert(first, last);
      return this.size();
    }
    insert(...args) {
      if (args.length === 1) return this.emplace(args[0].first, args[0].second);
      else if (
        args[0].next instanceof Function &&
        args[1].next instanceof Function
      )
        return this._Insert_by_range(args[0], args[1]);
      else return this.emplace_hint(args[0], args[1].first, args[1].second);
    }
    erase(...args) {
      if (
        args.length === 1 &&
        (args[0] instanceof this.end().constructor === false ||
          args[0].source() !== this)
      )
        return this._Erase_by_key(args[0]);
      else if (args.length === 1) return this._Erase_by_range(args[0]);
      else return this._Erase_by_range(args[0], args[1]);
    }
    _Erase_by_range(first, last = first.next()) {
      const it = this.data_.erase(first, last);
      this._Handle_erase(first, last);
      return it;
    }
  }
  class UniqueMap extends MapContainer {
    count(key) {
      return this.find(key).equals(this.end()) ? 0 : 1;
    }
    get(key) {
      const it = this.find(key);
      if (it.equals(this.end()) === true)
        throw ErrorGenerator.key_nout_found(this, "get", key);
      return it.second;
    }
    take(key, generator) {
      const it = this.find(key);
      return it.equals(this.end())
        ? this.emplace(key, generator()).first.second
        : it.second;
    }
    set(key, val) {
      this.insert_or_assign(key, val);
    }
    insert(...args) {
      return super.insert(...args);
    }
    _Insert_by_range(first, last) {
      for (let it = first; !it.equals(last); it = it.next())
        this.emplace(it.value.first, it.value.second);
    }
    insert_or_assign(...args) {
      if (args.length === 2) {
        return this._Insert_or_assign_with_key_value(args[0], args[1]);
      } else if (args.length === 3) {
        return this._Insert_or_assign_with_hint(args[0], args[1], args[2]);
      }
    }
    _Insert_or_assign_with_key_value(key, value) {
      const ret = this.emplace(key, value);
      if (ret.second === false) ret.first.second = value;
      return ret;
    }
    _Insert_or_assign_with_hint(hint, key, value) {
      const ret = this.emplace_hint(hint, key, value);
      if (ret.second !== value) ret.second = value;
      return ret;
    }
    extract(param) {
      if (param instanceof this.end().constructor)
        return this._Extract_by_iterator(param);
      else return this._Extract_by_key(param);
    }
    _Extract_by_key(key) {
      const it = this.find(key);
      if (it.equals(this.end()) === true)
        throw ErrorGenerator.key_nout_found(this, "extract", key);
      const ret = it.value;
      this._Erase_by_range(it);
      return ret;
    }
    _Extract_by_iterator(it) {
      if (it.equals(this.end()) === true) return this.end();
      this._Erase_by_range(it);
      return it;
    }
    _Erase_by_key(key) {
      const it = this.find(key);
      if (it.equals(this.end()) === true) return 0;
      this._Erase_by_range(it);
      return 1;
    }
    merge(source) {
      for (let it = source.begin(); !it.equals(source.end()); )
        if (this.has(it.first) === false) {
          this.insert(it.value);
          it = source.erase(it);
        } else it = it.next();
    }
  }
  class MultiMap extends MapContainer {
    insert(...args) {
      return super.insert(...args);
    }
    _Erase_by_key(key) {
      const first = this.find(key);
      if (first.equals(this.end()) === true) return 0;
      let last = first.next();
      let ret = 1;
      while (!last.equals(this.end()) && this._Key_eq(key, last.first)) {
        last = last.next();
        ++ret;
      }
      this._Erase_by_range(first, last);
      return ret;
    }
    merge(source) {
      this.insert(source.begin(), source.end());
      source.clear();
    }
  }
  var module$2 = Object.freeze({
    __proto__: null,
    Container,
    MapContainer,
    MultiMap,
    MultiSet,
    SetContainer,
    UniqueMap,
    UniqueSet,
  });
  function is_node() {
    if (is_node_ === null)
      is_node_ = typeof global === "object" && is_node_process(global);
    return is_node_;
  }
  function is_node_process(m) {
    return (
      m !== null &&
      typeof m.process === "object" &&
      m.process !== null &&
      typeof m.process.versions === "object" &&
      m.process.versions !== null &&
      typeof m.process.versions.node !== "undefined"
    );
  }
  let is_node_ = null;
  function _Get_root() {
    if (__s_pRoot === null) {
      __s_pRoot = is_node() ? global : self;
      if (__s_pRoot.__s_iUID === undefined) __s_pRoot.__s_iUID = 0;
    }
    return __s_pRoot;
  }
  let __s_pRoot = null;
  function get_uid(obj) {
    if (obj instanceof Object) {
      if (obj.hasOwnProperty("__get_m_iUID") === false) {
        const uid = ++_Get_root().__s_iUID;
        Object.defineProperty(obj, "__get_m_iUID", {
          value: function () {
            return uid;
          },
        });
      }
      return obj.__get_m_iUID();
    } else if (obj === undefined) return -1;
    else return 0;
  }
  function equal_to(x, y) {
    x = x ? x.valueOf() : x;
    y = y ? y.valueOf() : y;
    if (x instanceof Object && x.equals instanceof Function) return x.equals(y);
    else return x === y;
  }
  function not_equal_to(x, y) {
    return !equal_to(x, y);
  }
  function less(x, y) {
    x = x.valueOf();
    y = y.valueOf();
    if (x instanceof Object)
      if (x.less instanceof Function) return x.less(y);
      else return get_uid(x) < get_uid(y);
    else return x < y;
  }
  function less_equal(x, y) {
    return less(x, y) || equal_to(x, y);
  }
  function greater(x, y) {
    return !less_equal(x, y);
  }
  function greater_equal(x, y) {
    return !less(x, y);
  }
  function empty(source) {
    if (source instanceof Array) return source.length !== 0;
    else return source.empty();
  }
  function size(source) {
    if (source instanceof Array) return source.length;
    else return source.size();
  }
  function distance(first, last) {
    if (first.index instanceof Function)
      return _Distance_via_index(first, last);
    let ret = 0;
    for (; !first.equals(last); first = first.next()) ++ret;
    return ret;
  }
  function _Distance_via_index(first, last) {
    const x = first.index();
    const y = last.index();
    if (first.base instanceof Function) return x - y;
    else return y - x;
  }
  function advance(it, n) {
    if (n === 0) return it;
    else if (it.advance instanceof Function) return it.advance(n);
    let stepper;
    if (n < 0) {
      if (!(it.prev instanceof Function))
        throw new InvalidArgument(
          "Error on std.advance(): parametric iterator is not a bi-directional iterator, thus advancing to negative direction is not possible.",
        );
      stepper = (it) => it.prev();
      n = -n;
    } else stepper = (it) => it.next();
    while (n-- > 0) it = stepper(it);
    return it;
  }
  function prev(it, n = 1) {
    if (n === 1) return it.prev();
    else return advance(it, -n);
  }
  function next(it, n = 1) {
    if (n === 1) return it.next();
    else return advance(it, n);
  }
  function hash(...itemList) {
    let ret = INIT_VALUE;
    for (let item of itemList) {
      item = item ? item.valueOf() : item;
      const type = typeof item;
      if (type === "boolean") ret = _Hash_boolean(item, ret);
      else if (type === "number" || type === "bigint")
        ret = _Hash_number(item, ret);
      else if (type === "string") ret = _Hash_string(item, ret);
      else if (item instanceof Object && item.hashCode instanceof Function) {
        const hashed = item.hashCode();
        if (itemList.length === 1) return hashed;
        else {
          ret = ret ^ hashed;
          ret *= MULTIPLIER;
        }
      } else ret = _Hash_number(get_uid(item), ret);
    }
    return Math.abs(ret);
  }
  function _Hash_boolean(val, ret) {
    ret ^= val ? 1 : 0;
    ret *= MULTIPLIER;
    return ret;
  }
  function _Hash_number(val, ret) {
    return _Hash_string(val.toString(), ret);
  }
  function _Hash_string(str, ret) {
    for (let i = 0; i < str.length; ++i) {
      ret ^= str.charCodeAt(i);
      ret *= MULTIPLIER;
    }
    return Math.abs(ret);
  }
  const INIT_VALUE = 2166136261;
  const MULTIPLIER = 16777619;
  class Pair {
    constructor(first, second) {
      this.first = first;
      this.second = second;
    }
    equals(pair) {
      return (
        equal_to(this.first, pair.first) && equal_to(this.second, pair.second)
      );
    }
    less(pair) {
      if (equal_to(this.first, pair.first) === false)
        return less(this.first, pair.first);
      else return less(this.second, pair.second);
    }
    hashCode() {
      return hash(this.first, this.second);
    }
  }
  function make_pair(first, second) {
    return new Pair(first, second);
  }
  function lower_bound$1(first, last, val, comp = less) {
    let count = distance(first, last);
    while (count > 0) {
      const step = Math.floor(count / 2);
      const it = advance(first, step);
      if (comp(it.value, val)) {
        first = it.next();
        count -= step + 1;
      } else count = step;
    }
    return first;
  }
  function upper_bound$1(first, last, val, comp = less) {
    let count = distance(first, last);
    while (count > 0) {
      const step = Math.floor(count / 2);
      const it = advance(first, step);
      if (!comp(val, it.value)) {
        first = it.next();
        count -= step + 1;
      } else count = step;
    }
    return first;
  }
  function equal_range$1(first, last, val, comp = less) {
    first = lower_bound$1(first, last, val, comp);
    const second = upper_bound$1(first, last, val, comp);
    return new Pair(first, second);
  }
  function binary_search$1(first, last, val, comp = less) {
    first = lower_bound$1(first, last, val, comp);
    return !first.equals(last) && !comp(val, first.value);
  }
  var IAssociativeContainer;
  (function (IAssociativeContainer) {
    function construct(source, ...args) {
      let ramda;
      let tail;
      if (args.length >= 1 && args[0] instanceof Array) {
        ramda = () => {
          const items = args[0];
          source.push(...items);
        };
        tail = args.slice(1);
      } else if (
        args.length >= 2 &&
        args[0].next instanceof Function &&
        args[1].next instanceof Function
      ) {
        ramda = () => {
          const first = args[0];
          const last = args[1];
          source.assign(first, last);
        };
        tail = args.slice(2);
      } else {
        ramda = null;
        tail = args;
      }
      return {
        ramda,
        tail,
      };
    }
    IAssociativeContainer.construct = construct;
  })(IAssociativeContainer || (IAssociativeContainer = {}));
  var ITreeContainer;
  (function (ITreeContainer) {
    function construct(source, Source, treeFactory, ...args) {
      let post_process = null;
      let comp = less;
      if (args.length === 1 && args[0] instanceof Source) {
        const container = args[0];
        comp = container.key_comp();
        post_process = () => {
          const first = container.begin();
          const last = container.end();
          source.assign(first, last);
        };
      } else {
        const tuple = IAssociativeContainer.construct(source, ...args);
        post_process = tuple.ramda;
        if (tuple.tail.length >= 1) comp = tuple.tail[0];
      }
      treeFactory(comp);
      if (post_process !== null) post_process();
    }
    ITreeContainer.construct = construct;
    function emplacable(source, hint, elem) {
      const prev = hint.prev();
      let meet =
        prev.equals(source.end()) || source.value_comp()(prev.value, elem);
      meet =
        meet &&
        (hint.equals(source.end()) || source.value_comp()(elem, hint.value));
      return meet;
    }
    ITreeContainer.emplacable = emplacable;
  })(ITreeContainer || (ITreeContainer = {}));
  class ArrayIteratorBase {
    constructor(array, index) {
      this.array_ = array;
      this.index_ = index;
    }
    _Get_array() {
      return this.array_;
    }
    index() {
      return this.index_;
    }
    get value() {
      return this.array_.at(this.index_);
    }
    set value(val) {
      this.array_.set(this.index_, val);
    }
    prev() {
      return this.advance(-1);
    }
    next() {
      return this.advance(1);
    }
    advance(n) {
      return this.array_.nth(this.index_ + n);
    }
    equals(obj) {
      return equal_to(this.array_, obj.array_) && this.index_ === obj.index_;
    }
  }
  let ReverseIterator$1 = class ReverseIterator {
    constructor(base) {
      this.base_ = base.prev();
    }
    source() {
      return this.base_.source();
    }
    base() {
      return this.base_.next();
    }
    get value() {
      return this.base_.value;
    }
    prev() {
      return this._Create_neighbor(this.base().next());
    }
    next() {
      return this._Create_neighbor(this.base_);
    }
    equals(obj) {
      return this.base_.equals(obj.base_);
    }
  };
  class ArrayReverseIteratorBase extends ReverseIterator$1 {
    advance(n) {
      return this._Create_neighbor(this.base().advance(-n));
    }
    index() {
      return this.base_.index();
    }
    get value() {
      return this.base_.value;
    }
    set value(val) {
      this.base_.value = val;
    }
  }
  class RuntimeError extends Exception {
    constructor(message) {
      super(message);
    }
  }
  class RangeError extends RuntimeError {
    constructor(message) {
      super(message);
    }
  }
  class Repeater {
    constructor(index, value) {
      this.index_ = index;
      this.value_ = value;
    }
    index() {
      return this.index_;
    }
    get value() {
      return this.value_;
    }
    next() {
      ++this.index_;
      return this;
    }
    equals(obj) {
      return this.index_ === obj.index_;
    }
  }
  class ArrayContainer extends Container {
    begin() {
      return this.nth(0);
    }
    end() {
      return this.nth(this.size());
    }
    at(index) {
      return this._At(index);
    }
    set(index, val) {
      if (index < 0)
        throw ErrorGenerator.negative_index(this.source(), "at", index);
      else if (index >= this.size())
        throw ErrorGenerator.excessive_index(
          this.source(),
          "at",
          index,
          this.size(),
        );
      this._Set(index, val);
    }
    front(val) {
      if (arguments.length === 0) return this.at(0);
      else this.set(0, val);
    }
    back(val) {
      const index = this.size() - 1;
      if (arguments.length === 0) return this.at(index);
      else this.set(index, val);
    }
    insert(pos, ...args) {
      if (pos._Get_array() !== this)
        throw ErrorGenerator.not_my_iterator(this.source(), "insert");
      else if (pos.index() < 0)
        throw ErrorGenerator.negative_iterator(
          this.source(),
          "insert",
          pos.index(),
        );
      else if (pos.index() > this.size()) pos = this.end();
      if (args.length === 1)
        return this._Insert_by_repeating_val(pos, 1, args[0]);
      else if (args.length === 2 && typeof args[0] === "number")
        return this._Insert_by_repeating_val(pos, args[0], args[1]);
      else return this._Insert_by_range(pos, args[0], args[1]);
    }
    _Insert_by_repeating_val(position, n, val) {
      const first = new Repeater(0, val);
      const last = new Repeater(n);
      return this._Insert_by_range(position, first, last);
    }
    pop_back() {
      if (this.empty() === true)
        throw ErrorGenerator.empty(this.source(), "pop_back");
      this._Pop_back();
    }
    erase(first, last = first.next()) {
      if (first._Get_array() !== this || last._Get_array() !== this)
        throw ErrorGenerator.not_my_iterator(this.source(), "erase");
      else if (first.index() < 0)
        throw ErrorGenerator.negative_iterator(
          this.source(),
          "erase",
          first.index(),
        );
      else if (first.index() > last.index())
        throw new RangeError(
          `Error on ${ErrorGenerator.get_class_name(this.source())}.erase(): first iterator has greater index than last -> (first = ${first.index()}, last = ${last.index()}).`,
        );
      if (first.index() >= this.size()) return this.end();
      return this._Erase_by_range(first, last);
    }
  }
  class VectorContainer extends ArrayContainer {
    constructor() {
      super();
    }
    assign(first, second) {
      this.clear();
      this.insert(this.end(), first, second);
    }
    clear() {
      this.data_.splice(0, this.data_.length);
    }
    resize(n) {
      this.data_.length = n;
    }
    size() {
      return this.data_.length;
    }
    _At(index) {
      return this.data_[index];
    }
    _Set(index, val) {
      this.data_[index] = val;
    }
    data() {
      return this.data_;
    }
    [Symbol.iterator]() {
      return this.data_[Symbol.iterator]();
    }
    push(...items) {
      return this.data_.push(...items);
    }
    push_back(val) {
      this.data_.push(val);
    }
    _Insert_by_range(position, first, last) {
      if (position.index() >= this.size()) {
        const prev_size = this.size();
        for (; !first.equals(last); first = first.next())
          this.data_.push(first.value);
        return this.nth(prev_size);
      } else {
        const spliced_array = this.data_.splice(position.index());
        for (; !first.equals(last); first = first.next())
          this.data_.push(first.value);
        this.data_.push(...spliced_array);
        return position;
      }
    }
    _Pop_back() {
      this.data_.pop();
    }
    _Erase_by_range(first, last) {
      if (first.index() >= this.size()) return first;
      if (last.index() >= this.size()) {
        this.data_.splice(first.index());
        return this.end();
      } else this.data_.splice(first.index(), last.index() - first.index());
      return first;
    }
    equals(obj) {
      return this.data_ === obj.data_;
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
    }
    toJSON() {
      return this.data_;
    }
  }
  class SetElementVector extends VectorContainer {
    constructor(associative) {
      super();
      this.data_ = [];
      this.associative_ = associative;
    }
    nth(index) {
      return new SetElementVector.Iterator(this, index);
    }
    static _Swap_associative(x, y) {
      [x.associative_, y.associative_] = [y.associative_, x.associative_];
    }
    source() {
      return this.associative_;
    }
  }
  (function (SetElementVector) {
    class Iterator extends ArrayIteratorBase {
      source() {
        return this._Get_array().source();
      }
      reverse() {
        return new ReverseIterator(this);
      }
    }
    SetElementVector.Iterator = Iterator;
    class ReverseIterator extends ArrayReverseIteratorBase {
      _Create_neighbor(base) {
        return new ReverseIterator(base);
      }
    }
    SetElementVector.ReverseIterator = ReverseIterator;
  })(SetElementVector || (SetElementVector = {}));
  class UniqueTreeSet extends UniqueSet {
    find(key) {
      const it = this.lower_bound(key);
      if (!it.equals(this.end()) && this._Key_eq(key, it.value)) return it;
      else return this.end();
    }
    equal_range(key) {
      const it = this.lower_bound(key);
      return new Pair(
        it,
        !it.equals(this.end()) && this._Key_eq(key, it.value) ? it.next() : it,
      );
    }
    value_comp() {
      return this.key_comp();
    }
    _Key_eq(x, y) {
      return !this.key_comp()(x, y) && !this.key_comp()(y, x);
    }
    _Insert_by_key(key) {
      let it = this.lower_bound(key);
      if (!it.equals(this.end()) && this._Key_eq(it.value, key))
        return new Pair(it, false);
      it = this.data_.insert(it, key);
      this._Handle_insert(it, it.next());
      return new Pair(it, true);
    }
    _Insert_by_hint(hint, key) {
      const validate = ITreeContainer.emplacable(this, hint, key);
      if (validate) {
        const it = this.data_.insert(hint, key);
        this._Handle_insert(it, it.next());
        return it;
      } else return this._Insert_by_key(key).first;
    }
  }
  class FlatSet extends UniqueTreeSet {
    constructor(...args) {
      super((thisArg) => new SetElementVector(thisArg));
      ITreeContainer.construct(
        this,
        FlatSet,
        (comp) => {
          this.key_comp_ = comp;
        },
        ...args,
      );
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      SetElementVector._Swap_associative(this.data_, obj.data_);
      [this.key_comp_, obj.key_comp_] = [obj.key_comp_, this.key_comp_];
    }
    nth(index) {
      return this.data_.nth(index);
    }
    key_comp() {
      return this.key_comp_;
    }
    lower_bound(key) {
      return lower_bound$1(this.begin(), this.end(), key, this.value_comp());
    }
    upper_bound(key) {
      return upper_bound$1(this.begin(), this.end(), key, this.value_comp());
    }
    _Handle_insert({}, {}) {}
    _Handle_erase({}, {}) {}
  }
  (function (FlatSet) {
    FlatSet.Iterator = SetElementVector.Iterator;
    FlatSet.ReverseIterator = SetElementVector.ReverseIterator;
    FlatSet.__MODULE = "experimental";
  })(FlatSet || (FlatSet = {}));
  class MultiTreeSet extends MultiSet {
    find(key) {
      const it = this.lower_bound(key);
      if (!it.equals(this.end()) && this._Key_eq(key, it.value)) return it;
      else return this.end();
    }
    count(key) {
      let it = this.find(key);
      let ret = 0;
      for (
        ;
        !it.equals(this.end()) && this._Key_eq(it.value, key);
        it = it.next()
      )
        ++ret;
      return ret;
    }
    equal_range(key) {
      return new Pair(this.lower_bound(key), this.upper_bound(key));
    }
    value_comp() {
      return this.key_comp();
    }
    _Key_eq(x, y) {
      return !this.key_comp()(x, y) && !this.key_comp()(y, x);
    }
    _Insert_by_key(key) {
      let it = this.upper_bound(key);
      it = this.data_.insert(it, key);
      this._Handle_insert(it, it.next());
      return it;
    }
    _Insert_by_hint(hint, key) {
      const validate = ITreeContainer.emplacable(this, hint, key);
      if (validate) {
        const it = this.data_.insert(hint, key);
        this._Handle_insert(it, it.next());
        return it;
      } else return this._Insert_by_key(key);
    }
    _Insert_by_range(first, last) {
      for (let it = first; !it.equals(last); it = it.next())
        this._Insert_by_key(it.value);
    }
  }
  class FlatMultiSet extends MultiTreeSet {
    constructor(...args) {
      super((thisArg) => new SetElementVector(thisArg));
      ITreeContainer.construct(
        this,
        FlatMultiSet,
        (comp) => {
          this.key_comp_ = comp;
        },
        ...args,
      );
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      SetElementVector._Swap_associative(this.data_, obj.data_);
      [this.key_comp_, obj.key_comp_] = [obj.key_comp_, this.key_comp_];
    }
    nth(index) {
      return this.data_.nth(index);
    }
    key_comp() {
      return this.key_comp_;
    }
    lower_bound(key) {
      return lower_bound$1(this.begin(), this.end(), key, this.value_comp());
    }
    upper_bound(key) {
      return upper_bound$1(this.begin(), this.end(), key, this.value_comp());
    }
    _Handle_insert({}, {}) {}
    _Handle_erase({}, {}) {}
  }
  (function (FlatMultiSet) {
    FlatMultiSet.Iterator = SetElementVector.Iterator;
    FlatMultiSet.ReverseIterator = SetElementVector.ReverseIterator;
    FlatMultiSet.__MODULE = "experimental";
  })(FlatMultiSet || (FlatMultiSet = {}));
  class MapElementVector extends VectorContainer {
    constructor(associative) {
      super();
      this.data_ = [];
      this.associative_ = associative;
    }
    nth(index) {
      return new MapElementVector.Iterator(this, index);
    }
    static _Swap_associative(x, y) {
      [x.associative_, y.associative_] = [y.associative_, x.associative_];
    }
    source() {
      return this.associative_;
    }
  }
  (function (MapElementVector) {
    class Iterator extends ArrayIteratorBase {
      source() {
        return this._Get_array().source();
      }
      reverse() {
        return new ReverseIterator(this);
      }
      get first() {
        return this.value.first;
      }
      get second() {
        return this.value.second;
      }
      set second(val) {
        this.value.second = val;
      }
    }
    MapElementVector.Iterator = Iterator;
    class ReverseIterator extends ArrayReverseIteratorBase {
      _Create_neighbor(base) {
        return new ReverseIterator(base);
      }
      get first() {
        return this.value.first;
      }
      get second() {
        return this.value.second;
      }
      set second(val) {
        this.value.second = val;
      }
    }
    MapElementVector.ReverseIterator = ReverseIterator;
  })(MapElementVector || (MapElementVector = {}));
  class Entry {
    constructor(first, second) {
      this.first = first;
      this.second = second;
    }
    equals(obj) {
      return equal_to(this.first, obj.first);
    }
    less(obj) {
      return less(this.first, obj.first);
    }
    hashCode() {
      return hash(this.first);
    }
  }
  class UniqueTreeMap extends UniqueMap {
    find(key) {
      const it = this.lower_bound(key);
      if (!it.equals(this.end()) && this._Key_eq(key, it.first)) return it;
      else return this.end();
    }
    equal_range(key) {
      const it = this.lower_bound(key);
      return new Pair(
        it,
        !it.equals(this.end()) && this._Key_eq(key, it.first) ? it.next() : it,
      );
    }
    value_comp() {
      return (x, y) => this.key_comp()(x.first, y.first);
    }
    _Key_eq(x, y) {
      return !this.key_comp()(x, y) && !this.key_comp()(y, x);
    }
    emplace(key, val) {
      let it = this.lower_bound(key);
      if (!it.equals(this.end()) && this._Key_eq(it.first, key))
        return new Pair(it, false);
      it = this.data_.insert(it, new Entry(key, val));
      this._Handle_insert(it, it.next());
      return new Pair(it, true);
    }
    emplace_hint(hint, key, val) {
      const elem = new Entry(key, val);
      const validate = ITreeContainer.emplacable(this, hint, elem);
      if (validate) {
        const it = this.data_.insert(hint, elem);
        this._Handle_insert(it, it.next());
        return it;
      } else return this.emplace(key, val).first;
    }
  }
  class FlatMap extends UniqueTreeMap {
    constructor(...args) {
      super((thisArg) => new MapElementVector(thisArg));
      ITreeContainer.construct(
        this,
        FlatMap,
        (comp) => {
          this.key_comp_ = comp;
        },
        ...args,
      );
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      MapElementVector._Swap_associative(this.data_, obj.data_);
      [this.key_comp_, obj.key_comp_] = [obj.key_comp_, this.key_comp_];
    }
    nth(index) {
      return this.data_.nth(index);
    }
    key_comp() {
      return this.key_comp_;
    }
    lower_bound(key) {
      return lower_bound$1(
        this.begin(),
        this.end(),
        this._Capsule_key(key),
        this.value_comp(),
      );
    }
    upper_bound(key) {
      return upper_bound$1(
        this.begin(),
        this.end(),
        this._Capsule_key(key),
        this.value_comp(),
      );
    }
    _Capsule_key(key) {
      return {
        first: key,
      };
    }
    _Handle_insert({}, {}) {}
    _Handle_erase({}, {}) {}
  }
  (function (FlatMap) {
    FlatMap.Iterator = MapElementVector.Iterator;
    FlatMap.ReverseIterator = MapElementVector.ReverseIterator;
    FlatMap.__MODULE = "experimental";
  })(FlatMap || (FlatMap = {}));
  class MultiTreeMap extends MultiMap {
    find(key) {
      const it = this.lower_bound(key);
      if (!it.equals(this.end()) && this._Key_eq(key, it.first)) return it;
      else return this.end();
    }
    count(key) {
      let it = this.find(key);
      let ret = 0;
      for (
        ;
        !it.equals(this.end()) && this._Key_eq(it.first, key);
        it = it.next()
      )
        ++ret;
      return ret;
    }
    equal_range(key) {
      return new Pair(this.lower_bound(key), this.upper_bound(key));
    }
    value_comp() {
      return (x, y) => this.key_comp()(x.first, y.first);
    }
    _Key_eq(x, y) {
      return !this.key_comp()(x, y) && !this.key_comp()(y, x);
    }
    emplace(key, val) {
      let it = this.upper_bound(key);
      it = this.data_.insert(it, new Entry(key, val));
      this._Handle_insert(it, it.next());
      return it;
    }
    emplace_hint(hint, key, val) {
      const elem = new Entry(key, val);
      const validate = ITreeContainer.emplacable(this, hint, elem);
      if (validate) {
        const it = this.data_.insert(hint, elem);
        this._Handle_insert(it, it.next());
        return it;
      } else return this.emplace(key, val);
    }
    _Insert_by_range(first, last) {
      for (let it = first; !it.equals(last); it = it.next())
        this.emplace(it.value.first, it.value.second);
    }
  }
  class FlatMultiMap extends MultiTreeMap {
    constructor(...args) {
      super((thisArg) => new MapElementVector(thisArg));
      ITreeContainer.construct(
        this,
        FlatMultiMap,
        (comp) => {
          this.key_comp_ = comp;
        },
        ...args,
      );
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      MapElementVector._Swap_associative(this.data_, obj.data_);
      [this.key_comp_, obj.key_comp_] = [obj.key_comp_, this.key_comp_];
    }
    nth(index) {
      return this.data_.nth(index);
    }
    key_comp() {
      return this.key_comp_;
    }
    lower_bound(key) {
      return lower_bound$1(
        this.begin(),
        this.end(),
        this._Capsule_key(key),
        this.value_comp(),
      );
    }
    upper_bound(key) {
      return upper_bound$1(
        this.begin(),
        this.end(),
        this._Capsule_key(key),
        this.value_comp(),
      );
    }
    _Capsule_key(key) {
      return {
        first: key,
      };
    }
    _Handle_insert({}, {}) {}
    _Handle_erase({}, {}) {}
  }
  (function (FlatMultiMap) {
    FlatMultiMap.Iterator = MapElementVector.Iterator;
    FlatMultiMap.ReverseIterator = MapElementVector.ReverseIterator;
    FlatMultiMap.__MODULE = "experimental";
  })(FlatMultiMap || (FlatMultiMap = {}));
  var module$1 = Object.freeze({
    __proto__: null,
    get FlatMap() {
      return FlatMap;
    },
    get FlatMultiMap() {
      return FlatMultiMap;
    },
    get FlatMultiSet() {
      return FlatMultiSet;
    },
    get FlatSet() {
      return FlatSet;
    },
  });
  class ArrayReverseIterator extends ArrayReverseIteratorBase {
    _Create_neighbor(base) {
      return new ArrayReverseIterator(base);
    }
  }
  class ArrayIterator extends ArrayIteratorBase {
    reverse() {
      return new ArrayReverseIterator(this);
    }
    source() {
      return this._Get_array();
    }
  }
  class Vector extends VectorContainer {
    constructor(...args) {
      super();
      if (args.length === 0) {
        this.data_ = [];
      } else if (args[0] instanceof Array) {
        const array = args[0];
        this.data_ = args[1] === true ? array : array.slice();
      } else if (args.length === 1 && args[0] instanceof Vector) {
        const v = args[0];
        this.data_ = v.data_.slice();
      } else if (args.length === 2) {
        this.data_ = [];
        this.assign(args[0], args[1]);
      }
    }
    static wrap(data) {
      return new Vector(data, true);
    }
    nth(index) {
      return new Vector.Iterator(this, index);
    }
    source() {
      return this;
    }
  }
  (function (Vector) {
    Vector.Iterator = ArrayIterator;
    Vector.ReverseIterator = ArrayReverseIterator;
  })(Vector || (Vector = {}));
  class InsertIteratorBase {
    next() {
      return this;
    }
  }
  class BackInsertIterator extends InsertIteratorBase {
    constructor(source) {
      super();
      this.source_ = source;
    }
    set value(val) {
      this.source_.push_back(val);
    }
    equals(obj) {
      return equal_to(this.source_, obj.source_);
    }
  }
  class FrontInsertIterator extends InsertIteratorBase {
    constructor(source) {
      super();
      this.source_ = source;
    }
    set value(val) {
      this.source_.push_front(val);
    }
    equals(obj) {
      return equal_to(this.source_, obj.source_);
    }
  }
  class InsertIterator extends InsertIteratorBase {
    constructor(container, it) {
      super();
      this.container_ = container;
      this.it_ = it;
    }
    set value(val) {
      this.it_ = this.container_.insert(this.it_, val);
      this.it_ = this.it_.next();
    }
    equals(obj) {
      return equal_to(this.it_, obj.it_);
    }
  }
  function begin(container) {
    if (container instanceof Array) container = Vector.wrap(container);
    return container.begin();
  }
  function end(container) {
    if (container instanceof Array) container = Vector.wrap(container);
    return container.end();
  }
  function rbegin(container) {
    if (container instanceof Array) container = Vector.wrap(container);
    return container.rbegin();
  }
  function rend(container) {
    if (container instanceof Array) container = Vector.wrap(container);
    return container.rend();
  }
  function make_reverse_iterator(it) {
    return it.reverse();
  }
  function inserter(container, it) {
    return new InsertIterator(container, it);
  }
  function front_inserter(source) {
    return new FrontInsertIterator(source);
  }
  function back_inserter(source) {
    if (source instanceof Array) source = Vector.wrap(source);
    return new BackInsertIterator(source);
  }
  function lower_bound(range, val, comp = less) {
    return lower_bound$1(begin(range), end(range), val, comp);
  }
  function upper_bound(range, val, comp = less) {
    return upper_bound$1(begin(range), end(range), val, comp);
  }
  function equal_range(range, val, comp = less) {
    return equal_range$1(begin(range), end(range), val, comp);
  }
  function binary_search(range, val, comp = less) {
    return binary_search$1(begin(range), end(range), val, comp);
  }
  function make_heap$1(first, last, comp = less) {
    const heapSize = distance(first, last);
    if (heapSize < 2) return;
    let parentPosition = ((heapSize - 2) >> 1) + 1;
    do {
      const temp = first.advance(--parentPosition).value;
      _Adjust_heap(first, parentPosition, heapSize, parentPosition, temp, comp);
    } while (parentPosition !== 0);
  }
  function push_heap$1(first, last, comp = less) {
    const temp = last.prev().value;
    _Promote_heap(first, 0, distance(first, last) - 1, temp, comp);
  }
  function pop_heap$1(first, last, comp = less) {
    const bottom = last.prev();
    const temp = bottom.value;
    bottom.value = first.value;
    _Adjust_heap(first, 0, distance(first, last) - 1, 0, temp, comp);
  }
  function is_heap$1(first, last, comp = less) {
    const it = is_heap_until$1(first, last, comp);
    return it.equals(last);
  }
  function is_heap_until$1(first, last, comp = less) {
    let counter = 0;
    for (
      let child = first.next();
      _Comp_it(child, last.index());
      child = child.next(), counter ^= 1
    ) {
      if (comp(first.value, child.value)) return child;
      first = advance(first, counter);
    }
    return last;
  }
  function sort_heap$1(first, last, comp = less) {
    for (; distance(first, last) > 1; last = last.prev())
      pop_heap$1(first, last, comp);
  }
  function _Promote_heap(first, topPosition, position, value, comp) {
    for (
      let parentPosition = (position - 1) >> 1;
      position > topPosition &&
      comp(first.advance(parentPosition).value, value);
      parentPosition = (position - 1) >> 1
    ) {
      first.advance(position).value = first.advance(parentPosition).value;
      position = parentPosition;
    }
    first.advance(position).value = value;
  }
  function _Adjust_heap(first, topPosition, heapSize, position, value, comp) {
    let childPosition = 2 * position + 2;
    for (; childPosition < heapSize; childPosition = 2 * childPosition + 2) {
      if (
        comp(
          first.advance(childPosition).value,
          first.advance(childPosition - 1).value,
        )
      )
        --childPosition;
      first.advance(position).value = first.advance(childPosition).value;
      position = childPosition;
    }
    if (childPosition === heapSize) {
      first.advance(position).value = first.advance(childPosition - 1).value;
      position = childPosition - 1;
    }
    _Promote_heap(first, topPosition, position, value, comp);
  }
  function _Comp_it(x, y) {
    if (x.base instanceof Function) return y < x;
    else return x < y;
  }
  function make_heap(range, comp = less) {
    return make_heap$1(begin(range), end(range), comp);
  }
  function push_heap(range, comp = less) {
    return push_heap$1(begin(range), end(range), comp);
  }
  function pop_heap(range, comp = less) {
    return pop_heap$1(begin(range), end(range), comp);
  }
  function is_heap(range, comp = less) {
    return is_heap$1(begin(range), end(range), comp);
  }
  function is_heap_until(range, comp = less) {
    return is_heap_until$1(begin(range), end(range), comp);
  }
  function sort_heap(range, comp = less) {
    return sort_heap$1(begin(range), end(range), comp);
  }
  function for_each$1(first, last, fn) {
    for (let it = first; !it.equals(last); it = it.next()) fn(it.value);
    return fn;
  }
  function for_each_n$1(first, n, fn) {
    for (let i = 0; i < n; ++i) {
      fn(first.value);
      first = first.next();
    }
    return first;
  }
  function all_of$1(first, last, pred) {
    for (let it = first; !it.equals(last); it = it.next())
      if (pred(it.value) === false) return false;
    return true;
  }
  function any_of$1(first, last, pred) {
    for (let it = first; !it.equals(last); it = it.next())
      if (pred(it.value) === true) return true;
    return false;
  }
  function none_of$1(first, last, pred) {
    return !any_of$1(first, last, pred);
  }
  function equal$1(first1, last1, first2, pred = equal_to) {
    while (!first1.equals(last1))
      if (!pred(first1.value, first2.value)) return false;
      else {
        first1 = first1.next();
        first2 = first2.next();
      }
    return true;
  }
  function lexicographical_compare$1(
    first1,
    last1,
    first2,
    last2,
    comp = less,
  ) {
    while (!first1.equals(last1))
      if (first2.equals(last2) || comp(first2.value, first1.value))
        return false;
      else if (comp(first1.value, first2.value)) return true;
      else {
        first1 = first1.next();
        first2 = first2.next();
      }
    return !first2.equals(last2);
  }
  function find$1(first, last, val) {
    return find_if$1(first, last, (elem) => equal_to(elem, val));
  }
  function find_if$1(first, last, pred) {
    for (let it = first; !it.equals(last); it = it.next())
      if (pred(it.value)) return it;
    return last;
  }
  function find_if_not$1(first, last, pred) {
    return find_if$1(first, last, (elem) => !pred(elem));
  }
  function find_end$1(first1, last1, first2, last2, pred = equal_to) {
    if (first2.equals(last2)) return last1;
    let ret = last1;
    for (; !first1.equals(last1); first1 = first1.next()) {
      let it1 = first1;
      let it2 = first2;
      while (pred(it1.value, it2.value)) {
        it1 = it1.next();
        it2 = it2.next();
        if (it2.equals(last2)) {
          ret = first1;
          break;
        } else if (it1.equals(last1)) return ret;
      }
    }
    return ret;
  }
  function find_first_of$1(first1, last1, first2, last2, pred = equal_to) {
    for (; !first1.equals(last1); first1 = first1.next())
      for (let it = first2; !it.equals(last2); it = it.next())
        if (pred(first1.value, it.value)) return first1;
    return last1;
  }
  function adjacent_find$1(first, last, pred = equal_to) {
    if (!first.equals(last)) {
      let next = first.next();
      while (!next.equals(last)) {
        if (pred(first.value, next.value)) return first;
        first = first.next();
        next = next.next();
      }
    }
    return last;
  }
  function search$1(first1, last1, first2, last2, pred = equal_to) {
    if (first2.equals(last2)) return first1;
    for (; !first1.equals(last1); first1 = first1.next()) {
      let it1 = first1;
      let it2 = first2;
      while (pred(it1.value, it2.value)) {
        if (it2.equals(last2)) return first1;
        else if (it1.equals(last1)) return last1;
        it1 = it1.next();
        it2 = it2.next();
      }
    }
    return last1;
  }
  function search_n$1(first, last, count, val, pred = equal_to) {
    const limit = advance(first, distance(first, last) - count);
    for (; !first.equals(limit); first = first.next()) {
      let it = first;
      let i = 0;
      while (pred(it.value, val)) {
        it = it.next();
        if (++i === count) return first;
      }
    }
    return last;
  }
  function mismatch$1(first1, last1, first2, pred = equal_to) {
    while (!first1.equals(last1) && pred(first1.value, first2.value)) {
      first1 = first1.next();
      first2 = first2.next();
    }
    return new Pair(first1, first2);
  }
  function count$1(first, last, val) {
    return count_if$1(first, last, (elem) => equal_to(elem, val));
  }
  function count_if$1(first, last, pred) {
    let ret = 0;
    for (let it = first; !it.equals(last); it = it.next())
      if (pred(it.value)) ++ret;
    return ret;
  }
  function for_each(range, fn) {
    return for_each$1(begin(range), end(range), fn);
  }
  function for_each_n(range, n, fn) {
    return for_each_n$1(begin(range), n, fn);
  }
  function all_of(range, pred) {
    return all_of$1(begin(range), end(range), pred);
  }
  function any_of(range, pred) {
    return any_of$1(begin(range), end(range), pred);
  }
  function none_of(range, pred) {
    return none_of$1(begin(range), end(range), pred);
  }
  function equal(range1, range2, pred = equal_to) {
    if (size(range1) !== size(range2)) return false;
    else return equal$1(begin(range1), end(range1), begin(range2), pred);
  }
  function lexicographical_compare(range1, range2, comp = less) {
    return lexicographical_compare$1(
      begin(range1),
      end(range1),
      begin(range2),
      end(range2),
      comp,
    );
  }
  function find(range, val) {
    return find$1(begin(range), end(range), val);
  }
  function find_if(range, pred) {
    return find_if$1(begin(range), end(range), pred);
  }
  function find_if_not(range, pred) {
    return find_if_not$1(begin(range), end(range), pred);
  }
  function find_end(range1, range2, pred = equal_to) {
    return find_end$1(
      begin(range1),
      end(range1),
      begin(range2),
      end(range2),
      pred,
    );
  }
  function find_first_of(range1, range2, pred = equal_to) {
    return find_first_of$1(
      begin(range1),
      end(range1),
      begin(range2),
      end(range2),
      pred,
    );
  }
  function adjacent_find(range, pred = equal_to) {
    return adjacent_find$1(begin(range), end(range), pred);
  }
  function search(range1, range2, pred = equal_to) {
    return search$1(
      begin(range1),
      end(range1),
      begin(range2),
      end(range2),
      pred,
    );
  }
  function search_n(range, count, val, pred = equal_to) {
    return search_n$1(begin(range), end(range), count, val, pred);
  }
  function mismatch(range1, range2, pred = equal_to) {
    if (size(range1) === size(range2))
      return mismatch$1(begin(range1), end(range1), begin(range2), pred);
    const limit = Math.min(size(range1), size(range2));
    let x = begin(range1);
    let y = begin(range2);
    for (let i = 0; i < limit; ++i) {
      if (pred(x.value, y.value) === false) break;
      x = x.next();
      y = y.next();
    }
    return new Pair(x, y);
  }
  function count(range, val) {
    return count$1(begin(range), end(range), val);
  }
  function count_if(range, pred) {
    return count_if$1(begin(range), end(range), pred);
  }
  function sort$1(first, last, comp = less) {
    const length = last.index() - first.index();
    if (length <= 0) return;
    const pivot_it = first.advance(Math.floor(length / 2));
    const pivot = pivot_it.value;
    if (pivot_it.index() !== first.index()) iter_swap(first, pivot_it);
    let i = 1;
    for (let j = 1; j < length; ++j) {
      const j_it = first.advance(j);
      if (comp(j_it.value, pivot)) {
        iter_swap(j_it, first.advance(i));
        ++i;
      }
    }
    iter_swap(first, first.advance(i - 1));
    sort$1(first, first.advance(i - 1), comp);
    sort$1(first.advance(i), last, comp);
  }
  function stable_sort$1(first, last, comp = less) {
    const ramda = function (x, y) {
      return comp(x, y) && !comp(y, x);
    };
    sort$1(first, last, ramda);
  }
  function partial_sort$1(first, middle, last, comp = less) {
    for (let i = first; !i.equals(middle); i = i.next()) {
      let min = i;
      for (let j = i.next(); !j.equals(last); j = j.next())
        if (comp(j.value, min.value)) min = j;
      if (!i.equals(min)) iter_swap(i, min);
    }
  }
  function partial_sort_copy$1(
    first,
    last,
    output_first,
    output_last,
    comp = less,
  ) {
    const input_size = distance(first, last);
    const result_size = distance(output_first, output_last);
    const vector = new Vector(first, last);
    sort$1(vector.begin(), vector.end(), comp);
    if (input_size > result_size)
      output_first = copy$1(
        vector.begin(),
        vector.begin().advance(result_size),
        output_first,
      );
    else output_first = copy$1(vector.begin(), vector.end(), output_first);
    return output_first;
  }
  function nth_element$1(first, nth, last, comp = less) {
    const n = distance(first, nth);
    for (let i = first; !i.equals(last); i = i.next()) {
      let count = 0;
      for (let j = first; !j.equals(last); j = j.next())
        if (i.equals(j)) continue;
        else if (comp(i.value, j.value) && ++count > n) break;
      if (count === n) {
        iter_swap(nth, i);
        return;
      }
    }
  }
  function is_sorted$1(first, last, comp = less) {
    return is_sorted_until$1(first, last, comp).equals(last);
  }
  function is_sorted_until$1(first, last, comp = less) {
    if (first.equals(last)) return last;
    for (let next = first.next(); !next.equals(last); next = next.next())
      if (comp(next.value, first.value)) return next;
      else first = first.next();
    return last;
  }
  function randint(x, y) {
    const rand = Math.random() * (y - x + 1);
    return Math.floor(rand) + x;
  }
  function sample$1(first, last, output, n) {
    const step = distance(first, last);
    const remainders = [];
    for (let i = 0; i < step; ++i) remainders.push(i);
    const advances = new Vector();
    n = Math.min(n, step);
    for (let i = 0; i < n; ++i) {
      const idx = randint(0, remainders.length - 1);
      advances.push(remainders.splice(idx, 1)[0]);
    }
    sort$1(advances.begin(), advances.end());
    for (let i = n - 1; i >= 1; --i)
      advances.set(i, advances.at(i) - advances.at(i - 1));
    for (const adv of advances) {
      first = advance(first, adv);
      output.value = first.value;
      output = output.next();
    }
    return output;
  }
  function copy$1(first, last, output) {
    for (; !first.equals(last); first = first.next()) {
      output.value = first.value;
      output = output.next();
    }
    return output;
  }
  function copy_n$1(first, n, output) {
    for (let i = 0; i < n; ++i) {
      output.value = first.value;
      first = first.next();
      output = output.next();
    }
    return output;
  }
  function copy_if$1(first, last, output, pred) {
    for (; !first.equals(last); first = first.next()) {
      if (!pred(first.value)) continue;
      output.value = first.value;
      output = output.next();
    }
    return output;
  }
  function copy_backward$1(first, last, output) {
    last = last.prev();
    while (!last.equals(first)) {
      last = last.prev();
      output = output.prev();
      output.value = last.value;
    }
    return output;
  }
  function fill$1(first, last, val) {
    for (; !first.equals(last); first = first.next()) first.value = val;
  }
  function fill_n$1(first, n, val) {
    for (let i = 0; i < n; ++i) {
      first.value = val;
      first = first.next();
    }
    return first;
  }
  function transform$1(...args) {
    if (args.length === 4) return _Unary_transform(...args);
    else return _Binary_transform(...args);
  }
  function _Unary_transform(first, last, result, op) {
    for (; !first.equals(last); first = first.next()) {
      result.value = op(first.value);
      result = result.next();
    }
    return result;
  }
  function _Binary_transform(first1, last1, first2, result, binary_op) {
    while (!first1.equals(last1)) {
      result.value = binary_op(first1.value, first2.value);
      first1 = first1.next();
      first2 = first2.next();
      result = result.next();
    }
    return result;
  }
  function generate$1(first, last, gen) {
    for (; !first.equals(last); first = first.next()) first.value = gen();
  }
  function generate_n$1(first, n, gen) {
    while (n-- > 0) {
      first.value = gen();
      first = first.next();
    }
    return first;
  }
  function is_unique$1(first, last, pred = equal_to) {
    if (first.equals(last)) return true;
    let next = first.next();
    for (; !next.equals(last); next = next.next()) {
      if (pred(first.value, next.value) === true) return false;
      first = first.next();
    }
    return true;
  }
  function unique$1(first, last, pred = equal_to) {
    if (first.equals(last)) return last;
    let ret = first;
    for (first = first.next(); !first.equals(last); first = first.next())
      if (!pred(ret.value, first.value)) {
        ret = ret.next();
        ret.value = first.value;
      }
    return ret.next();
  }
  function unique_copy$1(first, last, output, pred = equal_to) {
    if (first.equals(last)) return output;
    output.value = first.value;
    first = first.next();
    for (; !first.equals(last); first = first.next())
      if (!pred(first.value, output.value)) {
        output = output.next();
        output.value = first.value;
      }
    return output.next();
  }
  function remove$1(first, last, val) {
    return remove_if$1(first, last, (elem) => equal_to(elem, val));
  }
  function remove_if$1(first, last, pred) {
    let ret = first;
    while (!first.equals(last)) {
      if (!pred(first.value)) {
        ret.value = first.value;
        ret = ret.next();
      }
      first = first.next();
    }
    return ret;
  }
  function remove_copy$1(first, last, output, val) {
    return remove_copy_if$1(first, last, output, (elem) => equal_to(elem, val));
  }
  function remove_copy_if$1(first, last, output, pred) {
    for (; !first.equals(last); first = first.next()) {
      if (pred(first.value)) continue;
      output.value = first.value;
      output = output.next();
    }
    return output;
  }
  function replace$1(first, last, old_val, new_val) {
    return replace_if$1(
      first,
      last,
      (elem) => equal_to(elem, old_val),
      new_val,
    );
  }
  function replace_if$1(first, last, pred, new_val) {
    for (let it = first; !it.equals(last); it = it.next())
      if (pred(it.value) === true) it.value = new_val;
  }
  function replace_copy$1(first, last, output, old_val, new_val) {
    return replace_copy_if$1(
      first,
      last,
      output,
      (elem) => equal_to(elem, old_val),
      new_val,
    );
  }
  function replace_copy_if$1(first, last, result, pred, new_val) {
    for (; !first.equals(last); first = first.next()) {
      if (pred(first.value)) result.value = new_val;
      else result.value = first.value;
      result = result.next();
    }
    return result;
  }
  function iter_swap(x, y) {
    [x.value, y.value] = [y.value, x.value];
  }
  function swap_ranges$1(first1, last1, first2) {
    for (; !first1.equals(last1); first1 = first1.next()) {
      iter_swap(first1, first2);
      first2 = first2.next();
    }
    return first2;
  }
  function reverse$1(first, last) {
    while (
      first.equals(last) === false &&
      first.equals((last = last.prev())) === false
    ) {
      iter_swap(first, last);
      first = first.next();
    }
  }
  function reverse_copy$1(first, last, output) {
    while (!last.equals(first)) {
      last = last.prev();
      output.value = last.value;
      output = output.next();
    }
    return output;
  }
  function shift_left$1(first, last, n) {
    const mid = advance(first, n);
    return copy$1(mid, last, first);
  }
  function shift_right$1(first, last, n) {
    const mid = advance(last, -n);
    return copy_backward$1(first, mid, last);
  }
  function rotate$1(first, middle, last) {
    while (!first.equals(middle) && !middle.equals(last)) {
      iter_swap(first, middle);
      first = first.next();
      middle = middle.next();
    }
    return first;
  }
  function rotate_copy$1(first, middle, last, output) {
    output = copy$1(middle, last, output);
    return copy$1(first, middle, output);
  }
  function shuffle$1(first, last) {
    for (let it = first; !it.equals(last); it = it.next()) {
      const rand_index = randint(first.index(), last.index() - 1);
      if (it.index() !== rand_index) iter_swap(it, first.advance(rand_index));
    }
  }
  function min(items, comp = less) {
    let minimum = items[0];
    for (let i = 1; i < items.length; ++i)
      if (comp(items[i], minimum)) minimum = items[i];
    return minimum;
  }
  function max(items, comp = less) {
    let maximum = items[0];
    for (let i = 1; i < items.length; ++i)
      if (comp(maximum, items[i])) maximum = items[i];
    return maximum;
  }
  function minmax(items, comp = less) {
    let minimum = items[0];
    let maximum = items[0];
    for (let i = 1; i < items.length; ++i) {
      if (comp(items[i], minimum)) minimum = items[i];
      if (comp(maximum, items[i])) maximum = items[i];
    }
    return new Pair(minimum, maximum);
  }
  function min_element$1(first, last, comp = less) {
    let smallest = first;
    first = first.next();
    for (; !first.equals(last); first = first.next())
      if (comp(first.value, smallest.value)) smallest = first;
    return smallest;
  }
  function max_element$1(first, last, comp = less) {
    let largest = first;
    first = first.next();
    for (; !first.equals(last); first = first.next())
      if (comp(largest.value, first.value)) largest = first;
    return largest;
  }
  function minmax_element$1(first, last, comp = less) {
    let smallest = first;
    let largest = first;
    first = first.next();
    for (; !first.equals(last); first = first.next()) {
      if (comp(first.value, smallest.value)) smallest = first;
      if (comp(largest.value, first.value)) largest = first;
    }
    return new Pair(smallest, largest);
  }
  function clamp(v, lo, hi, comp = less) {
    return comp(v, lo) ? lo : comp(hi, v) ? hi : v;
  }
  function is_permutation$1(first1, last1, first2, pred = equal_to) {
    const pair = mismatch$1(first1, last1, first2, pred);
    first1 = pair.first;
    first2 = pair.second;
    if (first1.equals(last1)) return true;
    const last2 = advance(first2, distance(first1, last1));
    for (let it = first1; !it.equals(last1); it = it.next()) {
      const lambda = (val) => pred(val, it.value);
      if (find_if$1(first1, it, lambda).equals(it)) {
        const n = count_if$1(first2, last2, lambda);
        if (n === 0 || count_if$1(it, last1, lambda) !== n) return false;
      }
    }
    return true;
  }
  function prev_permutation$1(first, last, comp = less) {
    if (first.equals(last) === true) return false;
    let previous = last.prev();
    if (first.equals(previous) === true) return false;
    while (true) {
      let x = previous;
      previous = previous.prev();
      if (comp(x.value, previous.value) === true) {
        let y = last.prev();
        while (comp(y.value, previous.value) === false) y = y.prev();
        iter_swap(previous, y);
        reverse$1(x, last);
        return true;
      }
      if (previous.equals(first) === true) {
        reverse$1(first, last);
        return false;
      }
    }
  }
  function next_permutation$1(first, last, comp = less) {
    if (first.equals(last) === true) return false;
    let previous = last.prev();
    if (first.equals(previous) === true) return false;
    while (true) {
      const x = previous;
      previous = previous.prev();
      if (comp(previous.value, x.value) === true) {
        let y = last.prev();
        while (comp(previous.value, y.value) === false) y = y.prev();
        iter_swap(previous, y);
        reverse$1(x, last);
        return true;
      }
      if (previous.equals(first) === true) {
        reverse$1(first, last);
        return false;
      }
    }
  }
  function min_element(range, comp = less) {
    return min_element$1(begin(range), end(range), comp);
  }
  function max_element(range, comp = less) {
    return max_element$1(begin(range), end(range), comp);
  }
  function minmax_element(range, comp = less) {
    return minmax_element$1(begin(range), end(range), comp);
  }
  function is_permutation(range1, range2, pred = equal_to) {
    if (size(range1) !== size(range2)) return false;
    else
      return is_permutation$1(begin(range1), end(range1), begin(range2), pred);
  }
  function prev_permutation(range, comp = less) {
    return prev_permutation$1(begin(range), end(range), comp);
  }
  function next_permutation(range, comp = less) {
    return next_permutation$1(begin(range), end(range), comp);
  }
  function copy(range, output) {
    return copy$1(begin(range), end(range), output);
  }
  function copy_n(range, n, output) {
    return copy_n$1(begin(range), n, output);
  }
  function copy_if(range, output, pred) {
    return copy_if$1(begin(range), end(range), output, pred);
  }
  function copy_backward(range, output) {
    return copy_backward$1(begin(range), end(range), output);
  }
  function fill(range, value) {
    return fill$1(begin(range), end(range), value);
  }
  function fill_n(range, n, value) {
    return fill_n$1(begin(range), n, value);
  }
  function transform(range1, ...args) {
    const fn = transform$1.bind(undefined, begin(range1), end(range1));
    if (args.length === 3) return fn(...args);
    else return fn(end(args[1]), args[2], args[3]);
  }
  function generate(range, gen) {
    return generate$1(begin(range), end(range), gen);
  }
  function generate_n(range, n, gen) {
    return generate_n$1(begin(range), n, gen);
  }
  function is_unique(range, pred = equal_to) {
    return is_unique$1(begin(range), end(range), pred);
  }
  function unique(range, pred = equal_to) {
    return unique$1(begin(range), end(range), pred);
  }
  function unique_copy(range, output, pred = equal_to) {
    return unique_copy$1(begin(range), end(range), output, pred);
  }
  function remove(range, val) {
    return remove$1(begin(range), end(range), val);
  }
  function remove_if(range, pred) {
    return remove_if$1(begin(range), end(range), pred);
  }
  function remove_copy(range, output, val) {
    return remove_copy$1(begin(range), end(range), output, val);
  }
  function remove_copy_if(range, output, pred) {
    return remove_copy_if$1(begin(range), end(range), output, pred);
  }
  function replace(range, old_val, new_val) {
    return replace$1(begin(range), end(range), old_val, new_val);
  }
  function replace_if(range, pred, new_val) {
    return replace_if$1(begin(range), end(range), pred, new_val);
  }
  function replace_copy(range, output, old_val, new_val) {
    return replace_copy$1(begin(range), end(range), output, old_val, new_val);
  }
  function replace_copy_if(range, output, pred, new_val) {
    return replace_copy_if$1(begin(range), end(range), output, pred, new_val);
  }
  function swap_ranges(range1, range2) {
    return swap_ranges$1(begin(range1), end(range1), begin(range2));
  }
  function reverse(range) {
    return reverse$1(begin(range), end(range));
  }
  function reverse_copy(range, output) {
    return reverse_copy$1(begin(range), end(range), output);
  }
  function shift_left(range, n) {
    return shift_left$1(begin(range), end(range), n);
  }
  function shift_right(range, n) {
    return shift_right$1(begin(range), end(range), n);
  }
  function rotate(range, middle) {
    return rotate$1(begin(range), middle, end(range));
  }
  function rotate_copy(range, middle, output) {
    return rotate_copy$1(begin(range), middle, end(range), output);
  }
  function shuffle(range) {
    return shuffle$1(begin(range), end(range));
  }
  function is_partitioned$1(first, last, pred) {
    while (!first.equals(last) && pred(first.value)) first = first.next();
    for (; !first.equals(last); first = first.next())
      if (pred(first.value)) return false;
    return true;
  }
  function partition_point$1(first, last, pred) {
    let n = distance(first, last);
    while (n > 0) {
      const step = Math.floor(n / 2);
      const it = advance(first, step);
      if (pred(it.value)) {
        first = it.next();
        n -= step + 1;
      } else n = step;
    }
    return first;
  }
  function partition$1(first, last, pred) {
    return stable_partition$1(first, last, pred);
  }
  function stable_partition$1(first, last, pred) {
    while (!first.equals(last) && pred(first.value)) {
      while (pred(first.value)) {
        first = first.next();
        if (first.equals(last)) return first;
      }
      do {
        last = last.prev();
        if (first.equals(last)) return first;
      } while (!pred(last.value));
      iter_swap(first, last);
      first = first.next();
    }
    return last;
  }
  function partition_copy$1(first, last, output_true, output_false, pred) {
    for (; !first.equals(last); first = first.next())
      if (pred(first.value)) {
        output_true.value = first.value;
        output_true = output_true.next();
      } else {
        output_false.value = first.value;
        output_false = output_false.next();
      }
    return new Pair(output_true, output_false);
  }
  function is_partitioned(range, pred) {
    return is_partitioned$1(begin(range), end(range), pred);
  }
  function partition_point(range, pred) {
    return partition_point$1(begin(range), end(range), pred);
  }
  function partition(range, pred) {
    return partition$1(begin(range), end(range), pred);
  }
  function stable_partition(range, pred) {
    return stable_partition$1(begin(range), end(range), pred);
  }
  function partition_copy(range, output_true, output_false, pred) {
    return partition_copy$1(
      begin(range),
      end(range),
      output_true,
      output_false,
      pred,
    );
  }
  function sample(range, first, n) {
    return sample$1(begin(range), end(range), first, n);
  }
  function sort(range, comp = less) {
    return sort$1(begin(range), end(range), comp);
  }
  function stable_sort(range, comp = less) {
    return stable_sort$1(begin(range), end(range), comp);
  }
  function partial_sort(range, middle, comp = less) {
    return partial_sort$1(begin(range), middle, end(range), comp);
  }
  function partial_sort_copy(range, output, comp = less) {
    return partial_sort_copy$1(
      begin(range),
      end(range),
      begin(output),
      end(output),
      comp,
    );
  }
  function nth_element(range, nth, comp = less) {
    return nth_element$1(begin(range), nth, end(range), comp);
  }
  function is_sorted(range, comp = less) {
    return is_sorted$1(begin(range), end(range), comp);
  }
  function is_sorted_until(range, comp = less) {
    return is_sorted_until$1(begin(range), end(range), comp);
  }
  function merge$1(first1, last1, first2, last2, output, comp = less) {
    while (true) {
      if (first1.equals(last1)) return copy$1(first2, last2, output);
      else if (first2.equals(last2)) return copy$1(first1, last1, output);
      if (comp(first1.value, first2.value)) {
        output.value = first1.value;
        first1 = first1.next();
      } else {
        output.value = first2.value;
        first2 = first2.next();
      }
      output = output.next();
    }
  }
  function inplace_merge$1(first, middle, last, comp = less) {
    const vector = new Vector();
    merge$1(first, middle, middle, last, back_inserter(vector), comp);
    copy$1(vector.begin(), vector.end(), first);
  }
  function includes$1(first1, last1, first2, last2, comp = less) {
    while (!first2.equals(last2)) {
      if (first1.equals(last1) || comp(first2.value, first1.value))
        return false;
      else if (!comp(first1.value, first2.value)) first2 = first2.next();
      first1 = first1.next();
    }
    return true;
  }
  function set_union$1(first1, last1, first2, last2, output, comp = less) {
    while (true) {
      if (first1.equals(last1)) return copy$1(first2, last2, output);
      else if (first2.equals(last2)) return copy$1(first1, last1, output);
      if (comp(first1.value, first2.value)) {
        output.value = first1.value;
        first1 = first1.next();
      } else if (comp(first2.value, first1.value)) {
        output.value = first2.value;
        first2 = first2.next();
      } else {
        output.value = first1.value;
        first1 = first1.next();
        first2 = first2.next();
      }
      output = output.next();
    }
  }
  function set_intersection$1(
    first1,
    last1,
    first2,
    last2,
    output,
    comp = less,
  ) {
    while (!first1.equals(last1) && !first2.equals(last2))
      if (comp(first1.value, first2.value)) first1 = first1.next();
      else if (comp(first2.value, first1.value)) first2 = first2.next();
      else {
        output.value = first1.value;
        output = output.next();
        first1 = first1.next();
        first2 = first2.next();
      }
    return output;
  }
  function set_difference$1(first1, last1, first2, last2, output, comp = less) {
    while (!first1.equals(last1) && !first2.equals(last2))
      if (comp(first1.value, first2.value)) {
        output.value = first1.value;
        output = output.next();
        first1 = first1.next();
      } else if (comp(first2.value, first1.value)) first2 = first2.next();
      else {
        first1 = first1.next();
        first2 = first2.next();
      }
    return copy$1(first1, last1, output);
  }
  function set_symmetric_difference$1(
    first1,
    last1,
    first2,
    last2,
    output,
    comp = less,
  ) {
    while (true) {
      if (first1.equals(last1)) return copy$1(first2, last2, output);
      else if (first2.equals(last2)) return copy$1(first1, last1, output);
      if (comp(first1.value, first2.value)) {
        output.value = first1.value;
        output = output.next();
        first1 = first1.next();
      } else if (comp(first2.value, first1.value)) {
        output.value = first2.value;
        output = output.next();
        first2 = first2.next();
      } else {
        first1 = first1.next();
        first2 = first2.next();
      }
    }
  }
  function merge(range1, range2, output, comp = less) {
    return merge$1(
      begin(range1),
      end(range1),
      begin(range2),
      end(range2),
      output,
      comp,
    );
  }
  function inplace_merge(range, middle, comp = less) {
    return inplace_merge$1(begin(range), middle, end(range), comp);
  }
  function includes(range1, range2, comp = less) {
    if (size(range1) < size(range2)) return false;
    else
      return includes$1(
        begin(range1),
        end(range1),
        begin(range2),
        end(range2),
        comp,
      );
  }
  function set_union(range1, range2, output, comp = less) {
    return set_union$1(
      begin(range1),
      end(range1),
      begin(range2),
      end(range2),
      output,
      comp,
    );
  }
  function set_intersection(range1, range2, output, comp = less) {
    return set_intersection$1(
      begin(range1),
      end(range1),
      begin(range2),
      end(range2),
      output,
      comp,
    );
  }
  function set_difference(range1, range2, output, comp = less) {
    return set_difference$1(
      begin(range1),
      end(range1),
      begin(range2),
      end(range2),
      output,
      comp,
    );
  }
  function set_symmetric_difference(range1, range2, output, comp = less) {
    return set_symmetric_difference$1(
      begin(range1),
      end(range1),
      begin(range2),
      end(range2),
      output,
      comp,
    );
  }
  function plus(x, y) {
    if (x.plus instanceof Function) return x.plus(y);
    else return x + y;
  }
  function minus(x, y) {
    if (x.minus instanceof Function) return x.minus(y);
    else return x - y;
  }
  function negate(x) {
    if (x.negate instanceof Function) return x.negate();
    else return -x;
  }
  function multiplies(x, y) {
    if (x.multiplies instanceof Function) return x.multiplies(y);
    else return x * y;
  }
  function divides(x, y) {
    if (x.divides instanceof Function) return x.divides(y);
    else return x / y;
  }
  function modules(x, y) {
    if (x.modules instanceof Function) return x.modules(y);
    else return x % y;
  }
  function gcd(x, y) {
    y = y.valueOf();
    while (y !== 0) [x, y] = [y, x % y];
    return x;
  }
  function lcm(x, y) {
    return (x * y) / gcd(x, y);
  }
  function iota$1(first, last, value) {
    for (; !first.equals(last); first = first.next()) first.value = value++;
  }
  function accumulate$1(first, last, init, op = plus) {
    for (; !first.equals(last); first = first.next())
      init = op(init, first.value);
    return init;
  }
  function inner_product$1(
    first1,
    last1,
    first2,
    value,
    adder = plus,
    multiplier = multiplies,
  ) {
    for (; !first1.equals(last1); first1 = first1.next()) {
      value = adder(value, multiplier(first1.value, first2.value));
      first2 = first2.next();
    }
    return value;
  }
  function adjacent_difference$1(first, last, output, subtracter = minus) {
    if (first.equals(last)) return output;
    let before;
    [first, output, before] = _Initialize(first, output);
    for (; !first.equals(last); first = first.next()) {
      output.value = subtracter(first.value, before);
      before = first.value;
      output = output.next();
    }
    return output;
  }
  function partial_sum$1(first, last, output, adder = plus) {
    if (first.equals(last)) return output;
    let sum;
    [first, output, sum] = _Initialize(first, output);
    for (; !first.equals(last); first = first.next()) {
      sum = adder(sum, first.value);
      output.value = sum;
      output = output.next();
    }
    return output;
  }
  function inclusive_scan$1(first, last, output, adder = plus, init) {
    return transform_inclusive_scan$1(
      first,
      last,
      output,
      adder,
      (val) => val,
      init,
    );
  }
  function exclusive_scan$1(first, last, output, init, op = plus) {
    return transform_exclusive_scan$1(
      first,
      last,
      output,
      init,
      op,
      (val) => val,
    );
  }
  function transform_inclusive_scan$1(
    first,
    last,
    output,
    binary,
    unary,
    init,
  ) {
    if (first.equals(last)) return output;
    let before;
    [first, output, before] = _Transform_initialize(first, output, unary, init);
    for (; !first.equals(last); first = first.next()) {
      before = binary(before, unary(first.value));
      output.value = before;
      output = output.next();
    }
    return output;
  }
  function transform_exclusive_scan$1(
    first,
    last,
    output,
    init,
    binary,
    unary,
  ) {
    if (first.equals(last)) return output;
    let x = unary(first.value);
    let y;
    [first, output, y] = _Transform_initialize(first, output, unary, init);
    for (; !first.equals(last); first = first.next()) {
      y = binary(x, y);
      x = unary(first.value);
      output.value = y;
      output = output.next();
    }
    return output;
  }
  function _Initialize(first, output, init) {
    return _Transform_initialize(first, output, (val) => val, init);
  }
  function _Transform_initialize(first, output, unary, init) {
    const ret = unary(init === undefined ? first.value : init);
    output.value = ret;
    return [first.next(), output.next(), ret];
  }
  function iota(range, value) {
    return iota$1(begin(range), end(range), value);
  }
  function accumulate(range, init, op = plus) {
    return accumulate$1(begin(range), end(range), init, op);
  }
  function inner_product(
    range1,
    range2,
    value,
    adder = plus,
    multiplier = multiplies,
  ) {
    return inner_product$1(
      begin(range1),
      end(range1),
      begin(range2),
      value,
      adder,
      multiplier,
    );
  }
  function adjacent_difference(range, output, subtracter = minus) {
    return adjacent_difference$1(begin(range), end(range), output, subtracter);
  }
  function partial_sum(range, output, adder = plus) {
    return partial_sum$1(begin(range), end(range), output, adder);
  }
  function inclusive_scan(range, output, adder = plus, init) {
    return inclusive_scan$1(begin(range), end(range), output, adder, init);
  }
  function exclusive_scan(range, output, init, adder = plus) {
    return exclusive_scan$1(begin(range), end(range), output, init, adder);
  }
  function transform_inclusive_scan(range, output, binary, unary, init) {
    return transform_inclusive_scan$1(
      begin(range),
      end(range),
      output,
      binary,
      unary,
      init,
    );
  }
  function transform_exclusive_scan(range, output, init, binary, unary) {
    return transform_exclusive_scan$1(
      begin(range),
      end(range),
      output,
      init,
      binary,
      unary,
    );
  }
  var module = Object.freeze({
    __proto__: null,
    accumulate,
    adjacent_difference,
    adjacent_find,
    all_of,
    any_of,
    binary_search,
    copy,
    copy_backward,
    copy_if,
    copy_n,
    count,
    count_if,
    equal,
    equal_range,
    exclusive_scan,
    fill,
    fill_n,
    find,
    find_end,
    find_first_of,
    find_if,
    find_if_not,
    for_each,
    for_each_n,
    generate,
    generate_n,
    includes,
    inclusive_scan,
    inner_product,
    inplace_merge,
    iota,
    is_heap,
    is_heap_until,
    is_partitioned,
    is_permutation,
    is_sorted,
    is_sorted_until,
    is_unique,
    lexicographical_compare,
    lower_bound,
    make_heap,
    max_element,
    merge,
    min_element,
    minmax_element,
    mismatch,
    next_permutation,
    none_of,
    nth_element,
    partial_sort,
    partial_sort_copy,
    partial_sum,
    partition,
    partition_copy,
    partition_point,
    pop_heap,
    prev_permutation,
    push_heap,
    remove,
    remove_copy,
    remove_copy_if,
    remove_if,
    replace,
    replace_copy,
    replace_copy_if,
    replace_if,
    reverse,
    reverse_copy,
    rotate,
    rotate_copy,
    sample,
    search,
    search_n,
    set_difference,
    set_intersection,
    set_symmetric_difference,
    set_union,
    shift_left,
    shift_right,
    shuffle,
    sort,
    sort_heap,
    stable_partition,
    stable_sort,
    swap_ranges,
    transform,
    transform_exclusive_scan,
    transform_inclusive_scan,
    unique,
    unique_copy,
    upper_bound,
  });
  class Deque extends ArrayContainer {
    constructor(...args) {
      super();
      if (args.length === 0) {
        this.clear();
      }
      if (args.length === 1 && args[0] instanceof Array) {
        const array = args[0];
        const first = new NativeArrayIterator(array, 0);
        const last = new NativeArrayIterator(array, array.length);
        this.assign(first, last);
      } else if (args.length === 1 && args[0] instanceof Deque) {
        const container = args[0];
        this.assign(container.begin(), container.end());
      } else if (args.length === 2) {
        this.assign(args[0], args[1]);
      }
    }
    assign(first, second) {
      this.clear();
      this.insert(this.end(), first, second);
    }
    clear() {
      this.matrix_ = [[]];
      this.size_ = 0;
      this.capacity_ = Deque.MIN_CAPACITY;
    }
    resize(n) {
      n = Deque._Emend(n, "resize");
      const expansion = n - this.size();
      if (expansion > 0) this.insert(this.end(), expansion, undefined);
      else if (expansion < 0)
        this.erase(this.end().advance(-expansion), this.end());
    }
    reserve(n) {
      this._Reserve(Deque._Emend(n, "reserve"));
    }
    _Reserve(n) {
      const matrix = [[]];
      const length = this._Compute_col_size(n);
      for (let r = 0; r < this.matrix_.length; ++r) {
        const row = this.matrix_[r];
        for (let c = 0; c < row.length; ++c) {
          let new_row = matrix[matrix.length - 1];
          if (matrix.length < Deque.ROW_SIZE && new_row.length === length) {
            new_row = [];
            matrix.push(new_row);
          }
          new_row.push(row[c]);
        }
      }
      this.matrix_ = matrix;
      this.capacity_ = n;
    }
    shrink_to_fit() {
      this._Reserve(this.size());
    }
    swap(obj) {
      this._Swap(obj);
    }
    _Swap(obj) {
      [this.matrix_, obj.matrix_] = [obj.matrix_, this.matrix_];
      [this.size_, obj.size_] = [obj.size_, this.size_];
      [this.capacity_, obj.capacity_] = [obj.capacity_, this.capacity_];
    }
    static _Emend(n, method) {
      n = Math.floor(n);
      if (n <= 0)
        throw new InvalidArgument(
          `Error on Deque.${method}(): n must be positive integer -> (n = ${n})`,
        );
      return n;
    }
    size() {
      return this.size_;
    }
    capacity() {
      return this.capacity_;
    }
    nth(index) {
      return new Deque.Iterator(this, index);
    }
    [Symbol.iterator]() {
      return new Deque.ForOfAdaptor(this.matrix_);
    }
    source() {
      return this;
    }
    _At(index) {
      const indexPair = this._Fetch_index(index);
      return this.matrix_[indexPair.first][indexPair.second];
    }
    _Set(index, val) {
      const indexPair = this._Fetch_index(index);
      this.matrix_[indexPair.first][indexPair.second] = val;
    }
    _Fetch_index(index) {
      let row;
      for (row = 0; row < this.matrix_.length; row++) {
        const array = this.matrix_[row];
        if (index < array.length) break;
        index -= array.length;
      }
      if (row === this.matrix_.length) row--;
      return new Pair(row, index);
    }
    _Compute_col_size(capacity = this.capacity_) {
      return Math.floor(capacity / Deque.ROW_SIZE);
    }
    push(...items) {
      if (items.length === 0) return this.size();
      const first = new NativeArrayIterator(items, 0);
      const last = new NativeArrayIterator(items, items.length);
      this._Insert_by_range(this.end(), first, last);
      return this.size();
    }
    push_front(val) {
      this._Try_expand_capacity(this.size_ + 1);
      this._Try_add_row_at_front();
      this.matrix_[0].unshift(val);
      ++this.size_;
    }
    push_back(val) {
      this._Try_expand_capacity(this.size_ + 1);
      this._Try_add_row_at_back();
      this.matrix_[this.matrix_.length - 1].push(val);
      ++this.size_;
    }
    pop_front() {
      if (this.empty() === true)
        throw ErrorGenerator.empty(this.constructor, "pop_front");
      this.matrix_[0].shift();
      if (this.matrix_[0].length === 0 && this.matrix_.length > 1)
        this.matrix_.shift();
      this.size_--;
    }
    _Pop_back() {
      const lastArray = this.matrix_[this.matrix_.length - 1];
      lastArray.pop();
      if (lastArray.length === 0 && this.matrix_.length > 1) this.matrix_.pop();
      this.size_--;
    }
    _Insert_by_range(pos, first, last) {
      const size = this.size_ + distance(first, last);
      if (size === this.size_) return pos;
      if (pos.equals(this.end()) === true) {
        this._Try_expand_capacity(size);
        this._Insert_to_end(first, last);
        pos = this.nth(this.size_);
      } else {
        if (size > this.capacity_) {
          const deque = new Deque();
          deque._Reserve(
            Math.max(size, Math.floor(this.capacity_ * Deque.MAGNIFIER)),
          );
          deque._Insert_to_end(this.begin(), pos);
          deque._Insert_to_end(first, last);
          deque._Insert_to_end(pos, this.end());
          this._Swap(deque);
        } else this._Insert_to_middle(pos, first, last);
      }
      this.size_ = size;
      return pos;
    }
    _Insert_to_middle(pos, first, last) {
      const col_size = this._Compute_col_size();
      const indexes = this._Fetch_index(pos.index());
      let row = this.matrix_[indexes.first];
      const col = indexes.second;
      const back_items = row.splice(col);
      for (; !first.equals(last); first = first.next()) {
        if (row.length === col_size && this.matrix_.length < Deque.ROW_SIZE) {
          row = new Array();
          const spliced_array = this.matrix_.splice(++indexes.first);
          this.matrix_.push(row);
          this.matrix_.push(...spliced_array);
        }
        row.push(first.value);
      }
      for (let i = 0; i < back_items.length; ++i) {
        if (row.length === col_size && this.matrix_.length < Deque.ROW_SIZE) {
          row = new Array();
          const spliced_array = this.matrix_.splice(++indexes.first);
          this.matrix_.push(row);
          this.matrix_.push(...spliced_array);
        }
        row.push(back_items[i]);
      }
    }
    _Insert_to_end(first, last) {
      for (; !first.equals(last); first = first.next()) {
        this._Try_add_row_at_back();
        this.matrix_[this.matrix_.length - 1].push(first.value);
      }
    }
    _Try_expand_capacity(size) {
      if (size <= this.capacity_) return false;
      size = Math.max(size, Math.floor(this.capacity_ * Deque.MAGNIFIER));
      this._Reserve(size);
      return true;
    }
    _Try_add_row_at_front() {
      const col_size = this._Compute_col_size();
      if (
        this.matrix_[0].length >= col_size &&
        this.matrix_.length < Deque.ROW_SIZE
      ) {
        this.matrix_ = [[]].concat(...this.matrix_);
        return true;
      } else return false;
    }
    _Try_add_row_at_back() {
      const col_size = this._Compute_col_size();
      if (
        this.matrix_[this.matrix_.length - 1].length >= col_size &&
        this.matrix_.length < Deque.ROW_SIZE
      ) {
        this.matrix_.push([]);
        return true;
      } else return false;
    }
    _Erase_by_range(first, last) {
      if (first.index() >= this.size()) return first;
      let size;
      if (last.index() >= this.size()) size = this.size() - first.index();
      else size = last.index() - first.index();
      this.size_ -= size;
      let first_row = null;
      let second_row = null;
      let i = 0;
      while (size !== 0) {
        const indexes = this._Fetch_index(first.index());
        const row = this.matrix_[indexes.first];
        const col = indexes.second;
        const my_delete_size = Math.min(size, row.length - col);
        row.splice(col, my_delete_size);
        if (row.length !== 0)
          if (i === 0) first_row = row;
          else second_row = row;
        if (row.length === 0 && this.matrix_.length > 1)
          this.matrix_.splice(indexes.first, 1);
        size -= my_delete_size;
        ++i;
      }
      if (
        first_row !== null &&
        second_row !== null &&
        first_row.length + second_row.length <= this._Compute_col_size()
      ) {
        first_row.push(...second_row);
        this.matrix_.splice(this.matrix_.indexOf(second_row), 1);
      }
      return first;
    }
  }
  (function (Deque) {
    Deque.Iterator = ArrayIterator;
    Deque.ReverseIterator = ArrayReverseIterator;
    Deque.ROW_SIZE = 8;
    Deque.MIN_CAPACITY = 36;
    Deque.MAGNIFIER = 1.5;
    class ForOfAdaptor {
      constructor(matrix) {
        this.matrix_ = matrix;
        this.row_ = 0;
        this.col_ = 0;
      }
      next() {
        if (this.row_ === this.matrix_.length)
          return {
            done: true,
            value: undefined,
          };
        else {
          const val = this.matrix_[this.row_][this.col_];
          if (++this.col_ === this.matrix_[this.row_].length) {
            ++this.row_;
            this.col_ = 0;
          }
          return {
            done: false,
            value: val,
          };
        }
      }
      [Symbol.iterator]() {
        return this;
      }
    }
    Deque.ForOfAdaptor = ForOfAdaptor;
  })(Deque || (Deque = {}));
  class ListIterator {
    constructor(prev, next, value) {
      this.prev_ = prev;
      this.next_ = next;
      this.value_ = value;
    }
    static _Set_prev(it, prev) {
      it.prev_ = prev;
    }
    static _Set_next(it, next) {
      it.next_ = next;
    }
    prev() {
      return this.prev_;
    }
    next() {
      return this.next_;
    }
    get value() {
      this._Try_value();
      return this.value_;
    }
    _Try_value() {
      if (
        this.value_ === undefined &&
        this.equals(this.source().end()) === true
      )
        throw ErrorGenerator.iterator_end_value(this.source());
    }
    equals(obj) {
      return this === obj;
    }
  }
  class ListContainer extends Container {
    constructor() {
      super();
      this.end_ = this._Create_iterator(null, null);
      this.clear();
    }
    assign(par1, par2) {
      this.clear();
      this.insert(this.end(), par1, par2);
    }
    clear() {
      ListIterator._Set_prev(this.end_, this.end_);
      ListIterator._Set_next(this.end_, this.end_);
      this.begin_ = this.end_;
      this.size_ = 0;
    }
    resize(n) {
      const expansion = n - this.size();
      if (expansion > 0) this.insert(this.end(), expansion, undefined);
      else if (expansion < 0)
        this.erase(advance(this.end(), -expansion), this.end());
    }
    begin() {
      return this.begin_;
    }
    end() {
      return this.end_;
    }
    size() {
      return this.size_;
    }
    push_front(val) {
      this.insert(this.begin_, val);
    }
    push_back(val) {
      this.insert(this.end_, val);
    }
    pop_front() {
      if (this.empty() === true)
        throw ErrorGenerator.empty(
          this.end_.source().constructor.name,
          "pop_front",
        );
      this.erase(this.begin_);
    }
    pop_back() {
      if (this.empty() === true)
        throw ErrorGenerator.empty(
          this.end_.source().constructor.name,
          "pop_back",
        );
      this.erase(this.end_.prev());
    }
    push(...items) {
      if (items.length === 0) return this.size();
      const first = new NativeArrayIterator(items, 0);
      const last = new NativeArrayIterator(items, items.length);
      this._Insert_by_range(this.end(), first, last);
      return this.size();
    }
    insert(pos, ...args) {
      if (pos.source() !== this.end_.source())
        throw ErrorGenerator.not_my_iterator(this.end_.source(), "insert");
      else if (pos.erased_ === true)
        throw ErrorGenerator.erased_iterator(this.end_.source(), "insert");
      if (args.length === 1)
        return this._Insert_by_repeating_val(pos, 1, args[0]);
      else if (args.length === 2 && typeof args[0] === "number")
        return this._Insert_by_repeating_val(pos, args[0], args[1]);
      else return this._Insert_by_range(pos, args[0], args[1]);
    }
    _Insert_by_repeating_val(position, n, val) {
      const first = new Repeater(0, val);
      const last = new Repeater(n);
      return this._Insert_by_range(position, first, last);
    }
    _Insert_by_range(position, begin, end) {
      let prev = position.prev();
      let first = null;
      let size = 0;
      for (let it = begin; it.equals(end) === false; it = it.next()) {
        const item = this._Create_iterator(prev, null, it.value);
        if (size === 0) first = item;
        ListIterator._Set_next(prev, item);
        prev = item;
        ++size;
      }
      if (position.equals(this.begin()) === true) this.begin_ = first;
      ListIterator._Set_next(prev, position);
      ListIterator._Set_prev(position, prev);
      this.size_ += size;
      return first;
    }
    erase(first, last = first.next()) {
      return this._Erase_by_range(first, last);
    }
    _Erase_by_range(first, last) {
      if (first.source() !== this.end_.source())
        throw ErrorGenerator.not_my_iterator(this.end_.source(), "insert");
      else if (first.erased_ === true)
        throw ErrorGenerator.erased_iterator(this.end_.source(), "insert");
      else if (first.equals(this.end_)) return this.end_;
      const prev = first.prev();
      ListIterator._Set_next(prev, last);
      ListIterator._Set_prev(last, prev);
      for (let it = first; !it.equals(last); it = it.next()) {
        it.erased_ = true;
        --this.size_;
      }
      if (first.equals(this.begin_)) this.begin_ = last;
      return last;
    }
    swap(obj) {
      [this.begin_, obj.begin_] = [obj.begin_, this.begin_];
      [this.end_, obj.end_] = [obj.end_, this.end_];
      [this.size_, obj.size_] = [obj.size_, this.size_];
    }
  }
  class List extends ListContainer {
    constructor(...args) {
      super();
      this.ptr_ = {
        value: this,
      };
      List.Iterator._Set_source_ptr(this.end_, this.ptr_);
      if (args.length === 0);
      else if (args.length === 1 && args[0] instanceof Array) {
        const array = args[0];
        this.push(...array);
      } else if (args.length === 1 && args[0] instanceof List) {
        const container = args[0];
        this.assign(container.begin(), container.end());
      } else if (args.length === 2) {
        this.assign(args[0], args[1]);
      }
    }
    _Create_iterator(prev, next, val) {
      return List.Iterator.create(this.ptr_, prev, next, val);
    }
    front(val) {
      if (arguments.length === 0) return this.begin_.value;
      else this.begin_.value = val;
    }
    back(val) {
      const it = this.end().prev();
      if (arguments.length === 0) return it.value;
      else it.value = val;
    }
    unique(binary_pred = equal_to) {
      let it = this.begin().next();
      while (!it.equals(this.end())) {
        if (binary_pred(it.value, it.prev().value) === true)
          it = this.erase(it);
        else it = it.next();
      }
    }
    remove(val) {
      return this.remove_if((elem) => equal_to(elem, val));
    }
    remove_if(pred) {
      let it = this.begin();
      while (!it.equals(this.end())) {
        if (pred(it.value) === true) it = this.erase(it);
        else it = it.next();
      }
    }
    merge(source, comp = less) {
      if (this === source) return;
      let it = this.begin();
      while (source.empty() === false) {
        const first = source.begin();
        while (!it.equals(this.end()) && comp(it.value, first.value) === true)
          it = it.next();
        this.splice(it, source, first);
      }
    }
    splice(pos, obj, first, last) {
      if (first === undefined) {
        first = obj.begin();
        last = obj.end();
      } else if (last === undefined) last = first.next();
      this.insert(pos, first, last);
      obj.erase(first, last);
    }
    sort(comp = less) {
      this._Quick_sort(this.begin(), this.end().prev(), comp);
    }
    _Quick_sort(first, last, comp) {
      if (
        !first.equals(last) &&
        !last.equals(this.end()) &&
        !first.equals(last.next())
      ) {
        const temp = this._Quick_sort_partition(first, last, comp);
        this._Quick_sort(first, temp.prev(), comp);
        this._Quick_sort(temp.next(), last, comp);
      }
    }
    _Quick_sort_partition(first, last, comp) {
      const standard = last.value;
      let prev = first.prev();
      let it = first;
      for (; !it.equals(last); it = it.next())
        if (comp(it.value, standard)) {
          prev = prev.equals(this.end()) ? first : prev.next();
          [prev.value, it.value] = [it.value, prev.value];
        }
      prev = prev.equals(this.end()) ? first : prev.next();
      [prev.value, it.value] = [it.value, prev.value];
      return prev;
    }
    reverse() {
      const begin = this.end_.prev();
      const prev_of_end = this.begin();
      for (let it = this.begin(); !it.equals(this.end()); ) {
        const prev = it.prev();
        const next = it.next();
        List.Iterator._Set_prev(it, next);
        List.Iterator._Set_next(it, prev);
        it = next;
      }
      this.begin_ = begin;
      List.Iterator._Set_prev(this.end_, prev_of_end);
      List.Iterator._Set_next(this.end_, begin);
    }
    swap(obj) {
      super.swap(obj);
      [this.ptr_, obj.ptr_] = [obj.ptr_, this.ptr_];
      [this.ptr_.value, obj.ptr_.value] = [obj.ptr_.value, this.ptr_.value];
    }
  }
  (function (List) {
    class Iterator extends ListIterator {
      constructor(sourcePtr, prev, next, value) {
        super(prev, next, value);
        this.source_ptr_ = sourcePtr;
      }
      static create(sourcePtr, prev, next, value) {
        return new Iterator(sourcePtr, prev, next, value);
      }
      reverse() {
        return new ReverseIterator(this);
      }
      static _Set_source_ptr(it, ptr) {
        it.source_ptr_ = ptr;
      }
      source() {
        return this.source_ptr_.value;
      }
      get value() {
        this._Try_value();
        return this.value_;
      }
      set value(val) {
        this._Try_value();
        this.value_ = val;
      }
      equals(obj) {
        return this === obj;
      }
    }
    List.Iterator = Iterator;
    class ReverseIterator extends ReverseIterator$1 {
      _Create_neighbor(base) {
        return new ReverseIterator(base);
      }
      get value() {
        return this.base_.value;
      }
      set value(val) {
        this.base_.value = val;
      }
    }
    List.ReverseIterator = ReverseIterator;
  })(List || (List = {}));
  class MapElementList extends ListContainer {
    constructor(associative) {
      super();
      this.associative_ = associative;
    }
    _Create_iterator(prev, next, val) {
      return MapElementList.Iterator.create(this, prev, next, val);
    }
    static _Swap_associative(x, y) {
      [x.associative_, y.associative_] = [y.associative_, x.associative_];
    }
    associative() {
      return this.associative_;
    }
  }
  (function (MapElementList) {
    class Iterator extends ListIterator {
      constructor(list, prev, next, val) {
        super(prev, next, val);
        this.list_ = list;
      }
      static create(list, prev, next, val) {
        return new Iterator(list, prev, next, val);
      }
      reverse() {
        return new ReverseIterator(this);
      }
      source() {
        return this.list_.associative();
      }
      get first() {
        return this.value.first;
      }
      get second() {
        return this.value.second;
      }
      set second(val) {
        this.value.second = val;
      }
    }
    MapElementList.Iterator = Iterator;
    class ReverseIterator extends ReverseIterator$1 {
      _Create_neighbor(base) {
        return new ReverseIterator(base);
      }
      get first() {
        return this.base_.first;
      }
      get second() {
        return this.base_.second;
      }
      set second(val) {
        this.base_.second = val;
      }
    }
    MapElementList.ReverseIterator = ReverseIterator;
  })(MapElementList || (MapElementList = {}));
  class XTreeNode {
    constructor(value, color) {
      this.value = value;
      this.color = color;
      this.parent = null;
      this.left = null;
      this.right = null;
    }
    get grand() {
      return this.parent.parent;
    }
    get sibling() {
      if (this === this.parent.left) return this.parent.right;
      else return this.parent.left;
    }
    get uncle() {
      return this.parent.sibling;
    }
  }
  class XTree {
    constructor(comp) {
      this.root_ = null;
      this.comp_ = comp;
      this.equal_ = function (x, y) {
        return !comp(x, y) && !comp(y, x);
      };
    }
    clear() {
      this.root_ = null;
    }
    root() {
      return this.root_;
    }
    get(val) {
      const ret = this.nearest(val);
      if (ret === null || !this.equal_(val, ret.value)) return null;
      else return ret;
    }
    nearest(val) {
      if (this.root_ === null) return null;
      let ret = this.root_;
      while (true) {
        let my_node = null;
        if (this.comp_(val, ret.value)) my_node = ret.left;
        else if (this.comp_(ret.value, val)) my_node = ret.right;
        else return ret;
        if (my_node !== null) ret = my_node;
        else break;
      }
      return ret;
    }
    _Fetch_maximum(node) {
      while (node.right !== null) node = node.right;
      return node;
    }
    insert(val) {
      const parent = this.nearest(val);
      const node = new XTreeNode(val, 1);
      if (parent === null) this.root_ = node;
      else {
        node.parent = parent;
        if (this.comp_(node.value, parent.value)) parent.left = node;
        else parent.right = node;
      }
      this._Insert_case1(node);
    }
    _Insert_case1(n) {
      if (n.parent === null) n.color = 0;
      else this._Insert_case2(n);
    }
    _Insert_case2(n) {
      if (this._Fetch_color(n.parent) === 0) return;
      else this._Insert_case3(n);
    }
    _Insert_case3(n) {
      if (this._Fetch_color(n.uncle) === 1) {
        n.parent.color = 0;
        n.uncle.color = 0;
        n.grand.color = 1;
        this._Insert_case1(n.grand);
      } else this._Insert_case4(n);
    }
    _Insert_case4(n) {
      if (n === n.parent.right && n.parent === n.grand.left) {
        this._Rotate_left(n.parent);
        n = n.left;
      } else if (n === n.parent.left && n.parent === n.grand.right) {
        this._Rotate_right(n.parent);
        n = n.right;
      }
      this._Insert_case5(n);
    }
    _Insert_case5(n) {
      n.parent.color = 0;
      n.grand.color = 1;
      if (n === n.parent.left && n.parent === n.grand.left)
        this._Rotate_right(n.grand);
      else this._Rotate_left(n.grand);
    }
    erase(val) {
      let node = this.get(val);
      if (node === null) return;
      if (node.left !== null && node.right !== null) {
        const pred = this._Fetch_maximum(node.left);
        node.value = pred.value;
        node = pred;
      }
      const child = node.right === null ? node.left : node.right;
      if (this._Fetch_color(node) === 0) {
        node.color = this._Fetch_color(child);
        this._Erase_case1(node);
      }
      this._Replace_node(node, child);
      if (this._Fetch_color(this.root_) === 1) this.root_.color = 0;
    }
    _Erase_case1(n) {
      if (n.parent === null) return;
      else this._Erase_case2(n);
    }
    _Erase_case2(n) {
      if (this._Fetch_color(n.sibling) === 1) {
        n.parent.color = 1;
        n.sibling.color = 0;
        if (n === n.parent.left) this._Rotate_left(n.parent);
        else this._Rotate_right(n.parent);
      }
      this._Erase_case3(n);
    }
    _Erase_case3(n) {
      if (
        this._Fetch_color(n.parent) === 0 &&
        this._Fetch_color(n.sibling) === 0 &&
        this._Fetch_color(n.sibling.left) === 0 &&
        this._Fetch_color(n.sibling.right) === 0
      ) {
        n.sibling.color = 1;
        this._Erase_case1(n.parent);
      } else this._Erase_case4(n);
    }
    _Erase_case4(N) {
      if (
        this._Fetch_color(N.parent) === 1 &&
        N.sibling !== null &&
        this._Fetch_color(N.sibling) === 0 &&
        this._Fetch_color(N.sibling.left) === 0 &&
        this._Fetch_color(N.sibling.right) === 0
      ) {
        N.sibling.color = 1;
        N.parent.color = 0;
      } else this._Erase_case5(N);
    }
    _Erase_case5(n) {
      if (
        n === n.parent.left &&
        n.sibling !== null &&
        this._Fetch_color(n.sibling) === 0 &&
        this._Fetch_color(n.sibling.left) === 1 &&
        this._Fetch_color(n.sibling.right) === 0
      ) {
        n.sibling.color = 1;
        n.sibling.left.color = 0;
        this._Rotate_right(n.sibling);
      } else if (
        n === n.parent.right &&
        n.sibling !== null &&
        this._Fetch_color(n.sibling) === 0 &&
        this._Fetch_color(n.sibling.left) === 0 &&
        this._Fetch_color(n.sibling.right) === 1
      ) {
        n.sibling.color = 1;
        n.sibling.right.color = 0;
        this._Rotate_left(n.sibling);
      }
      this._Erase_case6(n);
    }
    _Erase_case6(n) {
      n.sibling.color = this._Fetch_color(n.parent);
      n.parent.color = 0;
      if (n === n.parent.left) {
        n.sibling.right.color = 0;
        this._Rotate_left(n.parent);
      } else {
        n.sibling.left.color = 0;
        this._Rotate_right(n.parent);
      }
    }
    _Rotate_left(node) {
      const right = node.right;
      this._Replace_node(node, right);
      node.right = right.left;
      if (right.left !== null) right.left.parent = node;
      right.left = node;
      node.parent = right;
    }
    _Rotate_right(node) {
      const left = node.left;
      this._Replace_node(node, left);
      node.left = left.right;
      if (left.right !== null) left.right.parent = node;
      left.right = node;
      node.parent = left;
    }
    _Replace_node(oldNode, newNode) {
      if (oldNode.parent === null) this.root_ = newNode;
      else {
        if (oldNode === oldNode.parent.left) oldNode.parent.left = newNode;
        else oldNode.parent.right = newNode;
      }
      if (newNode !== null) newNode.parent = oldNode.parent;
    }
    _Fetch_color(node) {
      if (node === null) return 0;
      else return node.color;
    }
  }
  class MapTree extends XTree {
    constructor(source, comp, it_comp) {
      super(it_comp);
      this.source_ = source;
      this.key_compare_ = comp;
      this.key_eq_ = function (x, y) {
        return !comp(x, y) && !comp(y, x);
      };
      this.value_compare_ = function (x, y) {
        return comp(x.first, y.first);
      };
    }
    static _Swap_source(x, y) {
      [x.source_, y.source_] = [y.source_, x.source_];
    }
    get_by_key(key) {
      const ret = this.nearest_by_key(key);
      if (ret === null || !this.key_eq_(key, ret.value.first)) return null;
      else return ret;
    }
    lower_bound(key) {
      const node = this.nearest_by_key(key);
      if (node === null) return this.source().end();
      else if (this.key_comp()(node.value.first, key)) return node.value.next();
      else return node.value;
    }
    equal_range(key) {
      return new Pair(this.lower_bound(key), this.upper_bound(key));
    }
    source() {
      return this.source_;
    }
    key_comp() {
      return this.key_compare_;
    }
    key_eq() {
      return this.key_eq_;
    }
    value_comp() {
      return this.value_compare_;
    }
  }
  class UniqueMapTree extends MapTree {
    constructor(source, comp) {
      super(source, comp, (x, y) => comp(x.first, y.first));
    }
    nearest_by_key(key) {
      if (this.root_ === null) return null;
      let ret = this.root_;
      while (true) {
        const it = ret.value;
        let my_node = null;
        if (this.key_comp()(key, it.first)) my_node = ret.left;
        else if (this.key_comp()(it.first, key)) my_node = ret.right;
        else return ret;
        if (my_node === null) break;
        else ret = my_node;
      }
      return ret;
    }
    upper_bound(key) {
      const node = this.nearest_by_key(key);
      if (node === null) return this.source().end();
      const it = node.value;
      if (this.key_comp()(key, it.first)) return it;
      else return it.next();
    }
  }
  class TreeMap extends UniqueTreeMap {
    constructor(...args) {
      super((thisArg) => new MapElementList(thisArg));
      ITreeContainer.construct(
        this,
        TreeMap,
        (comp) => {
          this.tree_ = new UniqueMapTree(this, comp);
        },
        ...args,
      );
    }
    clear() {
      super.clear();
      this.tree_.clear();
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      MapElementList._Swap_associative(this.data_, obj.data_);
      UniqueMapTree._Swap_source(this.tree_, obj.tree_);
      [this.tree_, obj.tree_] = [obj.tree_, this.tree_];
    }
    key_comp() {
      return this.tree_.key_comp();
    }
    lower_bound(key) {
      return this.tree_.lower_bound(key);
    }
    upper_bound(key) {
      return this.tree_.upper_bound(key);
    }
    _Handle_insert(first, last) {
      for (; !first.equals(last); first = first.next())
        this.tree_.insert(first);
    }
    _Handle_erase(first, last) {
      for (; !first.equals(last); first = first.next()) this.tree_.erase(first);
    }
  }
  (function (TreeMap) {
    TreeMap.Iterator = MapElementList.Iterator;
    TreeMap.ReverseIterator = MapElementList.ReverseIterator;
  })(TreeMap || (TreeMap = {}));
  class VectorBoolean extends ArrayContainer {
    constructor(...args) {
      super();
      if (args.length === 1 && args[0] instanceof VectorBoolean) {
        const obj = args[0];
        this.data_ = new TreeMap(obj.data_.begin(), obj.data_.end());
        this.size_ = obj.size_;
      } else if (args.length === 1 && args[0] instanceof Array) {
        this.clear();
        this.push(...args[0]);
      } else if (args.length === 2) {
        this.assign(args[0], args[1]);
      } else this.clear();
    }
    assign(first, last) {
      this.clear();
      this.insert(this.end(), first, last);
    }
    clear() {
      this.data_ = new TreeMap();
      this.size_ = 0;
    }
    resize(n) {
      const expansion = n - this.size();
      if (expansion > 0) this.insert(this.end(), expansion, false);
      else if (expansion < 0)
        this.erase(this.end().advance(-expansion), this.end());
    }
    flip() {
      for (const entry of this.data_) entry.second = !entry.second;
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      [this.size_, obj.size_] = [obj.size_, this.size_];
    }
    source() {
      return this;
    }
    size() {
      return this.size_;
    }
    _At(index) {
      const it = this._Find_node(index);
      return it.second;
    }
    _Set(index, val) {
      val = !!val;
      let it = this._Find_node(index);
      if (it.second === val) return;
      if (it.first === index) {
        it.second = val;
      } else {
        it = this.data_.emplace(index, val).first;
      }
      if (index === this.size() - 1) return;
      const prev = it.prev();
      const next = it.next();
      if (not_equal_to(prev, this.data_.end()) && prev.second === it.second)
        this.data_.erase(it);
      if (
        next.equals(this.data_.end()) === true ||
        next.first !== index + 1 ||
        next.second !== val
      ) {
        this.data_.emplace(index + 1, !val);
      } else {
        this.data_.erase(next);
      }
    }
    nth(index) {
      return new VectorBoolean.Iterator(this, index);
    }
    _Find_node(index) {
      return this.data_.upper_bound(index).prev();
    }
    push(...items) {
      if (items.length === 0) return this.size();
      const first = new NativeArrayIterator(items, 0);
      const last = new NativeArrayIterator(items, items.length);
      this._Insert_by_range(this.end(), first, last);
      return this.size();
    }
    push_back(val) {
      const it = this.data_.rbegin();
      const index = this.size_++;
      val = !!val;
      if (this.data_.empty() || it.second !== val)
        this.data_.emplace(index, val);
    }
    _Pop_back() {
      const it = this.data_.rbegin();
      const index = --this.size_;
      if (it.first === index) this.data_.erase(it.base());
    }
    _Insert_by_repeating_val(pos, n, val) {
      const elements = [];
      elements.push(new Pair(n, val));
      if (pos.equals(this.end()) === true) return this._Insert_to_end(elements);
      else return this._Insert_to_middle(pos, elements);
    }
    _Insert_by_range(pos, first, last) {
      const elements = [];
      for (let it = first; !it.equals(last); it = it.next()) {
        if (
          elements.length === 0 ||
          elements[elements.length - 1].second !== it.value
        )
          elements.push(new Pair(1, it.value));
        else ++elements[elements.length - 1].first;
      }
      if (pos.equals(this.end()) === true) return this._Insert_to_end(elements);
      else return this._Insert_to_middle(pos, elements);
    }
    _Insert_to_middle(pos, elements) {
      const first = this._Find_node(pos.index());
      for (let it = first; !it.equals(this.data_.end()); it = it.next()) {
        const next = it.next();
        const sx = it.first < pos.index() ? pos.index() : it.first;
        const sy = next.equals(this.data_.end()) ? this.size() : next.first;
        const size = sy - sx;
        const value = !!it.second;
        elements.push(new Pair(size, value));
      }
      this.size_ = pos.index();
      this.data_.erase(
        first.first === pos.index() ? first : first.next(),
        this.data_.end(),
      );
      return this._Insert_to_end(elements);
    }
    _Insert_to_end(elements) {
      const old_size = this.size();
      const last_value = this.data_.empty() ? null : this.data_.rbegin().second;
      for (let i = 0; i < elements.length; ++i) {
        const p = elements[i];
        const index = this.size();
        const value = !!p.second;
        this.size_ += p.first;
        if (i === 0 && value === last_value) continue;
        this.data_.emplace(index, value);
      }
      return this.begin().advance(old_size);
    }
    _Erase_by_range(first, last) {
      const elements = [];
      if (last.equals(this.end()) === false) {
        const last_index = Math.min(this.size(), last.index());
        for (
          let it = this._Find_node(last_index);
          !it.equals(this.data_.end());
          it = it.next()
        ) {
          const next = it.next();
          const sx = Math.max(it.first, last_index);
          const sy = next.equals(this.data_.end()) ? this.size() : next.first;
          const size = sy - sx;
          const value = it.second;
          elements.push(new Pair(size, value));
        }
      }
      this.size_ = first.index();
      this.data_.erase(this.data_.lower_bound(this.size_), this.data_.end());
      return this._Insert_to_end(elements);
    }
  }
  (function (VectorBoolean) {
    VectorBoolean.Iterator = ArrayIterator;
    VectorBoolean.ReverseIterator = ArrayReverseIterator;
  })(VectorBoolean || (VectorBoolean = {}));
  class ForwardList {
    constructor(...args) {
      this.ptr_ = {
        value: this,
      };
      this.end_ = ForwardList.Iterator.create(this.ptr_, null);
      this.before_begin_ = ForwardList.Iterator.create(this.ptr_, this.end_);
      this.size_ = 0;
      if (args.length === 1 && args[0] instanceof Array) {
        const array = args[0];
        let it = this.before_begin();
        for (const val of array) it = this.insert_after(it, val);
      } else if (args.length === 1 && args[0] instanceof ForwardList) {
        this.assign(args[0].begin(), args[0].end());
      } else if (args.length === 2) this.assign(args[0], args[1]);
    }
    assign(first, last) {
      this.clear();
      this.insert_after(this.before_begin_, first, last);
    }
    clear() {
      ForwardList.Iterator._Set_next(this.before_begin_, this.end_);
      this.size_ = 0;
    }
    size() {
      return this.size_;
    }
    empty() {
      return this.size_ === 0;
    }
    front(val) {
      const it = this.begin();
      if (arguments.length === 0) return it.value;
      else it.value = val;
    }
    before_begin() {
      return this.before_begin_;
    }
    begin() {
      return this.before_begin_.next();
    }
    end() {
      return this.end_;
    }
    [Symbol.iterator]() {
      return new ForOfAdaptor(this.begin(), this.end());
    }
    push_front(val) {
      this.insert_after(this.before_begin_, val);
    }
    insert_after(pos, ...args) {
      let ret;
      if (args.length === 1)
        ret = this._Insert_by_repeating_val(pos, 1, args[0]);
      else if (typeof args[0] === "number")
        ret = this._Insert_by_repeating_val(pos, args[0], args[1]);
      else ret = this._Insert_by_range(pos, args[0], args[1]);
      return ret;
    }
    _Insert_by_repeating_val(pos, n, val) {
      const first = new Repeater(0, val);
      const last = new Repeater(n);
      return this._Insert_by_range(pos, first, last);
    }
    _Insert_by_range(pos, first, last) {
      const nodes = [];
      let count = 0;
      for (; !first.equals(last); first = first.next()) {
        const node = ForwardList.Iterator.create(this.ptr_, null, first.value);
        nodes.push(node);
        ++count;
      }
      if (count === 0) return pos;
      for (let i = 0; i < count - 1; ++i)
        ForwardList.Iterator._Set_next(nodes[i], nodes[i + 1]);
      ForwardList.Iterator._Set_next(nodes[nodes.length - 1], pos.next());
      ForwardList.Iterator._Set_next(pos, nodes[0]);
      this.size_ += count;
      return nodes[nodes.length - 1];
    }
    pop_front() {
      this.erase_after(this.before_begin());
    }
    erase_after(first, last = advance(first, 2)) {
      this.size_ -= Math.max(0, distance(first, last) - 1);
      ForwardList.Iterator._Set_next(first, last);
      return last;
    }
    unique(binary_pred = equal_to) {
      for (
        let it = this.begin().next();
        !it.equals(this.end());
        it = it.next()
      ) {
        const next_it = it.next();
        if (next_it.equals(this.end())) break;
        if (binary_pred(it.value, next_it.value)) this.erase_after(it);
      }
    }
    remove(val) {
      return this.remove_if((elem) => equal_to(elem, val));
    }
    remove_if(pred) {
      let count = 0;
      for (
        let it = this.before_begin();
        !it.next().equals(this.end());
        it = it.next()
      )
        if (pred(it.next().value) === true) {
          ForwardList.Iterator._Set_next(it, it.next().next());
          ++count;
        }
      this.size_ -= count;
    }
    merge(from, comp = less) {
      if (this === from) return;
      let it = this.before_begin();
      while (from.empty() === false) {
        const value = from.begin().value;
        while (!it.next().equals(this.end()) && comp(it.next().value, value))
          it = it.next();
        this.splice_after(it, from, from.before_begin());
      }
    }
    splice_after(
      pos,
      from,
      first_before = from.before_begin(),
      last = first_before.next().next(),
    ) {
      if (last === null) last = from.end();
      this.insert_after(pos, first_before.next(), last);
      from.erase_after(first_before, last);
    }
    sort(comp = less) {
      const vec = new Vector(this.begin(), this.end());
      sort$1(vec.begin(), vec.end(), comp);
      this.assign(vec.begin(), vec.end());
    }
    reverse() {
      const vec = new Vector(this.begin(), this.end());
      this.assign(vec.rbegin(), vec.rend());
    }
    swap(obj) {
      [this.size_, obj.size_] = [obj.size_, this.size_];
      [this.before_begin_, obj.before_begin_] = [
        obj.before_begin_,
        this.before_begin_,
      ];
      [this.end_, obj.end_] = [obj.end_, this.end_];
      [this.ptr_, obj.ptr_] = [obj.ptr_, this.ptr_];
      [this.ptr_.value, obj.ptr_.value] = [obj.ptr_.value, this.ptr_.value];
    }
    toJSON() {
      const ret = [];
      for (const elem of this) ret.push(elem);
      return ret;
    }
  }
  (function (ForwardList) {
    class Iterator {
      constructor(source, next, value) {
        this.source_ptr_ = source;
        this.next_ = next;
        this.value_ = value;
      }
      static create(source, next, value) {
        return new Iterator(source, next, value);
      }
      source() {
        return this.source_ptr_.value;
      }
      get value() {
        this._Try_value();
        return this.value_;
      }
      set value(val) {
        this._Try_value();
        this.value_ = val;
      }
      _Try_value() {
        if (this.value_ === undefined) {
          const source = this.source();
          if (this.equals(source.end()) === true)
            throw ErrorGenerator.iterator_end_value(source);
          else if (this.equals(source.before_begin()) === true)
            throw ErrorGenerator.iterator_end_value(source, "before_begin");
        }
      }
      next() {
        return this.next_;
      }
      equals(obj) {
        return this === obj;
      }
      static _Set_next(it, next) {
        it.next_ = next;
      }
    }
    ForwardList.Iterator = Iterator;
  })(ForwardList || (ForwardList = {}));
  class SetElementList extends ListContainer {
    constructor(associative) {
      super();
      this.associative_ = associative;
    }
    _Create_iterator(prev, next, val) {
      return SetElementList.Iterator.create(this, prev, next, val);
    }
    static _Swap_associative(x, y) {
      [x.associative_, y.associative_] = [y.associative_, x.associative_];
    }
    associative() {
      return this.associative_;
    }
  }
  (function (SetElementList) {
    class Iterator extends ListIterator {
      constructor(list, prev, next, val) {
        super(prev, next, val);
        this.source_ = list;
      }
      static create(list, prev, next, val) {
        return new Iterator(list, prev, next, val);
      }
      reverse() {
        return new ReverseIterator(this);
      }
      source() {
        return this.source_.associative();
      }
    }
    SetElementList.Iterator = Iterator;
    class ReverseIterator extends ReverseIterator$1 {
      _Create_neighbor(base) {
        return new ReverseIterator(base);
      }
    }
    SetElementList.ReverseIterator = ReverseIterator;
  })(SetElementList || (SetElementList = {}));
  class SetTree extends XTree {
    constructor(set, comp, it_comp) {
      super(it_comp);
      this.source_ = set;
      this.key_comp_ = comp;
      this.key_eq_ = (x, y) => !comp(x, y) && !comp(y, x);
    }
    static _Swap_source(x, y) {
      [x.source_, y.source_] = [y.source_, x.source_];
    }
    get_by_key(val) {
      const ret = this.nearest_by_key(val);
      if (ret === null || !this.key_eq_(val, ret.value.value)) return null;
      else return ret;
    }
    lower_bound(val) {
      const node = this.nearest_by_key(val);
      if (node === null) return this.source_.end();
      else if (this.key_comp_(node.value.value, val)) return node.value.next();
      else return node.value;
    }
    equal_range(val) {
      return new Pair(this.lower_bound(val), this.upper_bound(val));
    }
    source() {
      return this.source_;
    }
    key_comp() {
      return this.key_comp_;
    }
    key_eq() {
      return this.key_eq_;
    }
    value_comp() {
      return this.key_comp_;
    }
  }
  class UniqueSetTree extends SetTree {
    constructor(source, comp) {
      super(source, comp, (x, y) => comp(x.value, y.value));
    }
    nearest_by_key(val) {
      if (this.root_ === null) return null;
      let ret = this.root_;
      while (true) {
        const it = ret.value;
        let my_node = null;
        if (this.key_comp()(val, it.value)) my_node = ret.left;
        else if (this.key_comp()(it.value, val)) my_node = ret.right;
        else return ret;
        if (my_node === null) break;
        else ret = my_node;
      }
      return ret;
    }
    upper_bound(val) {
      const node = this.nearest_by_key(val);
      if (node === null) return this.source().end();
      const it = node.value;
      if (this.key_comp()(val, it.value)) return it;
      else return it.next();
    }
  }
  class TreeSet extends UniqueTreeSet {
    constructor(...args) {
      super((thisArg) => new SetElementList(thisArg));
      ITreeContainer.construct(
        this,
        TreeSet,
        (comp) => {
          this.tree_ = new UniqueSetTree(this, comp);
        },
        ...args,
      );
    }
    clear() {
      super.clear();
      this.tree_.clear();
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      SetElementList._Swap_associative(this.data_, obj.data_);
      UniqueSetTree._Swap_source(this.tree_, obj.tree_);
      [this.tree_, obj.tree_] = [obj.tree_, this.tree_];
    }
    key_comp() {
      return this.tree_.key_comp();
    }
    lower_bound(key) {
      return this.tree_.lower_bound(key);
    }
    upper_bound(key) {
      return this.tree_.upper_bound(key);
    }
    _Handle_insert(first, last) {
      for (; !first.equals(last); first = first.next())
        this.tree_.insert(first);
    }
    _Handle_erase(first, last) {
      for (; !first.equals(last); first = first.next()) this.tree_.erase(first);
    }
  }
  (function (TreeSet) {
    TreeSet.Iterator = SetElementList.Iterator;
    TreeSet.ReverseIterator = SetElementList.ReverseIterator;
  })(TreeSet || (TreeSet = {}));
  var IHashContainer;
  (function (IHashContainer) {
    function construct(source, Source, bucketFactory, ...args) {
      let post_process = null;
      let hash_function = hash;
      let key_eq = equal_to;
      if (args.length === 1 && args[0] instanceof Source) {
        const container = args[0];
        hash_function = container.hash_function();
        key_eq = container.key_eq();
        post_process = () => {
          const first = container.begin();
          const last = container.end();
          source.assign(first, last);
        };
      } else {
        const tuple = IAssociativeContainer.construct(source, ...args);
        post_process = tuple.ramda;
        if (tuple.tail.length >= 1) hash_function = tuple.tail[0];
        if (tuple.tail.length >= 2) key_eq = tuple.tail[1];
      }
      bucketFactory(hash_function, key_eq);
      if (post_process !== null) post_process();
    }
    IHashContainer.construct = construct;
  })(IHashContainer || (IHashContainer = {}));
  class HashBuckets {
    constructor(fetcher, hasher) {
      this.fetcher_ = fetcher;
      this.hasher_ = hasher;
      this.max_load_factor_ = DEFAULT_MAX_FACTOR;
      this.data_ = [];
      this.size_ = 0;
      this.initialize();
    }
    clear() {
      this.data_ = [];
      this.size_ = 0;
      this.initialize();
    }
    rehash(length) {
      length = Math.max(length, MIN_BUCKET_COUNT);
      const data = [];
      for (let i = 0; i < length; ++i) data.push([]);
      for (const row of this.data_)
        for (const elem of row) {
          const index = this.hasher_(this.fetcher_(elem)) % data.length;
          data[index].push(elem);
        }
      this.data_ = data;
    }
    reserve(length) {
      if (length > this.capacity()) {
        length = Math.floor(length / this.max_load_factor_);
        this.rehash(length);
      }
    }
    initialize() {
      for (let i = 0; i < MIN_BUCKET_COUNT; ++i) this.data_.push([]);
    }
    length() {
      return this.data_.length;
    }
    capacity() {
      return this.data_.length * this.max_load_factor_;
    }
    at(index) {
      return this.data_[index];
    }
    load_factor() {
      return this.size_ / this.length();
    }
    max_load_factor(z = null) {
      if (z === null) return this.max_load_factor_;
      else this.max_load_factor_ = z;
    }
    hash_function() {
      return this.hasher_;
    }
    index(elem) {
      return this.hasher_(this.fetcher_(elem)) % this.length();
    }
    insert(val) {
      const capacity = this.capacity();
      if (++this.size_ > capacity) this.reserve(capacity * 2);
      const index = this.index(val);
      this.data_[index].push(val);
    }
    erase(val) {
      const index = this.index(val);
      const bucket = this.data_[index];
      for (let i = 0; i < bucket.length; ++i)
        if (bucket[i] === val) {
          bucket.splice(i, 1);
          --this.size_;
          break;
        }
    }
  }
  const MIN_BUCKET_COUNT = 10;
  const DEFAULT_MAX_FACTOR = 1;
  class SetHashBuckets extends HashBuckets {
    constructor(source, hasher, pred) {
      super(fetcher$1, hasher);
      this.source_ = source;
      this.key_eq_ = pred;
    }
    static _Swap_source(x, y) {
      [x.source_, y.source_] = [y.source_, x.source_];
    }
    key_eq() {
      return this.key_eq_;
    }
    find(val) {
      const index = this.hash_function()(val) % this.length();
      const bucket = this.at(index);
      for (const it of bucket) if (this.key_eq_(it.value, val)) return it;
      return this.source_.end();
    }
  }
  function fetcher$1(elem) {
    return elem.value;
  }
  class HashSet extends UniqueSet {
    constructor(...args) {
      super((thisArg) => new SetElementList(thisArg));
      IHashContainer.construct(
        this,
        HashSet,
        (hash, pred) => {
          this.buckets_ = new SetHashBuckets(this, hash, pred);
        },
        ...args,
      );
    }
    clear() {
      this.buckets_.clear();
      super.clear();
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      SetElementList._Swap_associative(this.data_, obj.data_);
      SetHashBuckets._Swap_source(this.buckets_, obj.buckets_);
      [this.buckets_, obj.buckets_] = [obj.buckets_, this.buckets_];
    }
    find(key) {
      return this.buckets_.find(key);
    }
    begin(index = null) {
      if (index === null) return super.begin();
      else return this.buckets_.at(index)[0];
    }
    end(index = null) {
      if (index === null) return super.end();
      else {
        const bucket = this.buckets_.at(index);
        return bucket[bucket.length - 1].next();
      }
    }
    rbegin(index = null) {
      return this.end(index).reverse();
    }
    rend(index = null) {
      return this.begin(index).reverse();
    }
    bucket_count() {
      return this.buckets_.length();
    }
    bucket_size(n) {
      return this.buckets_.at(n).length;
    }
    load_factor() {
      return this.buckets_.load_factor();
    }
    hash_function() {
      return this.buckets_.hash_function();
    }
    key_eq() {
      return this.buckets_.key_eq();
    }
    bucket(key) {
      return this.hash_function()(key) % this.buckets_.length();
    }
    max_load_factor(z = null) {
      return this.buckets_.max_load_factor(z);
    }
    reserve(n) {
      this.buckets_.reserve(n);
    }
    rehash(n) {
      this.buckets_.rehash(n);
    }
    _Insert_by_key(key) {
      let it = this.find(key);
      if (it.equals(this.end()) === false) return new Pair(it, false);
      this.data_.push(key);
      it = it.prev();
      this._Handle_insert(it, it.next());
      return new Pair(it, true);
    }
    _Insert_by_hint(hint, key) {
      let it = this.find(key);
      if (it.equals(this.end()) === true) {
        it = this.data_.insert(hint, key);
        this._Handle_insert(it, it.next());
      }
      return it;
    }
    _Handle_insert(first, last) {
      for (; !first.equals(last); first = first.next())
        this.buckets_.insert(first);
    }
    _Handle_erase(first, last) {
      for (; !first.equals(last); first = first.next())
        this.buckets_.erase(first);
    }
  }
  (function (HashSet) {
    HashSet.Iterator = SetElementList.Iterator;
    HashSet.ReverseIterator = SetElementList.ReverseIterator;
  })(HashSet || (HashSet = {}));
  class MultiSetTree extends SetTree {
    constructor(source, comp) {
      super(source, comp, function (x, y) {
        const ret = comp(x.value, y.value);
        if (!ret && !comp(y.value, x.value)) return get_uid(x) < get_uid(y);
        else return ret;
      });
    }
    insert(val) {
      get_uid(val);
      super.insert(val);
    }
    _Nearest_by_key(key, equal_mover) {
      if (this.root_ === null) return null;
      let ret = this.root_;
      let matched = null;
      while (true) {
        const candidate = ret.value;
        let node = null;
        if (this.key_comp()(key, candidate.value)) node = ret.left;
        else if (this.key_comp()(candidate.value, key)) node = ret.right;
        else {
          matched = ret;
          node = equal_mover(ret);
        }
        if (node === null) break;
        else ret = node;
      }
      return matched !== null ? matched : ret;
    }
    nearest_by_key(val) {
      return this._Nearest_by_key(val, function (node) {
        return node.left;
      });
    }
    upper_bound(val) {
      const node = this._Nearest_by_key(val, function (node) {
        return node.right;
      });
      if (node === null) return this.source().end();
      const it = node.value;
      if (this.key_comp()(val, it.value)) return it;
      else return it.next();
    }
  }
  class TreeMultiSet extends MultiTreeSet {
    constructor(...args) {
      super((thisArg) => new SetElementList(thisArg));
      ITreeContainer.construct(
        this,
        TreeMultiSet,
        (comp) => {
          this.tree_ = new MultiSetTree(this, comp);
        },
        ...args,
      );
    }
    clear() {
      super.clear();
      this.tree_.clear();
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      SetElementList._Swap_associative(this.data_, obj.data_);
      MultiSetTree._Swap_source(this.tree_, obj.tree_);
      [this.tree_, obj.tree_] = [obj.tree_, this.tree_];
    }
    key_comp() {
      return this.tree_.key_comp();
    }
    lower_bound(key) {
      return this.tree_.lower_bound(key);
    }
    upper_bound(key) {
      return this.tree_.upper_bound(key);
    }
    _Handle_insert(first, last) {
      for (; !first.equals(last); first = first.next())
        this.tree_.insert(first);
    }
    _Handle_erase(first, last) {
      for (; !first.equals(last); first = first.next()) this.tree_.erase(first);
    }
  }
  (function (TreeMultiSet) {
    TreeMultiSet.Iterator = SetElementList.Iterator;
    TreeMultiSet.ReverseIterator = SetElementList.ReverseIterator;
  })(TreeMultiSet || (TreeMultiSet = {}));
  class HashMultiSet extends MultiSet {
    constructor(...args) {
      super((thisArg) => new SetElementList(thisArg));
      IHashContainer.construct(
        this,
        HashMultiSet,
        (hash, pred) => {
          this.buckets_ = new SetHashBuckets(this, hash, pred);
        },
        ...args,
      );
    }
    clear() {
      this.buckets_.clear();
      super.clear();
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      SetElementList._Swap_associative(this.data_, obj.data_);
      SetHashBuckets._Swap_source(this.buckets_, obj.buckets_);
      [this.buckets_, obj.buckets_] = [obj.buckets_, this.buckets_];
    }
    find(key) {
      return this.buckets_.find(key);
    }
    count(key) {
      const index = this.bucket(key);
      const bucket = this.buckets_.at(index);
      let cnt = 0;
      for (let it of bucket) if (this.buckets_.key_eq()(it.value, key)) ++cnt;
      return cnt;
    }
    begin(index = null) {
      if (index === null) return super.begin();
      else return this.buckets_.at(index)[0];
    }
    end(index = null) {
      if (index === null) return super.end();
      else {
        const bucket = this.buckets_.at(index);
        return bucket[bucket.length - 1].next();
      }
    }
    rbegin(index = null) {
      return this.end(index).reverse();
    }
    rend(index = null) {
      return this.begin(index).reverse();
    }
    bucket_count() {
      return this.buckets_.length();
    }
    bucket_size(n) {
      return this.buckets_.at(n).length;
    }
    load_factor() {
      return this.buckets_.load_factor();
    }
    hash_function() {
      return this.buckets_.hash_function();
    }
    key_eq() {
      return this.buckets_.key_eq();
    }
    bucket(key) {
      return this.hash_function()(key) % this.buckets_.length();
    }
    max_load_factor(z = null) {
      return this.buckets_.max_load_factor(z);
    }
    reserve(n) {
      this.buckets_.rehash(Math.ceil(n * this.max_load_factor()));
    }
    rehash(n) {
      if (n <= this.bucket_count()) return;
      this.buckets_.rehash(n);
    }
    _Key_eq(x, y) {
      return this.key_eq()(x, y);
    }
    _Insert_by_key(key) {
      const it = this.data_.insert(this.data_.end(), key);
      this._Handle_insert(it, it.next());
      return it;
    }
    _Insert_by_hint(hint, key) {
      const it = this.data_.insert(hint, key);
      this._Handle_insert(it, it.next());
      return it;
    }
    _Insert_by_range(first, last) {
      const my_first = this.data_.insert(this.data_.end(), first, last);
      if (this.size() > this.buckets_.capacity())
        this.reserve(Math.max(this.size(), this.buckets_.capacity() * 2));
      this._Handle_insert(my_first, this.end());
    }
    _Handle_insert(first, last) {
      for (; !first.equals(last); first = first.next())
        this.buckets_.insert(first);
    }
    _Handle_erase(first, last) {
      for (; !first.equals(last); first = first.next())
        this.buckets_.erase(first);
    }
  }
  (function (HashMultiSet) {
    HashMultiSet.Iterator = SetElementList.Iterator;
    HashMultiSet.ReverseIterator = SetElementList.ReverseIterator;
  })(HashMultiSet || (HashMultiSet = {}));
  class MapHashBuckets extends HashBuckets {
    constructor(source, hasher, pred) {
      super(fetcher, hasher);
      this.source_ = source;
      this.key_eq_ = pred;
    }
    static _Swap_source(x, y) {
      [x.source_, y.source_] = [y.source_, x.source_];
    }
    key_eq() {
      return this.key_eq_;
    }
    find(key) {
      const index = this.hash_function()(key) % this.length();
      const bucket = this.at(index);
      for (const it of bucket) if (this.key_eq_(it.first, key)) return it;
      return this.source_.end();
    }
  }
  function fetcher(elem) {
    return elem.first;
  }
  class HashMap extends UniqueMap {
    constructor(...args) {
      super((thisArg) => new MapElementList(thisArg));
      IHashContainer.construct(
        this,
        HashMap,
        (hash, pred) => {
          this.buckets_ = new MapHashBuckets(this, hash, pred);
        },
        ...args,
      );
    }
    clear() {
      this.buckets_.clear();
      super.clear();
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      MapElementList._Swap_associative(this.data_, obj.data_);
      MapHashBuckets._Swap_source(this.buckets_, obj.buckets_);
      [this.buckets_, obj.buckets_] = [obj.buckets_, this.buckets_];
    }
    find(key) {
      return this.buckets_.find(key);
    }
    begin(index = null) {
      if (index === null) return super.begin();
      else return this.buckets_.at(index)[0];
    }
    end(index = null) {
      if (index === null) return super.end();
      else {
        const bucket = this.buckets_.at(index);
        return bucket[bucket.length - 1].next();
      }
    }
    rbegin(index = null) {
      return this.end(index).reverse();
    }
    rend(index = null) {
      return this.begin(index).reverse();
    }
    bucket_count() {
      return this.buckets_.length();
    }
    bucket_size(index) {
      return this.buckets_.at(index).length;
    }
    load_factor() {
      return this.buckets_.load_factor();
    }
    hash_function() {
      return this.buckets_.hash_function();
    }
    key_eq() {
      return this.buckets_.key_eq();
    }
    bucket(key) {
      return this.hash_function()(key) % this.buckets_.length();
    }
    max_load_factor(z = null) {
      return this.buckets_.max_load_factor(z);
    }
    reserve(n) {
      this.buckets_.reserve(n);
    }
    rehash(n) {
      this.buckets_.rehash(n);
    }
    emplace(key, val) {
      let it = this.find(key);
      if (it.equals(this.end()) === false) return new Pair(it, false);
      this.data_.push(new Entry(key, val));
      it = it.prev();
      this._Handle_insert(it, it.next());
      return new Pair(it, true);
    }
    emplace_hint(hint, key, val) {
      let it = this.find(key);
      if (it.equals(this.end()) === true) {
        it = this.data_.insert(hint, new Entry(key, val));
        this._Handle_insert(it, it.next());
      }
      return it;
    }
    _Handle_insert(first, last) {
      for (; !first.equals(last); first = first.next())
        this.buckets_.insert(first);
    }
    _Handle_erase(first, last) {
      for (; !first.equals(last); first = first.next())
        this.buckets_.erase(first);
    }
  }
  (function (HashMap) {
    HashMap.Iterator = MapElementList.Iterator;
    HashMap.ReverseIterator = MapElementList.ReverseIterator;
  })(HashMap || (HashMap = {}));
  class MultiMapTree extends MapTree {
    constructor(source, comp) {
      super(source, comp, function (x, y) {
        const ret = comp(x.first, y.first);
        if (!ret && !comp(y.first, x.first)) return get_uid(x) < get_uid(y);
        else return ret;
      });
    }
    insert(val) {
      get_uid(val);
      super.insert(val);
    }
    _Nearest_by_key(key, equal_mover) {
      if (this.root_ === null) return null;
      let ret = this.root_;
      let matched = null;
      while (true) {
        const it = ret.value;
        let my_node = null;
        if (this.key_comp()(key, it.first)) my_node = ret.left;
        else if (this.key_comp()(it.first, key)) my_node = ret.right;
        else {
          matched = ret;
          my_node = equal_mover(ret);
        }
        if (my_node === null) break;
        else ret = my_node;
      }
      return matched !== null ? matched : ret;
    }
    nearest_by_key(key) {
      return this._Nearest_by_key(key, function (node) {
        return node.left;
      });
    }
    upper_bound(key) {
      const node = this._Nearest_by_key(key, function (node) {
        return node.right;
      });
      if (node === null) return this.source().end();
      const it = node.value;
      if (this.key_comp()(key, it.first)) return it;
      else return it.next();
    }
  }
  class TreeMultiMap extends MultiTreeMap {
    constructor(...args) {
      super((thisArg) => new MapElementList(thisArg));
      ITreeContainer.construct(
        this,
        TreeMultiMap,
        (comp) => {
          this.tree_ = new MultiMapTree(this, comp);
        },
        ...args,
      );
    }
    clear() {
      super.clear();
      this.tree_.clear();
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      MapElementList._Swap_associative(this.data_, obj.data_);
      MultiMapTree._Swap_source(this.tree_, obj.tree_);
      [this.tree_, obj.tree_] = [obj.tree_, this.tree_];
    }
    key_comp() {
      return this.tree_.key_comp();
    }
    lower_bound(key) {
      return this.tree_.lower_bound(key);
    }
    upper_bound(key) {
      return this.tree_.upper_bound(key);
    }
    _Handle_insert(first, last) {
      for (; !first.equals(last); first = first.next())
        this.tree_.insert(first);
    }
    _Handle_erase(first, last) {
      for (; !first.equals(last); first = first.next()) this.tree_.erase(first);
    }
  }
  (function (TreeMultiMap) {
    TreeMultiMap.Iterator = MapElementList.Iterator;
    TreeMultiMap.ReverseIterator = MapElementList.ReverseIterator;
  })(TreeMultiMap || (TreeMultiMap = {}));
  class HashMultiMap extends MultiMap {
    constructor(...args) {
      super((thisArg) => new MapElementList(thisArg));
      IHashContainer.construct(
        this,
        HashMultiMap,
        (hash, pred) => {
          this.buckets_ = new MapHashBuckets(this, hash, pred);
        },
        ...args,
      );
    }
    clear() {
      this.buckets_.clear();
      super.clear();
    }
    swap(obj) {
      [this.data_, obj.data_] = [obj.data_, this.data_];
      MapElementList._Swap_associative(this.data_, obj.data_);
      MapHashBuckets._Swap_source(this.buckets_, obj.buckets_);
      [this.buckets_, obj.buckets_] = [obj.buckets_, this.buckets_];
    }
    find(key) {
      return this.buckets_.find(key);
    }
    count(key) {
      const index = this.bucket(key);
      const bucket = this.buckets_.at(index);
      let cnt = 0;
      for (let it of bucket) if (this.buckets_.key_eq()(it.first, key)) ++cnt;
      return cnt;
    }
    begin(index = null) {
      if (index === null) return super.begin();
      else return this.buckets_.at(index)[0];
    }
    end(index = null) {
      if (index === null) return super.end();
      else {
        const bucket = this.buckets_.at(index);
        return bucket[bucket.length - 1].next();
      }
    }
    rbegin(index = null) {
      return this.end(index).reverse();
    }
    rend(index = null) {
      return this.begin(index).reverse();
    }
    bucket_count() {
      return this.buckets_.length();
    }
    bucket_size(index) {
      return this.buckets_.at(index).length;
    }
    load_factor() {
      return this.buckets_.load_factor();
    }
    hash_function() {
      return this.buckets_.hash_function();
    }
    key_eq() {
      return this.buckets_.key_eq();
    }
    bucket(key) {
      return this.hash_function()(key) % this.buckets_.length();
    }
    max_load_factor(z = null) {
      return this.buckets_.max_load_factor(z);
    }
    reserve(n) {
      this.buckets_.reserve(n);
    }
    rehash(n) {
      if (n <= this.bucket_count()) return;
      this.buckets_.rehash(n);
    }
    _Key_eq(x, y) {
      return this.key_eq()(x, y);
    }
    emplace(key, val) {
      const it = this.data_.insert(this.data_.end(), new Entry(key, val));
      this._Handle_insert(it, it.next());
      return it;
    }
    emplace_hint(hint, key, val) {
      const it = this.data_.insert(hint, new Entry(key, val));
      this._Handle_insert(it, it.next());
      return it;
    }
    _Insert_by_range(first, last) {
      const entries = [];
      for (let it = first; !it.equals(last); it = it.next())
        entries.push(new Entry(it.value.first, it.value.second));
      const my_first = this.data_.insert(
        this.data_.end(),
        new NativeArrayIterator(entries, 0),
        new NativeArrayIterator(entries, entries.length),
      );
      if (this.size() > this.buckets_.capacity())
        this.reserve(Math.max(this.size(), this.buckets_.capacity() * 2));
      this._Handle_insert(my_first, this.end());
    }
    _Handle_insert(first, last) {
      for (; !first.equals(last); first = first.next())
        this.buckets_.insert(first);
    }
    _Handle_erase(first, last) {
      for (; !first.equals(last); first = first.next())
        this.buckets_.erase(first);
    }
  }
  (function (HashMultiMap) {
    HashMultiMap.Iterator = MapElementList.Iterator;
    HashMultiMap.ReverseIterator = MapElementList.ReverseIterator;
  })(HashMultiMap || (HashMultiMap = {}));
  class AdaptorContainer {
    constructor(source) {
      this.source_ = source;
    }
    size() {
      return this.source_.size();
    }
    empty() {
      return this.source_.empty();
    }
    push(...elems) {
      return this.source_.push(...elems);
    }
    swap(obj) {
      [this.source_, obj.source_] = [obj.source_, this.source_];
    }
  }
  class Stack extends AdaptorContainer {
    constructor(obj) {
      super(new Vector());
      if (obj !== undefined)
        this.source_.assign(obj.source_.begin(), obj.source_.end());
    }
    top() {
      return this.source_.back();
    }
    pop() {
      this.source_.pop_back();
    }
  }
  class Queue extends AdaptorContainer {
    constructor(obj) {
      super(new List());
      if (obj !== undefined)
        this.source_.assign(obj.source_.begin(), obj.source_.end());
    }
    front() {
      return this.source_.front();
    }
    back() {
      return this.source_.back();
    }
    pop() {
      this.source_.pop_front();
    }
  }
  class PriorityQueue extends AdaptorContainer {
    constructor(...args) {
      super(new Vector());
      let comp = less;
      let post_process = null;
      if (args.length === 1 && args[0] instanceof PriorityQueue) {
        const obj = args[0];
        comp = obj.comp_;
        post_process = () => {
          const first = obj.source_.begin();
          const last = obj.source_.end();
          this.source_.assign(first, last);
        };
      } else if (
        args.length >= 2 &&
        args[0].next instanceof Function &&
        args[1].next instanceof Function
      ) {
        if (args.length === 3) comp = args[2];
        post_process = () => {
          const first = args[0];
          const last = args[1];
          this.source_.assign(first, last);
        };
      } else if (args.length === 1) comp = args[0];
      this.comp_ = comp;
      if (post_process !== null) post_process();
    }
    value_comp() {
      return this.comp_;
    }
    top() {
      return this.source_.front();
    }
    push(...elems) {
      for (const elem of elems) {
        this.source_.push_back(elem);
        push_heap$1(this.source_.begin(), this.source_.end(), this.comp_);
      }
      return this.size();
    }
    pop() {
      pop_heap$1(this.source_.begin(), this.source_.end(), this.comp_);
      this.source_.pop_back();
    }
    swap(obj) {
      super.swap(obj);
      [this.comp_, obj.comp_] = [obj.comp_, this.comp_];
    }
  }
  class DomainError extends LogicError {
    constructor(message) {
      super(message);
    }
  }
  class LengthError extends LogicError {
    constructor(message) {
      super(message);
    }
  }
  class OverflowError extends RuntimeError {
    constructor(message) {
      super(message);
    }
  }
  class UnderflowError extends RuntimeError {
    constructor(message) {
      super(message);
    }
  }
  class ErrorInstance {
    constructor(val = 0, category = null) {
      this.assign(val, category);
    }
    assign(val, category) {
      this.category_ = category;
      this.value_ = val;
    }
    clear() {
      this.value_ = 0;
    }
    category() {
      return this.category_;
    }
    value() {
      return this.value_;
    }
    message() {
      return this.category_.message(this.value_);
    }
    to_bool() {
      return this.value_ !== 0;
    }
    toJSON() {
      if (this.category_ === null) return {};
      else
        return {
          cateogory: this.category_.name(),
          value: this.value(),
          message: this.message(),
        };
    }
  }
  class ErrorCode extends ErrorInstance {
    constructor(val = 0, category = null) {
      super(val, category);
    }
    default_error_condition() {
      return this.category_.default_error_condition(this.value_);
    }
  }
  class SystemError extends RuntimeError {
    constructor(...args) {
      super("");
      if (args.length >= 2 && typeof args[0].valueOf() === "number") {
        const val = args[0];
        const category = args[1];
        this.code_ = new ErrorCode(val, category);
        this.message = args[2];
      } else {
        this.code_ = args[0];
        this.message = args[1];
      }
    }
    code() {
      return this.code_;
    }
    toJSON() {
      return {
        ...super.toJSON(),
        code: this.code_.toJSON(),
      };
    }
  }
  class ErrorCondition extends ErrorInstance {
    constructor(val = 0, category = null) {
      super(val, category);
    }
  }
  class ErrorCategory {
    constructor() {}
    default_error_condition(val) {
      return new ErrorCondition(val, this);
    }
    equivalent(...args) {
      if (args[1] instanceof ErrorCondition) {
        const val_code = args[0];
        const cond = args[1];
        return equal_to(this.default_error_condition(val_code), cond);
      } else {
        const code = args[0];
        const valcond = args[1];
        return equal_to(this, code.category()) && code.value() === valcond;
      }
    }
  }
  function logical_and(x, y) {
    return !!x && !!y;
  }
  function logical_or(x, y) {
    return !!x || !!y;
  }
  function logical_not(x) {
    return !x;
  }
  function bit_and(x, y) {
    return x & y;
  }
  function bit_or(x, y) {
    return x | y;
  }
  function bit_xor(x, y) {
    return x ^ y;
  }
  function tgamma(x) {
    if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * tgamma(1 - x));
    x -= 1;
    let a = P[0];
    const t = x + G$1 + 0.5;
    for (let i = 1; i < P.length; ++i) a += P[i] / (x + i);
    return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
  }
  function lgamma(x) {
    return Math.log(tgamma(x));
  }
  const P = [
    0.9999999999998099, 676.5203681218851, -1259.1392167224028,
    771.3234287776531, -176.6150291621406, 12.507343278686905,
    -0.13857109526572012, 9984369578019572e-21, 1.5056327351493116e-7,
  ];
  const G$1 = 7;
  function beta(x, y) {
    return (tgamma(x) * tgamma(y)) / tgamma(x + y);
  }
  var MathUtil;
  (function (MathUtil) {
    function factorial(k) {
      if (FACTORIALS.length <= k)
        for (let i = FACTORIALS.length; i <= k; ++i)
          FACTORIALS.push(FACTORIALS[i - 1] * i);
      return FACTORIALS[k];
    }
    MathUtil.factorial = factorial;
    function integral(formula, first, last, segment_count = 100 * 1e3) {
      if (first > last) [first, last] = [last, first];
      else if (first === last) return 0;
      const interval = (last - first) / segment_count;
      let ret = 0;
      for (; first < last; first += interval) ret += formula(first) * interval;
      return ret;
    }
    MathUtil.integral = integral;
    function sigma(formula, first, last) {
      let ret = 0;
      for (; first <= last; ++first) ret += formula(first);
      return ret;
    }
    MathUtil.sigma = sigma;
    const FACTORIALS = [1, 1];
  })(MathUtil || (MathUtil = {}));
  const INFINITY$1 = 100;
  function cyl_bessel_j(n, x) {
    if (x < 0 && Math.floor(n) !== n)
      throw new InvalidArgument(
        `Error on std.cyl_bessel_j(): n must be integer when x is negative -> (n = ${n}, x = ${x}).`,
      );
    else if (x === 0 && n !== 0)
      throw new InvalidArgument(
        `Error on std.cyl_bessel_j(): n must be zero when x is zero -> (n = ${n}, x = ${x}).`,
      );
    if (n === Math.floor(n)) return _J_int(n, x);
    else return _J_positive(n, x);
  }
  function cyl_neumann(v, x) {
    if (x <= 0)
      throw new InvalidArgument(
        `Error on std.cyl_neumann(): x must be greater than zero -> (x = ${x}).`,
      );
    const numerator =
      cyl_bessel_j(v, x) * Math.cos(v * Math.PI) - cyl_bessel_j(-v, x);
    const denominator = Math.sin(v * Math.PI);
    return numerator / denominator;
  }
  function _J_int(n, x) {
    if (n < 0) return Math.pow(-1, n) * _J_positive(-n, x);
    else return _J_positive(n, x);
  }
  function _J_positive(v, x) {
    const sigma = MathUtil.sigma(
      function (k) {
        let ret = Math.pow(-1, k) * Math.pow(x / 2, v + 2 * k);
        ret /= MathUtil.factorial(k) * tgamma(v + k + 1);
        return ret;
      },
      0,
      INFINITY$1,
    );
    return sigma;
  }
  function sph_bessel(n, x) {
    return Math.sqrt(Math.PI / (2 * x)) * cyl_bessel_j(n + 0.5, x);
  }
  function sph_neumann(n, x) {
    let ret = Math.sqrt(Math.PI / (2 * x));
    ret *= cyl_neumann(n + 0.5, x);
    return ret;
  }
  function cyl_bessel_i(n, x) {
    if (x < 0 && Math.floor(n) !== n)
      throw new InvalidArgument(
        `Error on std.cyl_bessel_i(): n must be integer when x is negative -> (n = ${n}, x = ${x}).`,
      );
    else if (x === 0 && n !== 0)
      throw new InvalidArgument(
        `Error on std.cyl_bessel_i(): n must be zero when x is zero -> (n = ${n}, x = ${x}).`,
      );
    if (n === 0.5) return Math.sqrt(2 / (Math.PI * x)) * Math.sinh(x);
    else return _Bessel_i(n, x);
  }
  function _Bessel_i(v, x) {
    return MathUtil.sigma(
      function (k) {
        const numerator = Math.pow(x / 2, v + 2 * k);
        const denominator = MathUtil.factorial(k) * tgamma(v + k + 1);
        return numerator / denominator;
      },
      0,
      INFINITY$1,
    );
  }
  function cyl_bessel_k(n, x) {
    if (x <= 0)
      throw new InvalidArgument(
        `Error on std.cyl_bessel_k(): requires x > 0 -> (x = ${x}).`,
      );
    return _Bessel_k(n, x);
  }
  function _Bessel_k(v, z) {
    let ret = Math.PI / 2;
    ret *= cyl_bessel_i(-v, z) - cyl_bessel_i(v, z);
    ret /= Math.sin(v * Math.PI);
    return ret;
  }
  function ellint_1(k, phi) {
    const formula = function (x) {
      return 1 / _Common_formula(k, x);
    };
    return _Post_process("ellint_1", k, phi, formula);
  }
  function comp_ellint_1(k) {
    return ellint_1(k, Math.PI / 2);
  }
  function ellint_2(k, phi) {
    const formula = function (x) {
      return _Common_formula(k, x);
    };
    return _Post_process("ellint_2", k, phi, formula);
  }
  function comp_ellint_2(k) {
    return ellint_2(k, Math.PI / 2);
  }
  function ellint_3(k, v, phi) {
    const predicator = 1 / Math.pow(Math.sin(phi), 2);
    if (v > predicator)
      throw new InvalidArgument(
        `Error on std.ellint_3(): must be v < (1 / sin^2(phi)) -> (v = ${v}, 1 / sin^2(phi) = ${predicator}).`,
      );
    return _Ellint_3(k, v, phi);
  }
  function comp_ellint_3(k, n) {
    return ellint_3(k, n, Math.PI / 2);
  }
  function _Ellint_3(k, v, phi) {
    const formula = function (x) {
      let denominator = 1 - v * Math.pow(Math.sin(x), 2);
      denominator *= _Common_formula(k, x);
      return 1 / denominator;
    };
    return _Post_process("ellint_3", k, phi, formula);
  }
  function _Common_formula(k, x) {
    return Math.sqrt(1 - Math.pow(k * Math.sin(x), 2));
  }
  function _Post_process(func, k, phi, formula) {
    if (Math.abs(k) > 1)
      throw new InvalidArgument(
        `Error on std.${func}(): must be |k| <= 1 -> (k = ${k}).`,
      );
    const area = MathUtil.integral(formula, 0, phi);
    return phi < 0 ? -area : area;
  }
  function expint(x) {
    if (x === 0) return -Infinity;
    else if (x < 0) return -_E1_G(-x);
    else return _EI_Factorial(x);
  }
  function _EI_Factorial(x) {
    return (
      EULER +
      Math.log(Math.abs(x)) / Math.log(Math.E) +
      MathUtil.sigma(
        function (k) {
          return Math.pow(x, k) / (k * MathUtil.factorial(k));
        },
        1,
        MAX_K,
      )
    );
  }
  function _E1_G(x) {
    const h = _Compute_h(x);
    let ret = G + (1 - G) * Math.pow(Math.E, -x / (1 - G));
    ret = Math.pow(Math.E, -x) / ret;
    let ln = 1 + G / x - (1 - G) / Math.pow(h + B * x, 2);
    ln = Math.log(ln) / Math.log(Math.E);
    return ret * ln;
  }
  function _Compute_h(x) {
    const q = _Compute_q(x);
    const left = 1 / (1 + Math.pow(x, 1.5));
    const right = (H_INF * q) / (1 + q);
    return left + right;
  }
  function _Compute_q(x) {
    return (20 / 47) * Math.pow(x, Math.sqrt(31 / 26));
  }
  const EULER = 0.5772156649015329;
  const MAX_K = 150;
  const G = Math.pow(Math.E, -0.5772156649015329);
  const B = Math.sqrt((2 * (1 - G)) / (G * (2 - G)));
  const H_INF =
    ((1 - G) * (G * G - 6 * G + 12)) / (3 * G * Math.pow(2 - G, 2) * B);
  function hermite(n, x) {
    if ((n = Math.floor(n)) < 0)
      throw new InvalidArgument(
        `Error on std.hermite(): n must be unsigned integer -> (n = ${n}).`,
      );
    const solutions = [1, 2 * x];
    return _Hermite(n, x, solutions);
  }
  function _Hermite(n, x, solutions) {
    if (solutions.length > n) return solutions[n];
    const hn_1 = _Hermite(n - 1, x, solutions);
    const hn_2 = _Hermite(n - 2, x, solutions);
    let ret = x * hn_1 - (n - 1) * hn_2;
    ret *= 2;
    solutions[n] = ret;
    return ret;
  }
  function legendre(n, x) {
    return assoc_legendre(n, 0, x);
  }
  function assoc_legendre(n, m, x) {
    if ((n = Math.floor(n)) < 0 || (m = Math.floor(m)) < 0)
      throw new InvalidArgument(
        `Error on std.assoc_legendre(): both n and m must be unsigned integer -> (n = ${n}, m = ${m}).`,
      );
    else if (Math.abs(x) > 1)
      throw new InvalidArgument(
        `Error on std.assoc_legendre(): must be |x| <= 1 -> (x = ${x}).`,
      );
    const matrix = [[1, x]];
    matrix.length = m + 1;
    for (let i = 1; i < matrix.length; ++i) matrix[i] = [];
    return _Compute_assoc_legendre(n, m, x, matrix);
  }
  function _Compute_legendre(n, x, memory) {
    if (memory.length > n) return memory[n];
    const pn_1 = _Compute_legendre(n - 1, x, memory);
    const pn_2 = _Compute_legendre(n - 2, x, memory);
    let ret = (2 * n - 1) * x * pn_1 - (n - 1) * pn_2;
    ret /= n;
    memory[n] = ret;
    return ret;
  }
  function _Compute_assoc_legendre(n, m, x, matrix) {
    if (n < 0) n = -n - 1;
    if (m === 0) return _Compute_legendre(n, x, matrix[0]);
    else if (matrix[m].length > n && matrix[m][n] !== undefined)
      return matrix[m][n];
    const left =
      (n - m + 1) *
      (n - m + 2) *
      _Compute_assoc_legendre(n + 1, m - 1, x, matrix);
    const right =
      (n + m - 1) * (n + m) * _Compute_assoc_legendre(n - 1, m - 1, x, matrix);
    let ret = (left - right) / (2 * n + 1);
    ret /= Math.sqrt(1 - x * x);
    matrix[m][n] = ret;
    return ret;
  }
  function laguerre(n, x) {
    return assoc_laguerre(n, 0, x);
  }
  function assoc_laguerre(n, m, x) {
    if ((n = Math.floor(n)) < 0 || (m = Math.floor(m)) < 0)
      throw new InvalidArgument(
        `Error on std.assoc_laguerre(): both n and m must be unsigned integer -> (n = ${n}, m = ${m}).`,
      );
    const solutions = [1, -x + m + 1];
    return _Compute_assoc_laguerre(n, m, x, solutions);
  }
  function _Compute_assoc_laguerre(n, m, x, solutions) {
    if (solutions.length > n) return solutions[n];
    const ln_1 = _Compute_assoc_laguerre(n - 1, m, x, solutions);
    const ln_2 = _Compute_assoc_laguerre(n - 2, m, x, solutions);
    let ret = (2 * n - 1 + m - x) * ln_1 - (n + m - 1) * ln_2;
    ret = ret / n;
    solutions[n] = ret;
    return ret;
  }
  function riemann_zeta(arg) {
    if (arg < 0) return _Negative(arg);
    else if (arg === 0) return -0.5;
    else if (arg < 1) return _Fractional(arg);
    else if (arg === 1) return Infinity;
    else return _Positive(arg);
  }
  function _Negative(arg) {
    return (
      Math.pow(2, arg) *
      Math.pow(Math.PI, arg - 1) *
      Math.sin((Math.PI * arg) / 2) *
      tgamma(1 - arg) *
      riemann_zeta(1 - arg)
    );
  }
  function _Fractional(arg) {
    const divider = 1 - Math.pow(2, 1 - arg);
    const sigma = MathUtil.sigma(
      function (n) {
        return Math.pow(-1, n - 1) * Math.pow(n, -arg);
      },
      1,
      INFINITY,
    );
    return sigma / divider;
  }
  function _Positive(arg) {
    return MathUtil.sigma(
      function (n) {
        return Math.pow(n, -arg);
      },
      1,
      INFINITY,
    );
  }
  const INFINITY = 100 * 1e3;
  function sleep_for(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  function sleep_until(at) {
    const now = new Date();
    const ms = at.getTime() - now.getTime();
    return sleep_for(ms);
  }
  async function lock(...items) {
    const promises = [];
    for (const mtx of items) promises.push(mtx.lock());
    await Promise.all(promises);
  }
  async function try_lock(...items) {
    for (let i = 0; i < items.length; ++i)
      if ((await items[i].try_lock()) === false) return i;
    return -1;
  }
  class SharedTimedMutex {
    constructor(source = null) {
      this.source_ = source !== null ? source : this;
      this.queue_ = new List();
      this.writing_ = 0;
      this.reading_ = 0;
    }
    _Current_access_type() {
      return this.queue_.empty() ? null : this.queue_.front().accessType;
    }
    lock() {
      return new Promise((resolve) => {
        const resolver = {
          handler:
            this.writing_++ === 0 && this.reading_ === 0 ? null : resolve,
          accessType: 0,
          lockType: 0,
        };
        this.queue_.push_back(resolver);
        if (resolver.handler === null) resolve();
      });
    }
    async try_lock() {
      if (this.writing_ !== 0 || this.reading_ !== 0) return false;
      this.queue_.push_back({
        handler: null,
        accessType: 0,
        lockType: 1,
      });
      ++this.writing_;
      return true;
    }
    try_lock_for(ms) {
      return new Promise((resolve) => {
        const it = this.queue_.insert(this.queue_.end(), {
          handler:
            this.writing_++ === 0 && this.reading_ === 0 ? null : resolve,
          accessType: 0,
          lockType: 1,
        });
        if (it.value.handler === null) resolve(true);
        else {
          sleep_for(ms).then(() => {
            if (it.value.handler !== null) {
              --this.writing_;
              this._Cancel(it);
            }
          });
        }
      });
    }
    async try_lock_until(at) {
      const now = new Date();
      const ms = at.getTime() - now.getTime();
      return await this.try_lock_for(ms);
    }
    async unlock() {
      if (this._Current_access_type() !== 0)
        throw new InvalidArgument(
          `Error on std.${this.source_.constructor.name}.unlock(): this mutex is free on the unique lock.`,
        );
      --this.writing_;
      this.queue_.pop_front();
      this._Release();
    }
    lock_shared() {
      return new Promise((resolve) => {
        const resolver = {
          handler: this.writing_ === 0 ? null : resolve,
          accessType: 1,
          lockType: 0,
        };
        this.queue_.push_back(resolver);
        ++this.reading_;
        if (resolver.handler === null) resolve();
      });
    }
    async try_lock_shared() {
      if (this.writing_ !== 0) return false;
      ++this.reading_;
      this.queue_.push_back({
        handler: null,
        accessType: 1,
        lockType: 1,
      });
      return true;
    }
    try_lock_shared_for(ms) {
      return new Promise((resolve) => {
        const it = this.queue_.insert(this.queue_.end(), {
          handler: this.writing_ === 0 ? null : resolve,
          accessType: 1,
          lockType: 1,
        });
        ++this.reading_;
        if (it.value.handler === null) resolve(true);
        else {
          sleep_for(ms).then(() => {
            if (it.value.handler !== null) {
              --this.reading_;
              this._Cancel(it);
            }
          });
        }
      });
    }
    async try_lock_shared_until(at) {
      const now = new Date();
      const ms = at.getTime() - now.getTime();
      return await this.try_lock_shared_for(ms);
    }
    async unlock_shared() {
      if (this._Current_access_type() !== 1)
        throw new InvalidArgument(
          `Error on std.${this.source_.constructor.name}.unlock_shared(): this mutex is free on the shared lock.`,
        );
      --this.reading_;
      this.queue_.pop_front();
      this._Release();
    }
    _Release() {
      const current = this._Current_access_type();
      const resolverList = [];
      for (const resolver of this.queue_) {
        if (resolver.accessType !== current) break;
        else if (resolver.handler !== null) {
          resolverList.push({
            ...resolver,
          });
          resolver.handler = null;
        }
        if (resolver.accessType === 0) break;
      }
      for (const resolver of resolverList)
        if (resolver.lockType === 0) resolver.handler();
        else resolver.handler(true);
    }
    _Cancel(it) {
      this.queue_.erase(it);
      const handler = it.value.handler;
      it.value.handler = null;
      const prev = it.prev();
      if (
        prev.equals(this.queue_.end()) === false &&
        prev.value.handler === null
      )
        this._Release();
      handler(false);
    }
  }
  class Mutex {
    constructor() {
      this.mutex_ = new SharedTimedMutex(this);
    }
    lock() {
      return this.mutex_.lock();
    }
    try_lock() {
      return this.mutex_.try_lock();
    }
    unlock() {
      return this.mutex_.unlock();
    }
  }
  class TimedMutex {
    constructor() {
      this.mutex_ = new SharedTimedMutex(this);
    }
    lock() {
      return this.mutex_.lock();
    }
    try_lock() {
      return this.mutex_.try_lock();
    }
    unlock() {
      return this.mutex_.unlock();
    }
    try_lock_for(ms) {
      return this.mutex_.try_lock_for(ms);
    }
    try_lock_until(at) {
      return this.mutex_.try_lock_until(at);
    }
  }
  class SharedMutex {
    constructor() {
      this.mutex_ = new SharedTimedMutex(this);
    }
    lock() {
      return this.mutex_.lock();
    }
    try_lock() {
      return this.mutex_.try_lock();
    }
    unlock() {
      return this.mutex_.unlock();
    }
    lock_shared() {
      return this.mutex_.lock_shared();
    }
    try_lock_shared() {
      return this.mutex_.try_lock_shared();
    }
    unlock_shared() {
      return this.mutex_.unlock_shared();
    }
  }
  class ConditionVariable {
    constructor() {
      this.resolvers_ = new List();
    }
    async wait(predicator) {
      if (!predicator) return await this._Wait();
      while (!(await predicator())) await this._Wait();
    }
    wait_for(ms, predicator) {
      const at = new Date(Date.now() + ms);
      return this.wait_until(at, predicator);
    }
    async wait_until(at, predicator) {
      if (!predicator) return await this._Wait_until(at);
      while (!(await predicator()))
        if (!(await this._Wait_until(at))) return await predicator();
      return true;
    }
    _Wait() {
      return new Promise((resolve) => {
        this.resolvers_.push_back({
          handler: resolve,
          lockType: 0,
        });
      });
    }
    _Wait_until(at) {
      return new Promise((resolve) => {
        const it = this.resolvers_.insert(this.resolvers_.end(), {
          handler: resolve,
          lockType: 1,
        });
        sleep_until(at).then(() => {
          if (it.erased_ === true) return;
          this.resolvers_.erase(it);
          resolve(false);
        });
      });
    }
    async notify_one() {
      if (this.resolvers_.empty()) return;
      const it = this.resolvers_.begin();
      this.resolvers_.erase(it);
      if (it.value.lockType === 0) it.value.handler();
      else it.value.handler(true);
    }
    async notify_all() {
      if (this.resolvers_.empty()) return;
      const resolverList = this.resolvers_.toJSON();
      this.resolvers_.clear();
      for (const resolver of resolverList)
        if (resolver.lockType === 0) resolver.handler();
        else resolver.handler(true);
    }
  }
  var SafeLock;
  (function (SafeLock) {
    async function lock(locker, unlocker, lambda) {
      await locker();
      await _Process(unlocker, lambda);
    }
    SafeLock.lock = lock;
    async function try_lock(locker, unlocker, lambda) {
      if ((await locker()) === false) return false;
      await _Process(unlocker, lambda);
      return true;
    }
    SafeLock.try_lock = try_lock;
    async function _Process(unlocker, lambda) {
      try {
        await lambda();
      } catch (error) {
        await unlocker();
        throw error;
      }
      await unlocker();
    }
  })(SafeLock || (SafeLock = {}));
  class UniqueLock {}
  (function (UniqueLock) {
    function lock(mutex, closure) {
      return SafeLock.lock(
        () => mutex.lock(),
        () => mutex.unlock(),
        closure,
      );
    }
    UniqueLock.lock = lock;
    function try_lock(mutex, closure) {
      return SafeLock.try_lock(
        () => mutex.try_lock(),
        () => mutex.unlock(),
        closure,
      );
    }
    UniqueLock.try_lock = try_lock;
    function try_lock_for(mutex, ms, closure) {
      return SafeLock.try_lock(
        () => mutex.try_lock_for(ms),
        () => mutex.unlock(),
        closure,
      );
    }
    UniqueLock.try_lock_for = try_lock_for;
    function try_lock_until(mutex, at, closure) {
      return SafeLock.try_lock(
        () => mutex.try_lock_until(at),
        () => mutex.unlock(),
        closure,
      );
    }
    UniqueLock.try_lock_until = try_lock_until;
  })(UniqueLock || (UniqueLock = {}));
  class SharedLock {}
  (function (SharedLock) {
    function lock(mutex, closure) {
      return SafeLock.lock(
        () => mutex.lock_shared(),
        () => mutex.unlock_shared(),
        closure,
      );
    }
    SharedLock.lock = lock;
    function try_lock(mutex, closure) {
      return SafeLock.try_lock(
        () => mutex.try_lock_shared(),
        () => mutex.unlock_shared(),
        closure,
      );
    }
    SharedLock.try_lock = try_lock;
    function try_lock_for(mutex, ms, closure) {
      return SafeLock.try_lock(
        () => mutex.try_lock_shared_for(ms),
        () => mutex.unlock_shared(),
        closure,
      );
    }
    SharedLock.try_lock_for = try_lock_for;
    function try_lock_until(mutex, at, closure) {
      return SafeLock.try_lock(
        () => mutex.try_lock_shared_until(at),
        () => mutex.unlock_shared(),
        closure,
      );
    }
    SharedLock.try_lock_until = try_lock_until;
  })(SharedLock || (SharedLock = {}));
  class Semaphore {
    constructor(max) {
      this.queue_ = new List();
      this.acquiring_ = 0;
      this.max_ = max;
    }
    max() {
      return this.max_;
    }
    acquire() {
      return new Promise((resolve) => {
        if (this.acquiring_ < this.max_) {
          ++this.acquiring_;
          resolve();
        } else {
          this.queue_.push_back({
            handler: resolve,
            lockType: 0,
          });
        }
      });
    }
    async try_acquire() {
      if (this.acquiring_ < this.max_) {
        ++this.acquiring_;
        return true;
      } else return false;
    }
    async try_acquire_for(ms) {
      return new Promise((resolve) => {
        if (this.acquiring_ < this.max_) {
          ++this.acquiring_;
          resolve(true);
        } else {
          const it = this.queue_.insert(this.queue_.end(), {
            handler: resolve,
            lockType: 1,
          });
          sleep_for(ms).then(() => {
            if (it.value.handler !== null) this._Cancel(it);
          });
        }
      });
    }
    try_acquire_until(at) {
      const now = new Date();
      const ms = at.getTime() - now.getTime();
      return this.try_acquire_for(ms);
    }
    async release(n = 1) {
      if (n < 1)
        throw new InvalidArgument(
          `Error on std.Semaphore.release(): parametric n is less than 1 -> (n = ${n}).`,
        );
      else if (n > this.max_)
        throw new OutOfRange(
          `Error on std.Semaphore.release(): parametric n is greater than max -> (n = ${n}, max = ${this.max_}).`,
        );
      else if (n > this.acquiring_)
        throw new OutOfRange(
          `Error on std.Semaphore.release(): parametric n is greater than acquiring -> (n = ${n}, acquiring = ${this.acquiring_}).`,
        );
      const resolverList = [];
      while (this.queue_.empty() === false && resolverList.length < n) {
        const resolver = this.queue_.front();
        if (resolver.handler !== null)
          resolverList.push({
            ...resolver,
          });
        this.queue_.pop_front();
        resolver.handler = null;
      }
      this.acquiring_ -= n - resolverList.length;
      for (const resolver of resolverList)
        if (resolver.lockType === 0) resolver.handler();
        else resolver.handler(true);
    }
    _Cancel(it) {
      const handler = it.value.handler;
      it.value.handler = null;
      this.queue_.erase(it);
      handler(false);
    }
  }
  (function (Semaphore) {
    function get_lockable(semaphore) {
      return new Lockable(semaphore);
    }
    Semaphore.get_lockable = get_lockable;
    class Lockable {
      constructor(semaphore) {
        this.semahpore_ = semaphore;
      }
      lock() {
        return this.semahpore_.acquire();
      }
      unlock() {
        return this.semahpore_.release();
      }
      try_lock() {
        return this.semahpore_.try_acquire();
      }
      try_lock_for(ms) {
        return this.semahpore_.try_acquire_for(ms);
      }
      try_lock_until(at) {
        return this.semahpore_.try_acquire_until(at);
      }
    }
    Semaphore.Lockable = Lockable;
  })(Semaphore || (Semaphore = {}));
  class Latch {
    constructor(size) {
      this.cv_ = new ConditionVariable();
      this.count_ = size;
    }
    async wait() {
      if (this._Try_wait() === false) await this.cv_.wait();
    }
    async try_wait() {
      return this._Try_wait();
    }
    async wait_for(ms) {
      if (this._Try_wait() === true) return true;
      else return await this.cv_.wait_for(ms);
    }
    async wait_until(at) {
      if (this._Try_wait() === true) return true;
      else return await this.cv_.wait_until(at);
    }
    _Try_wait() {
      return this.count_ <= 0;
    }
    async count_down(n = 1) {
      this.count_ -= n;
      if (this._Try_wait() === true) await this.cv_.notify_all();
    }
    async arrive_and_wait(n = 1) {
      await this.count_down(n);
      await this.wait();
    }
  }
  class Barrier {
    constructor(size) {
      this.cv_ = new ConditionVariable();
      this.size_ = size;
      this.count_ = size;
    }
    wait() {
      return this.cv_.wait();
    }
    wait_for(ms) {
      return this.cv_.wait_for(ms);
    }
    wait_until(at) {
      return this.cv_.wait_until(at);
    }
    async arrive(n = 1) {
      const completed = (this.count_ += n) <= this.size_;
      if (completed === false) return;
      this.count_ %= this.size_;
      await this.cv_.notify_all();
    }
    async arrive_and_wait() {
      await this.arrive();
      await this.wait();
    }
    async arrive_and_drop() {
      --this.size_;
      await this.arrive(0);
    }
  }
  class MutableSingleton {
    constructor(closure) {
      this.closure_ = closure;
      this.mutex_ = new SharedMutex();
      this.value_ = NOT_MOUNTED_YET$1;
    }
    async reload(...args) {
      let output;
      await UniqueLock.lock(this.mutex_, async () => {
        output = await this.closure_(...args);
        this.value_ = output;
      });
      return output;
    }
    async set(value) {
      await UniqueLock.lock(this.mutex_, () => {
        this.value_ = value;
      });
    }
    async clear() {
      await UniqueLock.lock(this.mutex_, () => {
        this.value_ = NOT_MOUNTED_YET$1;
      });
    }
    async get(...args) {
      let output = NOT_MOUNTED_YET$1;
      await SharedLock.lock(this.mutex_, async () => {
        output = this.value_;
      });
      if (output === NOT_MOUNTED_YET$1)
        await UniqueLock.lock(this.mutex_, async () => {
          if (this.value_ !== NOT_MOUNTED_YET$1) {
            output = this.value_;
            return;
          }
          output = await this.closure_(...args);
          this.value_ = output;
        });
      return output;
    }
    async is_loaded() {
      let loaded = false;
      await SharedLock.lock(this.mutex_, async () => {
        loaded = this.value_ !== NOT_MOUNTED_YET$1;
      });
      return loaded;
    }
  }
  const NOT_MOUNTED_YET$1 = {};
  class TimedSingleton {
    constructor(interval, closure) {
      this.interval_ = interval;
      this.closure_ = closure;
      this.value_ = null;
      this.expired_at_ = 0;
    }
    get(...args) {
      if (Date.now() >= this.expired_at_) {
        this.expired_at_ = Date.now() + this.interval_;
        this.value_ = this.closure_(...args);
      }
      return this.value_;
    }
  }
  class VariadicMutableSingleton {
    constructor(closure, hashFunc = (args) => hash(...args), pred = equal) {
      this.closure_ = closure;
      this.dict_ = new HashMap(hashFunc, pred);
    }
    set(...items) {
      const args = items.slice(0, items.length - 1);
      const value = items[items.length - 1];
      return this._Get_singleton(args).set(value);
    }
    reload(...args) {
      return this._Get_singleton(args).reload(...args);
    }
    async clear(...args) {
      if (args.length === 0) this.dict_.clear();
      else await this._Get_singleton(args).clear();
    }
    get(...args) {
      return this._Get_singleton(args).get(...args);
    }
    is_loaded(...args) {
      return this._Get_singleton(args).is_loaded();
    }
    _Get_singleton(args) {
      let it = this.dict_.find(args);
      if (it.equals(this.dict_.end()) === true)
        it = this.dict_.emplace(
          args,
          new MutableSingleton(this.closure_),
        ).first;
      return it.second;
    }
  }
  class VariadicTimedSingleton {
    constructor(
      interval,
      closure,
      hasher = (args) => hash(...args),
      pred = equal,
    ) {
      this.interval_ = interval;
      this.closure_ = closure;
      this.dict_ = new HashMap(hasher, pred);
    }
    get(...args) {
      let it = this.dict_.find(args);
      if (it.equals(this.dict_.end()) == true) {
        const singleton = new TimedSingleton(this.interval_, this.closure_);
        it = this.dict_.emplace(args, singleton).first;
      }
      return it.second.get(...args);
    }
  }
  class Singleton {
    constructor(closure) {
      this.closure_ = closure;
      this.value_ = NOT_MOUNTED_YET;
    }
    get(...args) {
      if (this.value_ === NOT_MOUNTED_YET) this.value_ = this.closure_(...args);
      return this.value_;
    }
  }
  const NOT_MOUNTED_YET = {};
  class VariadicSingleton {
    constructor(closure, hashFunc = (args) => hash(...args), pred = equal) {
      this.closure_ = closure;
      this.dict_ = new HashMap(hashFunc, pred);
    }
    get(...args) {
      let it = this.dict_.find(args);
      if (it.equals(this.dict_.end()) == true)
        it = this.dict_.emplace(args, new Singleton(this.closure_)).first;
      return it.second.get(...args);
    }
  }
  var std = Object.freeze({
    __proto__: null,
    BackInsertIterator,
    Barrier,
    ConditionVariable,
    get Deque() {
      return Deque;
    },
    DomainError,
    Entry,
    ErrorCategory,
    ErrorCode,
    ErrorCondition,
    Exception,
    get ForwardList() {
      return ForwardList;
    },
    FrontInsertIterator,
    get HashMap() {
      return HashMap;
    },
    get HashMultiMap() {
      return HashMultiMap;
    },
    get HashMultiSet() {
      return HashMultiSet;
    },
    get HashSet() {
      return HashSet;
    },
    InsertIterator,
    InvalidArgument,
    Latch,
    LengthError,
    get List() {
      return List;
    },
    LogicError,
    MutableSingleton,
    Mutex,
    OutOfRange,
    OverflowError,
    Pair,
    PriorityQueue,
    Queue,
    RangeError,
    RuntimeError,
    get Semaphore() {
      return Semaphore;
    },
    get SharedLock() {
      return SharedLock;
    },
    SharedMutex,
    SharedTimedMutex,
    Singleton,
    Stack,
    SystemError,
    TimedMutex,
    TimedSingleton,
    get TreeMap() {
      return TreeMap;
    },
    get TreeMultiMap() {
      return TreeMultiMap;
    },
    get TreeMultiSet() {
      return TreeMultiSet;
    },
    get TreeSet() {
      return TreeSet;
    },
    UnderflowError,
    get UniqueLock() {
      return UniqueLock;
    },
    VariadicMutableSingleton,
    VariadicSingleton,
    VariadicTimedSingleton,
    get Vector() {
      return Vector;
    },
    get VectorBoolean() {
      return VectorBoolean;
    },
    accumulate: accumulate$1,
    adjacent_difference: adjacent_difference$1,
    adjacent_find: adjacent_find$1,
    advance,
    all_of: all_of$1,
    any_of: any_of$1,
    assoc_laguerre,
    assoc_legendre,
    back_inserter,
    base: module$2,
    begin,
    beta,
    binary_search: binary_search$1,
    bit_and,
    bit_or,
    bit_xor,
    clamp,
    comp_ellint_1,
    comp_ellint_2,
    comp_ellint_3,
    copy: copy$1,
    copy_backward: copy_backward$1,
    copy_if: copy_if$1,
    copy_n: copy_n$1,
    count: count$1,
    count_if: count_if$1,
    cyl_bessel_i,
    cyl_bessel_j,
    cyl_bessel_k,
    cyl_neumann,
    distance,
    divides,
    ellint_1,
    ellint_2,
    ellint_3,
    empty,
    end,
    equal: equal$1,
    equal_range: equal_range$1,
    equal_to,
    exclusive_scan: exclusive_scan$1,
    experimental: module$1,
    expint,
    fill: fill$1,
    fill_n: fill_n$1,
    find: find$1,
    find_end: find_end$1,
    find_first_of: find_first_of$1,
    find_if: find_if$1,
    find_if_not: find_if_not$1,
    for_each: for_each$1,
    for_each_n: for_each_n$1,
    front_inserter,
    gcd,
    generate: generate$1,
    generate_n: generate_n$1,
    get_uid,
    greater,
    greater_equal,
    hash,
    hermite,
    includes: includes$1,
    inclusive_scan: inclusive_scan$1,
    inner_product: inner_product$1,
    inplace_merge: inplace_merge$1,
    inserter,
    iota: iota$1,
    is_heap: is_heap$1,
    is_heap_until: is_heap_until$1,
    is_node,
    is_partitioned: is_partitioned$1,
    is_permutation: is_permutation$1,
    is_sorted: is_sorted$1,
    is_sorted_until: is_sorted_until$1,
    is_unique: is_unique$1,
    iter_swap,
    laguerre,
    lcm,
    legendre,
    less,
    less_equal,
    lexicographical_compare: lexicographical_compare$1,
    lgamma,
    lock,
    logical_and,
    logical_not,
    logical_or,
    lower_bound: lower_bound$1,
    make_heap: make_heap$1,
    make_pair,
    make_reverse_iterator,
    max,
    max_element: max_element$1,
    merge: merge$1,
    min,
    min_element: min_element$1,
    minmax,
    minmax_element: minmax_element$1,
    minus,
    mismatch: mismatch$1,
    modules,
    multiplies,
    negate,
    next,
    next_permutation: next_permutation$1,
    none_of: none_of$1,
    not_equal_to,
    nth_element: nth_element$1,
    partial_sort: partial_sort$1,
    partial_sort_copy: partial_sort_copy$1,
    partial_sum: partial_sum$1,
    partition: partition$1,
    partition_copy: partition_copy$1,
    partition_point: partition_point$1,
    plus,
    pop_heap: pop_heap$1,
    prev,
    prev_permutation: prev_permutation$1,
    push_heap: push_heap$1,
    randint,
    ranges: module,
    rbegin,
    remove: remove$1,
    remove_copy: remove_copy$1,
    remove_copy_if: remove_copy_if$1,
    remove_if: remove_if$1,
    rend,
    replace: replace$1,
    replace_copy: replace_copy$1,
    replace_copy_if: replace_copy_if$1,
    replace_if: replace_if$1,
    reverse: reverse$1,
    reverse_copy: reverse_copy$1,
    riemann_zeta,
    rotate: rotate$1,
    rotate_copy: rotate_copy$1,
    sample: sample$1,
    search: search$1,
    search_n: search_n$1,
    set_difference: set_difference$1,
    set_intersection: set_intersection$1,
    set_symmetric_difference: set_symmetric_difference$1,
    set_union: set_union$1,
    shift_left: shift_left$1,
    shift_right: shift_right$1,
    shuffle: shuffle$1,
    size,
    sleep_for,
    sleep_until,
    sort: sort$1,
    sort_heap: sort_heap$1,
    sph_bessel,
    sph_neumann,
    stable_partition: stable_partition$1,
    stable_sort: stable_sort$1,
    swap_ranges: swap_ranges$1,
    tgamma,
    transform: transform$1,
    transform_exclusive_scan: transform_exclusive_scan$1,
    transform_inclusive_scan: transform_inclusive_scan$1,
    try_lock,
    unique: unique$1,
    unique_copy: unique_copy$1,
    upper_bound: upper_bound$1,
  });
  exports.BackInsertIterator = BackInsertIterator;
  exports.Barrier = Barrier;
  exports.ConditionVariable = ConditionVariable;
  exports.Deque = Deque;
  exports.DomainError = DomainError;
  exports.Entry = Entry;
  exports.ErrorCategory = ErrorCategory;
  exports.ErrorCode = ErrorCode;
  exports.ErrorCondition = ErrorCondition;
  exports.Exception = Exception;
  exports.ForwardList = ForwardList;
  exports.FrontInsertIterator = FrontInsertIterator;
  exports.HashMap = HashMap;
  exports.HashMultiMap = HashMultiMap;
  exports.HashMultiSet = HashMultiSet;
  exports.HashSet = HashSet;
  exports.InsertIterator = InsertIterator;
  exports.InvalidArgument = InvalidArgument;
  exports.Latch = Latch;
  exports.LengthError = LengthError;
  exports.List = List;
  exports.LogicError = LogicError;
  exports.MutableSingleton = MutableSingleton;
  exports.Mutex = Mutex;
  exports.OutOfRange = OutOfRange;
  exports.OverflowError = OverflowError;
  exports.Pair = Pair;
  exports.PriorityQueue = PriorityQueue;
  exports.Queue = Queue;
  exports.RangeError = RangeError;
  exports.RuntimeError = RuntimeError;
  exports.Semaphore = Semaphore;
  exports.SharedLock = SharedLock;
  exports.SharedMutex = SharedMutex;
  exports.SharedTimedMutex = SharedTimedMutex;
  exports.Singleton = Singleton;
  exports.Stack = Stack;
  exports.SystemError = SystemError;
  exports.TimedMutex = TimedMutex;
  exports.TimedSingleton = TimedSingleton;
  exports.TreeMap = TreeMap;
  exports.TreeMultiMap = TreeMultiMap;
  exports.TreeMultiSet = TreeMultiSet;
  exports.TreeSet = TreeSet;
  exports.UnderflowError = UnderflowError;
  exports.UniqueLock = UniqueLock;
  exports.VariadicMutableSingleton = VariadicMutableSingleton;
  exports.VariadicSingleton = VariadicSingleton;
  exports.VariadicTimedSingleton = VariadicTimedSingleton;
  exports.Vector = Vector;
  exports.VectorBoolean = VectorBoolean;
  exports.accumulate = accumulate$1;
  exports.adjacent_difference = adjacent_difference$1;
  exports.adjacent_find = adjacent_find$1;
  exports.advance = advance;
  exports.all_of = all_of$1;
  exports.any_of = any_of$1;
  exports.assoc_laguerre = assoc_laguerre;
  exports.assoc_legendre = assoc_legendre;
  exports.back_inserter = back_inserter;
  exports.base = module$2;
  exports.begin = begin;
  exports.beta = beta;
  exports.binary_search = binary_search$1;
  exports.bit_and = bit_and;
  exports.bit_or = bit_or;
  exports.bit_xor = bit_xor;
  exports.clamp = clamp;
  exports.comp_ellint_1 = comp_ellint_1;
  exports.comp_ellint_2 = comp_ellint_2;
  exports.comp_ellint_3 = comp_ellint_3;
  exports.copy = copy$1;
  exports.copy_backward = copy_backward$1;
  exports.copy_if = copy_if$1;
  exports.copy_n = copy_n$1;
  exports.count = count$1;
  exports.count_if = count_if$1;
  exports.cyl_bessel_i = cyl_bessel_i;
  exports.cyl_bessel_j = cyl_bessel_j;
  exports.cyl_bessel_k = cyl_bessel_k;
  exports.cyl_neumann = cyl_neumann;
  exports.default = std;
  exports.distance = distance;
  exports.divides = divides;
  exports.ellint_1 = ellint_1;
  exports.ellint_2 = ellint_2;
  exports.ellint_3 = ellint_3;
  exports.empty = empty;
  exports.end = end;
  exports.equal = equal$1;
  exports.equal_range = equal_range$1;
  exports.equal_to = equal_to;
  exports.exclusive_scan = exclusive_scan$1;
  exports.experimental = module$1;
  exports.expint = expint;
  exports.fill = fill$1;
  exports.fill_n = fill_n$1;
  exports.find = find$1;
  exports.find_end = find_end$1;
  exports.find_first_of = find_first_of$1;
  exports.find_if = find_if$1;
  exports.find_if_not = find_if_not$1;
  exports.for_each = for_each$1;
  exports.for_each_n = for_each_n$1;
  exports.front_inserter = front_inserter;
  exports.gcd = gcd;
  exports.generate = generate$1;
  exports.generate_n = generate_n$1;
  exports.get_uid = get_uid;
  exports.greater = greater;
  exports.greater_equal = greater_equal;
  exports.hash = hash;
  exports.hermite = hermite;
  exports.includes = includes$1;
  exports.inclusive_scan = inclusive_scan$1;
  exports.inner_product = inner_product$1;
  exports.inplace_merge = inplace_merge$1;
  exports.inserter = inserter;
  exports.iota = iota$1;
  exports.is_heap = is_heap$1;
  exports.is_heap_until = is_heap_until$1;
  exports.is_node = is_node;
  exports.is_partitioned = is_partitioned$1;
  exports.is_permutation = is_permutation$1;
  exports.is_sorted = is_sorted$1;
  exports.is_sorted_until = is_sorted_until$1;
  exports.is_unique = is_unique$1;
  exports.iter_swap = iter_swap;
  exports.laguerre = laguerre;
  exports.lcm = lcm;
  exports.legendre = legendre;
  exports.less = less;
  exports.less_equal = less_equal;
  exports.lexicographical_compare = lexicographical_compare$1;
  exports.lgamma = lgamma;
  exports.lock = lock;
  exports.logical_and = logical_and;
  exports.logical_not = logical_not;
  exports.logical_or = logical_or;
  exports.lower_bound = lower_bound$1;
  exports.make_heap = make_heap$1;
  exports.make_pair = make_pair;
  exports.make_reverse_iterator = make_reverse_iterator;
  exports.max = max;
  exports.max_element = max_element$1;
  exports.merge = merge$1;
  exports.min = min;
  exports.min_element = min_element$1;
  exports.minmax = minmax;
  exports.minmax_element = minmax_element$1;
  exports.minus = minus;
  exports.mismatch = mismatch$1;
  exports.modules = modules;
  exports.multiplies = multiplies;
  exports.negate = negate;
  exports.next = next;
  exports.next_permutation = next_permutation$1;
  exports.none_of = none_of$1;
  exports.not_equal_to = not_equal_to;
  exports.nth_element = nth_element$1;
  exports.partial_sort = partial_sort$1;
  exports.partial_sort_copy = partial_sort_copy$1;
  exports.partial_sum = partial_sum$1;
  exports.partition = partition$1;
  exports.partition_copy = partition_copy$1;
  exports.partition_point = partition_point$1;
  exports.plus = plus;
  exports.pop_heap = pop_heap$1;
  exports.prev = prev;
  exports.prev_permutation = prev_permutation$1;
  exports.push_heap = push_heap$1;
  exports.randint = randint;
  exports.ranges = module;
  exports.rbegin = rbegin;
  exports.remove = remove$1;
  exports.remove_copy = remove_copy$1;
  exports.remove_copy_if = remove_copy_if$1;
  exports.remove_if = remove_if$1;
  exports.rend = rend;
  exports.replace = replace$1;
  exports.replace_copy = replace_copy$1;
  exports.replace_copy_if = replace_copy_if$1;
  exports.replace_if = replace_if$1;
  exports.reverse = reverse$1;
  exports.reverse_copy = reverse_copy$1;
  exports.riemann_zeta = riemann_zeta;
  exports.rotate = rotate$1;
  exports.rotate_copy = rotate_copy$1;
  exports.sample = sample$1;
  exports.search = search$1;
  exports.search_n = search_n$1;
  exports.set_difference = set_difference$1;
  exports.set_intersection = set_intersection$1;
  exports.set_symmetric_difference = set_symmetric_difference$1;
  exports.set_union = set_union$1;
  exports.shift_left = shift_left$1;
  exports.shift_right = shift_right$1;
  exports.shuffle = shuffle$1;
  exports.size = size;
  exports.sleep_for = sleep_for;
  exports.sleep_until = sleep_until;
  exports.sort = sort$1;
  exports.sort_heap = sort_heap$1;
  exports.sph_bessel = sph_bessel;
  exports.sph_neumann = sph_neumann;
  exports.stable_partition = stable_partition$1;
  exports.stable_sort = stable_sort$1;
  exports.swap_ranges = swap_ranges$1;
  exports.tgamma = tgamma;
  exports.transform = transform$1;
  exports.transform_exclusive_scan = transform_exclusive_scan$1;
  exports.transform_inclusive_scan = transform_inclusive_scan$1;
  exports.try_lock = try_lock;
  exports.unique = unique$1;
  exports.unique_copy = unique_copy$1;
  exports.upper_bound = upper_bound$1;
  Object.defineProperty(exports, "__esModule", {
    value: true,
  });
});
//# sourceMappingURL=index.js.map

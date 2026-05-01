class FakeFieldValueSentinel {
  constructor(kind, payload = {}) {
    this.kind = kind;
    Object.assign(this, payload);
  }
}

class FakeTimestamp {
  constructor(value) {
    this.value = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  }

  toDate() {
    return new Date(this.value.getTime());
  }
}

const FieldValue = {
  serverTimestamp() {
    return new FakeFieldValueSentinel("serverTimestamp");
  },
  arrayUnion(...values) {
    return new FakeFieldValueSentinel("arrayUnion", { values });
  },
};

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof FakeFieldValueSentinel) &&
    !(value instanceof FakeTimestamp)
  );
}

class FakeFirestore {
  constructor(seed = {}, options = {}) {
    this.collections = new Map();
    this.docCounter = 1;
    this.timeCursor = new Date(options.now || "2026-04-30T00:00:00.000Z");

    for (const [collectionPath, docs] of Object.entries(seed)) {
      const target = this._ensureCollection(collectionPath);
      for (const [id, data] of Object.entries(docs || {})) {
        target.set(id, this._clone(data));
      }
    }
  }

  collection(path) {
    return new FakeCollectionRef(this, path);
  }

  batch() {
    const operations = [];
    return {
      set: (ref, data, options) => {
        operations.push(() => ref.set(data, options));
      },
      async commit() {
        for (const operation of operations) {
          await operation();
        }
      },
    };
  }

  async runTransaction(handler) {
    const operations = [];
    const transaction = {
      get: async (ref) => ref.get(),
      set: (ref, data, options) => {
        operations.push(() => ref.set(data, options));
      },
      update: (ref, data) => {
        operations.push(() => ref.update(data));
      },
    };

    const result = await handler(transaction);
    for (const operation of operations) {
      await operation();
    }
    return result;
  }

  seedDoc(collectionPath, id, data) {
    this._ensureCollection(collectionPath).set(id, this._clone(data));
  }

  getDocData(collectionPath, id) {
    const collection = this.collections.get(collectionPath);
    if (!collection || !collection.has(id)) return null;
    return this._clone(collection.get(id));
  }

  listDocData(collectionPath) {
    const collection = this.collections.get(collectionPath);
    if (!collection) return [];
    return [...collection.entries()].map(([id, data]) => ({ id, ...this._clone(data) }));
  }

  _ensureCollection(path) {
    if (!this.collections.has(path)) {
      this.collections.set(path, new Map());
    }
    return this.collections.get(path);
  }

  _generateId() {
    const id = `auto-${this.docCounter}`;
    this.docCounter += 1;
    return id;
  }

  _nextTimestampIso() {
    const value = this.timeCursor.toISOString();
    this.timeCursor = new Date(this.timeCursor.getTime() + 1000);
    return value;
  }

  _clone(value) {
    if (Array.isArray(value)) {
      return value.map((entry) => this._clone(entry));
    }
    if (value instanceof Date) {
      return new Date(value.getTime());
    }
    if (value instanceof FakeTimestamp) {
      return new FakeTimestamp(value.toDate());
    }
    if (isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, this._clone(entry)])
      );
    }
    return value;
  }

  _materializeValue(value, existingValue) {
    if (value instanceof FakeFieldValueSentinel) {
      if (value.kind === "serverTimestamp") {
        return this._nextTimestampIso();
      }
      if (value.kind === "arrayUnion") {
        const current = Array.isArray(existingValue) ? [...existingValue] : [];
        for (const entry of value.values) {
          if (!current.some((item) => JSON.stringify(item) === JSON.stringify(entry))) {
            current.push(this._clone(entry));
          }
        }
        return current;
      }
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this._materializeValue(entry, undefined));
    }

    if (isPlainObject(value)) {
      const result = {};
      const source = isPlainObject(existingValue) ? existingValue : {};
      for (const [key, entry] of Object.entries(value)) {
        result[key] = this._materializeValue(entry, source[key]);
      }
      return result;
    }

    return this._clone(value);
  }

  _applySet(currentValue, patchValue, merge) {
    if (!merge) {
      return this._materializeValue(patchValue, currentValue);
    }

    const next = isPlainObject(currentValue) ? this._clone(currentValue) : {};
    for (const [key, value] of Object.entries(patchValue || {})) {
      const existing = next[key];
      if (isPlainObject(value) && isPlainObject(existing)) {
        next[key] = this._applySet(existing, value, true);
      } else {
        next[key] = this._materializeValue(value, existing);
      }
    }
    return next;
  }
}

class FakeCollectionRef {
  constructor(firestore, path) {
    this.firestore = firestore;
    this.path = path;
  }

  doc(id) {
    return new FakeDocRef(this.firestore, this.path, id || this.firestore._generateId());
  }

  async add(data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }

  where(field, operator, value) {
    return new FakeQueryRef(this.firestore, this.path, [
      { field, operator, value },
    ]);
  }

  orderBy(field, direction = "asc") {
    return new FakeQueryRef(this.firestore, this.path, [], {
      field,
      direction,
    });
  }

  limit(count) {
    return new FakeQueryRef(this.firestore, this.path, [], null, count);
  }

  async get() {
    return new FakeQueryRef(this.firestore, this.path).get();
  }
}

class FakeDocRef {
  constructor(firestore, collectionPath, id) {
    this.firestore = firestore;
    this.collectionPath = collectionPath;
    this.id = id;
  }

  async get() {
    const collection = this.firestore._ensureCollection(this.collectionPath);
    const exists = collection.has(this.id);
    const data = exists ? this.firestore._clone(collection.get(this.id)) : undefined;
    return {
      id: this.id,
      exists,
      ref: this,
      data: () => data,
    };
  }

  async set(data, options = {}) {
    const collection = this.firestore._ensureCollection(this.collectionPath);
    const current = collection.has(this.id) ? collection.get(this.id) : undefined;
    const next = this.firestore._applySet(current, data, Boolean(options && options.merge));
    collection.set(this.id, next);
  }

  async update(data) {
    const collection = this.firestore._ensureCollection(this.collectionPath);
    if (!collection.has(this.id)) {
      throw new Error(`Document ${this.collectionPath}/${this.id} does not exist`);
    }
    const current = collection.get(this.id);
    const next = this.firestore._applySet(current, data, true);
    collection.set(this.id, next);
  }

  async delete() {
    this.firestore._ensureCollection(this.collectionPath).delete(this.id);
  }

  collection(name) {
    return new FakeCollectionRef(
      this.firestore,
      `${this.collectionPath}/${this.id}/${name}`
    );
  }
}

class FakeQueryRef {
  constructor(firestore, path, conditions = [], orderByClause = null, limitCount = null) {
    this.firestore = firestore;
    this.path = path;
    this.conditions = conditions;
    this.orderByClause = orderByClause;
    this.limitCount = limitCount;
  }

  where(field, operator, value) {
    return new FakeQueryRef(
      this.firestore,
      this.path,
      [...this.conditions, { field, operator, value }],
      this.orderByClause,
      this.limitCount
    );
  }

  orderBy(field, direction = "asc") {
    return new FakeQueryRef(
      this.firestore,
      this.path,
      this.conditions,
      { field, direction },
      this.limitCount
    );
  }

  limit(count) {
    return new FakeQueryRef(
      this.firestore,
      this.path,
      this.conditions,
      this.orderByClause,
      count
    );
  }

  async get() {
    const collection = this.firestore._ensureCollection(this.path);
    let docs = [...collection.entries()].map(([id, data]) => ({
      id,
      ref: new FakeDocRef(this.firestore, this.path, id),
      data: () => this.firestore._clone(data),
    }));

    for (const condition of this.conditions) {
      if (condition.operator !== "==") {
        throw new Error(`Unsupported operator ${condition.operator}`);
      }
      docs = docs.filter((doc) => doc.data()?.[condition.field] === condition.value);
    }

    if (this.orderByClause) {
      const { field, direction } = this.orderByClause;
      docs.sort((a, b) => {
        const aValue = String(a.data()?.[field] ?? "");
        const bValue = String(b.data()?.[field] ?? "");
        return direction === "desc" ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
      });
    }

    if (typeof this.limitCount === "number") {
      docs = docs.slice(0, this.limitCount);
    }

    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
    };
  }
}

module.exports = {
  FakeFirestore,
  FakeTimestamp,
  FieldValue,
};

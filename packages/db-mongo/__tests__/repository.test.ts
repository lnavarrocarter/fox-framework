import { MongoRepository } from '../src/repository';
import { createMockCollection } from './helpers/mongo-mock';

// Mock ObjectId so it's testable without a real MongoDB connection
jest.mock('mongodb', () => {
  class ObjectId {
    private id: string;
    constructor(id?: string) {
      this.id = id ?? 'generated-id';
    }
    toString() {
      return this.id;
    }
  }
  return { ObjectId };
});

type User = { id?: string; name: string; email: string };

function makeDoc(id: string, name: string, email: string) {
  const { ObjectId } = require('mongodb');
  return { _id: new ObjectId(id), name, email };
}

describe('MongoRepository', () => {
  let mockCollection: ReturnType<typeof createMockCollection>;
  let repo: MongoRepository<User>;

  beforeEach(() => {
    mockCollection = createMockCollection();
    repo = new MongoRepository<User>(() => mockCollection as any);
  });

  describe('findById()', () => {
    it('returns the serialized document when found', async () => {
      const doc = makeDoc('abc123', 'Alice', 'alice@example.com');
      mockCollection.findOne.mockResolvedValue(doc);

      const result = await repo.findById('abc123');
      expect(result).toEqual({ id: 'abc123', name: 'Alice', email: 'alice@example.com' });
    });

    it('returns null when not found', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findOne()', () => {
    it('returns a serialized document with a filter', async () => {
      const doc = makeDoc('id1', 'Bob', 'bob@example.com');
      mockCollection.findOne.mockResolvedValue(doc);

      const result = await repo.findOne({ name: 'Bob' });
      expect(result).toEqual({ id: 'id1', name: 'Bob', email: 'bob@example.com' });
      expect(mockCollection.findOne).toHaveBeenCalledWith({ name: 'Bob' });
    });

    it('returns null when not found (no filter)', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      const result = await repo.findOne();
      expect(result).toBeNull();
    });
  });

  describe('findAll()', () => {
    it('returns empty array with no options', async () => {
      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      });
      const result = await repo.findAll();
      expect(result).toEqual([]);
    });

    it('returns serialized documents with filter', async () => {
      const docs = [makeDoc('id1', 'Alice', 'a@b.com'), makeDoc('id2', 'Bob', 'b@b.com')];
      const cursor = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(docs),
      };
      mockCollection.find.mockReturnValue(cursor);

      const result = await repo.findAll({ filter: { name: 'Alice' } });
      expect(mockCollection.find).toHaveBeenCalledWith({ name: 'Alice' });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('id1');
    });

    it('applies sort', async () => {
      const cursor = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockCollection.find.mockReturnValue(cursor);

      await repo.findAll({ sort: { name: 1 } });
      expect(cursor.sort).toHaveBeenCalledWith({ name: 1 });
    });

    it('applies limit and skip', async () => {
      const cursor = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockCollection.find.mockReturnValue(cursor);

      await repo.findAll({ limit: 10, skip: 5 });
      expect(cursor.limit).toHaveBeenCalledWith(10);
      expect(cursor.skip).toHaveBeenCalledWith(5);
    });

    it('applies projection', async () => {
      const cursor = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockCollection.find.mockReturnValue(cursor);

      await repo.findAll({ projection: { name: 1 } });
      expect(cursor.project).toHaveBeenCalledWith({ name: 1 });
    });
  });

  describe('create()', () => {
    it('calls insertOne and returns the created document', async () => {
      const { ObjectId } = require('mongodb');
      const insertedId = new ObjectId('newid');
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      const doc = makeDoc('newid', 'Charlie', 'c@c.com');
      mockCollection.findOne.mockResolvedValue(doc);

      const result = await repo.create({ name: 'Charlie', email: 'c@c.com' });
      expect(mockCollection.insertOne).toHaveBeenCalledWith({ name: 'Charlie', email: 'c@c.com' });
      expect(result).toEqual({ id: 'newid', name: 'Charlie', email: 'c@c.com' });
    });
  });

  describe('update()', () => {
    it('calls updateOne and returns the updated document', async () => {
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      const doc = makeDoc('id1', 'Alice Updated', 'a@b.com');
      mockCollection.findOne.mockResolvedValue(doc);

      const result = await repo.update('id1', { name: 'Alice Updated' });
      expect(mockCollection.updateOne).toHaveBeenCalled();
      expect(result).toEqual({ id: 'id1', name: 'Alice Updated', email: 'a@b.com' });
    });

    it('returns null if the document is not found after update', async () => {
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 0 });
      mockCollection.findOne.mockResolvedValue(null);

      const result = await repo.update('nonexistent', { name: 'Ghost' });
      expect(result).toBeNull();
    });
  });

  describe('delete()', () => {
    it('returns true when deletedCount > 0', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      const result = await repo.delete('id1');
      expect(result).toBe(true);
    });

    it('returns false when deletedCount is 0', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });
      const result = await repo.delete('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('count()', () => {
    it('returns count without filter', async () => {
      mockCollection.countDocuments.mockResolvedValue(42);
      const result = await repo.count();
      expect(mockCollection.countDocuments).toHaveBeenCalledWith({});
      expect(result).toBe(42);
    });

    it('returns count with filter', async () => {
      mockCollection.countDocuments.mockResolvedValue(3);
      const result = await repo.count({ name: 'Alice' });
      expect(mockCollection.countDocuments).toHaveBeenCalledWith({ name: 'Alice' });
      expect(result).toBe(3);
    });
  });
});

import { User, IUser, UserRepository } from './user.model';

describe('UserModel', () => {
    it('should create instance with default values', () => {
        const model = new User();
        
        expect(model.createdAt).toBeInstanceOf(Date);
        expect(model.updatedAt).toBeInstanceOf(Date);
    });

    it('should create instance with provided data', () => {
        const data: Partial<IUser> = {
            id: '123'
        };
        
        const model = new User(data);
        expect(model.id).toBe('123');
    });

    it('should convert to JSON', () => {
        const model = new User({ id: '123' });
        const json = model.toJSON();
        
        expect(json.id).toBe('123');
        expect(json.createdAt).toBeInstanceOf(Date);
    });

    it('should create from JSON', () => {
        const json = { id: '123', createdAt: new Date().toISOString() };
        const model = User.fromJSON(json);
        
        expect(model.id).toBe('123');
        expect(model.createdAt).toBeInstanceOf(Date);
    });
});

describe('UserRepository', () => {
    let repository: UserRepository;
    
    beforeEach(() => {
        repository = new UserRepository();
    });

    it('should save and find model', () => {
        const model = new User({ id: '123' });
        
        const saved = repository.save(model);
        const found = repository.findById('123');
        
        expect(saved).toBe(model);
        expect(found).toBe(model);
    });

    it('should find all models', () => {
        const model1 = new User({ id: '1' });
        const model2 = new User({ id: '2' });
        
        repository.save(model1);
        repository.save(model2);
        
        const all = repository.findAll();
        expect(all).toHaveLength(2);
    });
});
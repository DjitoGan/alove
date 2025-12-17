/**
 * [1] ADMIN SERVICE UNIT TESTS
 *     Tests for user CRUD operations, role management, caching
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaService;
  let redis: RedisService;

  // [2] SETUP: CREATE TEST MODULE
  //     Mock PrismaService and RedisService
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              groupBy: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            setex: jest.fn(),
            del: jest.fn(),
            incr: jest.fn(),
            expire: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  // [3] TEST: CREATE USER SUCCESSFULLY
  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const createUserDto: CreateUserDto = {
        email: 'john@example.com',
        password: 'password123',
        name: 'John Doe',
        phoneNumber: '+22812345678',
        role: UserRole.CUSTOMER,
        isActive: true,
      };

      const mockUser = {
        id: 'user-123',
        email: 'john@example.com',
        name: 'John Doe',
        phoneNumber: '+22812345678',
        role: UserRole.CUSTOMER,
        isActive: true,
        createdAt: new Date(),
      };

      // [4] MOCK: User doesn't exist yet
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      // [5] MOCK: User created successfully
      (prisma.user.create as jest.Mock).mockResolvedValueOnce(mockUser);

      // [6] MOCK: Cache invalidated
      (redis.del as jest.Mock).mockResolvedValueOnce(1);

      // [7] CALL SERVICE
      const result = await service.createUser(createUserDto);

      // [8] ASSERTIONS
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith('admin:users:list');
    });

    // [9] TEST: CREATE USER WITH DUPLICATE EMAIL
    it('should throw ConflictException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'John Doe',
      };

      // [10] MOCK: User already exists
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-123',
        email: 'existing@example.com',
      });

      // [11] EXPECT EXCEPTION
      await expect(service.createUser(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  // [12] TEST: GET USER BY ID
  describe('getUserById', () => {
    it('should return user from database and cache it', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'john@example.com',
        name: 'John Doe',
        role: UserRole.CUSTOMER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // [13] MOCK: Cache miss (returns null)
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      // [14] MOCK: User found in database
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      // [15] MOCK: Cache set
      (redis.set as jest.Mock).mockResolvedValueOnce('OK');

      // [16] CALL SERVICE
      const result = await service.getUserById(userId);

      // [17] ASSERTIONS
      expect(result).toEqual(mockUser);
      expect(redis.get).toHaveBeenCalledWith(`admin:user:${userId}`);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.any(Object),
      });
      expect(redis.set).toHaveBeenCalled();
    });

    // [18] TEST: GET USER NOT FOUND
    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'nonexistent';

      // [19] MOCK: Cache miss
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      // [20] MOCK: User not found in database
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      // [21] EXPECT EXCEPTION
      await expect(service.getUserById(userId)).rejects.toThrow(NotFoundException);
    });

    // [22] TEST: GET USER FROM CACHE
    it('should return user from cache if available', async () => {
      const userId = 'user-123';
      const cachedUser = JSON.stringify({
        id: userId,
        email: 'john@example.com',
        name: 'John Doe',
      });

      // [23] MOCK: Cache hit (returns cached data)
      (redis.get as jest.Mock).mockResolvedValueOnce(cachedUser);

      // [24] CALL SERVICE
      const result = await service.getUserById(userId);

      // [25] ASSERTIONS
      expect(result).toEqual(JSON.parse(cachedUser));
      expect(redis.get).toHaveBeenCalledWith(`admin:user:${userId}`);
      // Database should NOT be called
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  // [26] TEST: LIST USERS WITH FILTERS
  describe('listUsers', () => {
    it('should list users with pagination and filters', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'john@example.com', role: UserRole.CUSTOMER, isActive: true },
        { id: 'user-2', email: 'jane@example.com', role: UserRole.CUSTOMER, isActive: true },
      ];

      // [27] MOCK: User count
      (prisma.user.count as jest.Mock).mockResolvedValueOnce(2);

      // [28] MOCK: User list
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce(mockUsers);

      // [29] CALL SERVICE
      const result = await service.listUsers({
        skip: 0,
        take: 20,
        search: 'john',
        isActive: true,
      });

      // [30] ASSERTIONS
      expect(result.data).toEqual(mockUsers);
      expect(result.pagination.total).toBe(2);
      expect(prisma.user.count).toHaveBeenCalled();
      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });

  // [31] TEST: UPDATE USER
  describe('updateUser', () => {
    it('should update user and invalidate cache', async () => {
      const userId = 'user-123';
      const updateData = { name: 'John Updated' };
      const mockUser = {
        id: userId,
        email: 'john@example.com',
        name: 'John Updated',
        role: UserRole.CUSTOMER,
      };

      // [32] MOCK: User exists
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: userId });

      // [33] MOCK: User updated
      (prisma.user.update as jest.Mock).mockResolvedValueOnce(mockUser);

      // [34] MOCK: Cache invalidated
      (redis.del as jest.Mock).mockResolvedValue(1);

      // [35] CALL SERVICE
      const result = await service.updateUser(userId, updateData);

      // [36] ASSERTIONS
      expect(result).toEqual(mockUser);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith(`admin:user:${userId}`);
      expect(redis.del).toHaveBeenCalledWith('admin:users:list');
    });

    // [37] TEST: UPDATE NON-EXISTENT USER
    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'nonexistent';

      // [38] MOCK: User not found
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      // [39] EXPECT EXCEPTION
      await expect(service.updateUser(userId, { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // [40] TEST: DELETE USER
  describe('deleteUser', () => {
    it('should soft delete user (mark as inactive)', async () => {
      const userId = 'user-123';

      // [41] MOCK: User exists
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: userId,
        role: UserRole.CUSTOMER,
      });

      // [42] MOCK: User updated
      (prisma.user.update as jest.Mock).mockResolvedValueOnce({
        id: userId,
        isActive: false,
      });

      // [43] MOCK: Cache invalidated
      (redis.del as jest.Mock).mockResolvedValue(1);

      // [44] CALL SERVICE (soft delete)
      const result = await service.deleteUser(userId, false);

      // [45] ASSERTIONS
      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.user.delete).not.toHaveBeenCalled(); // Hard delete should not be called
    });

    // [46] TEST: HARD DELETE USER
    it('should hard delete user if forceDelete=true', async () => {
      const userId = 'user-123';

      // [47] MOCK: User exists
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: userId,
        role: UserRole.CUSTOMER,
      });

      // [48] MOCK: Admin count (protect last admin)
      (prisma.user.count as jest.Mock).mockResolvedValueOnce(5);

      // [49] MOCK: User deleted
      (prisma.user.delete as jest.Mock).mockResolvedValueOnce({
        id: userId,
      });

      // [50] MOCK: Cache invalidated
      (redis.del as jest.Mock).mockResolvedValue(1);

      // [51] CALL SERVICE (hard delete)
      const result = await service.deleteUser(userId, true);

      // [52] ASSERTIONS
      expect(result.success).toBe(true);
      expect(prisma.user.delete).toHaveBeenCalled();
    });

    // [53] TEST: PREVENT DELETING LAST ADMIN
    it('should prevent hard deleting the last admin user', async () => {
      const userId = 'admin-123';

      // [54] MOCK: Admin user
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: userId,
        role: UserRole.ADMIN,
      });

      // [55] MOCK: Only 1 admin exists
      (prisma.user.count as jest.Mock).mockResolvedValueOnce(1);

      // [56] EXPECT EXCEPTION
      await expect(service.deleteUser(userId, true)).rejects.toThrow(BadRequestException);
    });
  });

  // [57] TEST: ASSIGN ROLE
  describe('assignRole', () => {
    it('should assign new role to user', async () => {
      const userId = 'user-123';
      const newRole = UserRole.MERCHANT;

      // [58] MOCK: User exists
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: userId });

      // [59] MOCK: User updated with new role
      (prisma.user.update as jest.Mock).mockResolvedValueOnce({
        id: userId,
        role: newRole,
      });

      // [60] MOCK: Cache invalidated
      (redis.del as jest.Mock).mockResolvedValue(1);

      // [61] CALL SERVICE
      const result = await service.assignRole(userId, newRole);

      // [62] ASSERTIONS
      expect(result.role).toBe(newRole);
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  // [63] TEST: GET ADMIN STATS
  describe('getAdminStats', () => {
    it('should return cached stats if available', async () => {
      const cachedStats = JSON.stringify({
        totalUsers: 100,
        activeUsers: 95,
        inactiveUsers: 5,
        usersByRole: { ADMIN: 2, CUSTOMER: 90, MERCHANT: 8 },
      });

      // [64] MOCK: Cache hit
      (redis.get as jest.Mock).mockResolvedValueOnce(cachedStats);

      // [65] CALL SERVICE
      const result = await service.getAdminStats();

      // [66] ASSERTIONS
      expect(result).toEqual(JSON.parse(cachedStats));
      // Database should NOT be called
      expect(prisma.user.count).not.toHaveBeenCalled();
    });

    // [67] TEST: GET STATS FROM DATABASE (CACHE MISS)
    it('should fetch stats from database and cache them', async () => {
      // [68] MOCK: Cache miss
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      // [69] MOCK: Count operations
      (prisma.user.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95); // active

      // [70] MOCK: Group by role
      (prisma.user.groupBy as jest.Mock).mockResolvedValueOnce([
        { role: UserRole.ADMIN, _count: { role: 2 } },
        { role: UserRole.CUSTOMER, _count: { role: 90 } },
        { role: UserRole.MERCHANT, _count: { role: 8 } },
      ]);

      // [71] MOCK: Cache set
      (redis.set as jest.Mock).mockResolvedValueOnce('OK');

      // [72] CALL SERVICE
      const result = await service.getAdminStats();

      // [73] ASSERTIONS
      expect(result.totalUsers).toBe(100);
      expect(result.activeUsers).toBe(95);
      expect(result.inactiveUsers).toBe(5);
      expect(redis.set).toHaveBeenCalled();
    });
  });
});

/**
 * [1] ADMIN CONTROLLER UNIT TESTS
 *     Tests for HTTP endpoints, request validation, response handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { BadRequestException } from '@nestjs/common';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;

  // [2] SETUP: CREATE TEST MODULE
  //     Mock AdminService
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: {
            createUser: jest.fn(),
            getUserById: jest.fn(),
            listUsers: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            assignRole: jest.fn(),
            getAdminStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  // [3] TEST: CREATE USER ENDPOINT
  describe('createUser', () => {
    it('should create user and return success response', async () => {
      const createUserDto: CreateUserDto = {
        email: 'john@example.com',
        password: 'password123',
        name: 'John Doe',
        role: UserRole.CUSTOMER,
      };

      const mockUser = {
        id: 'user-123',
        email: 'john@example.com',
        name: 'John Doe',
        role: UserRole.CUSTOMER,
        isActive: true,
        createdAt: new Date(),
      };

      // [4] MOCK: Service returns user
      (service.createUser as jest.Mock).mockResolvedValueOnce(mockUser);

      // [5] CALL CONTROLLER
      const result = await controller.createUser(createUserDto, { user: { id: 'admin-123' } });

      // [6] ASSERTIONS
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(result.message).toContain('created successfully');
      expect(service.createUser).toHaveBeenCalledWith(createUserDto);
    });
  });

  // [7] TEST: LIST USERS ENDPOINT
  describe('listUsers', () => {
    it('should list users with pagination', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'john@example.com', role: UserRole.CUSTOMER },
        { id: 'user-2', email: 'jane@example.com', role: UserRole.MERCHANT },
      ];

      const mockResult = {
        data: mockUsers,
        pagination: { skip: 0, take: 20, total: 2, totalPages: 1 },
      };

      // [8] MOCK: Service returns users
      (service.listUsers as jest.Mock).mockResolvedValueOnce(mockResult);

      // [9] CALL CONTROLLER
      const result = await controller.listUsers({}, { user: { id: 'admin-123' } });

      // [10] ASSERTIONS
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.pagination.total).toBe(2);
    });

    // [11] TEST: LIST WITH SEARCH FILTER
    it('should filter users by search query', async () => {
      const mockUsers = [{ id: 'user-1', email: 'john@example.com', name: 'John Doe' }];

      const mockResult = {
        data: mockUsers,
        pagination: { skip: 0, take: 20, total: 1, totalPages: 1 },
      };

      // [12] MOCK: Service returns filtered users
      (service.listUsers as jest.Mock).mockResolvedValueOnce(mockResult);

      // [13] CALL CONTROLLER WITH SEARCH
      const result = await controller.listUsers(
        { search: 'john', skip: 0, take: 20 },
        { user: { id: 'admin-123' } },
      );

      // [14] ASSERTIONS
      expect(result.data[0].email).toContain('john');
      expect(service.listUsers).toHaveBeenCalled();
    });
  });

  // [15] TEST: GET SINGLE USER ENDPOINT
  describe('getUser', () => {
    it('should get user by id', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'john@example.com',
        name: 'John Doe',
        role: UserRole.CUSTOMER,
      };

      // [16] MOCK: Service returns user
      (service.getUserById as jest.Mock).mockResolvedValueOnce(mockUser);

      // [17] CALL CONTROLLER
      const result = await controller.getUser('user-123', { user: { id: 'admin-123' } });

      // [18] ASSERTIONS
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(service.getUserById).toHaveBeenCalledWith('user-123');
    });
  });

  // [19] TEST: UPDATE USER ENDPOINT
  describe('updateUser', () => {
    it('should update user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'john@example.com',
        name: 'John Updated',
        role: UserRole.CUSTOMER,
      };

      // [20] MOCK: Service returns updated user
      (service.updateUser as jest.Mock).mockResolvedValueOnce(mockUser);

      // [21] CALL CONTROLLER
      const result = await controller.updateUser(
        'user-123',
        { name: 'John Updated' },
        { user: { id: 'admin-123' } },
      );

      // [22] ASSERTIONS
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('John Updated');
      expect(service.updateUser).toHaveBeenCalled();
    });

    // [23] TEST: PREVENT SELF-DEMOTION
    it('should prevent user from changing their own role', async () => {
      const adminId = 'admin-123';

      // [24] CALL CONTROLLER TRYING TO DEMOTE SELF
      const promise = controller.updateUser(
        adminId,
        { role: UserRole.CUSTOMER },
        { user: { id: adminId } },
      );

      // [25] EXPECT EXCEPTION
      await expect(promise).rejects.toThrow(BadRequestException);
    });
  });

  // [26] TEST: DELETE USER ENDPOINT
  describe('deleteUser', () => {
    it('should soft delete user (default)', async () => {
      const mockResult = { success: true, message: 'User user-123 deleted' };

      // [27] MOCK: Service returns success
      (service.deleteUser as jest.Mock).mockResolvedValueOnce(mockResult);

      // [28] CALL CONTROLLER (soft delete)
      const result = await controller.deleteUser('user-123', 'false', {
        user: { id: 'admin-123' },
      });

      // [29] ASSERTIONS
      expect(result.success).toBe(true);
      expect(service.deleteUser).toHaveBeenCalledWith('user-123', false);
    });

    // [30] TEST: HARD DELETE USER
    it('should hard delete user if forceDelete=true', async () => {
      const mockResult = { success: true, message: 'User user-123 deleted' };

      // [31] MOCK: Service returns success
      (service.deleteUser as jest.Mock).mockResolvedValueOnce(mockResult);

      // [32] CALL CONTROLLER (hard delete)
      const result = await controller.deleteUser('user-123', 'true', { user: { id: 'admin-123' } });

      // [33] ASSERTIONS
      expect(result.success).toBe(true);
      expect(service.deleteUser).toHaveBeenCalledWith('user-123', true);
    });

    // [34] TEST: PREVENT SELF-DELETION
    it('should prevent user from deleting their own account', async () => {
      const adminId = 'admin-123';

      // [35] CALL CONTROLLER TRYING TO DELETE SELF
      const promise = controller.deleteUser(adminId, 'false', { user: { id: adminId } });

      // [36] EXPECT EXCEPTION
      await expect(promise).rejects.toThrow(BadRequestException);
    });
  });

  // [37] TEST: ASSIGN ROLE ENDPOINT
  describe('assignRole', () => {
    it('should assign role to user', async () => {
      const mockUser = {
        id: 'user-123',
        role: UserRole.MERCHANT,
      };

      // [38] MOCK: Service returns user with new role
      (service.assignRole as jest.Mock).mockResolvedValueOnce(mockUser);

      // [39] CALL CONTROLLER
      const result = await controller.assignRole('user-123', 'MERCHANT', {
        user: { id: 'admin-123' },
      });

      // [40] ASSERTIONS
      expect(result.success).toBe(true);
      expect(result.data.role).toBe(UserRole.MERCHANT);
      expect(service.assignRole).toHaveBeenCalledWith('user-123', 'MERCHANT');
    });

    // [41] TEST: PREVENT SELF-ROLE CHANGE
    it('should prevent user from changing their own role via assignRole', async () => {
      const adminId = 'admin-123';

      // [42] CALL CONTROLLER TRYING TO CHANGE OWN ROLE
      const promise = controller.assignRole(adminId, 'CUSTOMER', { user: { id: adminId } });

      // [43] EXPECT EXCEPTION
      await expect(promise).rejects.toThrow(BadRequestException);
    });
  });

  // [44] TEST: GET ADMIN STATS ENDPOINT
  describe('getAdminStats', () => {
    it('should return admin statistics', async () => {
      const mockStats = {
        totalUsers: 100,
        activeUsers: 95,
        inactiveUsers: 5,
        usersByRole: { ADMIN: 2, CUSTOMER: 90, MERCHANT: 8 },
      };

      // [45] MOCK: Service returns stats
      (service.getAdminStats as jest.Mock).mockResolvedValueOnce(mockStats);

      // [46] CALL CONTROLLER
      const result = await controller.getAdminStats({ user: { id: 'admin-123' } });

      // [47] ASSERTIONS
      expect(result.success).toBe(true);
      expect(result.data.totalUsers).toBe(100);
      expect(result.data.activeUsers).toBe(95);
      expect(result.data.usersByRole.CUSTOMER).toBe(90);
    });
  });
});

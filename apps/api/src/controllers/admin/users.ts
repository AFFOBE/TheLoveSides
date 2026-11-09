import type { Request, Response, NextFunction } from 'express';
import { AdminUser } from '../../models/AdminUser.js';
import { sendSuccess, sendPaginated } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { createAuditLog } from '../../services/audit.service.js';
import { hashPassword } from '../../utils/password.js';

function escapeRegex(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function listAdminUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.query.search) {
      const s = String(req.query.search).trim();
      if (s) {
        const regex = new RegExp(escapeRegex(s), 'i');
        query.$or = [{ email: regex }, { firstName: regex }, { lastName: regex }];
      }
    }

    const [users, total] = await Promise.all([
      AdminUser.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('role', 'name')
        .lean(),
      AdminUser.countDocuments(query),
    ]);

    sendPaginated(res, users, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    });
  } catch (error) {
    next(error);
  }
}

export async function createAdminUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, firstName, lastName, roleId } = req.body;

    const existingUser = await AdminUser.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('Admin user with this email already exists');
    }

    const passwordHash = await hashPassword(password);

    const user = await AdminUser.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role: roleId,
    });

    await createAuditLog({
      action: 'admin_user.create',
      resource: 'AdminUser',
      resourceId: user.id,
      details: { email: user.email },
      req,
    });

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;

    sendSuccess({ res, data: userObj, message: 'Admin user created successfully', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { firstName, lastName, roleId, isActive, password } = req.body;

    const user = await AdminUser.findById(id);
    if (!user) {
      throw ApiError.notFound('Admin User not found');
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (roleId) user.role = roleId;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) {
      user.passwordHash = await hashPassword(password);
    }

    await user.save();

    await createAuditLog({
      action: 'admin_user.update',
      resource: 'AdminUser',
      resourceId: user.id,
      details: { email: user.email },
      req,
    });

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;

    sendSuccess({ res, data: userObj, message: 'Admin user updated successfully' });
  } catch (error) {
    next(error);
  }
}

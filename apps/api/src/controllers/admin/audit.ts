import type { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../../models/AuditLog.js';
import { sendSuccess, sendPaginated } from '../../utils/ApiResponse.js';

function escapeRegex(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.query.action) query.action = req.query.action;
    if (req.query.resource) query.resource = req.query.resource;
    if (req.query.adminId) query.adminId = req.query.adminId;

    if (req.query.search) {
      const s = String(req.query.search).trim();
      if (s) {
        const regex = new RegExp(escapeRegex(s), 'i');
        query.$or = [{ action: regex }, { resource: regex }];
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('adminId', 'email firstName lastName')
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    sendPaginated(res, logs, {
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

export async function getAuditLogById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const log = await AuditLog.findById(id).populate('adminId', 'email firstName lastName').lean();
    sendSuccess({ res, data: log });
  } catch (error) {
    next(error);
  }
}

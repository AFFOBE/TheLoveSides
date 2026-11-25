import type { Request, Response, NextFunction } from 'express';
import { CmsPage, CmsRevision } from '../../models/CmsPage.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { createAuditLog } from '../../services/audit.service.js';

/**
 * The admin UI works with a boolean `isPublished`, while the model stores
 * `status` ('draft' | 'published' | 'archived'). Mongoose's strict mode drops
 * unknown fields, so without this mapping the "Published" checkbox was
 * silently ignored and every page stayed a draft.
 */
function applyPublishState(body: Record<string, unknown>, userId: string): Record<string, unknown> {
  const { isPublished, _id, __v, createdAt, updatedAt, ...rest } = body;
  if (typeof isPublished === 'boolean') {
    if (isPublished) {
      rest.status = 'published';
      rest.publishedBy = userId;
    } else if (rest.status === undefined || rest.status === 'published') {
      rest.status = 'draft';
    }
  }
  return rest;
}

function withIsPublished<T extends { status?: string }>(page: T): T & { isPublished: boolean } {
  return { ...page, isPublished: page.status === 'published' };
}

export async function listCmsPages(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pages = await CmsPage.find().select('title slug type status publishedAt createdAt updatedAt').lean();
    sendSuccess({ res, data: pages.map(withIsPublished) });
  } catch (error) {
    next(error);
  }
}

export async function getCmsPageById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const page = await CmsPage.findById(id).lean();
    if (!page) throw ApiError.notFound('CMS Page');
    sendSuccess({ res, data: withIsPublished(page) });
  } catch (error) {
    next(error);
  }
}

export async function createCmsPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pageData = applyPublishState({ ...req.body }, req.user!.id);
    if (pageData.status === 'published') pageData.publishedAt = new Date();
    const page = await CmsPage.create(pageData);

    await createAuditLog({
      action: 'cms.create',
      resource: 'CmsPage',
      resourceId: page.id,
      details: { slug: page.slug },
      req,
    });

    sendSuccess({ res, data: withIsPublished(page.toObject()), message: 'Page created successfully', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function updateCmsPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const page = await CmsPage.findById(id);
    if (!page) throw ApiError.notFound('CMS Page');

    const wasPublished = page.status === 'published';
    Object.assign(page, applyPublishState({ ...req.body }, req.user!.id));
    if (page.status === 'published' && !wasPublished) page.publishedAt = new Date();
    
    // Auto-save history if content changed
    if (page.isModified('content') || page.isModified('title')) {
      await CmsRevision.create({
        pageId: page._id,
        content: page.content,
        title: page.title,
        editedBy: req.user!.id,
      });
    }

    await page.save();

    await createAuditLog({
      action: 'cms.update',
      resource: 'CmsPage',
      resourceId: id,
      details: { slug: page.slug },
      req,
    });

    sendSuccess({ res, data: withIsPublished(page.toObject()), message: 'Page updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function deleteCmsPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const page = await CmsPage.findByIdAndDelete(id);
    if (!page) throw ApiError.notFound('CMS Page');

    await createAuditLog({
      action: 'cms.delete',
      resource: 'CmsPage',
      resourceId: id,
      details: { slug: page.slug },
      req,
    });

    sendSuccess({ res, message: 'Page deleted successfully' });
  } catch (error) {
    next(error);
  }
}

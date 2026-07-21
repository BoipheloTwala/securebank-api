import path from 'path';
import fs from 'fs';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { UpdateEvidenceInput, EvidenceFilterInput } from '../schemas/evidence.schema';
import { EvidenceType } from '@prisma/client';

const MIME_TYPE_MAP: Record<string, EvidenceType> = {
  'application/pdf':                                     'DOCUMENT',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCUMENT',
  'application/msword':                                  'DOCUMENT',
  'application/vnd.ms-excel':                            'DOCUMENT',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'DOCUMENT',
  'text/plain':   'LOG',
  'text/csv':     'LOG',
  'image/png':    'IMAGE',
  'image/jpeg':   'IMAGE',
  'image/gif':    'IMAGE',
  'image/webp':   'IMAGE',
};

export async function createEvidence(
  file: Express.Multer.File,
  title: string,
  uploadedById: string,
  controlId?: string,
  notes?: string,
) {
  const type: EvidenceType = MIME_TYPE_MAP[file.mimetype] ?? 'OTHER';

  return prisma.evidence.create({
    data: {
      title,
      type,
      filePath:    file.path,
      fileName:    file.originalname,
      fileSize:    file.size,
      mimeType:    file.mimetype,
      uploadedById,
      controlId:   controlId ?? null,
      notes:       notes ?? null,
    },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      control:    { select: { id: true, title: true, controlRef: true } },
    },
  });
}

export async function listEvidence(filters: EvidenceFilterInput) {
  const { page, limit, search, ...where } = filters;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = {};
  if (where.status)    whereClause.status    = where.status;
  if (where.controlId) whereClause.controlId = where.controlId;
  if (search) {
    whereClause.OR = [
      { title:    { contains: search, mode: 'insensitive' } },
      { fileName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.evidence.count({ where: whereClause }),
    prisma.evidence.findMany({
      where:   whereClause,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        control:    { select: { id: true, title: true, controlRef: true } },
      },
    }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getEvidenceById(id: string) {
  const ev = await prisma.evidence.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      control:    { select: { id: true, title: true, controlRef: true, framework: true } },
    },
  });
  if (!ev) throw new AppError('Evidence not found', 404);
  return ev;
}

export async function updateEvidence(id: string, input: UpdateEvidenceInput) {
  await getEvidenceById(id);
  return prisma.evidence.update({
    where: { id },
    data: {
      ...(input.title     !== undefined && { title:     input.title }),
      ...(input.status    !== undefined && { status:    input.status }),
      ...(input.notes     !== undefined && { notes:     input.notes }),
      ...(input.controlId !== undefined && { controlId: input.controlId }),
    },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      control:    { select: { id: true, title: true, controlRef: true } },
    },
  });
}

export async function deleteEvidence(id: string) {
  const ev = await getEvidenceById(id);
  if (ev.filePath && fs.existsSync(ev.filePath)) {
    fs.unlinkSync(ev.filePath);
  }
  await prisma.evidence.delete({ where: { id } });
}

export function getEvidenceFilePath(ev: { filePath: string; fileName: string }) {
  const fullPath = path.resolve(ev.filePath);
  if (!fs.existsSync(fullPath)) throw new AppError('File not found', 404);
  return fullPath;
}

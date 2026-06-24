import { Router, type Response } from 'express';
import type { WasteCategory } from '@wastegrab/shared';
import { prisma } from '../prisma.js';

const wasteCategoryRouter = Router();

wasteCategoryRouter.get('/', async (_, res: Response) => {
  const categories = await prisma.wasteCategory.findMany({
    where: {
      isBanned: false,
      isHazardous: false,
    },
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
      pointsPerKg: true,
      averageWeightKg: true,
      isBanned: true,
      isHazardous: true,
      isAiDetectable: true,
      description: true,
      imageUrl: true,
    },
  });

  res.json(
    categories.map((category): WasteCategory => ({
      ...category,
      averageWeightKg: category.averageWeightKg.toString(),
    })),
  );
});

export default wasteCategoryRouter;

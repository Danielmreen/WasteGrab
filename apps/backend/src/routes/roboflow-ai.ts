import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { promises as fs } from 'fs';
import axios from 'axios';
import sharp from 'sharp';
import type { AnalyzeImageResponse } from '@wastegrab/shared';
import { prisma } from '../prisma.js';

type RoboflowRequest = Request & { file?: Express.Multer.File };
type RoboflowPrediction = { class: string };
type RoboflowResponse = {
  outputs?: Array<{
    predictions?: {
      predictions?: RoboflowPrediction[];
    };
  }>;
};

function normalizeCategoryName(value: string): string {
  return value.trim().toLowerCase();
}

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }

    cb(new Error('Only image uploads are supported'));
  },
});

router.post(
  '/analyze-image',
  upload.single('image'),

  async (req: RoboflowRequest, res: Response) => {
    const imagePath = req.file?.path;

    try {
      if (!imagePath) {
        return res.status(400).json({
          success: false,
          error: 'No image file uploaded',
        });
      }

      const apiKey = process.env.ROBOFLOW_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: 'Roboflow API key is not configured',
        });
      }

      const image = await sharp(imagePath)
        .rotate()
        .jpeg({ quality: 90 })
        .toBuffer()
        .then((buffer) => buffer.toString('base64'));
      const categories = await prisma.wasteCategory.findMany({
        where: {
          isBanned: false,
          isHazardous: false,
          isAiDetectable: true,
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          pointsPerKg: true,
          averageWeightKg: true,
        },
      });

      if (!categories.length) {
        return res.status(500).json({
          success: false,
          error: 'No active waste categories are configured',
        });
      }

      const categoriesByName = new Map(
        categories.map((category) => [
          normalizeCategoryName(category.name),
          category,
        ]),
      );

      const response = await axios.post<RoboflowResponse>(
        'https://serverless.roboflow.com/infer/workflows/harith-haiqal-syaiful-eksan/general-segmentation-api-3',
        {
          api_key: apiKey,
          inputs: {
            image: {
              type: 'base64',
              value: image,
            },
            classes: categories.map((category) => category.name).join(', '),
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const predictions =
        response.data.outputs?.[0]?.predictions?.predictions ?? [];

      const counts = categories.reduce<Record<string, number>>(
        (acc, category) => ({
          ...acc,
          [category.name]: 0,
        }),
        {},
      );

      predictions.forEach((item) => {
        const category = categoriesByName.get(normalizeCategoryName(item.class));

        if (category) {
          counts[category.name]++;
        }
      });

      const detectedCategories = categories
        .map((category) => {
          const count = counts[category.name] ?? 0;
          const estimatedWeight = Number(
            (count * Number(category.averageWeightKg)).toFixed(2),
          );

          return {
            id: category.id,
            name: category.name,
            count,
            estimatedWeight,
            points: Math.round(estimatedWeight * category.pointsPerKg),
          };
        })
        .filter((category) => category.count > 0);

      const totalItems = detectedCategories.reduce(
        (total, category) => total + category.count,
        0,
      );

      const estimatedWeight = Number(
        detectedCategories
          .reduce((total, category) => total + category.estimatedWeight, 0)
          .toFixed(2),
      );
      const points = detectedCategories.reduce(
        (total, category) => total + category.points,
        0,
      );
      const size =
        estimatedWeight > 10 ? 'Large' : estimatedWeight > 5 ? 'Medium' : 'Small';
      const detectedWaste = detectedCategories.map((category) => category.name);

      const payload: AnalyzeImageResponse = {
        success: true,
        result: {
          detectedWaste,
          detectedCategories,
          counts,
          totalItems,
          estimatedWeight,
          points,
          size,
          recyclable: 'Yes',
        },
      };

      res.json(payload);

    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('Roboflow AI analysis failed', {
          status: err.response?.status,
          data: err.response?.data,
        });
      } else {
        console.error(err);
      }

      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      if (imagePath) {
        await fs.unlink(imagePath).catch(() => undefined);
      }
    }
});

export default router;

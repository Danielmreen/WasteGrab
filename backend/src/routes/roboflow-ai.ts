console.log('Roboflow route loaded');
import express, { type Request, type Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import axios from 'axios';

type WasteType = 'PAPER' | 'PLASTIC' | 'GLASS' | 'METAL';
type RoboflowRequest = Request & { file?: Express.Multer.File };

const router = express.Router();

const upload = multer({
  dest: 'uploads/'
});

router.post(
  '/analyze-image',
  upload.single('image'),

  async (req: RoboflowRequest, res: Response) => {

    try {

      const imagePath = req.file?.path;
      if (!imagePath) {
        return res.status(400).json({
          success: false,
          error: 'No image file uploaded',
        });
      }

      // Convert image to base64
      const image =
        fs.readFileSync(imagePath, {
          encoding: 'base64'
        });

      // Roboflow API request
      const response = await axios.post(

            'https://serverless.roboflow.com/harith-haiqal-syaiful-eksan/workflows/general-segmentation-api-3',

            {
                api_key: process.env.ROBOFLOW_API_KEY,

                inputs: {

                image: {
                    type: 'base64',
                    value: image
                },

                classes:
                    'PAPER, PLASTIC, GLASS, METAL, OIL'
                }

            },

            {
                headers: {
                'Content-Type':
                    'application/json'
                }
            }
        );

      const predictions = (response.data.outputs?.[0]?.predictions?.predictions ?? []) as Array<{ class: string }>;

            // Counts from AI
            const counts: Record<WasteType, number> = {
                PAPER: 0,
                PLASTIC: 0,
                GLASS: 0,
                METAL: 0
                };

                // Count each detected object
                predictions.forEach(item => {

                const detectedClass =
                    item.class.trim().toUpperCase() as WasteType;

                if (detectedClass in counts) {
                    counts[detectedClass]++;
                }

            });

            // Total items
            const totalItems =

            counts.PAPER +
            counts.PLASTIC +
            counts.GLASS +
            counts.METAL;

            // Eco points
            // const points =

            // (counts.PAPER * 1) +
            // (counts.PLASTIC * 2) +
            // (counts.GLASS * 3) +
            // (counts.METAL * 4);

            // Average weights (kg per item)
            const averageWeightKg = {
            PAPER: 0.02,
            PLASTIC: 0.03,
            GLASS: 0.15,
            METAL: 0.10
            };

            // Weight per material
            const weightByMaterial = {
            PAPER: counts.PAPER * averageWeightKg.PAPER,
            PLASTIC: counts.PLASTIC * averageWeightKg.PLASTIC,
            GLASS: counts.GLASS * averageWeightKg.GLASS,
            METAL: counts.METAL * averageWeightKg.METAL
            };

            // Total estimated weight (rounded)
            const estimatedWeight = Number(
            (
                weightByMaterial.PAPER +
                weightByMaterial.PLASTIC +
                weightByMaterial.GLASS +
                weightByMaterial.METAL
            ).toFixed(2)
            );

            const points = Math.round(estimatedWeight * 100);

            // Size estimation
            let size = 'Small';

            if(estimatedWeight > 10){
            size = 'Large';
            }
            else if(estimatedWeight > 5){
            size = 'Medium';
            }

            // Convert detected categories
            const detectedWaste = (Object.keys(counts) as WasteType[])
                .filter(key => counts[key] > 0);

            res.json({
                success: true,
                result: {
                    detectedWaste,
                    counts,
                    totalItems,
                    estimatedWeight,
                    points,
                    size,
                    recyclable: 'Yes'
                }
            });
    //   console.log(JSON.stringify(response.data, null, 2));

    } catch (err: unknown) {

      console.error(err);

      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
});

export default router;
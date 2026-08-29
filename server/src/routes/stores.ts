import { Router } from "express";
import { getAllStores, STORE_CATEGORY_LABELS } from "../data/houstonStores";

export const storesRouter = Router();

storesRouter.get("/", (_req, res) => {
  res.json({ stores: getAllStores(), categoryLabels: STORE_CATEGORY_LABELS });
});

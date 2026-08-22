import { getPublishStatus } from "./_lib/vercel.js";

export default function handler(req, res) {
  res.status(200).json(getPublishStatus());
}

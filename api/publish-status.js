import { getPublishStatus } from "./_lib/netlify.js";

export default function handler(req, res) {
  res.status(200).json(getPublishStatus());
}

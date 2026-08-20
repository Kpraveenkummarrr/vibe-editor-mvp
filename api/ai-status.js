import { getAiStatus } from "./_lib/openrouter.js";

export default function handler(req, res) {
  res.status(200).json(getAiStatus());
}

import { getAiProvidersStatus } from "./_lib/aiRouter.js";

export default function handler(req, res) {
  res.status(200).json(getAiProvidersStatus());
}

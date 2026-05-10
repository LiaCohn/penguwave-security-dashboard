import { Router } from "express";
import { requireActiveUser, requireAuth } from "../middleware/auth.js";
import { getEventForUser, listEventsForUser } from "../services/events.js";

export const eventsRouter = Router();

eventsRouter.use(requireAuth, requireActiveUser);

eventsRouter.get("/", async (req, res, next) => {
  try {
    const user = req.user!;
    const events = await listEventsForUser(user.id, user.role);
    res.json(events);
  } catch (err) {
    next(err);
  }
});

eventsRouter.get("/:id", async (req, res, next) => {
  try {
    const user = req.user!;
    const event = await getEventForUser(req.params.id, user.id, user.role);
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(event);
  } catch (err) {
    next(err);
  }
});
